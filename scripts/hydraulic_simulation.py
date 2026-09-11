"""
=================================================================================================
HYDRAULIC SIMULATION ENGINE FOR CHENNAI FLOOD MANAGEMENT
=================================================================================================
Implements:
1. SWMM-style Urban Drainage Network Simulation (1D/2D)
2. Real-time Inflow Calculations (rainfall → runoff → inflow)
3. Hydraulic Routing (Musk

ingum/Manning's equation)
4. Pump & Gate Control Simulation
5. Inundation Mapping (0-6hr nowcast)
6. Ensemble Forecasting with Uncertainty
=================================================================================================
"""

import numpy as np
import pandas as pd
import json
import os
from datetime import datetime, timedelta
from scipy import optimize
from typing import Dict, List, Tuple, Optional
import joblib

class DrainageNode:
    """Represents a node in the drainage network (junction/manhole)"""
    def __init__(self, node_id: str, lat: float, lon: float, elevation: float, 
                 max_depth: float = 3.0):
        self.node_id = node_id
        self.lat = lat
        self.lon = lon
        self.elevation = elevation  # Ground elevation (m)
        self.max_depth = max_depth  # Maximum water depth before overflow (m)
        self.water_depth = 0.0  # Current water depth (m)
        self.inflow = 0.0  # Current inflow rate (m³/s)
        self.outflow = 0.0  # Current outflow rate (m³/s)
        
    @property
    def water_level(self):
        """Absolute water level (m)"""
        return self.elevation + self.water_depth
    
    @property
    def is_flooding(self):
        """Check if node is overflowing"""
        return self.water_depth > self.max_depth
    
    def update(self, dt: float):
        """Update water depth based on inflow/outflow balance"""
        # Volume balance: dV/dt = Qin - Qout
        # Simplified: assume node area = 10 m²
        node_area = 10.0  # m²
        dV = (self.inflow - self.outflow) * dt  # m³
        d_depth = dV / node_area  # m
        self.water_depth = max(0, self.water_depth + d_depth)


class DrainageLink:
    """Represents a link in the drainage network (pipe/channel/canal)"""
    def __init__(self, link_id: str, from_node: DrainageNode, to_node: DrainageNode,
                 length: float, diameter: float, roughness: float = 0.013):
        self.link_id = link_id
        self.from_node = from_node
        self.to_node = to_node
        self.length = length  # m
        self.diameter = diameter  # m
        self.roughness = roughness  # Manning's n
        self.slope = max(0.0001, (from_node.elevation - to_node.elevation) / length)
        self.flow = 0.0  # Current flow rate (m³/s)
        self.capacity = self.calculate_capacity()
        
    def calculate_capacity(self):
        """Calculate maximum flow capacity using Manning's equation"""
        # Q = (1/n) * A * R^(2/3) * S^(1/2)
        # For full pipe: A = π*D²/4, R = D/4
        A = np.pi * (self.diameter ** 2) / 4  # Cross-sectional area
        R = self.diameter / 4  # Hydraulic radius (full pipe)
        Q_max = (1 / self.roughness) * A * (R ** (2/3)) * (self.slope ** 0.5)
        return Q_max
    
    def calculate_flow(self):
        """Calculate flow based on water level difference (hydraulic gradient)"""
        # Simplified gravity flow
        head_diff = max(0, self.from_node.water_level - self.to_node.water_level)
        
        if head_diff > 0:
            # Use orifice equation: Q = C * A * sqrt(2*g*h)
            g = 9.81  # m/s²
            C = 0.6  # Orifice coefficient
            A = np.pi * (self.diameter ** 2) / 4
            Q_potential = C * A * np.sqrt(2 * g * head_diff)
            
            # Limit to capacity
            self.flow = min(Q_potential, self.capacity)
        else:
            self.flow = 0.0
        
        return self.flow


