import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertTriangle, MapPin, TrendingUp, Cpu, LogOut, Users, Settings, Zap, BookOpen, Clock, Loader2, Map as MapIcon, Droplets, Activity } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, addDoc, onSnapshot, collection, query, serverTimestamp } from 'firebase/firestore';
import ChennaiFloodMap from './ChennaiMap';
import FloodDashboard from './FloodDashboard';
import EnhancedFloodDashboard from './EnhancedFloodDashboard';

// --- Global Constants and Mock Data ---
const apiKey = ""; // API key is intentionally left blank for the environment
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

const MOCK_PREDICTION_DATA = [
  { id: 1, region: 'East River Delta', risk: 'High', confidence: '92%', type: 'Flood', affected: '50,000' },
  { id: 2, region: 'Central Plains Zone', risk: 'Medium', confidence: '85%', type: 'Drought', affected: 'Agri-Sector' },
  { id: 3, region: 'Coastal Sector A', risk: 'Low', confidence: '70%', type: 'Cyclone', affected: '2,000' },
];

const MOCK_ANALYTICS_DATA = [
  { month: 'Jan', Floods: 4, Droughts: 1, Cyclones: 0 },
  { month: 'Feb', Floods: 2, Droughts: 0, Cyclones: 1 },
  { month: 'Mar', Floods: 5, Droughts: 2, Cyclones: 0 },
  { month: 'Apr', Floods: 8, Droughts: 3, Cyclones: 2 },
];

const MOCK_CONFIG = {
  alertThreshold: 0.85,
  defaultResponse: "All systems nominal. No immediate high-risk alerts."
};

// --- Firebase Setup (read config from environment - Vite .env.local) ---
let app, db, auth;
// APP_ID is used for Firestore paths used in the app (set in backend and frontend envs)
const appId = typeof __app_id !== 'undefined' ? __app_id : (import.meta.env.VITE_APP_ID || 'flood-management-4001c');

// Read Firebase config from Vite environment variables. Create a .env.local file in the project root
// with values prefixed by VITE_, e.g. VITE_FIREBASE_API_KEY=...
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ''
};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : (import.meta.env.VITE_INITIAL_AUTH_TOKEN || undefined);

try {
    // Initialize Firebase only if apiKey present to avoid noisy errors during dev when env not set
    if (firebaseConfig.apiKey) {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
    } else {
        console.warn('Firebase config not provided via VITE_ env variables. Authentication disabled until configured.');
    }
} catch (error) {
    console.error('Firebase Initialization Error:', error);
}

// --- Helper Functions ---

/**
 * Logs a user action to the public 'logs' collection in Firestore.
 * @param {string} userId - The unique ID of the user performing the action.
 * @param {string} action - Description of the action (e.g., 'LOGIN', 'VIEW_DASHBOARD').
 */
const logUserAction = async (userId, action) => {
    if (!db || !userId) return;
    try {
        const logsRef = collection(db, `artifacts/${appId}/public/data/logs`);
        await addDoc(logsRef, {
            userId: userId,
            action: action,
            timestamp: serverTimestamp(),
        });
        // console.log("Action logged successfully:", action);
    } catch (error) {
        console.error("Error logging action:", error);
    }
};

// --- Components ---

const StatusCard = ({ title, value, icon: Icon, color }) => (
  <div className={`bg-gray-800 p-6 rounded-xl shadow-lg border-t-4 ${color} transform hover:scale-[1.02] transition duration-300`}>
    <div className="flex justify-between items-start">
      <h3 className="text-sm font-medium text-gray-400 uppercase">{title}</h3>
      <Icon className="w-6 h-6 text-gray-500" />
    </div>
    <p className="text-3xl font-extrabold text-white mt-2">{value}</p>
  </div>
);

