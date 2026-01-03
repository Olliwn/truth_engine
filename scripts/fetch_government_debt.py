#!/usr/bin/env python3
"""
Fetch government debt and financial position data from Statistics Finland.
Table: statfin_jyra_pxt_12rp (General government debt)

This data powers the Theta page - True Balance Sheet
"""

import json
import requests
from pathlib import Path
from datetime import datetime

# Statistics Finland PxWeb API endpoints - General government EDP debt
DEBT_URL = "https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/jyev/statfin_jyev_pxt_11yv.px"


def fetch_table_metadata(url):
    """Fetch table metadata to understand available dimensions."""
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Failed to fetch metadata: {response.status_code}")


def fetch_government_debt():
    """Fetch government debt data by sector."""
    print("Fetching government debt metadata...")
    metadata = fetch_table_metadata(DEBT_URL)
    
    variables = {v['code']: v for v in metadata['variables']}
    print(f"Available dimensions: {list(variables.keys())}")
    
    for var_name, var_data in variables.items():
        values = var_data.get('values', [])
        texts = var_data.get('valueTexts', [])
        print(f"\n{var_name} ({len(values)} values):")
        for code, text in list(zip(values[:10], texts[:10])):
            print(f"  {code}: {text}")
    
    quarter_codes = variables.get('Vuosineljännes', {}).get('values', [])
    sector_codes = variables.get('Velallissektori', {}).get('values', [])
    
    print(f"Quarters available: {quarter_codes[:5]}...{quarter_codes[-5:]}")
    print(f"Sectors: {sector_codes}")
    
    query = {
        "query": [
            {
                "code": "Vuosineljännes",
                "selection": {
                    "filter": "item",
                    "values": quarter_codes
                }
            },
            {
                "code": "Velallissektori",
                "selection": {
                    "filter": "item",
                    "values": sector_codes
                }
            },
            {
                "code": "Vara",
                "selection": {
                    "filter": "item",
                    "values": ["F2TF4"]  # Total debt (Cash, deposits, debt securities and loans)
                }
            },
            {
                "code": "Tiedot",
                "selection": {
                    "filter": "item",
                    "values": ["K"]  # EDP debt
                }
            }
        ],
        "response": {
            "format": "json-stat2"
        }
    }
    
    print("\nFetching government debt data...")
    response = requests.post(DEBT_URL, json=query)
    
    if response.status_code != 200:
        print(f"Error: {response.status_code}")
        print(response.text[:500])
        raise Exception(f"Failed to fetch debt data: {response.status_code}")
    
    return response.json()


def parse_json_stat(data: dict) -> list[dict]:
    """Parse JSON-stat2 format into a list of records."""
    dimensions = data['dimension']
    dim_order = data['id']
    values = data['value']
    
    dim_info = {}
    for dim_id in dim_order:
        dim = dimensions[dim_id]
        categories = dim['category']
        dim_info[dim_id] = {
            'size': data['size'][dim_order.index(dim_id)],
            'labels': categories.get('label', {}),
            'index': categories.get('index', {})
        }
    
    for dim_id in dim_info:
        index = dim_info[dim_id]['index']
        dim_info[dim_id]['reverse_index'] = {v: k for k, v in index.items()}
    
    records = []
    
    # Calculate strides
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


