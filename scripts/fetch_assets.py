#!/usr/bin/env python3
"""
Fetch economic indicator data:
- Housing Price Index from Statistics Finland
- OMX Helsinki 25 stock index
- S&P 500 US stock index
- Finnish GDP per capita
- Finnish Wage Index (nominal and real)

This data is used to compare economic indicators against working-class inflation.
"""

import requests
import json
from pathlib import Path
from datetime import datetime

# === Statistics Finland API URLs ===

# Housing Price Index (2015=100) - yearly data
HOUSING_URL = "https://pxdata.stat.fi:443/PxWeb/api/v1/en/StatFin/ashi/statfin_ashi_pxt_13mz.px"

# GDP per capita
GDP_URL = "https://pxdata.stat.fi:443/PxWeb/api/v1/en/StatFin/vtp/statfin_vtp_pxt_123x.px"

# Wage index
WAGE_URL = "https://pxdata.stat.fi:443/PxWeb/api/v1/en/StatFin/ati/statfin_ati_pxt_14un.px"

# Years to fetch
YEARS = [str(year) for year in range(2015, 2025)]

# === Query Templates ===

housing_query = {
    "query": [
        {"code": "Vuosi", "selection": {"filter": "item", "values": YEARS}},
        {"code": "Alue", "selection": {"filter": "item", "values": ["ksu"]}},
        {"code": "Talotyyppi", "selection": {"filter": "item", "values": ["0"]}},
        {"code": "Huoneluku", "selection": {"filter": "item", "values": ["00"]}},
        {"code": "Tiedot", "selection": {"filter": "item", "values": ["ind15"]}}
    ],
    "response": {"format": "json-stat2"}
}

gdp_query = {
    "query": [
        {"code": "Taloustoimi", "selection": {"filter": "item", "values": ["B1GMH"]}},  # GDP at market prices
        {"code": "Vuosi", "selection": {"filter": "item", "values": YEARS}},
        {"code": "Tiedot", "selection": {"filter": "item", "values": ["vol_ind"]}}  # Volume index 2015=100
    ],
    "response": {"format": "json-stat2"}
}

wage_query = {
    "query": [
        {"code": "Sektori", "selection": {"filter": "item", "values": ["SSS"]}},  # Total economy
        {"code": "Palkkausmuoto", "selection": {"filter": "item", "values": ["0"]}},  # All employees
        {"code": "Sukupuoli", "selection": {"filter": "item", "values": ["SSS"]}},  # Total (both genders)
        {"code": "Vuosi", "selection": {"filter": "item", "values": YEARS}},
        {"code": "Tiedot", "selection": {"filter": "item", "values": ["ati_2015_100", "real_2015_100"]}}  # Nominal and real wage indices
    ],
    "response": {"format": "json-stat2"}
}


def fetch_housing_index():
    """Fetch housing price index from Statistics Finland."""
    print("Fetching Housing Price Index...")
    response = requests.post(HOUSING_URL, json=housing_query)
    
    if response.status_code != 200:
        print(f"Housing Error: {response.status_code}")
        return None
    
    data = response.json()
    years = list(data['dimension']['Vuosi']['category']['label'].values())
    values = data['value']
    return {year: values[i] for i, year in enumerate(years)}


def fetch_gdp_index():
    """Fetch GDP volume index from Statistics Finland."""
    print("Fetching GDP Volume Index...")
    response = requests.post(GDP_URL, json=gdp_query)
    
    if response.status_code != 200:
        print(f"GDP Error: {response.status_code}")
        print(response.text)
        return None
    
    data = response.json()
    years_raw = list(data['dimension']['Vuosi']['category']['label'].values())
    values = data['value']
    
    # Clean year labels (remove asterisks indicating preliminary data)
    return {year.replace('*', ''): values[i] for i, year in enumerate(years_raw)}


def fetch_wage_index():
    """Fetch wage indices (nominal and real) from Statistics Finland."""
    print("Fetching Wage Index...")
    response = requests.post(WAGE_URL, json=wage_query)
    
    if response.status_code != 200:
        print(f"Wage Error: {response.status_code}")
        print(response.text)
        return None, None
    
    data = response.json()
    
    # Get dimensions
    years_raw = list(data['dimension']['Vuosi']['category']['label'].values())
    info_labels = list(data['dimension']['Tiedot']['category']['label'].values())
    values = data['value']
    
    # Clean year labels (remove asterisks)
    years = [y.replace('*', '') for y in years_raw]
    n_years = len(years)
    n_info = len(info_labels)
    
    # Values are organized: for each year, all info types
    # So: year1_info1, year1_info2, year2_info1, year2_info2, ...
    nominal = {}
    real = {}
    
    for i, year in enumerate(years):
        idx_nominal = i * n_info  # First info type (nominal wage index)
        idx_real = i * n_info + 1  # Second info type (real wage index)
        
        if idx_nominal < len(values):
            nominal[year] = values[idx_nominal]
        if idx_real < len(values):
            real[year] = values[idx_real]
    
    return nominal, real


