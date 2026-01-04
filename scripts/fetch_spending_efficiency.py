#!/usr/bin/env python3
"""
Fetch Finnish government expenditure efficiency data.
Breaks down spending by transaction type to measure what % goes to beneficiaries vs bureaucracy.

Table: statfin_jmete_pxt_12a6 - General government expenditure by function

Key transaction types:
- D62K: Social benefits (cash to citizens)
- D632K: Social transfers in kind (via private providers)
- D1K: Compensation of employees (bureaucracy)
- P2K: Intermediate consumption (overhead)
- D3K: Subsidies
- P5K: Capital formation (investment)
"""

import json
import requests
from pathlib import Path
from datetime import datetime

BASE_URL = "https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin"

# Categories to analyze
FOCUS_CATEGORIES = {
    'G10': {
        'name': 'Social protection',
        'subcategories': {
            'G1001': 'Sickness and disability',
            'G1002': 'Old age (pensions)',
            'G1003': 'Survivors',
            'G1004': 'Family and children',
            'G1005': 'Unemployment',
            'G1006': 'Housing assistance',
            'G1007': 'Social exclusion',
        }
    },
    'G01': {
        'name': 'General public services',
        'subcategories': {
            'G0101': 'Executive and legislative',
            'G0102': 'Foreign economic aid',
            'G0103': 'General services',
            'G0104': 'Basic research',
            'G0105': 'R&D public services',
            'G0106': 'Other public services',
            'G0107': 'Public debt transactions',
        }
    },
    'G04': {
        'name': 'Economic affairs',
        'subcategories': {
            'G0401': 'Economic and labour affairs',
            'G0402': 'Agriculture, forestry, fishing',
            'G0403': 'Fuel and energy',
            'G0404': 'Mining, manufacturing',
            'G0405': 'Transport',
            'G0406': 'Communications',
            'G0407': 'Other industries',
            'G0408': 'R&D economic affairs',
        }
    },
}

# Transaction types
TRANSACTION_TYPES = {
    'D62K': {'name': 'Cash benefits to citizens', 'category': 'benefits'},
    'D632K': {'name': 'In-kind benefits (via private)', 'category': 'benefits'},
    'D1K': {'name': 'Employee compensation', 'category': 'bureaucracy'},
    'P2K': {'name': 'Intermediate consumption', 'category': 'overhead'},
    'D3K': {'name': 'Subsidies', 'category': 'subsidies'},
    'P5K': {'name': 'Capital formation', 'category': 'investment'},
    'D4KS': {'name': 'Property income', 'category': 'other'},
    'D7KS': {'name': 'Other transfers', 'category': 'other'},
    'OTES': {'name': 'Total expenditure', 'category': 'total'},
}


def fetch_data(url, query):
    """Fetch data from Statistics Finland API."""
    try:
        response = requests.post(url, json=query, timeout=60)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"  API Error {response.status_code}: {response.text[:200]}")
    except Exception as e:
        print(f"  Request error: {e}")
    return None


def parse_json_stat(data: dict) -> list[dict]:
    """Parse JSON-stat2 format into records."""
    if not data:
        return []
    
    dimensions = data.get('dimension', {})
    dim_order = data.get('id', [])
    values = data.get('value', [])
    
    if not dimensions or not values:
        return []
    
    dim_info = {}
    for dim_id in dim_order:
        dim = dimensions.get(dim_id, {})
        categories = dim.get('category', {})
        dim_info[dim_id] = {
            'size': data['size'][dim_order.index(dim_id)],
            'labels': categories.get('label', {}),
            'index': categories.get('index', {})
        }
    
    for dim_id in dim_info:
        index = dim_info[dim_id]['index']
        dim_info[dim_id]['reverse_index'] = {v: k for k, v in index.items()}
    
    records = []
    strides = []
    stride = 1
    for dim_id in reversed(dim_order):
        strides.insert(0, stride)
        stride *= dim_info[dim_id]['size']
    
    for i, value in enumerate(values):
        if value is None:
            continue
        
        record = {'value': value}
        remaining = i
        for j, dim_id in enumerate(dim_order):
            dim_idx = remaining // strides[j]
            remaining = remaining % strides[j]
            code = dim_info[dim_id]['reverse_index'].get(dim_idx, str(dim_idx))
            label = dim_info[dim_id]['labels'].get(code, code)
            record[f'{dim_id}_code'] = code
            record[f'{dim_id}_label'] = label
        
        records.append(record)
    
    return records


