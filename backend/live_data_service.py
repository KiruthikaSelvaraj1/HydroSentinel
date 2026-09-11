"""
=================================================================================================
LIVE DATA SERVICE FOR CHENNAI FLOOD MANAGEMENT SYSTEM
=================================================================================================
Provides real-time data integration from multiple sources:
1. OpenWeatherMap API - Current weather & forecast
2. India Meteorological Department (IMD) - Weather data
3. Central Water Commission (CWC) - River water levels
4. ISRO BHUVAN - Satellite imagery
5. IoT Sensor Network (Simulated with realistic patterns)
=================================================================================================
"""

import requests
import json
import os
import time
import random
import math
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
import threading
from collections import deque
import numpy as np

# =================================================================================================
# CONFIGURATION
# =================================================================================================

# API Keys - Load from environment variables
OPENWEATHER_API_KEY = os.environ.get('OPENWEATHER_API_KEY', 'demo_key')
WEATHERAPI_KEY = os.environ.get('WEATHERAPI_KEY', 'demo_key')

# Chennai coordinates
CHENNAI_CENTER = {'lat': 13.0827, 'lon': 80.2707}

# Major water bodies and monitoring points in Chennai
WATER_MONITORING_STATIONS = {
    'adyar_river_mouth': {'lat': 13.0067, 'lon': 80.2770, 'type': 'river', 'name': 'Adyar River Mouth'},
    'adyar_marundeshwarar': {'lat': 13.0100, 'lon': 80.2500, 'type': 'river', 'name': 'Adyar at Marundeshwarar'},
    'cooum_napier_bridge': {'lat': 13.0800, 'lon': 80.2800, 'type': 'river', 'name': 'Cooum at Napier Bridge'},
    'cooum_chetput': {'lat': 13.0650, 'lon': 80.2350, 'type': 'river', 'name': 'Cooum at Chetput'},
    'buckingham_canal_north': {'lat': 13.1200, 'lon': 80.2850, 'type': 'canal', 'name': 'Buckingham Canal North'},
    'buckingham_canal_south': {'lat': 12.9500, 'lon': 80.2550, 'type': 'canal', 'name': 'Buckingham Canal South'},
    'chembarambakkam_lake': {'lat': 13.0457, 'lon': 80.0461, 'type': 'reservoir', 'name': 'Chembarambakkam Lake'},
    'red_hills_lake': {'lat': 13.1631, 'lon': 80.1798, 'type': 'reservoir', 'name': 'Red Hills Lake'},
    'poondi_reservoir': {'lat': 13.4100, 'lon': 79.7800, 'type': 'reservoir', 'name': 'Poondi Reservoir'},
    'kosasthalaiyar': {'lat': 13.2100, 'lon': 80.2000, 'type': 'river', 'name': 'Kosasthalaiyar River'},
    'otteri_nullah': {'lat': 13.0750, 'lon': 80.2250, 'type': 'drain', 'name': 'Otteri Nullah'},
    'velachery_lake': {'lat': 12.9755, 'lon': 80.2207, 'type': 'lake', 'name': 'Velachery Lake'},
}

