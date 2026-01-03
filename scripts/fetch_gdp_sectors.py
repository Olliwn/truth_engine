#!/usr/bin/env python3
"""
Fetch GDP by sector data from Statistics Finland PxWeb API.
Table: statfin_vtp_pxt_11rr (GDP at current prices by industry)
Table: statfin_vtp_pxt_132h (Government consumption expenditure)

This data powers the Epsilon page - Tax Burden Atlas
"""

import json
import requests
from pathlib import Path
from datetime import datetime

# Statistics Finland PxWeb API endpoints
GDP_URL = "https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/vtp/statfin_vtp_pxt_123h.px"
GOV_CONSUMPTION_URL = "https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/vtp/statfin_vtp_pxt_11t4.px"


def fetch_table_metadata(url):
    """Fetch table metadata to understand available dimensions."""
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Failed to fetch metadata: {response.status_code}")


def fetch_gdp_by_sector():
    """
    Fetch GDP data by industry sector.
    We want to separate private vs public sector contribution to GDP.
    """
    print("Fetching GDP by sector metadata...")
    metadata = fetch_table_metadata(GDP_URL)
    
    variables = {v['code']: v for v in metadata['variables']}
    print(f"Available dimensions: {list(variables.keys())}")
    
    # Get available years
    year_codes = variables.get('Vuosi', {}).get('values', [])
    print(f"Available years: {year_codes[:5]}... to {year_codes[-5:]}")
    
    # Get industry codes - we want main sectors
    industry_values = variables.get('Toimiala', {}).get('values', [])
    industry_texts = variables.get('Toimiala', {}).get('valueTexts', [])
    
    print(f"\nAvailable industries ({len(industry_values)} total):")
    for code, text in list(zip(industry_values[:20], industry_texts[:20])):
        print(f"  {code}: {text}")
    
    # Key sectors for our analysis based on actual available codes
    # The codes in this table use different format (e.g., BTE for industry)
    
    # Map our desired sectors to available codes
    sectors_of_interest = []
    for code in industry_values:
        # Skip very detailed sub-sectors
        if len(code) > 5:
            continue
        sectors_of_interest.append(code)
    
    # Limit to main aggregates and key sectors
    main_sectors = [
        "SSS",      # Total
        "ALKUT",    # Primary production
        "BTE",      # Industry (B-E)
        "BTF",      # Secondary (B-F including construction)
        "C",        # Manufacturing
        "F",        # Construction
        "GTU",      # Services total (if available)
        "J",        # ICT
        "K",        # Financial
        "L",        # Real estate
        "OTQ",      # Public admin + education + health (O-Q)
        "O",        # Public administration
        "P",        # Education  
        "Q",        # Health and social work
    ]
    
    available_sectors = [s for s in main_sectors if s in industry_values]
    if not available_sectors:
        available_sectors = [s for s in sectors_of_interest if s in industry_values][:20]
    print(f"\nFetching sectors: {available_sectors}")
    
    # Years from 1990 onwards
    years_to_fetch = [y for y in year_codes if int(y) >= 1990]
    
    # Get available info types (Tiedot)
    info_values = variables.get('Tiedot', {}).get('values', [])
    info_texts = variables.get('Tiedot', {}).get('valueTexts', [])
    print(f"\nAvailable info types: {list(zip(info_values[:5], info_texts[:5]))}")
    
    query = {
        "query": [
            {
                "code": "Vuosi",
                "selection": {
                    "filter": "item",
                    "values": years_to_fetch
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
                "code": "Sektori",
                "selection": {
                    "filter": "item",
                    "values": ["S1"]  # Total economy
                }
            },
            {
                "code": "Taloustoimi",
                "selection": {
                    "filter": "item",
                    "values": ["B1GPH"]  # GDP - Value added, gross
                }
            }
        ],
        "response": {
            "format": "json-stat2"
        }
    }
    
    print("Fetching GDP data...")
    response = requests.post(GDP_URL, json=query)
    
    if response.status_code != 200:
        print(f"Error: {response.status_code}")
        print(response.text[:500])
        raise Exception(f"Failed to fetch GDP data: {response.status_code}")
    
    return response.json()


def fetch_government_consumption():
    """
    Fetch government final consumption expenditure.
    This shows how much the government spends directly.
    """
    print("\nFetching government consumption metadata...")
    
    # Try the general government accounts table
    url = "https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/vtp/statfin_vtp_pxt_132h.px"
    
    try:
        metadata = fetch_table_metadata(url)
        variables = {v['code']: v for v in metadata['variables']}
        print(f"Available dimensions: {list(variables.keys())}")
        
        year_codes = variables.get('Vuosi', {}).get('values', [])
        years_to_fetch = [y for y in year_codes if int(y) >= 1990]
        
        query = {
            "query": [
                {
                    "code": "Vuosi",
                    "selection": {
                        "filter": "item",
                        "values": years_to_fetch
                    }
                }
            ],
            "response": {
                "format": "json-stat2"
            }
        }
        
        print("Fetching government consumption data...")
        response = requests.post(url, json=query)
        
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"Could not fetch gov consumption: {e}")
    
    return None


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


