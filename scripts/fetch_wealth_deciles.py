#!/usr/bin/env python3
"""
Fetch household wealth data by income decile from Statistics Finland.
Table: statfin_vtutk_pxt_151u.px (Assets, liabilities and income by income decile)

This provides:
- Net wealth (median, mean)
- Total assets, financial assets, real assets
- Total debt, housing loans
- Years: 1987, 1988, 1994, 1998, 2004, 2009, 2013, 2016, 2019, 2023
"""

import requests
import json
from pathlib import Path
from datetime import datetime

WEALTH_URL = "https://pxdata.stat.fi:443/PxWeb/api/v1/en/StatFin/vtutk/statfin_vtutk_pxt_151u.px"

# Key wealth metrics to fetch
# nettoae_DN3001 = Net wealth
# bruttoae_DA1000 = Total assets
# realvar = Real wealth (housing, vehicles, etc.)
# finan = Financial assets
# luototy = Debt total
# asuntm = Housing loans
# kturaha = Disposable income (for debt-to-income ratio)
WEALTH_METRICS = [
    "nettoae_DN3001",  # Net wealth
    "bruttoae_DA1000",  # Total assets
    "realvar",  # Real wealth
    "finan",  # Financial assets
    "luototy",  # Debt total
    "asuntm",  # Housing loans
    "kturaha",  # Disposable income
]

# All income deciles
DECILES = ["SS", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]

# Available years in the wealth survey
AVAILABLE_YEARS = ["2004", "2009", "2013", "2016", "2019", "2023"]

# Information types - get both mean and median
INFO_TYPES = [
    "vtutk_keskiarvo_r",  # Mean in real terms (inflation-adjusted)
    "vtutk_mediaani_r",  # Median in real terms
]

wealth_query = {
    "query": [
        {
            "code": "Varallisuuslaji",
            "selection": {
                "filter": "item",
                "values": WEALTH_METRICS
            }
        },
        {
            "code": "Tulokymmenys",
            "selection": {
                "filter": "item",
                "values": DECILES
            }
        },
        {
            "code": "Vuosi",
            "selection": {
                "filter": "item",
                "values": AVAILABLE_YEARS
            }
        },
        {
            "code": "Tiedot",
            "selection": {
                "filter": "item",
                "values": INFO_TYPES
            }
        }
    ],
    "response": {
        "format": "json-stat2"
    }
}


def fetch_wealth_data():
    """Fetch wealth distribution data from Statistics Finland."""
    print("Fetching household wealth data by income decile...")
    print(f"URL: {WEALTH_URL}")
    
    response = requests.post(WEALTH_URL, json=wealth_query)
    
    if response.status_code != 200:
        print(f"Error: {response.status_code}")
        print(response.text)
        return None
    
    data = response.json()
    return data


def parse_wealth_data(raw_data):
    """Parse JSON-STAT2 format into structured data."""
    
    # Get dimensions
    asset_types = list(raw_data['dimension']['Varallisuuslaji']['category']['index'].keys())
    deciles = list(raw_data['dimension']['Tulokymmenys']['category']['index'].keys())
    years = list(raw_data['dimension']['Vuosi']['category']['index'].keys())
    info_types = list(raw_data['dimension']['Tiedot']['category']['index'].keys())
    
    asset_labels = raw_data['dimension']['Varallisuuslaji']['category']['label']
    decile_labels = raw_data['dimension']['Tulokymmenys']['category']['label']
    info_labels = raw_data['dimension']['Tiedot']['category']['label']
    
    values = raw_data['value']
    
    # Dimension sizes for index calculation
    num_assets = len(asset_types)
    num_deciles = len(deciles)
    num_years = len(years)
    num_info = len(info_types)
    
    # Build structured output
    parsed = {
        "metadata": {
            "source": "Statistics Finland, Table 151u",
            "description": "Assets, liabilities and income of households by income decile group",
            "fetched_at": datetime.now().isoformat(),
            "note": "Values in real terms (2023 prices)",
        },
        "asset_labels": {a: asset_labels[a] for a in asset_types},
        "decile_labels": {d: decile_labels[d] for d in deciles},
        "info_labels": {i: info_labels[i] for i in info_types},
        "time_series": []
    }
    
    for year_idx, year in enumerate(years):
        year_data = {
            "year": int(year),
            "deciles": {}
        }
        
        for decile_idx, decile in enumerate(deciles):
            decile_data = {
                "mean": {},
                "median": {}
            }
            
            for asset_idx, asset in enumerate(asset_types):
                for info_idx, info in enumerate(info_types):
                    # JSON-STAT2 index: asset * (deciles * years * info) + decile * (years * info) + year * info + info_idx
                    flat_idx = (
                        asset_idx * (num_deciles * num_years * num_info) +
                        decile_idx * (num_years * num_info) +
                        year_idx * num_info +
                        info_idx
                    )
                    
                    if flat_idx < len(values):
                        value = values[flat_idx]
                        
                        # Store in appropriate category
                        if "keskiarvo" in info:  # Mean
                            decile_data["mean"][asset] = value
                        elif "mediaani" in info:  # Median
                            decile_data["median"][asset] = value
            
            year_data["deciles"][decile] = decile_data
        
        parsed["time_series"].append(year_data)
    
    return parsed


