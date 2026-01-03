#!/usr/bin/env python3
"""
Fetch trade balance data from Statistics Finland PxWeb API.
Table: statfin_tpp_pxt_12bs (Exports and imports by commodity group)

This data powers the Eta page - Trade Reality
"""

import json
import requests
from pathlib import Path
from datetime import datetime

# Statistics Finland PxWeb API endpoint for current account (Balance of Payments)
URL = "https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/mata/statfin_mata_pxt_12gf.px"


def fetch_table_metadata():
    """Fetch table metadata to understand available dimensions."""
    response = requests.get(URL)
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Failed to fetch metadata: {response.status_code}")


def fetch_trade_data():
    """Fetch current account / balance of payments data."""
    print("Fetching trade data metadata...")
    metadata = fetch_table_metadata()
    
    variables = {v['code']: v for v in metadata['variables']}
    print(f"Available dimensions: {list(variables.keys())}")
    
    for var_name, var_data in variables.items():
        values = var_data.get('values', [])
        texts = var_data.get('valueTexts', [])
        print(f"\n{var_name} ({len(values)} values):")
        for code, text in list(zip(values[:15], texts[:15])):
            print(f"  {code}: {text}")
    
    # This table has monthly data
    month_codes = variables.get('Kuukausi', {}).get('values', [])
    
    # Get yearly data by selecting December values or using 12-month totals
    # We'll use the B12 (12-month moving total net) or just aggregate monthly
    
    query = {
        "query": [
            {
                "code": "Kuukausi",
                "selection": {
                    "filter": "item",
                    "values": month_codes  # All months
                }
            },
            {
                "code": "Maksutase-erä",
                "selection": {
                    "filter": "item",
                    "values": ["CA", "GS", "G", "S"]  # Current account, Goods&Services, Goods, Services
                }
            },
            {
                "code": "Tiedot",
                "selection": {
                    "filter": "item",
                    "values": ["C", "D", "B"]  # Income, Expenditure, Net
                }
            }
        ],
        "response": {
            "format": "json-stat2"
        }
    }
    
    print("\nFetching trade data...")
    response = requests.post(URL, json=query)
    
    if response.status_code != 200:
        print(f"Error: {response.status_code}")
        print(response.text[:500])
        raise Exception(f"Failed to fetch trade data: {response.status_code}")
    
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


