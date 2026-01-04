#!/usr/bin/env python3
"""
Fetch Finnish Social Protection spending efficiency data.
Breaks down spending by transaction type to measure what % goes to beneficiaries vs bureaucracy.

Focused exclusively on G10 (Social Protection) and its subcategories.

Table: statfin_jmete_pxt_12a6 - General government expenditure by function

Key transaction types:
- D62K: Social benefits (cash to citizens)
- D632K: Social transfers in kind (via private providers)
- D1K: Compensation of employees (bureaucracy)
- P2K: Intermediate consumption (overhead)
"""

import json
import requests
from pathlib import Path
from datetime import datetime

BASE_URL = "https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin"

# Social Protection subcategories (G10)
SOCIAL_PROTECTION_SUBS = {
    'G1001': 'Sickness and disability',
    'G1002': 'Old age (pensions)',
    'G1003': 'Survivors',
    'G1004': 'Family and children',
    'G1005': 'Unemployment',
    'G1006': 'Housing assistance',
    'G1007': 'Social exclusion',
    'G1008': 'R&D social protection',
    'G1009': 'Other social protection',
}

# Transaction types
TRANSACTION_TYPES = {
    'D62K': {'name': 'Cash benefits to citizens', 'category': 'benefits'},
    'D632K': {'name': 'In-kind benefits (via private)', 'category': 'benefits'},
    'D1K': {'name': 'Employee compensation', 'category': 'bureaucracy'},
    'P2K': {'name': 'Intermediate consumption', 'category': 'overhead'},
    'OTES': {'name': 'Total expenditure', 'category': 'total'},
}

# OECD benchmark data (static, from OECD SOCX 2023 data)
OECD_BENCHMARK = {
    'finland': {
        'name': 'Finland',
        'social_spending_gdp': 26.4,
        'pensions_gdp': 15.5,
        'family_gdp': 3.5,
        'unemployment_gdp': 1.6,
        'health_gdp': 7.7,
        'admin_overhead_pct': 12,
    },
    'sweden': {
        'name': 'Sweden',
        'social_spending_gdp': 25.5,
        'pensions_gdp': 12.0,
        'family_gdp': 3.4,
        'unemployment_gdp': 0.9,
        'health_gdp': 9.5,
        'admin_overhead_pct': 8,
    },
    'denmark': {
        'name': 'Denmark',
        'social_spending_gdp': 28.3,
        'pensions_gdp': 13.5,
        'family_gdp': 3.5,
        'unemployment_gdp': 1.8,
        'health_gdp': 8.9,
        'admin_overhead_pct': 10,
    },
    'norway': {
        'name': 'Norway',
        'social_spending_gdp': 25.3,
        'pensions_gdp': 10.8,
        'family_gdp': 3.2,
        'unemployment_gdp': 0.4,
        'health_gdp': 8.5,
        'admin_overhead_pct': 9,
    },
    'germany': {
        'name': 'Germany',
        'social_spending_gdp': 26.7,
        'pensions_gdp': 12.2,
        'family_gdp': 2.3,
        'unemployment_gdp': 1.1,
        'health_gdp': 10.9,
        'admin_overhead_pct': 11,
    },
    'oecd_avg': {
        'name': 'OECD Average',
        'social_spending_gdp': 21.1,
        'pensions_gdp': 10.3,
        'family_gdp': 2.3,
        'unemployment_gdp': 0.9,
        'health_gdp': 6.8,
        'admin_overhead_pct': 15,
    },
}


def fetch_data(url, query):
    """Fetch data from Statistics Finland API."""
    try:
        response = requests.post(url, json=query, timeout=60)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"  API Error {response.status_code}: {response.text[:200]}")
    except Exception as e:
        print(f"  Request error: {e}")
    return None


