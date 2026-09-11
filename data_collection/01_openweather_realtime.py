"""
OpenWeatherMap Real-Time Data Collection
Collects current weather and 5-day forecast for Chennai
"""

import requests
import json
import os
from datetime import datetime
import time

# Configuration
API_KEY = os.environ.get('OPENWEATHER_API_KEY', 'YOUR_API_KEY_HERE')
CHENNAI_COORDS = {
    'lat': 13.0827,
    'lon': 80.2707,
    'name': 'Chennai'
}

# Sensor locations across Chennai
SENSOR_LOCATIONS = {
    'adyar': {'lat': 13.0067, 'lon': 80.2575, 'name': 'Adyar'},
    't_nagar': {'lat': 13.0417, 'lon': 80.2341, 'name': 'T Nagar'},
    'velachery': {'lat': 12.9755, 'lon': 80.2207, 'name': 'Velachery'},
    'anna_nagar': {'lat': 13.0857, 'lon': 80.2090, 'name': 'Anna Nagar'},
    'pallavaram': {'lat': 12.9675, 'lon': 80.1491, 'name': 'Pallavaram'},
    'tambaram': {'lat': 12.9229, 'lon': 80.1275, 'name': 'Tambaram'},
    'chromepet': {'lat': 12.9516, 'lon': 80.1462, 'name': 'Chromepet'},
    'porur': {'lat': 13.0370, 'lon': 80.1565, 'name': 'Porur'},
}

BASE_URL = "https://api.openweathermap.org/data/2.5"