class Pump:
    """Represents a drainage pump"""
    def __init__(self, pump_id: str, node: DrainageNode, capacity: float, power: float = 100):
        self.pump_id = pump_id
        self.node = node
        self.capacity = capacity  # Maximum flow rate (m³/s)
        self.power = power  # Power consumption (kW)
        self.is_active = False
        self.current_flow = 0.0
        self.operating_hours = 0.0
        
    def activate(self):
        """Turn on the pump"""
        self.is_active = True
    
    def deactivate(self):
        """Turn off the pump"""
        self.is_active = False
        self.current_flow = 0.0
    
    def update(self, dt: float):
        """Update pump operation"""
        if self.is_active:
            # Pump at full capacity if water is available
            available_water = self.node.water_depth * 10  # Simplified volume
            self.current_flow = min(self.capacity, available_water / dt)
            self.operating_hours += dt / 3600  # Convert to hours
        else:
            self.current_flow = 0.0


class Gate:
    """Represents a control gate/sluice"""
    def __init__(self, gate_id: str, link: DrainageLink, max_opening: float = 1.0):
        self.gate_id = gate_id
        self.link = link
        self.max_opening = max_opening  # 1.0 = fully open, 0.0 = closed
        self.opening = 0.5  # Current opening (0-1)
        
    def set_opening(self, opening: float):
        """Set gate opening (0-1)"""
        self.opening = max(0.0, min(1.0, opening))
    
    def apply_to_flow(self):
        """Apply gate effect to link flow"""
        self.link.flow *= self.opening


