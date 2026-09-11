# Data Collection Scripts for Chennai Flood Management System

This directory contains automated scripts to collect all required data for the flood management system.

## 📁 Available Scripts

### 1. **01_openweather_realtime.py** - Real-Time Weather Data
- **Data Source**: OpenWeatherMap API
- **Collects**: Current weather + 5-day forecast
- **Requires**: API key (free tier: 1,000 calls/day)
- **Output**: `collected_data/weather/`
- **Format**: JSON + CSV
- **Runtime**: ~2 minutes

**Setup**:
```bash
# Get free API key from: https://openweathermap.org/api
# Set environment variable:
$env:OPENWEATHER_API_KEY="your_key_here"  # PowerShell
```

### 2. **02_osm_drainage_network.py** - Drainage Infrastructure
- **Data Source**: OpenStreetMap (Overpass API)
- **Collects**: Drains, canals, rivers in Chennai
- **Requires**: Nothing (public API)
- **Output**: `collected_data/drainage/`
- **Format**: GeoJSON + CSV
- **Runtime**: ~1-2 minutes

### 3. **03_elevation_high_res.py** - High-Resolution DEM
- **Data Source**: Google Earth Engine (ALOS PALSAR)
- **Collects**: 12.5m resolution elevation data
- **Requires**: Earth Engine authentication
- **Output**: Instructions + CSV when ready
- **Format**: CSV with lat/lon/elevation
- **Runtime**: ~1 minute (setup)

**Setup**:
```bash
# Install Earth Engine
pip install earthengine-api

# Authenticate
earthengine authenticate
```

### 4. **04_historical_floods.py** - Historical Flood Events
- **Data Source**: Compiled from IMD, TNSDMA, news archives
- **Collects**: Documented floods 2005-2023
- **Requires**: Nothing
- **Output**: `collected_data/historical_floods/`
- **Format**: JSON + CSV
- **Runtime**: ~30 seconds

## 🚀 Quick Start

### Option 1: Run All Scripts (Recommended)
```bash
cd data_collection
python run_all_collection.py
# Select 'all' when prompted
```

### Option 2: Run Individual Scripts
```bash
cd data_collection

# Historical floods (no setup needed)
python 04_historical_floods.py

# OSM drainage (no setup needed)
python 02_osm_drainage_network.py

# Weather (needs API key)
python 01_openweather_realtime.py

# Elevation (needs Earth Engine)
python 03_elevation_high_res.py
```

## 📊 Output Structure

```
collected_data/
├── weather/
│   ├── current_weather_YYYYMMDD_HHMMSS.json
│   ├── forecast_YYYYMMDD_HHMMSS.json
│   └── combined_YYYYMMDD_HHMMSS.csv
├── drainage/
│   ├── chennai_drainage_YYYYMMDD_HHMMSS.geojson
│   └── chennai_drainage_YYYYMMDD_HHMMSS.csv
├── elevation/
│   └── chennai_elevation_highres_YYYYMMDD_HHMMSS.csv
└── historical_floods/
    ├── chennai_floods_YYYYMMDD_HHMMSS.json
    ├── chennai_floods_YYYYMMDD_HHMMSS.csv
    ├── affected_areas_YYYYMMDD_HHMMSS.csv
    └── validation_dataset_YYYYMMDD_HHMMSS.csv
```

## 🔑 API Keys & Authentication

### OpenWeatherMap (Script 1)
1. Sign up: https://openweathermap.org/api
2. Get free API key (1,000 calls/day)
3. Set environment variable:
   ```bash
   # PowerShell
   $env:OPENWEATHER_API_KEY="your_key_here"
   
   # OR create .env file
   OPENWEATHER_API_KEY=your_key_here
   ```

### Google Earth Engine (Script 3)
1. Sign up: https://earthengine.google.com/
2. Install: `pip install earthengine-api`
3. Authenticate: `earthengine authenticate`
4. Run script (it will generate instructions)

## ✅ What You Get

