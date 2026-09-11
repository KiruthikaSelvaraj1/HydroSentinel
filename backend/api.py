"""
=================================================================================================
COMPREHENSIVE BACKEND API FOR CHENNAI FLOOD MANAGEMENT SYSTEM
=================================================================================================
Provides REST API endpoints for:
1. Flood Risk Prediction (ML-based)
2. Hydraulic Simulation (Real-time & Forecast)
3. Pump/Gate Control & Optimization
4. Historical Data & Analytics
5. Alerts & Notifications
=================================================================================================
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib
import json
import os
import sys
from datetime import datetime, timedelta
import threading
import time

# Add parent directory to path to import simulation module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scripts.hydraulic_simulation import HydraulicSimulator, create_chennai_network

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# Global variables
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data_collection', 'collected_data')
MODELS_DIR = os.path.join(BASE_DIR, 'models')

# Load ML models
flood_risk_model = None
runoff_model = None
water_level_model = None

# Global simulator instance
simulator = None
simulator_lock = threading.Lock()

# Real-time data simulation
realtime_data = {
    'sensors': {},
    'pumps': {},
    'gates': {},
    'rainfall': 0.0,
    'alerts': [],
    'last_update': None
}

print("="*90)
print("CHENNAI FLOOD MANAGEMENT - BACKEND API SERVER")
print("="*90)

# =================================================================================================
# MODEL LOADING
# =================================================================================================

def load_models():
    """Load all trained ML models"""
    global flood_risk_model, runoff_model, water_level_model
    
    print("\n📦 Loading ML models...")
    
    # Load flood risk model
    flood_risk_path = os.path.join(MODELS_DIR, 'flood_risk_model_enhanced.pkl')
    if os.path.exists(flood_risk_path):
        flood_risk_model = joblib.load(flood_risk_path)
        print(f"✅ Loaded flood risk model (Accuracy: {flood_risk_model['risk_accuracy']:.4f})")
    else:
        print("⚠️  Flood risk model not found")
    
    # Load runoff model
    runoff_path = os.path.join(MODELS_DIR, 'runoff_estimation_model.pkl')
    if os.path.exists(runoff_path):
        runoff_model = joblib.load(runoff_path)
        print(f"✅ Loaded runoff model (R²: {runoff_model['performance']['r2']:.4f})")
    else:
        print("⚠️  Runoff model not found")
    
    # Load water level model
    water_level_path = os.path.join(MODELS_DIR, 'water_level_prediction_model.pkl')
    if os.path.exists(water_level_path):
        water_level_model = joblib.load(water_level_path)
        print(f"✅ Loaded water level model (R²: {water_level_model['performance']['r2']:.4f})")
    else:
        print("⚠️  Water level model not found")

# =================================================================================================
# SIMULATOR INITIALIZATION
# =================================================================================================

def initialize_simulator():
    """Initialize hydraulic simulator"""
    global simulator
    
    print("\n🌊 Initializing hydraulic simulator...")
    with simulator_lock:
        simulator = create_chennai_network()
        print("✅ Simulator initialized with Chennai drainage network")

# =================================================================================================
# REAL-TIME DATA SIMULATION
# =================================================================================================

def update_realtime_data():
    """Update real-time sensor data (mock IoT simulation)"""
    global realtime_data
    
    while True:
        try:
            # Simulate rainfall (varies throughout the day)
            hour = datetime.now().hour
            base_rainfall = 5.0
            
            # Monsoon pattern: higher rainfall in evening
            if 16 <= hour <= 20:
                rainfall = np.random.uniform(15, 35)
            elif 8 <= hour <= 12:
                rainfall = np.random.uniform(5, 15)
            else:
                rainfall = np.random.uniform(0, 10)
            
            realtime_data['rainfall'] = float(rainfall)
            
            # Update sensor data from simulator
            if simulator:
                with simulator_lock:
                    for node_id, node in simulator.nodes.items():
                        realtime_data['sensors'][node_id] = {
                            'water_depth': float(node.water_depth),
                            'water_level': float(node.water_level),
                            'is_flooding': bool(node.is_flooding),
                            'lat': node.lat,
                            'lon': node.lon,
                            'status': 'critical' if node.is_flooding else ('warning' if node.water_depth > 1.5 else 'normal')
                        }
                    
                    # Update pump status
                    for pump_id, pump in simulator.pumps.items():
                        realtime_data['pumps'][pump_id] = {
                            'is_active': bool(pump.is_active),
                            'flow': float(pump.current_flow),
                            'capacity': float(pump.capacity),
                            'utilization': float(pump.current_flow / pump.capacity * 100) if pump.capacity > 0 else 0,
                            'node': pump.node.node_id
                        }
                    
                    # Update gate status
                    for gate_id, gate in simulator.gates.items():
                        realtime_data['gates'][gate_id] = {
                            'opening': float(gate.opening * 100),  # Convert to percentage
                            'link': gate.link.link_id
                        }
            
            # Generate alerts based on conditions
            alerts = []
            for sensor_id, sensor_data in realtime_data['sensors'].items():
                if sensor_data['is_flooding']:
                    alerts.append({
                        'level': 'critical',
                        'message': f"FLOODING DETECTED at {sensor_id}",
                        'location': sensor_id,
                        'timestamp': datetime.now().isoformat()
                    })
                elif sensor_data['water_depth'] > 1.5:
                    alerts.append({
                        'level': 'warning',
                        'message': f"High water level at {sensor_id} ({sensor_data['water_depth']:.2f}m)",
                        'location': sensor_id,
                        'timestamp': datetime.now().isoformat()
                    })
            
            if rainfall > 25:
                alerts.append({
                    'level': 'warning',
                    'message': f"Heavy rainfall detected: {rainfall:.1f}mm/hr",
                    'location': 'Chennai',
                    'timestamp': datetime.now().isoformat()
                })
            
            realtime_data['alerts'] = alerts
            realtime_data['last_update'] = datetime.now().isoformat()
            
            # Run one simulation step
            if simulator:
                with simulator_lock:
                    simulator.step(rainfall)
            
            time.sleep(5)  # Update every 5 seconds
            
        except Exception as e:
            print(f"Error in realtime data update: {e}")
            time.sleep(5)

# Start real-time data thread
def start_realtime_updates():
    """Start background thread for real-time updates"""
    thread = threading.Thread(target=update_realtime_data, daemon=True)
    thread.start()
    print("✅ Real-time data updates started")

# =================================================================================================
# API ENDPOINTS
# =================================================================================================

@app.route('/')
def home():
    """API status endpoint"""
    return jsonify({
        'status': 'online',
        'service': 'Chennai Flood Management API',
        'version': '1.0',
        'timestamp': datetime.now().isoformat(),
        'endpoints': {
            'flood_risk': '/api/flood-risk',
            'simulate': '/api/simulate',
            'realtime': '/api/realtime',
            'rainfall_history': '/api/rainfall-history',
            'hotspots': '/api/hotspots',
            'pump_control': '/api/pump-control',
            'gate_control': '/api/gate-control',
            'alerts': '/api/alerts',
            'network_status': '/api/network-status'
        }
    })

# -------------------------------------------------------------------------------------------------
# 1. FLOOD RISK PREDICTION
# -------------------------------------------------------------------------------------------------

@app.route('/api/flood-risk', methods=['GET', 'POST'])
def flood_risk_prediction():
    """
    Predict flood risk for given coordinates or entire Chennai
    
    GET: Returns all flood risk zones
    POST: Predict risk for specific coordinates
    """
    try:
        if request.method == 'POST':
            data = request.get_json()
            lat = data.get('lat')
            lon = data.get('lon')
            elevation = data.get('elevation')
            
            if not all([lat, lon, elevation]):
                return jsonify({'error': 'Missing required parameters'}), 400
            
            if not flood_risk_model:
                return jsonify({'error': 'Model not loaded'}), 500
            
            # Prepare features
            features = np.array([[
                elevation,
                elevation ** 2,
                np.log1p(elevation + 2.1),
                lat,
                lon,
                abs(lon - 80.28) * 111,  # Distance from coast
                0,  # lat_zone_encoded (simplified)
                elevation * abs(lon - 80.28) * 111  # Interaction
            ]])
            
            # Scale features
            scaler = flood_risk_model['scaler']
            features_scaled = scaler.transform(features)
            
            # Predict
            risk_model = flood_risk_model['risk_model']
            safety_model = flood_risk_model['safety_model']
            
            risk_prediction = risk_model.predict(features_scaled)[0]
            risk_proba = risk_model.predict_proba(features_scaled)[0]
            safety_prediction = safety_model.predict(features_scaled)[0]
            
            return jsonify({
                'success': True,
                'risk_level': risk_prediction,
                'risk_probabilities': {
                    'critical': float(risk_proba[0]) if len(risk_proba) > 0 else 0,
                    'high': float(risk_proba[1]) if len(risk_proba) > 1 else 0,
                    'low': float(risk_proba[2]) if len(risk_proba) > 2 else 0,
                    'medium': float(risk_proba[3]) if len(risk_proba) > 3 else 0,
                    'minimal': float(risk_proba[4]) if len(risk_proba) > 4 else 0
                },
                'is_safe': bool(safety_prediction == 0),
                'confidence': float(max(risk_proba))
            })
        
        else:  # GET - Return all flood zones
            # Load elevation data
            elevation_file = os.path.join(DATA_DIR, 'elevation', 'chennai_elevation_labeled.csv')
            if not os.path.exists(elevation_file):
                return jsonify({'error': 'Elevation data not found'}), 404
            
            df = pd.read_csv(elevation_file)
            
            # Sample data for performance (every 10th point)
            df_sample = df.iloc[::10]
            
            zones = []
            for _, row in df_sample.iterrows():
                zones.append({
                    'lat': float(row['latitude']),
                    'lon': float(row['longitude']),
                    'elevation': float(row['elevation']),
                    'risk': row['flood_risk'],
                    'safe': row['safety_label'] == 'safe'
                })
            
            return jsonify({
                'success': True,
                'total_points': len(zones),
                'zones': zones
            })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# -------------------------------------------------------------------------------------------------
# 2. HYDRAULIC SIMULATION
# -------------------------------------------------------------------------------------------------

@app.route('/api/simulate', methods=['POST'])
def run_simulation():
    """
    Run hydraulic simulation forecast
    
    Body:
    {
        "hours": 6,
        "rainfall_forecast": [25, 35, 40, 35, 20, 10]
    }
    """
    try:
        data = request.get_json()
        hours = data.get('hours', 6)
        rainfall_forecast = data.get('rainfall_forecast', [10] * hours)
        
        if not simulator:
            return jsonify({'error': 'Simulator not initialized'}), 500
        
        with simulator_lock:
            # Reset simulator state
            for node in simulator.nodes.values():
                node.water_depth = 0.0
            
            # Run forecast
            results = simulator.run_forecast(hours, rainfall_forecast)
        
        return jsonify({
            'success': True,
            'forecast_hours': hours,
            'results': results
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# -------------------------------------------------------------------------------------------------
# 3. REAL-TIME DATA
# -------------------------------------------------------------------------------------------------

@app.route('/api/realtime', methods=['GET'])
def get_realtime_data():
    """Get current real-time sensor data, pump status, and alerts"""
    return jsonify({
        'success': True,
        'data': realtime_data,
        'timestamp': datetime.now().isoformat()
    })

# -------------------------------------------------------------------------------------------------
# 4. RAINFALL HISTORY
# -------------------------------------------------------------------------------------------------

@app.route('/api/rainfall-history', methods=['GET'])
def rainfall_history():
    """Get historical rainfall data"""
    try:
        weather_file = os.path.join(DATA_DIR, 'weather', 'rain_temp_chennai.csv')
        
        if not os.path.exists(weather_file):
            return jsonify({'error': 'Weather data not found'}), 404
        
        df = pd.read_csv(weather_file)
        
        # Get last N days (default 30)
        days = request.args.get('days', 30, type=int)
        df_recent = df.tail(days)
        
        history = []
        for _, row in df_recent.iterrows():
            history.append({
                'date': row.get('date', row.get('time', '')),
                'rainfall': float(row.get('rainfall_mm', row.get('PRECTOTCORR', 0))),
                'temperature': float(row.get('temperature_c', row.get('T2M', 0)))
            })
        
        return jsonify({
            'success': True,
            'total_records': len(history),
            'history': history
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# -------------------------------------------------------------------------------------------------
# 5. FLOOD HOTSPOTS
# -------------------------------------------------------------------------------------------------

@app.route('/api/hotspots', methods=['GET'])
def flood_hotspots():
    """Get current flood hotspots (critical and high-risk areas)"""
    try:
        elevation_file = os.path.join(DATA_DIR, 'elevation', 'chennai_elevation_labeled.csv')
        if not os.path.exists(elevation_file):
            return jsonify({'error': 'Elevation data not found'}), 404
        
        df = pd.read_csv(elevation_file)
        
        # Filter critical and high-risk zones
        hotspots = df[df['flood_risk'].isin(['critical', 'high'])]
        
        # Group by zone and get representative points
        zones = []
        for risk_level in ['critical', 'high']:
            zone_data = hotspots[hotspots['flood_risk'] == risk_level]
            
            if len(zone_data) > 0:
                # Sample every 20th point for performance
                sample = zone_data.iloc[::20]
                
                for _, row in sample.iterrows():
                    zones.append({
                        'lat': float(row['latitude']),
                        'lon': float(row['longitude']),
                        'elevation': float(row['elevation']),
                        'risk': risk_level,
                        'severity': 'critical' if risk_level == 'critical' else 'high'
                    })
        
        # Add real-time flooding sensors
        flooding_sensors = []
        for sensor_id, sensor_data in realtime_data.get('sensors', {}).items():
            if sensor_data.get('is_flooding'):
                flooding_sensors.append({
                    'id': sensor_id,
                    'lat': sensor_data['lat'],
                    'lon': sensor_data['lon'],
                    'water_depth': sensor_data['water_depth'],
                    'status': 'flooding'
                })
        
        return jsonify({
            'success': True,
            'total_hotspots': len(zones),
            'hotspots': zones,
            'active_flooding': flooding_sensors
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# -------------------------------------------------------------------------------------------------
# 6. PUMP CONTROL
# -------------------------------------------------------------------------------------------------

@app.route('/api/pump-control', methods=['GET', 'POST'])
def pump_control():
    """
    Control drainage pumps
    
    GET: Get status of all pumps
    POST: Activate/deactivate pumps
    Body: {"pump_id": "P1_Velachery", "action": "activate" or "deactivate"}
    """
    try:
        if not simulator:
            return jsonify({'error': 'Simulator not initialized'}), 500
        
        if request.method == 'POST':
            data = request.get_json()
            pump_id = data.get('pump_id')
            action = data.get('action')
            
            if not pump_id or not action:
                return jsonify({'error': 'Missing pump_id or action'}), 400
            
            with simulator_lock:
                if pump_id not in simulator.pumps:
                    return jsonify({'error': 'Pump not found'}), 404
                
                pump = simulator.pumps[pump_id]
                
                if action == 'activate':
                    pump.activate()
                    message = f'Pump {pump_id} activated'
                elif action == 'deactivate':
                    pump.deactivate()
                    message = f'Pump {pump_id} deactivated'
                else:
                    return jsonify({'error': 'Invalid action'}), 400
            
            return jsonify({
                'success': True,
                'message': message,
                'pump': {
                    'id': pump_id,
                    'active': pump.is_active,
                    'flow': float(pump.current_flow),
                    'capacity': float(pump.capacity)
                }
            })
        
        else:  # GET - Return all pump statuses
            with simulator_lock:
                pumps = {}
                for pump_id, pump in simulator.pumps.items():
                    pumps[pump_id] = {
                        'active': bool(pump.is_active),
                        'flow': float(pump.current_flow),
                        'capacity': float(pump.capacity),
                        'utilization': float(pump.current_flow / pump.capacity * 100) if pump.capacity > 0 else 0,
                        'node': pump.node.node_id,
                        'operating_hours': float(pump.operating_hours)
                    }
            
            return jsonify({
                'success': True,
                'pumps': pumps
            })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# -------------------------------------------------------------------------------------------------
# 7. GATE CONTROL
# -------------------------------------------------------------------------------------------------

@app.route('/api/gate-control', methods=['GET', 'POST'])
def gate_control():
    """
    Control drainage gates
    
    GET: Get status of all gates
    POST: Set gate opening
    Body: {"gate_id": "G1_Adyar", "opening": 0.75}
    """
    try:
        if not simulator:
            return jsonify({'error': 'Simulator not initialized'}), 500
        
        if request.method == 'POST':
            data = request.get_json()
            gate_id = data.get('gate_id')
            opening = data.get('opening')
            
            if not gate_id or opening is None:
                return jsonify({'error': 'Missing gate_id or opening'}), 400
            
            with simulator_lock:
                if gate_id not in simulator.gates:
                    return jsonify({'error': 'Gate not found'}), 404
                
                gate = simulator.gates[gate_id]
                gate.set_opening(float(opening))
            
            return jsonify({
                'success': True,
                'message': f'Gate {gate_id} opening set to {opening*100:.0f}%',
                'gate': {
                    'id': gate_id,
                    'opening': float(gate.opening),
                    'link': gate.link.link_id
                }
            })
        
        else:  # GET - Return all gate statuses
            with simulator_lock:
                gates = {}
                for gate_id, gate in simulator.gates.items():
                    gates[gate_id] = {
                        'opening': float(gate.opening),
                        'opening_percent': float(gate.opening * 100),
                        'link': gate.link.link_id
                    }
            
            return jsonify({
                'success': True,
                'gates': gates
            })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# -------------------------------------------------------------------------------------------------
# 8. ALERTS
# -------------------------------------------------------------------------------------------------

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    """Get current active alerts"""
    return jsonify({
        'success': True,
        'alerts': realtime_data.get('alerts', []),
        'total_alerts': len(realtime_data.get('alerts', [])),
        'timestamp': datetime.now().isoformat()
    })

# -------------------------------------------------------------------------------------------------
# 9. NETWORK STATUS
# -------------------------------------------------------------------------------------------------

@app.route('/api/network-status', methods=['GET'])
def network_status():
    """Get drainage network status"""
    try:
        if not simulator:
            return jsonify({'error': 'Simulator not initialized'}), 500
        
        with simulator_lock:
            nodes_status = {}
            for node_id, node in simulator.nodes.items():
                nodes_status[node_id] = {
                    'lat': node.lat,
                    'lon': node.lon,
                    'elevation': float(node.elevation),
                    'water_depth': float(node.water_depth),
                    'water_level': float(node.water_level),
                    'is_flooding': bool(node.is_flooding),
                    'status': 'critical' if node.is_flooding else ('warning' if node.water_depth > 1.5 else 'normal')
                }
            
            links_status = {}
            for link_id, link in simulator.links.items():
                links_status[link_id] = {
                    'from': link.from_node.node_id,
                    'to': link.to_node.node_id,
                    'flow': float(link.flow),
                    'capacity': float(link.capacity),
                    'utilization': float(link.flow / link.capacity * 100) if link.capacity > 0 else 0
                }
        
        return jsonify({
            'success': True,
            'nodes': nodes_status,
            'links': links_status,
            'summary': {
                'total_nodes': len(nodes_status),
                'flooding_nodes': sum(1 for n in nodes_status.values() if n['is_flooding']),
                'total_links': len(links_status)
            }
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =================================================================================================
# INITIALIZATION & STARTUP
# =================================================================================================

# Load models and initialize on startup
load_models()
initialize_simulator()
start_realtime_updates()

print("\n" + "="*90)
print("✅ BACKEND API SERVER READY")
print("="*90)
print("Endpoints available:")
print("  - GET  /                      - API status")
print("  - GET  /api/flood-risk        - Get flood risk zones")
print("  - POST /api/flood-risk        - Predict risk for coordinates")
print("  - POST /api/simulate          - Run simulation forecast")
print("  - GET  /api/realtime          - Get real-time data")
print("  - GET  /api/rainfall-history  - Get rainfall history")
print("  - GET  /api/hotspots          - Get flood hotspots")
print("  - GET  /api/pump-control      - Get pump status")
print("  - POST /api/pump-control      - Control pumps")
print("  - GET  /api/gate-control      - Get gate status")
print("  - POST /api/gate-control      - Control gates")
print("  - GET  /api/alerts            - Get active alerts")
print("  - GET  /api/network-status    - Get network status")
print("="*90)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000, threaded=True)
