#!/usr/bin/env python3
"""
Fetch fertility and birth rate data from Statistics Finland.
Table: statfin_synt_pxt_12ds (Total fertility rate)
Table: statfin_tyti_pxt_135y (Labour force participation)

This data powers the Iota page - Fertility Equation
"""

import json
import requests
from pathlib import Path
from datetime import datetime

# Statistics Finland PxWeb API endpoints - Total fertility rate
FERTILITY_URL = "https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/synt/statfin_synt_pxt_12dt.px"
LABOR_URL = "https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/tyti/statfin_tyti_pxt_135y.px"


def fetch_table_metadata(url):
    """Fetch table metadata to understand available dimensions."""
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Failed to fetch metadata: {response.status_code} - {url}")


def fetch_fertility_data():
    """Fetch total fertility rate data."""
    print("Fetching fertility data metadata...")
    metadata = fetch_table_metadata(FERTILITY_URL)
    
    variables = {v['code']: v for v in metadata['variables']}
    print(f"Available dimensions: {list(variables.keys())}")
    
    for var_name, var_data in variables.items():
        values = var_data.get('values', [])
        texts = var_data.get('valueTexts', [])
        print(f"\n{var_name} ({len(values)} values):")
        for code, text in list(zip(values[:10], texts[:10])):
            print(f"  {code}: {text}")
    
    year_codes = variables.get('Vuosi', {}).get('values', [])
    
    query = {
        "query": [
            {
                "code": "Vuosi",
                "selection": {
                    "filter": "item",
                    "values": year_codes
                }
            }
        ],
        "response": {
            "format": "json-stat2"
        }
    }
    
    # Add other required dimensions
    for var_name in variables:
        if var_name not in ['Vuosi', 'Tiedot']:
            query['query'].append({
                "code": var_name,
                "selection": {
                    "filter": "item",
                    "values": ["SSS"] if "SSS" in variables[var_name].get('values', []) else variables[var_name].get('values', [])[:1]
                }
            })
    
    print("\nFetching fertility data...")
    response = requests.post(FERTILITY_URL, json=query)
    
    if response.status_code != 200:
        print(f"Error: {response.status_code}")
        print(response.text[:500])
        raise Exception(f"Failed to fetch fertility data: {response.status_code}")
    
    return response.json()


def fetch_labor_participation():
    """Fetch female labor force participation rate."""
    print("\nFetching labor participation metadata...")
    
    try:
        metadata = fetch_table_metadata(LABOR_URL)
        
        variables = {v['code']: v for v in metadata['variables']}
        print(f"Available dimensions: {list(variables.keys())}")
        
        year_codes = variables.get('Vuosi', {}).get('values', [])
        sex_codes = variables.get('Sukupuoli', {}).get('values', [])
        
        # We want female participation specifically
        female_code = None
        for code, text in zip(sex_codes, variables.get('Sukupuoli', {}).get('valueTexts', [])):
            if 'female' in text.lower() or 'naiset' in text.lower() or code == '2':
                female_code = code
                break
        
        query = {
            "query": [
                {
                    "code": "Vuosi",
                    "selection": {
                        "filter": "item",
                        "values": year_codes
                    }
                },
                {
                    "code": "Sukupuoli",
                    "selection": {
                        "filter": "item",
                        "values": [female_code] if female_code else sex_codes[:1]
                    }
                }
            ],
            "response": {
                "format": "json-stat2"
            }
        }
        
        print("Fetching labor participation data...")
        response = requests.post(LABOR_URL, json=query)
        
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"Could not fetch labor participation: {e}")
    
    return None


def parse_json_stat(data: dict) -> list[dict]:
    """Parse JSON-stat2 format into a list of records."""
    if not data:
        return []
        
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