def get_omx_helsinki():
    """OMX Helsinki 25 yearly average values (pre-compiled)."""
    # Source: Nasdaq Nordic historical data
    omx_raw = {
        "2015": 3447,
        "2016": 3602,
        "2017": 4157,
        "2018": 4090,
        "2019": 4463,
        "2020": 4299,
        "2021": 5562,
        "2022": 4604,
        "2023": 4454,
        "2024": 4892,
    }
    base = omx_raw["2015"]
    return {year: round((val / base) * 100, 1) for year, val in omx_raw.items()}


def get_sp500():
    """S&P 500 yearly closing values (pre-compiled), normalized to 2015=100."""
    # Source: Yahoo Finance / historical data
    # Using year-end closing prices
    sp500_raw = {
        "2015": 2043,   # Dec 2015
        "2016": 2238,
        "2017": 2673,
        "2018": 2506,
        "2019": 3230,
        "2020": 3756,
        "2021": 4766,
        "2022": 3839,
        "2023": 4769,
        "2024": 5881,   # Nov 2024 approx
    }
    base = sp500_raw["2015"]
    return {year: round((val / base) * 100, 1) for year, val in sp500_raw.items()}


def main():
    data_dir = Path(__file__).parent.parent / "data"
    data_dir.mkdir(exist_ok=True)
    
    # Fetch all data
    housing_data = fetch_housing_index() or {}
    gdp_data = fetch_gdp_index() or {}
    nominal_wage, real_wage = fetch_wage_index()
    nominal_wage = nominal_wage or {}
    real_wage = real_wage or {}
    omx_data = get_omx_helsinki()
    sp500_data = get_sp500()
    
    # Build output structure
    asset_data = {
        "metadata": {
            "source": "Statistics Finland, Nasdaq Nordic, Yahoo Finance",
            "base_year": 2015,
            "fetched_at": datetime.now().isoformat(),
        },
        "housing_price_index": {
            "description": "Price index of old dwellings in housing companies",
            "base": "2015 = 100",
            "values": housing_data
        },
        "omx_helsinki_25": {
            "description": "OMX Helsinki 25 stock index (Finnish stocks)",
            "base": "2015 = 100 (normalized)",
            "values": omx_data
        },
        "sp500": {
            "description": "S&P 500 US stock index",
            "base": "2015 = 100 (normalized)",
            "values": sp500_data
        },
        "gdp_per_capita": {
            "description": "Finnish GDP per capita volume index",
            "base": "2015 = 100",
            "values": gdp_data
        },
        "wage_index_nominal": {
            "description": "Index of wage and salary earnings (nominal)",
            "base": "2015 = 100",
            "values": nominal_wage
        },
        "wage_index_real": {
            "description": "Index of real wage and salary earnings (inflation-adjusted)",
            "base": "2015 = 100",
            "values": real_wage
        }
    }
    
    # Save data
    output_path = data_dir / "asset_prices.json"
    with open(output_path, 'w') as f:
        json.dump(asset_data, f, indent=2)
    print(f"\nData saved to {output_path}")
    
    # Print summary
    print("\n" + "=" * 60)
    print("ECONOMIC INDICATORS SUMMARY (2015=100)")
    print("=" * 60)
    
    indicators = [
        ("Housing Prices", housing_data),
        ("OMX Helsinki 25", omx_data),
        ("S&P 500 (US)", sp500_data),
        ("GDP per Capita", gdp_data),
        ("Nominal Wages", nominal_wage),
        ("Real Wages", real_wage),
    ]
    
    for name, data in indicators:
        if data and "2024" in data and "2015" in data:
            start = data.get("2015", 100)
            end = data.get("2024", 100)
            change = ((end - start) / start) * 100 if start else 0
            print(f"\n{name}:")
            print(f"  2015: {start:.1f}")
            print(f"  2024: {end:.1f}")
            print(f"  Change: {change:+.1f}%")


if __name__ == "__main__":
    main()