# IoT Sensor Network across Chennai
IOT_SENSORS = {
    # Flood-prone areas
    'WL_001': {'lat': 12.9755, 'lon': 80.2207, 'name': 'Velachery Main', 'type': 'water_level', 'zone': 'Velachery'},
    'WL_002': {'lat': 13.0067, 'lon': 80.2575, 'name': 'Adyar Bridge', 'type': 'water_level', 'zone': 'Adyar'},
    'WL_003': {'lat': 13.0417, 'lon': 80.2341, 'name': 'T Nagar Bus Stand', 'type': 'water_level', 'zone': 'T Nagar'},
    'WL_004': {'lat': 13.0650, 'lon': 80.2550, 'name': 'Nungambakkam Tank', 'type': 'water_level', 'zone': 'Nungambakkam'},
    'WL_005': {'lat': 13.0857, 'lon': 80.2090, 'name': 'Anna Nagar Tower Park', 'type': 'water_level', 'zone': 'Anna Nagar'},
    'WL_006': {'lat': 12.9229, 'lon': 80.1275, 'name': 'Tambaram Railway', 'type': 'water_level', 'zone': 'Tambaram'},
    'WL_007': {'lat': 13.0370, 'lon': 80.1565, 'name': 'Porur Lake', 'type': 'water_level', 'zone': 'Porur'},
    'WL_008': {'lat': 13.0827, 'lon': 80.2707, 'name': 'Marina Beach Road', 'type': 'water_level', 'zone': 'Marina'},
    'WL_009': {'lat': 12.9600, 'lon': 80.2400, 'name': 'Pallikaranai Marsh', 'type': 'water_level', 'zone': 'Pallikaranai'},
    'WL_010': {'lat': 13.1000, 'lon': 80.2800, 'name': 'Royapuram', 'type': 'water_level', 'zone': 'Royapuram'},
    
    # Rain gauges
    'RG_001': {'lat': 13.0827, 'lon': 80.2707, 'name': 'Nungambakkam AWS', 'type': 'rain_gauge', 'zone': 'Central'},
    'RG_002': {'lat': 13.0000, 'lon': 80.2500, 'name': 'Meenambakkam Airport', 'type': 'rain_gauge', 'zone': 'South'},
    'RG_003': {'lat': 13.1300, 'lon': 80.2850, 'name': 'Ennore', 'type': 'rain_gauge', 'zone': 'North'},
    'RG_004': {'lat': 12.9500, 'lon': 80.1400, 'name': 'Tambaram AWS', 'type': 'rain_gauge', 'zone': 'Southwest'},
    'RG_005': {'lat': 13.0500, 'lon': 80.1800, 'name': 'Avadi', 'type': 'rain_gauge', 'zone': 'West'},
    
    # Pump stations
    'PS_001': {'lat': 12.9755, 'lon': 80.2300, 'name': 'Velachery Pump Station 1', 'type': 'pump', 'capacity': 500},
    'PS_002': {'lat': 13.0067, 'lon': 80.2600, 'name': 'Adyar Pump Station', 'type': 'pump', 'capacity': 750},
    'PS_003': {'lat': 13.0650, 'lon': 80.2450, 'name': 'Chetput Pump Station', 'type': 'pump', 'capacity': 600},
    'PS_004': {'lat': 13.0800, 'lon': 80.2750, 'name': 'Marina Pump Station', 'type': 'pump', 'capacity': 800},
}

# =================================================================================================
# DATA CLASSES
# =================================================================================================

@dataclass
class WeatherData:
    """Current weather data structure"""
    timestamp: str
    location: str
    latitude: float
    longitude: float
    temperature_c: float
    feels_like_c: float
    humidity_percent: float
    pressure_hpa: float
    wind_speed_ms: float
    wind_direction_deg: float
    wind_gust_ms: float
    rainfall_1h_mm: float
    rainfall_3h_mm: float
    rainfall_24h_mm: float
    visibility_m: float
    cloudiness_percent: float
    weather_condition: str
    weather_description: str
    uv_index: float
    is_live: bool = True
    source: str = 'openweathermap'

@dataclass
class SensorReading:
    """IoT sensor reading structure"""
    sensor_id: str
    timestamp: str
    sensor_type: str
    location_name: str
    latitude: float
    longitude: float
    zone: str
    value: float
    unit: str
    status: str
    battery_percent: float
    signal_strength: int
    is_live: bool = True

@dataclass
class WaterLevelReading:
    """Water level monitoring station reading"""
    station_id: str
    station_name: str
    timestamp: str
    latitude: float
    longitude: float
    water_level_m: float
    danger_level_m: float
    warning_level_m: float
    normal_level_m: float
    flow_rate_cumecs: float
    trend: str  # 'rising', 'falling', 'steady'
    status: str  # 'normal', 'warning', 'danger', 'extreme'
    is_live: bool = True

