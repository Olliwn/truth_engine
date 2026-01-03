#!/usr/bin/env python3
"""
Calculate the Maslow CPI - a "working class" inflation index
that weights essential goods more heavily than official CPI.

Maslow CPI weights:
- Food: 35% (essentials for survival)
- Housing (rent): 40% (basic shelter)
- Energy (electricity/gas): 15% (heat and light)
- Fuel (petrol/diesel): 10% (transport to work)

Compare against:
- Official CPI (headline inflation)
- Asset prices (housing + stocks) for "rich person inflation"
"""

import json
from pathlib import Path
from datetime import datetime

# Maslow CPI weights based on typical low-income household budget
MASLOW_WEIGHTS = {
    "011": 0.35,   # Food
    "0411": 0.40,  # Actual rentals for housing  
    "045": 0.15,   # Electricity, gas and other fuels
    "0722": 0.10,  # Fuels and lubricants (petrol/diesel)
}

# Category names for display
CATEGORY_NAMES = {
    "0": "Official CPI",
    "011": "Food",
    "0411": "Housing (Rent)",
    "045": "Energy",
    "0722": "Fuel (Transport)",
}


def load_data():
    """Load CPI and asset price data."""
    data_dir = Path(__file__).parent.parent / "data"
    
    with open(data_dir / "cpi_data.json") as f:
        cpi_data = json.load(f)
    
    with open(data_dir / "asset_prices.json") as f:
        asset_data = json.load(f)
    
    return cpi_data, asset_data


def calculate_maslow_cpi(cpi_data):
    """Calculate the weighted Maslow CPI for each year."""
    maslow_cpi = {}
    
    years = list(cpi_data["categories"]["0"]["values"].keys())
    
    for year in years:
        weighted_sum = 0
        
        for cat_code, weight in MASLOW_WEIGHTS.items():
            if cat_code in cpi_data["categories"]:
                value = cpi_data["categories"][cat_code]["values"].get(year)
                if value is not None:
                    weighted_sum += value * weight
        
        maslow_cpi[year] = round(weighted_sum, 2)
    
    return maslow_cpi


def calculate_asset_index(asset_data):
    """
    Calculate a combined asset price index.
    50% housing + 50% stocks (typical wealthy portfolio)
    """
    housing = asset_data["housing_price_index"]["values"]
    stocks = asset_data["omx_helsinki_25"]["values"]
    
    combined = {}
    for year in housing.keys():
        if year in stocks:
            # 50/50 split for wealthy household
            h_val = housing[year] if housing[year] is not None else 100
            s_val = stocks[year]
            combined[year] = round((h_val * 0.5 + s_val * 0.5), 2)
    
    return combined


def calculate_yearly_change(values):
    """Calculate year-over-year percentage change."""
    years = sorted(values.keys())
    changes = {}
    
    for i, year in enumerate(years):
        if i == 0:
            changes[year] = 0
        else:
            prev_year = years[i - 1]
            prev_val = values[prev_year]
            curr_val = values[year]
            if prev_val and curr_val:
                change = ((curr_val - prev_val) / prev_val) * 100
                changes[year] = round(change, 2)
            else:
                changes[year] = None
    
    return changes


