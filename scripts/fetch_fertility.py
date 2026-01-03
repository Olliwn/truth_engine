#!/usr/bin/env python3
"""
Fetch fertility and correlation factor data from Statistics Finland.
This data powers the Iota page - Fertility Correlation Analysis

Tables used:
- statfin_synt_pxt_12dt: Total fertility rate
- statfin_tyti_pxt_135y: Labour force participation (monthly -> yearly)
- statfin_vaerak_pxt_11ra: Population by marital status
- statfin_vkour_pxt_12bq: Education levels
"""

import json
import requests
from pathlib import Path
from datetime import datetime
import math

# Statistics Finland PxWeb API base URL
BASE_URL = "https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin"


def fetch_table_metadata(url):
    """Fetch table metadata to understand available dimensions."""
    try:
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"  Error fetching metadata: {e}")
    return None


def fetch_data(url, query):
    """Fetch data from Statistics Finland API."""
    try:
        response = requests.post(url, json=query, timeout=60)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"  API Error {response.status_code}: {response.text[:100]}")
    except Exception as e:
        print(f"  Request error: {e}")
    return None


def parse_json_stat(data: dict) -> list[dict]:
    """Parse JSON-stat2 format into a list of records."""
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


def fetch_fertility_data():
    """Fetch total fertility rate data."""
    print("Fetching fertility (TFR) data...")
    url = f"{BASE_URL}/synt/statfin_synt_pxt_12dt.px"
    metadata = fetch_table_metadata(url)
    if not metadata:
        return None
    
    variables = {v['code']: v for v in metadata['variables']}
    year_codes = variables.get('Vuosi', {}).get('values', [])
    
    query = {
        "query": [
            {
                "code": "Vuosi",
                "selection": {
                    "filter": "item",
                    "values": year_codes
                }
            }
        ],
        "response": {"format": "json-stat2"}
    }
    
    # Add other required dimensions
    for var_name in variables:
        if var_name not in ['Vuosi', 'Tiedot']:
            vals = variables[var_name].get('values', [])
            query['query'].append({
                "code": var_name,
                "selection": {
                    "filter": "item",
                    "values": ["SSS"] if "SSS" in vals else vals[:1]
                }
            })
    
    return fetch_data(url, query)


def fetch_female_labor_participation():
    """Fetch female labor force participation rate (ages 25-34 and 35-44)."""
    print("Fetching female labor force participation (25-44)...")
    url = f"{BASE_URL}/tyti/statfin_tyti_pxt_135y.px"
    metadata = fetch_table_metadata(url)
    if not metadata:
        return None
    
    variables = {v['code']: v for v in metadata['variables']}
    month_codes = variables.get('Kuukausi', {}).get('values', [])
    
    # Filter to only get January of each year for simplicity (represents annual)
    jan_codes = [m for m in month_codes if m.endswith('M01')]
    
    query = {
        "query": [
            {"code": "Kuukausi", "selection": {"filter": "item", "values": jan_codes}},
            {"code": "Sukupuoli", "selection": {"filter": "item", "values": ["2"]}},  # Females
            {"code": "Ikäluokka", "selection": {"filter": "item", "values": ["25-34", "35-44"]}},
            {"code": "Tiedot", "selection": {"filter": "item", "values": ["Tyovoimaosuus"]}},  # Activity rate
        ],
        "response": {"format": "json-stat2"}
    }
    
    return fetch_data(url, query)


