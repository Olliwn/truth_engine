#!/usr/bin/env python3
"""
Fetch population projections from Statistics Finland PxWeb API.
Table: statfin_vaenn_pxt_14wx (Population projection 2024)
"""

import json
import requests
from pathlib import Path

# Statistics Finland PxWeb API endpoint for population projections 2024
URL = "https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/vaenn/statfin_vaenn_pxt_14wx.px"

def fetch_table_metadata():
    """Fetch table metadata to understand available dimensions."""
    response = requests.get(URL)
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Failed to fetch metadata: {response.status_code} - {response.text[:200]}")

def fetch_population_projection(years: list[str] = None):
    """
    Fetch population projection data for all municipalities.
    
    Args:
        years: List of years to fetch (default: ["2024", "2035", "2040", "2050"])
    """
    if years is None:
        years = ["2024", "2035", "2040", "2050"]
    
    print("Fetching table metadata...")
    metadata = fetch_table_metadata()
    
    variables = {v['code']: v for v in metadata['variables']}
    print(f"Available dimensions: {list(variables.keys())}")
    
    # Get available values
    year_codes = variables.get('Vuosi', {}).get('values', [])
    area_codes = variables.get('Alue', {}).get('values', [])
    age_codes = variables.get('Ikä', {}).get('values', [])
    
    print(f"Available years: {year_codes[:5]}... ({len(year_codes)} total)")
    print(f"Available areas: {len(area_codes)} municipalities")
    print(f"Available age groups: {len(age_codes)} ages")
    
    # Filter to requested years
    available_years = [y for y in years if y in year_codes]
    if not available_years:
        available_years = year_codes[:4]  # Take first 4 if requested not found
    print(f"Fetching data for years: {available_years}")
    
    # Filter ages - we want single-year ages (not totals)
    # Age codes are like '000', '001', ..., '100', 'SSS' (total)
    single_ages = [a for a in age_codes if a.isdigit() or (len(a) == 3 and a != 'SSS')]
    
    query = {
        "query": [
            {
                "code": "Vuosi",
                "selection": {
                    "filter": "item",
                    "values": available_years
                }
            },
            {
                "code": "Alue",
                "selection": {
                    "filter": "all",
                    "values": ["*"]
                }
            },
            {
                "code": "Ikä",
                "selection": {
                    "filter": "item",
                    "values": single_ages  # Only single-year ages
                }
            },
            {
                "code": "Sukupuoli",
                "selection": {
                    "filter": "item",
                    "values": ["SSS"]  # Total (both sexes)
                }
            }
        ],
        "response": {
            "format": "json-stat2"
        }
    }
    
    print("Fetching population projection data...")
    response = requests.post(URL, json=query)
    
    if response.status_code != 200:
        print(f"Error: {response.status_code}")
        print(response.text[:500])
        raise Exception(f"Failed to fetch data: {response.status_code}")
    
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
            
        record = {'population': value}
        
        remaining = i
        for j, dim_id in enumerate(dim_order):
            dim_idx = remaining // strides[j]
            remaining = remaining % strides[j]
            
            code = dim_info[dim_id]['reverse_index'].get(dim_idx, str(dim_idx))
            label = dim_info[dim_id]['labels'].get(code, code)
            
            record[dim_id] = code
            record[f'{dim_id}_label'] = label
        
        records.append(record)
    
    return records

def aggregate_by_age_groups(records: list[dict]) -> list[dict]:
    """Aggregate population data into working age (20-64) and dependents (0-19, 65+)."""
    from collections import defaultdict
    
    aggregated = defaultdict(lambda: {
        'working_age': 0, 
        'young_dependents': 0, 
        'elderly_dependents': 0, 
        'total': 0
    })
    
    for record in records:
        area = record.get('Alue', '')
        year = record.get('Vuosi', '')
        age_str = record.get('Ikä', '')
        population = record.get('population', 0)
        
        if not area or not year or population is None:
            continue
        
        # Skip "WHOLE COUNTRY" and similar aggregates
        if area == 'SSS':
            continue
        
        key = (area, year, record.get('Alue_label', ''))
        
        # Parse age
        try:
            age = int(age_str)
        except ValueError:
            continue
        
        # Categorize by age group
        if 0 <= age <= 19:
            aggregated[key]['young_dependents'] += population
        elif 20 <= age <= 64:
            aggregated[key]['working_age'] += population
        elif age >= 65:
            aggregated[key]['elderly_dependents'] += population
        
        aggregated[key]['total'] += population
    
    result = []
    for (area_code, year, area_label), data in aggregated.items():
        if data['total'] == 0:
            continue
            
        result.append({
            'municipality_code': area_code,
            'municipality_name': area_label,
            'year': year,
            'working_age_20_64': data['working_age'],
            'young_dependents_0_19': data['young_dependents'],
            'elderly_dependents_65_plus': data['elderly_dependents'],
            'total_population': data['total'],
            'total_dependents': data['young_dependents'] + data['elderly_dependents'],
            'dependency_ratio': round(
                (data['young_dependents'] + data['elderly_dependents']) / max(data['working_age'], 1),
                4
            )
        })
    
    return result

def main():
    """Main function to fetch and save population data."""
    output_dir = Path(__file__).parent.parent / 'data'
    output_dir.mkdir(exist_ok=True)
    
    try:
        # Fetch raw data
        raw_data = fetch_population_projection()
        
        # Save raw JSON-stat data
        raw_output = output_dir / 'population_raw.json'
        with open(raw_output, 'w', encoding='utf-8') as f:
            json.dump(raw_data, f, ensure_ascii=False, indent=2)
        print(f"Saved raw data to {raw_output}")
        
        # Parse into records
        print("Parsing JSON-stat format...")
        records = parse_json_stat(raw_data)
        print(f"Parsed {len(records)} records")
        
        # Aggregate by age groups
        print("Aggregating by age groups...")
        aggregated = aggregate_by_age_groups(records)
        print(f"Aggregated to {len(aggregated)} municipality-year combinations")
        
        # Save aggregated data
        output_file = output_dir / 'population_projection.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(aggregated, f, ensure_ascii=False, indent=2)
        print(f"Saved aggregated data to {output_file}")
        
        # Print sample
        if aggregated:
            print("\nSample data:")
            # Sort by dependency ratio to show some interesting results
            sample = sorted(aggregated, key=lambda x: x['dependency_ratio'], reverse=True)[:5]
            for record in sample:
                print(f"  {record['municipality_name']} ({record['year']}): "
                      f"Working age: {record['working_age_20_64']:,}, "
                      f"Dependents: {record['total_dependents']:,}, "
                      f"Ratio: {record['dependency_ratio']:.2f}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == '__main__':
    exit(main())