def transform_fertility_data(fertility_records: list[dict], labor_records: list[dict]) -> dict:
    """
    Transform fertility and labor records into combined dataset.
    """
    
    # Process fertility data
    fertility_by_year = {}
    for record in fertility_records:
        year = record.get('Vuosi_code', '')
        value = record.get('value', None)
        
        if not year or value is None:
            continue
        
        try:
            year_int = int(year)
        except ValueError:
            continue
        
        fertility_by_year[year_int] = value
    
    # Process labor data
    labor_by_year = {}
    for record in labor_records:
        year = record.get('Vuosi_code', '')
        value = record.get('value', None)
        
        if not year or value is None:
            continue
        
        try:
            year_int = int(year)
        except ValueError:
            continue
        
        labor_by_year[year_int] = value
    
    # Combine into time series
    all_years = sorted(set(fertility_by_year.keys()) | set(labor_by_year.keys()))
    
    time_series = []
    for year in all_years:
        entry = {
            'year': year,
            'tfr': fertility_by_year.get(year),
            'female_labor_participation': labor_by_year.get(year),
        }
        
        # Calculate replacement level gap
        if entry['tfr']:
            entry['replacement_gap'] = round(2.1 - entry['tfr'], 2)
        
        time_series.append(entry)
    
    # Calculate summary statistics
    summary = {}
    tfr_values = [(y['year'], y['tfr']) for y in time_series if y['tfr']]
    
    if len(tfr_values) >= 2:
        # Find peak and trough
        peak = max(tfr_values, key=lambda x: x[1])
        trough = min(tfr_values, key=lambda x: x[1])
        
        # Recent trend (last 10 years)
        recent = [v for v in tfr_values if v[0] >= 2010]
        
        summary = {
            'period': f"{tfr_values[0][0]}-{tfr_values[-1][0]}",
            'current_tfr': tfr_values[-1][1],
            'peak_year': peak[0],
            'peak_tfr': peak[1],
            'trough_year': trough[0],
            'trough_tfr': trough[1],
            'below_replacement_since': None,
            'tfr_change_since_1990': None,
        }
        
        # Find when TFR dropped below replacement (2.1)
        for year, tfr in tfr_values:
            if tfr < 2.1:
                summary['below_replacement_since'] = year
                break
        
        # Calculate change
        tfr_1990 = next((v[1] for v in tfr_values if v[0] >= 1990), None)
        if tfr_1990:
            summary['tfr_change_since_1990'] = round(tfr_values[-1][1] - tfr_1990, 2)
    
    return {
        'metadata': {
            'source': 'Statistics Finland',
            'tables': ['statfin_synt_pxt_12ds', 'statfin_tyti_pxt_135y'],
            'description': 'Total fertility rate and female labor force participation',
            'fetched_at': datetime.now().isoformat(),
            'replacement_level': 2.1,
            'note': 'TFR below 2.1 means population decline without immigration'
        },
        'summary': summary,
        'time_series': time_series
    }


def main():
    """Main function to fetch and save fertility data."""
    output_dir = Path(__file__).parent.parent / 'data'
    output_dir.mkdir(exist_ok=True)
    
    try:
        # Fetch fertility data
        raw_fertility = fetch_fertility_data()
        
        # Save raw fertility data
        raw_output = output_dir / 'fertility_raw.json'
        with open(raw_output, 'w', encoding='utf-8') as f:
            json.dump(raw_fertility, f, ensure_ascii=False, indent=2)
        print(f"Saved raw fertility data to {raw_output}")
        
        # Parse fertility
        fertility_records = parse_json_stat(raw_fertility)
        print(f"Parsed {len(fertility_records)} fertility records")
        
        # Fetch labor participation (may fail, that's ok)
        raw_labor = fetch_labor_participation()
        labor_records = parse_json_stat(raw_labor) if raw_labor else []
        print(f"Parsed {len(labor_records)} labor records")
        
        # Transform combined data
        transformed = transform_fertility_data(fertility_records, labor_records)
        
        # Save transformed data
        output_file = output_dir / 'fertility.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(transformed, f, ensure_ascii=False, indent=2)
        print(f"Saved transformed data to {output_file}")
        
        # Print summary
        print("\n--- Fertility Summary ---")
        summary = transformed.get('summary', {})
        if summary:
            print(f"Period: {summary.get('period', 'N/A')}")
            print(f"Current TFR: {summary.get('current_tfr', 'N/A')}")
            print(f"Peak: {summary.get('peak_tfr', 'N/A')} ({summary.get('peak_year', 'N/A')})")
            print(f"Below replacement since: {summary.get('below_replacement_since', 'N/A')}")
            print(f"Change since 1990: {summary.get('tfr_change_since_1990', 'N/A')}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == '__main__':
    exit(main())