### Historical Floods (Script 4)
- ✅ 6 major flood events (2005-2023)
- ✅ Casualties, affected population, damage costs
- ✅ Rainfall amounts, water depths
- ✅ 40+ affected areas mapped
- ✅ Validation dataset for ML model testing

### OSM Drainage (Script 2)
- ✅ All drainage channels in Chennai
- ✅ Canals and rivers
- ✅ Geographic coordinates (lat/lon)
- ✅ Names and metadata
- ✅ GeoJSON for direct map integration

### Weather Data (Script 1)
- ✅ Current temperature, humidity, pressure
- ✅ Rainfall intensity
- ✅ 5-day forecast (3-hour intervals)
- ✅ Wind speed/direction
- ✅ Cloud coverage

### Elevation (Script 3)
- ✅ 12.5m resolution (better than SRTM 90m)
- ✅ Slope and aspect calculations
- ✅ 50,000+ data points for Chennai
- ✅ Ready for hydraulic modeling

## 🔄 Scheduling Automation

To run data collection automatically:

### Windows Task Scheduler
```bash
# Run weather collection every hour
schtasks /create /tn "Chennai Weather Collection" /tr "python E:\Flood-Management-System-for-Chennai\data_collection\01_openweather_realtime.py" /sc hourly
```

### Python Scheduler (Alternative)
```python
# Create scheduler.py
import schedule
import time
import subprocess

def collect_weather():
    subprocess.run(['python', '01_openweather_realtime.py'])

schedule.every().hour.do(collect_weather)

while True:
    schedule.run_pending()
    time.sleep(60)
```

## 📝 Integration with Backend

After collecting data, integrate into your Flask backend:

```python
# backend/app.py
import json
import glob
import pandas as pd

@app.route('/api/weather/current')
def get_current_weather():
    """Get latest weather data"""
    weather_files = glob.glob('collected_data/weather/current_weather_*.json')
    if weather_files:
        latest = max(weather_files)
        with open(latest) as f:
            return jsonify(json.load(f))
    return jsonify({'error': 'No weather data'}), 404

@app.route('/api/floods/historical')
def get_historical_floods():
    """Get historical flood events"""
    flood_files = glob.glob('collected_data/historical_floods/chennai_floods_*.json')
    if flood_files:
        latest = max(flood_files)
        with open(latest) as f:
            return jsonify(json.load(f))
    return jsonify({'error': 'No flood data'}), 404
```

## 🐛 Troubleshooting

### "No module named 'requests'"
```bash
pip install -r ../requirements.txt
```

### "OpenWeatherMap API key missing"
Set the environment variable before running:
```bash
$env:OPENWEATHER_API_KEY="your_key_here"
python 01_openweather_realtime.py
```

### "Earth Engine not authenticated"
```bash
earthengine authenticate
# Follow browser authentication flow
```

### "Overpass API timeout"
The OSM script has automatic retry logic. If it fails:
- Wait 1-2 minutes
- Try again (API has rate limits)

## 💡 Next Steps

1. **Run historical floods collection** (no setup needed):
   ```bash
   python 04_historical_floods.py
   ```

2. **Run drainage collection** (no setup needed):
   ```bash
   python 02_osm_drainage_network.py
   ```

3. **Get OpenWeatherMap API key** and run weather collection

4. **Integrate collected data** into backend API endpoints

5. **Update frontend** to display real data instead of mock data

## 📚 Data Sources & Credits

- **OpenWeatherMap**: https://openweathermap.org/
- **OpenStreetMap**: https://www.openstreetmap.org/
- **Google Earth Engine**: https://earthengine.google.com/
- **IMD Chennai**: India Meteorological Department
- **TNSDMA**: Tamil Nadu State Disaster Management Authority
- **Historical Records**: The Hindu, Wikipedia, Government Reports

## 🤝 Contributing

To add more data sources:

1. Create new script: `05_your_data_source.py`
2. Follow the same structure as existing scripts
3. Save to `collected_data/your_category/`
4. Add to `run_all_collection.py`
5. Update this README

## 📄 License

Part of Chennai Flood Management System project.