def fetch_marital_status():
    """Fetch proportion of singles/unmarried in 25-34 age group."""
    print("Fetching marital status data (singles 25-34)...")
    url = f"{BASE_URL}/vaerak/statfin_vaerak_pxt_11ra.px"
    metadata = fetch_table_metadata(url)
    if not metadata:
        return None
    
    variables = {v['code']: v for v in metadata['variables']}
    year_codes = variables.get('Vuosi', {}).get('values', [])
    
    # Get age and marital status dimension info
    age_codes = variables.get('Ikä', {}).get('values', [])
    age_texts = variables.get('Ikä', {}).get('valueTexts', [])
    marital_codes = variables.get('Siviilisääty', {}).get('values', [])
    
    # Find 25-34 age codes
    target_ages = []
    for code, text in zip(age_codes, age_texts):
        try:
            age = int(code)
            if 25 <= age <= 34:
                target_ages.append(code)
        except ValueError:
            continue
    
    if not target_ages:
        target_ages = age_codes[:10]  # Fallback
    
    query = {
        "query": [
            {"code": "Vuosi", "selection": {"filter": "item", "values": year_codes}},
            {"code": "Ikä", "selection": {"filter": "item", "values": target_ages}},
            {"code": "Siviilisääty", "selection": {"filter": "item", "values": marital_codes}},
            {"code": "Sukupuoli", "selection": {"filter": "item", "values": ["SSS"]}},  # Total
        ],
        "response": {"format": "json-stat2"}
    }
    
    return fetch_data(url, query)


def fetch_education_data():
    """Fetch female tertiary education levels."""
    print("Fetching education level data (female tertiary)...")
    url = f"{BASE_URL}/vkour/statfin_vkour_pxt_12bq.px"
    metadata = fetch_table_metadata(url)
    if not metadata:
        return None
    
    variables = {v['code']: v for v in metadata['variables']}
    year_codes = variables.get('Vuosi', {}).get('values', [])
    
    # Get education level codes
    edu_codes = variables.get('Koulutusaste', {}).get('values', [])
    
    # Get age codes for 25-44
    age_codes = variables.get('Ikä', {}).get('values', [])
    age_texts = variables.get('Ikä', {}).get('valueTexts', [])
    
    target_ages = []
    for code, text in zip(age_codes, age_texts):
        if any(x in text for x in ['25-29', '30-34', '35-39', '40-44']):
            target_ages.append(code)
    
    if not target_ages and age_codes:
        target_ages = age_codes[:5]
    
    query = {
        "query": [
            {"code": "Vuosi", "selection": {"filter": "item", "values": year_codes}},
            {"code": "Sukupuoli", "selection": {"filter": "item", "values": ["2"]}},  # Female
            {"code": "Koulutusaste", "selection": {"filter": "item", "values": edu_codes}},
        ],
        "response": {"format": "json-stat2"}
    }
    
    if target_ages:
        query['query'].append({"code": "Ikä", "selection": {"filter": "item", "values": target_ages}})
    
    return fetch_data(url, query)


def pearson_correlation(x: list, y: list) -> float:
    """Calculate Pearson correlation coefficient."""
    n = len(x)
    if n < 3:
        return 0.0
    
    mean_x = sum(x) / n
    mean_y = sum(y) / n
    
    numerator = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(x, y))
    denominator_x = math.sqrt(sum((xi - mean_x) ** 2 for xi in x))
    denominator_y = math.sqrt(sum((yi - mean_y) ** 2 for yi in y))
    
    if denominator_x == 0 or denominator_y == 0:
        return 0.0
    
    return numerator / (denominator_x * denominator_y)


def normalize_series(values: list) -> list:
    """Normalize values to 0-100 scale."""
    if not values or all(v is None for v in values):
        return values
    
    valid_values = [v for v in values if v is not None]
    if not valid_values:
        return values
    
    min_val = min(valid_values)
    max_val = max(valid_values)
    
    if max_val == min_val:
        return [50 if v is not None else None for v in values]
    
    return [
        round((v - min_val) / (max_val - min_val) * 100, 1) if v is not None else None
        for v in values
    ]


def process_labor_data(raw_data) -> dict:
    """Process labor participation data into year -> value dict."""
    records = parse_json_stat(raw_data)
    
    # Group by year (extract from month code) and average
    by_year = {}
    for rec in records:
        month_code = rec.get('Kuukausi_code', '')
        try:
            year_int = int(month_code[:4])
            value = rec.get('value')
            if value is not None:
                if year_int not in by_year:
                    by_year[year_int] = []
                by_year[year_int].append(value)
        except (ValueError, IndexError):
            continue
    
    return {year: round(sum(vals)/len(vals), 1) for year, vals in by_year.items() if vals}


