#!/usr/bin/env python3
"""
Fetch public subsidies, purchased services, and social benefits data from Statistics Finland PxWeb API.
Table: statfin_jmete_pxt_12a6 (General government expenditure by function)

This data powers the enhanced Epsilon page - showing "publicly funded private sector"

Data categories:
- D3K: Subsidies (business subsidies, agricultural support, housing subsidies)
- D62K: Social benefits other than social transfers in kind (pensions, unemployment, child benefits)
- D632K: Social transfers in kind - purchased market production 
         (Kela reimbursements, outsourced healthcare/social services)
"""

import json
import requests
from pathlib import Path
from datetime import datetime

# Statistics Finland PxWeb API endpoint
JMETE_URL = "https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/jmete/statfin_jmete_pxt_12a6.px"

# Output path
OUTPUT_DIR = Path(__file__).parent.parent / "data"
OUTPUT_FILE = OUTPUT_DIR / "public_subsidies.json"


def fetch_table_metadata(url):
    """Fetch table metadata to understand available dimensions."""
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Failed to fetch metadata: {response.status_code}")


def fetch_subsidies_data():
    """
    Fetch D3K subsidies, D62K social benefits, and D632K purchased services data.
    
    D3K Subsidies breakdown:
    - SSS: Total subsidies
    - G04: Economic affairs (business subsidies)
    - G0402: Agriculture, forestry, fishing
    - G06: Housing subsidies
    
    D62K Social benefits (cash transfers):
    - SSS: Total social benefits
    - G10: Social protection (pensions, unemployment, child benefits, etc.)
    
    D632K Purchased market production breakdown:
    - SSS: Total purchased services
    - G07: Health (Kela reimbursements, private healthcare)
    - G10: Social protection (private care homes, outsourced services)
    - G09: Education (private education services)
    """
    print("Fetching public subsidies metadata...")
    metadata = fetch_table_metadata(JMETE_URL)
    
    variables = {v['code']: v for v in metadata['variables']}
    print(f"Available dimensions: {list(variables.keys())}")
    
    # Get available years
    year_codes = variables.get('Vuosi', {}).get('values', [])
    print(f"Available years: {year_codes}")
    
    # We want years from 2015 onwards for recent context
    years_to_fetch = [y for y in year_codes if int(y.replace('*', '')) >= 2015]
    print(f"Fetching years: {years_to_fetch}")
    
    # Transaction codes we need - now including D62K
    transactions = ["D3K", "D62K", "D632K"]  # Subsidies, Social benefits, Purchased services
    
    # Function codes we need
    # For D3K (subsidies): SSS (total), G04 (economic), G0402 (agriculture), G06 (housing)
    # For D62K (benefits): SSS (total), G10 (social protection - main category)
    # For D632K (purchased): SSS (total), G07 (health), G10 (social), G09 (education)
    functions = ["SSS", "G04", "G0402", "G06", "G07", "G09", "G10"]
    
    # Build query for all data at once
    query = {
        "query": [
            {
                "code": "Sektori",
                "selection": {"filter": "item", "values": ["S13"]}  # General government
            },
            {
                "code": "Taloustoimi",
                "selection": {"filter": "item", "values": transactions}
            },
            {
                "code": "Tehtävä",
                "selection": {"filter": "item", "values": functions}
            },
            {
                "code": "Vuosi",
                "selection": {"filter": "item", "values": years_to_fetch}
            },
            {
                "code": "Tiedot",
                "selection": {"filter": "item", "values": ["cp"]}  # Current prices, millions EUR
            }
        ],
        "response": {"format": "json-stat2"}
    }
    
    print("\nFetching subsidies, benefits, and purchased services data...")
    response = requests.post(JMETE_URL, json=query)
    
    if response.status_code != 200:
        raise Exception(f"Failed to fetch data: {response.status_code} - {response.text}")
    
    return response.json(), years_to_fetch


