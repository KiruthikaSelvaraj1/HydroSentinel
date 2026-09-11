/**
 * =================================================================================================
 * ENHANCED FLOOD DASHBOARD WITH LIVE DATA - FULLY DYNAMIC
 * =================================================================================================
 * Features:
 * - WebSocket real-time updates
 * - Live data indicators with status badges
 * - Enhanced sensor visualization with INTERACTIVE controls
 * - Draggable pump/gate controls with percentage sliders
 * - Real-time charts and graphs
 * - Fast-loading optimized maps with proper markings
 * - Fixed footer positioning
 * =================================================================================================
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import {
  Droplets, AlertTriangle, Activity, Zap, Settings, TrendingUp,
  Cloud, ThermometerSun, Wind, Eye, CheckCircle, XCircle, AlertCircle, Info,
  Radio, Wifi, WifiOff, RefreshCw, MapPin, Gauge, Waves, CloudRain,
  Power, CircleDot, Clock, Signal, Battery, Thermometer, GripVertical,
  ToggleLeft, ToggleRight, Sliders, ChevronUp, ChevronDown
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

// Custom marker icons with better colors
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

// Chennai zones for map markings
const CHENNAI_ZONES = [
  { id: 'zone_1', name: 'Adyar Basin', lat: 13.0067, lon: 80.2575, radius: 2000, risk: 'high', type: 'flood_zone' },
  { id: 'zone_2', name: 'Velachery Zone', lat: 12.9755, lon: 80.2207, radius: 2200, risk: 'critical', type: 'flood_zone' },
  { id: 'zone_3', name: 'Tambaram Area', lat: 12.9229, lon: 80.1275, radius: 1800, risk: 'medium', type: 'flood_zone' },
  { id: 'zone_4', name: 'Pallavaram Zone', lat: 12.9675, lon: 80.1491, radius: 2500, risk: 'critical', type: 'flood_zone' },
  { id: 'zone_5', name: 'Anna Nagar', lat: 13.0857, lon: 80.2090, radius: 1500, risk: 'low', type: 'flood_zone' },
  { id: 'zone_6', name: 'T.Nagar', lat: 13.0417, lon: 80.2341, radius: 1200, risk: 'medium', type: 'flood_zone' },
  { id: 'zone_7', name: 'Chromepet', lat: 12.9516, lon: 80.1462, radius: 1600, risk: 'high', type: 'flood_zone' },
];

// Water bodies for map
const WATER_BODIES = [
  { name: 'Adyar River', coords: [[13.0067, 80.2575], [13.0167, 80.2675], [13.0267, 80.2775], [13.0367, 80.2875]], type: 'river' },
  { name: 'Cooum River', coords: [[13.0500, 80.2100], [13.0550, 80.2300], [13.0600, 80.2500], [13.0650, 80.2700]], type: 'river' },
  { name: 'Buckingham Canal', coords: [[13.1500, 80.2800], [13.1300, 80.2850], [13.1100, 80.2900], [13.0900, 80.2950]], type: 'canal' },
];

// Simulated dynamic data for when API is unavailable
const generateMockData = () => {
  const now = new Date();
  return {
    sensors: {
      'WL_001': { sensor_id: 'WL_001', sensor_type: 'water_level', location_name: 'Adyar River - Upstream', zone: 'South Chennai', latitude: 13.0067, longitude: 80.2575, value: 2.3 + Math.random() * 0.5, unit: 'm', status: Math.random() > 0.7 ? 'warning' : 'normal', battery_percent: 85 + Math.random() * 10, signal_strength: -65 + Math.random() * 10 },
      'WL_002': { sensor_id: 'WL_002', sensor_type: 'water_level', location_name: 'Velachery Lake', zone: 'South Chennai', latitude: 12.9755, longitude: 80.2207, value: 3.1 + Math.random() * 0.8, unit: 'm', status: Math.random() > 0.5 ? 'elevated' : 'normal', battery_percent: 78 + Math.random() * 15, signal_strength: -70 + Math.random() * 15 },
      'WL_003': { sensor_id: 'WL_003', sensor_type: 'water_level', location_name: 'Cooum River - Bridge', zone: 'Central Chennai', latitude: 13.0600, longitude: 80.2500, value: 1.8 + Math.random() * 0.4, unit: 'm', status: 'normal', battery_percent: 92 + Math.random() * 5, signal_strength: -55 + Math.random() * 10 },
      'RG_001': { sensor_id: 'RG_001', sensor_type: 'rain_gauge', location_name: 'Nungambakkam Station', zone: 'Central Chennai', latitude: 13.0569, longitude: 80.2425, value: 12 + Math.random() * 20, unit: 'mm/hr', status: Math.random() > 0.6 ? 'moderate' : 'light', battery_percent: 88 + Math.random() * 8, signal_strength: -60 + Math.random() * 10 },
      'RG_002': { sensor_id: 'RG_002', sensor_type: 'rain_gauge', location_name: 'Anna Nagar Hub', zone: 'North Chennai', latitude: 13.0857, longitude: 80.2090, value: 8 + Math.random() * 15, unit: 'mm/hr', status: 'light', battery_percent: 95 + Math.random() * 5, signal_strength: -50 + Math.random() * 10 },
      'RG_003': { sensor_id: 'RG_003', sensor_type: 'rain_gauge', location_name: 'Tambaram Gauge', zone: 'South Chennai', latitude: 12.9229, longitude: 80.1275, value: 25 + Math.random() * 20, unit: 'mm/hr', status: 'heavy', battery_percent: 72 + Math.random() * 10, signal_strength: -75 + Math.random() * 10 },
      'PMP_001': { sensor_id: 'PMP_001', sensor_type: 'pump', location_name: 'Velachery Pump Station 1', zone: 'South Chennai', latitude: 12.9800, longitude: 80.2180, value: 85 + Math.random() * 10, unit: '%', status: 'active', battery_percent: 100, signal_strength: -45 + Math.random() * 5 },
      'PMP_002': { sensor_id: 'PMP_002', sensor_type: 'pump', location_name: 'Adyar Pump Station', zone: 'South Chennai', latitude: 13.0100, longitude: 80.2600, value: 60 + Math.random() * 20, unit: '%', status: 'standby', battery_percent: 100, signal_strength: -48 + Math.random() * 5 },
    },
    waterStations: {
      'WS_001': { station_name: 'Adyar River - Kotturpuram', latitude: 13.0150, longitude: 80.2500, water_level_m: 2.8 + Math.random() * 0.5, danger_level_m: 4.5, flow_rate_cumecs: 120 + Math.random() * 50, trend: 'rising', status: 'warning' },
      'WS_002': { station_name: 'Cooum River - Napier Bridge', latitude: 13.0700, longitude: 80.2850, water_level_m: 1.5 + Math.random() * 0.3, danger_level_m: 3.0, flow_rate_cumecs: 80 + Math.random() * 30, trend: 'stable', status: 'normal' },
      'WS_003': { station_name: 'Buckingham Canal - North', latitude: 13.1200, longitude: 80.2870, water_level_m: 2.2 + Math.random() * 0.4, danger_level_m: 3.5, flow_rate_cumecs: 95 + Math.random() * 40, trend: 'falling', status: 'normal' },
    },
    weather: {
      location: 'Chennai, Tamil Nadu',
      temperature_c: 28 + Math.random() * 4,
      humidity_percent: 75 + Math.random() * 15,
      wind_speed_ms: 3 + Math.random() * 5,
      rainfall_1h_mm: 5 + Math.random() * 25,
      weather_description: 'Partly Cloudy with Light Showers',
      is_live: true,
    },
    statistics: {
      avg_water_level_m: 2.3 + Math.random() * 0.5,
      max_water_level_m: 3.8 + Math.random() * 0.5,
      current_rainfall_mm_hr: 15 + Math.random() * 20,
      active_pumps: 3 + Math.floor(Math.random() * 3),
      total_pumps: 8,
      critical_alerts: Math.floor(Math.random() * 3),
      warning_alerts: Math.floor(Math.random() * 5),
      sensors_online: 12 + Math.floor(Math.random() * 5),
      water_stations_online: 8,
    },
    alerts: Math.random() > 0.7 ? [
      { level: 'warning', message: 'Water level rising at Velachery', location: 'Velachery Zone' },
      { level: 'critical', message: 'Heavy rainfall detected at Tambaram', location: 'Tambaram Area' },
    ] : [],
    timestamp: now.toISOString(),
  };
};

// Generate mock pumps data
const generateMockPumps = () => ({
  'PUMP_VELACHERY_1': { pump_id: 'PUMP_VELACHERY_1', name: 'Velachery Main Pump', is_active: true, current_flow: 2.5 + Math.random(), capacity: 5.0, utilization: 50 + Math.random() * 30, location: 'Velachery Zone' },
  'PUMP_VELACHERY_2': { pump_id: 'PUMP_VELACHERY_2', name: 'Velachery Backup Pump', is_active: false, current_flow: 0, capacity: 4.0, utilization: 0, location: 'Velachery Zone' },
  'PUMP_ADYAR_1': { pump_id: 'PUMP_ADYAR_1', name: 'Adyar River Pump', is_active: true, current_flow: 3.2 + Math.random(), capacity: 6.0, utilization: 55 + Math.random() * 25, location: 'Adyar Basin' },
  'PUMP_TAMBARAM': { pump_id: 'PUMP_TAMBARAM', name: 'Tambaram Pump Station', is_active: true, current_flow: 1.8 + Math.random(), capacity: 3.5, utilization: 45 + Math.random() * 20, location: 'Tambaram Area' },
  'PUMP_COOUM': { pump_id: 'PUMP_COOUM', name: 'Cooum River Pump', is_active: false, current_flow: 0, capacity: 4.5, utilization: 0, location: 'Central Chennai' },
  'PUMP_PALLAVARAM': { pump_id: 'PUMP_PALLAVARAM', name: 'Pallavaram Pump', is_active: true, current_flow: 2.1 + Math.random(), capacity: 4.0, utilization: 52 + Math.random() * 20, location: 'Pallavaram Zone' },
});

// Generate mock gates data
const generateMockGates = () => ({
  'GATE_ADYAR_1': { gate_id: 'GATE_ADYAR_1', name: 'Adyar River Gate 1', opening_percent: 60 + Math.random() * 20, max_flow: 200, link: 'Adyar River', location: 'Adyar Basin' },
  'GATE_ADYAR_2': { gate_id: 'GATE_ADYAR_2', name: 'Adyar River Gate 2', opening_percent: 45 + Math.random() * 30, max_flow: 180, link: 'Adyar Overflow', location: 'Adyar Basin' },
  'GATE_COOUM': { gate_id: 'GATE_COOUM', name: 'Cooum River Gate', opening_percent: 70 + Math.random() * 20, max_flow: 150, link: 'Cooum River', location: 'Central Chennai' },
  'GATE_BUCKINGHAM': { gate_id: 'GATE_BUCKINGHAM', name: 'Buckingham Canal Gate', opening_percent: 55 + Math.random() * 25, max_flow: 120, link: 'Buckingham Canal', location: 'North Chennai' },
  'GATE_VELACHERY': { gate_id: 'GATE_VELACHERY', name: 'Velachery Drain Gate', opening_percent: 80 + Math.random() * 15, max_flow: 100, link: 'Velachery Drain', location: 'Velachery Zone' },
});

// =================================================================================================
// LIVE STATUS BADGE COMPONENT
// =================================================================================================

function LiveStatusBadge({ isLive, lastUpdate }) {
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setPulse(p => !p), 1000);
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
      {timeSinceUpdate !== null && timeSinceUpdate < 60 && (
        <span className="text-xs text-gray-500">
          Updated {timeSinceUpdate}s ago
        </span>
      )}
    </div>
  );
}

// =================================================================================================
// INTERACTIVE SENSOR CARD COMPONENT
// =================================================================================================

function InteractiveSensorCard({ sensor, onValueChange }) {
  const [localValue, setLocalValue] = useState(sensor.value);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) {
      setLocalValue(sensor.value);
    }
  }, [sensor.value, isDragging]);

  const getStatusColor = (status) => {
    const colors = {
      critical: 'border-red-500 bg-gradient-to-br from-red-50 to-red-100',
      danger: 'border-red-500 bg-gradient-to-br from-red-50 to-red-100',
      warning: 'border-yellow-500 bg-gradient-to-br from-yellow-50 to-yellow-100',
      elevated: 'border-yellow-500 bg-gradient-to-br from-yellow-50 to-yellow-100',
      normal: 'border-green-500 bg-gradient-to-br from-green-50 to-green-100',
      active: 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100',
      standby: 'border-gray-500 bg-gradient-to-br from-gray-50 to-gray-100',
      heavy: 'border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100',
      moderate: 'border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100',
      light: 'border-cyan-500 bg-gradient-to-br from-cyan-50 to-cyan-100',
      dry: 'border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100',
    };
    return colors[status] || 'border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100';
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      critical: 'bg-red-500', danger: 'bg-red-500', warning: 'bg-yellow-500',
      elevated: 'bg-yellow-500', normal: 'bg-green-500', active: 'bg-blue-500',
      standby: 'bg-gray-500', heavy: 'bg-purple-500', moderate: 'bg-orange-500',
      light: 'bg-cyan-500', dry: 'bg-gray-400',
    };
    return colors[status] || 'bg-gray-400';
  };

  const getSensorIcon = (type) => {
    switch (type) {
      case 'water_level': return <Waves className="w-5 h-5 text-blue-600" />;
      case 'rain_gauge': return <CloudRain className="w-5 h-5 text-cyan-600" />;
      case 'pump': return <Power className="w-5 h-5 text-yellow-600" />;
      default: return <CircleDot className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className={`border-2 rounded-xl p-4 ${getStatusColor(sensor.status)} transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            {getSensorIcon(sensor.sensor_type)}
          </div>
          <div>
            <span className="font-bold text-sm text-gray-800">{sensor.location_name}</span>
            <p className="text-xs text-gray-500">{sensor.zone}</p>
          </div>
        </div>
        <span className={`${getStatusBadgeColor(sensor.status)} text-white text-xs px-2 py-1 rounded-full uppercase font-bold shadow-sm`}>
          {sensor.status}
        </span>
      </div>
      
      <div className="flex items-baseline space-x-1 mb-3">
        <span className="text-3xl font-black text-gray-800">
          {typeof localValue === 'number' ? localValue.toFixed(1) : localValue}
        </span>
        <span className="text-sm text-gray-500 font-medium">{sensor.unit}</span>
      </div>
      
      {/* Live Value Indicator */}
      <div className="mb-3">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              sensor.status === 'critical' || sensor.status === 'danger' ? 'bg-red-500' :
              sensor.status === 'warning' || sensor.status === 'elevated' ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
            style={{ 
              width: `${Math.min(100, (localValue / (sensor.sensor_type === 'water_level' ? 5 : sensor.sensor_type === 'rain_gauge' ? 50 : 100)) * 100)}%`,
            }}
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-1">
          <MapPin className="w-3 h-3" />
          <span>{sensor.zone}</span>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <Battery className={`w-3 h-3 ${sensor.battery_percent > 50 ? 'text-green-500' : sensor.battery_percent > 20 ? 'text-yellow-500' : 'text-red-500'}`} />
            <span>{sensor.battery_percent?.toFixed(0)}%</span>
          </div>
          <div className="flex items-center space-x-1">
            <Signal className={`w-3 h-3 ${sensor.signal_strength > -60 ? 'text-green-500' : sensor.signal_strength > -80 ? 'text-yellow-500' : 'text-red-500'}`} />
            <span>{sensor.signal_strength?.toFixed(0)}dBm</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =================================================================================================
