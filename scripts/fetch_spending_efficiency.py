#!/usr/bin/env python3
"""
Fetch Finnish Social Protection spending efficiency data.
Breaks down spending by transaction type to measure what % goes to beneficiaries vs bureaucracy.

Focused exclusively on G10 (Social Protection) and its subcategories.

Table: statfin_jmete_pxt_12a6 - General government expenditure by function

Key transaction types:
- D62K: Social benefits (cash to citizens)
- D632K: Social transfers in kind (via private providers)
- D1K: Compensation of employees (bureaucracy)
- P2K: Intermediate consumption (overhead)
"""

import json
import requests
from pathlib import Path
from datetime import datetime

BASE_URL = "https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin"

# Social Protection subcategories (G10)
SOCIAL_PROTECTION_SUBS = {
    'G1001': 'Sickness and disability',
    'G1002': 'Old age (pensions)',
    'G1003': 'Survivors',
    'G1004': 'Family and children',
    'G1005': 'Unemployment',
    'G1006': 'Housing assistance',
    'G1007': 'Social exclusion',
    'G1008': 'R&D social protection',
    'G1009': 'Other social protection',
}

# Transaction types
TRANSACTION_TYPES = {
    'D62K': {'name': 'Cash benefits to citizens', 'category': 'benefits'},
    'D632K': {'name': 'In-kind benefits (via private)', 'category': 'benefits'},
    'D1K': {'name': 'Employee compensation', 'category': 'bureaucracy'},
    'P2K': {'name': 'Intermediate consumption', 'category': 'overhead'},
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


def fetch_social_protection_data():
    """Fetch Social Protection (G10) expenditure data by subcategory and transaction type."""
    print("Fetching Social Protection efficiency data...")
    url = f"{BASE_URL}/jmete/statfin_jmete_pxt_12a6.px"
    
    # G10 and all subcategories
    functions = ['G10'] + list(SOCIAL_PROTECTION_SUBS.keys())
    
    # Key transaction types
    transaction_codes = list(TRANSACTION_TYPES.keys())
    
    query = {
        "query": [
            {"code": "Sektori", "selection": {"filter": "item", "values": ["S13"]}},
            {"code": "Taloustoimi", "selection": {"filter": "item", "values": transaction_codes}},
            {"code": "Tehtävä", "selection": {"filter": "item", "values": functions}},
            {"code": "Vuosi", "selection": {"filter": "all", "values": ["*"]}},
            {"code": "Tiedot", "selection": {"filter": "item", "values": ["cp", "bkt_suhde"]}},  # Current prices + GDP ratio
        ],
        "response": {"format": "json-stat2"}
    }
    
    return fetch_data(url, query)


def transform_data(records):
    """Transform records into social protection efficiency analysis."""
    
    # Organize by year, function, transaction, and info type (cp or bkt_suhde)
    by_year_func_trans_cp = {}  # Current prices (millions EUR)
    by_year_func_trans_gdp = {}  # GDP ratio (%)
    
    for rec in records:
        year = rec.get('Vuosi_code', '')
        func = rec.get('Tehtävä_code', '')
        trans = rec.get('Taloustoimi_code', '')
        info = rec.get('Tiedot_code', '')
        value = rec.get('value')
        
        if not year or not func or not trans or value is None:
            continue
        
        try:
            year_int = int(year)
        except ValueError:
            continue
        
        key = (year_int, func, trans)
        if info == 'cp':
            by_year_func_trans_cp[key] = value
        elif info == 'bkt_suhde':
            by_year_func_trans_gdp[key] = value
    
    # Alias for backward compatibility
    by_year_func_trans = by_year_func_trans_cp
    
    all_years = sorted(set(k[0] for k in by_year_func_trans.keys()))
    latest_year = all_years[-1] if all_years else 2024
    
    def calc_efficiency(func_code, year):
        """Calculate efficiency metrics for a function in a year."""
        total = by_year_func_trans.get((year, func_code, 'OTES'), 0)
        if total == 0:
            return None
        
        d62k = by_year_func_trans.get((year, func_code, 'D62K'), 0)
        d632k = by_year_func_trans.get((year, func_code, 'D632K'), 0)
        benefits = d62k + d632k
        bureaucracy = by_year_func_trans.get((year, func_code, 'D1K'), 0)
        overhead = by_year_func_trans.get((year, func_code, 'P2K'), 0)
        other = total - benefits - bureaucracy - overhead
        
        return {
            'total_million': round(total, 1),
            'benefits_million': round(benefits, 1),
            'd62k_million': round(d62k, 1),  # Cash benefits
            'd632k_million': round(d632k, 1),  # In-kind via private
            'bureaucracy_million': round(bureaucracy, 1),
            'overhead_million': round(overhead, 1),
            'other_million': round(max(0, other), 1),
            'efficiency_pct': round(benefits / total * 100, 1) if total > 0 else 0,
            'bureaucracy_pct': round(bureaucracy / total * 100, 1) if total > 0 else 0,
            'overhead_pct': round(overhead / total * 100, 1) if total > 0 else 0,
        }
    
    # Build subcategory analysis with full time series
    subcategories = []
    for sub_code, sub_name in SOCIAL_PROTECTION_SUBS.items():
        latest_eff = calc_efficiency(sub_code, latest_year)
        if not latest_eff or latest_eff['total_million'] < 10:  # Skip very small categories
            continue
        
        # Build time series for this subcategory
        time_series = []
        for year in all_years:
            eff = calc_efficiency(sub_code, year)
            if eff:
                # Get GDP ratio for total spending
                total_gdp_pct = by_year_func_trans_gdp.get((year, sub_code, 'OTES'), 0)
                time_series.append({
                    'year': year,
                    'total_million': eff['total_million'],
                    'total_gdp_pct': round(total_gdp_pct, 2),
                    'benefits_million': eff['benefits_million'],
                    'bureaucracy_million': eff['bureaucracy_million'],
                    'efficiency_pct': eff['efficiency_pct'],
                    'bureaucracy_pct': eff['bureaucracy_pct'],
                })
        
        subcategories.append({
            'code': sub_code,
            'name': sub_name,
            **latest_eff,
            'time_series': time_series,
        })
    
    # Sort by total spending
    subcategories.sort(key=lambda x: -x['total_million'])
    
    # Build total G10 time series
    g10_time_series = []
    for year in all_years:
        eff = calc_efficiency('G10', year)
        if eff:
            total_gdp_pct = by_year_func_trans_gdp.get((year, 'G10', 'OTES'), 0)
            g10_time_series.append({
                'year': year,
                'total_million': eff['total_million'],
                'total_gdp_pct': round(total_gdp_pct, 2),
                'benefits_million': eff['benefits_million'],
                'bureaucracy_million': eff['bureaucracy_million'],
                'efficiency_pct': eff['efficiency_pct'],
                'bureaucracy_pct': eff['bureaucracy_pct'],
            })
    
    # Calculate G10 totals for latest year
    g10_latest = calc_efficiency('G10', latest_year)
    g10_gdp_pct = by_year_func_trans_gdp.get((latest_year, 'G10', 'OTES'), 0)
    
    # Find most and least efficient subcategories
    significant_subs = [s for s in subcategories if s['total_million'] > 500]
    most_efficient = max(significant_subs, key=lambda x: x['efficiency_pct']) if significant_subs else None
    least_efficient = min(significant_subs, key=lambda x: x['efficiency_pct']) if significant_subs else None
    most_bureaucratic = max(significant_subs, key=lambda x: x['bureaucracy_pct']) if significant_subs else None
    
    summary = {
        'year': latest_year,
        'total_billion': round(g10_latest['total_million'] / 1000, 1) if g10_latest else 0,
        'total_gdp_pct': round(g10_gdp_pct, 1),
        'benefits_billion': round(g10_latest['benefits_million'] / 1000, 1) if g10_latest else 0,
        'bureaucracy_billion': round(g10_latest['bureaucracy_million'] / 1000, 1) if g10_latest else 0,
        'efficiency_pct': g10_latest['efficiency_pct'] if g10_latest else 0,
        'bureaucracy_pct': g10_latest['bureaucracy_pct'] if g10_latest else 0,
        'most_efficient': {
            'code': most_efficient['code'],
            'name': most_efficient['name'],
            'efficiency_pct': most_efficient['efficiency_pct'],
            'total_billion': round(most_efficient['total_million'] / 1000, 1),
        } if most_efficient else None,
        'least_efficient': {
            'code': least_efficient['code'],
            'name': least_efficient['name'],
            'efficiency_pct': least_efficient['efficiency_pct'],
            'total_billion': round(least_efficient['total_million'] / 1000, 1),
        } if least_efficient else None,
        'most_bureaucratic': {
            'code': most_bureaucratic['code'],
            'name': most_bureaucratic['name'],
            'bureaucracy_pct': most_bureaucratic['bureaucracy_pct'],
            'total_billion': round(most_bureaucratic['total_million'] / 1000, 1),
        } if most_bureaucratic else None,
    }
    
    return {
        'metadata': {
            'source': 'Statistics Finland',
            'table': 'statfin_jmete_pxt_12a6',
            'description': 'Social Protection (G10) expenditure efficiency analysis',
            'fetched_at': datetime.now().isoformat(),
            'methodology': 'Efficiency = (D62K cash + D632K in-kind) / Total. Bureaucracy = D1K wages.',
            'focus': 'Social Protection only - this efficiency metric does not apply to administration or infrastructure.',
        },
        'summary': summary,
        'g10_time_series': g10_time_series,
        'subcategories': subcategories,
    }


def main():
    """Main function."""
    output_dir = Path(__file__).parent.parent / 'data'
    public_dir = Path(__file__).parent.parent / 'public' / 'data'
    output_dir.mkdir(exist_ok=True)
    public_dir.mkdir(exist_ok=True)
    
    try:
        print("=" * 60)
        raw_data = fetch_social_protection_data()
        if not raw_data:
            raise Exception("Failed to fetch data")
        
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
        print("SOCIAL PROTECTION EFFICIENCY ANALYSIS")
        print("=" * 60)
        summary = transformed['summary']
        print(f"Year: {summary['year']}")
        print(f"Total Social Protection: €{summary['total_billion']}B")
        print(f"Direct Benefits: €{summary['benefits_billion']}B ({summary['efficiency_pct']}%)")
        print(f"Bureaucracy: €{summary['bureaucracy_billion']}B ({summary['bureaucracy_pct']}%)")
        
        print("\nBy Subcategory:")
        print("-" * 70)
        for sub in transformed['subcategories']:
            print(f"  {sub['name']:<25} €{sub['total_million']/1000:>5.1f}B  eff: {sub['efficiency_pct']:>5.1f}%  bur: {sub['bureaucracy_pct']:>5.1f}%")
        
        if summary.get('most_efficient'):
            print(f"\nMost Efficient: {summary['most_efficient']['name']} ({summary['most_efficient']['efficiency_pct']}%)")
        if summary.get('least_efficient'):
            print(f"Least Efficient: {summary['least_efficient']['name']} ({summary['least_efficient']['efficiency_pct']}%)")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == '__main__':
    exit(main())