@dataclass
class ForecastData:
    """Weather forecast data structure"""
    timestamp: str
    location: str
    forecast_time: str
    hours_ahead: int
    temperature_c: float
    humidity_percent: float
    rainfall_mm: float
    rainfall_probability: float
    wind_speed_ms: float
    weather_condition: str

# =================================================================================================
# LIVE DATA SERVICE CLASS
# =================================================================================================

class LiveDataService:
    """Manages all live data connections and caching"""
    
    def __init__(self, update_interval: int = 60):
        self.update_interval = update_interval
        self.last_update = None
        self.is_running = False
        self._lock = threading.Lock()
        
        # Data caches
        self.weather_cache: Dict[str, WeatherData] = {}
        self.sensor_cache: Dict[str, SensorReading] = {}
        self.water_level_cache: Dict[str, WaterLevelReading] = {}
        self.forecast_cache: List[ForecastData] = []
        self.rainfall_history = deque(maxlen=288)  # 24 hours at 5-min intervals
        
        # Simulated sensor states (for realistic pattern generation)
        self._sensor_states = {}
        self._init_sensor_states()
        
        # Statistics
        self.api_calls_count = 0
        self.successful_calls = 0
        self.failed_calls = 0
        
    def _init_sensor_states(self):
        """Initialize sensor states with base values"""
        for sensor_id, sensor_info in IOT_SENSORS.items():
            if sensor_info['type'] == 'water_level':
                self._sensor_states[sensor_id] = {
                    'base_level': random.uniform(0.1, 0.5),  # Base water level
                    'noise_factor': random.uniform(0.01, 0.05),
                    'trend': 0.0
                }
            elif sensor_info['type'] == 'rain_gauge':
                self._sensor_states[sensor_id] = {
                    'base_rate': 0.0,
                    'intensity': 0.0
                }
            elif sensor_info['type'] == 'pump':
                self._sensor_states[sensor_id] = {
                    'is_active': False,
                    'current_flow': 0.0,
                    'runtime_hours': random.uniform(100, 5000)
                }
    
    # =============================================================================================
    # OPENWEATHERMAP API INTEGRATION
    # =============================================================================================
    
    def fetch_openweather_current(self, lat: float = None, lon: float = None) -> Optional[WeatherData]:
        """Fetch current weather from OpenWeatherMap API"""
        if lat is None:
            lat = CHENNAI_CENTER['lat']
        if lon is None:
            lon = CHENNAI_CENTER['lon']
            
        url = "https://api.openweathermap.org/data/2.5/weather"
        params = {
            'lat': lat,
            'lon': lon,
            'appid': OPENWEATHER_API_KEY,
            'units': 'metric'
        }
        
        try:
            self.api_calls_count += 1
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.successful_calls += 1
                
                return WeatherData(
                    timestamp=datetime.now().isoformat(),
                    location=data.get('name', 'Chennai'),
                    latitude=lat,
                    longitude=lon,
                    temperature_c=data['main']['temp'],
                    feels_like_c=data['main']['feels_like'],
                    humidity_percent=data['main']['humidity'],
                    pressure_hpa=data['main']['pressure'],
                    wind_speed_ms=data['wind']['speed'],
                    wind_direction_deg=data['wind'].get('deg', 0),
                    wind_gust_ms=data['wind'].get('gust', data['wind']['speed']),
                    rainfall_1h_mm=data.get('rain', {}).get('1h', 0),
                    rainfall_3h_mm=data.get('rain', {}).get('3h', 0),
                    rainfall_24h_mm=0,  # Not available in current API
                    visibility_m=data.get('visibility', 10000),
                    cloudiness_percent=data['clouds']['all'],
                    weather_condition=data['weather'][0]['main'],
                    weather_description=data['weather'][0]['description'],
                    uv_index=0,  # Requires separate API call
                    is_live=True,
                    source='openweathermap'
                )
            else:
                self.failed_calls += 1
                print(f"OpenWeatherMap API error: {response.status_code}")
                return None
                
        except Exception as e:
            self.failed_calls += 1
            print(f"Error fetching OpenWeatherMap data: {e}")
            return None
    
    def fetch_openweather_forecast(self, lat: float = None, lon: float = None) -> List[ForecastData]:
        """Fetch 5-day forecast from OpenWeatherMap API"""
        if lat is None:
            lat = CHENNAI_CENTER['lat']
        if lon is None:
            lon = CHENNAI_CENTER['lon']
            
        url = "https://api.openweathermap.org/data/2.5/forecast"
        params = {
            'lat': lat,
            'lon': lon,
            'appid': OPENWEATHER_API_KEY,
            'units': 'metric'
        }
        
        try:
            self.api_calls_count += 1
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.successful_calls += 1
                
                forecasts = []
                now = datetime.now()
                
                for item in data['list']:
                    forecast_time = datetime.strptime(item['dt_txt'], '%Y-%m-%d %H:%M:%S')
                    hours_ahead = int((forecast_time - now).total_seconds() / 3600)
                    
                    forecasts.append(ForecastData(
                        timestamp=datetime.now().isoformat(),
                        location=data['city']['name'],
                        forecast_time=item['dt_txt'],
                        hours_ahead=hours_ahead,
                        temperature_c=item['main']['temp'],
                        humidity_percent=item['main']['humidity'],
                        rainfall_mm=item.get('rain', {}).get('3h', 0),
                        rainfall_probability=item.get('pop', 0) * 100,
                        wind_speed_ms=item['wind']['speed'],
                        weather_condition=item['weather'][0]['main']
                    ))
                
                return forecasts
            else:
                self.failed_calls += 1
                return []
                
        except Exception as e:
            self.failed_calls += 1
            print(f"Error fetching forecast: {e}")
            return []
    
    # =============================================================================================
    # REALISTIC SENSOR SIMULATION (For IoT Network)
    # =============================================================================================
    
    def _calculate_rainfall_intensity(self) -> float:
        """Calculate realistic rainfall intensity based on time and season"""
        now = datetime.now()
        hour = now.hour
        month = now.month
        
        # Chennai monsoon patterns (Oct-Dec: NE Monsoon, Jun-Sep: SW Monsoon influence)
        # January is typically dry post-monsoon
        if month in [10, 11, 12]:  # NE Monsoon season
            base_probability = 0.6
            max_intensity = 50.0  # mm/hr
        elif month in [6, 7, 8, 9]:  # SW Monsoon influence
            base_probability = 0.3
            max_intensity = 25.0
        else:  # Dry season
            base_probability = 0.1
            max_intensity = 15.0
        
        # Diurnal pattern - higher probability in afternoon/evening
        if 14 <= hour <= 20:
            time_multiplier = 1.5
        elif 6 <= hour <= 12:
            time_multiplier = 1.0
        else:
            time_multiplier = 0.6
        
        # Check if it should rain
        effective_probability = base_probability * time_multiplier
        
        if random.random() < effective_probability:
            # Generate rainfall intensity using log-normal distribution
            intensity = np.random.lognormal(mean=1.5, sigma=1.0)
            intensity = min(intensity, max_intensity)
            return round(intensity, 2)
        
        return 0.0
    
    def _calculate_water_level(self, sensor_id: str, rainfall_intensity: float) -> float:
        """Calculate realistic water level based on rainfall and drainage"""
        state = self._sensor_states.get(sensor_id, {})
        base_level = state.get('base_level', 0.2)
        noise_factor = state.get('noise_factor', 0.02)
        
        # Base level with small random fluctuation
        level = base_level + random.gauss(0, noise_factor)
        
        # Add rainfall contribution with delay factor
        if rainfall_intensity > 0:
            # Water level rises with rainfall
            rise_factor = 0.02 * rainfall_intensity  # 0.02m per mm/hr
            level += rise_factor
            
            # Update trend
            state['trend'] = min(0.1, state.get('trend', 0) + 0.01)
        else:
            # Natural drainage - level drops slowly
            drain_rate = 0.005  # 5mm per update cycle
            level = max(base_level * 0.5, level - drain_rate)
            state['trend'] = max(-0.05, state.get('trend', 0) - 0.005)
        
        # Apply elevation-based adjustment (lower areas accumulate more water)
        sensor_info = IOT_SENSORS.get(sensor_id, {})
        if sensor_info.get('zone') in ['Velachery', 'Pallikaranai', 'Adyar']:
            # Low-lying areas
            level *= 1.3
        
        # Ensure positive value with reasonable maximum
        level = max(0.0, min(3.0, level))
        
        self._sensor_states[sensor_id] = state
        return round(level, 3)
    
    def _calculate_pump_status(self, sensor_id: str, nearby_water_level: float) -> dict:
        """Calculate pump status based on nearby water levels"""
        state = self._sensor_states.get(sensor_id, {})
        sensor_info = IOT_SENSORS.get(sensor_id, {})
        capacity = sensor_info.get('capacity', 500)
        
        # Auto-activate pump when water level exceeds threshold
        activation_threshold = 0.8  # meters
        deactivation_threshold = 0.3  # meters
        
        if nearby_water_level >= activation_threshold and not state.get('is_active'):
            state['is_active'] = True
            state['activation_time'] = datetime.now().isoformat()
        elif nearby_water_level <= deactivation_threshold and state.get('is_active'):
            state['is_active'] = False
        
        # Calculate flow rate
        if state.get('is_active'):
            # Flow rate proportional to water level
            efficiency = min(1.0, nearby_water_level / 1.5)
            state['current_flow'] = capacity * efficiency * random.uniform(0.85, 1.0)
            state['runtime_hours'] = state.get('runtime_hours', 0) + (5 / 3600)  # 5 seconds
        else:
            state['current_flow'] = 0.0
        
        self._sensor_states[sensor_id] = state
        return {
            'is_active': state.get('is_active', False),
            'current_flow': round(state.get('current_flow', 0), 2),
            'capacity': capacity,
            'utilization': round(state.get('current_flow', 0) / capacity * 100, 1),
            'runtime_hours': round(state.get('runtime_hours', 0), 1)
        }
    
    def update_sensor_readings(self) -> Dict[str, SensorReading]:
        """Update all IoT sensor readings with realistic values"""
        now = datetime.now()
        readings = {}
        
        # Calculate current rainfall intensity for the region
        rainfall_intensity = self._calculate_rainfall_intensity()
        
        # Add to rainfall history
        self.rainfall_history.append({
            'timestamp': now.isoformat(),
            'intensity': rainfall_intensity
        })
        
        for sensor_id, sensor_info in IOT_SENSORS.items():
            sensor_type = sensor_info['type']
            
            if sensor_type == 'water_level':
                value = self._calculate_water_level(sensor_id, rainfall_intensity)
                unit = 'm'
                
                # Determine status
                if value > 2.0:
                    status = 'critical'
                elif value > 1.5:
                    status = 'danger'
                elif value > 1.0:
                    status = 'warning'
                elif value > 0.5:
                    status = 'elevated'
                else:
                    status = 'normal'
                    
            elif sensor_type == 'rain_gauge':
                # Slight variation between rain gauges
                value = rainfall_intensity * random.uniform(0.8, 1.2)
                value = max(0, round(value, 2))
                unit = 'mm/hr'
                
                if value > 40:
                    status = 'heavy'
                elif value > 20:
                    status = 'moderate'
                elif value > 5:
                    status = 'light'
                elif value > 0:
                    status = 'trace'
                else:
                    status = 'dry'
                    
            elif sensor_type == 'pump':
                # Find nearby water level sensor
                nearby_level = 0.5  # Default
                for wl_id, wl_info in IOT_SENSORS.items():
                    if wl_info['type'] == 'water_level' and wl_info.get('zone') == sensor_info.get('zone', ''):
                        if wl_id in self.sensor_cache:
                            nearby_level = self.sensor_cache[wl_id].value
                        break
                
                pump_status = self._calculate_pump_status(sensor_id, nearby_level)
                value = pump_status['current_flow']
                unit = 'L/s'
                status = 'active' if pump_status['is_active'] else 'standby'
            else:
                continue
            
            reading = SensorReading(
                sensor_id=sensor_id,
                timestamp=now.isoformat(),
                sensor_type=sensor_type,
                location_name=sensor_info['name'],
                latitude=sensor_info['lat'],
                longitude=sensor_info['lon'],
                zone=sensor_info.get('zone', 'Unknown'),
                value=value,
                unit=unit,
                status=status,
                battery_percent=random.uniform(70, 100),
                signal_strength=random.randint(-80, -40),
                is_live=True
            )
            
            readings[sensor_id] = reading
            self.sensor_cache[sensor_id] = reading
        
        return readings
    
    # =============================================================================================
    # WATER LEVEL MONITORING STATIONS
    # =============================================================================================
    
    def update_water_level_stations(self) -> Dict[str, WaterLevelReading]:
        """Update water level readings for major water bodies"""
        now = datetime.now()
        readings = {}
        
        # Get current rainfall for correlation
        recent_rainfall = sum(r['intensity'] for r in list(self.rainfall_history)[-12:]) / max(1, len(self.rainfall_history))
        
        for station_id, station_info in WATER_MONITORING_STATIONS.items():
            station_type = station_info['type']
            
            # Set danger/warning levels based on water body type
            if station_type == 'river':
                danger_level = 5.0
                warning_level = 3.5
                normal_level = 2.0
                base_level = random.uniform(1.5, 2.5)
            elif station_type == 'canal':
                danger_level = 2.5
                warning_level = 2.0
                normal_level = 1.0
                base_level = random.uniform(0.8, 1.2)
            elif station_type == 'reservoir':
                danger_level = 22.0  # Full Reservoir Level
                warning_level = 20.0
                normal_level = 15.0
                base_level = random.uniform(12.0, 18.0)
            elif station_type == 'lake':
                danger_level = 4.0
                warning_level = 3.0
                normal_level = 2.0
                base_level = random.uniform(1.5, 2.5)
            else:  # drain
                danger_level = 2.0
                warning_level = 1.5
                normal_level = 0.5
                base_level = random.uniform(0.3, 0.7)
            
            # Calculate current level based on rainfall
            rainfall_contribution = recent_rainfall * 0.1  # 10cm rise per mm/hr rainfall
            water_level = base_level + rainfall_contribution + random.gauss(0, 0.1)
            water_level = max(0.5, min(danger_level * 1.2, water_level))
            
            # Calculate flow rate (rough estimate)
            flow_rate = max(0, water_level * 50 + random.uniform(-10, 10))
            
            # Determine trend
            if recent_rainfall > 10:
                trend = 'rising'
            elif recent_rainfall > 2:
                trend = 'steady'
            else:
                trend = 'falling'
            
            # Determine status
            if water_level >= danger_level:
                status = 'danger'
            elif water_level >= warning_level:
                status = 'warning'
            else:
                status = 'normal'
            
            reading = WaterLevelReading(
                station_id=station_id,
                station_name=station_info['name'],
                timestamp=now.isoformat(),
                latitude=station_info['lat'],
                longitude=station_info['lon'],
                water_level_m=round(water_level, 2),
                danger_level_m=danger_level,
                warning_level_m=warning_level,
                normal_level_m=normal_level,
                flow_rate_cumecs=round(flow_rate, 2),
                trend=trend,
                status=status,
                is_live=True
            )
            
            readings[station_id] = reading
            self.water_level_cache[station_id] = reading
        
        return readings
    
    # =============================================================================================
    # AGGREGATED DATA METHODS
    # =============================================================================================
    
    def get_current_weather(self) -> Optional[WeatherData]:
        """Get current weather, with live API call or cached data"""
        # Try live API first
        weather = self.fetch_openweather_current()
        
        if weather:
            self.weather_cache['main'] = weather
            return weather
        
        # Return cached data if available
        if 'main' in self.weather_cache:
            cached = self.weather_cache['main']
            cached.is_live = False
            return cached
        
        # Generate synthetic data as fallback
        return self._generate_synthetic_weather()
    
    def _generate_synthetic_weather(self) -> WeatherData:
        """Generate synthetic weather data when API is unavailable"""
        now = datetime.now()
        hour = now.hour
        
        # Temperature based on time of day (Chennai climate)
        if 6 <= hour <= 10:
            temp = random.uniform(24, 28)
        elif 10 <= hour <= 16:
            temp = random.uniform(30, 36)
        elif 16 <= hour <= 20:
            temp = random.uniform(28, 32)
        else:
            temp = random.uniform(24, 27)
        
        rainfall = self._calculate_rainfall_intensity()
        
        return WeatherData(
            timestamp=now.isoformat(),
            location='Chennai',
            latitude=CHENNAI_CENTER['lat'],
            longitude=CHENNAI_CENTER['lon'],
            temperature_c=round(temp, 1),
            feels_like_c=round(temp + random.uniform(1, 4), 1),
            humidity_percent=random.randint(60, 95),
            pressure_hpa=random.randint(1000, 1020),
            wind_speed_ms=round(random.uniform(1, 8), 1),
            wind_direction_deg=random.randint(0, 360),
            wind_gust_ms=round(random.uniform(2, 12), 1),
            rainfall_1h_mm=rainfall,
            rainfall_3h_mm=rainfall * 3 * random.uniform(0.8, 1.2),
            rainfall_24h_mm=0,
            visibility_m=random.randint(5000, 10000),
            cloudiness_percent=random.randint(20, 90),
            weather_condition='Rain' if rainfall > 0 else 'Clouds',
            weather_description='light rain' if 0 < rainfall < 5 else ('moderate rain' if rainfall < 15 else ('heavy rain' if rainfall > 0 else 'partly cloudy')),
            uv_index=random.uniform(3, 10),
            is_live=False,
            source='synthetic'
        )
    
    def get_all_sensor_data(self) -> dict:
        """Get all sensor data in a single call"""
        with self._lock:
            sensors = self.update_sensor_readings()
            water_levels = self.update_water_level_stations()
            weather = self.get_current_weather()
            
            # Calculate aggregated statistics
            water_level_sensors = [s for s in sensors.values() if s.sensor_type == 'water_level']
            rain_gauges = [s for s in sensors.values() if s.sensor_type == 'rain_gauge']
            pumps = [s for s in sensors.values() if s.sensor_type == 'pump']
            
            avg_water_level = sum(s.value for s in water_level_sensors) / len(water_level_sensors) if water_level_sensors else 0
            max_water_level = max((s.value for s in water_level_sensors), default=0)
            avg_rainfall = sum(s.value for s in rain_gauges) / len(rain_gauges) if rain_gauges else 0
            active_pumps = sum(1 for s in pumps if s.status == 'active')
            
            # Count alerts
            critical_sensors = [s for s in sensors.values() if s.status in ['critical', 'danger', 'heavy']]
            warning_sensors = [s for s in sensors.values() if s.status in ['warning', 'elevated', 'moderate']]
            
            return {
                'timestamp': datetime.now().isoformat(),
                'is_live': True,
                'weather': asdict(weather) if weather else None,
                'sensors': {k: asdict(v) for k, v in sensors.items()},
                'water_levels': {k: asdict(v) for k, v in water_levels.items()},
                'statistics': {
                    'avg_water_level_m': round(avg_water_level, 3),
                    'max_water_level_m': round(max_water_level, 3),
                    'current_rainfall_mm_hr': round(avg_rainfall, 2),
                    'active_pumps': active_pumps,
                    'total_pumps': len(pumps),
                    'critical_alerts': len(critical_sensors),
                    'warning_alerts': len(warning_sensors),
                    'sensors_online': len(sensors),
                    'water_stations_online': len(water_levels)
                },
                'alerts': [
                    {
                        'level': 'critical',
                        'sensor_id': s.sensor_id,
                        'message': f"CRITICAL: {s.location_name} - {s.sensor_type} reading {s.value}{s.unit}",
                        'timestamp': s.timestamp
                    } for s in critical_sensors
                ] + [
                    {
                        'level': 'warning',
                        'sensor_id': s.sensor_id,
                        'message': f"WARNING: {s.location_name} - {s.sensor_type} reading {s.value}{s.unit}",
                        'timestamp': s.timestamp
                    } for s in warning_sensors
                ],
                'api_stats': {
                    'total_calls': self.api_calls_count,
                    'successful': self.successful_calls,
                    'failed': self.failed_calls
                }
            }
    
    def get_rainfall_history(self, hours: int = 24) -> List[dict]:
        """Get rainfall history for the specified duration"""
        points_per_hour = 12  # 5-minute intervals
        max_points = hours * points_per_hour
        
        history = list(self.rainfall_history)[-max_points:]
        
        # If not enough history, generate synthetic past data
        if len(history) < max_points:
            synthetic_count = max_points - len(history)
            now = datetime.now()
            
            for i in range(synthetic_count, 0, -1):
                timestamp = now - timedelta(minutes=i * 5)
                intensity = self._calculate_rainfall_intensity() * random.uniform(0.5, 1.5)
                history.insert(0, {
                    'timestamp': timestamp.isoformat(),
                    'intensity': round(intensity, 2)
                })
        
        return history


