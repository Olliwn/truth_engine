#!/usr/bin/env python3
"""
Fetch disposable income by income decile from Statistics Finland.
Table: statfin_tjt_pxt_128c.px (Income and income structure by decile)

This provides:
- Disposable cash income (mean and median) by decile
- Earned income, property income, transfers received
- Taxes paid
- Years: 1995-2024
"""

import requests
import json
from pathlib import Path
from datetime import datetime

INCOME_URL = "https://pxdata.stat.fi:443/PxWeb/api/v1/en/StatFin/tjt/statfin_tjt_pxt_128c.px"

# Key income metrics to fetch
# kturaha = Disposable cash income (mean)
# kturaha_med = Disposable cash income (median)
# palk = Earned income
# omtu = Property income total
# saatusi = Current transfers received
# makstu = Current transfers paid (taxes)
INCOME_METRICS = ["kturaha", "kturaha_med", "palk", "omtu", "saatusi", "makstu"]

# All deciles including total
DECILES = ["SS", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]

# Years to fetch (2015-2024 to match our base year)
YEARS = [str(year) for year in range(2015, 2025)]

income_query = {
    "query": [
        {
            "code": "Tiedot",
            "selection": {
                "filter": "item",
                "values": INCOME_METRICS
            }
        },
        {
            "code": "Vuosi",
            "selection": {
                "filter": "item",
                "values": YEARS
            }
        },
        {
            "code": "Tulokymmenys",
            "selection": {
                "filter": "item",
                "values": DECILES
            }
        }
    ],
    "response": {
        "format": "json-stat2"
    }
}


def fetch_income_data():
    """Fetch income distribution data from Statistics Finland."""
    print("Fetching income distribution data by decile...")
    print(f"URL: {INCOME_URL}")
    
    response = requests.post(INCOME_URL, json=income_query)
    
    if response.status_code != 200:
        print(f"Error: {response.status_code}")
        print(response.text)
        return None
    
    data = response.json()
    return data


def parse_income_data(raw_data):
    """Parse JSON-STAT2 format into structured data."""
    
    # Get dimensions
    metrics = list(raw_data['dimension']['Tiedot']['category']['label'].keys())
    years = list(raw_data['dimension']['Vuosi']['category']['label'].keys())
    deciles = list(raw_data['dimension']['Tulokymmenys']['category']['label'].keys())
    
    metric_labels = raw_data['dimension']['Tiedot']['category']['label']
    decile_labels = raw_data['dimension']['Tulokymmenys']['category']['label']
    
    values = raw_data['value']
    
    # Dimension sizes for index calculation
    num_metrics = len(metrics)
    num_years = len(years)
    num_deciles = len(deciles)
    
    # Build structured output
    parsed = {
        "metadata": {
            "source": "Statistics Finland, Table 128c",
            "description": "Income and income structure of household-dwelling units by income decile",
            "fetched_at": datetime.now().isoformat(),
            "base_year": 2015,
        },
        "metric_labels": {m: metric_labels[m] for m in metrics},
        "decile_labels": {d: decile_labels[d] for d in deciles},
        "time_series": []
    }
    
    for year_idx, year in enumerate(years):
        year_data = {
            "year": int(year),
            "deciles": {}
        }
        
        for decile_idx, decile in enumerate(deciles):
            decile_data = {}
            
            for metric_idx, metric in enumerate(metrics):
                # JSON-STAT2 index calculation: metric * (years * deciles) + year * deciles + decile
                flat_idx = (metric_idx * num_years * num_deciles) + (year_idx * num_deciles) + decile_idx
                
                if flat_idx < len(values):
                    decile_data[metric] = values[flat_idx]
                else:
                    decile_data[metric] = None
            
            year_data["deciles"][decile] = decile_data
        
        parsed["time_series"].append(year_data)
    
    return parsed


def calculate_indices(parsed_data):
    """Calculate index values (2015=100) for each metric and decile."""
    
    # Find 2015 base values
    base_year_data = None
    for entry in parsed_data["time_series"]:
        if entry["year"] == 2015:
            base_year_data = entry
            break
    
    if not base_year_data:
        print("Warning: 2015 data not found, cannot calculate indices")
        return parsed_data
    
    # Add index values
    for entry in parsed_data["time_series"]:
        for decile, decile_data in entry["deciles"].items():
            base_decile = base_year_data["deciles"].get(decile, {})
            
            # Calculate index for disposable income
            base_income = base_decile.get("kturaha")
            current_income = decile_data.get("kturaha")
            
            if base_income and current_income and base_income > 0:
                decile_data["income_index"] = round((current_income / base_income) * 100, 1)
            else:
                decile_data["income_index"] = None
    
    return parsed_data


def main():
    data_dir = Path(__file__).parent.parent / "data"
    data_dir.mkdir(exist_ok=True)
    
    # Fetch raw data
    raw_data = fetch_income_data()
    
    if raw_data is None:
        print("Failed to fetch income data")
        return
    
    # Save raw data
    raw_path = data_dir / "income_deciles_raw.json"
    with open(raw_path, 'w') as f:
        json.dump(raw_data, f, indent=2)
    print(f"Raw data saved to {raw_path}")
    
    # Parse data
    parsed_data = parse_income_data(raw_data)
    
    # Calculate indices
    parsed_data = calculate_indices(parsed_data)
    
    # Save parsed data
    output_path = data_dir / "income_deciles.json"
    with open(output_path, 'w') as f:
        json.dump(parsed_data, f, indent=2)
    print(f"Parsed data saved to {output_path}")
    
    # Print summary
    print("\n" + "=" * 70)
    print("INCOME DISTRIBUTION BY DECILE (2015-2024)")
    print("=" * 70)
    
    # Show 2015 vs 2024 comparison for key deciles
    data_2015 = None
    data_2024 = None
    
    for entry in parsed_data["time_series"]:
        if entry["year"] == 2015:
            data_2015 = entry
        if entry["year"] == 2024:
            data_2024 = entry
    
    if data_2015 and data_2024:
        print("\nDisposable Income (Mean, EUR):")
        print(f"{'Decile':<20} {'2015':>12} {'2024':>12} {'Change':>12}")
        print("-" * 56)
        
        for decile in ["1", "5", "10", "SS"]:
            label = parsed_data["decile_labels"].get(decile, decile)
            income_2015 = data_2015["deciles"][decile].get("kturaha", 0)
            income_2024 = data_2024["deciles"][decile].get("kturaha", 0)
            
            if income_2015 and income_2024:
                change = ((income_2024 - income_2015) / income_2015) * 100
                print(f"{label:<20} {income_2015:>12,.0f} {income_2024:>12,.0f} {change:>+11.1f}%")
        
        print("\nTaxes Paid (Mean, EUR):")
        print(f"{'Decile':<20} {'2015':>12} {'2024':>12} {'Change':>12}")
        print("-" * 56)
        
        for decile in ["1", "5", "10", "SS"]:
            label = parsed_data["decile_labels"].get(decile, decile)
            tax_2015 = data_2015["deciles"][decile].get("makstu", 0)
            tax_2024 = data_2024["deciles"][decile].get("makstu", 0)
            
            if tax_2015 and tax_2024:
                change = ((tax_2024 - tax_2015) / tax_2015) * 100
                print(f"{label:<20} {tax_2015:>12,.0f} {tax_2024:>12,.0f} {change:>+11.1f}%")


if __name__ == "__main__":
    main()