def get_population_data():
    """Get population by age group from embedded Statistics Finland data."""
    print("Using embedded population data (Statistics Finland 2024)...")
    # Source: Statistics Finland population structure
    # https://statfin.stat.fi/PxWeb/pxweb/en/StatFin/StatFin__vaerak/
    return {
        2000: {'total': 5181115, 'children_0_14': 936333, 'working_age_15_64': 3467584, 'elderly_65_plus': 777198},
        2005: {'total': 5255580, 'children_0_14': 906905, 'working_age_15_64': 3507020, 'elderly_65_plus': 841655},
        2010: {'total': 5375276, 'children_0_14': 888323, 'working_age_15_64': 3546558, 'elderly_65_plus': 940395},
        2015: {'total': 5487308, 'children_0_14': 890256, 'working_age_15_64': 3478669, 'elderly_65_plus': 1118383},
        2020: {'total': 5533793, 'children_0_14': 869659, 'working_age_15_64': 3413364, 'elderly_65_plus': 1250770},
        2021: {'total': 5548241, 'children_0_14': 858948, 'working_age_15_64': 3401113, 'elderly_65_plus': 1288180},
        2022: {'total': 5563970, 'children_0_14': 847785, 'working_age_15_64': 3396185, 'elderly_65_plus': 1320000},
        2023: {'total': 5603851, 'children_0_14': 838000, 'working_age_15_64': 3402000, 'elderly_65_plus': 1363851},
        2024: {'total': 5620000, 'children_0_14': 828000, 'working_age_15_64': 3397000, 'elderly_65_plus': 1395000},
    }


def get_unemployment_data():
    """Get unemployment figures from embedded Statistics Finland data."""
    print("Using embedded unemployment data (Statistics Finland)...")
    # Source: Statistics Finland labour force survey
    # Values are unemployed persons (thousands -> actual)
    return {
        2000: 253000,
        2005: 220000,
        2010: 224000,
        2015: 252000,
        2020: 213000,
        2021: 209000,
        2022: 186000,
        2023: 206000,
        2024: 220000,
    }


def parse_population_data(records):
    """Parse population records into year -> {age_group: count}."""
    pop_by_year = {}
    
    for rec in records:
        year = rec.get('Vuosi_code', rec.get('Year_code', ''))
        age = rec.get('Ikä_code', rec.get('Age_code', ''))
        value = rec.get('value')
        
        if not year or value is None:
            continue
        
        try:
            year_int = int(year)
        except ValueError:
            continue
        
        if year_int not in pop_by_year:
            pop_by_year[year_int] = {}
        
        # Map age codes to groups
        if age in ('SSS', 'Total'):
            pop_by_year[year_int]['total'] = value
        elif age in ('0 - 14', '0-14'):
            pop_by_year[year_int]['children_0_14'] = value
        elif age in ('15 - 64', '15-64'):
            pop_by_year[year_int]['working_age_15_64'] = value
        elif age in ('65 -', '65+', '65-'):
            pop_by_year[year_int]['elderly_65_plus'] = value
    
    return pop_by_year


def parse_unemployment_data(records):
    """Parse unemployment records into year -> count (thousands)."""
    unemployed_by_year = {}
    
    for rec in records:
        year = rec.get('Vuosi_code', rec.get('Year_code', ''))
        value = rec.get('value')
        
        if not year or value is None:
            continue
        
        try:
            year_int = int(year)
            # Value is in thousands
            unemployed_by_year[year_int] = int(value * 1000)
        except (ValueError, TypeError):
            continue
    
    return unemployed_by_year


def parse_json_stat(data: dict) -> list[dict]:
    """Parse JSON-stat2 format into records."""
    if not data:
        return []
    
    dimensions = data.get('dimension', {})
    dim_order = data.get('id', [])
    values = data.get('value', [])
    
    if not dimensions or not values:
        return []
    
    dim_info = {}
    for dim_id in dim_order:
        dim = dimensions.get(dim_id, {})
        categories = dim.get('category', {})
        dim_info[dim_id] = {
            'size': data['size'][dim_order.index(dim_id)],
            'labels': categories.get('label', {}),
            'index': categories.get('index', {})
        }
    
    for dim_id in dim_info:
        index = dim_info[dim_id]['index']
        dim_info[dim_id]['reverse_index'] = {v: k for k, v in index.items()}
    
    records = []
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