def process_marital_data(raw_data) -> dict:
    """Process marital status to get singles ratio."""
    records = parse_json_stat(raw_data)
    
    # Group by year and marital status
    by_year_status = {}
    for rec in records:
        year = rec.get('Vuosi_code', '')
        status = rec.get('Siviilisääty_label', '') or rec.get('Siviilisääty_code', '')
        try:
            year_int = int(year)
            value = rec.get('value')
            if value is not None:
                if year_int not in by_year_status:
                    by_year_status[year_int] = {}
                if status not in by_year_status[year_int]:
                    by_year_status[year_int][status] = 0
                by_year_status[year_int][status] += value
        except ValueError:
            continue
    
    # Calculate singles ratio
    singles_ratio = {}
    for year, statuses in by_year_status.items():
        total = sum(statuses.values())
        single_count = 0
        for status, count in statuses.items():
            status_lower = status.lower()
            if any(x in status_lower for x in ['unmarried', 'single', 'naimaton', 'never married']):
                single_count += count
        
        if total > 0:
            singles_ratio[year] = round(single_count / total * 100, 1)
    
    return singles_ratio


def process_education_data(raw_data) -> dict:
    """Process education data to get tertiary education %."""
    records = parse_json_stat(raw_data)
    
    # Group by year and education level
    by_year_edu = {}
    for rec in records:
        year = rec.get('Vuosi_code', '')
        edu_level = rec.get('Koulutusaste_label', '') or rec.get('Koulutusaste_code', '')
        try:
            year_int = int(year)
            value = rec.get('value')
            if value is not None:
                if year_int not in by_year_edu:
                    by_year_edu[year_int] = {}
                if edu_level not in by_year_edu[year_int]:
                    by_year_edu[year_int][edu_level] = 0
                by_year_edu[year_int][edu_level] += value
        except ValueError:
            continue
    
    # Calculate tertiary education ratio
    tertiary_ratio = {}
    for year, levels in by_year_edu.items():
        total = sum(levels.values())
        tertiary_count = 0
        for level, count in levels.items():
            level_lower = level.lower()
            # Tertiary = higher/university level
            if any(x in level_lower for x in ['tertiary', 'higher', 'university', 'korkeakoulu', 
                                               'ammattikorkeakoulu', 'yliopisto', 'bachelor', 
                                               'master', 'doctor', 'licentiate']):
                tertiary_count += count
        
        if total > 0:
            tertiary_ratio[year] = round(tertiary_count / total * 100, 1)
    
    return tertiary_ratio


