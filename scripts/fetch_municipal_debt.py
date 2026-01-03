#!/usr/bin/env python3
"""
Fetch municipal debt data from Statistics Finland PxWeb API.
Using Kuntien_talous_ja_toiminta (Municipal finances) database for loan stock data.
"""

import json
import requests
from pathlib import Path

# Statistics Finland PxWeb API - Municipal key figures 2020 (most recent with loan data)
URL = "https://pxdata.stat.fi/PxWeb/api/v1/en/Kuntien_talous_ja_toiminta/Kunnat/9._Tunnusluvut/006_kta_19_2020.px"

def fetch_table_metadata():
    """Fetch table metadata to understand available dimensions."""
    response = requests.get(URL)
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Failed to fetch metadata: {response.status_code} - {response.text[:200]}")

def fetch_municipal_debt():
    """Fetch municipal debt data for all municipalities."""
    print("Fetching table metadata...")
    metadata = fetch_table_metadata()
    
    variables = {v['code']: v for v in metadata['variables']}
    print(f"Available dimensions: {list(variables.keys())}")
    
    # Get available key figures
    kf_codes = variables.get('Tunnusluku', {}).get('values', [])
    kf_texts = variables.get('Tunnusluku', {}).get('valueTexts', [])
    
    print("Available key figures:")
    for code, text in zip(kf_codes, kf_texts):
        print(f"  {code}: {text}")
    
    # Key figures we want:
    # - lainakanta_asuk: Loan stock, EUR per capita
    # - lainakanta_eur: Loan stock, EUR 1,000
    # - k_lainakanta_asuk: Consolidated group loan stock, EUR per capita
    target_indicators = [
        'lainakanta_asuk',       # Loan stock per capita
        'lainakanta_eur',        # Loan stock in EUR 1,000
        'k_lainakanta_asuk',     # Consolidated loan stock per capita
        'k_lainakanta_eur',      # Consolidated loan stock EUR 1,000
        'suhteel_velkaant',      # Relative indebtedness %
        'omavaraisuus_aste',     # Equity ratio %
    ]
    
    # Filter to indicators that exist
    available_indicators = [i for i in target_indicators if i in kf_codes]
    print(f"Fetching indicators: {available_indicators}")
    
    query = {
        "query": [
            {
                "code": "Alue",
                "selection": {
                    "filter": "all",
                    "values": ["*"]
                }
            },
            {
                "code": "Tunnusluku",
                "selection": {
                    "filter": "item",
                    "values": available_indicators
                }
            }
        ],
        "response": {
            "format": "json-stat2"
        }
    }
    
    print("Fetching municipal debt data...")
    response = requests.post(URL, json=query)
    
    if response.status_code != 200:
        print(f"Error: {response.status_code}")
        print(response.text[:500])
        raise Exception(f"Failed to fetch data: {response.status_code}")
    
    return response.json(), "2020", available_indicators

def parse_json_stat_to_records(data: dict) -> list[dict]:
    """Parse JSON-stat2 format into a list of flat records."""
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
            
            record[dim_id] = code
            record[f'{dim_id}_label'] = label
        
        records.append(record)
    
    return records

def aggregate_by_municipality(records: list[dict], year: str) -> list[dict]:
    """Aggregate data by municipality, pivoting indicators into columns."""
    from collections import defaultdict
    
    by_municipality = defaultdict(dict)
    
    for record in records:
        area = record.get('Alue', '')
        area_label = record.get('Alue_label', area)
        indicator = record.get('Tunnusluku', '')
        indicator_label = record.get('Tunnusluku_label', '')
        value = record.get('value', 0)
        
        if not area:
            continue
        
        key = (area, area_label)
        by_municipality[key][indicator] = {
            'value': value,
            'label': indicator_label
        }
    
    result = []
    for (area_code, area_label), indicators in by_municipality.items():
        # Extract key metrics
        loan_per_capita = indicators.get('lainakanta_asuk', {}).get('value', 0)
        loan_total_1000 = indicators.get('lainakanta_eur', {}).get('value', 0)
        consolidated_per_capita = indicators.get('k_lainakanta_asuk', {}).get('value', 0)
        consolidated_total_1000 = indicators.get('k_lainakanta_eur', {}).get('value', 0)
        rel_indebtedness = indicators.get('suhteel_velkaant', {}).get('value', 0)
        equity_ratio = indicators.get('omavaraisuus_aste', {}).get('value', 0)
        
        # Use consolidated if available, otherwise regular loan stock
        primary_loan_per_capita = consolidated_per_capita if consolidated_per_capita > 0 else loan_per_capita
        primary_loan_total = (consolidated_total_1000 if consolidated_total_1000 > 0 else loan_total_1000) * 1000
        
        result.append({
            'municipality_code': area_code,
            'municipality_name': area_label,
            'year': year,
            'loan_per_capita_eur': round(primary_loan_per_capita, 2),
            'total_debt_eur': round(primary_loan_total, 2),
            'relative_indebtedness_pct': round(rel_indebtedness, 2),
            'equity_ratio_pct': round(equity_ratio, 2),
            'raw_indicators': {k: v for k, v in indicators.items()}
        })
    
    return result

def main():
    """Main function to fetch and save municipal debt data."""
    output_dir = Path(__file__).parent.parent / 'data'
    output_dir.mkdir(exist_ok=True)
    
    try:
        # Fetch raw data
        raw_data, year, indicators = fetch_municipal_debt()
        
        # Save raw JSON-stat data
        raw_output = output_dir / 'municipal_debt_raw.json'
        with open(raw_output, 'w', encoding='utf-8') as f:
            json.dump(raw_data, f, ensure_ascii=False, indent=2)
        print(f"Saved raw data to {raw_output}")
        
        # Parse into records
        print("Parsing JSON-stat format...")
        records = parse_json_stat_to_records(raw_data)
        print(f"Parsed {len(records)} records")
        
        # Aggregate by municipality
        print("Aggregating by municipality...")
        aggregated = aggregate_by_municipality(records, year)
        print(f"Aggregated to {len(aggregated)} municipalities")
        
        # Save aggregated data
        output_file = output_dir / 'municipal_debt.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(aggregated, f, ensure_ascii=False, indent=2)
        print(f"Saved aggregated data to {output_file}")
        
        # Print sample - sort by debt per capita
        if aggregated:
            print(f"\nSample data (Year: {year}) - Highest debt per capita:")
            sample = sorted(aggregated, key=lambda x: x.get('loan_per_capita_eur', 0), reverse=True)[:5]
            for record in sample:
                print(f"  {record['municipality_name']}: "
                      f"Loan/capita: €{record['loan_per_capita_eur']:,.0f}, "
                      f"Total: €{record['total_debt_eur']:,.0f}, "
                      f"Rel.Debt: {record['relative_indebtedness_pct']:.1f}%")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == '__main__':
    exit(main())