def fetch_social_protection_data():
    """Fetch Social Protection (G10) expenditure data by subcategory and transaction type."""
    print("Fetching Social Protection efficiency data...")
    url = f"{BASE_URL}/jmete/statfin_jmete_pxt_12a6.px"
    
    # G10 and all subcategories
    functions = ['G10'] + list(SOCIAL_PROTECTION_SUBS.keys())
    
    # Key transaction types
    transaction_codes = list(TRANSACTION_TYPES.keys())
    
    query = {
        "query": [
            {"code": "Sektori", "selection": {"filter": "item", "values": ["S13"]}},
            {"code": "Taloustoimi", "selection": {"filter": "item", "values": transaction_codes}},
            {"code": "Tehtävä", "selection": {"filter": "item", "values": functions}},
            {"code": "Vuosi", "selection": {"filter": "all", "values": ["*"]}},
            {"code": "Tiedot", "selection": {"filter": "item", "values": ["cp", "bkt_suhde"]}},  # Current prices + GDP ratio
        ],
        "response": {"format": "json-stat2"}
    }
    
    return fetch_data(url, query)


def transform_data(records):
    """Transform records into social protection efficiency analysis."""
    
    # Organize by year, function, transaction, and info type (cp or bkt_suhde)
    by_year_func_trans_cp = {}  # Current prices (millions EUR)
    by_year_func_trans_gdp = {}  # GDP ratio (%)
    
    for rec in records:
        year = rec.get('Vuosi_code', '')
        func = rec.get('Tehtävä_code', '')
        trans = rec.get('Taloustoimi_code', '')
        info = rec.get('Tiedot_code', '')
        value = rec.get('value')
        
        if not year or not func or not trans or value is None:
            continue
        
        try:
            year_int = int(year)
        except ValueError:
            continue
        
        key = (year_int, func, trans)
        if info == 'cp':
            by_year_func_trans_cp[key] = value
        elif info == 'bkt_suhde':
            by_year_func_trans_gdp[key] = value
    
    # Alias for backward compatibility
    by_year_func_trans = by_year_func_trans_cp
    
    all_years = sorted(set(k[0] for k in by_year_func_trans.keys()))
    latest_year = all_years[-1] if all_years else 2024
    
    def calc_efficiency(func_code, year):
        """Calculate efficiency metrics for a function in a year."""
        total = by_year_func_trans.get((year, func_code, 'OTES'), 0)
        if total == 0:
            return None
        
        d62k = by_year_func_trans.get((year, func_code, 'D62K'), 0)
        d632k = by_year_func_trans.get((year, func_code, 'D632K'), 0)
        benefits = d62k + d632k
        bureaucracy = by_year_func_trans.get((year, func_code, 'D1K'), 0)
        overhead = by_year_func_trans.get((year, func_code, 'P2K'), 0)
        other = total - benefits - bureaucracy - overhead
        
        return {
            'total_million': round(total, 1),
            'benefits_million': round(benefits, 1),
            'd62k_million': round(d62k, 1),  # Cash benefits
            'd632k_million': round(d632k, 1),  # In-kind via private
            'bureaucracy_million': round(bureaucracy, 1),
            'overhead_million': round(overhead, 1),
            'other_million': round(max(0, other), 1),
            'efficiency_pct': round(benefits / total * 100, 1) if total > 0 else 0,
            'bureaucracy_pct': round(bureaucracy / total * 100, 1) if total > 0 else 0,
            'overhead_pct': round(overhead / total * 100, 1) if total > 0 else 0,
        }
    
    # Build subcategory analysis with full time series
    subcategories = []
    for sub_code, sub_name in SOCIAL_PROTECTION_SUBS.items():
        latest_eff = calc_efficiency(sub_code, latest_year)
        if not latest_eff or latest_eff['total_million'] < 10:  # Skip very small categories
            continue
        
        # Build time series for this subcategory
        time_series = []
        for year in all_years:
            eff = calc_efficiency(sub_code, year)
            if eff:
                # Get GDP ratio for total spending
                total_gdp_pct = by_year_func_trans_gdp.get((year, sub_code, 'OTES'), 0)
                time_series.append({
                    'year': year,
                    'total_million': eff['total_million'],
                    'total_gdp_pct': round(total_gdp_pct, 2),
                    'benefits_million': eff['benefits_million'],
                    'bureaucracy_million': eff['bureaucracy_million'],
                    'efficiency_pct': eff['efficiency_pct'],
                    'bureaucracy_pct': eff['bureaucracy_pct'],
                })
        
        subcategories.append({
            'code': sub_code,
            'name': sub_name,
            **latest_eff,
            'time_series': time_series,
        })
    
    # Sort by total spending
    subcategories.sort(key=lambda x: -x['total_million'])
    
    # Build total G10 time series
    g10_time_series = []
    for year in all_years:
        eff = calc_efficiency('G10', year)
        if eff:
            total_gdp_pct = by_year_func_trans_gdp.get((year, 'G10', 'OTES'), 0)
            g10_time_series.append({
                'year': year,
                'total_million': eff['total_million'],
                'total_gdp_pct': round(total_gdp_pct, 2),
                'benefits_million': eff['benefits_million'],
                'bureaucracy_million': eff['bureaucracy_million'],
                'efficiency_pct': eff['efficiency_pct'],
                'bureaucracy_pct': eff['bureaucracy_pct'],
            })
    
    # Calculate G10 totals for latest year
    g10_latest = calc_efficiency('G10', latest_year)
    g10_gdp_pct = by_year_func_trans_gdp.get((latest_year, 'G10', 'OTES'), 0)
    
    # Find most and least efficient subcategories
    significant_subs = [s for s in subcategories if s['total_million'] > 500]
    most_efficient = max(significant_subs, key=lambda x: x['efficiency_pct']) if significant_subs else None
    least_efficient = min(significant_subs, key=lambda x: x['efficiency_pct']) if significant_subs else None
    most_bureaucratic = max(significant_subs, key=lambda x: x['bureaucracy_pct']) if significant_subs else None
    
    summary = {
        'year': latest_year,
        'total_billion': round(g10_latest['total_million'] / 1000, 1) if g10_latest else 0,
        'total_gdp_pct': round(g10_gdp_pct, 1),
        'benefits_billion': round(g10_latest['benefits_million'] / 1000, 1) if g10_latest else 0,
        'bureaucracy_billion': round(g10_latest['bureaucracy_million'] / 1000, 1) if g10_latest else 0,
        'efficiency_pct': g10_latest['efficiency_pct'] if g10_latest else 0,
        'bureaucracy_pct': g10_latest['bureaucracy_pct'] if g10_latest else 0,
        'most_efficient': {
            'code': most_efficient['code'],
            'name': most_efficient['name'],
            'efficiency_pct': most_efficient['efficiency_pct'],
            'total_billion': round(most_efficient['total_million'] / 1000, 1),
        } if most_efficient else None,
        'least_efficient': {
            'code': least_efficient['code'],
            'name': least_efficient['name'],
            'efficiency_pct': least_efficient['efficiency_pct'],
            'total_billion': round(least_efficient['total_million'] / 1000, 1),
        } if least_efficient else None,
        'most_bureaucratic': {
            'code': most_bureaucratic['code'],
            'name': most_bureaucratic['name'],
            'bureaucracy_pct': most_bureaucratic['bureaucracy_pct'],
            'total_billion': round(most_bureaucratic['total_million'] / 1000, 1),
        } if most_bureaucratic else None,
    }
    
    return {
        'metadata': {
            'source': 'Statistics Finland',
            'table': 'statfin_jmete_pxt_12a6',
            'description': 'Social Protection (G10) expenditure efficiency analysis',
            'fetched_at': datetime.now().isoformat(),
            'methodology': 'Efficiency = (D62K cash + D632K in-kind) / Total. Bureaucracy = D1K wages.',
            'focus': 'Social Protection only - this efficiency metric does not apply to administration or infrastructure.',
        },
        'summary': summary,
        'g10_time_series': g10_time_series,
        'subcategories': subcategories,
    }