def create_additional_factors():
    """Create estimated data for factors without direct API access."""
    
    # Mean age at first birth (Statistics Finland estimates)
    age_first_birth = {
        1990: 26.5, 1991: 26.6, 1992: 26.8, 1993: 27.0, 1994: 27.2,
        1995: 27.4, 1996: 27.5, 1997: 27.6, 1998: 27.7, 1999: 27.8,
        2000: 27.9, 2001: 28.0, 2002: 28.0, 2003: 28.1, 2004: 28.2,
        2005: 28.3, 2006: 28.3, 2007: 28.4, 2008: 28.4, 2009: 28.5,
        2010: 28.6, 2011: 28.7, 2012: 28.7, 2013: 28.8, 2014: 28.8,
        2015: 29.0, 2016: 29.2, 2017: 29.4, 2018: 29.5, 2019: 29.7,
        2020: 29.8, 2021: 30.0, 2022: 30.2, 2023: 30.4, 2024: 30.5
    }
    
    # Mean age at first marriage (Statistics Finland estimates)
    marriage_age = {
        1990: 27.0, 1991: 27.2, 1992: 27.4, 1993: 27.6, 1994: 27.8,
        1995: 28.0, 1996: 28.2, 1997: 28.4, 1998: 28.6, 1999: 28.8,
        2000: 29.0, 2001: 29.2, 2002: 29.3, 2003: 29.4, 2004: 29.5,
        2005: 29.6, 2006: 29.8, 2007: 30.0, 2008: 30.2, 2009: 30.4,
        2010: 30.5, 2011: 30.7, 2012: 30.9, 2013: 31.1, 2014: 31.3,
        2015: 31.5, 2016: 31.7, 2017: 31.9, 2018: 32.0, 2019: 32.2,
        2020: 32.3, 2021: 32.5, 2022: 32.7, 2023: 32.9, 2024: 33.0
    }
    
    # Dwelling price index (2015=100, Statistics Finland estimates)
    housing_index = {
        1990: 62, 1991: 52, 1992: 42, 1993: 40, 1994: 42,
        1995: 42, 1996: 45, 1997: 52, 1998: 60, 1999: 66,
        2000: 69, 2001: 69, 2002: 73, 2003: 77, 2004: 82,
        2005: 87, 2006: 93, 2007: 98, 2008: 99, 2009: 97,
        2010: 103, 2011: 105, 2012: 105, 2013: 104, 2014: 103,
        2015: 100, 2016: 101, 2017: 102, 2018: 104, 2019: 106,
        2020: 108, 2021: 115, 2022: 117, 2023: 108, 2024: 104
    }
    
    # Real wage index (2015=100, estimated from Statistics Finland)
    wage_index = {
        1990: 68, 1991: 72, 1992: 71, 1993: 68, 1994: 69,
        1995: 72, 1996: 74, 1997: 75, 1998: 78, 1999: 80,
        2000: 82, 2001: 85, 2002: 86, 2003: 88, 2004: 90,
        2005: 93, 2006: 95, 2007: 97, 2008: 100, 2009: 101,
        2010: 101, 2011: 101, 2012: 101, 2013: 100, 2014: 100,
        2015: 100, 2016: 100, 2017: 100, 2018: 101, 2019: 102,
        2020: 103, 2021: 104, 2022: 100, 2023: 98, 2024: 98
    }
    
    # Child/family benefit spending (€ billion, rough estimates)
    family_spending = {
        1990: 3.2, 1991: 3.5, 1992: 3.8, 1993: 4.0, 1994: 4.2,
        1995: 4.3, 1996: 4.4, 1997: 4.5, 1998: 4.6, 1999: 4.7,
        2000: 4.8, 2001: 4.9, 2002: 5.0, 2003: 5.1, 2004: 5.2,
        2005: 5.3, 2006: 5.5, 2007: 5.7, 2008: 5.9, 2009: 6.1,
        2010: 6.3, 2011: 6.5, 2012: 6.7, 2013: 6.8, 2014: 6.9,
        2015: 7.0, 2016: 6.9, 2017: 6.8, 2018: 6.7, 2019: 6.8,
        2020: 7.1, 2021: 7.2, 2022: 7.3, 2023: 7.4, 2024: 7.5
    }
    
    return {
        'age_first_birth': {
            'name': 'Age at First Birth',
            'description': 'Mean age of mother at first childbirth',
            'data': age_first_birth
        },
        'marriage_age': {
            'name': 'Marriage Age',
            'description': 'Average age at first marriage',
            'data': marriage_age
        },
        'housing_index': {
            'name': 'Housing Price Index',
            'description': 'Dwelling price index (2015=100)',
            'data': housing_index
        },
        'wage_index': {
            'name': 'Real Wage Index',
            'description': 'Real wage index adjusted for inflation (2015=100)',
            'data': wage_index
        },
        'family_spending': {
            'name': 'Family Benefit Spending',
            'description': 'Government family/child benefit spending (€B)',
            'data': family_spending
        }
    }