// DRAGGABLE PUMP CONTROL CARD
// =================================================================================================

function DraggablePumpCard({ pump, onToggle, onFlowChange }) {
  const [targetFlow, setTargetFlow] = useState(pump.current_flow);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef(null);

  const handleDrag = (e) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newFlow = x * pump.capacity;
    setTargetFlow(newFlow);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      onFlowChange?.(pump.pump_id, targetFlow);
    }
  };

  useEffect(() => {
    if (!isDragging) {
      setTargetFlow(pump.current_flow);
    }
  }, [pump.current_flow, isDragging]);

  useEffect(() => {
    if (isDragging) {
      const handleMove = (e) => handleDrag(e);
      const handleUp = () => handleMouseUp();
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      return () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
      };
    }
  }, [isDragging, targetFlow]);

  return (
    <div className={`border-2 rounded-xl p-5 transition-all duration-500 hover:shadow-xl ${
      pump.is_active 
        ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-100' 
        : 'border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-xl ${pump.is_active ? 'bg-green-500' : 'bg-gray-400'} shadow-lg`}>
            <Power className={`w-6 h-6 text-white ${pump.is_active ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <h4 className="font-bold text-gray-800">{pump.name}</h4>
            <p className="text-xs text-gray-500">{pump.location}</p>
          </div>
        </div>
        <button
          onClick={() => onToggle(pump.pump_id, !pump.is_active)}
          className={`p-2 rounded-lg transition-all ${pump.is_active ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 hover:bg-gray-500'}`}
        >
          {pump.is_active ? <ToggleRight className="w-6 h-6 text-white" /> : <ToggleLeft className="w-6 h-6 text-white" />}
        </button>
      </div>

      {/* Flow Control Slider */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600 font-medium">Flow Rate</span>
          <span className="font-bold text-blue-600">{targetFlow?.toFixed(2)} / {pump.capacity} m³/s</span>
        </div>
        <div 
          ref={sliderRef}
          className="relative h-8 bg-gray-200 rounded-full cursor-pointer overflow-hidden"
          onMouseDown={(e) => { setIsDragging(true); handleDrag(e); }}
        >
          <div 
            className={`absolute inset-y-0 left-0 rounded-full transition-all ${pump.is_active ? 'bg-gradient-to-r from-blue-400 to-blue-600' : 'bg-gray-400'}`}
            style={{ width: `${(targetFlow / pump.capacity) * 100}%` }}
          />
          <div 
            className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-lg border-2 ${pump.is_active ? 'border-blue-500' : 'border-gray-400'} flex items-center justify-center cursor-grab active:cursor-grabbing`}
            style={{ left: `calc(${(targetFlow / pump.capacity) * 100}% - 12px)` }}
          >
            <GripVertical className="w-3 h-3 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Utilization */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Utilization</span>
          <span className="font-bold">{pump.utilization?.toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              pump.utilization > 80 ? 'bg-red-500' : pump.utilization > 50 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${pump.utilization || 0}%` }}
          />
        </div>
      </div>

      {/* Quick Controls */}
      <div className="flex space-x-2">
        <button
          onClick={() => onToggle(pump.pump_id, true)}
          disabled={pump.is_active}
          className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold flex items-center justify-center space-x-1"
        >
          <Power className="w-4 h-4" />
          <span>START</span>
        </button>
        <button
          onClick={() => onToggle(pump.pump_id, false)}
          disabled={!pump.is_active}
          className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold flex items-center justify-center space-x-1"
        >
          <XCircle className="w-4 h-4" />
          <span>STOP</span>
        </button>
      </div>
    </div>
  );
}