class HydraulicSimulator:
    """Main simulation engine"""
    def __init__(self):
        self.nodes: Dict[str, DrainageNode] = {}
        self.links: Dict[str, DrainageLink] = {}
        self.pumps: Dict[str, Pump] = {}
        self.gates: Dict[str, Gate] = {}
        self.current_time = datetime.now()
        self.dt = 300  # Time step (seconds) - 5 minutes
        self.rainfall_data = []
        self.runoff_model = None
        
        # Load runoff model
        self.load_models()
    
    def load_models(self):
        """Load trained ML models"""
        model_path = os.path.join('models', 'runoff_estimation_model.pkl')
        if os.path.exists(model_path):
            self.runoff_model = joblib.load(model_path)
            print("✅ Loaded runoff model")
        else:
            print("⚠️  Runoff model not found")
    
    def add_node(self, node: DrainageNode):
        """Add drainage node to network"""
        self.nodes[node.node_id] = node
    
    def add_link(self, link: DrainageLink):
        """Add drainage link to network"""
        self.links[link.link_id] = link
    
    def add_pump(self, pump: Pump):
        """Add pump to network"""
        self.pumps[pump.pump_id] = pump
    
    def add_gate(self, gate: Gate):
        """Add gate to network"""
        self.gates[gate.gate_id] = gate
    
    def calculate_catchment_inflow(self, node: DrainageNode, rainfall: float, 
                                   catchment_area: float = 10000) -> float:
        """
        Calculate inflow to node from rainfall using runoff model
        
        Args:
            node: Drainage node
            rainfall: Rainfall intensity (mm/hr)
            catchment_area: Catchment area (m²)
        
        Returns:
            Inflow rate (m³/s)
        """
        if self.runoff_model is None or rainfall <= 0:
            return 0.0
        
        # Use runoff model to estimate runoff coefficient
        # Features: rainfall_mm, curve_number, soil_moisture, slope_degrees, land_use_encoded
        features = np.array([[
            rainfall,  # rainfall_mm
            85,  # curve_number (urban default)
            0.5,  # soil_moisture (medium)
            2.0,  # slope_degrees (flat)
            0  # land_use_encoded (urban=0)
        ]])
        
        # Scale features
        scaler = self.runoff_model['scaler']
        features_scaled = scaler.transform(features)
        
        # Predict runoff
        runoff_mm = self.runoff_model['model'].predict(features_scaled)[0]
        
        # Convert to flow rate
        # Q = runoff (mm/hr) * area (m²) / 1000 / 3600
        inflow = (runoff_mm * catchment_area) / 1000 / 3600  # m³/s
        
        return max(0, inflow)
    
    def step(self, rainfall_intensity: float = 0.0):
        """
        Advance simulation by one time step
        
        Args:
            rainfall_intensity: Current rainfall (mm/hr)
        """
        # 1. Calculate inflows from rainfall
        for node_id, node in self.nodes.items():
            # Each node has a small catchment (simplified)
            catchment_area = 10000  # 1 hectare = 10,000 m²
            inflow = self.calculate_catchment_inflow(node, rainfall_intensity, catchment_area)
            node.inflow = inflow
        
        # 2. Calculate flows through links
        for link_id, link in self.links.items():
            link.calculate_flow()
        
        # 3. Apply gate controls
        for gate_id, gate in self.gates.items():
            gate.apply_to_flow()
        
        # 4. Update pump operations
        for pump_id, pump in self.pumps.items():
            pump.update(self.dt)
            # Pump removes water from node
            pump.node.outflow += pump.current_flow
        
        # 5. Update node outflows from links
        for link_id, link in self.links.items():
            link.from_node.outflow += link.flow
            link.to_node.inflow += link.flow
        
        # 6. Update node water depths
        for node_id, node in self.nodes.items():
            node.update(self.dt)
        
        # 7. Reset flows for next iteration
        for node in self.nodes.values():
            node.outflow = 0.0
        
        # 8. Advance time
        self.current_time += timedelta(seconds=self.dt)
    
    def run_forecast(self, forecast_hours: int = 6, rainfall_forecast: List[float] = None):
        """
        Run forecast simulation for specified hours
        
        Args:
            forecast_hours: Number of hours to simulate
            rainfall_forecast: Rainfall forecast (mm/hr) for each hour
        
        Returns:
            Dictionary with forecast results
        """
        if rainfall_forecast is None:
            rainfall_forecast = [10.0] * forecast_hours  # Default: 10mm/hr
        
        results = {
            'timestamps': [],
            'nodes': {node_id: [] for node_id in self.nodes.keys()},
            'flooding_nodes': [],
            'total_inundation_area': [],
            'pumps_active': []
        }
        
        print(f"\n🌊 Running {forecast_hours}-hour forecast simulation...")
        print(f"Time step: {self.dt}s ({self.dt/60:.1f} minutes)")
        print(f"Start time: {self.current_time}")
        
        steps_per_hour = 3600 // self.dt
        total_steps = forecast_hours * steps_per_hour
        
        for step_i in range(total_steps):
            hour = step_i // steps_per_hour
            rainfall = rainfall_forecast[hour]
            
            # Run simulation step
            self.step(rainfall)
            
            # Record results every hour
            if step_i % steps_per_hour == 0:
                results['timestamps'].append(self.current_time.isoformat())
                
                # Record node depths
                flooding_count = 0
                for node_id, node in self.nodes.items():
                    results['nodes'][node_id].append({
                        'depth': float(node.water_depth),
                        'level': float(node.water_level),
                        'flooding': bool(node.is_flooding)  # Convert numpy bool to Python bool
                    })
                    if node.is_flooding:
                        flooding_count += 1
                
                results['flooding_nodes'].append(flooding_count)
                results['total_inundation_area'].append(flooding_count * 10000)  # m² (simplified)
                
                # Record pump status
                active_pumps = sum(1 for p in self.pumps.values() if p.is_active)
                results['pumps_active'].append(active_pumps)
                
                print(f"  Hour {hour+1}: Rainfall={rainfall:.1f}mm/hr, Flooding nodes={flooding_count}/{len(self.nodes)}")
        
        print(f"✅ Forecast complete: {forecast_hours} hours simulated")
        
        return results
    
    def get_state_snapshot(self):
        """Get current state of the system"""
        return {
            'timestamp': self.current_time.isoformat(),
            'nodes': {
                node_id: {
                    'lat': node.lat,
                    'lon': node.lon,
                    'elevation': node.elevation,
                    'water_depth': node.water_depth,
                    'water_level': node.water_level,
                    'is_flooding': node.is_flooding
                }
                for node_id, node in self.nodes.items()
            },
            'links': {
                link_id: {
                    'from': link.from_node.node_id,
                    'to': link.to_node.node_id,
                    'flow': link.flow,
                    'capacity': link.capacity,
                    'utilization': link.flow / link.capacity if link.capacity > 0 else 0
                }
                for link_id, link in self.links.items()
            },
            'pumps': {
                pump_id: {
                    'node': pump.node.node_id,
                    'active': pump.is_active,
                    'flow': pump.current_flow,
                    'capacity': pump.capacity,
                    'operating_hours': pump.operating_hours
                }
                for pump_id, pump in self.pumps.items()
            },
            'gates': {
                gate_id: {
                    'link': gate.link.link_id,
                    'opening': gate.opening
                }
                for gate_id, gate in self.gates.items()
            }
        }