def transform_gdp_data(records: list[dict]) -> dict:
    """
    Transform GDP records into structured data for visualization.
    Categorize sectors into private vs public.
    """
    # Define which sectors are predominantly public (exact codes from Statistics Finland)
    # O: Public administration, P: Education, Q: Human health and social work
    public_sectors = ['O', 'P', 'Q']
    public_aggregate = 'OTQ'  # Combined O-Q sector
    
    # Build time series by year
    by_year = {}
    
    for record in records:
        year = record.get('Vuosi_code', '')
        sector = record.get('Toimiala_code', '')
        sector_label = record.get('Toimiala_label', '')
        value = record.get('value', 0)
        
        if not year or value is None:
            continue
        
        if year not in by_year:
            by_year[year] = {
                'year': int(year),
                'total_gdp': 0,
                'public_sector_gdp': 0,
                'private_sector_gdp': 0,
                'manufacturing_gdp': 0,
                'ict_gdp': 0,
                'sectors': {}
            }
        
        by_year[year]['sectors'][sector] = {
            'label': sector_label,
            'value_million_eur': value
        }
        
        # Total GDP
        if sector == 'SSS':
            by_year[year]['total_gdp'] = value
        # Public sector - use the aggregate O-Q or individual sectors
        elif sector == public_aggregate:
            by_year[year]['public_sector_gdp'] = value
        elif sector in public_sectors and public_aggregate not in by_year[year]['sectors']:
            # Only add individual sectors if we don't have the aggregate
            by_year[year]['public_sector_gdp'] += value
        # Manufacturing
        elif sector == 'C':
            by_year[year]['manufacturing_gdp'] = value
        # ICT
        elif sector == 'J':
            by_year[year]['ict_gdp'] = value
    
    # Calculate private sector as total minus public
    for year_data in by_year.values():
        if year_data['total_gdp'] > 0:
            year_data['private_sector_gdp'] = year_data['total_gdp'] - year_data['public_sector_gdp']
            year_data['public_share_pct'] = round(
                100 * year_data['public_sector_gdp'] / year_data['total_gdp'], 2
            )
            year_data['private_share_pct'] = round(
                100 * year_data['private_sector_gdp'] / year_data['total_gdp'], 2
            )
            year_data['manufacturing_share_pct'] = round(
                100 * year_data['manufacturing_gdp'] / year_data['total_gdp'], 2
            )
            year_data['ict_share_pct'] = round(
                100 * year_data['ict_gdp'] / year_data['total_gdp'], 2
            )
    
    # Convert to sorted list
    time_series = sorted(by_year.values(), key=lambda x: x['year'])
    
    return {
        'metadata': {
            'source': 'Statistics Finland',
            'table': 'statfin_vtp_pxt_11rr',
            'description': 'GDP by industry at current prices',
            'fetched_at': datetime.now().isoformat(),
            'public_sectors': public_sectors,
            'public_sectors_description': 'O: Public administration, P: Education, Q: Health and social work'
        },
        'time_series': time_series
    }


def main():
    """Main function to fetch and save GDP sector data."""
    output_dir = Path(__file__).parent.parent / 'data'
    output_dir.mkdir(exist_ok=True)
    
    try:
        # Fetch GDP by sector
        raw_gdp = fetch_gdp_by_sector()
        
        # Save raw data
        raw_output = output_dir / 'gdp_sectors_raw.json'
        with open(raw_output, 'w', encoding='utf-8') as f:
            json.dump(raw_gdp, f, ensure_ascii=False, indent=2)
        print(f"Saved raw GDP data to {raw_output}")
        
        # Parse and transform
        records = parse_json_stat(raw_gdp)
        print(f"Parsed {len(records)} GDP records")
        
        transformed = transform_gdp_data(records)
        
        # Save transformed data
        output_file = output_dir / 'gdp_sectors.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(transformed, f, ensure_ascii=False, indent=2)
        print(f"Saved transformed data to {output_file}")
        
        # Print summary
        print("\n--- GDP by Sector Summary ---")
        if transformed['time_series']:
            first = transformed['time_series'][0]
            last = transformed['time_series'][-1]
            print(f"Period: {first['year']} to {last['year']}")
            print(f"\n{first['year']}:")
            print(f"  Total GDP: €{first['total_gdp']:,.0f}M")
            print(f"  Public sector share: {first.get('public_share_pct', 0):.1f}%")
            print(f"\n{last['year']}:")
            print(f"  Total GDP: €{last['total_gdp']:,.0f}M")
            print(f"  Public sector share: {last.get('public_share_pct', 0):.1f}%")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == '__main__':
    exit(main())

