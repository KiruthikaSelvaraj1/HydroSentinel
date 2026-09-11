"""
=================================================================================================
ENHANCED API WITH LIVE DATA INTEGRATION
=================================================================================================
This module provides WebSocket support and enhanced API endpoints with live data connections.
Run this as the main backend server for the prototype demonstration.
=================================================================================================
"""

from flask import Flask, jsonify, request, Response
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import pandas as pd
import numpy as np
import joblib
import json
import os
import sys
from datetime import datetime, timedelta
import threading
import time
import queue

# Add paths
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scripts.hydraulic_simulation import HydraulicSimulator, create_chennai_network
from backend.live_data_service import get_live_data_service, LiveDataService

# =================================================================================================
# FLASK APP INITIALIZATION
# =================================================================================================

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Configuration
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data_collection', 'collected_data')
MODELS_DIR = os.path.join(BASE_DIR, 'models')

# Global instances
live_data_service: LiveDataService = None
simulator: HydraulicSimulator = None
simulator_lock = threading.Lock()

# ML Models
flood_risk_model = None
runoff_model = None
water_level_model = None

# Event queues for real-time updates
update_queue = queue.Queue()

print("=" * 90)
print("🌊 CHENNAI FLOOD MANAGEMENT SYSTEM - ENHANCED BACKEND")
print("=" * 90)
print(f"📁 Base Directory: {BASE_DIR}")
print(f"📁 Data Directory: {DATA_DIR}")
print(f"📁 Models Directory: {MODELS_DIR}")

# =================================================================================================
# INITIALIZATION FUNCTIONS
# =================================================================================================

def load_models():
    """Load all trained ML models"""
    global flood_risk_model, runoff_model, water_level_model
    
    print("\n📦 Loading ML models...")
    
    # Load flood risk model
    flood_risk_path = os.path.join(MODELS_DIR, 'flood_risk_model_enhanced.pkl')
    if os.path.exists(flood_risk_path):
        flood_risk_model = joblib.load(flood_risk_path)
        print(f"   ✅ Loaded flood risk model")
    else:
        print("   ⚠️ Flood risk model not found")
    
    # Load runoff model
    runoff_path = os.path.join(MODELS_DIR, 'runoff_estimation_model.pkl')
    if os.path.exists(runoff_path):
        runoff_model = joblib.load(runoff_path)
        print(f"   ✅ Loaded runoff model")
    else:
        print("   ⚠️ Runoff model not found")
    
    # Load water level model
    water_level_path = os.path.join(MODELS_DIR, 'water_level_prediction_model.pkl')
    if os.path.exists(water_level_path):
        water_level_model = joblib.load(water_level_path)
        print(f"   ✅ Loaded water level model")
    else:
        print("   ⚠️ Water level model not found")

def initialize_services():
    """Initialize all backend services"""
    global live_data_service, simulator
    
    print("\n🔧 Initializing services...")
    
    # Initialize live data service
    live_data_service = get_live_data_service()
    print("   ✅ Live Data Service initialized")
    
    # Initialize hydraulic simulator
    try:
        with simulator_lock:
            simulator = create_chennai_network()
        print("   ✅ Hydraulic Simulator initialized")
    except Exception as e:
        print(f"   ⚠️ Simulator initialization failed: {e}")
    
    # Load ML models
    load_models()

# =================================================================================================
# REAL-TIME UPDATE THREAD
# =================================================================================================