def main():
    print("Loading data...")
    cpi_data, asset_data = load_data()
    
    # Calculate indices
    maslow_cpi = calculate_maslow_cpi(cpi_data)
    official_cpi = cpi_data["categories"]["0"]["values"]
    asset_index = calculate_asset_index(asset_data)
    
    # Get additional economic indicators
    gdp_index = asset_data.get("gdp_per_capita", {}).get("values", {})
    nominal_wage = asset_data.get("wage_index_nominal", {}).get("values", {})
    real_wage = asset_data.get("wage_index_real", {}).get("values", {})
    sp500 = asset_data.get("sp500", {}).get("values", {})
    omx_helsinki = asset_data.get("omx_helsinki_25", {}).get("values", {})
    
    # Calculate yearly changes
    maslow_changes = calculate_yearly_change(maslow_cpi)
    official_changes = calculate_yearly_change(official_cpi)
    asset_changes = calculate_yearly_change(asset_index)
    gdp_changes = calculate_yearly_change(gdp_index)
    nominal_wage_changes = calculate_yearly_change(nominal_wage)
    real_wage_changes = calculate_yearly_change(real_wage)
    sp500_changes = calculate_yearly_change(sp500)
    
    # Build output data
    years = sorted(maslow_cpi.keys())
    
    time_series = []
    for year in years:
        entry = {
            "year": int(year),
            "maslow_cpi": {
                "index": maslow_cpi[year],
                "yoy_change": maslow_changes.get(year, 0),
            },
            "official_cpi": {
                "index": official_cpi.get(year, 100),
                "yoy_change": official_changes.get(year, 0),
            },
            "asset_index": {
                "index": asset_index.get(year, 100),
                "yoy_change": asset_changes.get(year, 0),
            },
            # Additional economic indicators
            "gdp_per_capita": {
                "index": gdp_index.get(year, 100),
                "yoy_change": gdp_changes.get(year, 0),
            },
            "nominal_wage": {
                "index": nominal_wage.get(year, 100),
                "yoy_change": nominal_wage_changes.get(year, 0),
            },
            "real_wage": {
                "index": real_wage.get(year, 100),
                "yoy_change": real_wage_changes.get(year, 0),
            },
            "sp500": {
                "index": sp500.get(year, 100),
                "yoy_change": sp500_changes.get(year, 0),
            },
            "omx_helsinki": {
                "index": omx_helsinki.get(year, 100),
                "yoy_change": 0,  # Calculate if needed
            },
            # The gap between working class and official inflation
            "inflation_gap": round(maslow_cpi[year] - official_cpi.get(year, 100), 2),
            # The gap between asset owners and workers
            "wealth_gap": round(asset_index.get(year, 100) - maslow_cpi[year], 2),
        }
        time_series.append(entry)
    
    # Category breakdown for detailed view
    category_breakdown = {}
    for cat_code in ["0", "011", "0411", "045", "0722"]:
        if cat_code in cpi_data["categories"]:
            cat = cpi_data["categories"][cat_code]
            cat_values = cat["values"]
            
            category_breakdown[cat_code] = {
                "name": CATEGORY_NAMES.get(cat_code, cat["name"]),
                "weight": MASLOW_WEIGHTS.get(cat_code, 0),
                "values": [{
                    "year": int(year),
                    "index": cat_values.get(year, 100),
                } for year in years if year in cat_values]
            }
    
    # Summary statistics
    first_year = years[0]
    last_year = years[-1]
    
    def calc_change(data, first, last):
        start = data.get(first, 100)
        end = data.get(last, 100)
        if start and end:
            return round(((end - start) / start) * 100, 1)
        return 0
    
    summary = {
        "period": f"{first_year}-{last_year}",
        "maslow_cpi": {
            "start": maslow_cpi[first_year],
            "end": maslow_cpi[last_year],
            "total_change_pct": calc_change(maslow_cpi, first_year, last_year),
        },
        "official_cpi": {
            "start": official_cpi[first_year],
            "end": official_cpi[last_year],
            "total_change_pct": calc_change(official_cpi, first_year, last_year),
        },
        "asset_index": {
            "start": asset_index[first_year],
            "end": asset_index[last_year],
            "total_change_pct": calc_change(asset_index, first_year, last_year),
        },
        "gdp_per_capita": {
            "start": gdp_index.get(first_year, 100),
            "end": gdp_index.get(last_year, 100),
            "total_change_pct": calc_change(gdp_index, first_year, last_year),
        },
        "nominal_wage": {
            "start": nominal_wage.get(first_year, 100),
            "end": nominal_wage.get(last_year, 100),
            "total_change_pct": calc_change(nominal_wage, first_year, last_year),
        },
        "real_wage": {
            "start": real_wage.get(first_year, 100),
            "end": real_wage.get(last_year, 100),
            "total_change_pct": calc_change(real_wage, first_year, last_year),
        },
        "sp500": {
            "start": sp500.get(first_year, 100),
            "end": sp500.get(last_year, 100),
            "total_change_pct": calc_change(sp500, first_year, last_year),
        },
        "key_insight": "",  # Will be filled below
    }
    
    # Generate key insight
    maslow_gain = summary["maslow_cpi"]["total_change_pct"]
    official_gain = summary["official_cpi"]["total_change_pct"]
    real_wage_gain = summary["real_wage"]["total_change_pct"]
    sp500_gain = summary["sp500"]["total_change_pct"]
    
    gap = maslow_gain - official_gain
    
    summary["key_insight"] = (
        f"Since 2015, working-class essentials rose {maslow_gain:.1f}% while real wages fell {abs(real_wage_gain):.1f}%. "
        f"Meanwhile, the S&P 500 gained {sp500_gain:.1f}% — the gap between workers and capital owners has never been wider."
    )
    
    # Final output
    output = {
        "metadata": {
            "name": "Maslow CPI - Working Class Inflation Index",
            "description": "A weighted index of essential goods compared to official CPI and asset prices",
            "methodology": "Weights: Food 35%, Housing 40%, Energy 15%, Fuel 10%",
            "base_year": 2015,
            "calculated_at": datetime.now().isoformat(),
        },
        "summary": summary,
        "time_series": time_series,
        "category_breakdown": category_breakdown,
        "weights": {
            "food": 0.35,
            "housing": 0.40,
            "energy": 0.15,
            "fuel": 0.10,
        },
    }
    
    # Save output
    data_dir = Path(__file__).parent.parent / "data"
    output_path = data_dir / "maslow_cpi.json"
    
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"\nMaslow CPI data saved to {output_path}")
    
    # Print summary
    print("\n" + "=" * 60)
    print("MASLOW CPI ANALYSIS")
    print("=" * 60)
    
    print(f"\nPeriod: {first_year} - {last_year}")
    print(f"\nIndex Values (2015 = 100):")
    print(f"  Official CPI:  {official_cpi[first_year]:.1f} → {official_cpi[last_year]:.1f} ({summary['official_cpi']['total_change_pct']:+.1f}%)")
    print(f"  Maslow CPI:    {maslow_cpi[first_year]:.1f} → {maslow_cpi[last_year]:.1f} ({summary['maslow_cpi']['total_change_pct']:+.1f}%)")
    print(f"  Asset Index:   {asset_index[first_year]:.1f} → {asset_index[last_year]:.1f} ({summary['asset_index']['total_change_pct']:+.1f}%)")
    
    print(f"\nEconomic Indicators:")
    print(f"  GDP per Capita:  {summary['gdp_per_capita']['total_change_pct']:+.1f}%")
    print(f"  Nominal Wages:   {summary['nominal_wage']['total_change_pct']:+.1f}%")
    print(f"  Real Wages:      {summary['real_wage']['total_change_pct']:+.1f}%")
    print(f"  S&P 500:         {summary['sp500']['total_change_pct']:+.1f}%")
    
    print(f"\n📊 Key Insight:")
    print(f"   {summary['key_insight']}")
    
    print(f"\nCategory Breakdown ({last_year}):")
    for cat_code, cat_data in category_breakdown.items():
        if cat_code != "0":
            weight_pct = cat_data['weight'] * 100
            last_val = cat_data['values'][-1]['index'] if cat_data['values'] else 100
            print(f"  {cat_data['name']:20} ({weight_pct:2.0f}%): {last_val:.1f}")


if __name__ == "__main__":
    main()