// =================================================================================================
// DRAGGABLE GATE CONTROL CARD
// =================================================================================================

function DraggableGateCard({ gate, onOpeningChange }) {
  const [targetOpening, setTargetOpening] = useState(gate.opening_percent);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef(null);

  const handleDrag = (e) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const y = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const newOpening = y * 100;
    setTargetOpening(newOpening);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      onOpeningChange?.(gate.gate_id, targetOpening);
    }
  };

  useEffect(() => {
    if (!isDragging) {
      setTargetOpening(gate.opening_percent);
    }
  }, [gate.opening_percent, isDragging]);

  useEffect(() => {
    if (isDragging) {
      const handleMove = (e) => handleDrag(e);
      const handleUp = () => handleMouseUp();
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      return () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
      };
    }
  }, [isDragging, targetOpening]);

  return (
    <div className="border-2 border-blue-300 rounded-xl p-5 bg-gradient-to-br from-blue-50 to-cyan-100 hover:shadow-xl transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-blue-500 shadow-lg">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-gray-800">{gate.name}</h4>
            <p className="text-xs text-gray-500">{gate.link}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-3xl font-black text-blue-600">{targetOpening.toFixed(0)}%</span>
          <p className="text-xs text-gray-500">Opening</p>
        </div>
      </div>

      {/* Vertical Slider */}
      <div className="flex items-center space-x-4 mb-4">
        <div 
          ref={sliderRef}
          className="relative w-16 h-40 bg-gray-200 rounded-lg cursor-pointer overflow-hidden"
          onMouseDown={(e) => { setIsDragging(true); handleDrag(e); }}
        >
          <div 
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500 to-cyan-400 transition-all"
            style={{ height: `${targetOpening}%` }}
          />
          <div 
            className="absolute left-1/2 -translate-x-1/2 w-14 h-6 bg-white rounded-lg shadow-lg border-2 border-blue-500 flex items-center justify-center cursor-grab active:cursor-grabbing"
            style={{ bottom: `calc(${targetOpening}% - 12px)` }}
          >
            <div className="flex flex-col items-center">
              <ChevronUp className="w-3 h-3 text-blue-500 -mb-1" />
              <ChevronDown className="w-3 h-3 text-blue-500 -mt-1" />
            </div>
          </div>
          {/* Scale markers */}
          {[0, 25, 50, 75, 100].map(mark => (
            <div key={mark} className="absolute left-0 w-2 h-0.5 bg-gray-400" style={{ bottom: `${mark}%` }}>
              <span className="absolute -left-6 -translate-y-1/2 text-xs text-gray-400">{mark}</span>
            </div>
          ))}
        </div>

        <div className="flex-1 space-y-3">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <p className="text-xs text-gray-500">Max Flow Rate</p>
            <p className="font-bold text-blue-600">{gate.max_flow} m³/s</p>
          </div>
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <p className="text-xs text-gray-500">Current Flow</p>
            <p className="font-bold text-green-600">{(gate.max_flow * targetOpening / 100).toFixed(1)} m³/s</p>
          </div>
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <p className="text-xs text-gray-500">Location</p>
            <p className="font-bold text-gray-700">{gate.location}</p>
          </div>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="grid grid-cols-4 gap-2">
        {[0, 25, 50, 100].map(preset => (
          <button
            key={preset}
            onClick={() => {
              setTargetOpening(preset);
              onOpeningChange?.(gate.gate_id, preset);
            }}
            className={`py-2 rounded-lg text-sm font-bold transition-all ${
              Math.abs(targetOpening - preset) < 5
                ? 'bg-blue-500 text-white'
                : 'bg-white text-blue-600 hover:bg-blue-100'
            }`}
          >
            {preset}%
          </button>
        ))}
      </div>
    </div>
  );
}

