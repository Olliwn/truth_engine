#!/usr/bin/env python3
"""
Fetch Consumer Price Index data from Statistics Finland
for the Maslow CPI calculation.

Categories to fetch:
- 0: Overall CPI (headline inflation)
- 01.1: Food
- 04.1: Actual rentals for housing
- 04.5: Electricity, gas and other fuels
- 07.2.2: Fuels (petrol/diesel)
"""

import requests
import json
from pathlib import Path
from datetime import datetime

# Statistics Finland API endpoint for CPI (2015=100), yearly data
URL = "https://pxdata.stat.fi:443/PxWeb/api/v1/en/StatFin/khi/statfin_khi_pxt_11xc.px"

# Categories for Maslow CPI calculation
CATEGORIES = {
    "0": "Overall CPI",
    "011": "Food",
    "0411": "Actual rentals for housing",
    "045": "Electricity, gas and other fuels",
    "0721": "Fuels (spare parts)",  # Tyres/parts - fallback
    "0722": "Fuels and lubricants",  # Diesel and petrol
}

# Query for the PxWeb API - fetch yearly index data
query = {
    "query": [
        {
            "code": "Vuosi",
            "selection": {
                "filter": "item",
                "values": [str(year) for year in range(2015, 2025)]  # 2015-2024
            }
        },
        {
            "code": "Hyödyke",
            "selection": {
                "filter": "item",
                "values": list(CATEGORIES.keys())
            }
        },
        {
            "code": "Tiedot",
            "selection": {
                "filter": "item",
                "values": ["indeksipisteluku"]  # Point figure (index value)
            }
        }
    ],
    "response": {
        "format": "json-stat2"
    }
}


def fetch_cpi_data():
    """Fetch CPI data from Statistics Finland."""
    print("Fetching CPI data from Statistics Finland...")
    print(f"URL: {URL}")
    
    response = requests.post(URL, json=query)
    
    if response.status_code != 200:
        print(f"Error: {response.status_code}")
        print(response.text)
        return None
    
    return response.json()


def parse_json_stat(data):
    """Parse JSON-STAT2 format into a structured dictionary."""
    
    # Get dimensions
    years = data['dimension']['Vuosi']['category']['label']
    commodities = data['dimension']['Hyödyke']['category']['label']
    
    # Get values
    values = data['value']
    
    # Build structured data
    result = {
        "metadata": {
            "source": "Statistics Finland",
            "table": "statfin_khi_pxt_11xc.px",
            "base_year": 2015,
            "fetched_at": datetime.now().isoformat(),
        },
        "categories": {},
        "by_year": {}
    }
    
    # Parse values - dimensions are: Year × Commodity × Information
    year_list = list(years.keys())
    commodity_list = list(commodities.keys())
    
    idx = 0
    for year_idx, year_code in enumerate(year_list):
        year = years[year_code]
        if year not in result["by_year"]:
            result["by_year"][year] = {}
        
        for comm_idx, comm_code in enumerate(commodity_list):
            comm_name = commodities[comm_code]
            value = values[idx]
            
            # Store by category
            if comm_code not in result["categories"]:
                result["categories"][comm_code] = {
                    "name": comm_name,
                    "description": CATEGORIES.get(comm_code, ""),
                    "values": {}
                }
            result["categories"][comm_code]["values"][year] = value
            
            # Store by year
            result["by_year"][year][comm_code] = {
                "name": comm_name,
                "value": value
            }
            
            idx += 1
    
    return result


def main():
    # Fetch data
    raw_data = fetch_cpi_data()
    
    if raw_data is None:
        return
    
    # Parse data
    parsed_data = parse_json_stat(raw_data)
    
    # Save raw data
    data_dir = Path(__file__).parent.parent / "data"
    data_dir.mkdir(exist_ok=True)
    
    raw_path = data_dir / "cpi_raw.json"
    with open(raw_path, 'w') as f:
        json.dump(raw_data, f, indent=2)
    print(f"Raw data saved to {raw_path}")
    
    # Save parsed data
    parsed_path = data_dir / "cpi_data.json"
    with open(parsed_path, 'w') as f:
        json.dump(parsed_data, f, indent=2)
    print(f"Parsed data saved to {parsed_path}")
    
    # Print summary
    print("\n--- CPI Data Summary ---")
    for code, cat_data in parsed_data["categories"].items():
        print(f"\n{code}: {cat_data['name']}")
        values = cat_data['values']
        first_year = min(values.keys())
        last_year = max(values.keys())
        print(f"  {first_year}: {values[first_year]:.1f}")
        print(f"  {last_year}: {values[last_year]:.1f}")
        change = ((values[last_year] - values[first_year]) / values[first_year]) * 100
        print(f"  Change: {change:+.1f}%")


if __name__ == "__main__":
    main()