def transform_data(raw_data, years):
    """Transform raw JSON-stat2 data into our structured format."""
    
    # Extract dimension info
    dims = raw_data['dimension']
    values = raw_data['value']
    
    # Get dimension labels
    transactions = list(dims['Taloustoimi']['category']['label'].values())
    functions = list(dims['Tehtävä']['category']['label'].values())
    years_labels = list(dims['Vuosi']['category']['label'].values())
    
    # Get dimension sizes for proper indexing
    n_trans = len(transactions)
    n_func = len(functions)
    n_years = len(years_labels)
    
    print(f"  Dimensions: {n_trans} transactions x {n_func} functions x {n_years} years = {n_trans * n_func * n_years} values")
    print(f"  Actual values: {len(values)}")
    
    # Build lookup: transaction -> function -> year -> value
    # Data order is: transactions -> functions -> years
    data_lookup = {}
    idx = 0
    for trans in transactions:
        trans_key = trans.split()[0]  # Get code like "D3K" from "D3K Subsidies..."
        data_lookup[trans_key] = {}
        for func in functions:
            # Handle "Total" specially, others have format "G04 Economic affairs"
            if func == "Total":
                func_key = "SSS"
            else:
                func_key = func.split()[0]  # Get code like "G04" from "G04 Economic affairs"
            data_lookup[trans_key][func_key] = {}
            for year in years_labels:
                val = values[idx] if values[idx] is not None else 0
                data_lookup[trans_key][func_key][year] = val
                idx += 1
    
    # Build time series
    time_series = []
    for year in years_labels:
        year_int = int(year.replace('*', ''))
        
        # D3K Subsidies
        subsidies_total = data_lookup.get('D3K', {}).get('SSS', {}).get(year, 0)
        subsidies_economic = data_lookup.get('D3K', {}).get('G04', {}).get(year, 0)
        subsidies_agriculture = data_lookup.get('D3K', {}).get('G0402', {}).get(year, 0)
        subsidies_housing = data_lookup.get('D3K', {}).get('G06', {}).get(year, 0)
        subsidies_other = subsidies_total - subsidies_economic - subsidies_housing
        
        # D62K Social benefits (cash transfers - pensions, unemployment, child benefits)
        benefits_total = data_lookup.get('D62K', {}).get('SSS', {}).get(year, 0)
        benefits_social_protection = data_lookup.get('D62K', {}).get('G10', {}).get(year, 0)
        
        # D632K Purchased market production
        purchased_total = data_lookup.get('D632K', {}).get('SSS', {}).get(year, 0)
        purchased_health = data_lookup.get('D632K', {}).get('G07', {}).get(year, 0)
        purchased_social = data_lookup.get('D632K', {}).get('G10', {}).get(year, 0)
        purchased_education = data_lookup.get('D632K', {}).get('G09', {}).get(year, 0)
        
        # Combined totals
        direct_public_to_private = subsidies_total + purchased_total  # Direct flows
        total_public_funding = subsidies_total + benefits_total + purchased_total  # All public funding
        
        entry = {
            "year": year_int,
            # Subsidies breakdown (D3K)
            "subsidies_total_million": round(subsidies_total),
            "subsidies_economic_million": round(subsidies_economic),
            "subsidies_agriculture_million": round(subsidies_agriculture),
            "subsidies_housing_million": round(subsidies_housing),
            "subsidies_other_million": round(max(0, subsidies_other)),
            # Social benefits breakdown (D62K) - NEW
            "benefits_total_million": round(benefits_total),
            "benefits_social_protection_million": round(benefits_social_protection),
            # Purchased services breakdown (D632K)
            "purchased_total_million": round(purchased_total),
            "purchased_health_million": round(purchased_health),
            "purchased_social_million": round(purchased_social),
            "purchased_education_million": round(purchased_education),
            # Combined totals
            "direct_public_to_private_million": round(direct_public_to_private),  # D3K + D632K
            "total_public_funding_million": round(total_public_funding)  # D3K + D62K + D632K
        }
        time_series.append(entry)
    
    # Sort by year
    time_series.sort(key=lambda x: x['year'])
    
    # Calculate summary statistics
    first_entry = time_series[0]
    last_entry = time_series[-1]
    
    if first_entry['total_public_funding_million'] > 0:
        growth_pct = ((last_entry['total_public_funding_million'] - first_entry['total_public_funding_million']) 
                      / first_entry['total_public_funding_million'] * 100)
    else:
        growth_pct = 0
    
    # Estimate GDP for percentage calculation (Finland GDP estimates)
    gdp_estimates = {
        2015: 211000, 2016: 216000, 2017: 225000, 2018: 234000, 2019: 240000,
        2020: 237000, 2021: 252000, 2022: 268000, 2023: 280000, 2024: 285000
    }
    
    last_gdp = gdp_estimates.get(last_entry['year'], 285000)
    direct_pct_of_gdp = last_entry['direct_public_to_private_million'] / last_gdp * 100
    total_pct_of_gdp = last_entry['total_public_funding_million'] / last_gdp * 100
    benefits_pct_of_gdp = last_entry['benefits_total_million'] / last_gdp * 100
    
    summary = {
        "period": f"{first_entry['year']}-{last_entry['year']}",
        "start_year": first_entry['year'],
        "end_year": last_entry['year'],
        # Total public funding (all three categories)
        "current_total_billion": round(last_entry['total_public_funding_million'] / 1000, 1),
        "total_pct_of_gdp": round(total_pct_of_gdp, 1),
        # Individual categories
        "current_subsidies_billion": round(last_entry['subsidies_total_million'] / 1000, 1),
        "current_benefits_billion": round(last_entry['benefits_total_million'] / 1000, 1),
        "current_purchased_billion": round(last_entry['purchased_total_million'] / 1000, 1),
        # Direct flows (D3K + D632K) - for backward compatibility
        "direct_public_to_private_billion": round(last_entry['direct_public_to_private_million'] / 1000, 1),
        "direct_pct_of_gdp": round(direct_pct_of_gdp, 1),
        # Benefits as % of GDP
        "benefits_pct_of_gdp": round(benefits_pct_of_gdp, 1),
        # Growth
        "growth_since_start_pct": round(growth_pct, 1),
        # Categories
        "largest_category": "Social benefits (pensions, unemployment, etc.)",
        "largest_category_billion": round(last_entry['benefits_total_million'] / 1000, 1),
        "key_insight": f"€{last_entry['total_public_funding_million'] / 1000:.1f}B ({total_pct_of_gdp:.0f}% of GDP) flows from government to private sector/households"
    }
    
    return {
        "metadata": {
            "source": "Statistics Finland",
            "table": "statfin_jmete_pxt_12a6",
            "description": "Public funding flowing to private sector through subsidies, social benefits, and purchased services",
            "fetched_at": datetime.now().isoformat(),
            "categories": {
                "D3K": "Subsidies - direct grants to businesses, agriculture, housing",
                "D62K": "Social benefits - cash transfers (pensions, unemployment benefits, child benefits, social assistance)",
                "D632K": "Social transfers in kind - purchased market production (healthcare, social care, education from private providers)"
            }
        },
        "summary": summary,
        "time_series": time_series
    }


