import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import { Droplets, AlertTriangle, Activity, Navigation, Zap, Map as MapIcon, Clock, Calendar } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Chennai center coordinates
const CHENNAI_CENTER = [13.0827, 80.2707];

// Historical Flood Records for Chennai
const FLOOD_HISTORY = [
  {
    id: 1,
    date: '2015-12-01',
    event: 'Chennai Floods 2015',
    rainfall: 494,
    affected: '1.8 Million',
    casualties: 500,
    severity: 'critical',
    areas: ['Adyar', 'Velachery', 'Tambaram', 'Pallavaram', 'Kotturpuram'],
    duration: '7 days'
  },
  {
    id: 2,
    date: '2021-11-11',
    event: 'Northeast Monsoon',
    rainfall: 210,
    affected: '450,000',
    casualties: 35,
    severity: 'high',
    areas: ['Madhavaram', 'Manali', 'Perambur', 'Anna Nagar'],
    duration: '3 days'
  },
  {
    id: 3,
    date: '2023-12-04',
    event: 'Cyclone Michaung',
    rainfall: 320,
    affected: '850,000',
    casualties: 17,
    severity: 'high',
    areas: ['Velachery', 'Pallikaranai', 'Chromepet', 'Porur'],
    duration: '4 days'
  },
  {
    id: 4,
    date: '2017-11-09',
    event: 'November Floods',
    rainfall: 165,
    affected: '200,000',
    casualties: 12,
    severity: 'medium',
    areas: ['T Nagar', 'Nungambakkam', 'Saidapet'],
    duration: '2 days'
  },
  {
    id: 5,
    date: '2020-11-27',
    event: 'Cyclone Nivar',
    rainfall: 287,
    affected: '600,000',
    casualties: 28,
    severity: 'high',
    areas: ['Sholinganallur', 'OMR', 'ECR Coastal Areas'],
    duration: '3 days'
  }
];

// Major water bodies in Chennai (rivers, lakes, canals)
const WATER_BODIES = [
  { name: 'Adyar River', coords: [[13.0067, 80.2575], [13.0167, 80.2675], [13.0267, 80.2775], [13.0367, 80.2875]], type: 'river' },
  { name: 'Cooum River', coords: [[13.0500, 80.2100], [13.0550, 80.2300], [13.0600, 80.2500], [13.0650, 80.2700]], type: 'river' },
  { name: 'Buckingham Canal', coords: [[13.1500, 80.2800], [13.1300, 80.2850], [13.1100, 80.2900], [13.0900, 80.2950]], type: 'canal' },
  { name: 'Pallikaranai Marsh', coords: [[12.9400, 80.2100], [12.9450, 80.2150], [12.9500, 80.2200], [12.9550, 80.2250]], type: 'wetland' },
];

// IoT Sensor locations across Chennai
const IOT_SENSORS = [
  { id: 1, name: 'Adyar Sensor Hub', position: [13.0067, 80.2575], status: 'active', waterLevel: 2.3, temp: 28, rainfall: 12 },
  { id: 2, name: 'T Nagar Monitor', position: [13.0417, 80.2341], status: 'active', waterLevel: 1.8, temp: 29, rainfall: 8 },
  { id: 3, name: 'Velachery Station', position: [12.9755, 80.2207], status: 'warning', waterLevel: 3.1, temp: 27, rainfall: 25 },
  { id: 4, name: 'Anna Nagar Hub', position: [13.0857, 80.2090], status: 'active', waterLevel: 1.5, temp: 28, rainfall: 5 },
  { id: 5, name: 'Pallavaram Sensor', position: [12.9675, 80.1491], status: 'critical', waterLevel: 4.2, temp: 30, rainfall: 45 },
  { id: 6, name: 'Tambaram Monitor', position: [12.9229, 80.1275], status: 'active', waterLevel: 2.0, temp: 29, rainfall: 10 },
  { id: 7, name: 'Chromepet Station', position: [12.9516, 80.1462], status: 'warning', waterLevel: 2.9, temp: 28, rainfall: 22 },
  { id: 8, name: 'Porur Hub', position: [13.0370, 80.1565], status: 'active', waterLevel: 1.7, temp: 27, rainfall: 7 },
];