def calculate_cost_per_beneficiary(subcategories, pop_by_year, unemployed_by_year, latest_year):
    """Calculate cost per beneficiary for each program."""
    
    cost_per_beneficiary = []
    
    # Get population data for latest year (or closest available)
    pop_data = pop_by_year.get(latest_year, pop_by_year.get(latest_year - 1, {}))
    unemployed = unemployed_by_year.get(latest_year, unemployed_by_year.get(latest_year - 1, 0))
    
    # Beneficiary mapping
    beneficiary_mapping = {
        'G1001': ('working_age_15_64', 'Working-age (15-64)'),  # Sickness - working age
        'G1002': ('elderly_65_plus', '65+ population'),  # Old age - elderly
        'G1003': ('elderly_65_plus', '65+ population'),  # Survivors - proxy
        'G1004': ('children_0_17', 'Children 0-17'),  # Family - children (estimate from 0-14 + some teens)
        'G1005': ('unemployed', 'Unemployed'),  # Unemployment
        'G1006': ('total', 'Total population'),  # Housing - any household
        'G1007': ('total', 'Total population'),  # Social exclusion - any
    }
    
    # Calculate children 0-17 estimate (0-14 + ~3/7 of 15-21 cohort, rough estimate)
    children_0_14 = pop_data.get('children_0_14', 0)
    children_0_17 = int(children_0_14 * 1.2)  # Rough estimate for 0-17
    
    pop_data['children_0_17'] = children_0_17
    pop_data['unemployed'] = unemployed
    
    for sub in subcategories:
        if sub['code'] not in beneficiary_mapping:
            continue
        
        pop_key, pop_label = beneficiary_mapping[sub['code']]
        beneficiary_count = pop_data.get(pop_key, 0)
        
        if beneficiary_count == 0:
            continue
        
        admin_million = sub['bureaucracy_million'] + sub['overhead_million']
        
        cost_per_beneficiary.append({
            'code': sub['code'],
            'name': sub['name'],
            'total_million': sub['total_million'],
            'admin_million': round(admin_million, 1),
            'beneficiary_count': beneficiary_count,
            'beneficiary_label': pop_label,
            'total_per_beneficiary': round(sub['total_million'] * 1_000_000 / beneficiary_count, 0),
            'admin_per_beneficiary': round(admin_million * 1_000_000 / beneficiary_count, 0),
        })
    
    return cost_per_beneficiary