def fetch_efficiency_data():
    """Fetch expenditure data by function and transaction type."""
    print("Fetching efficiency data by function and transaction...")
    url = f"{BASE_URL}/jmete/statfin_jmete_pxt_12a6.px"
    
    # Get all functions we care about
    all_functions = ['SSS']  # Total
    for cat_code, cat_info in FOCUS_CATEGORIES.items():
        all_functions.append(cat_code)
        all_functions.extend(cat_info['subcategories'].keys())
    
    # All transaction types
    transaction_codes = list(TRANSACTION_TYPES.keys())
    
    query = {
        "query": [
            {"code": "Sektori", "selection": {"filter": "item", "values": ["S13"]}},
            {"code": "Taloustoimi", "selection": {"filter": "item", "values": transaction_codes}},
            {"code": "Tehtävä", "selection": {"filter": "item", "values": all_functions}},
            {"code": "Vuosi", "selection": {"filter": "all", "values": ["*"]}},
            {"code": "Tiedot", "selection": {"filter": "item", "values": ["cp"]}},  # Current prices only
        ],
        "response": {"format": "json-stat2"}
    }
    
    return fetch_data(url, query)


def transform_data(records):
    """Transform records into efficiency analysis data."""
    
    # Organize by year, function, transaction
    by_year_func_trans = {}
    
    for rec in records:
        year = rec.get('Vuosi_code', '')
        func = rec.get('Tehtävä_code', '')
        trans = rec.get('Taloustoimi_code', '')
        value = rec.get('value')
        
        if not year or not func or not trans or value is None:
            continue
        
        try:
            year_int = int(year)
        except ValueError:
            continue
        
        key = (year_int, func, trans)
        by_year_func_trans[key] = value
    
    all_years = sorted(set(k[0] for k in by_year_func_trans.keys()))
    latest_year = all_years[-1] if all_years else 2024
    
    def calc_efficiency(func_code, year):
        """Calculate efficiency metrics for a function in a year."""
        total = by_year_func_trans.get((year, func_code, 'OTES'), 0)
        if total == 0:
            return None
        
        benefits = (
            by_year_func_trans.get((year, func_code, 'D62K'), 0) +
            by_year_func_trans.get((year, func_code, 'D632K'), 0)
        )
        bureaucracy = by_year_func_trans.get((year, func_code, 'D1K'), 0)
        overhead = by_year_func_trans.get((year, func_code, 'P2K'), 0)
        subsidies = by_year_func_trans.get((year, func_code, 'D3K'), 0)
        investment = by_year_func_trans.get((year, func_code, 'P5K'), 0)
        other = total - benefits - bureaucracy - overhead - subsidies - investment
        
        return {
            'total_million': round(total, 1),
            'benefits_million': round(benefits, 1),
            'bureaucracy_million': round(bureaucracy, 1),
            'overhead_million': round(overhead, 1),
            'subsidies_million': round(subsidies, 1),
            'investment_million': round(investment, 1),
            'other_million': round(max(0, other), 1),
            'efficiency_pct': round(benefits / total * 100, 1) if total > 0 else 0,
            'bureaucracy_pct': round(bureaucracy / total * 100, 1) if total > 0 else 0,
            'overhead_pct': round(overhead / total * 100, 1) if total > 0 else 0,
        }
    
    # Build category analysis
    categories = []
    for cat_code, cat_info in FOCUS_CATEGORIES.items():
        eff = calc_efficiency(cat_code, latest_year)
        if not eff:
            continue
        
        # Get subcategory data
        subcategories = []
        for sub_code, sub_name in cat_info['subcategories'].items():
            sub_eff = calc_efficiency(sub_code, latest_year)
            if sub_eff and sub_eff['total_million'] > 0:
                subcategories.append({
                    'code': sub_code,
                    'name': sub_name,
                    **sub_eff
                })
        
        # Sort subcategories by total
        subcategories.sort(key=lambda x: -x['total_million'])
        
        categories.append({
            'code': cat_code,
            'name': cat_info['name'],
            **eff,
            'subcategories': subcategories,
        })
    
    # Sort by total
    categories.sort(key=lambda x: -x['total_million'])
    
    # Build time series for main categories
    time_series = []
    for year in all_years:
        entry = {'year': year}
        for cat_code in FOCUS_CATEGORIES.keys():
            eff = calc_efficiency(cat_code, year)
            if eff:
                entry[cat_code] = {
                    'efficiency_pct': eff['efficiency_pct'],
                    'bureaucracy_pct': eff['bureaucracy_pct'],
                    'total_million': eff['total_million'],
                }
        time_series.append(entry)
    
    # Calculate summary
    total_analyzed = sum(c['total_million'] for c in categories)
    total_benefits = sum(c['benefits_million'] for c in categories)
    total_bureaucracy = sum(c['bureaucracy_million'] for c in categories)
    
    # Find most and least efficient subcategories
    all_subcats = []
    for cat in categories:
        for sub in cat['subcategories']:
            if sub['total_million'] > 100:  # Only include significant subcategories
                all_subcats.append({
                    'code': sub['code'],
                    'name': sub['name'],
                    'parent': cat['name'],
                    'efficiency_pct': sub['efficiency_pct'],
                    'bureaucracy_pct': sub['bureaucracy_pct'],
                    'total_million': sub['total_million'],
                })
    
    most_efficient = max(all_subcats, key=lambda x: x['efficiency_pct']) if all_subcats else None
    least_efficient = min(all_subcats, key=lambda x: x['efficiency_pct']) if all_subcats else None
    most_bureaucratic = max(all_subcats, key=lambda x: x['bureaucracy_pct']) if all_subcats else None
    
    summary = {
        'year': latest_year,
        'total_analyzed_billion': round(total_analyzed / 1000, 1),
        'total_benefits_billion': round(total_benefits / 1000, 1),
        'total_bureaucracy_billion': round(total_bureaucracy / 1000, 1),
        'overall_efficiency_pct': round(total_benefits / total_analyzed * 100, 1) if total_analyzed > 0 else 0,
        'overall_bureaucracy_pct': round(total_bureaucracy / total_analyzed * 100, 1) if total_analyzed > 0 else 0,
        'most_efficient': most_efficient,
        'least_efficient': least_efficient,
        'most_bureaucratic': most_bureaucratic,
    }
    
    return {
        'metadata': {
            'source': 'Statistics Finland',
            'table': 'statfin_jmete_pxt_12a6',
            'description': 'Government expenditure efficiency analysis by transaction type',
            'fetched_at': datetime.now().isoformat(),
            'methodology': 'Efficiency = (D62K cash benefits + D632K in-kind benefits) / Total expenditure. Bureaucracy = D1K employee compensation.',
            'transaction_types': TRANSACTION_TYPES,
        },
        'summary': summary,
        'categories': categories,
        'time_series': time_series,
    }