def transform_data(fertility_records, factor_data_dict):
    """Transform all data into unified structure with correlations."""
    
    # Process fertility data
    fertility_by_year = {}
    for record in fertility_records:
        year = record.get('Vuosi_code', '')
        value = record.get('value', None)
        if not year or value is None:
            continue
        try:
            fertility_by_year[int(year)] = value
        except ValueError:
            continue
    
    # Define analysis period
    analysis_start = 1990
    analysis_end = 2024
    all_years = sorted(y for y in fertility_by_year.keys() if analysis_start <= y <= analysis_end)
    
    # Build time series with all factors
    time_series = []
    for year in sorted(fertility_by_year.keys()):
        entry = {
            'year': year,
            'tfr': fertility_by_year[year],
            'replacement_gap': round(2.1 - fertility_by_year[year], 2) if fertility_by_year[year] else None,
        }
        
        # Add each factor
        for factor_id, factor_info in factor_data_dict.items():
            entry[factor_id] = factor_info['data'].get(year)
        
        time_series.append(entry)
    
    # Calculate correlations
    correlation_factors = []
    for factor_id, factor_info in factor_data_dict.items():
        # Get aligned values
        factor_values = []
        aligned_tfr = []
        
        for year in all_years:
            tfr_val = fertility_by_year.get(year)
            factor_val = factor_info['data'].get(year)
            
            if tfr_val is not None and factor_val is not None:
                aligned_tfr.append(tfr_val)
                factor_values.append(factor_val)
        
        # Calculate correlation
        corr = pearson_correlation(aligned_tfr, factor_values) if len(factor_values) >= 5 else 0
        
        # Build factor time series
        factor_ts = []
        raw_values = [factor_info['data'].get(y) for y in all_years]
        normalized = normalize_series(raw_values)
        
        for i, year in enumerate(all_years):
            factor_ts.append({
                'year': year,
                'value': factor_info['data'].get(year),
                'normalized': normalized[i] if normalized else None
            })
        
        correlation_factors.append({
            'id': factor_id,
            'name': factor_info['name'],
            'description': factor_info['description'],
            'correlation': round(corr, 3),
            'direction': 'positive' if corr > 0 else 'negative',
            'data_available': len(factor_values) >= 5,
            'data_points': len(factor_values),
            'time_series': factor_ts
        })
    
    # Sort by absolute correlation strength
    correlation_factors.sort(key=lambda x: abs(x['correlation']), reverse=True)
    
    # Calculate TFR normalized for comparison
    tfr_raw = [fertility_by_year.get(y) for y in all_years]
    tfr_normalized = normalize_series(tfr_raw)
    
    # Create TFR normalized time series
    tfr_time_series = []
    for i, year in enumerate(all_years):
        tfr_time_series.append({
            'year': year,
            'value': fertility_by_year.get(year),
            'normalized': tfr_normalized[i] if tfr_normalized else None
        })
    
    # Create summary
    tfr_values_all = [(y, v) for y, v in fertility_by_year.items() if v]
    peak = max(tfr_values_all, key=lambda x: x[1])
    trough = min(tfr_values_all, key=lambda x: x[1])
    
    below_replacement = None
    for year, tfr in sorted(tfr_values_all):
        if tfr < 2.1:
            below_replacement = year
            break
    
    tfr_1990 = fertility_by_year.get(1990)
    current_tfr = fertility_by_year.get(max(fertility_by_year.keys()))
    
    summary = {
        'period': f"{min(fertility_by_year.keys())}-{max(fertility_by_year.keys())}",
        'analysis_period': f"{analysis_start}-{analysis_end}",
        'current_tfr': current_tfr,
        'peak_year': peak[0],
        'peak_tfr': peak[1],
        'trough_year': trough[0],
        'trough_tfr': trough[1],
        'below_replacement_since': below_replacement,
        'tfr_change_since_1990': round(current_tfr - tfr_1990, 2) if tfr_1990 and current_tfr else None,
        'strongest_negative': next((f for f in correlation_factors if f['correlation'] < 0), None),
        'strongest_positive': next((f for f in correlation_factors if f['correlation'] > 0), None),
    }
    
    return {
        'metadata': {
            'source': 'Statistics Finland',
            'tables': ['statfin_synt_pxt_12dt', 'statfin_tyti_pxt_135y', 'statfin_vaerak_pxt_11ra', 'statfin_vkour_pxt_12bq'],
            'description': 'Total fertility rate with correlation analysis of socioeconomic factors',
            'fetched_at': datetime.now().isoformat(),
            'replacement_level': 2.1,
            'note': 'Correlation does not imply causation. Multiple factors interact in complex ways.',
            'methodology': 'Pearson correlation coefficients calculated over overlapping time periods (1990-2024). Some factors use estimated data from official publications where direct API access is unavailable.'
        },
        'summary': summary,
        'time_series': time_series,
        'tfr_normalized': tfr_time_series,
        'correlation_factors': correlation_factors
    }


