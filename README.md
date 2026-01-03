# Finland Truth Engine

> Data-driven policy analysis revealing the mathematical reality behind Finnish municipal finances.

## 🎯 Overview

This project visualizes the demographic "Ponzi" dynamics threatening Finnish local governments. By combining population projections with municipal debt data from Statistics Finland, we calculate a "Ponzi Index" that reveals which municipalities face statistical insolvency.

## 📊 The Ponzi Index

```
Ponzi Index = (Debt / Workers₂₀₃₅) × (Dependents₂₀₃₅ / Workers₂₀₃₅)
```

Higher values indicate municipalities where each future worker carries more debt while supporting more dependents.

### Risk Categories
- **Critical** (> 30,000): Severe fiscal challenges
- **High** (20,000 - 30,000): Significant warning signs  
- **Elevated** (10,000 - 20,000): Elevated risk indicators
- **Moderate** (5,000 - 10,000): Moderate stability
- **Low** (< 5,000): Fiscal resilience

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Maps**: React-Leaflet
- **Charts**: Recharts
- **Data Pipeline**: Python scripts
- **Deployment**: Vercel

## 📁 Project Structure

```
truth-engine/
├── scripts/                    # Python data fetching
│   ├── fetch_population.py     # Statistics Finland population API
│   ├── fetch_municipal_debt.py # Municipal key figures API
│   └── transform_data.py       # Calculate Ponzi Index
├── data/                       # Cached JSON data
│   ├── population_projection.json
│   ├── municipal_debt.json
│   └── ponzi_index.json
├── public/
│   └── finland_municipalities.geojson
├── src/
│   ├── app/                    # Next.js pages
│   ├── components/             # React components
│   └── lib/                    # Utilities & types
└── package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+

### Installation

```bash
# Clone and install
cd truth-engine
npm install

# Setup Python environment
python -m venv venv
source venv/bin/activate
pip install -r scripts/requirements.txt
```

### Fetch Fresh Data

```bash
# Activate Python environment
source venv/bin/activate

# Fetch population projections
python scripts/fetch_population.py

# Fetch municipal debt data
python scripts/fetch_municipal_debt.py

# Calculate Ponzi Index
python scripts/transform_data.py
```

### Run Development Server

```bash
npm run dev
```

## 📡 Data Sources

| Data | Source | Table |
|------|--------|-------|
| Population Projections | Statistics Finland | 14wx |
| Municipal Debt | Statistics Finland | Municipal Key Figures 2020 |
| Geographic Boundaries | Statistics Finland GeoServer | kunta4500k_2024 |

## 🔮 Future Projects

- **Project Alpha**: Wage Trap Calculator - Calculate true hourly value after benefits clawback
- **Project Gamma**: Hidden Inflation - "Maslow CPI" tracking survival essentials vs official CPI

## 📜 License

MIT - Use freely, but attribute data to Statistics Finland.