def main():
    print("=" * 60)
    print("Fetching Public Funding Data (Subsidies + Benefits + Purchased)")
    print("=" * 60)
    
    try:
        raw_data, years = fetch_subsidies_data()
        
        print("\nTransforming data...")
        transformed = transform_data(raw_data, years)
        
        # Ensure output directory exists
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        
        # Write to file
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(transformed, f, indent=2, ensure_ascii=False)
        
        print(f"\nData written to: {OUTPUT_FILE}")
        
        # Print summary
        summary = transformed['summary']
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"Period: {summary['period']}")
        print(f"\nTotal public funding to private sector/households: €{summary['current_total_billion']}B ({summary['total_pct_of_gdp']}% of GDP)")
        print(f"  - Subsidies (D3K): €{summary['current_subsidies_billion']}B")
        print(f"  - Social benefits (D62K): €{summary['current_benefits_billion']}B ({summary['benefits_pct_of_gdp']}% of GDP)")
        print(f"  - Purchased services (D632K): €{summary['current_purchased_billion']}B")
        print(f"\nDirect to private sector (D3K + D632K): €{summary['direct_public_to_private_billion']}B ({summary['direct_pct_of_gdp']}% of GDP)")
        print(f"Growth since {summary['start_year']}: {summary['growth_since_start_pct']}%")
        print(f"\nKey insight: {summary['key_insight']}")
        
        # Print latest year breakdown
        latest = transformed['time_series'][-1]
        print(f"\n" + "=" * 60)
        print(f"BREAKDOWN FOR {latest['year']}")
        print("=" * 60)
        print(f"Subsidies (D3K): €{latest['subsidies_total_million']:,}M")
        print(f"  - Economic affairs: €{latest['subsidies_economic_million']:,}M")
        print(f"  - Agriculture: €{latest['subsidies_agriculture_million']:,}M")
        print(f"  - Housing: €{latest['subsidies_housing_million']:,}M")
        print(f"\nSocial Benefits (D62K): €{latest['benefits_total_million']:,}M")
        print(f"  - Social protection: €{latest['benefits_social_protection_million']:,}M")
        print(f"\nPurchased services (D632K): €{latest['purchased_total_million']:,}M")
        print(f"  - Health: €{latest['purchased_health_million']:,}M")
        print(f"  - Social protection: €{latest['purchased_social_million']:,}M")
        print(f"  - Education: €{latest['purchased_education_million']:,}M")
        print(f"\nTOTAL: €{latest['total_public_funding_million']:,}M")
        
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