// Flood-prone zones with risk levels
const FLOOD_ZONES = [
  { name: 'Velachery Zone', center: [12.9755, 80.2207], radius: 2000, risk: 'high' },
  { name: 'Pallavaram Zone', center: [12.9675, 80.1491], radius: 2500, risk: 'critical' },
  { name: 'Chromepet Zone', center: [12.9516, 80.1462], radius: 1800, risk: 'medium' },
  { name: 'Adyar Basin', center: [13.0067, 80.2575], radius: 2200, risk: 'medium' },
  { name: 'Cooum Basin', center: [13.0600, 80.2500], radius: 1500, risk: 'low' },
];

// AI-optimized water diversion routes
const DIVERSION_ROUTES = [
  {
    id: 1,
    name: 'Velachery to Pallikaranai',
    path: [[12.9755, 80.2207], [12.9650, 80.2150], [12.9550, 80.2200]],
    capacity: '5000 m³/hr',
    status: 'optimal'
  },
  {
    id: 2,
    name: 'Pallavaram to Chromepet Canal',
    path: [[12.9675, 80.1491], [12.9600, 80.1480], [12.9516, 80.1462]],
    capacity: '3500 m³/hr',
    status: 'active'
  },
  {
    id: 3,
    name: 'Adyar Overflow Bypass',
    path: [[13.0067, 80.2575], [13.0000, 80.2650], [12.9950, 80.2700]],
    capacity: '6000 m³/hr',
    status: 'standby'
  },
];

// Drainage system major channels
const DRAINAGE_CHANNELS = [
  { name: 'North Buckingham Canal', coords: [[13.1500, 80.2800], [13.1200, 80.2850], [13.0900, 80.2900]], capacity: '8000 m³/hr' },
  { name: 'Otteri Nullah', coords: [[13.0900, 80.2600], [13.0850, 80.2650], [13.0800, 80.2700]], capacity: '3000 m³/hr' },
  { name: 'Mambalam Drain', coords: [[13.0350, 80.2250], [13.0320, 80.2280], [13.0290, 80.2310]], capacity: '2500 m³/hr' },
  { name: 'Velachery Main Drain', coords: [[12.9800, 80.2200], [12.9750, 80.2230], [12.9700, 80.2260]], capacity: '4000 m³/hr' },
];

// Custom marker icons
const createCustomIcon = (color, icon) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
          ${icon}
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const sensorActiveIcon = createCustomIcon('#10B981', '<circle cx="12" cy="12" r="10"/>');
const sensorWarningIcon = createCustomIcon('#F59E0B', '<path d="M12 2L2 20h20L12 2z"/>');
const sensorCriticalIcon = createCustomIcon('#EF4444', '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/>');

