import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Droplets, AlertTriangle, Activity, Zap, Settings, TrendingUp,
  Cloud, ThermometerSun, Wind, Eye, CheckCircle, XCircle, AlertCircle, Info, 
  Play, Pause, RotateCcw, SkipForward
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import FloodSimulation3D from './FloodSimulation3D';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const API_BASE = 'http://localhost:5000/api';

// Custom marker icons
const createCustomIcon = (color) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const icons = {
  critical: createCustomIcon('red'),
  high: createCustomIcon('orange'),
  warning: createCustomIcon('yellow'),
  normal: createCustomIcon('green'),
  flooding: createCustomIcon('violet'),
};

// =================================================================================================
// MAIN FLOOD DASHBOARD COMPONENT
// =================================================================================================

export default function FloodDashboard() {
  const [activeTab, setActiveTab] = useState('simulation3d');
  const [realtimeData, setRealtimeData] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [rainfallHistory, setRainfallHistory] = useState([]);
  const [networkStatus, setNetworkStatus] = useState(null);
  const [pumps, setPumps] = useState({});
  const [gates, setGates] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [simulationResults, setSimulationResults] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch data periodically
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch realtime data
        const realtimeRes = await fetch(`${API_BASE}/realtime`);
        const realtimeData = await realtimeRes.json();
        if (realtimeData.success) {
          setRealtimeData(realtimeData.data);
          setAlerts(realtimeData.data.alerts || []);
        }

        // Fetch hotspots
        const hotspotsRes = await fetch(`${API_BASE}/hotspots`);
        const hotspotsData = await hotspotsRes.json();
        if (hotspotsData.success) {
          setHotspots(hotspotsData.hotspots || []);
        }

        // Fetch network status
        const networkRes = await fetch(`${API_BASE}/network-status`);
        const networkData = await networkRes.json();
        if (networkData.success) {
          setNetworkStatus(networkData);
        }

        // Fetch pump status
        const pumpRes = await fetch(`${API_BASE}/pump-control`);
        const pumpData = await pumpRes.json();
        if (pumpData.success) {
          setPumps(pumpData.pumps);
        }

        // Fetch gate status
        const gateRes = await fetch(`${API_BASE}/gate-control`);
        const gateData = await gateRes.json();
        if (gateData.success) {
          setGates(gateData.gates);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        // Use fallback mock data when API is unavailable
        setRealtimeData({
          rainfall: 15 + Math.random() * 20,
          sensors: {
            'sensor_1': { lat: 13.0067, lon: 80.2575, water_depth: 2.3, water_level: 2.8, is_flooding: false, status: 'normal' },
            'sensor_2': { lat: 12.9755, lon: 80.2207, water_depth: 3.1, water_level: 3.5, is_flooding: true, status: 'warning' },
            'sensor_3': { lat: 12.9675, lon: 80.1491, water_depth: 4.2, water_level: 4.5, is_flooding: true, status: 'critical' },
            'sensor_4': { lat: 13.0857, lon: 80.2090, water_depth: 1.5, water_level: 1.8, is_flooding: false, status: 'normal' },
            'sensor_5': { lat: 12.9229, lon: 80.1275, water_depth: 2.0, water_level: 2.3, is_flooding: false, status: 'normal' },
          },
          alerts: [],
        });
        setHotspots([
          { lat: 12.9755, lon: 80.2207, risk: 'critical', name: 'Velachery Zone' },
          { lat: 12.9675, lon: 80.1491, risk: 'critical', name: 'Pallavaram Zone' },
          { lat: 13.0067, lon: 80.2575, risk: 'high', name: 'Adyar Basin' },
        ]);
        setNetworkStatus({ summary: { total_nodes: 45, flooding_nodes: 3, total_links: 120 } });
        setPumps({
          'pump_1': { active: true, flow: 2.5, capacity: 5.0, utilization: 50, node: 'Velachery' },
          'pump_2': { active: false, flow: 0, capacity: 4.0, utilization: 0, node: 'Adyar' },
          'pump_3': { active: true, flow: 3.2, capacity: 6.0, utilization: 53, node: 'Tambaram' },
        });
        setGates({
          'gate_1': { opening_percent: 75, link: 'Adyar River' },
          'gate_2': { opening_percent: 50, link: 'Cooum River' },
          'gate_3': { opening_percent: 80, link: 'Buckingham Canal' },
        });
        setLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Update every 5 seconds
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch rainfall history once
  useEffect(() => {
    const fetchRainfallHistory = async () => {
      try {
        const res = await fetch(`${API_BASE}/rainfall-history?days=30`);
        const data = await res.json();
        if (data.success) {
          setRainfallHistory(data.history || []);
        }
      } catch (error) {
        console.error('Error fetching rainfall history:', error);
      }
    };
    fetchRainfallHistory();
  }, []);

  // Control pump
  const controlPump = async (pumpId, action) => {
    try {
      const res = await fetch(`${API_BASE}/pump-control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pump_id: pumpId, action })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error controlling pump:', error);
    }
  };

  // Control gate
  const controlGate = async (gateId, opening) => {
    try {
      const res = await fetch(`${API_BASE}/gate-control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gate_id: gateId, opening: opening / 100 })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error controlling gate:', error);
    }
  };

  // Run simulation
  const runSimulation = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hours: 6,
          rainfall_forecast: [25, 35, 40, 35, 20, 10]
        })
      });
      const data = await res.json();
      if (data.success) {
        setSimulationResults(data.results);
        alert('Simulation completed! Check the Simulation Results tab.');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error running simulation:', error);
      setLoading(false);
    }
  };

  if (loading && !realtimeData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <Activity className="w-20 h-20 text-blue-500 animate-spin mx-auto mb-4" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Droplets className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Chennai Flood Management System</h2>
          <p className="text-gray-600">Initializing flood simulation...</p>
          <div className="mt-4 flex justify-center space-x-2">
            {[0, 1, 2].map(i => (
              <div 
                key={i}
                className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-blue-500">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Droplets className="w-10 h-10 text-blue-500" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Chennai Flood Management</h1>
                <p className="text-sm text-gray-600">Real-time Monitoring & Control System</p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-xs text-gray-500">Current Rainfall</p>
                <p className="text-2xl font-bold text-blue-600">
                  {realtimeData?.rainfall?.toFixed(1) || 0} mm/hr
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Active Alerts</p>
                <p className="text-2xl font-bold text-red-600">{alerts.length}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Alerts Bar */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="container mx-auto">
            <div className="flex items-start">
              <AlertTriangle className="w-6 h-6 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-red-800 font-semibold mb-2">Active Alerts</h3>
                <div className="space-y-1">
                  {alerts.slice(0, 3).map((alert, idx) => (
                    <p key={idx} className="text-red-700 text-sm">
                      • {alert.message} ({alert.location})
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b shadow">
        <div className="container mx-auto px-6">
          <nav className="flex space-x-8">
            {[
              { id: 'simulation3d', label: '🌊 3D Flood Simulation', icon: TrendingUp },
              { id: 'map', label: 'Flood Risk Map', icon: MapContainer },
              { id: 'control', label: 'Water Diversion Control', icon: Settings },
              { id: 'rainfall', label: 'Rainfall & Alerts', icon: Cloud },
              { id: 'simulation', label: 'Simulation Results', icon: TrendingUp },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-4 font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto px-6 py-6">
        {activeTab === 'simulation3d' && (
          <FloodSimulation3D />
        )}

        {activeTab === 'map' && (
          <FloodRiskMapTab
            realtimeData={realtimeData}
            hotspots={hotspots}
            networkStatus={networkStatus}
          />
        )}

        {activeTab === 'control' && (
          <WaterDiversionControlTab
            pumps={pumps}
            gates={gates}
            controlPump={controlPump}
            controlGate={controlGate}
            runSimulation={runSimulation}
            loading={loading}
          />
        )}

        {activeTab === 'rainfall' && (
          <RainfallAlertsTab
            rainfallHistory={rainfallHistory}
            alerts={alerts}
            realtimeData={realtimeData}
          />
        )}

        {activeTab === 'simulation' && (
          <SimulationResultsTab simulationResults={simulationResults} />
        )}
      </div>
    </div>
  );
}

// =================================================================================================
// TAB 1: FLOOD RISK MAP
// =================================================================================================

function FloodRiskMapTab({ realtimeData, hotspots, networkStatus }) {
  const [showLayers, setShowLayers] = useState({
    hotspots: true,
    sensors: true,
    flooding: true,
  });

  const sensors = realtimeData?.sensors || {};
  const floodingSensors = Object.entries(sensors).filter(([_, data]) => data.is_flooding);

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Map */}
      <div className="col-span-2 bg-white rounded-lg shadow-lg overflow-hidden">
        <MapContainer
          center={[13.0827, 80.2707]}
          zoom={11}
          style={{ height: '600px', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />

          {/* Hotspots */}
          {showLayers.hotspots &&
            hotspots.slice(0, 100).map((spot, idx) => (
              <Circle
                key={`hotspot-${idx}`}
                center={[spot.lat, spot.lon]}
                radius={200}
                pathOptions={{
                  color: spot.risk === 'critical' ? '#dc2626' : '#f97316',
                  fillColor: spot.risk === 'critical' ? '#dc2626' : '#f97316',
                  fillOpacity: 0.3,
                }}
              />
            ))}

          {/* Sensors */}
          {showLayers.sensors &&
            Object.entries(sensors).map(([id, data]) => (
              <Marker
                key={id}
                position={[data.lat, data.lon]}
                icon={icons[data.status] || icons.normal}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold">{id}</h3>
                    <p className="text-sm">Water Depth: {data.water_depth?.toFixed(2)}m</p>
                    <p className="text-sm">Level: {data.water_level?.toFixed(2)}m</p>
                    <p className="text-sm">
                      Status:{' '}
                      <span
                        className={`font-semibold ${
                          data.is_flooding ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {data.is_flooding ? 'FLOODING' : 'Normal'}
                      </span>
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* Flooding markers */}
          {showLayers.flooding &&
            floodingSensors.map(([id, data]) => (
              <Circle
                key={`flood-${id}`}
                center={[data.lat, data.lon]}
                radius={500}
                pathOptions={{
                  color: '#9333ea',
                  fillColor: '#9333ea',
                  fillOpacity: 0.4,
                }}
              />
            ))}
        </MapContainer>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Legend */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <Eye className="w-5 h-5 mr-2" />
            Map Layers
          </h3>
          <div className="space-y-3">
            {[
              { key: 'hotspots', label: 'Flood Hotspots', color: 'red' },
              { key: 'sensors', label: 'IoT Sensors', color: 'blue' },
              { key: 'flooding', label: 'Active Flooding', color: 'purple' },
            ].map((layer) => (
              <label key={layer.key} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLayers[layer.key]}
                  onChange={(e) =>
                    setShowLayers({ ...showLayers, [layer.key]: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm">{layer.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Network Summary */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold mb-4">Network Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Nodes</span>
              <span className="font-bold">{networkStatus?.summary?.total_nodes || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Flooding Nodes</span>
              <span className="font-bold text-red-600">
                {networkStatus?.summary?.flooding_nodes || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Links</span>
              <span className="font-bold">{networkStatus?.summary?.total_links || 0}</span>
            </div>
          </div>
        </div>

        {/* Hotspot Stats */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold mb-4 text-red-600">Flood Hotspots</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded">
              <span className="text-sm font-medium">Critical Risk Zones</span>
              <span className="font-bold text-red-600">
                {hotspots.filter((h) => h.risk === 'critical').length}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded">
              <span className="text-sm font-medium">High Risk Zones</span>
              <span className="font-bold text-orange-600">
                {hotspots.filter((h) => h.risk === 'high').length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =================================================================================================
// TAB 2: WATER DIVERSION CONTROL
// =================================================================================================

function WaterDiversionControlTab({ pumps, gates, controlPump, controlGate, runSimulation, loading }) {
  const [gateControls, setGateControls] = useState({});

  useEffect(() => {
    const initial = {};
    Object.entries(gates).forEach(([id, gate]) => {
      initial[id] = gate.opening_percent;
    });
    setGateControls(initial);
  }, [gates]);

  return (
    <div className="space-y-6">
      {/* Control Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Drainage Infrastructure Control</h2>
            <p className="text-gray-600">Manage pumps and gates for optimal water diversion</p>
          </div>
          <button
            onClick={runSimulation}
            disabled={loading}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition flex items-center space-x-2 disabled:opacity-50"
          >
            <TrendingUp className="w-5 h-5" />
            <span>{loading ? 'Running...' : 'Run Simulation'}</span>
          </button>
        </div>
      </div>

      {/* Pumps */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <Zap className="w-6 h-6 mr-2 text-yellow-500" />
          Drainage Pumps
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(pumps).map(([id, pump]) => (
            <div
              key={id}
              className={`border-2 rounded-lg p-4 ${
                pump.active ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold">{id}</h4>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    pump.active
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 text-gray-700'
                  }`}
                >
                  {pump.active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Flow Rate:</span>
                  <span className="font-semibold">{pump.flow?.toFixed(2)} m³/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Capacity:</span>
                  <span className="font-semibold">{pump.capacity?.toFixed(2)} m³/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Utilization:</span>
                  <span className="font-semibold">{pump.utilization?.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Location:</span>
                  <span className="font-semibold">{pump.node}</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => controlPump(id, 'activate')}
                  disabled={pump.active}
                  className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  <CheckCircle className="w-4 h-4 inline mr-1" />
                  Activate
                </button>
                <button
                  onClick={() => controlPump(id, 'deactivate')}
                  disabled={!pump.active}
                  className="flex-1 bg-red-500 text-white py-2 rounded hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  <XCircle className="w-4 h-4 inline mr-1" />
                  Deactivate
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gates */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <Settings className="w-6 h-6 mr-2 text-blue-500" />
          Control Gates
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(gates).map(([id, gate]) => (
            <div key={id} className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
              <h4 className="font-bold mb-3">{id}</h4>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Opening:</span>
                  <span className="font-semibold">{gate.opening_percent?.toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Link:</span>
                  <span className="font-semibold">{gate.link}</span>
                </div>
              </div>
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={gateControls[id] || gate.opening_percent}
                  onChange={(e) =>
                    setGateControls({ ...gateControls, [id]: parseInt(e.target.value) })
                  }
                  className="w-full"
                />
                <button
                  onClick={() => controlGate(id, gateControls[id] || gate.opening_percent)}
                  className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition text-sm font-medium"
                >
                  Set to {gateControls[id] || gate.opening_percent}%
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =================================================================================================
// TAB 3: RAINFALL & ALERTS
// =================================================================================================

function RainfallAlertsTab({ rainfallHistory, alerts, realtimeData }) {
  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Rainfall History Table */}
      <div className="col-span-2 bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <Cloud className="w-6 h-6 mr-2 text-blue-500" />
          Rainfall History (Last 30 Days)
        </h3>
        <div className="overflow-auto max-h-[600px]">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-right">Rainfall (mm)</th>
                <th className="px-4 py-2 text-right">Temperature (°C)</th>
              </tr>
            </thead>
            <tbody>
              {rainfallHistory.map((record, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">{record.date}</td>
                  <td className="px-4 py-2 text-right font-semibold">
                    {record.rainfall?.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right">{record.temperature?.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Current Conditions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold mb-4">Current Conditions</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
              <div className="flex items-center space-x-2">
                <Cloud className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium">Rainfall</span>
              </div>
              <span className="font-bold text-lg text-blue-600">
                {realtimeData?.rainfall?.toFixed(1) || 0} mm/hr
              </span>
            </div>
          </div>
        </div>

        {/* Active Alerts */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
            Active Alerts ({alerts.length})
          </h3>
          <div className="space-y-3 max-h-[400px] overflow-auto">
            {alerts.length === 0 ? (
              <p className="text-gray-500 text-sm">No active alerts</p>
            ) : (
              alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded border-l-4 ${
                    alert.level === 'critical'
                      ? 'bg-red-50 border-red-500'
                      : alert.level === 'warning'
                      ? 'bg-yellow-50 border-yellow-500'
                      : 'bg-blue-50 border-blue-500'
                  }`}
                >
                  <p className="font-semibold text-sm mb-1">{alert.message}</p>
                  <p className="text-xs text-gray-600">{alert.location}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =================================================================================================
// TAB 4: SIMULATION RESULTS
// =================================================================================================

function SimulationResultsTab({ simulationResults }) {
  if (!simulationResults) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-12 text-center">
        <Info className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-600 mb-2">No Simulation Results</h3>
        <p className="text-gray-500">
          Run a simulation from the Water Diversion Control tab to see results here.
        </p>
      </div>
    );
  }

  const hourly = simulationResults.hourly_summary || [];
  const summary = simulationResults.summary || {};

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <p className="text-sm text-gray-600 mb-2">Peak Flooding Nodes</p>
          <p className="text-3xl font-bold text-red-600">{summary.peak_flooding_nodes || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <p className="text-sm text-gray-600 mb-2">Peak Inundation</p>
          <p className="text-3xl font-bold text-blue-600">
            {summary.peak_inundation_hectares?.toFixed(1) || 0} ha
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <p className="text-sm text-gray-600 mb-2">Total Rainfall</p>
          <p className="text-3xl font-bold text-cyan-600">
            {summary.total_rainfall?.toFixed(1) || 0} mm
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <p className="text-sm text-gray-600 mb-2">Peak Hour</p>
          <p className="text-3xl font-bold text-orange-600">
            {summary.peak_flooding_hour || 0}
          </p>
        </div>
      </div>

      {/* Hourly Results Table */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4">Hourly Forecast Results</h3>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Hour</th>
                <th className="px-4 py-2 text-right">Rainfall (mm/hr)</th>
                <th className="px-4 py-2 text-right">Flooding Nodes</th>
                <th className="px-4 py-2 text-right">Inundation (ha)</th>
                <th className="px-4 py-2 text-right">Avg Water Depth (m)</th>
                <th className="px-4 py-2 text-right">Total Outflow (m³/s)</th>
              </tr>
            </thead>
            <tbody>
              {hourly.map((hour, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-semibold">Hour {hour.hour}</td>
                  <td className="px-4 py-2 text-right">{hour.rainfall?.toFixed(1)}</td>
                  <td
                    className={`px-4 py-2 text-right font-bold ${
                      hour.flooding_nodes > 10 ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {hour.flooding_nodes}
                  </td>
                  <td className="px-4 py-2 text-right">{hour.inundated_area_hectares?.toFixed(1)}</td>
                  <td className="px-4 py-2 text-right">{hour.avg_water_depth?.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">{hour.total_outflow?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
