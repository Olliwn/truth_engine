#!/usr/bin/env python3
"""
Calculate comprehensive purchasing power analysis by income decile.

Combines:
- Disposable income data (yearly, 2015-2024)
- Wealth data (survey years: 2016, 2019, 2023)
- Maslow CPI for real purchasing power adjustment

Outputs a unified dataset for the Delta page visualization.
"""

import json
from pathlib import Path
from datetime import datetime


def load_data():
    """Load all required datasets."""
    data_dir = Path(__file__).parent.parent / "data"
    
    with open(data_dir / "income_deciles.json") as f:
        income_data = json.load(f)
    
    with open(data_dir / "wealth_deciles.json") as f:
        wealth_data = json.load(f)
    
    with open(data_dir / "maslow_cpi.json") as f:
        maslow_data = json.load(f)
    
    return income_data, wealth_data, maslow_data


def get_maslow_deflator(maslow_data, year):
    """Get Maslow CPI deflator for a given year (2015=100)."""
    for entry in maslow_data["time_series"]:
        if entry["year"] == year:
            return entry["maslow_cpi"]["index"] / 100
    return 1.0  # Default to no adjustment


def calculate_real_income(income_data, maslow_data):
    """
    Calculate real disposable income adjusted by Maslow CPI.
    This shows purchasing power in terms of essential goods.
    """
    real_income_series = []
    
    for entry in income_data["time_series"]:
        year = entry["year"]
        deflator = get_maslow_deflator(maslow_data, year)
        
        year_data = {
            "year": year,
            "deciles": {}
        }
        
        for decile, decile_data in entry["deciles"].items():
            nominal_income = decile_data.get("kturaha")  # Mean disposable income
            nominal_median = decile_data.get("kturaha_med")  # Median disposable income
            
            real_income = None
            real_median = None
            
            if nominal_income and deflator > 0:
                real_income = round(nominal_income / deflator, 0)
            if nominal_median and deflator > 0:
                real_median = round(nominal_median / deflator, 0)
            
            year_data["deciles"][decile] = {
                "nominal_income": nominal_income,
                "real_income": real_income,
                "nominal_median": nominal_median,
                "real_median": real_median,
                "income_index": decile_data.get("income_index"),
            }
        
        real_income_series.append(year_data)
    
    return real_income_series


def calculate_indices(income_series, wealth_data, base_year=2015):
    """Calculate indices relative to base year."""
    
    # Find base year income data
    base_income = None
    for entry in income_series:
        if entry["year"] == base_year:
            base_income = entry
            break
    
    # Find base year wealth data (use 2016 as closest to 2015)
    base_wealth = None
    for entry in wealth_data["time_series"]:
        if entry["year"] == 2016:
            base_wealth = entry
            break
    
    # Calculate income indices
    for entry in income_series:
        for decile, decile_data in entry["deciles"].items():
            if base_income and decile in base_income["deciles"]:
                base_real = base_income["deciles"][decile].get("real_income")
                current_real = decile_data.get("real_income")
                
                if base_real and current_real and base_real > 0:
                    decile_data["real_income_index"] = round((current_real / base_real) * 100, 1)
                else:
                    decile_data["real_income_index"] = None
    
    # Calculate wealth indices (for wealth survey years)
    for entry in wealth_data["time_series"]:
        for decile, decile_data in entry["deciles"].items():
            if base_wealth and decile in base_wealth["deciles"]:
                base_net_wealth = base_wealth["deciles"][decile]["median"].get("nettoae_DN3001")
                current_net_wealth = decile_data["median"].get("nettoae_DN3001")
                
                if base_net_wealth and current_net_wealth:
                    if base_net_wealth > 0:
                        decile_data["wealth_index"] = round((current_net_wealth / base_net_wealth) * 100, 1)
                    elif base_net_wealth < 0 and current_net_wealth < 0:
                        # Both negative - invert the ratio for meaningful comparison
                        decile_data["wealth_index"] = round((base_net_wealth / current_net_wealth) * 100, 1)
                    else:
                        decile_data["wealth_index"] = None
    
    return income_series, wealth_data