def realtime_update_worker():
    """Background worker for real-time data updates"""
    global live_data_service, simulator
    
    print("\n🔄 Starting real-time update worker...")
    
    update_interval = 5  # seconds
    
    while True:
        try:
            if live_data_service:
                # Get fresh sensor data
                sensor_data = live_data_service.get_all_sensor_data()
                
                # Get rainfall for simulator
                rainfall = sensor_data['statistics'].get('current_rainfall_mm_hr', 0)
                
                # Run simulation step
                if simulator:
                    with simulator_lock:
                        simulator.step(rainfall)
                        
                        # Update sensor data with simulator values
                        for node_id, node in simulator.nodes.items():
                            if node_id not in sensor_data['sensors']:
                                sensor_data['sensors'][node_id] = {}
                            sensor_data['sensors'][node_id].update({
                                'simulator_water_depth': float(node.water_depth),
                                'simulator_water_level': float(node.water_level),
                                'simulator_is_flooding': bool(node.is_flooding)
                            })
                
                # Emit to connected WebSocket clients
                socketio.emit('realtime_update', sensor_data)
                
            time.sleep(update_interval)
            
        except Exception as e:
            print(f"   ⚠️ Real-time update error: {e}")
            time.sleep(update_interval)

# =================================================================================================
# API ENDPOINTS
# =================================================================================================

@app.route('/')
def home():
    """API status and documentation"""
    return jsonify({
        'status': 'online',
        'service': 'Chennai Flood Management System - Enhanced API',
        'version': '2.0.0',
        'timestamp': datetime.now().isoformat(),
        'features': [
            '✅ Live Weather Data (OpenWeatherMap)',
            '✅ Real-time IoT Sensor Network',
            '✅ Water Level Monitoring Stations',
            '✅ Hydraulic Simulation Engine',
            '✅ ML-based Flood Prediction',
            '✅ WebSocket Real-time Updates',
            '✅ Pump & Gate Control',
            '✅ Historical Data Analytics'
        ],
        'endpoints': {
            'live_data': {
                'realtime': 'GET /api/v2/realtime - Get all real-time data',
                'weather': 'GET /api/v2/weather - Current weather with live API',
                'sensors': 'GET /api/v2/sensors - IoT sensor readings',
                'water_levels': 'GET /api/v2/water-levels - Water monitoring stations',
                'rainfall_live': 'GET /api/v2/rainfall/live - Live rainfall data',
            },
            'prediction': {
                'flood_risk': 'POST /api/v2/predict/flood-risk - Predict flood risk',
                'forecast': 'GET /api/v2/forecast - Weather forecast with flood impact',
            },
            'simulation': {
                'run': 'POST /api/v2/simulate - Run hydraulic simulation',
                'scenario': 'POST /api/v2/simulate/scenario - Run scenario analysis',
            },
            'control': {
                'pumps': 'GET/POST /api/v2/pumps - Pump control',
                'gates': 'GET/POST /api/v2/gates - Gate control',
            },
            'analytics': {
                'hotspots': 'GET /api/v2/hotspots - Flood hotspots',
                'statistics': 'GET /api/v2/statistics - System statistics',
                'history': 'GET /api/v2/history - Historical data',
            },
            'websocket': {
                'connect': 'WS /socket.io - Real-time updates',
            }
        }
    })

# -------------------------------------------------------------------------------------------------
# LIVE DATA ENDPOINTS
# -------------------------------------------------------------------------------------------------