def main():
    """Main function."""
    output_dir = Path(__file__).parent.parent / 'data'
    public_dir = Path(__file__).parent.parent / 'public' / 'data'
    output_dir.mkdir(exist_ok=True)
    public_dir.mkdir(exist_ok=True)
    
    try:
        print("=" * 60)
        raw_data = fetch_efficiency_data()
        if not raw_data:
            raise Exception("Failed to fetch efficiency data")
        
        records = parse_json_stat(raw_data)
        print(f"  Parsed {len(records)} records")
        
        print("=" * 60)
        print("Transforming data...")
        transformed = transform_data(records)
        
        # Save
        output_file = output_dir / 'spending_efficiency.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(transformed, f, ensure_ascii=False, indent=2)
        print(f"Saved to {output_file}")
        
        public_file = public_dir / 'spending_efficiency.json'
        with open(public_file, 'w', encoding='utf-8') as f:
            json.dump(transformed, f, ensure_ascii=False, indent=2)
        print(f"Saved to {public_file}")
        
        # Print summary
        print("\n" + "=" * 60)
        print("SPENDING EFFICIENCY ANALYSIS")
        print("=" * 60)
        summary = transformed['summary']
        print(f"Year: {summary['year']}")
        print(f"Total analyzed: €{summary['total_analyzed_billion']}B")
        print(f"Direct benefits: €{summary['total_benefits_billion']}B ({summary['overall_efficiency_pct']}%)")
        print(f"Bureaucracy: €{summary['total_bureaucracy_billion']}B ({summary['overall_bureaucracy_pct']}%)")
        
        print("\nBy Category:")
        print("-" * 70)
        for cat in transformed['categories']:
            print(f"\n{cat['name']} ({cat['code']})")
            print(f"  Total: €{cat['total_million']/1000:.1f}B")
            print(f"  Benefits to citizens: {cat['efficiency_pct']}%")
            print(f"  Bureaucracy (wages): {cat['bureaucracy_pct']}%")
            print(f"  Overhead: {cat['overhead_pct']}%")
            
            if cat['subcategories']:
                print(f"  Top subcategories:")
                for sub in cat['subcategories'][:3]:
                    print(f"    - {sub['name']}: €{sub['total_million']/1000:.1f}B (eff: {sub['efficiency_pct']}%, bur: {sub['bureaucracy_pct']}%)")
        
        if summary.get('most_efficient'):
            print(f"\nMost Efficient: {summary['most_efficient']['name']} ({summary['most_efficient']['efficiency_pct']}%)")
        if summary.get('most_bureaucratic'):
            print(f"Most Bureaucratic: {summary['most_bureaucratic']['name']} ({summary['most_bureaucratic']['bureaucracy_pct']}%)")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == '__main__':
    exit(main())

