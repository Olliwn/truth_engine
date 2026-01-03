#!/usr/bin/env python3
"""
Fetch employment by sector data from Statistics Finland PxWeb API.
Table: statfin_tyokay_pxt_115v (Employed by industry)

This data powers:
- Epsilon page: Tax Burden Atlas (public vs private employment)
- Zeta page: Deindustrialization Map (employment structural changes)
"""

import json
import requests
from pathlib import Path
from datetime import datetime

# Statistics Finland PxWeb API endpoint - Employed labour force by industry
URL = "https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/tyokay/statfin_tyokay_pxt_115i.px"


def fetch_table_metadata():
    """Fetch table metadata to understand available dimensions."""
    response = requests.get(URL)
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Failed to fetch metadata: {response.status_code}")


def fetch_employment_data():
    """Fetch employment data by industry sector."""
    print("Fetching employment by sector metadata...")
    metadata = fetch_table_metadata()
    
    variables = {v['code']: v for v in metadata['variables']}
    print(f"Available dimensions: {list(variables.keys())}")
    
    # Get available years
    year_codes = variables.get('Vuosi', {}).get('values', [])
    print(f"Available years: {year_codes[:5]}... to {year_codes[-5:] if len(year_codes) > 5 else year_codes}")
    
    # Get industry codes
    industry_values = variables.get('Toimiala', {}).get('values', [])
    industry_texts = variables.get('Toimiala', {}).get('valueTexts', [])
    
    print(f"\nAvailable industries ({len(industry_values)} total):")
    for code, text in list(zip(industry_values[:25], industry_texts[:25])):
        print(f"  {code}: {text}")
    
    # Get all available sectors - we'll filter later
    # TOL 2008 classification
    
    # Define sectors of interest (main aggregates)
    sectors_of_interest = [
        "SSS",  # Total
        "ATA",  # Primary
        "BTF",  # Secondary (B-F)
        "C",    # Manufacturing
        "F",    # Construction (if available)
        "J",    # ICT
        "K",    # Finance
        "L",    # Real estate
        "O",    # Public admin
        "P",    # Education
        "Q",    # Health
    ]
    available_sectors = [s for s in sectors_of_interest if s in industry_values]
    # Add O-Q aggregate if available
    for code in industry_values:
        if 'O-Q' in code or 'OTQ' in code:
            available_sectors.append(code)
            break
    
    print(f"Using sectors: {available_sectors}")
    
    # Get available info types
    info_values = variables.get('Tiedot', {}).get('values', [])
    info_texts = variables.get('Tiedot', {}).get('valueTexts', [])
    print(f"Available info types: {list(zip(info_values[:5], info_texts[:5]))}")
    
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
                "code": "Toimiala",
                "selection": {
                    "filter": "item",
                    "values": available_sectors
                }
            },
            {
                "code": "Alue",
                "selection": {
                    "filter": "item",
                    "values": ["SSS"]  # Whole country
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
    
    print("\nFetching employment data...")
    response = requests.post(URL, json=query)
    
    if response.status_code != 200:
        print(f"Error: {response.status_code}")
        print(response.text[:500])
        raise Exception(f"Failed to fetch employment data: {response.status_code}")
    
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
            
        record = {'employed': value}
        
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


def transform_employment_data(records: list[dict]) -> dict:
    """
    Transform employment records into structured data.
    
    Categorize into:
    - Private sector (market-producing)
    - Public sector (non-market: O, P, Q)
    - Manufacturing (C)
    - ICT (J)
    - Construction (F)
    - Primary (A - Agriculture, forestry)
    """
    
    by_year = {}
    
    for record in records:
        year = record.get('Vuosi_code', '')
        sector = record.get('Toimiala_code', '')
        sector_label = record.get('Toimiala_label', '')
        employed = record.get('employed', 0)
        
        if not year or employed is None:
            continue
        
        try:
            year_int = int(year)
        except ValueError:
            continue
        
        if year not in by_year:
            by_year[year] = {
                'year': year_int,
                'total_employed': 0,
                'public_sector': 0,
                'private_sector': 0,
                'manufacturing': 0,
                'construction': 0,
                'primary': 0,
                'ict': 0,
                'sectors': {}
            }
        
        # Store all sectors
        by_year[year]['sectors'][sector] = {
            'label': sector_label,
            'employed': employed
        }
        
        # Categorize based on sector codes
        if sector in ['SSS', 'X', 'TOT', '0-99', '00-99']:
            by_year[year]['total_employed'] = employed
        elif sector in ['O', 'P', 'Q'] or 'OTQ' in sector or 'O-Q' in sector:
            by_year[year]['public_sector'] += employed
        elif sector in ['C'] or 'Manufacturing' in sector_label:
            by_year[year]['manufacturing'] = employed
        elif sector == 'F' or 'Construction' in sector_label:
            by_year[year]['construction'] = employed
        elif sector in ['ATA', 'A'] or 'Primary' in sector_label:
            by_year[year]['primary'] = employed
        elif sector == 'J' or 'information' in sector_label.lower():
            by_year[year]['ict'] = employed
    
    # Calculate derived metrics for each year
    for year_data in by_year.values():
        total = year_data['total_employed']
        if total > 0:
            # Private = total - public
            year_data['private_sector'] = total - year_data['public_sector']
            
            # Percentages
            year_data['public_pct'] = round(100 * year_data['public_sector'] / total, 2)
            year_data['private_pct'] = round(100 * year_data['private_sector'] / total, 2)
            year_data['manufacturing_pct'] = round(100 * year_data['manufacturing'] / total, 2)
            year_data['ict_pct'] = round(100 * year_data['ict'] / total, 2)
            year_data['construction_pct'] = round(100 * year_data['construction'] / total, 2)
            year_data['primary_pct'] = round(100 * year_data['primary'] / total, 2)
            
            # Workers per public sector employee
            if year_data['public_sector'] > 0:
                year_data['private_per_public'] = round(
                    year_data['private_sector'] / year_data['public_sector'], 2
                )
            else:
                year_data['private_per_public'] = None
    
    # Convert to sorted list
    time_series = sorted(by_year.values(), key=lambda x: x['year'])
    
    # Calculate summary statistics
    if len(time_series) >= 2:
        first = time_series[0]
        last = time_series[-1]
        
        summary = {
            'period': f"{first['year']}-{last['year']}",
            'employment_change': {
                'total': last['total_employed'] - first['total_employed'],
                'public': last['public_sector'] - first['public_sector'],
                'private': last['private_sector'] - first['private_sector'],
                'manufacturing': last['manufacturing'] - first['manufacturing'],
            },
            'share_change': {
                'public_pct': round(last.get('public_pct', 0) - first.get('public_pct', 0), 2),
                'manufacturing_pct': round(last.get('manufacturing_pct', 0) - first.get('manufacturing_pct', 0), 2),
                'ict_pct': round(last.get('ict_pct', 0) - first.get('ict_pct', 0), 2),
            }
        }
    else:
        summary = {}
    
    return {
        'metadata': {
            'source': 'Statistics Finland',
            'table': 'statfin_tyokay_pxt_115v',
            'description': 'Employed persons by industry (TOL 2008)',
            'fetched_at': datetime.now().isoformat(),
            'sector_classification': {
                'public': 'O: Public administration, P: Education, Q: Health and social work',
                'manufacturing': 'C: Manufacturing, B-E: Industry total',
                'export_generating': 'C: Manufacturing, J: ICT',
                'services': 'G-I: Trade/transport/hospitality, K-N: Business services, R-U: Other services'
            }
        },
        'summary': summary,
        'time_series': time_series
    }


def main():
    """Main function to fetch and save employment data."""
    output_dir = Path(__file__).parent.parent / 'data'
    output_dir.mkdir(exist_ok=True)
    
    try:
        # Fetch employment data
        raw_data = fetch_employment_data()
        
        # Save raw data
        raw_output = output_dir / 'employment_sectors_raw.json'
        with open(raw_output, 'w', encoding='utf-8') as f:
            json.dump(raw_data, f, ensure_ascii=False, indent=2)
        print(f"Saved raw employment data to {raw_output}")
        
        # Parse and transform
        records = parse_json_stat(raw_data)
        print(f"Parsed {len(records)} employment records")
        
        transformed = transform_employment_data(records)
        
        # Save transformed data
        output_file = output_dir / 'employment_sectors.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(transformed, f, ensure_ascii=False, indent=2)
        print(f"Saved transformed data to {output_file}")
        
        # Print summary
        print("\n--- Employment by Sector Summary ---")
        if transformed['time_series']:
            first = transformed['time_series'][0]
            last = transformed['time_series'][-1]
            print(f"Period: {first['year']} to {last['year']}")
            print(f"\n{first['year']}:")
            print(f"  Total employed: {first['total_employed']:,}")
            print(f"  Public sector: {first['public_sector']:,} ({first.get('public_pct', 0):.1f}%)")
            print(f"  Manufacturing: {first['manufacturing']:,} ({first.get('manufacturing_pct', 0):.1f}%)")
            print(f"\n{last['year']}:")
            print(f"  Total employed: {last['total_employed']:,}")
            print(f"  Public sector: {last['public_sector']:,} ({last.get('public_pct', 0):.1f}%)")
            print(f"  Manufacturing: {last['manufacturing']:,} ({last.get('manufacturing_pct', 0):.1f}%)")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == '__main__':
    exit(main())

