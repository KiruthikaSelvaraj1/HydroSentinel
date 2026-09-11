/**
 * =================================================================================================
 * ENHANCED FLOOD DASHBOARD WITH LIVE DATA
 * =================================================================================================
 * Features:
 * - WebSocket real-time updates
 * - Live data indicators with status badges
 * - Enhanced sensor visualization
 * - Real-time charts and graphs
 * - Live weather integration
 * - Pump/Gate control with live feedback
 * =================================================================================================
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import {
  Droplets, AlertTriangle, Activity, Zap, Settings, TrendingUp,
  Cloud, ThermometerSun, Wind, Eye, CheckCircle, XCircle, AlertCircle, Info,
  Radio, Wifi, WifiOff, RefreshCw, MapPin, Gauge, Waves, CloudRain,
  Power, CircleDot, Clock, Signal, Battery, Thermometer
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// API Configuration
const API_BASE = 'http://localhost:5000/api/v2';
const LEGACY_API_BASE = 'http://localhost:5000/api';
const WS_URL = 'http://localhost:5000';

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
  danger: createCustomIcon('red'),
  high: createCustomIcon('orange'),
  warning: createCustomIcon('yellow'),
  elevated: createCustomIcon('yellow'),
  normal: createCustomIcon('green'),
  flooding: createCustomIcon('violet'),
  active: createCustomIcon('blue'),
  standby: createCustomIcon('grey'),
};

// =================================================================================================
// LIVE STATUS BADGE COMPONENT
// =================================================================================================

function LiveStatusBadge({ isLive, lastUpdate }) {
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => !p);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const timeSinceUpdate = lastUpdate 
    ? Math.floor((new Date() - new Date(lastUpdate)) / 1000)
    : null;

  return (
    <div className="flex items-center space-x-2">
      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold
        ${isLive ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
        <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500' : 'bg-yellow-500'} 
          ${isLive && pulse ? 'animate-pulse' : ''}`} />
        <span>{isLive ? 'LIVE' : 'CACHED'}</span>
      </div>
      {timeSinceUpdate !== null && (
        <span className="text-xs text-gray-500">
          Updated {timeSinceUpdate}s ago
        </span>
      )}
    </div>
  );
}

// =================================================================================================
// SENSOR STATUS CARD COMPONENT
// =================================================================================================

function SensorCard({ sensor }) {
  const getStatusColor = (status) => {
    const colors = {
      critical: 'border-red-500 bg-red-50',
      danger: 'border-red-500 bg-red-50',
      warning: 'border-yellow-500 bg-yellow-50',
      elevated: 'border-yellow-500 bg-yellow-50',
      normal: 'border-green-500 bg-green-50',
      active: 'border-blue-500 bg-blue-50',
      standby: 'border-gray-500 bg-gray-50',
      heavy: 'border-purple-500 bg-purple-50',
      moderate: 'border-orange-500 bg-orange-50',
      light: 'border-cyan-500 bg-cyan-50',
      dry: 'border-gray-300 bg-gray-50',
    };
    return colors[status] || 'border-gray-300 bg-gray-50';
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      critical: 'bg-red-500',
      danger: 'bg-red-500',
      warning: 'bg-yellow-500',
      elevated: 'bg-yellow-500',
      normal: 'bg-green-500',
      active: 'bg-blue-500',
      standby: 'bg-gray-500',
      heavy: 'bg-purple-500',
      moderate: 'bg-orange-500',
      light: 'bg-cyan-500',
      dry: 'bg-gray-400',
    };
    return colors[status] || 'bg-gray-400';
  };

  const getSensorIcon = (type) => {
    switch (type) {
      case 'water_level': return <Waves className="w-5 h-5" />;
      case 'rain_gauge': return <CloudRain className="w-5 h-5" />;
      case 'pump': return <Power className="w-5 h-5" />;
      default: return <CircleDot className="w-5 h-5" />;
    }
  };

  return (
    <div className={`border-2 rounded-lg p-4 ${getStatusColor(sensor.status)} transition-all duration-300 hover:shadow-lg`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          {getSensorIcon(sensor.sensor_type)}
          <span className="font-semibold text-sm">{sensor.location_name}</span>
        </div>
        <span className={`${getStatusBadgeColor(sensor.status)} text-white text-xs px-2 py-0.5 rounded-full uppercase`}>
          {sensor.status}
        </span>
      </div>
      
      <div className="text-3xl font-bold mb-2">
        {typeof sensor.value === 'number' ? sensor.value.toFixed(2) : sensor.value}
        <span className="text-sm text-gray-500 ml-1">{sensor.unit}</span>
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-1">
          <MapPin className="w-3 h-3" />
          <span>{sensor.zone}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <Battery className="w-3 h-3" />
            <span>{sensor.battery_percent?.toFixed(0)}%</span>
          </div>
          <div className="flex items-center space-x-1">
            <Signal className="w-3 h-3" />
            <span>{sensor.signal_strength}dBm</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =================================================================================================
// WEATHER WIDGET COMPONENT
// =================================================================================================

function WeatherWidget({ weather }) {
  if (!weather) return null;

  return (
    <div className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white rounded-lg p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold opacity-90">Current Weather</h3>
          <p className="text-sm opacity-75">{weather.location}</p>
        </div>
        <LiveStatusBadge isLive={weather.is_live} />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-5xl font-bold">{weather.temperature_c?.toFixed(1)}°C</div>
          <div className="text-sm opacity-75 mt-1">{weather.weather_description}</div>
        </div>
        <div className="text-right space-y-2">
          <div className="flex items-center justify-end space-x-2">
            <Droplets className="w-4 h-4" />
            <span>{weather.humidity_percent}%</span>
          </div>
          <div className="flex items-center justify-end space-x-2">
            <Wind className="w-4 h-4" />
            <span>{weather.wind_speed_ms?.toFixed(1)} m/s</span>
          </div>
          <div className="flex items-center justify-end space-x-2">
            <CloudRain className="w-4 h-4" />
            <span>{weather.rainfall_1h_mm?.toFixed(1)} mm/hr</span>
          </div>
        </div>
      </div>

      {weather.rainfall_1h_mm > 0 && (
        <div className="mt-4 p-3 bg-white/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              {weather.rainfall_1h_mm > 20 ? 'Heavy' : weather.rainfall_1h_mm > 5 ? 'Moderate' : 'Light'} rainfall detected
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// =================================================================================================
// STATISTICS PANEL COMPONENT
// =================================================================================================

function StatisticsPanel({ statistics }) {
  if (!statistics) return null;

  const stats = [
    { label: 'Avg Water Level', value: `${statistics.avg_water_level_m?.toFixed(2) || 0}m`, icon: Waves, color: 'blue' },
    { label: 'Max Water Level', value: `${statistics.max_water_level_m?.toFixed(2) || 0}m`, icon: TrendingUp, color: 'orange' },
    { label: 'Current Rainfall', value: `${statistics.current_rainfall_mm_hr?.toFixed(1) || 0}mm/hr`, icon: CloudRain, color: 'cyan' },
    { label: 'Active Pumps', value: `${statistics.active_pumps || 0}/${statistics.total_pumps || 0}`, icon: Power, color: 'green' },
    { label: 'Critical Alerts', value: statistics.critical_alerts || 0, icon: AlertTriangle, color: 'red' },
    { label: 'Warning Alerts', value: statistics.warning_alerts || 0, icon: AlertCircle, color: 'yellow' },
    { label: 'Sensors Online', value: statistics.sensors_online || 0, icon: Radio, color: 'purple' },
    { label: 'Water Stations', value: statistics.water_stations_online || 0, icon: Gauge, color: 'indigo' },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((stat, idx) => (
        <div key={idx} className={`bg-white rounded-lg shadow p-4 border-l-4 border-${stat.color}-500`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </div>
            <stat.icon className={`w-8 h-8 text-${stat.color}-500 opacity-50`} />
          </div>
        </div>
      ))}
    </div>
  );
}

// =================================================================================================
// ALERTS PANEL COMPONENT
// =================================================================================================

function AlertsPanel({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-green-700">All Systems Normal</h3>
        <p className="text-sm text-green-600">No active alerts at this time</p>
      </div>
    );
  }

  const criticalAlerts = alerts.filter(a => a.level === 'critical');
  const warningAlerts = alerts.filter(a => a.level === 'warning');

  return (
    <div className="space-y-4">
      {criticalAlerts.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-red-700">Critical Alerts ({criticalAlerts.length})</h3>
          </div>
          <div className="space-y-2">
            {criticalAlerts.slice(0, 5).map((alert, idx) => (
              <div key={idx} className="text-sm text-red-700 flex items-start space-x-2">
                <span>•</span>
                <span>{alert.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {warningAlerts.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            <h3 className="font-bold text-yellow-700">Warnings ({warningAlerts.length})</h3>
          </div>
          <div className="space-y-2">
            {warningAlerts.slice(0, 5).map((alert, idx) => (
              <div key={idx} className="text-sm text-yellow-700 flex items-start space-x-2">
                <span>•</span>
                <span>{alert.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =================================================================================================
// RAINFALL CHART COMPONENT
// =================================================================================================

function RainfallChart({ history }) {
  if (!history || history.length === 0) return null;

  // Sample data for better performance (every 5th point)
  const chartData = history
    .filter((_, idx) => idx % 5 === 0)
    .slice(-50)
    .map((item, idx) => ({
      time: new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      rainfall: item.intensity || 0
    }));

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-bold mb-4 flex items-center">
        <CloudRain className="w-5 h-5 mr-2 text-blue-500" />
        Rainfall Intensity (Last 24 Hours)
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="time" tick={{ fontSize: 10 }} />
          <YAxis unit=" mm/hr" tick={{ fontSize: 10 }} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
            labelStyle={{ fontWeight: 'bold' }}
          />
          <Area 
            type="monotone" 
            dataKey="rainfall" 
            stroke="#3b82f6" 
            fill="url(#rainfallGradient)" 
            strokeWidth={2}
          />
          <defs>
            <linearGradient id="rainfallGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// =================================================================================================
// WATER LEVEL STATIONS PANEL
// =================================================================================================

function WaterStationsPanel({ stations }) {
  if (!stations || Object.keys(stations).length === 0) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'danger': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'rising': return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'falling': return <TrendingUp className="w-4 h-4 text-green-500 transform rotate-180" />;
      default: return <div className="w-4 h-4 flex items-center"><div className="w-full h-0.5 bg-gray-400" /></div>;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-bold mb-4 flex items-center">
        <Waves className="w-5 h-5 mr-2 text-blue-500" />
        Water Level Monitoring Stations
      </h3>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {Object.entries(stations).map(([id, station]) => (
          <div key={id} className={`border rounded-lg p-3 ${getStatusColor(station.status)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">{station.station_name}</span>
              <div className="flex items-center space-x-2">
                {getTrendIcon(station.trend)}
                <span className="text-xs uppercase font-medium px-2 py-0.5 rounded">
                  {station.status}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Level:</span>
                <span className="font-bold ml-1">{station.water_level_m?.toFixed(2)}m</span>
              </div>
              <div>
                <span className="text-gray-500">Danger:</span>
                <span className="font-bold ml-1">{station.danger_level_m}m</span>
              </div>
              <div>
                <span className="text-gray-500">Flow:</span>
                <span className="font-bold ml-1">{station.flow_rate_cumecs?.toFixed(1)} cumecs</span>
              </div>
            </div>
            {/* Water level progress bar */}
            <div className="mt-2">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${station.status === 'danger' ? 'bg-red-500' : station.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(100, (station.water_level_m / station.danger_level_m) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =================================================================================================
// PUMP CONTROL PANEL
// =================================================================================================

function PumpControlPanel({ pumps, onControlPump }) {
  if (!pumps || Object.keys(pumps).length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-bold mb-4 flex items-center">
        <Zap className="w-5 h-5 mr-2 text-yellow-500" />
        Pump Control System
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(pumps).map(([id, pump]) => (
          <div 
            key={id} 
            className={`border-2 rounded-lg p-4 transition-all ${
              pump.is_active 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-300 bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-sm">{id}</span>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold ${
                pump.is_active ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'
              }`}>
                <div className={`w-2 h-2 rounded-full ${pump.is_active ? 'bg-white animate-pulse' : 'bg-gray-300'}`} />
                <span>{pump.is_active ? 'ACTIVE' : 'STANDBY'}</span>
              </div>
            </div>
            
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Flow:</span>
                <span className="font-semibold">{pump.current_flow?.toFixed(2)} m³/s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Capacity:</span>
                <span className="font-semibold">{pump.capacity} m³/s</span>
              </div>
              {/* Utilization bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Utilization</span>
                  <span className="font-medium">{pump.utilization?.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${pump.utilization || 0}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => onControlPump(id, 'activate')}
                disabled={pump.is_active}
                className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
              >
                Activate
              </button>
              <button
                onClick={() => onControlPump(id, 'deactivate')}
                disabled={!pump.is_active}
                className="flex-1 bg-red-500 text-white py-2 rounded hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
              >
                Deactivate
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =================================================================================================
// MAIN ENHANCED DASHBOARD COMPONENT
// =================================================================================================

export default function EnhancedFloodDashboard() {
  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Data state
  const [realtimeData, setRealtimeData] = useState(null);
  const [weather, setWeather] = useState(null);
  const [sensors, setSensors] = useState({});
  const [waterStations, setWaterStations] = useState({});
  const [statistics, setStatistics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [rainfallHistory, setRainfallHistory] = useState([]);
  const [pumps, setPumps] = useState({});
  const [gates, setGates] = useState({});
  const [hotspots, setHotspots] = useState([]);
  const [simulatorData, setSimulatorData] = useState(null);

  // Refs
  const updateIntervalRef = useRef(null);

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    try {
      // Fetch realtime data
      const realtimeRes = await fetch(`${API_BASE}/realtime`);
      const realtimeJson = await realtimeRes.json();
      
      if (realtimeJson.success) {
        const data = realtimeJson.data;
        setRealtimeData(data);
        setWeather(data.weather);
        setSensors(data.sensors || {});
        setWaterStations(data.water_levels || {});
        setStatistics(data.statistics);
        setAlerts(data.alerts || []);
        setSimulatorData(data.simulator);
        setLastUpdate(realtimeJson.server_time);
        setIsConnected(true);
      }

      // Fetch pumps
      const pumpsRes = await fetch(`${API_BASE}/pumps`);
      const pumpsJson = await pumpsRes.json();
      if (pumpsJson.success) {
        setPumps(pumpsJson.pumps || {});
      }

      // Fetch gates
      const gatesRes = await fetch(`${API_BASE}/gates`);
      const gatesJson = await gatesRes.json();
      if (gatesJson.success) {
        setGates(gatesJson.gates || {});
      }

      // Fetch hotspots
      const hotspotsRes = await fetch(`${API_BASE}/hotspots`);
      const hotspotsJson = await hotspotsRes.json();
      if (hotspotsJson.success) {
        setHotspots(hotspotsJson.hotspots || []);
      }

      // Fetch rainfall history
      const rainfallRes = await fetch(`${API_BASE}/rainfall/live?hours=24`);
      const rainfallJson = await rainfallRes.json();
      if (rainfallJson.success) {
        setRainfallHistory(rainfallJson.history || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsConnected(false);
      
      // Try legacy API as fallback
      try {
        const legacyRes = await fetch(`${LEGACY_API_BASE}/realtime`);
        const legacyJson = await legacyRes.json();
        if (legacyJson.success) {
          setRealtimeData(legacyJson.data);
          setAlerts(legacyJson.data.alerts || []);
          setIsConnected(true);
        }
      } catch (legacyError) {
        console.error('Legacy API also failed:', legacyError);
      }
      
      setLoading(false);
    }
  }, []);

  // Control pump
  const controlPump = async (pumpId, action) => {
    try {
      const res = await fetch(`${API_BASE}/pumps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pump_id: pumpId, action })
      });
      const data = await res.json();
      if (data.success) {
        // Refresh pump data
        fetchAllData();
      }
    } catch (error) {
      console.error('Error controlling pump:', error);
    }
  };

  // Control gate
  const controlGate = async (gateId, opening) => {
    try {
      const res = await fetch(`${API_BASE}/gates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gate_id: gateId, opening })
      });
      const data = await res.json();
      if (data.success) {
        fetchAllData();
      }
    } catch (error) {
      console.error('Error controlling gate:', error);
    }
  };

  // Setup data fetching
  useEffect(() => {
    fetchAllData();
    
    // Update every 5 seconds
    updateIntervalRef.current = setInterval(fetchAllData, 5000);
    
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [fetchAllData]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <Activity className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Droplets className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Chennai Flood Management System</h2>
          <p className="text-gray-600">Connecting to live data services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-blue-500">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 p-2 rounded-lg">
                <Droplets className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Chennai Flood Management System</h1>
                <p className="text-sm text-gray-600">Real-time Monitoring & Control Platform</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <Wifi className="w-5 h-5 text-green-500" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-500" />
                )}
                <LiveStatusBadge isLive={isConnected} lastUpdate={lastUpdate} />
              </div>
              
              {/* Quick Stats */}
              <div className="flex items-center space-x-4">
                <div className="text-center px-4 py-2 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-500">Rainfall</p>
                  <p className="text-xl font-bold text-blue-600">
                    {statistics?.current_rainfall_mm_hr?.toFixed(1) || 0} mm/hr
                  </p>
                </div>
                <div className="text-center px-4 py-2 bg-red-50 rounded-lg">
                  <p className="text-xs text-gray-500">Alerts</p>
                  <p className="text-xl font-bold text-red-600">
                    {(statistics?.critical_alerts || 0) + (statistics?.warning_alerts || 0)}
                  </p>
                </div>
                <div className="text-center px-4 py-2 bg-green-50 rounded-lg">
                  <p className="text-xs text-gray-500">Sensors</p>
                  <p className="text-xl font-bold text-green-600">
                    {statistics?.sensors_online || 0} Online
                  </p>
                </div>
              </div>

              {/* Refresh Button */}
              <button 
                onClick={fetchAllData}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
              >
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div className={`${alerts.some(a => a.level === 'critical') ? 'bg-red-500' : 'bg-yellow-500'} text-white py-2`}>
          <div className="container mx-auto px-6">
            <div className="flex items-center space-x-4 overflow-x-auto">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <div className="flex space-x-6">
                {alerts.slice(0, 3).map((alert, idx) => (
                  <span key={idx} className="text-sm whitespace-nowrap">
                    • {alert.message}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-6">
          <nav className="flex space-x-1">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'map', label: 'Flood Map', icon: MapPin },
              { id: 'sensors', label: 'IoT Sensors', icon: Radio },
              { id: 'control', label: 'Pump Control', icon: Zap },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Statistics */}
            <StatisticsPanel statistics={statistics} />

            <div className="grid grid-cols-3 gap-6">
              {/* Weather Widget */}
              <div className="col-span-1">
                <WeatherWidget weather={weather} />
              </div>

              {/* Alerts */}
              <div className="col-span-2">
                <AlertsPanel alerts={alerts} />
              </div>
            </div>

            {/* Rainfall Chart */}
            <RainfallChart history={rainfallHistory} />

            <div className="grid grid-cols-2 gap-6">
              {/* Water Stations */}
              <WaterStationsPanel stations={waterStations} />

              {/* Quick Pump Status */}
              <PumpControlPanel pumps={pumps} onControlPump={controlPump} />
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <MapContainer
              center={[13.0827, 80.2707]}
              zoom={11}
              style={{ height: '700px', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />

              {/* Hotspots */}
              {hotspots.map((spot, idx) => (
                <Circle
                  key={`hotspot-${idx}`}
                  center={[spot.lat, spot.lon]}
                  radius={300}
                  pathOptions={{
                    color: spot.severity === 'critical' ? '#dc2626' : '#f97316',
                    fillColor: spot.severity === 'critical' ? '#dc2626' : '#f97316',
                    fillOpacity: 0.4,
                  }}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold text-red-600">{spot.name}</h3>
                      <p className="text-sm">Status: {spot.status}</p>
                      <p className="text-sm">Value: {spot.value} {spot.unit}</p>
                    </div>
                  </Popup>
                </Circle>
              ))}

              {/* Sensors */}
              {Object.entries(sensors).map(([id, sensor]) => (
                <Marker
                  key={id}
                  position={[sensor.latitude, sensor.longitude]}
                  icon={icons[sensor.status] || icons.normal}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold">{sensor.location_name}</h3>
                      <p className="text-sm">Type: {sensor.sensor_type}</p>
                      <p className="text-sm">Value: {sensor.value} {sensor.unit}</p>
                      <p className="text-sm">Status: <span className={sensor.status === 'critical' ? 'text-red-600 font-bold' : ''}>{sensor.status}</span></p>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Water Stations */}
              {Object.entries(waterStations).map(([id, station]) => (
                <Marker
                  key={`ws-${id}`}
                  position={[station.latitude, station.longitude]}
                  icon={icons[station.status] || icons.normal}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold">{station.station_name}</h3>
                      <p className="text-sm">Water Level: {station.water_level_m?.toFixed(2)}m</p>
                      <p className="text-sm">Danger Level: {station.danger_level_m}m</p>
                      <p className="text-sm">Flow: {station.flow_rate_cumecs?.toFixed(1)} cumecs</p>
                      <p className="text-sm">Trend: {station.trend}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}

        {activeTab === 'sensors' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">IoT Sensor Network</h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  {Object.keys(sensors).length} sensors online
                </span>
                <LiveStatusBadge isLive={isConnected} lastUpdate={lastUpdate} />
              </div>
            </div>

            {/* Water Level Sensors */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Waves className="w-5 h-5 mr-2 text-blue-500" />
                Water Level Sensors
              </h3>
              <div className="grid grid-cols-4 gap-4">
                {Object.entries(sensors)
                  .filter(([_, s]) => s.sensor_type === 'water_level')
                  .map(([id, sensor]) => (
                    <SensorCard key={id} sensor={sensor} />
                  ))}
              </div>
            </div>

            {/* Rain Gauges */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <CloudRain className="w-5 h-5 mr-2 text-cyan-500" />
                Rain Gauge Stations
              </h3>
              <div className="grid grid-cols-4 gap-4">
                {Object.entries(sensors)
                  .filter(([_, s]) => s.sensor_type === 'rain_gauge')
                  .map(([id, sensor]) => (
                    <SensorCard key={id} sensor={sensor} />
                  ))}
              </div>
            </div>

            {/* Pump Sensors */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Power className="w-5 h-5 mr-2 text-yellow-500" />
                Pump Stations
              </h3>
              <div className="grid grid-cols-4 gap-4">
                {Object.entries(sensors)
                  .filter(([_, s]) => s.sensor_type === 'pump')
                  .map(([id, sensor]) => (
                    <SensorCard key={id} sensor={sensor} />
                  ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'control' && (
          <div className="space-y-6">
            <PumpControlPanel pumps={pumps} onControlPump={controlPump} />
            
            {/* Gate Control */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-gray-600" />
                Gate Control System
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(gates).map(([id, gate]) => (
                  <div key={id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold">{id}</span>
                      <span className="text-sm text-gray-500">Link: {gate.link}</span>
                    </div>
                    <div className="mb-3">
                      <label className="text-sm text-gray-600">Opening: {gate.opening_percent?.toFixed(0)}%</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={gate.opening_percent || 50}
                        onChange={(e) => controlGate(id, parseInt(e.target.value))}
                        className="w-full mt-1"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => controlGate(id, 100)}
                        className="flex-1 bg-green-500 text-white py-1 rounded text-xs hover:bg-green-600"
                      >
                        Full Open
                      </button>
                      <button
                        onClick={() => controlGate(id, 0)}
                        className="flex-1 bg-red-500 text-white py-1 rounded text-xs hover:bg-red-600"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <RainfallChart history={rainfallHistory} />
            
            <div className="grid grid-cols-2 gap-6">
              <WaterStationsPanel stations={waterStations} />
              
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold mb-4">System Performance</h3>
                <div className="space-y-4">
                  {simulatorData && (
                    <>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span>Total Network Nodes</span>
                        <span className="font-bold">{simulatorData.network_stats?.total_nodes || 0}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                        <span>Flooding Nodes</span>
                        <span className="font-bold text-red-600">{simulatorData.network_stats?.flooding_nodes || 0}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                        <span>Active Pumps</span>
                        <span className="font-bold text-green-600">
                          {simulatorData.network_stats?.active_pumps || 0}/{simulatorData.network_stats?.total_pumps || 0}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-4 mt-8">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="font-semibold">Chennai Flood Management System</span>
              <span className="mx-2">•</span>
              <span className="text-gray-400">Real-time Monitoring Platform</span>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span>Last Update: {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'N/A'}</span>
              <span>•</span>
              <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                {isConnected ? '● Connected' : '○ Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