// Map Legend Component
const MapLegend = ({ showLayers, setShowLayers }) => {
  return (
    <div className="absolute top-6 left-6 bg-gray-900/95 backdrop-blur-md p-5 rounded-xl shadow-2xl border border-gray-700 z-[1000]" style={{ minWidth: '280px', maxWidth: '320px' }}>
      <h3 className="text-white font-bold mb-4 flex items-center text-lg">
        <Navigation className="w-5 h-5 mr-2 text-blue-400" />
        Map Layers
      </h3>
      
      <div className="space-y-2.5">
        <label className="flex items-center text-sm text-gray-200 cursor-pointer hover:bg-gray-800/50 p-2 rounded-lg transition-all group">
          <input
            type="checkbox"
            checked={showLayers.sensors}
            onChange={(e) => setShowLayers({...showLayers, sensors: e.target.checked})}
            className="mr-3 w-4 h-4 accent-green-500"
          />
          <Activity className="w-4 h-4 mr-2 text-green-400 group-hover:scale-110 transition-transform" />
          <span className="font-medium">IoT Sensors</span>
        </label>
        
        <label className="flex items-center text-sm text-gray-200 cursor-pointer hover:bg-gray-800/50 p-2 rounded-lg transition-all group">
          <input
            type="checkbox"
            checked={showLayers.floodZones}
            onChange={(e) => setShowLayers({...showLayers, floodZones: e.target.checked})}
            className="mr-3 w-4 h-4 accent-orange-500"
          />
          <AlertTriangle className="w-4 h-4 mr-2 text-orange-400 group-hover:scale-110 transition-transform" />
          <span className="font-medium">Flood Risk Zones</span>
        </label>
        
        <label className="flex items-center text-sm text-gray-200 cursor-pointer hover:bg-gray-800/50 p-2 rounded-lg transition-all group">
          <input
            type="checkbox"
            checked={showLayers.waterBodies}
            onChange={(e) => setShowLayers({...showLayers, waterBodies: e.target.checked})}
            className="mr-3 w-4 h-4 accent-blue-500"
          />
          <Droplets className="w-4 h-4 mr-2 text-blue-400 group-hover:scale-110 transition-transform" />
          <span className="font-medium">Water Bodies</span>
        </label>
        
        <label className="flex items-center text-sm text-gray-200 cursor-pointer hover:bg-gray-800/50 p-2 rounded-lg transition-all group">
          <input
            type="checkbox"
            checked={showLayers.drainage}
            onChange={(e) => setShowLayers({...showLayers, drainage: e.target.checked})}
            className="mr-3 w-4 h-4 accent-purple-500"
          />
          <Zap className="w-4 h-4 mr-2 text-purple-400 group-hover:scale-110 transition-transform" />
          <span className="font-medium">Drainage Channels</span>
        </label>
        
        <label className="flex items-center text-sm text-gray-200 cursor-pointer hover:bg-gray-800/50 p-2 rounded-lg transition-all group">
          <input
            type="checkbox"
            checked={showLayers.diversion}
            onChange={(e) => setShowLayers({...showLayers, diversion: e.target.checked})}
            className="mr-3 w-4 h-4 accent-emerald-500"
          />
          <Navigation className="w-4 h-4 mr-2 text-emerald-400 group-hover:scale-110 transition-transform" />
          <span className="font-medium">AI Diversion Routes</span>
        </label>
      </div>

      <div className="mt-5 pt-4 border-t border-gray-700">
        <p className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Risk Levels:</p>
        <div className="space-y-2">
          <div className="flex items-center text-xs">
            <div className="w-4 h-4 rounded-full bg-green-500 mr-3 shadow-lg shadow-green-500/50"></div>
            <span className="text-gray-200 font-medium">Low / Active</span>
          </div>
          <div className="flex items-center text-xs">
            <div className="w-4 h-4 rounded-full bg-yellow-500 mr-3 shadow-lg shadow-yellow-500/50"></div>
            <span className="text-gray-200 font-medium">Medium / Warning</span>
          </div>
          <div className="flex items-center text-xs">
            <div className="w-4 h-4 rounded-full bg-red-500 mr-3 shadow-lg shadow-red-500/50 animate-pulse"></div>
            <span className="text-gray-200 font-medium">High / Critical</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Historical Flood Records Component
const FloodHistory = ({ isOpen, onToggle }) => {
  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'critical': return 'bg-red-900/40 border-red-800/50 text-red-400';
      case 'high': return 'bg-orange-900/40 border-orange-800/50 text-orange-400';
      case 'medium': return 'bg-yellow-900/40 border-yellow-800/50 text-yellow-400';
      default: return 'bg-blue-900/40 border-blue-800/50 text-blue-400';
    }
  };

  return (
    <div className="absolute bottom-6 left-6 bg-gray-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-700 z-[1000]" style={{ minWidth: '320px', maxWidth: '380px' }}>
      <button 
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-800/50 transition-all rounded-t-xl"
      >
        <div className="flex items-center">
          <Clock className="w-5 h-5 mr-2 text-blue-400" />
          <h3 className="text-white font-bold text-lg">Historical Flood Data</h3>
        </div>
        <span className="text-gray-400">{isOpen ? '▼' : '▲'}</span>
      </button>
      
      {isOpen && (
        <div className="p-4 pt-0 max-h-96 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          <div className="space-y-3 mt-2">
            {FLOOD_HISTORY.map((record) => (
              <div 
                key={record.id}
                className={`p-3 rounded-lg border ${getSeverityColor(record.severity)} hover:shadow-lg transition-all`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-bold text-white text-sm">{record.event}</h4>
                    <p className="text-xs text-gray-400 flex items-center mt-1">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(record.date).toLocaleDateString('en-IN', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${
                    record.severity === 'critical' ? 'bg-red-600' : 
                    record.severity === 'high' ? 'bg-orange-600' : 'bg-yellow-600'
                  }`}>
                    {record.severity}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                  <div>
                    <p className="text-gray-400">Rainfall</p>
                    <p className="font-bold text-white">{record.rainfall}mm</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Duration</p>
                    <p className="font-bold text-white">{record.duration}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Affected</p>
                    <p className="font-bold text-white">{record.affected}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Casualties</p>
                    <p className="font-bold text-white">{record.casualties}</p>
                  </div>
                </div>
                
                <div className="mt-2 pt-2 border-t border-gray-700/50">
                  <p className="text-xs text-gray-400 mb-1">Affected Areas:</p>
                  <div className="flex flex-wrap gap-1">
                    {record.areas.map((area, idx) => (
                      <span key={idx} className="text-xs bg-gray-800/50 px-2 py-0.5 rounded text-gray-300">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Stats Panel Component
const StatsPanel = () => {
  const activeSensors = IOT_SENSORS.filter(s => s.status === 'active').length;
  const warningSensors = IOT_SENSORS.filter(s => s.status === 'warning').length;
  const criticalSensors = IOT_SENSORS.filter(s => s.status === 'critical').length;
  const totalRainfall = IOT_SENSORS.reduce((sum, s) => sum + s.rainfall, 0) / IOT_SENSORS.length;

  return (
    <div className="absolute top-6 right-6 bg-gray-900/95 backdrop-blur-md p-5 rounded-xl shadow-2xl border border-gray-700 z-[1000]" style={{ minWidth: '280px', maxWidth: '320px' }}>
      <h3 className="text-white font-bold mb-4 flex items-center text-lg border-b border-gray-700 pb-3">
        <Activity className="w-5 h-5 mr-2 text-blue-400" />
        Real-time Monitoring
      </h3>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gradient-to-br from-green-900/40 to-gray-900 p-4 rounded-lg border border-green-800/30 hover:shadow-lg hover:shadow-green-500/20 transition-all">
          <p className="text-xs text-gray-400 mb-2 font-medium">Active Sensors</p>
          <p className="text-3xl font-bold text-green-400 mb-1">{activeSensors}</p>
          <p className="text-xs text-green-600 font-semibold">● Online</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-900/40 to-gray-900 p-4 rounded-lg border border-yellow-800/30 hover:shadow-lg hover:shadow-yellow-500/20 transition-all">
          <p className="text-xs text-gray-400 mb-2 font-medium">Warnings</p>
          <p className="text-3xl font-bold text-yellow-400 mb-1">{warningSensors}</p>
          <p className="text-xs text-yellow-600 font-semibold">⚠ Alert</p>
        </div>
        <div className="bg-gradient-to-br from-red-900/40 to-gray-900 p-4 rounded-lg border border-red-800/30 hover:shadow-lg hover:shadow-red-500/20 transition-all">
          <p className="text-xs text-gray-400 mb-2 font-medium">Critical</p>
          <p className="text-3xl font-bold text-red-400 mb-1">{criticalSensors}</p>
          <p className="text-xs text-red-600 font-semibold">🔴 Urgent</p>
        </div>
        <div className="bg-gradient-to-br from-blue-900/40 to-gray-900 p-4 rounded-lg border border-blue-800/30 hover:shadow-lg hover:shadow-blue-500/20 transition-all">
          <p className="text-xs text-gray-400 mb-2 font-medium">Avg Rainfall</p>
          <p className="text-3xl font-bold text-blue-400 mb-1">{totalRainfall.toFixed(1)}</p>
          <p className="text-xs text-blue-600 font-semibold">mm/hr</p>
        </div>
      </div>

      <div className="mt-4 p-3 bg-gradient-to-r from-blue-900/60 to-purple-900/60 rounded-lg border border-blue-700/40">
        <p className="text-xs text-blue-200 flex items-center font-medium">
          <Zap className="w-4 h-4 mr-2 text-yellow-400 animate-pulse" />
          AI System: Optimizing water diversion
        </p>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-700">
        <p className="text-xs text-gray-500">Total Monitored Regions</p>
        <p className="text-lg font-bold text-white">{IOT_SENSORS.length} Zones</p>
      </div>
    </div>
  );
};

// Main Map Component
const ChennaiFloodMap = () => {
  const [showLayers, setShowLayers] = useState({
    sensors: true,
    floodZones: true,
    waterBodies: true,
    drainage: true,
    diversion: true,
  });
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'warning': return '#F59E0B';
      case 'critical': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'low': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'high': return '#F97316';
      case 'critical': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getMarkerIcon = (status) => {
    switch (status) {
      case 'active': return sensorActiveIcon;
      case 'warning': return sensorWarningIcon;
      case 'critical': return sensorCriticalIcon;
      default: return sensorActiveIcon;
    }
  };

  return (
    <div className="relative w-full bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900" style={{ height: '100vh' }}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-900 to-purple-900 p-4 z-[1001] border-b-2 border-blue-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center">
              <MapIcon className="w-6 h-6 mr-3 text-blue-400" />
              Chennai Flood Management System
            </h2>
            <p className="text-sm text-blue-200 mt-1">AI-Driven Geospatial Analysis & Water Diversion Control</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-blue-300">Live Data</p>
            <p className="text-xl font-bold text-green-400">● ONLINE</p>
          </div>
        </div>
      </div>

      <div className="absolute top-[80px] left-0 right-0 bottom-0 rounded-xl overflow-hidden shadow-2xl">
        <MapContainer
          center={CHENNAI_CENTER}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
          preferCanvas={true}
        >
          {/* Fast-loading CartoDB Tile Layer */}
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            maxZoom={19}
          />

        {/* Water Bodies - Rivers, Canals, Wetlands */}
        {showLayers.waterBodies && WATER_BODIES.map((body, idx) => (
          <Polyline
            key={`water-${idx}`}
            positions={body.coords}
            color="#3B82F6"
            weight={body.type === 'river' ? 4 : body.type === 'canal' ? 3 : 2}
            opacity={0.7}
          >
            <Popup>
              <div className="text-sm">
                <strong className="text-blue-600">{body.name}</strong>
                <p className="text-xs text-gray-600 capitalize">{body.type}</p>
              </div>
            </Popup>
          </Polyline>
        ))}

        {/* Drainage Channels */}
        {showLayers.drainage && DRAINAGE_CHANNELS.map((channel, idx) => (
          <Polyline
            key={`drain-${idx}`}
            positions={channel.coords}
            color="#8B5CF6"
            weight={3}
            opacity={0.8}
            dashArray="10, 5"
          >
            <Popup>
              <div className="text-sm">
                <strong className="text-purple-600">{channel.name}</strong>
                <p className="text-xs text-gray-600">Capacity: {channel.capacity}</p>
              </div>
            </Popup>
          </Polyline>
        ))}

        {/* AI-Optimized Diversion Routes */}
        {showLayers.diversion && DIVERSION_ROUTES.map((route) => (
          <Polyline
            key={`divert-${route.id}`}
            positions={route.path}
            color={route.status === 'optimal' ? '#10B981' : route.status === 'active' ? '#3B82F6' : '#6B7280'}
            weight={5}
            opacity={0.9}
            dashArray={route.status === 'standby' ? '15, 10' : '10, 5'}
          >
            <Popup>
              <div className="text-sm min-w-[220px] p-2">
                <h4 className="font-bold text-gray-900 mb-2 text-base border-b pb-2 flex items-center">
                  <Navigation className="w-4 h-4 mr-2 text-green-600" />
                  {route.name}
                </h4>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="font-semibold text-gray-700">Status:</span>
                    <span className={`font-bold px-3 py-1 rounded-full text-xs uppercase ${
                      route.status === 'optimal' ? 'bg-green-600 text-white' : 
                      route.status === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-white'
                    }`}>
                      {route.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">💧 Flow Capacity:</span>
                    <span className="text-blue-600 font-bold">{route.capacity}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">🤖 AI Optimized:</span>
                    <span className="text-green-600 font-bold">✓ Yes</span>
                  </div>
                </div>
                {route.status === 'optimal' && (
                  <div className="mt-3 p-2 bg-green-50 border-l-4 border-green-600 rounded">
                    <p className="text-xs text-green-800 font-semibold">✨ Best route for current conditions</p>
                  </div>
                )}
                {route.status === 'active' && (
                  <div className="mt-3 p-2 bg-blue-50 border-l-4 border-blue-600 rounded">
                    <p className="text-xs text-blue-800 font-semibold">🔄 Currently diverting water</p>
                  </div>
                )}
              </div>
            </Popup>
          </Polyline>
        ))}

        {/* Flood Risk Zones */}
        {showLayers.floodZones && FLOOD_ZONES.map((zone, idx) => (
          <Circle
            key={`zone-${idx}`}
            center={zone.center}
            radius={zone.radius}
            pathOptions={{
              color: getRiskColor(zone.risk),
              fillColor: getRiskColor(zone.risk),
              fillOpacity: 0.2,
              weight: 3,
              dashArray: zone.risk === 'critical' ? '10, 5' : undefined,
            }}
          >
            <Popup>
              <div className="text-sm min-w-[200px] p-2">
                <h4 className="font-bold text-gray-900 mb-2 text-base border-b pb-2 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 text-orange-600" />
                  {zone.name}
                </h4>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="font-semibold text-gray-700">Risk Level:</span>
                    <span 
                      className={`font-bold px-3 py-1 rounded-full text-xs uppercase ${
                        zone.risk === 'critical' ? 'bg-red-600 text-white' :
                        zone.risk === 'high' ? 'bg-orange-600 text-white' :
                        zone.risk === 'medium' ? 'bg-yellow-600 text-white' : 'bg-green-600 text-white'
                      }`}>
                      {zone.risk}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">📏 Coverage Radius:</span>
                    <span className="text-blue-600 font-bold">{(zone.radius / 1000).toFixed(1)}km</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">🏘️ Area:</span>
                    <span className="text-purple-600 font-bold">{(Math.PI * Math.pow(zone.radius / 1000, 2)).toFixed(2)}km²</span>
                  </div>
                </div>
                {zone.risk === 'critical' && (
                  <div className="mt-3 p-2 bg-red-50 border-l-4 border-red-600 rounded">
                    <p className="text-xs text-red-800 font-semibold">⚠️ Immediate attention required</p>
                  </div>
                )}
              </div>
            </Popup>
          </Circle>
        ))}

        {/* IoT Sensor Markers */}
        {showLayers.sensors && IOT_SENSORS.map((sensor) => (
          <Marker
            key={sensor.id}
            position={sensor.position}
            icon={getMarkerIcon(sensor.status)}
          >
            <Popup>
              <div className="text-sm min-w-[220px] p-2">
                <h4 className="font-bold text-gray-900 mb-2 text-base border-b pb-2 flex items-center">
                  <Activity className="w-4 h-4 mr-2 text-blue-600" />
                  {sensor.name}
                </h4>
                <div className="space-y-2 mt-3">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="font-semibold text-gray-700">Status:</span>
                    <span 
                      className="font-bold px-2 py-1 rounded text-xs"
                      style={{ 
                        color: 'white',
                        backgroundColor: getStatusColor(sensor.status) 
                      }}
                    >
                      {sensor.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">💧 Water Level:</span>
                    <span className="text-blue-600 font-bold">{sensor.waterLevel}m</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">🌡️ Temperature:</span>
                    <span className="text-orange-600 font-bold">{sensor.temp}°C</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">🌧️ Rainfall:</span>
                    <span className="text-indigo-600 font-bold">{sensor.rainfall}mm/hr</span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t text-xs text-gray-500">
                  📍 Sensor ID: {sensor.id} | Last updated: Now
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
        </MapContainer>

        {/* Stats Panel */}
        <StatsPanel />

        {/* Map Legend */}
        <MapLegend showLayers={showLayers} setShowLayers={setShowLayers} />
        
        {/* Historical Flood Records */}
        <FloodHistory isOpen={isHistoryOpen} onToggle={() => setIsHistoryOpen(!isHistoryOpen)} />
      </div>
    </div>
  );
};

export default ChennaiFloodMap;
