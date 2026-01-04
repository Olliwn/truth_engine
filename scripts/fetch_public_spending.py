#!/usr/bin/env python3
"""
Fetch Finnish government expenditure by function (COFOG classification).
Table: statfin_jmete_pxt_12a6 - General government expenditure by function (1990-2024)

This data powers the Nu page - Public Spending Structure
"""

import json
import requests
from pathlib import Path
from datetime import datetime

BASE_URL = "https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin"

# COFOG function codes and names
COFOG_FUNCTIONS = {
    'G01': 'General public services',
    'G02': 'Defence',
    'G03': 'Public order and safety',
    'G04': 'Economic affairs',
    'G05': 'Environmental protection',
    'G06': 'Housing and community',
    'G07': 'Health',
    'G08': 'Recreation, culture, religion',
    'G09': 'Education',
    'G10': 'Social protection',
}

# Sub-functions for detailed breakdown
COFOG_SUBFUNCTIONS = {
    'G0101': 'Executive and legislative',
    'G0102': 'Foreign economic aid',
    'G0103': 'General services',
    'G0104': 'Basic research',
    'G0105': 'R&D public services',
    'G0106': 'Other public services',
    'G0107': 'Public debt transactions',
    'G0108': 'Transfers between govt levels',
    'G0201': 'Military defence',
    'G0202': 'Civil defence',
    'G0301': 'Police services',
    'G0302': 'Fire protection',
    'G0303': 'Law courts',
    'G0304': 'Prisons',
    'G0401': 'Economic and labour affairs',
    'G0402': 'Agriculture, forestry, fishing',
    'G0403': 'Fuel and energy',
    'G0404': 'Mining, manufacturing',
    'G0405': 'Transport',
    'G0406': 'Communications',
    'G0407': 'Other industries',
    'G0408': 'R&D economic affairs',
    'G0501': 'Waste management',
    'G0502': 'Waste water management',
    'G0503': 'Pollution abatement',
    'G0504': 'Biodiversity protection',
    'G0601': 'Housing development',
    'G0602': 'Community development',
    'G0603': 'Water supply',
    'G0604': 'Street lighting',
    'G0701': 'Medical products',
    'G0702': 'Outpatient services',
    'G0703': 'Hospital services',
    'G0704': 'Public health services',
    'G0801': 'Recreation and sports',
    'G0802': 'Cultural services',
    'G0803': 'Broadcasting',
    'G0804': 'Religious services',
    'G0901': 'Pre-primary and primary',
    'G0902': 'Secondary education',
    'G0903': 'Post-secondary non-tertiary',
    'G0904': 'Tertiary education',
    'G0905': 'Other education',
    'G0906': 'Subsidiary services',
    'G1001': 'Sickness and disability',
    'G1002': 'Old age',
    'G1003': 'Survivors',
    'G1004': 'Family and children',
    'G1005': 'Unemployment',
    'G1006': 'Housing assistance',
    'G1007': 'Social exclusion',
}

SECTOR_NAMES = {
    'S13': 'General government (total)',
    'S1311': 'Central government',
    'S1313': 'Local government',
    'S1314': 'Social security funds',
}


def fetch_table_metadata(url):
    """Fetch table metadata."""
    try:
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"  Error: {e}")
    return None


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


def fetch_expenditure_by_function():
    """Fetch government expenditure by COFOG function."""
    print("Fetching government expenditure by function...")
    url = f"{BASE_URL}/jmete/statfin_jmete_pxt_12a6.px"
    
    metadata = fetch_table_metadata(url)
    if not metadata:
        return None
    
    variables = {v['code']: v for v in metadata['variables']}
    year_codes = variables.get('Vuosi', {}).get('values', [])
    function_codes = variables.get('Tehtävä', {}).get('values', [])
    
    # Get main functions (G01-G10) and key sub-functions
    main_functions = ['SSS'] + [f'G{i:02d}' for i in range(1, 11)]
    # Also get some key sub-functions for detailed breakdown
    subfunctions = [c for c in function_codes if len(c) == 5 and c.startswith('G')]
    
    all_functions = main_functions + subfunctions[:50]  # Limit to avoid too large query
    
    query = {
        "query": [
            {"code": "Sektori", "selection": {"filter": "item", "values": ["S13", "S1311", "S1313", "S1314"]}},
            {"code": "Taloustoimi", "selection": {"filter": "item", "values": ["OTES"]}},  # Total expenditure, consolidated
            {"code": "Tehtävä", "selection": {"filter": "item", "values": all_functions}},
            {"code": "Vuosi", "selection": {"filter": "item", "values": year_codes}},
            {"code": "Tiedot", "selection": {"filter": "item", "values": ["cp", "bkt_suhde", "percapita"]}},
        ],
        "response": {"format": "json-stat2"}
    }
    
    return fetch_data(url, query)