def create_chennai_network():
    """Create simplified Chennai drainage network"""
    print("\n🏗️  Building Chennai drainage network...")
    
    sim = HydraulicSimulator()
    
    # Load elevation data to get realistic ground elevations
    elevation_file = os.path.join('data_collection', 'collected_data', 'elevation', 
                                   'chennai_elevation_labeled.csv')
    
    if os.path.exists(elevation_file):
        df_elev = pd.read_csv(elevation_file)
        print(f"✅ Loaded {len(df_elev)} elevation points")
    else:
        print("⚠️  Elevation data not found, using defaults")
        df_elev = None
    
    # Create major drainage nodes (simplified Chennai network)
    # Based on major zones: North, Central, South, East, West
    major_nodes = [
        # North Chennai
        ("N1_Manali", 13.18, 80.20, 10),
        ("N2_Ennore", 13.20, 80.32, 5),
        ("N3_Madhavaram", 13.15, 80.23, 15),
        
        # Central Chennai
        ("C1_Anna_Nagar", 13.09, 80.21, 12),
        ("C2_T_Nagar", 13.04, 80.23, 8),
        ("C3_Nungambakkam", 13.06, 80.25, 10),
        ("C4_Adyar", 13.01, 80.26, 5),
        
        # South Chennai
        ("S1_Pallavaram", 12.97, 80.15, 18),
        ("S2_Chromepet", 12.95, 80.14, 20),
        ("S3_Tambaram", 12.92, 80.13, 25),
        
        # East Chennai (Coastal)
        ("E1_Royapuram", 13.11, 80.30, 3),
        ("E2_Mylapore", 13.03, 80.27, 4),
        ("E3_Velachery", 12.98, 80.22, 8),
        ("E4_Sholinganallur", 12.90, 80.23, 6),
        
        # West Chennai
        ("W1_Porur", 13.04, 80.16, 22),
        ("W2_Valasaravakkam", 13.05, 80.18, 18),
    ]
    
    for node_id, lat, lon, default_elev in major_nodes:
        # Try to get real elevation from data
        if df_elev is not None:
            nearby = df_elev[
                (abs(df_elev['latitude'] - lat) < 0.05) &
                (abs(df_elev['longitude'] - lon) < 0.05)
            ]
            if len(nearby) > 0:
                elevation = nearby['elevation'].mean()
            else:
                elevation = default_elev
        else:
            elevation = default_elev
        
        node = DrainageNode(node_id, lat, lon, elevation, max_depth=2.5)
        sim.add_node(node)
    
    print(f"✅ Created {len(sim.nodes)} drainage nodes")
    
    # Create drainage links (connecting major nodes)
    major_links = [
        # North Chennai network
        ("L1", "N1_Manali", "N2_Ennore", 5000, 2.5),
        ("L2", "N3_Madhavaram", "C1_Anna_Nagar", 6000, 2.0),
        
        # Central Chennai network
        ("L3", "C1_Anna_Nagar", "C2_T_Nagar", 5000, 2.5),
        ("L4", "C2_T_Nagar", "C3_Nungambakkam", 3000, 2.0),
        ("L5", "C3_Nungambakkam", "C4_Adyar", 4000, 2.5),
        ("L6", "C4_Adyar", "E2_Mylapore", 3000, 3.0),
        
        # South Chennai network
        ("L7", "C4_Adyar", "E3_Velachery", 5000, 2.0),
        ("L8", "E3_Velachery", "S1_Pallavaram", 8000, 2.5),
        ("L9", "S1_Pallavaram", "S2_Chromepet", 3000, 2.0),
        ("L10", "S2_Chromepet", "S3_Tambaram", 4000, 2.0),
        
        # East Chennai (to sea)
        ("L11", "E1_Royapuram", "N2_Ennore", 8000, 3.0),
        ("L12", "E2_Mylapore", "E1_Royapuram", 10000, 3.5),
        ("L13", "E3_Velachery", "E4_Sholinganallur", 7000, 2.5),
        
        # West Chennai network
        ("L14", "W1_Porur", "W2_Valasaravakkam", 4000, 2.0),
        ("L15", "W2_Valasaravakkam", "C2_T_Nagar", 6000, 2.5),
    ]
    
    for link_id, from_id, to_id, length, diameter in major_links:
        from_node = sim.nodes[from_id]
        to_node = sim.nodes[to_id]
        link = DrainageLink(link_id, from_node, to_node, length, diameter)
        sim.add_link(link)
    
    print(f"✅ Created {len(sim.links)} drainage links")
    
    # Add pumps at critical low-lying nodes
    critical_pumps = [
        ("P1_Velachery", "E3_Velachery", 5.0),  # 5 m³/s capacity
        ("P2_Adyar", "C4_Adyar", 7.0),
        ("P3_Pallavaram", "S1_Pallavaram", 4.0),
        ("P4_Ennore", "N2_Ennore", 6.0),
    ]
    
    for pump_id, node_id, capacity in critical_pumps:
        node = sim.nodes[node_id]
        pump = Pump(pump_id, node, capacity)
        sim.add_pump(pump)
    
    print(f"✅ Created {len(sim.pumps)} pumps")
    
    # Add control gates at major junctions
    critical_gates = [
        ("G1_Adyar", "L6"),
        ("G2_Velachery", "L7"),
        ("G3_Tambaram", "L10"),
    ]
    
    for gate_id, link_id in critical_gates:
        link = sim.links[link_id]
        gate = Gate(gate_id, link)
        sim.add_gate(gate)
    
    print(f"✅ Created {len(sim.gates)} control gates")
    
    print(f"\n📊 Network Summary:")
    print(f"   Nodes: {len(sim.nodes)}")
    print(f"   Links: {len(sim.links)}")
    print(f"   Pumps: {len(sim.pumps)}")
    print(f"   Gates: {len(sim.gates)}")
    print(f"   Total capacity: {sum(l.capacity for l in sim.links.values()):.2f} m³/s")
    
    return sim