def calculate_summary_statistics(income_series, wealth_data):
    """Calculate summary statistics for the analysis."""
    
    # Find first and last years
    first_income = income_series[0]
    last_income = income_series[-1]
    
    # Find 2016 and 2023 wealth data
    wealth_2016 = None
    wealth_2023 = None
    for entry in wealth_data["time_series"]:
        if entry["year"] == 2016:
            wealth_2016 = entry
        if entry["year"] == 2023:
            wealth_2023 = entry
    
    summary = {
        "income_period": f"{first_income['year']}-{last_income['year']}",
        "wealth_period": "2016-2023",
        "decile_changes": {},
        "key_insights": []
    }
    
    # Calculate changes for each decile
    for decile in ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]:
        decile_summary = {}
        
        # Income change (real)
        first_real_income = first_income["deciles"].get(decile, {}).get("real_income")
        last_real_income = last_income["deciles"].get(decile, {}).get("real_income")
        
        if first_real_income and last_real_income and first_real_income > 0:
            decile_summary["real_income_change_pct"] = round(
                ((last_real_income - first_real_income) / first_real_income) * 100, 1
            )
        
        # Nominal income change
        first_nominal = first_income["deciles"].get(decile, {}).get("nominal_income")
        last_nominal = last_income["deciles"].get(decile, {}).get("nominal_income")
        
        if first_nominal and last_nominal and first_nominal > 0:
            decile_summary["nominal_income_change_pct"] = round(
                ((last_nominal - first_nominal) / first_nominal) * 100, 1
            )
        
        # Wealth change
        if wealth_2016 and wealth_2023:
            wealth_2016_val = wealth_2016["deciles"].get(decile, {}).get("median", {}).get("nettoae_DN3001")
            wealth_2023_val = wealth_2023["deciles"].get(decile, {}).get("median", {}).get("nettoae_DN3001")
            
            if wealth_2016_val and wealth_2023_val and wealth_2016_val != 0:
                decile_summary["wealth_change_pct"] = round(
                    ((wealth_2023_val - wealth_2016_val) / abs(wealth_2016_val)) * 100, 1
                )
        
        summary["decile_changes"][decile] = decile_summary
    
    # Generate key insights
    bottom_income_change = summary["decile_changes"].get("1", {}).get("real_income_change_pct", 0)
    top_income_change = summary["decile_changes"].get("10", {}).get("real_income_change_pct", 0)
    bottom_wealth_change = summary["decile_changes"].get("1", {}).get("wealth_change_pct", 0)
    top_wealth_change = summary["decile_changes"].get("10", {}).get("wealth_change_pct", 0)
    
    income_gap = top_income_change - bottom_income_change if top_income_change and bottom_income_change else 0
    wealth_gap = top_wealth_change - bottom_wealth_change if top_wealth_change and bottom_wealth_change else 0
    
    summary["gaps"] = {
        "income_gap_widened": income_gap,
        "wealth_gap_widened": wealth_gap,
    }
    
    # Key insight message
    summary["key_insight"] = (
        f"Since 2015, the bottom 10% saw real purchasing power fall {abs(bottom_income_change or 0):.1f}% "
        f"while the top 10% gained {top_income_change or 0:.1f}%. "
        f"The wealth gap widened by {wealth_gap:.0f} percentage points."
    )
    
    return summary


def build_output(income_series, wealth_data, summary):
    """Build the final output data structure."""
    
    output = {
        "metadata": {
            "name": "Purchasing Power by Income Decile",
            "description": "Analysis of disposable income, wealth, and debt across income groups",
            "calculated_at": datetime.now().isoformat(),
            "base_year": 2015,
            "maslow_adjusted": True,
        },
        "summary": summary,
        "income_time_series": income_series,
        "wealth_data": {
            "years_available": [entry["year"] for entry in wealth_data["time_series"]],
            "time_series": wealth_data["time_series"],
        },
        "decile_labels": {
            "1": "I (Lowest 10%)",
            "2": "II",
            "3": "III",
            "4": "IV",
            "5": "V (Median)",
            "6": "VI",
            "7": "VII",
            "8": "VIII",
            "9": "IX",
            "10": "X (Top 10%)",
            "SS": "Total"
        }
    }
    
    return output


def main():
    print("Loading data...")
    income_data, wealth_data, maslow_data = load_data()
    
    print("Calculating real income (Maslow CPI adjusted)...")
    income_series = calculate_real_income(income_data, maslow_data)
    
    print("Calculating indices...")
    income_series, wealth_data = calculate_indices(income_series, wealth_data)
    
    print("Calculating summary statistics...")
    summary = calculate_summary_statistics(income_series, wealth_data)
    
    print("Building output...")
    output = build_output(income_series, wealth_data, summary)
    
    # Save output
    data_dir = Path(__file__).parent.parent / "data"
    output_path = data_dir / "purchasing_power.json"
    
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"\nData saved to {output_path}")
    
    # Print summary
    print("\n" + "=" * 80)
    print("PURCHASING POWER ANALYSIS BY INCOME DECILE")
    print("=" * 80)
    
    print(f"\nPeriod: {summary['income_period']}")
    print(f"\n📊 Key Insight:")
    print(f"   {summary['key_insight']}")
    
    print("\nReal Income Change (Maslow CPI adjusted):")
    print(f"{'Decile':<20} {'Change':>12}")
    print("-" * 32)
    
    for decile in ["1", "5", "10"]:
        label = output["decile_labels"].get(decile, decile)
        change = summary["decile_changes"].get(decile, {}).get("real_income_change_pct", 0)
        if change is not None:
            print(f"{label:<20} {change:>+11.1f}%")
    
    print("\nNet Wealth Change (2016-2023):")
    print(f"{'Decile':<20} {'Change':>12}")
    print("-" * 32)
    
    for decile in ["1", "5", "10"]:
        label = output["decile_labels"].get(decile, decile)
        change = summary["decile_changes"].get(decile, {}).get("wealth_change_pct", 0)
        if change is not None:
            print(f"{label:<20} {change:>+11.1f}%")
    
    print(f"\n🔺 Income gap widened: {summary['gaps']['income_gap_widened']:.1f} percentage points")
    print(f"🔺 Wealth gap widened: {summary['gaps']['wealth_gap_widened']:.1f} percentage points")


if __name__ == "__main__":
    main()