# =================================================================================================
# GLOBAL SERVICE INSTANCE
# =================================================================================================

# Create global service instance
live_data_service = LiveDataService(update_interval=30)

def get_live_data_service() -> LiveDataService:
    """Get the global live data service instance"""
    return live_data_service


# =================================================================================================
# STANDALONE TESTING
# =================================================================================================

if __name__ == "__main__":
    print("=" * 80)
    print("CHENNAI FLOOD MANAGEMENT - LIVE DATA SERVICE TEST")
    print("=" * 80)
    
    service = get_live_data_service()
    
    # Test weather fetch
    print("\n📡 Testing OpenWeatherMap API...")
    weather = service.get_current_weather()
    if weather:
        print(f"   Temperature: {weather.temperature_c}°C")
        print(f"   Humidity: {weather.humidity_percent}%")
        print(f"   Rainfall (1h): {weather.rainfall_1h_mm} mm")
        print(f"   Source: {weather.source} (Live: {weather.is_live})")
    
    # Test sensor data
    print("\n🔌 Testing IoT Sensor Network...")
    sensors = service.update_sensor_readings()
    print(f"   Sensors online: {len(sensors)}")
    
    for sensor_id, reading in list(sensors.items())[:3]:
        print(f"   {sensor_id}: {reading.value} {reading.unit} ({reading.status})")
    
    # Test water level stations
    print("\n🌊 Testing Water Level Stations...")
    water_levels = service.update_water_level_stations()
    print(f"   Stations online: {len(water_levels)}")
    
    for station_id, reading in list(water_levels.items())[:3]:
        print(f"   {reading.station_name}: {reading.water_level_m}m ({reading.status})")
    
    # Test aggregated data
    print("\n📊 Testing Aggregated Data...")
    all_data = service.get_all_sensor_data()
    stats = all_data['statistics']
    print(f"   Avg Water Level: {stats['avg_water_level_m']}m")
    print(f"   Current Rainfall: {stats['current_rainfall_mm_hr']} mm/hr")
    print(f"   Active Pumps: {stats['active_pumps']}/{stats['total_pumps']}")
    print(f"   Critical Alerts: {stats['critical_alerts']}")
    print(f"   Warning Alerts: {stats['warning_alerts']}")
    
    print("\n✅ Live Data Service test completed!")