def transform_data(records):
    """Transform records into structured spending data."""
    
    # Organize by year, sector, function, and metric
    by_year_sector_func = {}
    
    for rec in records:
        year = rec.get('Vuosi_code', '')
        sector = rec.get('Sektori_code', '')
        func = rec.get('Tehtävä_code', '')
        metric = rec.get('Tiedot_code', '')
        value = rec.get('value')
        
        if not year or not sector or not func or value is None:
            continue
        
        try:
            year_int = int(year)
        except ValueError:
            continue
        
        key = (year_int, sector, func)
        if key not in by_year_sector_func:
            by_year_sector_func[key] = {}
        by_year_sector_func[key][metric] = value
    
    # Get latest year for summary
    all_years = sorted(set(k[0] for k in by_year_sector_func.keys()))
    latest_year = all_years[-1] if all_years else 2024
    
    # Build by_function for latest year (total government S13)
    by_function = []
    for code in ['G01', 'G02', 'G03', 'G04', 'G05', 'G06', 'G07', 'G08', 'G09', 'G10']:
        key = (latest_year, 'S13', code)
        data = by_year_sector_func.get(key, {})
        
        if not data:
            continue
        
        # Get subcategories
        subcategories = []
        for subcode, subname in COFOG_SUBFUNCTIONS.items():
            if subcode.startswith(code):
                subkey = (latest_year, 'S13', subcode)
                subdata = by_year_sector_func.get(subkey, {})
                if subdata and subdata.get('cp'):
                    subcategories.append({
                        'code': subcode,
                        'name': subname,
                        'amount_million': round(subdata.get('cp', 0), 1),
                        'pct_of_gdp': round(subdata.get('bkt_suhde', 0), 2),
                        'per_capita': round(subdata.get('percapita', 0), 0),
                    })
        
        by_function.append({
            'code': code,
            'name': COFOG_FUNCTIONS.get(code, code),
            'amount_million': round(data.get('cp', 0), 1),
            'pct_of_gdp': round(data.get('bkt_suhde', 0), 2),
            'per_capita': round(data.get('percapita', 0), 0),
            'subcategories': sorted(subcategories, key=lambda x: -x['amount_million']),
        })
    
    # Sort by amount
    by_function.sort(key=lambda x: -x['amount_million'])
    
    # Build by_sector for latest year (total function SSS)
    by_sector = {}
    for sector_code, sector_name in [('S1311', 'central'), ('S1313', 'local'), ('S1314', 'social_security')]:
        key = (latest_year, sector_code, 'SSS')
        data = by_year_sector_func.get(key, {})
        by_sector[sector_name] = {
            'code': sector_code,
            'name': SECTOR_NAMES.get(sector_code, sector_code),
            'amount_million': round(data.get('cp', 0), 1),
            'pct_of_gdp': round(data.get('bkt_suhde', 0), 2),
            'per_capita': round(data.get('percapita', 0), 0),
        }
    
    # Build time series (main functions only, S13 total)
    time_series = []
    for year in all_years:
        entry = {'year': year, 'categories': {}}
        
        # Total spending
        total_key = (year, 'S13', 'SSS')
        total_data = by_year_sector_func.get(total_key, {})
        entry['total_million'] = round(total_data.get('cp', 0), 1)
        entry['total_pct_gdp'] = round(total_data.get('bkt_suhde', 0), 2)
        entry['total_per_capita'] = round(total_data.get('percapita', 0), 0)
        
        # By function
        for code in ['G01', 'G02', 'G03', 'G04', 'G05', 'G06', 'G07', 'G08', 'G09', 'G10']:
            key = (year, 'S13', code)
            data = by_year_sector_func.get(key, {})
            entry['categories'][code] = {
                'amount_million': round(data.get('cp', 0), 1),
                'pct_of_gdp': round(data.get('bkt_suhde', 0), 2),
            }
        
        time_series.append(entry)
    
    # Calculate summary
    total_key = (latest_year, 'S13', 'SSS')
    total_data = by_year_sector_func.get(total_key, {})
    
    # Find largest and fastest growing
    largest = max(by_function, key=lambda x: x['amount_million']) if by_function else None
    
    # Calculate growth rates (latest vs 10 years ago)
    growth_rates = {}
    comparison_year = latest_year - 10 if latest_year - 10 in all_years else all_years[0]
    for code in ['G01', 'G02', 'G03', 'G04', 'G05', 'G06', 'G07', 'G08', 'G09', 'G10']:
        old_key = (comparison_year, 'S13', code)
        new_key = (latest_year, 'S13', code)
        old_val = by_year_sector_func.get(old_key, {}).get('cp', 0)
        new_val = by_year_sector_func.get(new_key, {}).get('cp', 0)
        if old_val and old_val > 0:
            growth_rates[code] = ((new_val - old_val) / old_val) * 100
    
    fastest_growing_code = max(growth_rates, key=growth_rates.get) if growth_rates else None
    fastest_growing = COFOG_FUNCTIONS.get(fastest_growing_code, '')
    
    summary = {
        'year': latest_year,
        'comparison_year': comparison_year,
        'total_spending_billion': round(total_data.get('cp', 0) / 1000, 1),
        'pct_of_gdp': round(total_data.get('bkt_suhde', 0), 1),
        'per_capita': round(total_data.get('percapita', 0), 0),
        'largest_category': largest['name'] if largest else '',
        'largest_category_billion': round(largest['amount_million'] / 1000, 1) if largest else 0,
        'largest_category_pct': round(largest['amount_million'] / total_data.get('cp', 1) * 100, 1) if largest else 0,
        'fastest_growing': fastest_growing,
        'fastest_growing_pct': round(growth_rates.get(fastest_growing_code, 0), 1) if fastest_growing_code else 0,
    }
    
    return {
        'metadata': {
            'source': 'Statistics Finland',
            'table': 'statfin_jmete_pxt_12a6',
            'description': 'General government expenditure by COFOG function',
            'fetched_at': datetime.now().isoformat(),
            'classification': 'COFOG (Classification of Functions of Government)',
            'note': 'Expenditure = consolidated total (OTES). Includes central govt, local govt, and social security funds.',
        },
        'summary': summary,
        'by_function': by_function,
        'by_sector': by_sector,
        'time_series': time_series,
        'cofog_names': COFOG_FUNCTIONS,
    }