def transform_debt_data(records: list[dict]) -> dict:
    """
    Transform quarterly debt records into yearly data.
    
    Sectors:
    - S13_C: General government (consolidated)
    - S1311: Central government
    - S1313: Local government (municipalities)
    - S1314: Social security funds
    """
    
    # Aggregate quarterly data into yearly (use Q4 as year-end)
    by_year = {}
    
    for record in records:
        quarter = record.get('Vuosineljännes_code', '')  # e.g., "2000Q1"
        sector = record.get('Velallissektori_code', '')
        sector_label = record.get('Velallissektori_label', '')
        value = record.get('value', 0)
        
        if not quarter or value is None:
            continue
        
        # Extract year
        try:
            year = int(quarter[:4])
            q = quarter[-2:]  # Q1, Q2, Q3, Q4
        except (ValueError, IndexError):
            continue
        
        # Only use Q4 data for year-end snapshot
        if q != 'Q4':
            continue
        
        if year not in by_year:
            by_year[year] = {
                'year': year,
                'total_debt': 0,
                'central_debt': 0,
                'local_debt': 0,
                'social_security_debt': 0,
            }
        
        # Map sector to our categories
        if sector == 'S13_C':
            by_year[year]['total_debt'] = value
        elif sector == 'S1311':
            by_year[year]['central_debt'] = value
        elif sector == 'S1313':
            by_year[year]['local_debt'] = value
        elif sector == 'S1314':
            by_year[year]['social_security_debt'] = value
    
    # Build time series with calculated metrics
    time_series = []
    for year in sorted(by_year.keys()):
        data = by_year[year]
        
        entry = {
            'year': year,
            'total_debt_million': data['total_debt'],
            'central_debt_million': data['central_debt'],
            'local_debt_million': data['local_debt'],
            'social_security_debt_million': data['social_security_debt'],
        }
        
        # Calculate debt composition
        if data['total_debt'] > 0:
            entry['central_share_pct'] = round(100 * data['central_debt'] / data['total_debt'], 1)
            entry['local_share_pct'] = round(100 * data['local_debt'] / data['total_debt'], 1)
        
        time_series.append(entry)
    
    # Calculate summary
    summary = {}
    if len(time_series) >= 2:
        first = time_series[0]
        last = time_series[-1]
        
        debt_change = last['total_debt_million'] - first['total_debt_million']
        
        summary = {
            'period': f"{first['year']}-{last['year']}",
            'current_debt_billion': round(last['total_debt_million'] / 1000, 1),
            'debt_change_billion': round(debt_change / 1000, 1),
            'debt_growth_pct': round(100 * debt_change / first['total_debt_million'], 1) if first['total_debt_million'] > 0 else None,
            'central_debt_billion': round(last['central_debt_million'] / 1000, 1),
            'local_debt_billion': round(last['local_debt_million'] / 1000, 1),
        }
    
    return {
        'metadata': {
            'source': 'Statistics Finland',
            'table': 'statfin_jyev_pxt_11yv',
            'description': 'General government EDP debt by sector (quarterly, year-end values)',
            'fetched_at': datetime.now().isoformat(),
            'unit': 'Million EUR',
            'sectors': {
                'S13_C': 'General government (consolidated)',
                'S1311': 'Central government',
                'S1313': 'Local government',
                'S1314': 'Social security funds'
            }
        },
        'summary': summary,
        'time_series': time_series
    }


def main():
    """Main function to fetch and save government debt data."""
    output_dir = Path(__file__).parent.parent / 'data'
    output_dir.mkdir(exist_ok=True)
    
    try:
        # Fetch debt data
        raw_data = fetch_government_debt()
        
        # Save raw data
        raw_output = output_dir / 'government_debt_raw.json'
        with open(raw_output, 'w', encoding='utf-8') as f:
            json.dump(raw_data, f, ensure_ascii=False, indent=2)
        print(f"Saved raw debt data to {raw_output}")
        
        # Parse and transform
        records = parse_json_stat(raw_data)
        print(f"Parsed {len(records)} debt records")
        
        transformed = transform_debt_data(records)
        
        # Save transformed data
        output_file = output_dir / 'government_debt.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(transformed, f, ensure_ascii=False, indent=2)
        print(f"Saved transformed data to {output_file}")
        
        # Print summary
        print("\n--- Government Debt Summary ---")
        if transformed['time_series']:
            first = transformed['time_series'][0]
            last = transformed['time_series'][-1]
            print(f"Period: {first['year']} to {last['year']}")
            print(f"\nCurrent debt: €{transformed['summary'].get('current_debt_billion', 0):.1f}B")
            print(f"Change: €{transformed['summary'].get('debt_change_billion', 0):+.1f}B")
            print(f"Growth: {transformed['summary'].get('debt_growth_pct', 0):.1f}%")
            print(f"Central: €{transformed['summary'].get('central_debt_billion', 0):.1f}B")
            print(f"Local: €{transformed['summary'].get('local_debt_billion', 0):.1f}B")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == '__main__':
    exit(main())

