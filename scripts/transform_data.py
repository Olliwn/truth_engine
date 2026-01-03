#!/usr/bin/env python3
"""
Transform population and debt data into Ponzi Index calculations.

Ponzi Index Formula:
PonziIndex = (CurrentDebt / Taxpayers_2035) × (Dependents_2035 / Taxpayers_2035)

This captures:
- Debt burden per future worker
- Dependency ratio pressure
"""

import json
from pathlib import Path
from typing import Optional

def load_json(filepath: Path) -> list:
    """Load JSON data from file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def normalize_municipality_code(code: str) -> str:
    """Normalize municipality codes to a common format (just the number)."""
    # Remove 'KU' prefix if present
    if code.startswith('KU'):
        return code[2:]
    return code

def calculate_ponzi_index(
    population_data: list[dict],
    debt_data: list[dict],
    target_year: str = "2035"
) -> list[dict]:
    """
    Calculate the Ponzi Index for each municipality.
    
    Args:
        population_data: Population projections by municipality
        debt_data: Municipal debt data
        target_year: Year for population projection (default: 2035)
    
    Returns:
        List of municipalities with Ponzi Index calculations
    """
    # Index population data by normalized municipality code and year
    pop_by_muni = {}
    for record in population_data:
        code = normalize_municipality_code(record['municipality_code'])
        year = record['year']
        key = (code, year)
        pop_by_muni[key] = record
    
    # Index debt data by normalized municipality code
    debt_by_muni = {}
    for record in debt_data:
        code = normalize_municipality_code(record['municipality_code'])
        debt_by_muni[code] = record
    
    results = []
    
    # Get unique municipality codes from debt data
    municipality_codes = set(debt_by_muni.keys())
    
    matched = 0
    for muni_code in municipality_codes:
        debt_record = debt_by_muni.get(muni_code)
        pop_record = pop_by_muni.get((muni_code, target_year))
        
        if not debt_record or not pop_record:
            continue
        
        matched += 1
        
        # Extract values
        total_debt = debt_record.get('total_debt_eur', 0)
        loan_per_capita = debt_record.get('loan_per_capita_eur', 0)
        working_age = pop_record.get('working_age_20_64', 0)
        total_dependents = pop_record.get('total_dependents', 0)
        young_dependents = pop_record.get('young_dependents_0_19', 0)
        elderly_dependents = pop_record.get('elderly_dependents_65_plus', 0)
        total_population = pop_record.get('total_population', 0)
        
        # Avoid division by zero
        if working_age <= 0:
            continue
        
        # If we don't have total debt, estimate from per capita
        if total_debt == 0 and loan_per_capita > 0:
            current_pop = debt_record.get('population', total_population)
            if current_pop > 0:
                total_debt = loan_per_capita * current_pop
        
        # Calculate metrics
        debt_per_worker = total_debt / working_age if working_age > 0 else 0
        dependency_ratio = total_dependents / working_age if working_age > 0 else 0
        
        # Ponzi Index = (Debt / Workers) × (Dependents / Workers)
        # Higher = worse (more debt per worker AND more dependents per worker)
        ponzi_index = debt_per_worker * dependency_ratio
        
        # Use the municipality name from either source
        muni_name = debt_record.get('municipality_name') or pop_record.get('municipality_name', '')
        
        results.append({
            'municipality_code': muni_code,
            'municipality_name': muni_name,
            'projection_year': target_year,
            'debt_year': debt_record.get('year', ''),
            
            # Raw values
            'total_debt_eur': total_debt,
            'working_age_population': working_age,
            'total_dependents': total_dependents,
            'young_dependents_0_19': young_dependents,
            'elderly_dependents_65_plus': elderly_dependents,
            'total_population': total_population,
            
            # Calculated metrics
            'debt_per_worker_eur': round(debt_per_worker, 2),
            'dependency_ratio': round(dependency_ratio, 4),
            'elderly_ratio': round(elderly_dependents / working_age, 4) if working_age > 0 else 0,
            'youth_ratio': round(young_dependents / working_age, 4) if working_age > 0 else 0,
            
            # Additional debt metrics from source
            'loan_per_capita_eur': loan_per_capita,
            'relative_indebtedness_pct': debt_record.get('relative_indebtedness_pct', 0),
            'equity_ratio_pct': debt_record.get('equity_ratio_pct', 0),
            
            # The Ponzi Index
            'ponzi_index': round(ponzi_index, 2),
            
            # Risk category (will be refined based on distribution)
            'risk_category': categorize_risk(ponzi_index, dependency_ratio, debt_per_worker)
        })
    
    print(f"  Matched {matched} municipalities between population and debt data")
    
    # Sort by Ponzi Index (highest risk first)
    results.sort(key=lambda x: x['ponzi_index'], reverse=True)
    
    # Add ranking
    for i, record in enumerate(results):
        record['rank'] = i + 1
    
    return results

def categorize_risk(ponzi_index: float, dependency_ratio: float, debt_per_worker: float) -> str:
    """
    Categorize municipality risk level based on metrics.
    
    Returns: 'critical', 'high', 'elevated', 'moderate', 'low'
    """
    # These thresholds are calibrated based on the actual data distribution
    if ponzi_index > 30000:
        return 'critical'
    elif ponzi_index > 20000:
        return 'high'
    elif ponzi_index > 10000:
        return 'elevated'
    elif ponzi_index > 5000:
        return 'moderate'
    else:
        return 'low'

def calculate_statistics(results: list[dict]) -> dict:
    """Calculate summary statistics for the dataset."""
    if not results:
        return {}
    
    ponzi_values = [r['ponzi_index'] for r in results]
    debt_values = [r['debt_per_worker_eur'] for r in results]
    dep_ratios = [r['dependency_ratio'] for r in results]
    
    import statistics
    
    return {
        'total_municipalities': len(results),
        'ponzi_index': {
            'min': round(min(ponzi_values), 2),
            'max': round(max(ponzi_values), 2),
            'mean': round(statistics.mean(ponzi_values), 2),
            'median': round(statistics.median(ponzi_values), 2),
            'stdev': round(statistics.stdev(ponzi_values), 2) if len(ponzi_values) > 1 else 0
        },
        'debt_per_worker': {
            'min': round(min(debt_values), 2),
            'max': round(max(debt_values), 2),
            'mean': round(statistics.mean(debt_values), 2),
            'median': round(statistics.median(debt_values), 2)
        },
        'dependency_ratio': {
            'min': round(min(dep_ratios), 4),
            'max': round(max(dep_ratios), 4),
            'mean': round(statistics.mean(dep_ratios), 4),
            'median': round(statistics.median(dep_ratios), 4)
        },
        'risk_distribution': {
            'critical': sum(1 for r in results if r['risk_category'] == 'critical'),
            'high': sum(1 for r in results if r['risk_category'] == 'high'),
            'elevated': sum(1 for r in results if r['risk_category'] == 'elevated'),
            'moderate': sum(1 for r in results if r['risk_category'] == 'moderate'),
            'low': sum(1 for r in results if r['risk_category'] == 'low')
        }
    }

def main():
    """Main function to transform data and calculate Ponzi Index."""
    data_dir = Path(__file__).parent.parent / 'data'
    
    # Load input data
    pop_file = data_dir / 'population_projection.json'
    debt_file = data_dir / 'municipal_debt.json'
    
    if not pop_file.exists():
        print(f"Error: Population data not found at {pop_file}")
        print("Run fetch_population.py first")
        return 1
    
    if not debt_file.exists():
        print(f"Error: Debt data not found at {debt_file}")
        print("Run fetch_municipal_debt.py first")
        return 1
    
    print("Loading data...")
    population_data = load_json(pop_file)
    debt_data = load_json(debt_file)
    
    print(f"Loaded {len(population_data)} population records")
    print(f"Loaded {len(debt_data)} debt records")
    
    # Calculate Ponzi Index for multiple years
    years = ["2024", "2035", "2040"]
    all_results = {}
    
    for year in years:
        print(f"\nCalculating Ponzi Index for {year}...")
        results = calculate_ponzi_index(population_data, debt_data, year)
        if results:
            all_results[year] = {
                'municipalities': results,
                'statistics': calculate_statistics(results)
            }
            stats = all_results[year]['statistics']
            print(f"  Ponzi Index range: {stats['ponzi_index']['min']:,.0f} - {stats['ponzi_index']['max']:,.0f}")
            print(f"  Mean: {stats['ponzi_index']['mean']:,.0f}, Median: {stats['ponzi_index']['median']:,.0f}")
    
    # Save results
    output_file = data_dir / 'ponzi_index.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)
    print(f"\nSaved Ponzi Index data to {output_file}")
    
    # Also save a simplified version for the frontend (2035 data only)
    if "2035" in all_results:
        simplified = all_results["2035"]["municipalities"]
        simplified_file = data_dir / 'ponzi_index_2035.json'
        with open(simplified_file, 'w', encoding='utf-8') as f:
            json.dump(simplified, f, ensure_ascii=False, indent=2)
        print(f"Saved simplified 2035 data to {simplified_file}")
        
        # Print top 10 worst municipalities
        print("\n" + "="*80)
        print("TOP 10 MUNICIPALITIES BY PONZI INDEX (2035 Projection)")
        print("="*80)
        for record in simplified[:10]:
            print(f"{record['rank']:2}. {record['municipality_name']:<20} "
                  f"Ponzi: {record['ponzi_index']:>12,.0f}  "
                  f"Debt/Worker: €{record['debt_per_worker_eur']:>10,.0f}  "
                  f"Dep.Ratio: {record['dependency_ratio']:.2f}")
        
        print("\n" + "="*80)
        print("RISK DISTRIBUTION")
        print("="*80)
        stats = all_results["2035"]["statistics"]
        for level, count in stats['risk_distribution'].items():
            print(f"  {level.upper()}: {count} municipalities")
    
    return 0

if __name__ == '__main__':
    exit(main())