@app.route('/api/v2/realtime')
def get_realtime_v2():
    """Get comprehensive real-time data from all sources"""
    try:
        data = live_data_service.get_all_sensor_data()
        
        # Add simulator data
        if simulator:
            with simulator_lock:
                simulator_status = {
                    'nodes': {},
                    'pumps': {},
                    'gates': {},
                    'network_stats': {
                        'total_nodes': len(simulator.nodes),
                        'flooding_nodes': sum(1 for n in simulator.nodes.values() if n.is_flooding),
                        'total_pumps': len(simulator.pumps),
                        'active_pumps': sum(1 for p in simulator.pumps.values() if p.is_active),
                        'total_gates': len(simulator.gates)
                    }
                }
                
                for node_id, node in simulator.nodes.items():
                    simulator_status['nodes'][node_id] = {
                        'water_depth': round(node.water_depth, 3),
                        'water_level': round(node.water_level, 3),
                        'is_flooding': node.is_flooding,
                        'lat': node.lat,
                        'lon': node.lon,
                        'status': 'flooding' if node.is_flooding else (
                            'critical' if node.water_depth > 2.0 else (
                                'warning' if node.water_depth > 1.0 else 'normal'
                            )
                        )
                    }
                
                for pump_id, pump in simulator.pumps.items():
                    simulator_status['pumps'][pump_id] = {
                        'is_active': pump.is_active,
                        'current_flow': round(pump.current_flow, 2),
                        'capacity': pump.capacity,
                        'utilization': round(pump.current_flow / pump.capacity * 100, 1) if pump.capacity > 0 else 0
                    }
                
                for gate_id, gate in simulator.gates.items():
                    simulator_status['gates'][gate_id] = {
                        'opening': round(gate.opening * 100, 1)
                    }
                
                data['simulator'] = simulator_status
        
        return jsonify({
            'success': True,
            'data': data,
            'server_time': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/v2/weather')
def get_weather_v2():
    """Get current weather with live API data"""
    try:
        weather = live_data_service.get_current_weather()
        
        if weather:
            from dataclasses import asdict
            return jsonify({
                'success': True,
                'data': asdict(weather),
                'is_live': weather.is_live,
                'source': weather.source
            })
        else:
            return jsonify({'success': False, 'error': 'Weather data unavailable'}), 503
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/v2/sensors')
def get_sensors_v2():
    """Get all IoT sensor readings"""
    try:
        sensors = live_data_service.update_sensor_readings()
        
        from dataclasses import asdict
        return jsonify({
            'success': True,
            'sensors': {k: asdict(v) for k, v in sensors.items()},
            'count': len(sensors),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/v2/water-levels')
def get_water_levels_v2():
    """Get water level monitoring station data"""
    try:
        water_levels = live_data_service.update_water_level_stations()
        
        from dataclasses import asdict
        return jsonify({
            'success': True,
            'stations': {k: asdict(v) for k, v in water_levels.items()},
            'count': len(water_levels),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/v2/rainfall/live')
def get_rainfall_live_v2():
    """Get live rainfall data with history"""
    try:
        hours = request.args.get('hours', 24, type=int)
        history = live_data_service.get_rainfall_history(hours)
        
        # Calculate statistics
        intensities = [r['intensity'] for r in history]
        
        return jsonify({
            'success': True,
            'current_intensity': intensities[-1] if intensities else 0,
            'average_intensity': round(sum(intensities) / len(intensities), 2) if intensities else 0,
            'max_intensity': max(intensities) if intensities else 0,
            'total_rainfall': round(sum(intensities) * (5/60), 2),  # Convert to mm (5-min intervals)
            'history': history,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/v2/forecast')
def get_forecast_v2():
    """Get weather forecast with flood impact analysis"""
    try:
        forecasts = live_data_service.fetch_openweather_forecast()
        
        from dataclasses import asdict
        
        # Analyze flood risk for each forecast period
        enhanced_forecasts = []
        for f in forecasts:
            forecast_dict = asdict(f)
            
            # Estimate flood risk based on rainfall
            rainfall = f.rainfall_mm
            if rainfall > 50:
                flood_risk = 'critical'
            elif rainfall > 30:
                flood_risk = 'high'
            elif rainfall > 15:
                flood_risk = 'moderate'
            elif rainfall > 5:
                flood_risk = 'low'
            else:
                flood_risk = 'minimal'
            
            forecast_dict['flood_risk'] = flood_risk
            forecast_dict['flood_risk_score'] = min(100, rainfall * 2)
            enhanced_forecasts.append(forecast_dict)
        
        return jsonify({
            'success': True,
            'forecasts': enhanced_forecasts,
            'count': len(enhanced_forecasts),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# -------------------------------------------------------------------------------------------------
# PREDICTION ENDPOINTS
# -------------------------------------------------------------------------------------------------

@app.route('/api/v2/predict/flood-risk', methods=['POST'])
def predict_flood_risk_v2():
    """Predict flood risk for given coordinates"""
    try:
        data = request.get_json()
        lat = data.get('lat')
        lon = data.get('lon')
        elevation = data.get('elevation')
        
        if not all([lat, lon]):
            return jsonify({'error': 'Missing lat/lon parameters'}), 400
        
        # If elevation not provided, estimate from data
        if elevation is None:
            elevation = 5.0  # Default for Chennai coastal areas
        
        # Get current conditions
        sensor_data = live_data_service.get_all_sensor_data()
        current_rainfall = sensor_data['statistics'].get('current_rainfall_mm_hr', 0)
        
        # Calculate risk score based on multiple factors
        risk_score = 0
        
        # Elevation factor (lower = higher risk)
        if elevation < 3:
            risk_score += 40
        elif elevation < 5:
            risk_score += 30
        elif elevation < 8:
            risk_score += 20
        elif elevation < 12:
            risk_score += 10
        
        # Rainfall factor
        risk_score += min(40, current_rainfall * 1.5)
        
        # Location factor (distance from water bodies)
        # Simplified check for coastal/river proximity
        coast_lon = 80.28
        if abs(lon - coast_lon) < 0.02:  # Near coast
            risk_score += 15
        
        # Nearby sensor status
        for sensor in sensor_data['sensors'].values():
            if abs(sensor['latitude'] - lat) < 0.02 and abs(sensor['longitude'] - lon) < 0.02:
                if sensor['status'] in ['critical', 'danger']:
                    risk_score += 20
                elif sensor['status'] == 'warning':
                    risk_score += 10
        
        # Normalize score
        risk_score = min(100, risk_score)
        
        # Determine risk level
        if risk_score >= 80:
            risk_level = 'critical'
        elif risk_score >= 60:
            risk_level = 'high'
        elif risk_score >= 40:
            risk_level = 'medium'
        elif risk_score >= 20:
            risk_level = 'low'
        else:
            risk_level = 'minimal'
        
        return jsonify({
            'success': True,
            'prediction': {
                'lat': lat,
                'lon': lon,
                'elevation': elevation,
                'risk_score': round(risk_score, 1),
                'risk_level': risk_level,
                'is_safe': risk_score < 50,
                'factors': {
                    'elevation_contribution': 'high' if elevation < 5 else 'medium' if elevation < 10 else 'low',
                    'rainfall_contribution': current_rainfall,
                    'current_conditions': sensor_data['statistics']
                },
                'recommendations': get_risk_recommendations(risk_level, current_rainfall)
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

def get_risk_recommendations(risk_level: str, rainfall: float) -> list:
    """Get recommendations based on risk level"""
    recommendations = []
    
    if risk_level == 'critical':
        recommendations = [
            "🚨 EVACUATE immediately to higher ground",
            "⚠️ Avoid all low-lying areas and underpasses",
            "📱 Keep emergency contacts ready",
            "🚗 Do not attempt to drive through flooded areas",
            "📻 Stay tuned to emergency broadcasts"
        ]
    elif risk_level == 'high':
        recommendations = [
            "⚠️ Prepare for possible evacuation",
            "💼 Keep emergency kit ready",
            "🔌 Secure electrical appliances",
            "📱 Stay updated on weather alerts",
            "🚗 Avoid unnecessary travel"
        ]
    elif risk_level == 'medium':
        recommendations = [
            "📱 Monitor weather updates regularly",
            "🏠 Clear drainage around property",
            "💡 Keep flashlights and batteries ready",
            "📋 Review emergency plan"
        ]
    elif risk_level == 'low':
        recommendations = [
            "📱 Stay informed about weather conditions",
            "🏠 Ensure proper drainage"
        ]
    else:
        recommendations = [
            "✅ Conditions are currently safe",
            "📱 Continue monitoring weather updates"
        ]
    
    if rainfall > 20:
        recommendations.insert(0, f"🌧️ Heavy rainfall detected: {rainfall:.1f} mm/hr")
    
    return recommendations

# -------------------------------------------------------------------------------------------------
# SIMULATION ENDPOINTS
# -------------------------------------------------------------------------------------------------

@app.route('/api/v2/simulate', methods=['POST'])
def run_simulation_v2():
    """Run hydraulic simulation with custom parameters"""
    try:
        data = request.get_json() or {}
        hours = data.get('hours', 6)
        rainfall_forecast = data.get('rainfall_forecast', None)
        
        if not simulator:
            return jsonify({'error': 'Simulator not initialized'}), 500
        
        # If no forecast provided, generate based on current conditions
        if rainfall_forecast is None:
            current_data = live_data_service.get_all_sensor_data()
            current_rainfall = current_data['statistics'].get('current_rainfall_mm_hr', 5)
            
            # Generate realistic forecast pattern
            rainfall_forecast = []
            for h in range(hours):
                # Add some variation
                intensity = current_rainfall * np.random.uniform(0.5, 1.5)
                intensity = max(0, min(100, intensity))
                rainfall_forecast.append(round(intensity, 1))
        
        with simulator_lock:
            # Reset simulator
            for node in simulator.nodes.values():
                node.water_depth = 0.0
            
            # Run forecast
            results = simulator.run_forecast(hours, rainfall_forecast)
        
        return jsonify({
            'success': True,
            'simulation': {
                'hours': hours,
                'rainfall_forecast': rainfall_forecast,
                'results': results,
                'summary': {
                    'max_flood_depth': max(
                        max(step.get('flooding_nodes', [{}]), key=lambda x: x.get('water_depth', 0)).get('water_depth', 0)
                        for step in results if step.get('flooding_nodes')
                    ) if results else 0,
                    'total_flooding_events': sum(step.get('flooding_count', 0) for step in results),
                    'peak_hour': max(range(len(results)), key=lambda i: results[i].get('flooding_count', 0)) if results else 0
                }
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/v2/simulate/scenario', methods=['POST'])
def run_scenario_v2():
    """Run predefined flood scenarios"""
    try:
        data = request.get_json() or {}
        scenario = data.get('scenario', 'moderate')
        
        scenarios = {
            'light': {
                'name': 'Light Rain',
                'description': 'Light rainfall scenario (5-10 mm/hr)',
                'rainfall': [5, 7, 8, 6, 4, 3]
            },
            'moderate': {
                'name': 'Moderate Rain',
                'description': 'Moderate rainfall scenario (15-25 mm/hr)',
                'rainfall': [15, 20, 25, 22, 18, 12]
            },
            'heavy': {
                'name': 'Heavy Rain',
                'description': 'Heavy rainfall scenario (30-50 mm/hr)',
                'rainfall': [30, 40, 50, 45, 35, 25]
            },
            'extreme': {
                'name': 'Extreme Event (2015-like)',
                'description': 'Extreme rainfall similar to 2015 Chennai floods',
                'rainfall': [50, 80, 100, 90, 70, 50]
            },
            'cloudburst': {
                'name': 'Cloudburst',
                'description': 'Sudden intense cloudburst event',
                'rainfall': [10, 30, 100, 120, 80, 20]
            }
        }
        
        selected = scenarios.get(scenario, scenarios['moderate'])
        
        if not simulator:
            return jsonify({'error': 'Simulator not initialized'}), 500
        
        with simulator_lock:
            for node in simulator.nodes.values():
                node.water_depth = 0.0
            
            results = simulator.run_forecast(6, selected['rainfall'])
        
        return jsonify({
            'success': True,
            'scenario': {
                'type': scenario,
                'name': selected['name'],
                'description': selected['description'],
                'rainfall_pattern': selected['rainfall']
            },
            'simulation_results': results,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# -------------------------------------------------------------------------------------------------
# CONTROL ENDPOINTS
# -------------------------------------------------------------------------------------------------

@app.route('/api/v2/pumps', methods=['GET', 'POST'])
def pumps_control_v2():
    """Get or control pump status"""
    try:
        if request.method == 'GET':
            if not simulator:
                return jsonify({'error': 'Simulator not initialized'}), 500
            
            with simulator_lock:
                pumps = {}
                for pump_id, pump in simulator.pumps.items():
                    pumps[pump_id] = {
                        'id': pump_id,
                        'node': pump.node.node_id,
                        'is_active': pump.is_active,
                        'current_flow': round(pump.current_flow, 2),
                        'capacity': pump.capacity,
                        'utilization': round(pump.current_flow / pump.capacity * 100, 1) if pump.capacity > 0 else 0,
                        'operating_hours': round(pump.operating_hours, 2),
                        'power_kw': pump.power
                    }
            
            return jsonify({
                'success': True,
                'pumps': pumps,
                'active_count': sum(1 for p in pumps.values() if p['is_active']),
                'total_count': len(pumps),
                'timestamp': datetime.now().isoformat()
            })
        
        else:  # POST
            data = request.get_json()
            pump_id = data.get('pump_id')
            action = data.get('action')  # 'activate' or 'deactivate'
            
            if not pump_id or not action:
                return jsonify({'error': 'Missing pump_id or action'}), 400
            
            if not simulator:
                return jsonify({'error': 'Simulator not initialized'}), 500
            
            with simulator_lock:
                if pump_id not in simulator.pumps:
                    return jsonify({'error': f'Pump {pump_id} not found'}), 404
                
                pump = simulator.pumps[pump_id]
                
                if action == 'activate':
                    pump.activate()
                    message = f"Pump {pump_id} activated"
                elif action == 'deactivate':
                    pump.deactivate()
                    message = f"Pump {pump_id} deactivated"
                else:
                    return jsonify({'error': 'Invalid action. Use activate or deactivate'}), 400
            
            return jsonify({
                'success': True,
                'message': message,
                'pump_status': {
                    'id': pump_id,
                    'is_active': pump.is_active,
                    'current_flow': round(pump.current_flow, 2)
                },
                'timestamp': datetime.now().isoformat()
            })
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/v2/gates', methods=['GET', 'POST'])
def gates_control_v2():
    """Get or control gate status"""
    try:
        if request.method == 'GET':
            if not simulator:
                return jsonify({'error': 'Simulator not initialized'}), 500
            
            with simulator_lock:
                gates = {}
                for gate_id, gate in simulator.gates.items():
                    gates[gate_id] = {
                        'id': gate_id,
                        'link': gate.link.link_id,
                        'opening_percent': round(gate.opening * 100, 1),
                        'max_opening': gate.max_opening
                    }
            
            return jsonify({
                'success': True,
                'gates': gates,
                'count': len(gates),
                'timestamp': datetime.now().isoformat()
            })
        
        else:  # POST
            data = request.get_json()
            gate_id = data.get('gate_id')
            opening = data.get('opening')  # 0-100 percent
            
            if gate_id is None or opening is None:
                return jsonify({'error': 'Missing gate_id or opening'}), 400
            
            if not simulator:
                return jsonify({'error': 'Simulator not initialized'}), 500
            
            with simulator_lock:
                if gate_id not in simulator.gates:
                    return jsonify({'error': f'Gate {gate_id} not found'}), 404
                
                gate = simulator.gates[gate_id]
                gate.set_opening(opening / 100)
            
            return jsonify({
                'success': True,
                'message': f"Gate {gate_id} set to {opening}% opening",
                'gate_status': {
                    'id': gate_id,
                    'opening_percent': round(gate.opening * 100, 1)
                },
                'timestamp': datetime.now().isoformat()
            })
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# -------------------------------------------------------------------------------------------------
# ANALYTICS ENDPOINTS
# -------------------------------------------------------------------------------------------------

@app.route('/api/v2/hotspots')
def get_hotspots_v2():
    """Get current flood hotspots with live data"""
    try:
        # Get live sensor data
        sensor_data = live_data_service.get_all_sensor_data()
        
        hotspots = []
        
        # Check IoT sensors for hotspots
        for sensor_id, sensor in sensor_data['sensors'].items():
            if sensor['status'] in ['critical', 'danger', 'flooding']:
                hotspots.append({
                    'id': sensor_id,
                    'lat': sensor['latitude'],
                    'lon': sensor['longitude'],
                    'name': sensor['location_name'],
                    'type': 'sensor',
                    'severity': 'critical' if sensor['status'] == 'critical' else 'high',
                    'value': sensor['value'],
                    'unit': sensor['unit'],
                    'status': sensor['status']
                })
        
        # Check water level stations
        for station_id, station in sensor_data['water_levels'].items():
            if station['status'] in ['danger', 'warning']:
                hotspots.append({
                    'id': station_id,
                    'lat': station['latitude'],
                    'lon': station['longitude'],
                    'name': station['station_name'],
                    'type': 'water_station',
                    'severity': 'critical' if station['status'] == 'danger' else 'high',
                    'value': station['water_level_m'],
                    'unit': 'm',
                    'status': station['status'],
                    'trend': station['trend']
                })
        
        # Check simulator nodes
        if simulator and 'simulator' in sensor_data:
            for node_id, node in sensor_data['simulator'].get('nodes', {}).items():
                if node.get('is_flooding') or node.get('status') in ['flooding', 'critical']:
                    hotspots.append({
                        'id': node_id,
                        'lat': node['lat'],
                        'lon': node['lon'],
                        'name': f"Node {node_id}",
                        'type': 'simulation_node',
                        'severity': 'critical',
                        'value': node['water_depth'],
                        'unit': 'm',
                        'status': node['status']
                    })
        
        return jsonify({
            'success': True,
            'hotspots': hotspots,
            'count': len(hotspots),
            'summary': {
                'critical': len([h for h in hotspots if h['severity'] == 'critical']),
                'high': len([h for h in hotspots if h['severity'] == 'high'])
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/v2/statistics')
def get_statistics_v2():
    """Get comprehensive system statistics"""
    try:
        sensor_data = live_data_service.get_all_sensor_data()
        
        stats = {
            'sensors': sensor_data['statistics'],
            'api': sensor_data['api_stats'],
            'system': {
                'uptime_seconds': (datetime.now() - app.config.get('start_time', datetime.now())).total_seconds(),
                'models_loaded': {
                    'flood_risk': flood_risk_model is not None,
                    'runoff': runoff_model is not None,
                    'water_level': water_level_model is not None
                },
                'simulator_active': simulator is not None
            }
        }
        
        if simulator:
            with simulator_lock:
                stats['network'] = {
                    'nodes': len(simulator.nodes),
                    'links': len(simulator.links),
                    'pumps': len(simulator.pumps),
                    'gates': len(simulator.gates),
                    'flooding_nodes': sum(1 for n in simulator.nodes.values() if n.is_flooding)
                }
        
        return jsonify({
            'success': True,
            'statistics': stats,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/v2/history')
def get_history_v2():
    """Get historical data"""
    try:
        data_type = request.args.get('type', 'rainfall')
        days = request.args.get('days', 30, type=int)
        
        if data_type == 'rainfall':
            history = live_data_service.get_rainfall_history(days * 24)
            return jsonify({
                'success': True,
                'type': 'rainfall',
                'data': history,
                'count': len(history),
                'timestamp': datetime.now().isoformat()
            })
        
        # Load from CSV files for other types
        elif data_type == 'weather':
            weather_file = os.path.join(DATA_DIR, 'weather', 'rain_temp_chennai.csv')
            if os.path.exists(weather_file):
                df = pd.read_csv(weather_file).tail(days)
                return jsonify({
                    'success': True,
                    'type': 'weather',
                    'data': df.to_dict(orient='records'),
                    'count': len(df),
                    'timestamp': datetime.now().isoformat()
                })
        
        return jsonify({'success': False, 'error': 'Data type not found'}), 404
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# -------------------------------------------------------------------------------------------------
# LEGACY API SUPPORT (backward compatibility)
# -------------------------------------------------------------------------------------------------

@app.route('/api/realtime')
def legacy_realtime():
    """Legacy endpoint - redirects to v2"""
    data = live_data_service.get_all_sensor_data()
    
    # Format for legacy frontend
    legacy_format = {
        'success': True,
        'data': {
            'sensors': data['sensors'],
            'pumps': {},
            'gates': {},
            'rainfall': data['statistics'].get('current_rainfall_mm_hr', 0),
            'alerts': data['alerts'],
            'last_update': datetime.now().isoformat()
        },
        'timestamp': datetime.now().isoformat()
    }
    
    if simulator:
        with simulator_lock:
            for pump_id, pump in simulator.pumps.items():
                legacy_format['data']['pumps'][pump_id] = {
                    'is_active': pump.is_active,
                    'flow': pump.current_flow,
                    'capacity': pump.capacity
                }
            for gate_id, gate in simulator.gates.items():
                legacy_format['data']['gates'][gate_id] = {
                    'opening': gate.opening * 100
                }
    
    return jsonify(legacy_format)

@app.route('/api/hotspots')
def legacy_hotspots():
    """Legacy hotspots endpoint"""
    return get_hotspots_v2()

@app.route('/api/pump-control', methods=['GET', 'POST'])
def legacy_pump_control():
    """Legacy pump control endpoint"""
    return pumps_control_v2()

@app.route('/api/gate-control', methods=['GET', 'POST'])
def legacy_gate_control():
    """Legacy gate control endpoint"""
    return gates_control_v2()

@app.route('/api/network-status')
def legacy_network_status():
    """Legacy network status endpoint"""
    return get_statistics_v2()

@app.route('/api/simulate', methods=['POST'])
def legacy_simulate():
    """Legacy simulate endpoint"""
    return run_simulation_v2()

@app.route('/api/rainfall-history')
def legacy_rainfall_history():
    """Legacy rainfall history endpoint"""
    request.args = request.args.to_dict()
    request.args['type'] = 'rainfall'
    hours = request.args.get('days', 7, type=int) * 24
    
    history = live_data_service.get_rainfall_history(hours)
    
    # Format for legacy frontend
    legacy_history = []
    for item in history[::12]:  # Sample every hour
        legacy_history.append({
            'date': item['timestamp'][:10],
            'rainfall': item['intensity'],
            'temperature': 28 + np.random.uniform(-3, 3)  # Synthetic temp
        })
    
    return jsonify({
        'success': True,
        'history': legacy_history,
        'total_records': len(legacy_history)
    })

# -------------------------------------------------------------------------------------------------
# WEBSOCKET HANDLERS
# -------------------------------------------------------------------------------------------------

@socketio.on('connect')
def handle_connect():
    """Handle WebSocket connection"""
    print(f"   📡 Client connected: {request.sid}")
    emit('connected', {'status': 'connected', 'timestamp': datetime.now().isoformat()})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle WebSocket disconnection"""
    print(f"   📡 Client disconnected: {request.sid}")

@socketio.on('subscribe')
def handle_subscribe(data):
    """Handle subscription to specific data feeds"""
    feed = data.get('feed', 'all')
    print(f"   📡 Client subscribed to: {feed}")
    emit('subscribed', {'feed': feed, 'status': 'active'})

@socketio.on('request_update')
def handle_request_update():
    """Handle manual update request"""
    data = live_data_service.get_all_sensor_data()
    emit('realtime_update', data)

# =================================================================================================
# MAIN ENTRY POINT
# =================================================================================================

def run_server(host='0.0.0.0', port=5000, debug=False):
    """Start the enhanced API server"""
    app.config['start_time'] = datetime.now()
    
    # Initialize services
    initialize_services()
    
    # Start real-time update thread
    update_thread = threading.Thread(target=realtime_update_worker, daemon=True)
    update_thread.start()
    
    print("\n" + "=" * 90)
    print(f"🚀 Server starting on http://{host}:{port}")
    print(f"📡 WebSocket available at ws://{host}:{port}")
    print("=" * 90 + "\n")
    
    # Run with SocketIO
    socketio.run(app, host=host, port=port, debug=debug, allow_unsafe_werkzeug=True)

if __name__ == '__main__':
    run_server(debug=False)