const Sidebar = ({ currentView, setView, role, user }) => {
  const NavItem = ({ view, icon: Icon, label, requiredRole }) => {
    if (requiredRole === 'admin' && role !== 'admin') return null;

    const isActive = currentView === view;
    const baseClasses = "flex items-center p-3 my-1 rounded-lg transition duration-200";
    const activeClasses = "bg-gray-700 text-white font-semibold shadow-inner";
    const inactiveClasses = "text-gray-400 hover:bg-gray-800 hover:text-white";

    return (
      <button
        onClick={() => setView(view)}
        className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses} w-full`}
      >
        <Icon className="w-5 h-5 mr-3" />
        <span className="text-sm">{label}</span>
      </button>
    );
  };

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col p-4 space-y-6 flex-shrink-0 sticky top-0 h-screen">
      <div className="text-2xl font-black text-blue-400 mb-6">HydroSentinel</div>

      <div className="flex flex-col space-y-1">
        <NavItem view="dashboard" icon={TrendingUp} label="Dashboard" requiredRole="user" />
        <NavItem view="livecontrol" icon={Activity} label="Live Control" requiredRole="user" />
        <NavItem view="flooddashboard" icon={Droplets} label="Flood Dashboard" requiredRole="user" />
        <NavItem view="map" icon={MapIcon} label="Chennai Map" requiredRole="user" />
        <NavItem view="predictions" icon={Cpu} label="Predictions" requiredRole="user" />
        <NavItem view="analytics" icon={MapPin} label="Analytics" requiredRole="user" />
        {/* Admin-only views */}
        <NavItem view="logs" icon={BookOpen} label="Logs (Admin)" requiredRole="admin" />
        <NavItem view="users" icon={Users} label="Users (Admin)" requiredRole="admin" />
        <NavItem view="settings" icon={Settings} label="System Config (Admin)" requiredRole="admin" />
      </div>

      <div className="mt-auto pt-4 border-t border-gray-800">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">User</p>
        <p className="text-sm text-white truncate">{user.email || 'Anonymous User'}</p>
        <p className={`text-xs font-bold mt-1 uppercase ${role === 'admin' ? 'text-red-400' : 'text-green-400'}`}>
            Role: {role}
        </p>
        <p className="text-xs text-gray-500 mt-1 truncate">ID: {user.uid}</p>
      </div>
    </div>
  );
};

const DashboardView = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <StatusCard title="Active Alerts" value="3" icon={AlertTriangle} color="border-red-500" />
    <StatusCard title="Monitored Regions" value="12" icon={MapPin} color="border-blue-500" />
    <StatusCard title="Sensor Health" value="98%" icon={Cpu} color="border-green-500" />
    <StatusCard title="Predicted Events" value="7" icon={TrendingUp} color="border-yellow-500" />

    <div className="lg:col-span-4 bg-gray-800 p-6 rounded-xl shadow-lg mt-6">
      <h3 className="text-xl font-bold text-white mb-4">Latest System Status</h3>
      <p className="text-gray-400">{MOCK_CONFIG.defaultResponse}</p>
      <div className="mt-4 p-4 bg-gray-900 rounded-lg border border-red-700">
        <h4 className="text-red-400 font-semibold flex items-center"><Zap className="w-4 h-4 mr-2" />High Alert Zone: East River Delta</h4>
        <p className="text-sm text-gray-300 mt-1">Water level at 95% capacity. Risk factor: High (92% confidence). Deploying rapid response teams.</p>
      </div>
    </div>
  </div>
);

const PredictionsView = () => {
  const [selectedRegion, setSelectedRegion] = useState(null);
  
  // Extended prediction data with more details
  const EXTENDED_PREDICTIONS = [
    { id: 1, region: 'East River Delta', risk: 'High', confidence: '92%', type: 'Flood', affected: '50,000', waterLevel: 4.2, trend: 'rising', eta: '2 hours', mitigation: 'Activate Pumps A1-A3' },
    { id: 2, region: 'Central Plains Zone', risk: 'Medium', confidence: '85%', type: 'Drought', affected: 'Agri-Sector', waterLevel: 1.2, trend: 'stable', eta: '12 hours', mitigation: 'Monitor' },
    { id: 3, region: 'Coastal Sector A', risk: 'Low', confidence: '70%', type: 'Cyclone', affected: '2,000', waterLevel: 2.1, trend: 'falling', eta: '24 hours', mitigation: 'None Required' },
    { id: 4, region: 'Velachery Basin', risk: 'Critical', confidence: '95%', type: 'Flash Flood', affected: '75,000', waterLevel: 5.1, trend: 'rising', eta: '1 hour', mitigation: 'Emergency Diversion' },
    { id: 5, region: 'Adyar River Zone', risk: 'High', confidence: '88%', type: 'Overflow', affected: '30,000', waterLevel: 3.8, trend: 'rising', eta: '4 hours', mitigation: 'Open Gates G1-G2' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-red-600 to-red-700 p-5 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-200 text-sm">Critical Alerts</p>
              <p className="text-3xl font-black text-white">2</p>
            </div>
            <AlertTriangle className="w-10 h-10 text-red-300 animate-pulse" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-5 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-200 text-sm">High Risk Zones</p>
              <p className="text-3xl font-black text-white">3</p>
            </div>
            <MapPin className="w-10 h-10 text-orange-300" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-amber-500 p-5 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-200 text-sm">Active Monitors</p>
              <p className="text-3xl font-black text-white">12</p>
            </div>
            <Activity className="w-10 h-10 text-yellow-300" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm">Prediction Accuracy</p>
              <p className="text-3xl font-black text-white">94%</p>
            </div>
            <TrendingUp className="w-10 h-10 text-blue-300" />
          </div>
        </div>
      </div>

      {/* Main Predictions Table */}
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center">
            <Zap className="w-6 h-6 mr-2 text-yellow-400" />
            AI-Powered Hazard Predictions
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-green-400 flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
              Live Updating
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead>
              <tr className="text-left text-sm font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3">Region</th>
                <th className="px-4 py-3">Risk Level</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Water Level</th>
                <th className="px-4 py-3">Trend</th>
                <th className="px-4 py-3">ETA</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Affected</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {EXTENDED_PREDICTIONS.map((data) => (
                <tr 
                  key={data.id} 
                  className={`text-gray-300 hover:bg-gray-700/50 transition duration-150 cursor-pointer ${data.risk === 'Critical' ? 'bg-red-900/20' : ''}`}
                  onClick={() => setSelectedRegion(data)}
                >
                  <td className="px-4 py-4 whitespace-nowrap font-medium">{data.region}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      data.risk === 'Critical' ? 'bg-red-600 text-white animate-pulse' :
                      data.risk === 'High' ? 'bg-orange-500 text-white' : 
                      data.risk === 'Medium' ? 'bg-yellow-500 text-black' : 'bg-green-500 text-white'
                    }`}>
                      {data.risk}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">{data.type}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="font-mono font-bold text-blue-400">{data.waterLevel}m</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`flex items-center ${
                      data.trend === 'rising' ? 'text-red-400' : 
                      data.trend === 'falling' ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                      {data.trend === 'rising' ? '↑' : data.trend === 'falling' ? '↓' : '→'} {data.trend}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-cyan-400 font-medium">{data.eta}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 h-2 bg-gray-600 rounded-full mr-2 overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full" 
                          style={{ width: data.confidence }}
                        ></div>
                      </div>
                      <span className="text-sm">{data.confidence}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">{data.affected}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs font-bold transition">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
          <h4 className="text-lg font-bold text-white mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-cyan-400" />
            Upcoming Events Timeline
          </h4>
          <div className="space-y-4">
            {EXTENDED_PREDICTIONS.slice(0, 4).map((pred, idx) => (
              <div key={idx} className="flex items-start space-x-4">
                <div className={`w-3 h-3 rounded-full mt-1.5 ${
                  pred.risk === 'Critical' ? 'bg-red-500 animate-pulse' :
                  pred.risk === 'High' ? 'bg-orange-500' : 'bg-yellow-500'
                }`}></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">{pred.region}</span>
                    <span className="text-sm text-gray-400">{pred.eta}</span>
                  </div>
                  <p className="text-sm text-gray-400">{pred.type} - {pred.mitigation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
          <h4 className="text-lg font-bold text-white mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-yellow-400" />
            Recommended Actions
          </h4>
          <div className="space-y-3">
            <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
              <p className="text-red-400 font-bold text-sm">URGENT: Velachery Basin</p>
              <p className="text-gray-300 text-sm mt-1">Initiate emergency water diversion protocol immediately</p>
            </div>
            <div className="p-3 bg-orange-900/30 border border-orange-700/50 rounded-lg">
              <p className="text-orange-400 font-bold text-sm">HIGH: Adyar River Zone</p>
              <p className="text-gray-300 text-sm mt-1">Pre-position response teams at checkpoints A1, A2</p>
            </div>
            <div className="p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
              <p className="text-yellow-400 font-bold text-sm">MONITOR: East River Delta</p>
              <p className="text-gray-300 text-sm mt-1">Increase sensor polling frequency to 30-second intervals</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AnalyticsView = () => {
  // Extended analytics data
  const MONTHLY_DATA = [
    { month: 'Jan', Floods: 4, Droughts: 1, Cyclones: 0, rainfall: 45, avgWaterLevel: 2.1 },
    { month: 'Feb', Floods: 2, Droughts: 0, Cyclones: 1, rainfall: 28, avgWaterLevel: 1.8 },
    { month: 'Mar', Floods: 5, Droughts: 2, Cyclones: 0, rainfall: 52, avgWaterLevel: 2.4 },
    { month: 'Apr', Floods: 8, Droughts: 3, Cyclones: 2, rainfall: 78, avgWaterLevel: 3.1 },
    { month: 'May', Floods: 3, Droughts: 4, Cyclones: 1, rainfall: 35, avgWaterLevel: 1.9 },
    { month: 'Jun', Floods: 6, Droughts: 1, Cyclones: 0, rainfall: 62, avgWaterLevel: 2.7 },
  ];

  const ZONE_RISK_DATA = [
    { zone: 'Velachery', risk: 85, incidents: 12, population: 75000 },
    { zone: 'Adyar', risk: 72, incidents: 8, population: 45000 },
    { zone: 'Pallavaram', risk: 68, incidents: 7, population: 55000 },
    { zone: 'Tambaram', risk: 45, incidents: 4, population: 62000 },
    { zone: 'Anna Nagar', risk: 30, incidents: 2, population: 80000 },
  ];

  const YEARLY_COMPARISON = [
    { year: '2021', floods: 18, damage: 250, response: 4.2 },
    { year: '2022', floods: 22, damage: 320, response: 3.8 },
    { year: '2023', floods: 15, damage: 180, response: 2.9 },
    { year: '2024', floods: 12, damage: 120, response: 2.1 },
    { year: '2025', floods: 8, damage: 65, response: 1.5 },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-xl shadow-lg">
          <p className="text-blue-200 text-xs uppercase tracking-wider">Total Incidents</p>
          <p className="text-3xl font-black text-white mt-1">156</p>
          <p className="text-xs text-blue-300 mt-1">↓ 23% vs last year</p>
        </div>
        <div className="bg-gradient-to-br from-green-600 to-green-700 p-4 rounded-xl shadow-lg">
          <p className="text-green-200 text-xs uppercase tracking-wider">Prevented</p>
          <p className="text-3xl font-black text-white mt-1">89</p>
          <p className="text-xs text-green-300 mt-1">↑ 45% improvement</p>
        </div>
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-4 rounded-xl shadow-lg">
          <p className="text-purple-200 text-xs uppercase tracking-wider">Avg Response</p>
          <p className="text-3xl font-black text-white mt-1">1.5h</p>
          <p className="text-xs text-purple-300 mt-1">↓ 65% faster</p>
        </div>
        <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 p-4 rounded-xl shadow-lg">
          <p className="text-cyan-200 text-xs uppercase tracking-wider">Saved (₹Cr)</p>
          <p className="text-3xl font-black text-white mt-1">₹485</p>
          <p className="text-xs text-cyan-300 mt-1">Economic impact</p>
        </div>
        <div className="bg-gradient-to-br from-orange-600 to-orange-700 p-4 rounded-xl shadow-lg">
          <p className="text-orange-200 text-xs uppercase tracking-wider">Lives Protected</p>
          <p className="text-3xl font-black text-white mt-1">2.1M</p>
          <p className="text-xs text-orange-300 mt-1">Population covered</p>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Monthly Hazard Frequency */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-400" />
            Monthly Hazard Frequency
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTHLY_DATA} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ color: '#E5E7EB' }} />
                <Bar dataKey="Floods" stackId="a" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Droughts" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Cyclones" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Yearly Improvement Trend */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-green-400" />
            System Performance Over Years
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={YEARLY_COMPARISON} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ color: '#E5E7EB' }} />
                <Bar dataKey="floods" fill="#EF4444" name="Flood Events" radius={[4, 4, 0, 0]} />
                <Bar dataKey="damage" fill="#F59E0B" name="Damage (₹Cr)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Zone Risk Analysis */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-gray-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-red-400" />
            Zone-wise Risk Analysis
          </h3>
          <div className="space-y-4">
            {ZONE_RISK_DATA.map((zone, idx) => (
              <div key={idx} className="flex items-center">
                <div className="w-28 text-sm text-gray-300 font-medium">{zone.zone}</div>
                <div className="flex-1 mx-4">
                  <div className="h-6 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        zone.risk > 70 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                        zone.risk > 50 ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                        zone.risk > 30 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                        'bg-gradient-to-r from-green-500 to-green-600'
                      }`}
                      style={{ width: `${zone.risk}%` }}
                    ></div>
                  </div>
                </div>
                <div className="w-16 text-right">
                  <span className={`font-bold ${
                    zone.risk > 70 ? 'text-red-400' :
                    zone.risk > 50 ? 'text-orange-400' :
                    zone.risk > 30 ? 'text-yellow-400' : 'text-green-400'
                  }`}>{zone.risk}%</span>
                </div>
                <div className="w-20 text-right text-sm text-gray-400">{zone.incidents} events</div>
                <div className="w-24 text-right text-sm text-gray-400">{(zone.population / 1000).toFixed(0)}K pop</div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Insights */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-yellow-400" />
            Key Insights
          </h3>
          <div className="space-y-4">
            <div className="p-3 bg-green-900/30 border border-green-700/50 rounded-lg">
              <p className="text-green-400 font-bold text-sm">📉 Flood Reduction</p>
              <p className="text-gray-300 text-xs mt-1">Flood incidents reduced by 56% since system deployment</p>
            </div>
            <div className="p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg">
              <p className="text-blue-400 font-bold text-sm">⚡ Response Time</p>
              <p className="text-gray-300 text-xs mt-1">Average emergency response improved from 4.2h to 1.5h</p>
            </div>
            <div className="p-3 bg-purple-900/30 border border-purple-700/50 rounded-lg">
              <p className="text-purple-400 font-bold text-sm">🎯 Prediction Accuracy</p>
              <p className="text-gray-300 text-xs mt-1">AI model accuracy improved to 94% from 78%</p>
            </div>
            <div className="p-3 bg-cyan-900/30 border border-cyan-700/50 rounded-lg">
              <p className="text-cyan-400 font-bold text-sm">💰 Cost Savings</p>
              <p className="text-gray-300 text-xs mt-1">Prevented ₹485Cr in potential flood damage</p>
            </div>
          </div>
        </div>
      </div>

      {/* Infrastructure Stats */}
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center">
          <Cpu className="w-5 h-5 mr-2 text-purple-400" />
          Infrastructure Performance Metrics
        </h3>
        <div className="grid grid-cols-6 gap-4">
          <div className="text-center p-4 bg-gray-700/50 rounded-lg">
            <p className="text-3xl font-black text-blue-400">45</p>
            <p className="text-xs text-gray-400 mt-1">IoT Sensors</p>
          </div>
          <div className="text-center p-4 bg-gray-700/50 rounded-lg">
            <p className="text-3xl font-black text-green-400">8</p>
            <p className="text-xs text-gray-400 mt-1">Pump Stations</p>
          </div>
          <div className="text-center p-4 bg-gray-700/50 rounded-lg">
            <p className="text-3xl font-black text-cyan-400">12</p>
            <p className="text-xs text-gray-400 mt-1">Control Gates</p>
          </div>
          <div className="text-center p-4 bg-gray-700/50 rounded-lg">
            <p className="text-3xl font-black text-yellow-400">99.2%</p>
            <p className="text-xs text-gray-400 mt-1">System Uptime</p>
          </div>
          <div className="text-center p-4 bg-gray-700/50 rounded-lg">
            <p className="text-3xl font-black text-purple-400">120km</p>
            <p className="text-xs text-gray-400 mt-1">Canal Network</p>
          </div>
          <div className="text-center p-4 bg-gray-700/50 rounded-lg">
            <p className="text-3xl font-black text-red-400">24/7</p>
            <p className="text-xs text-gray-400 mt-1">Monitoring</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminLogsView = ({ logs, isAuthReady }) => {
    if (!isAuthReady) {
        return (
            <div className="flex items-center justify-center h-full text-white">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading logs...
            </div>
        );
    }

    return (
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <BookOpen className="w-5 h-5 mr-2 text-red-400" />
            System Activity Log (Admin View)
        </h3>
        <p className="text-gray-400 mb-4">Real-time audit trail of all user and system actions. Logs are sorted by newest first.</p>
        
        <div className="max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-700">
                <thead>
                    <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider sticky top-0 bg-gray-800">
                        <th className="px-6 py-3">Timestamp</th>
                        <th className="px-6 py-3">User ID</th>
                        <th className="px-6 py-3">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                    {logs.length === 0 ? (
                        <tr>
                            <td colSpan="3" className="px-6 py-4 text-center text-gray-500">
                                No activity logs found.
                            </td>
                        </tr>
                    ) : (
                        logs.map((log) => (
                            <tr key={log.id} className="text-gray-300 hover:bg-gray-700 transition duration-150">
                                <td className="px-6 py-3 whitespace-nowrap text-sm">
                                    <div className="flex items-center">
                                        <Clock className="w-3 h-3 mr-2 text-gray-500" />
                                        {new Date(log.timestamp?.toDate ? log.timestamp.toDate() : Date.now()).toLocaleTimeString()}
                                        <span className='ml-2 text-gray-500'>
                                            {new Date(log.timestamp?.toDate ? log.timestamp.toDate() : Date.now()).toLocaleDateString()}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-3 text-xs font-mono break-words max-w-xs">{log.userId}</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-yellow-300">{log.action}</td>
                            </tr>
                        )).sort((a, b) => b.timestamp - a.timestamp) // Sort by timestamp descending
                    )}
                </tbody>
            </table>
        </div>
      </div>
    );
};

const AdminGeneralView = ({ currentView, isAuthReady }) => (
    <div className="bg-gray-800 p-6 rounded-xl shadow-lg min-h-[300px]">
      <h2 className="text-xl font-extrabold text-blue-400 mb-4 capitalize">{currentView} Management (Admin Only)</h2>
      <p className="text-gray-400">Content for {currentView} access controls and configuration goes here. This area is restricted to administrators.</p>
      {currentView === 'users' && (
          <div className='mt-4 p-3 bg-gray-900 rounded-lg'>
              <h4 className='text-white font-semibold mb-2'>Admin Status Check:</h4>
              <p className='text-sm text-green-400'>The user roles are determined by a list stored in Firestore: <code className='text-red-400'>artifacts/{appId}/public/data/roles/admin_list</code></p>
              <p className='text-sm text-gray-400'>Only users whose UID is in the <code className='text-red-400'>adminUids</code> array of that document are granted access to this page.</p>
          </div>
      )}
    </div>
);

const SplashScreen = () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-gray-900 to-blue-800">
        <div className="text-center space-y-6">
            <div className="animate-pulse">
                <div className="text-6xl font-black text-blue-400 mb-4">HydroSentinel</div>
                <div className="text-xl text-gray-300">Flood Management System</div>
            </div>
            <div className="flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
            <p className="text-gray-400">Initializing secure authentication...</p>
        </div>
    </div>
);

const LoginScreen = ({ isAuthReady, onLoginAttempt, firebaseError }) => {
    const [activeTab, setActiveTab] = useState('login'); // 'login' or 'register'
    const [isLoading, setIsLoading] = useState(false);
    const [loginType, setLoginType] = useState('user'); // 'user', 'admin' (anonymous removed for register)
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState(firebaseError || '');

    const handleLogin = async () => {
        setIsLoading(true);
        setError('');
        try {
            if (!auth) {
                throw new Error('Firebase is not initialized. Please check configuration.');
            }
            if (!email || !password) {
                throw new Error('Email and password are required');
            }

            // Sign in with email/password
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log('Successfully signed in with email/password:', userCredential.user.uid);

            // Role will be fetched from Firestore in the auth state listener
        } catch (error) {
            console.error('Login error:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async () => {
        setIsLoading(true);
        setError('');
        try {
            if (!auth) {
                throw new Error('Firebase is not initialized. Please check configuration.');
            }
            if (!email || !password || !confirmPassword) {
                throw new Error('All fields are required');
            }
            if (password !== confirmPassword) {
                throw new Error('Passwords do not match');
            }
            if (password.length < 6) {
                throw new Error('Password must be at least 6 characters');
            }

            // Create user with Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log('Successfully registered:', userCredential.user.uid);

            // User is already created with Firebase Auth, just proceed
            // The role will be determined from Firestore admin_list
            console.log('Registration successful, user will be logged in automatically');

            // User is now logged in automatically via Firebase Auth
            // Role will be fetched from Firestore admin_list in auth state listener
        } catch (error) {
            console.error('Registration error:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnonymous = async () => {
        setIsLoading(true);
        setError('');
        try {
            if (!auth) {
                throw new Error('Firebase is not initialized. Please check configuration.');
            }
            // Anonymous login using Firebase Auth directly
            const userCredential = await signInAnonymously(auth);
            console.log('Successfully signed in anonymously:', userCredential.user.uid);
            // Auth state listener will handle the rest
        } catch (error) {
            console.error('Anonymous login error:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-gray-900 to-blue-800 p-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700">
                <div className="text-center">
                    <h1 className="text-4xl font-black text-blue-400 mb-2">HydroSentinel</h1>
                    <p className="text-gray-300">Flood Management System</p>
                </div>

                {/* Tab Navigation */}
                <div className="flex rounded-lg bg-gray-700 p-1">
                    <button
                        onClick={() => setActiveTab('login')}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition duration-200 ${
                            activeTab === 'login' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                        }`}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => setActiveTab('register')}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition duration-200 ${
                            activeTab === 'register' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                        }`}
                    >
                        Register
                    </button>
                </div>

                {error && (
                    <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg">
                        <p className="text-red-300 text-sm">{error}</p>
                    </div>
                )}

                {activeTab === 'login' ? (
                    <>
                        {/* Login Form */}
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="login-email" className="block text-sm font-medium text-gray-300 mb-1">
                                    Email
                                </label>
                                <input
                                    id="login-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                    placeholder="Enter your email"
                                />
                            </div>
                            <div>
                                <label htmlFor="login-password" className="block text-sm font-medium text-gray-300 mb-1">
                                    Password
                                </label>
                                <input
                                    id="login-password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                    placeholder="Enter your password"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-300">Role</label>
                                <div className="flex space-x-4">
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            value="user"
                                            checked={loginType === 'user'}
                                            onChange={(e) => setLoginType(e.target.value)}
                                            className="text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-300">User</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            value="admin"
                                            checked={loginType === 'admin'}
                                            onChange={(e) => setLoginType(e.target.value)}
                                            className="text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-300">Admin</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={handleLogin}
                                disabled={!isAuthReady || isLoading}
                                className="w-full flex justify-center items-center py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Signing In...
                                    </>
                                ) : isAuthReady ? (
                                    'Sign In'
                                ) : (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Initializing...
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleAnonymous}
                                disabled={!isAuthReady || isLoading}
                                className="w-full flex justify-center items-center py-3 px-4 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Signing In...
                                    </>
                                ) : (
                                    'Continue as Guest'
                                )}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Register Form */}
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="register-email" className="block text-sm font-medium text-gray-300 mb-1">
                                    Email
                                </label>
                                <input
                                    id="register-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                    placeholder="Enter your email"
                                />
                            </div>
                            <div>
                                <label htmlFor="register-password" className="block text-sm font-medium text-gray-300 mb-1">
                                    Password
                                </label>
                                <input
                                    id="register-password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                    placeholder="Create a password"
                                />
                            </div>
                            <div>
                                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-300 mb-1">
                                    Confirm Password
                                </label>
                                <input
                                    id="confirm-password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                    placeholder="Confirm your password"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-300">Role</label>
                                <div className="flex space-x-4">
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            value="user"
                                            checked={loginType === 'user'}
                                            onChange={(e) => setLoginType(e.target.value)}
                                            className="text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-300">User</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            value="admin"
                                            checked={loginType === 'admin'}
                                            onChange={(e) => setLoginType(e.target.value)}
                                            className="text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-300">Admin</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleRegister}
                            disabled={!isAuthReady || isLoading}
                            className="w-full flex justify-center items-center py-3 px-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Creating Account...
                                </>
                            ) : isAuthReady ? (
                                'Create Account'
                            ) : (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Initializing...
                                </>
                            )}
                        </button>
                    </>
                )}

                <p className="text-xs text-center text-gray-500">
                    Secure authentication powered by Firebase
                </p>
            </div>
        </div>
    );
};


// --- Main App Component ---
export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('user'); // Default role
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [logs, setLogs] = useState([]);
  const [firebaseError, setFirebaseError] = useState(!auth ? 'Firebase not initialized' : null);


  // 1. Authentication and Role Setup
  useEffect(() => {
    if (!auth || !db) {
        console.error("Firebase services not initialized.");
        setIsAuthReady(true);
        return;
    }

    let unsubscribeAdmin = null;

    // Timeout to prevent indefinite loading
    const timeoutId = setTimeout(() => {
        if (!isAuthReady) {
            console.log("Authentication timeout reached, proceeding to login screen.");
            setIsAuthReady(true);
        }
    }, 3000); // 3 seconds timeout

    // Auth State Listener
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
        clearTimeout(timeoutId); // Clear timeout if auth completes
        if (currentUser) {
            setUser(currentUser);
            setIsAuthenticated(true);

            // Check for Admin Role
            // The admin list is stored publicly for easy access, but writes are controlled by security rules.
            const adminDocRef = doc(db, `artifacts/${appId}/public/data/roles/admin_list`);
            unsubscribeAdmin = onSnapshot(adminDocRef, (docSnap) => {
                const isAdmin = docSnap.exists() && docSnap.data().adminUids?.includes(currentUser.uid);
                setRole(isAdmin ? 'admin' : 'user');
            }, (error) => {
                console.error("Error fetching admin role:", error);
                setRole('user'); // Default to user on error
            });

            // Log successful login
            await logUserAction(currentUser.uid, 'LOGIN_SUCCESS');
            setIsAuthReady(true);
        } else {
            setUser(null);
            setIsAuthenticated(false);
            setRole('user');
            setIsAuthReady(true);
            if (unsubscribeAdmin) {
                unsubscribeAdmin();
                unsubscribeAdmin = null;
            }
        }
    });

    // Initial Sign-In (Anonymous if no token)
    const signIn = async () => {
        try {
            if (initialAuthToken) {
                await signInWithCustomToken(auth, initialAuthToken);
            } else {
                await signInAnonymously(auth);
            }
        } catch (error) {
            console.error("Initial Authentication Error:", error);
            setIsAuthReady(true); // Proceed even on error
        }
    };

    // Only sign in if user state is null and auth is not ready yet.
    if (!user && !isAuthReady) {
        signIn();
    }

    return () => {
        clearTimeout(timeoutId);
        unsubscribeAuth();
        if (unsubscribeAdmin) {
            unsubscribeAdmin();
        }
    };
  }, []);

  // 2. Logging Functionality on View Change
  useEffect(() => {
    // Only log once auth is ready and user is authenticated
    if (isAuthenticated && user && isAuthReady) {
        logUserAction(user.uid, `VIEW_${currentView.toUpperCase()}`);
    }
  }, [currentView, isAuthenticated, user, isAuthReady]);

  // 3. Admin Log Data Fetching (Real-time)
  useEffect(() => {
    if (role === 'admin' && db && isAuthReady) {
        // Fetch logs from the public collection
        const logsQuery = query(collection(db, `artifacts/${appId}/public/data/logs`));

        const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
            const fetchedLogs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setLogs(fetchedLogs);
        }, (error) => {
            console.error("Error fetching logs:", error);
        });

        return () => unsubscribeLogs();
    } else {
        setLogs([]);
    }
  }, [role, isAuthReady]); // Re-run only when role or auth status changes

  // Handler functions
  const handleLogout = async () => {
    if (!auth) return;
    if (user) {
        await logUserAction(user.uid, 'LOGOUT_REQUEST');
    }
    try {
        await signOut(auth);
        // Force immediate state reset for logout
        setUser(null);
        setIsAuthenticated(false);
        setRole('user');
        setIsAuthReady(true);
        setLogs([]);
        setCurrentView('dashboard');
    } catch (error) {
        console.error("Logout Error:", error);
        // Force state reset even on error
        setUser(null);
        setIsAuthenticated(false);
        setRole('user');
        setIsAuthReady(true);
        setLogs([]);
        setCurrentView('dashboard');
    }
  };

  const handleLoginAttempt = () => {
      // Re-attempt sign-in if somehow logged out after init
      if (isAuthReady && !isAuthenticated) {
          const signIn = async () => {
                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                    } else {
                        await signInAnonymously(auth);
                    }
                } catch (error) {
                    console.error("Re-Authentication Error:", error);
                }
          };
          signIn();
      }
  };

  // View Renderer
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'livecontrol':
        return <EnhancedFloodDashboard />;
      case 'flooddashboard':
        return <FloodDashboard />;
      case 'map':
        return <ChennaiFloodMap />;
      case 'predictions':
        return <PredictionsView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'logs':
        if (role === 'admin') return <AdminLogsView logs={logs} isAuthReady={isAuthReady} />;
        return <div className="text-white text-center mt-10">Access Denied: Admin role required for Logs view.</div>;
      case 'users':
      case 'settings':
        if (role === 'admin') return <AdminGeneralView currentView={currentView} isAuthReady={isAuthReady} />;
        return <div className="text-white text-center mt-10">Access Denied: Admin role required for {currentView}.</div>;
      default:
        return <div className="text-white">View not found.</div>;
    }
  };

  if (!isAuthReady) {
    return <SplashScreen />;
  }

  if (!isAuthenticated) {
    return <LoginScreen isAuthReady={isAuthReady} onLoginAttempt={handleLoginAttempt} firebaseError={firebaseError} />;
  }

  return (
    <div className="flex min-h-screen bg-gray-900 font-sans">
      
      {/* Sidebar Navigation */}
      <Sidebar currentView={currentView} setView={setCurrentView} role={role} user={user} />

      {/* Main Content Area */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        
        {/* Header Bar */}
        <header className="flex justify-between items-center pb-6 border-b border-gray-800 mb-8">
          <h1 className="text-3xl font-extrabold text-white">
            {currentView.charAt(0).toUpperCase() + currentView.slice(1)} Overview
          </h1>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 text-red-400 hover:text-red-500 transition duration-200 p-2 rounded-lg bg-gray-800 hover:bg-gray-700"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </header>

        {/* Main View Content */}
        {renderView()}

        {/* Footer for UI aesthetic */}
        <footer className="mt-10 pt-4 border-t border-gray-800 text-center text-sm text-gray-500">
            HydroSentinel &copy; 2024. All Data is real-time and secure.
        </footer>
      </div>
    </div>
  );
}