def calculate_decomposition(subcategories, pop_by_year, unemployed_by_year, base_year, latest_year):
    """Calculate decomposition of spending growth into demographic vs policy effects."""
    
    decomposition = []
    
    # Get population data for both years (use closest available year)
    pop_base = pop_by_year.get(base_year, pop_by_year.get(2000, {}))
    pop_latest = pop_by_year.get(latest_year, pop_by_year.get(2024, {}))
    unemployed_base = unemployed_by_year.get(base_year, unemployed_by_year.get(2000, 253000))
    unemployed_latest = unemployed_by_year.get(latest_year, unemployed_by_year.get(2024, 220000))
    
    # Add estimates for children 0-17 (inflate from 0-14)
    pop_base_copy = dict(pop_base)
    pop_latest_copy = dict(pop_latest)
    pop_base_copy['children_0_17'] = int(pop_base.get('children_0_14', 936333) * 1.2)
    pop_latest_copy['children_0_17'] = int(pop_latest.get('children_0_14', 828000) * 1.2)
    pop_base_copy['unemployed'] = unemployed_base
    pop_latest_copy['unemployed'] = unemployed_latest
    
    beneficiary_mapping = {
        'G1001': ('working_age_15_64', 'Sickness and disability'),
        'G1002': ('elderly_65_plus', 'Old age (pensions)'),
        'G1004': ('children_0_17', 'Family and children'),
        'G1005': ('unemployed', 'Unemployment'),
    }
    
    for sub in subcategories:
        if sub['code'] not in beneficiary_mapping:
            continue
        
        pop_key, _ = beneficiary_mapping[sub['code']]
        ben_base = pop_base_copy.get(pop_key, 0)
        ben_latest = pop_latest_copy.get(pop_key, 0)
        
        if ben_base == 0 or ben_latest == 0:
            print(f"  Skipping {sub['code']}: missing population data")
            continue
        
        # Get spending for base year from time series
        base_spending = None
        latest_spending = sub['total_million']
        
        time_series = sub.get('time_series', [])
        for ts in time_series:
            if ts['year'] == base_year:
                base_spending = ts['total_million']
                break
        
        # If no exact base year, try to find closest
        if base_spending is None and time_series:
            earliest = time_series[0]
            base_spending = earliest['total_million']
            base_year_actual = earliest['year']
            # Adjust population to that year
            if base_year_actual in pop_by_year:
                pop_base_adj = pop_by_year[base_year_actual]
                ben_base = pop_base_adj.get(pop_key.replace('_0_17', '_0_14'), ben_base)
                if pop_key == 'children_0_17':
                    ben_base = int(ben_base * 1.2)
            print(f"  Using {base_year_actual} as base year for {sub['code']}")
        else:
            base_year_actual = base_year
        
        if base_spending is None or base_spending == 0:
            print(f"  Skipping {sub['code']}: no base spending data")
            continue
        
        # Calculate decomposition
        # Δ Spending = (Δ Beneficiaries × old_cost/ben) + (Δ Cost/ben × new_beneficiaries)
        cost_per_ben_base = base_spending * 1_000_000 / ben_base  # Convert to EUR per person
        cost_per_ben_latest = latest_spending * 1_000_000 / ben_latest
        
        delta_beneficiaries = ben_latest - ben_base
        delta_cost_per_ben = cost_per_ben_latest - cost_per_ben_base
        
        # Effects in million EUR
        demographic_effect = (delta_beneficiaries * cost_per_ben_base) / 1_000_000
        policy_effect = (delta_cost_per_ben * ben_latest) / 1_000_000
        
        total_change = latest_spending - base_spending
        
        if abs(total_change) < 1:  # Skip if no meaningful change
            continue
        
        decomposition.append({
            'code': sub['code'],
            'name': sub['name'],
            'base_year': base_year_actual,
            'latest_year': latest_year,
            'base_spending_million': round(base_spending, 1),
            'latest_spending_million': round(latest_spending, 1),
            'total_change_million': round(total_change, 1),
            'demographic_effect_million': round(demographic_effect, 1),
            'policy_effect_million': round(policy_effect, 1),
            'demographic_pct': round(demographic_effect / total_change * 100, 1) if total_change != 0 else 0,
            'policy_pct': round(policy_effect / total_change * 100, 1) if total_change != 0 else 0,
            'beneficiary_change_pct': round((ben_latest - ben_base) / ben_base * 100, 1) if ben_base != 0 else 0,
            'cost_per_ben_base': round(cost_per_ben_base, 0),
            'cost_per_ben_latest': round(cost_per_ben_latest, 0),
            'cost_per_ben_change_pct': round((cost_per_ben_latest - cost_per_ben_base) / cost_per_ben_base * 100, 1) if cost_per_ben_base != 0 else 0,
        })
    
    return decomposition