def main():
    """Main function."""
    output_dir = Path(__file__).parent.parent / 'data'
    public_dir = Path(__file__).parent.parent / 'public' / 'data'
    output_dir.mkdir(exist_ok=True)
    public_dir.mkdir(exist_ok=True)
    
    try:
        print("=" * 60)
        raw_data = fetch_expenditure_by_function()
        if not raw_data:
            raise Exception("Failed to fetch expenditure data")
        
        records = parse_json_stat(raw_data)
        print(f"  Parsed {len(records)} expenditure records")
        
        print("=" * 60)
        print("Transforming data...")
        transformed = transform_data(records)
        
        # Save
        output_file = output_dir / 'public_spending.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(transformed, f, ensure_ascii=False, indent=2)
        print(f"Saved to {output_file}")
        
        public_file = public_dir / 'public_spending.json'
        with open(public_file, 'w', encoding='utf-8') as f:
            json.dump(transformed, f, ensure_ascii=False, indent=2)
        print(f"Saved to {public_file}")
        
        # Print summary
        print("\n" + "=" * 60)
        print("PUBLIC SPENDING SUMMARY")
        print("=" * 60)
        summary = transformed['summary']
        print(f"Year: {summary['year']}")
        print(f"Total spending: €{summary['total_spending_billion']}B ({summary['pct_of_gdp']}% of GDP)")
        print(f"Per capita: €{summary['per_capita']}")
        print(f"Largest: {summary['largest_category']} (€{summary['largest_category_billion']}B, {summary['largest_category_pct']}%)")
        print(f"Fastest growing: {summary['fastest_growing']} (+{summary['fastest_growing_pct']}% since {summary['comparison_year']})")
        
        print("\nBy Function (COFOG):")
        print("-" * 50)
        for cat in transformed['by_function']:
            pct = cat['amount_million'] / (summary['total_spending_billion'] * 1000) * 100
            bar = '█' * int(pct / 2)
            print(f"  {cat['name']:<30} €{cat['amount_million']/1000:>5.1f}B  {pct:>4.1f}% {bar}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == '__main__':
    exit(main())