def transform_trade_data(records: list[dict]) -> dict:
    """
    Transform balance of payments records into yearly trade data.
    
    Balance items:
    - CA: Current account
    - GS: Goods and services
    - G: Goods
    - S: Services
    
    Info types:
    - C: Income (exports)
    - D: Expenditure (imports)
    - B: Net (balance)
    """
    
    # Aggregate monthly data into yearly
    by_year_month = {}
    
    for record in records:
        month = record.get('Kuukausi_code', '')  # e.g., "2006M01"
        item = record.get('Maksutase-erä_code', '')  # CA, GS, G, S
        info = record.get('Tiedot_code', '')  # C, D, B
        value = record.get('value', 0)
        
        if not month or value is None:
            continue
        
        # Extract year from month code
        try:
            year = int(month[:4])
        except ValueError:
            continue
        
        if year not in by_year_month:
            by_year_month[year] = {
                'goods_exports': 0,
                'goods_imports': 0,
                'services_exports': 0,
                'services_imports': 0,
                'current_account_net': 0,
            }
        
        # Aggregate based on item and info type
        if item == 'G':  # Goods
            if info == 'C':  # Income = Exports
                by_year_month[year]['goods_exports'] += value
            elif info == 'D':  # Expenditure = Imports
                by_year_month[year]['goods_imports'] += value
        elif item == 'S':  # Services
            if info == 'C':
                by_year_month[year]['services_exports'] += value
            elif info == 'D':
                by_year_month[year]['services_imports'] += value
        elif item == 'CA' and info == 'B':  # Current account net
            by_year_month[year]['current_account_net'] += value
    
    # Build time series
    time_series = []
    for year in sorted(by_year_month.keys()):
        data = by_year_month[year]
        
        total_exports = data['goods_exports'] + data['services_exports']
        total_imports = data['goods_imports'] + data['services_imports']
        trade_balance = total_exports - total_imports
        goods_balance = data['goods_exports'] - data['goods_imports']
        services_balance = data['services_exports'] - data['services_imports']
        
        entry = {
            'year': year,
            'exports_total': total_exports,
            'imports_total': total_imports,
            'trade_balance': trade_balance,
            'goods_balance': goods_balance,
            'services_balance': services_balance,
            'goods_exports': data['goods_exports'],
            'goods_imports': data['goods_imports'],
            'services_exports': data['services_exports'],
            'services_imports': data['services_imports'],
            'current_account': data['current_account_net'],
        }
        
        # Calculate coverage ratio
        if total_imports > 0:
            entry['export_coverage_pct'] = round(100 * total_exports / total_imports, 2)
        
        # Calculate services share of exports
        if total_exports > 0:
            entry['services_share_pct'] = round(100 * data['services_exports'] / total_exports, 2)
        
        time_series.append(entry)
    
    # Calculate summary
    summary = {}
    if len(time_series) >= 2:
        first = time_series[0]
        last = time_series[-1]
        
        # Find peak trade surplus (Nokia era ~2007-2008)
        peak = max(time_series, key=lambda x: x['trade_balance'])
        
        # Count surplus vs deficit years
        surplus_years = len([y for y in time_series if y['trade_balance'] > 0])
        deficit_years = len([y for y in time_series if y['trade_balance'] < 0])
        
        summary = {
            'period': f"{first['year']}-{last['year']}",
            'current_balance_billion': round(last['trade_balance'] / 1000, 2),
            'peak_year': peak['year'],
            'peak_balance_billion': round(peak['trade_balance'] / 1000, 2),
            'surplus_years': surplus_years,
            'deficit_years': deficit_years,
            'services_share_change': round(
                last.get('services_share_pct', 0) - first.get('services_share_pct', 0), 2
            ),
            'key_insight': f"Finland went from €{round(first['trade_balance']/1000, 1)}B balance in {first['year']} to €{round(last['trade_balance']/1000, 1)}B in {last['year']}"
        }
    
    return {
        'metadata': {
            'source': 'Statistics Finland',
            'table': 'statfin_mata_pxt_12gf',
            'description': 'Current account and balance of payments',
            'fetched_at': datetime.now().isoformat(),
            'unit': 'Million EUR',
        },
        'summary': summary,
        'time_series': time_series
    }


def main():
    """Main function to fetch and save trade data."""
    output_dir = Path(__file__).parent.parent / 'data'
    output_dir.mkdir(exist_ok=True)
    
    try:
        # Fetch trade data
        raw_data = fetch_trade_data()
        
        # Save raw data
        raw_output = output_dir / 'trade_balance_raw.json'
        with open(raw_output, 'w', encoding='utf-8') as f:
            json.dump(raw_data, f, ensure_ascii=False, indent=2)
        print(f"Saved raw trade data to {raw_output}")
        
        # Parse and transform
        records = parse_json_stat(raw_data)
        print(f"Parsed {len(records)} trade records")
        
        transformed = transform_trade_data(records)
        
        # Save transformed data
        output_file = output_dir / 'trade_balance.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(transformed, f, ensure_ascii=False, indent=2)
        print(f"Saved transformed data to {output_file}")
        
        # Print summary
        print("\n--- Trade Balance Summary ---")
        if transformed['time_series']:
            first = transformed['time_series'][0]
            last = transformed['time_series'][-1]
            print(f"Period: {first['year']} to {last['year']}")
            print(f"\n{first['year']}:")
            print(f"  Exports: €{first['exports_total']/1000:.1f}B")
            print(f"  Imports: €{first['imports_total']/1000:.1f}B")
            print(f"  Balance: €{first['trade_balance']/1000:+.1f}B")
            print(f"\n{last['year']}:")
            print(f"  Exports: €{last['exports_total']/1000:.1f}B")
            print(f"  Imports: €{last['imports_total']/1000:.1f}B")
            print(f"  Balance: €{last['trade_balance']/1000:+.1f}B")
            
            if transformed['summary'].get('peak_year'):
                print(f"\nPeak ({transformed['summary']['peak_year']}): "
                      f"€{transformed['summary']['peak_balance_billion']:+.1f}B surplus")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == '__main__':
    exit(main())