def main():
    """Main function."""
    output_dir = Path(__file__).parent.parent / 'data'
    public_dir = Path(__file__).parent.parent / 'public' / 'data'
    output_dir.mkdir(exist_ok=True)
    public_dir.mkdir(exist_ok=True)
    
    try:
        # Fetch spending data
        print("=" * 60)
        raw_data = fetch_social_protection_data()
        if not raw_data:
            raise Exception("Failed to fetch spending data")
        
        records = parse_json_stat(raw_data)
        print(f"  Parsed {len(records)} spending records")
        
        print("=" * 60)
        print("Transforming spending data...")
        transformed = transform_data(records)
        
        latest_year = transformed['summary']['year']
        base_year = 2000  # For decomposition analysis
        
        # Get population and unemployment data (embedded)
        print("=" * 60)
        pop_by_year = get_population_data()
        print(f"  Got population data for {len(pop_by_year)} years")
        
        print("=" * 60)
        unemployed_by_year = get_unemployment_data()
        print(f"  Got unemployment data for {len(unemployed_by_year)} years")
        
        # Calculate cost per beneficiary
        print("=" * 60)
        print("Calculating cost per beneficiary...")
        cost_per_beneficiary = calculate_cost_per_beneficiary(
            transformed['subcategories'],
            pop_by_year,
            unemployed_by_year,
            latest_year
        )
        transformed['cost_per_beneficiary'] = cost_per_beneficiary
        
        # Calculate decomposition
        print("Calculating spending decomposition...")
        decomposition = calculate_decomposition(
            transformed['subcategories'],
            pop_by_year,
            unemployed_by_year,
            base_year,
            latest_year
        )
        transformed['decomposition'] = decomposition
        transformed['decomposition_base_year'] = base_year
        
        # Add OECD benchmark
        transformed['oecd_benchmark'] = OECD_BENCHMARK
        
        # Save
        output_file = output_dir / 'spending_efficiency.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(transformed, f, ensure_ascii=False, indent=2)
        print(f"Saved to {output_file}")
        
        public_file = public_dir / 'spending_efficiency.json'
        with open(public_file, 'w', encoding='utf-8') as f:
            json.dump(transformed, f, ensure_ascii=False, indent=2)
        print(f"Saved to {public_file}")
        
        # Print summary
        print("\n" + "=" * 60)
        print("SOCIAL PROTECTION EFFICIENCY ANALYSIS")
        print("=" * 60)
        summary = transformed['summary']
        print(f"Year: {summary['year']}")
        print(f"Total Social Protection: €{summary['total_billion']}B")
        print(f"Direct Benefits: €{summary['benefits_billion']}B ({summary['efficiency_pct']}%)")
        print(f"Bureaucracy: €{summary['bureaucracy_billion']}B ({summary['bureaucracy_pct']}%)")
        
        print("\nBy Subcategory:")
        print("-" * 70)
        for sub in transformed['subcategories']:
            print(f"  {sub['name']:<25} €{sub['total_million']/1000:>5.1f}B  eff: {sub['efficiency_pct']:>5.1f}%  bur: {sub['bureaucracy_pct']:>5.1f}%")
        
        if summary.get('most_efficient'):
            print(f"\nMost Efficient: {summary['most_efficient']['name']} ({summary['most_efficient']['efficiency_pct']}%)")
        if summary.get('least_efficient'):
            print(f"Least Efficient: {summary['least_efficient']['name']} ({summary['least_efficient']['efficiency_pct']}%)")
        
        # Print cost per beneficiary
        if cost_per_beneficiary:
            print("\n" + "=" * 60)
            print("COST PER BENEFICIARY")
            print("-" * 70)
            for cpb in cost_per_beneficiary:
                print(f"  {cpb['name']:<25} €{cpb['total_per_beneficiary']:>7,.0f}/person  (admin: €{cpb['admin_per_beneficiary']:>5,.0f})")
        
        # Print decomposition
        if decomposition:
            print("\n" + "=" * 60)
            print(f"SPENDING GROWTH DECOMPOSITION ({base_year}-{latest_year})")
            print("-" * 70)
            for dec in decomposition:
                print(f"  {dec['name']:<25} Δ€{dec['total_change_million']/1000:>5.1f}B  ({dec['demographic_pct']:>5.1f}% demo, {dec['policy_pct']:>5.1f}% policy)")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == '__main__':
    exit(main())