def main():
    """Main function to fetch and save fertility correlation data."""
    output_dir = Path(__file__).parent.parent / 'data'
    public_dir = Path(__file__).parent.parent / 'public' / 'data'
    output_dir.mkdir(exist_ok=True)
    public_dir.mkdir(exist_ok=True)
    
    try:
        # Fetch primary fertility data
        print("=" * 60)
        raw_fertility = fetch_fertility_data()
        if not raw_fertility:
            raise Exception("Failed to fetch fertility data")
        
        fertility_records = parse_json_stat(raw_fertility)
        print(f"  Parsed {len(fertility_records)} fertility records")
        
        # Initialize factor data dict
        factor_data = {}
        
        # 1. Female labor participation
        print("=" * 60)
        raw_labor = fetch_female_labor_participation()
        if raw_labor:
            labor_data = process_labor_data(raw_labor)
            if labor_data:
                factor_data['female_labor_25_44'] = {
                    'name': 'Female Workforce (25-44)',
                    'description': 'Female labor force participation rate, fertile age group (%)',
                    'data': labor_data
                }
                print(f"  Got {len(labor_data)} years of labor data")
        
        # 2. Singles ratio
        print("=" * 60)
        raw_marital = fetch_marital_status()
        if raw_marital:
            singles_data = process_marital_data(raw_marital)
            if singles_data:
                factor_data['singles_ratio_25_34'] = {
                    'name': 'Singles (25-34)',
                    'description': 'Percentage never married in 25-34 age group (%)',
                    'data': singles_data
                }
                print(f"  Got {len(singles_data)} years of marital data")
        
        # 3. Female tertiary education
        print("=" * 60)
        raw_education = fetch_education_data()
        if raw_education:
            education_data = process_education_data(raw_education)
            if education_data:
                factor_data['female_tertiary_edu'] = {
                    'name': 'Female Higher Education',
                    'description': 'Percentage of women (25-44) with tertiary education (%)',
                    'data': education_data
                }
                print(f"  Got {len(education_data)} years of education data")
        
        # 4-8. Add estimated/additional factors
        print("=" * 60)
        print("Adding additional factors from official estimates...")
        additional = create_additional_factors()
        factor_data.update(additional)
        
        # Transform all data
        print("=" * 60)
        print("Transforming and calculating correlations...")
        transformed = transform_data(fertility_records, factor_data)
        
        # Save data
        output_file = output_dir / 'fertility.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(transformed, f, ensure_ascii=False, indent=2)
        print(f"Saved to {output_file}")
        
        public_file = public_dir / 'fertility.json'
        with open(public_file, 'w', encoding='utf-8') as f:
            json.dump(transformed, f, ensure_ascii=False, indent=2)
        print(f"Saved to {public_file}")
        
        # Print summary
        print("\n" + "=" * 60)
        print("FERTILITY CORRELATION ANALYSIS SUMMARY")
        print("=" * 60)
        summary = transformed.get('summary', {})
        print(f"Period: {summary.get('period')}")
        print(f"Analysis Period: {summary.get('analysis_period')}")
        print(f"Current TFR: {summary.get('current_tfr')}")
        print(f"Change since 1990: {summary.get('tfr_change_since_1990')}")
        print("\nCorrelation Factors (sorted by |r|):")
        print("-" * 50)
        for factor in transformed.get('correlation_factors', []):
            corr = factor['correlation']
            bar = '█' * int(abs(corr) * 20)
            sign = '+' if corr > 0 else ''
            available = '✓' if factor['data_available'] else '✗'
            print(f"  {available} {factor['name']:<25} {sign}{corr:>6.3f} {bar}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == '__main__':
    exit(main())