def calculate_indices_and_ratios(parsed_data):
    """Calculate wealth indices and debt-to-income ratios."""
    
    # Find 2016 as base year (closest to 2015 in wealth data)
    base_year_data = None
    for entry in parsed_data["time_series"]:
        if entry["year"] == 2016:
            base_year_data = entry
            break
    
    if not base_year_data:
        print("Warning: 2016 data not found for base year")
        return parsed_data
    
    # Add calculated metrics
    for entry in parsed_data["time_series"]:
        for decile, decile_data in entry["deciles"].items():
            # Calculate debt-to-income ratio
            income = decile_data["mean"].get("kturaha", 0)
            debt = decile_data["mean"].get("luototy", 0)
            
            if income and income > 0:
                decile_data["debt_to_income"] = round((debt / income) * 100, 1)
            else:
                decile_data["debt_to_income"] = None
            
            # Calculate wealth index (2016=100)
            base_wealth = base_year_data["deciles"].get(decile, {}).get("median", {}).get("nettoae_DN3001")
            current_wealth = decile_data["median"].get("nettoae_DN3001")
            
            if base_wealth and current_wealth and base_wealth > 0:
                decile_data["wealth_index"] = round((current_wealth / base_wealth) * 100, 1)
            else:
                decile_data["wealth_index"] = None
    
    return parsed_data


def main():
    data_dir = Path(__file__).parent.parent / "data"
    data_dir.mkdir(exist_ok=True)
    
    # Fetch raw data
    raw_data = fetch_wealth_data()
    
    if raw_data is None:
        print("Failed to fetch wealth data")
        return
    
    # Save raw data
    raw_path = data_dir / "wealth_deciles_raw.json"
    with open(raw_path, 'w') as f:
        json.dump(raw_data, f, indent=2)
    print(f"Raw data saved to {raw_path}")
    
    # Parse data
    parsed_data = parse_wealth_data(raw_data)
    
    # Calculate indices and ratios
    parsed_data = calculate_indices_and_ratios(parsed_data)
    
    # Save parsed data
    output_path = data_dir / "wealth_deciles.json"
    with open(output_path, 'w') as f:
        json.dump(parsed_data, f, indent=2)
    print(f"Parsed data saved to {output_path}")
    
    # Print summary
    print("\n" + "=" * 80)
    print("HOUSEHOLD WEALTH BY INCOME DECILE")
    print("=" * 80)
    
    # Show 2016 vs 2023 comparison (latest available wealth data)
    data_2016 = None
    data_2023 = None
    
    for entry in parsed_data["time_series"]:
        if entry["year"] == 2016:
            data_2016 = entry
        if entry["year"] == 2023:
            data_2023 = entry
    
    if data_2016 and data_2023:
        print("\nNet Wealth - Median (Real EUR, 2023 prices):")
        print(f"{'Decile':<25} {'2016':>15} {'2023':>15} {'Change':>12}")
        print("-" * 67)
        
        for decile in ["1", "5", "10", "SS"]:
            label = parsed_data["decile_labels"].get(decile, decile)
            wealth_2016 = data_2016["deciles"][decile]["median"].get("nettoae_DN3001", 0)
            wealth_2023 = data_2023["deciles"][decile]["median"].get("nettoae_DN3001", 0)
            
            if wealth_2016 and wealth_2023:
                if wealth_2016 != 0:
                    change = ((wealth_2023 - wealth_2016) / abs(wealth_2016)) * 100
                else:
                    change = 0
                print(f"{label:<25} {wealth_2016:>15,.0f} {wealth_2023:>15,.0f} {change:>+11.1f}%")
        
        print("\nTotal Debt - Mean (Real EUR, 2023 prices):")
        print(f"{'Decile':<25} {'2016':>15} {'2023':>15} {'Change':>12}")
        print("-" * 67)
        
        for decile in ["1", "5", "10", "SS"]:
            label = parsed_data["decile_labels"].get(decile, decile)
            debt_2016 = data_2016["deciles"][decile]["mean"].get("luototy", 0)
            debt_2023 = data_2023["deciles"][decile]["mean"].get("luototy", 0)
            
            if debt_2016 is not None and debt_2023 is not None:
                if debt_2016 != 0:
                    change = ((debt_2023 - debt_2016) / abs(debt_2016)) * 100
                else:
                    change = 0
                print(f"{label:<25} {debt_2016:>15,.0f} {debt_2023:>15,.0f} {change:>+11.1f}%")
        
        print("\nDebt-to-Income Ratio (%):")
        print(f"{'Decile':<25} {'2016':>15} {'2023':>15} {'Change':>12}")
        print("-" * 67)
        
        for decile in ["1", "5", "10", "SS"]:
            label = parsed_data["decile_labels"].get(decile, decile)
            ratio_2016 = data_2016["deciles"][decile].get("debt_to_income", 0)
            ratio_2023 = data_2023["deciles"][decile].get("debt_to_income", 0)
            
            if ratio_2016 is not None and ratio_2023 is not None:
                change = ratio_2023 - ratio_2016
                print(f"{label:<25} {ratio_2016:>14.1f}% {ratio_2023:>14.1f}% {change:>+10.1f}pp")


if __name__ == "__main__":
    main()