def get_current_weather(lat, lon, location_name):
    """Fetch current weather for a location"""
    url = f"{BASE_URL}/weather"
    params = {
        'lat': lat,
        'lon': lon,
        'appid': API_KEY,
        'units': 'metric'
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        return {
            'location': location_name,
            'latitude': lat,
            'longitude': lon,
            'timestamp': datetime.now().isoformat(),
            'temperature_c': data['main']['temp'],
            'feels_like_c': data['main']['feels_like'],
            'humidity_percent': data['main']['humidity'],
            'pressure_hpa': data['main']['pressure'],
            'rainfall_1h_mm': data.get('rain', {}).get('1h', 0),
            'rainfall_3h_mm': data.get('rain', {}).get('3h', 0),
            'wind_speed_ms': data['wind']['speed'],
            'wind_direction_deg': data['wind']['deg'],
            'cloudiness_percent': data['clouds']['all'],
            'weather_main': data['weather'][0]['main'],
            'weather_description': data['weather'][0]['description'],
            'visibility_m': data.get('visibility', 0),
            'sunrise': datetime.fromtimestamp(data['sys']['sunrise']).isoformat(),
            'sunset': datetime.fromtimestamp(data['sys']['sunset']).isoformat(),
        }
    except Exception as e:
        print(f"Error fetching weather for {location_name}: {e}")
        return None


def get_forecast_5day(lat, lon, location_name):
    """Fetch 5-day forecast (3-hour intervals)"""
    url = f"{BASE_URL}/forecast"
    params = {
        'lat': lat,
        'lon': lon,
        'appid': API_KEY,
        'units': 'metric'
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        forecasts = []
        for item in data['list']:
            forecasts.append({
                'location': location_name,
                'timestamp': item['dt_txt'],
                'temperature_c': item['main']['temp'],
                'humidity_percent': item['main']['humidity'],
                'pressure_hpa': item['main']['pressure'],
                'rainfall_3h_mm': item.get('rain', {}).get('3h', 0),
                'wind_speed_ms': item['wind']['speed'],
                'cloudiness_percent': item['clouds']['all'],
                'weather_description': item['weather'][0]['description'],
                'probability_precipitation': item.get('pop', 0) * 100  # Probability of precipitation
            })
        
        return forecasts
    except Exception as e:
        print(f"Error fetching forecast for {location_name}: {e}")
        return []


def collect_all_locations():
    """Collect weather data for all sensor locations"""
    print("=" * 60)
    print("COLLECTING REAL-TIME WEATHER DATA FOR CHENNAI")
    print("=" * 60)
    
    all_current_weather = []
    all_forecasts = []
    
    # Collect for main Chennai location
    print(f"\n📍 Collecting data for {CHENNAI_COORDS['name']}...")
    current = get_current_weather(
        CHENNAI_COORDS['lat'], 
        CHENNAI_COORDS['lon'], 
        CHENNAI_COORDS['name']
    )
    if current:
        all_current_weather.append(current)
        print(f"   ✓ Temperature: {current['temperature_c']}°C")
        print(f"   ✓ Rainfall (1h): {current['rainfall_1h_mm']} mm")
        print(f"   ✓ Humidity: {current['humidity_percent']}%")
    
    forecast = get_forecast_5day(
        CHENNAI_COORDS['lat'], 
        CHENNAI_COORDS['lon'], 
        CHENNAI_COORDS['name']
    )
    if forecast:
        all_forecasts.extend(forecast)
        print(f"   ✓ Forecast points: {len(forecast)}")
    
    time.sleep(1)  # Respect API rate limits
    
    # Collect for all sensor locations
    for sensor_id, coords in SENSOR_LOCATIONS.items():
        print(f"\n📍 Collecting data for {coords['name']}...")
        
        current = get_current_weather(coords['lat'], coords['lon'], coords['name'])
        if current:
            all_current_weather.append(current)
            print(f"   ✓ Temperature: {current['temperature_c']}°C")
            print(f"   ✓ Rainfall (1h): {current['rainfall_1h_mm']} mm")
        
        time.sleep(1)  # Respect API rate limits (60 calls/min on free tier)
    
    return all_current_weather, all_forecasts


def save_data(current_weather, forecasts):
    """Save collected data to JSON and CSV files"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Create output directory
    os.makedirs('collected_data/weather', exist_ok=True)
    
    # Save current weather as JSON
    json_file = f'collected_data/weather/current_weather_{timestamp}.json'
    with open(json_file, 'w') as f:
        json.dump(current_weather, f, indent=2)
    print(f"\n✅ Saved current weather to: {json_file}")
    
    # Save current weather as CSV
    import pandas as pd
    df_current = pd.DataFrame(current_weather)
    csv_file = f'collected_data/weather/current_weather_{timestamp}.csv'
    df_current.to_csv(csv_file, index=False)
    print(f"✅ Saved current weather to: {csv_file}")
    
    # Save forecast as JSON
    forecast_json = f'collected_data/weather/forecast_5day_{timestamp}.json'
    with open(forecast_json, 'w') as f:
        json.dump(forecasts, f, indent=2)
    print(f"✅ Saved forecast to: {forecast_json}")
    
    # Save forecast as CSV
    df_forecast = pd.DataFrame(forecasts)
    forecast_csv = f'collected_data/weather/forecast_5day_{timestamp}.csv'
    df_forecast.to_csv(forecast_csv, index=False)
    print(f"✅ Saved forecast to: {forecast_csv}")
    
    # Save summary
    print(f"\n📊 COLLECTION SUMMARY")
    print(f"   • Current weather locations: {len(current_weather)}")
    print(f"   • Forecast data points: {len(forecasts)}")
    print(f"   • Average temperature: {df_current['temperature_c'].mean():.1f}°C")
    print(f"   • Total rainfall (1h): {df_current['rainfall_1h_mm'].sum():.1f} mm")


if __name__ == '__main__':
    if API_KEY == 'YOUR_API_KEY_HERE':
        print("❌ ERROR: Please set OPENWEATHER_API_KEY environment variable")
        print("   Get free API key from: https://openweathermap.org/api")
        print("   Then set in PowerShell: $env:OPENWEATHER_API_KEY='your_key'")
        exit(1)
    
    print("🌤️  Starting OpenWeatherMap data collection...")
    print(f"⏰ Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    current_weather, forecasts = collect_all_locations()
    
    if current_weather or forecasts:
        save_data(current_weather, forecasts)
        print("\n✅ Data collection complete!")
    else:
        print("\n❌ No data collected. Check API key and internet connection.")