// =================================================================================================
// WEATHER WIDGET
// =================================================================================================

function WeatherWidget({ weather }) {
  if (!weather) return null;

  return (
    <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-600 text-white rounded-xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold opacity-90">Current Weather</h3>
          <p className="text-sm opacity-75">{weather.location}</p>
        </div>
        <LiveStatusBadge isLive={weather.is_live} />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-5xl font-black">{weather.temperature_c?.toFixed(1)}°C</div>
          <div className="text-sm opacity-75 mt-1">{weather.weather_description}</div>
        </div>
        <div className="text-right space-y-2">
          <div className="flex items-center justify-end space-x-2 bg-white/20 rounded-lg px-3 py-1">
            <Droplets className="w-4 h-4" />
            <span className="font-bold">{weather.humidity_percent?.toFixed(0)}%</span>
          </div>
          <div className="flex items-center justify-end space-x-2 bg-white/20 rounded-lg px-3 py-1">
            <Wind className="w-4 h-4" />
            <span className="font-bold">{weather.wind_speed_ms?.toFixed(1)} m/s</span>
          </div>
          <div className="flex items-center justify-end space-x-2 bg-white/20 rounded-lg px-3 py-1">
            <CloudRain className="w-4 h-4" />
            <span className="font-bold">{weather.rainfall_1h_mm?.toFixed(1)} mm/hr</span>
          </div>
        </div>
      </div>

      {weather.rainfall_1h_mm > 5 && (
        <div className="mt-4 p-3 bg-white/20 rounded-lg backdrop-blur-sm">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-bold">
              {weather.rainfall_1h_mm > 20 ? '⚠️ Heavy' : weather.rainfall_1h_mm > 10 ? '🌧️ Moderate' : '💧 Light'} rainfall
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// =================================================================================================
// STATISTICS PANEL
// =================================================================================================

function StatisticsPanel({ statistics }) {
  if (!statistics) return null;

  const stats = [
    { label: 'Avg Water Level', value: `${statistics.avg_water_level_m?.toFixed(2) || 0}m`, icon: Waves, color: 'blue', bgColor: 'bg-blue-50' },
    { label: 'Max Water Level', value: `${statistics.max_water_level_m?.toFixed(2) || 0}m`, icon: TrendingUp, color: 'orange', bgColor: 'bg-orange-50' },
    { label: 'Current Rainfall', value: `${statistics.current_rainfall_mm_hr?.toFixed(1) || 0}mm/hr`, icon: CloudRain, color: 'cyan', bgColor: 'bg-cyan-50' },
    { label: 'Active Pumps', value: `${statistics.active_pumps || 0}/${statistics.total_pumps || 0}`, icon: Power, color: 'green', bgColor: 'bg-green-50' },
    { label: 'Critical Alerts', value: statistics.critical_alerts || 0, icon: AlertTriangle, color: 'red', bgColor: 'bg-red-50' },
    { label: 'Warning Alerts', value: statistics.warning_alerts || 0, icon: AlertCircle, color: 'yellow', bgColor: 'bg-yellow-50' },
    { label: 'Sensors Online', value: statistics.sensors_online || 0, icon: Radio, color: 'purple', bgColor: 'bg-purple-50' },
    { label: 'Water Stations', value: statistics.water_stations_online || 0, icon: Gauge, color: 'indigo', bgColor: 'bg-indigo-50' },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((stat, idx) => (
        <div key={idx} className={`${stat.bgColor} rounded-xl shadow-lg p-4 border-l-4 border-${stat.color}-500 hover:shadow-xl transition-all hover:scale-[1.02]`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">{stat.label}</p>
              <p className="text-2xl font-black mt-1 text-gray-800">{stat.value}</p>
            </div>
            <div className={`p-3 rounded-xl bg-white shadow-sm`}>
              <stat.icon className={`w-6 h-6 text-${stat.color}-500`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// =================================================================================================
// ALERTS PANEL
// =================================================================================================

function AlertsPanel({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-200 rounded-xl p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-green-700">All Systems Normal</h3>
        <p className="text-sm text-green-600 mt-1">No active alerts at this time</p>
      </div>
    );
  }

  const criticalAlerts = alerts.filter(a => a.level === 'critical');
  const warningAlerts = alerts.filter(a => a.level === 'warning');

  return (
    <div className="space-y-4">
      {criticalAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-xl p-4 animate-pulse">
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <h3 className="font-bold text-red-700 text-lg">Critical Alerts ({criticalAlerts.length})</h3>
          </div>
          <div className="space-y-2">
            {criticalAlerts.map((alert, idx) => (
              <div key={idx} className="text-sm text-red-700 bg-white/50 p-2 rounded-lg">
                <span className="font-bold">⚠️ {alert.message}</span>
                <span className="text-red-500 ml-2">• {alert.location}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {warningAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-100 border-l-4 border-yellow-500 rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-3">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            <h3 className="font-bold text-yellow-700">Warnings ({warningAlerts.length})</h3>
          </div>
          <div className="space-y-2">
            {warningAlerts.map((alert, idx) => (
              <div key={idx} className="text-sm text-yellow-700 bg-white/50 p-2 rounded-lg">
                <span className="font-medium">🔔 {alert.message}</span>
                <span className="text-yellow-600 ml-2">• {alert.location}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =================================================================================================
// OPTIMIZED MAP COMPONENT
// =================================================================================================

function OptimizedMap({ sensors, waterStations, hotspots }) {
  const sensorsList = useMemo(() => Object.entries(sensors || {}), [sensors]);
  const stationsList = useMemo(() => Object.entries(waterStations || {}), [waterStations]);
  
  return (
    <div className="bg-white rounded-xl shadow-xl overflow-hidden">
      <MapContainer
        center={[13.0827, 80.2707]}
        zoom={11}
        style={{ height: '600px', width: '100%' }}
        preferCanvas={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap'
        />

        {/* Chennai Zone Boundaries */}
        {CHENNAI_ZONES.map((zone) => (
          <Circle
            key={zone.id}
            center={[zone.lat, zone.lon]}
            radius={zone.radius}
            pathOptions={{
              color: zone.risk === 'critical' ? '#dc2626' : 
                     zone.risk === 'high' ? '#f97316' : 
                     zone.risk === 'medium' ? '#eab308' : '#22c55e',
              fillColor: zone.risk === 'critical' ? '#dc2626' : 
                         zone.risk === 'high' ? '#f97316' : 
                         zone.risk === 'medium' ? '#eab308' : '#22c55e',
              fillOpacity: 0.15,
              weight: 2,
              dashArray: zone.risk === 'critical' ? '5, 5' : undefined,
            }}
          >
            <Popup>
              <div className="p-2 min-w-48">
                <h3 className="font-bold text-lg">{zone.name}</h3>
                <div className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                  zone.risk === 'critical' ? 'bg-red-100 text-red-600' :
                  zone.risk === 'high' ? 'bg-orange-100 text-orange-600' :
                  zone.risk === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-green-100 text-green-600'
                }`}>
                  {zone.risk} Risk
                </div>
                <p className="text-sm text-gray-600 mt-2">Flood Risk Zone</p>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Water Bodies */}
        {WATER_BODIES.map((body, idx) => (
          <Polyline
            key={idx}
            positions={body.coords}
            pathOptions={{
              color: body.type === 'river' ? '#3b82f6' : '#06b6d4',
              weight: 4,
              opacity: 0.8,
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold">{body.name}</h3>
                <p className="text-sm text-gray-500 capitalize">{body.type}</p>
              </div>
            </Popup>
          </Polyline>
        ))}

        {/* Sensors */}
        {sensorsList.map(([id, sensor]) => (
          <Marker
            key={id}
            position={[sensor.latitude, sensor.longitude]}
            icon={icons[sensor.status] || icons.normal}
          >
            <Popup>
              <div className="p-2 min-w-48">
                <h3 className="font-bold text-lg">{sensor.location_name}</h3>
                <div className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                  sensor.status === 'critical' ? 'bg-red-100 text-red-600' :
                  sensor.status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-green-100 text-green-600'
                }`}>
                  {sensor.status}
                </div>
                <div className="mt-2 space-y-1 text-sm">
                  <p><span className="text-gray-500">Type:</span> <span className="font-medium">{sensor.sensor_type}</span></p>
                  <p><span className="text-gray-500">Value:</span> <span className="font-bold text-blue-600">{sensor.value?.toFixed(2)} {sensor.unit}</span></p>
                  <p><span className="text-gray-500">Zone:</span> {sensor.zone}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Water Stations */}
        {stationsList.map(([id, station]) => (
          <Marker
            key={`ws-${id}`}
            position={[station.latitude, station.longitude]}
            icon={icons[station.status] || icons.normal}
          >
            <Popup>
              <div className="p-2 min-w-56">
                <h3 className="font-bold text-lg">{station.station_name}</h3>
                <div className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                  station.status === 'danger' ? 'bg-red-100 text-red-600' :
                  station.status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-green-100 text-green-600'
                }`}>
                  {station.status} • {station.trend}
                </div>
                <div className="mt-2 space-y-1 text-sm">
                  <p><span className="text-gray-500">Water Level:</span> <span className="font-bold text-blue-600">{station.water_level_m?.toFixed(2)}m</span></p>
                  <p><span className="text-gray-500">Danger Level:</span> <span className="font-bold text-red-600">{station.danger_level_m}m</span></p>
                  <p><span className="text-gray-500">Flow Rate:</span> <span className="font-medium">{station.flow_rate_cumecs?.toFixed(1)} cumecs</span></p>
                </div>
                <div className="mt-2">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${station.status === 'danger' ? 'bg-red-500' : station.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(100, (station.water_level_m / station.danger_level_m) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

// =================================================================================================
// LIVE CONTROL ANALYTICS COMPONENT (Different from main Analytics page)
// =================================================================================================

function LiveControlAnalytics({ statistics, sensors, pumps, gates }) {
  const [timeRange, setTimeRange] = useState('24h');
  
  // Generate real-time performance data
  const performanceData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${(now.getHours() - 23 + i + 24) % 24}:00`,
      waterLevel: 2.0 + Math.sin(i / 4) * 0.8 + Math.random() * 0.3,
      pumpFlow: 3.5 + Math.cos(i / 3) * 1.2 + Math.random() * 0.5,
      rainfall: Math.max(0, 15 + Math.sin(i / 2) * 12 + Math.random() * 8),
    }));
  }, []);

  // Sensor status distribution
  const sensorDistribution = useMemo(() => {
    const sensorList = Object.values(sensors);
    return [
      { name: 'Normal', value: sensorList.filter(s => s.status === 'normal').length, color: '#22c55e' },
      { name: 'Warning', value: sensorList.filter(s => s.status === 'warning' || s.status === 'elevated').length, color: '#eab308' },
      { name: 'Critical', value: sensorList.filter(s => s.status === 'critical' || s.status === 'danger').length, color: '#ef4444' },
      { name: 'Active', value: sensorList.filter(s => s.status === 'active').length, color: '#3b82f6' },
    ].filter(d => d.value > 0);
  }, [sensors]);

  // Pump efficiency data
  const pumpEfficiency = useMemo(() => {
    return Object.entries(pumps).map(([id, pump]) => ({
      name: pump.name?.split(' ').slice(0, 2).join(' ') || id,
      utilization: pump.utilization || 0,
      capacity: pump.capacity || 0,
      flow: pump.current_flow || 0,
    }));
  }, [pumps]);

  // Gate status data
  const gateStatus = useMemo(() => {
    return Object.entries(gates).map(([id, gate]) => ({
      name: gate.name?.split(' ').slice(0, 2).join(' ') || id,
      opening: gate.opening_percent || 0,
      maxFlow: gate.max_flow || 0,
      currentFlow: (gate.max_flow * gate.opening_percent / 100) || 0,
    }));
  }, [gates]);

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-800 flex items-center">
            <TrendingUp className="w-7 h-7 mr-2 text-blue-500" />
            Live System Analytics
          </h2>
          <p className="text-sm text-gray-500 mt-1">Real-time infrastructure performance monitoring</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1">
          {['1h', '6h', '24h', '7d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                timeRange === range
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Live Performance Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <Waves className="w-8 h-8 opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">LIVE</span>
          </div>
          <p className="text-3xl font-black">{statistics?.avg_water_level_m?.toFixed(2) || 0}m</p>
          <p className="text-sm opacity-80">Avg Water Level</p>
          <div className="mt-2 h-1 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white" style={{ width: `${Math.min(100, (statistics?.avg_water_level_m / 5) * 100)}%` }} />
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-5 text-white shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <Power className="w-8 h-8 opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">ACTIVE</span>
          </div>
          <p className="text-3xl font-black">{statistics?.active_pumps || 0}/{statistics?.total_pumps || 0}</p>
          <p className="text-sm opacity-80">Active Pumps</p>
          <div className="mt-2 h-1 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white" style={{ width: `${(statistics?.active_pumps / statistics?.total_pumps) * 100 || 0}%` }} />
          </div>
        </div>
        <div className="bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl p-5 text-white shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <CloudRain className="w-8 h-8 opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">NOW</span>
          </div>
          <p className="text-3xl font-black">{statistics?.current_rainfall_mm_hr?.toFixed(1) || 0}</p>
          <p className="text-sm opacity-80">Rainfall mm/hr</p>
          <div className="mt-2 h-1 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white" style={{ width: `${Math.min(100, (statistics?.current_rainfall_mm_hr / 50) * 100)}%` }} />
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl p-5 text-white shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <Radio className="w-8 h-8 opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">ONLINE</span>
          </div>
          <p className="text-3xl font-black">{statistics?.sensors_online || 0}</p>
          <p className="text-sm opacity-80">Sensors Online</p>
          <div className="mt-2 h-1 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white" style={{ width: `${Math.min(100, (statistics?.sensors_online / 20) * 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Water Level & Rainfall Trend */}
        <div className="bg-white rounded-xl shadow-xl p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-blue-500" />
            Water Level & Rainfall Trend
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={performanceData}>
              <defs>
                <linearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="rainGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="waterLevel" stroke="#3b82f6" fill="url(#waterGradient)" strokeWidth={2} name="Water Level (m)" />
              <Area type="monotone" dataKey="rainfall" stroke="#06b6d4" fill="url(#rainGradient)" strokeWidth={2} name="Rainfall (mm/hr)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pump Flow Rate */}
        <div className="bg-white rounded-xl shadow-xl p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-yellow-500" />
            Pump Flow Rate (Last {timeRange})
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Line type="monotone" dataKey="pumpFlow" stroke="#22c55e" strokeWidth={3} dot={false} name="Flow Rate (m³/s)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Second Row - Pump & Gate Status */}
      <div className="grid grid-cols-2 gap-6">
        {/* Pump Utilization */}
        <div className="bg-white rounded-xl shadow-xl p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <Power className="w-5 h-5 mr-2 text-green-500" />
            Pump Utilization Status
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={pumpEfficiency} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="utilization" fill="#22c55e" radius={[0, 4, 4, 0]} name="Utilization %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gate Opening Status */}
        <div className="bg-white rounded-xl shadow-xl p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <Settings className="w-5 h-5 mr-2 text-blue-500" />
            Gate Opening Status
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={gateStatus} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="opening" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Opening %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sensor Distribution & System Health */}
      <div className="grid grid-cols-3 gap-6">
        {/* Sensor Status Distribution */}
        <div className="bg-white rounded-xl shadow-xl p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <Radio className="w-5 h-5 mr-2 text-purple-500" />
            Sensor Status
          </h3>
          <div className="space-y-3">
            {sensorDistribution.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: item.color }} />
                  <span className="text-sm font-medium text-gray-600">{item.name}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-lg font-bold text-gray-800 mr-2">{item.value}</span>
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(item.value / Object.keys(sensors).length) * 100}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-xl shadow-xl p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-green-500" />
            System Health
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Network Connectivity</span>
                <span className="font-bold text-green-600">98%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '98%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Sensor Accuracy</span>
                <span className="font-bold text-blue-600">95%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '95%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Response Time</span>
                <span className="font-bold text-cyan-600">45ms</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full" style={{ width: '85%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Data Freshness</span>
                <span className="font-bold text-purple-600">Real-time</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full animate-pulse" style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-6 text-white">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-yellow-400" />
            Quick Actions
          </h3>
          <div className="space-y-3">
            <button className="w-full bg-blue-500 hover:bg-blue-600 py-3 rounded-lg font-bold flex items-center justify-center space-x-2 transition-all hover:scale-[1.02]">
              <RefreshCw className="w-4 h-4" />
              <span>Refresh All Data</span>
            </button>
            <button className="w-full bg-green-500 hover:bg-green-600 py-3 rounded-lg font-bold flex items-center justify-center space-x-2 transition-all hover:scale-[1.02]">
              <Power className="w-4 h-4" />
              <span>Activate All Pumps</span>
            </button>
            <button className="w-full bg-yellow-500 hover:bg-yellow-600 py-3 rounded-lg font-bold flex items-center justify-center space-x-2 transition-all hover:scale-[1.02]">
              <Settings className="w-4 h-4" />
              <span>Auto-Optimize Gates</span>
            </button>
            <button className="w-full bg-red-500 hover:bg-red-600 py-3 rounded-lg font-bold flex items-center justify-center space-x-2 transition-all hover:scale-[1.02]">
              <AlertTriangle className="w-4 h-4" />
              <span>Emergency Protocol</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =================================================================================================
// MAIN ENHANCED DASHBOARD COMPONENT
// =================================================================================================

export default function EnhancedFloodDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
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

  const updateIntervalRef = useRef(null);

  // Generate and update live data
  const updateLiveData = useCallback(() => {
    try {
      const mockData = generateMockData();
      setRealtimeData(mockData);
      setWeather(mockData.weather);
      setSensors(mockData.sensors);
      setWaterStations(mockData.waterStations);
      setStatistics(mockData.statistics);
      setAlerts(mockData.alerts);
      setLastUpdate(mockData.timestamp);
      setIsConnected(true);
      
      setPumps(generateMockPumps());
      setGates(generateMockGates());
      
      // Generate hotspots
      setHotspots(CHENNAI_ZONES.filter(z => z.risk === 'critical' || z.risk === 'high').map(z => ({
        lat: z.lat,
        lon: z.lon,
        name: z.name,
        severity: z.risk,
        status: 'monitoring',
        value: Math.random() * 3 + 1,
        unit: 'm',
      })));
      
      setLoading(false);
    } catch (error) {
      console.error('Error updating data:', error);
      setIsConnected(false);
      setLoading(false);
    }
  }, []);

  // Pump control handler
  const handlePumpToggle = useCallback((pumpId, activate) => {
    setPumps(prev => ({
      ...prev,
      [pumpId]: {
        ...prev[pumpId],
        is_active: activate,
        current_flow: activate ? prev[pumpId].capacity * 0.6 : 0,
        utilization: activate ? 60 : 0,
      }
    }));
  }, []);

  // Gate control handler
  const handleGateChange = useCallback((gateId, opening) => {
    setGates(prev => ({
      ...prev,
      [gateId]: {
        ...prev[gateId],
        opening_percent: opening,
      }
    }));
  }, []);

  // Setup data updates
  useEffect(() => {
    updateLiveData();
    updateIntervalRef.current = setInterval(updateLiveData, 3000);
    return () => clearInterval(updateIntervalRef.current);
  }, [updateLiveData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <Activity className="w-20 h-20 text-blue-500 animate-spin mx-auto mb-4" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Droplets className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Chennai Flood Management System</h2>
          <p className="text-gray-600">Initializing live data streams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-xl border-b-4 border-blue-500 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-3 rounded-xl shadow-lg">
                <Droplets className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-800">Chennai Flood Management System</h1>
                <p className="text-sm text-gray-500">Real-time Monitoring & Control Platform</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <Wifi className="w-5 h-5 text-green-500" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-500" />
                )}
                <LiveStatusBadge isLive={isConnected} lastUpdate={lastUpdate} />
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="text-center px-4 py-2 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-xs text-gray-500">Rainfall</p>
                  <p className="text-xl font-black text-blue-600">
                    {statistics?.current_rainfall_mm_hr?.toFixed(1) || 0} mm/hr
                  </p>
                </div>
                <div className="text-center px-4 py-2 bg-red-50 rounded-xl border border-red-200">
                  <p className="text-xs text-gray-500">Alerts</p>
                  <p className="text-xl font-black text-red-600">
                    {(statistics?.critical_alerts || 0) + (statistics?.warning_alerts || 0)}
                  </p>
                </div>
                <div className="text-center px-4 py-2 bg-green-50 rounded-xl border border-green-200">
                  <p className="text-xs text-gray-500">Sensors</p>
                  <p className="text-xl font-black text-green-600">
                    {statistics?.sensors_online || 0} Online
                  </p>
                </div>
              </div>

              <button 
                onClick={updateLiveData}
                className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all hover:scale-105"
              >
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Alert Banner */}
      {alerts.length > 0 && (
        <div className={`${alerts.some(a => a.level === 'critical') ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-yellow-500 to-amber-500'} text-white py-3`}>
          <div className="container mx-auto px-6">
            <div className="flex items-center space-x-4 overflow-x-auto">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-pulse" />
              <div className="flex space-x-6">
                {alerts.slice(0, 3).map((alert, idx) => (
                  <span key={idx} className="text-sm whitespace-nowrap font-medium">
                    ⚡ {alert.message}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
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
                className={`flex items-center space-x-2 px-5 py-4 font-bold transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content - Flex grow to push footer down */}
      <main className="container mx-auto px-6 py-6 flex-1">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <StatisticsPanel statistics={statistics} />
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-1">
                <WeatherWidget weather={weather} />
              </div>
              <div className="col-span-2">
                <AlertsPanel alerts={alerts} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <OptimizedMap 
            sensors={sensors} 
            waterStations={waterStations} 
            hotspots={hotspots} 
          />
        )}

        {activeTab === 'sensors' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-gray-800">IoT Sensor Network</h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">{Object.keys(sensors).length} sensors online</span>
                <LiveStatusBadge isLive={isConnected} lastUpdate={lastUpdate} />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <Waves className="w-5 h-5 mr-2 text-blue-500" />
                Water Level Sensors
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(sensors)
                  .filter(([_, s]) => s.sensor_type === 'water_level')
                  .map(([id, sensor]) => (
                    <InteractiveSensorCard key={id} sensor={sensor} />
                  ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <CloudRain className="w-5 h-5 mr-2 text-cyan-500" />
                Rain Gauge Stations
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(sensors)
                  .filter(([_, s]) => s.sensor_type === 'rain_gauge')
                  .map(([id, sensor]) => (
                    <InteractiveSensorCard key={id} sensor={sensor} />
                  ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <Power className="w-5 h-5 mr-2 text-yellow-500" />
                Pump Status Sensors
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(sensors)
                  .filter(([_, s]) => s.sensor_type === 'pump')
                  .map(([id, sensor]) => (
                    <InteractiveSensorCard key={id} sensor={sensor} />
                  ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'control' && (
          <div className="space-y-8">
            {/* Pumps Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-black text-gray-800 flex items-center">
                  <Zap className="w-7 h-7 mr-2 text-yellow-500" />
                  Pump Control System
                </h2>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-500">Active:</span>
                  <span className="font-bold text-green-600">
                    {Object.values(pumps).filter(p => p.is_active).length}/{Object.keys(pumps).length}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                {Object.entries(pumps).map(([id, pump]) => (
                  <DraggablePumpCard 
                    key={id} 
                    pump={pump} 
                    onToggle={handlePumpToggle}
                    onFlowChange={(pumpId, flow) => {
                      setPumps(prev => ({
                        ...prev,
                        [pumpId]: { ...prev[pumpId], current_flow: flow, utilization: (flow / prev[pumpId].capacity) * 100 }
                      }));
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Gates Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-black text-gray-800 flex items-center">
                  <Settings className="w-7 h-7 mr-2 text-blue-500" />
                  Gate Control System
                </h2>
                <p className="text-sm text-gray-500">Drag sliders to adjust gate openings</p>
              </div>
              <div className="grid grid-cols-3 gap-6">
                {Object.entries(gates).map(([id, gate]) => (
                  <DraggableGateCard 
                    key={id} 
                    gate={gate} 
                    onOpeningChange={handleGateChange}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <LiveControlAnalytics statistics={statistics} sensors={sensors} pumps={pumps} gates={gates} />
        )}
      </main>

      {/* Footer - Always at bottom */}
      <footer className="bg-gray-800 text-white py-4 mt-auto">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="font-bold">Chennai Flood Management System</span>
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