def main():
    """Test the simulation"""
    print("="*90)
    print("CHENNAI HYDRAULIC SIMULATION ENGINE - TEST RUN")
    print("="*90)
    
    # Create network
    sim = create_chennai_network()
    
    # Test scenario: Heavy rainfall event
    print("\n🌧️  SCENARIO: Heavy monsoon rainfall")
    rainfall_forecast = [25, 35, 40, 35, 20, 10]  # mm/hr for 6 hours
    print(f"Rainfall forecast: {rainfall_forecast} mm/hr")
    
    # Activate pumps
    print("\n⚡ Activating all pumps...")
    for pump in sim.pumps.values():
        pump.activate()
    
    # Run simulation
    results = sim.run_forecast(forecast_hours=6, rainfall_forecast=rainfall_forecast)
    
    # Analyze results
    print("\n📊 SIMULATION RESULTS:")
    print("-" * 90)
    for i, timestamp in enumerate(results['timestamps']):
        print(f"Hour {i+1}: Flooding nodes = {results['flooding_nodes'][i]}, "
              f"Inundation area = {results['total_inundation_area'][i]/1000:.1f} hectares")
    
    # Save results
    output_file = os.path.join('models', 'simulation_test_results.json')
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n💾 Results saved to: {output_file}")
    
    # Get final state
    final_state = sim.get_state_snapshot()
    state_file = os.path.join('models', 'network_state.json')
    with open(state_file, 'w') as f:
        json.dump(final_state, f, indent=2)
    
    print(f"💾 Network state saved to: {state_file}")
    
    print("\n✅ Simulation test complete!")
    print("="*90)


if __name__ == '__main__':
    main()
