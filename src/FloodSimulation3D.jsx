/**
 * =================================================================================================
 * 3D FLOOD SIMULATION COMPONENT
 * =================================================================================================
 * Features:
 * - 3D animated flood visualization using CSS 3D transforms
 * - Real-time flood spreading simulation
 * - Dynamic water level animation
 * - Interactive flood control demonstration
 * - Shows how the flood management system protects regions
 * =================================================================================================
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, RotateCcw, FastForward, Droplets, Shield, AlertTriangle,
  Zap, Activity, TrendingDown, CheckCircle, MapPin, Waves, CloudRain
} from 'lucide-react';

// Chennai zones with elevation data
const CHENNAI_ZONES = [
  { id: 'adyar', name: 'Adyar', x: 55, y: 70, elevation: 8, population: 250000, hasPump: true, hasGate: true },
  { id: 'velachery', name: 'Velachery', x: 45, y: 75, elevation: 5, population: 380000, hasPump: true, hasGate: false },
  { id: 'tambaram', name: 'Tambaram', x: 35, y: 85, elevation: 12, population: 320000, hasPump: false, hasGate: true },
  { id: 'tnagar', name: 'T.Nagar', x: 50, y: 55, elevation: 15, population: 450000, hasPump: true, hasGate: true },
  { id: 'annanagar', name: 'Anna Nagar', x: 45, y: 40, elevation: 18, population: 290000, hasPump: true, hasGate: false },
  { id: 'perambur', name: 'Perambur', x: 55, y: 30, elevation: 10, population: 180000, hasPump: false, hasGate: true },
  { id: 'madhavaram', name: 'Madhavaram', x: 50, y: 20, elevation: 14, population: 150000, hasPump: true, hasGate: true },
  { id: 'chromepet', name: 'Chromepet', x: 40, y: 80, elevation: 6, population: 210000, hasPump: true, hasGate: false },
  { id: 'porur', name: 'Porur', x: 30, y: 60, elevation: 20, population: 180000, hasPump: false, hasGate: true },
  { id: 'sholinganallur', name: 'Sholinganallur', x: 60, y: 80, elevation: 4, population: 160000, hasPump: true, hasGate: true },
  { id: 'nungambakkam', name: 'Nungambakkam', x: 52, y: 48, elevation: 12, population: 120000, hasPump: false, hasGate: false },
  { id: 'mylapore', name: 'Mylapore', x: 58, y: 60, elevation: 9, population: 200000, hasPump: true, hasGate: true },
];

// Rivers and water channels
const WATER_CHANNELS = [
  { id: 'adyar_river', name: 'Adyar River', points: [[65, 70], [55, 70], [45, 72], [35, 75]], color: '#3b82f6' },
  { id: 'cooum_river', name: 'Cooum River', points: [[65, 50], [55, 48], [45, 50], [30, 52]], color: '#0ea5e9' },
  { id: 'buckingham', name: 'Buckingham Canal', points: [[60, 25], [58, 40], [56, 55], [54, 70], [52, 85]], color: '#06b6d4' },
];

// Simulation phases
const SIMULATION_PHASES = [
  { id: 'normal', name: 'Normal Conditions', duration: 3000, description: 'City in normal state, minimal rainfall' },
  { id: 'rain_start', name: 'Heavy Rainfall Begins', duration: 4000, description: 'Monsoon brings heavy rainfall across the city' },
  { id: 'flood_risk', name: 'Flood Risk Rising', duration: 4000, description: 'Water levels increasing in low-lying areas' },
  { id: 'system_activate', name: 'System Activation', duration: 5000, description: 'AI-powered flood management system activates' },
  { id: 'diversion', name: 'Water Diversion', duration: 5000, description: 'Smart pumps and gates redirect water flow' },
  { id: 'protection', name: 'Region Protected', duration: 4000, description: 'Flood waters successfully managed' },
  { id: 'complete', name: 'Simulation Complete', duration: 3000, description: 'All areas protected, system returning to standby' },
];

// Zone Component with 3D effect
function Zone3D({ zone, waterLevel, isFlooding, isProtected, isPumpActive, isGateOpen, systemActive }) {
  const baseHeight = zone.elevation * 2;
  const floodHeight = Math.max(0, waterLevel - zone.elevation) * 15;
  const isAtRisk = waterLevel > zone.elevation * 0.8;
  
  return (
    <div
      className="absolute transform-gpu transition-all duration-500"
      style={{
        left: `${zone.x}%`,
        top: `${zone.y}%`,
        transform: 'translate(-50%, -50%)',
        perspective: '1000px',
      }}
    >
      {/* 3D Building/Zone representation */}
      <div
        className="relative transform-gpu transition-all duration-700"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(60deg) rotateZ(-45deg)`,
        }}
      >
        {/* Zone base */}
        <div
          className={`w-16 h-16 rounded-lg shadow-2xl transition-all duration-500 ${
            isFlooding && !isProtected ? 'bg-red-500 animate-pulse' :
            isProtected ? 'bg-green-500' :
            isAtRisk ? 'bg-yellow-500' :
            'bg-blue-400'
          }`}
          style={{
            transform: `translateZ(${baseHeight}px)`,
            boxShadow: isFlooding && !isProtected 
              ? '0 0 30px rgba(239, 68, 68, 0.8)' 
              : isProtected 
                ? '0 0 30px rgba(34, 197, 94, 0.6)' 
                : '0 10px 40px rgba(0,0,0,0.3)',
          }}
        >
          {/* Water level indicator */}
          {floodHeight > 0 && !isProtected && (
            <div
              className="absolute bottom-0 left-0 right-0 bg-blue-600/80 rounded-b-lg transition-all duration-300"
              style={{ height: `${Math.min(100, floodHeight)}%` }}
            />
          )}
          
          {/* Status icons */}
          <div className="absolute -top-2 -right-2 flex space-x-1">
            {zone.hasPump && isPumpActive && (
              <div className="w-4 h-4 bg-green-400 rounded-full flex items-center justify-center animate-spin-slow">
                <Zap className="w-2 h-2 text-white" />
              </div>
            )}
            {zone.hasGate && isGateOpen && (
              <div className="w-4 h-4 bg-cyan-400 rounded-full flex items-center justify-center animate-pulse">
                <Waves className="w-2 h-2 text-white" />
              </div>
            )}
          </div>
          
          {/* Protection shield */}
          {isProtected && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Shield className="w-8 h-8 text-white animate-bounce" />
            </div>
          )}
        </div>
        
        {/* Elevation pillar */}
        <div
          className="absolute top-full left-1/2 w-12 bg-gradient-to-b from-gray-600 to-gray-800 rounded-b-lg"
          style={{
            height: `${baseHeight}px`,
            transform: 'translateX(-50%)',
          }}
        />
      </div>
      
      {/* Zone label */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
        <span className={`text-xs font-bold px-2 py-1 rounded ${
          isFlooding && !isProtected ? 'bg-red-600 text-white' :
          isProtected ? 'bg-green-600 text-white' :
          'bg-gray-800 text-white'
        }`}>
          {zone.name}
        </span>
      </div>
    </div>
  );
}

// Water Channel Animation
function WaterChannel({ channel, flowIntensity, isActive }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
      <defs>
        <linearGradient id={`flow-${channel.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={channel.color} stopOpacity="0.3">
            <animate attributeName="offset" values="0;1;0" dur="2s" repeatCount="indefinite" />
          </stop>
          <stop offset="50%" stopColor={channel.color} stopOpacity="0.8">
            <animate attributeName="offset" values="0.5;1.5;0.5" dur="2s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor={channel.color} stopOpacity="0.3">
            <animate attributeName="offset" values="1;2;1" dur="2s" repeatCount="indefinite" />
          </stop>
        </linearGradient>
      </defs>
      <path
        d={`M ${channel.points.map(p => `${p[0]}% ${p[1]}%`).join(' L ')}`}
        fill="none"
        stroke={isActive ? `url(#flow-${channel.id})` : channel.color}
        strokeWidth={isActive ? 4 + flowIntensity : 3}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`transition-all duration-500 ${isActive ? 'animate-pulse' : ''}`}
        style={{
          filter: isActive ? 'drop-shadow(0 0 8px ' + channel.color + ')' : 'none',
        }}
      />
    </svg>
  );
}

// Rain Animation Overlay
function RainOverlay({ intensity }) {
  const drops = Array.from({ length: Math.floor(intensity * 50) }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 0.5 + Math.random() * 0.5,
  }));
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {drops.map(drop => (
        <div
          key={drop.id}
          className="absolute w-0.5 h-8 bg-gradient-to-b from-transparent via-blue-400 to-blue-600 opacity-60"
          style={{
            left: `${drop.left}%`,
            animation: `rain ${drop.duration}s linear ${drop.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes rain {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 2s linear infinite;
        }
      `}</style>
    </div>
  );
}

// Stats Panel
function SimulationStats({ phase, zones, waterLevel, systemActive, diversionRate }) {
  const floodingZones = zones.filter(z => waterLevel > z.elevation && !z.isProtected).length;
  const protectedZones = zones.filter(z => z.isProtected).length;
  const atRiskPopulation = zones
    .filter(z => waterLevel > z.elevation * 0.8)
    .reduce((sum, z) => sum + z.population, 0);
  
  return (
    <div className="absolute top-4 right-4 bg-gray-900/95 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-gray-700 z-20 w-72">
      <h3 className="text-white font-bold mb-3 flex items-center">
        <Activity className="w-5 h-5 mr-2 text-blue-400 animate-pulse" />
        Live Simulation Stats
      </h3>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Water Level</span>
          <div className="flex items-center">
            <div className="w-24 h-2 bg-gray-700 rounded-full mr-2 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  waterLevel > 15 ? 'bg-red-500' : waterLevel > 10 ? 'bg-yellow-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, waterLevel * 5)}%` }}
              />
            </div>
            <span className="text-white font-bold text-sm">{waterLevel.toFixed(1)}m</span>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Zones at Risk</span>
          <span className={`font-bold ${floodingZones > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {floodingZones} / {zones.length}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Protected Zones</span>
          <span className="text-green-400 font-bold">{protectedZones}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">At-Risk Population</span>
          <span className="text-yellow-400 font-bold">
            {(atRiskPopulation / 1000).toFixed(0)}K
          </span>
        </div>
        
        {systemActive && (
          <>
            <div className="border-t border-gray-700 pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Diversion Rate</span>
                <span className="text-cyan-400 font-bold">{diversionRate.toFixed(0)} m³/hr</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">System Status</span>
              <span className="text-green-400 font-bold flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                ACTIVE
              </span>
            </div>
          </>
        )}
      </div>
      
      {/* Current Phase */}
      <div className="mt-4 p-3 bg-blue-900/50 rounded-lg border border-blue-700">
        <p className="text-blue-300 text-xs font-semibold uppercase mb-1">Current Phase</p>
        <p className="text-white font-bold">{phase.name}</p>
        <p className="text-gray-400 text-xs mt-1">{phase.description}</p>
      </div>
    </div>
  );
}

// Timeline Progress
function SimulationTimeline({ phases, currentPhaseIndex, progress }) {
  return (
    <div className="absolute bottom-4 left-4 right-4 bg-gray-900/95 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-gray-700 z-20">
      <div className="flex items-center space-x-2 mb-3">
        {phases.map((phase, idx) => (
          <React.Fragment key={phase.id}>
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                idx < currentPhaseIndex
                  ? 'bg-green-500 text-white'
                  : idx === currentPhaseIndex
                    ? 'bg-blue-500 text-white animate-pulse'
                    : 'bg-gray-700 text-gray-400'
              }`}
            >
              {idx < currentPhaseIndex ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <span className="text-xs font-bold">{idx + 1}</span>
              )}
            </div>
            {idx < phases.length - 1 && (
              <div className="flex-1 h-1 bg-gray-700 rounded overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    idx < currentPhaseIndex ? 'bg-green-500 w-full' :
                    idx === currentPhaseIndex ? 'bg-blue-500' : 'bg-gray-700'
                  }`}
                  style={{ width: idx === currentPhaseIndex ? `${progress}%` : undefined }}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      
      <div className="flex justify-between text-xs text-gray-400">
        <span>{phases[0].name}</span>
        <span className="font-bold text-white">{phases[currentPhaseIndex]?.name}</span>
        <span>{phases[phases.length - 1].name}</span>
      </div>
    </div>
  );
}

// Main 3D Flood Simulation Component
export default function FloodSimulation3D() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [waterLevel, setWaterLevel] = useState(0);
  const [rainIntensity, setRainIntensity] = useState(0);
  const [systemActive, setSystemActive] = useState(false);
  const [diversionRate, setDiversionRate] = useState(0);
  const [zones, setZones] = useState(CHENNAI_ZONES.map(z => ({ ...z, isProtected: false })));
  
  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);
  
  // Reset simulation
  const resetSimulation = useCallback(() => {
    setIsPlaying(false);
    setCurrentPhaseIndex(0);
    setPhaseProgress(0);
    setWaterLevel(0);
    setRainIntensity(0);
    setSystemActive(false);
    setDiversionRate(0);
    setZones(CHENNAI_ZONES.map(z => ({ ...z, isProtected: false })));
  }, []);
  
  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;
    
    const animate = (timestamp) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = timestamp - lastTimeRef.current;
      
      const currentPhase = SIMULATION_PHASES[currentPhaseIndex];
      if (!currentPhase) {
        setIsPlaying(false);
        return;
      }
      
      // Update phase progress
      const newProgress = phaseProgress + (deltaTime / currentPhase.duration) * 100;
      
      if (newProgress >= 100) {
        // Move to next phase
        if (currentPhaseIndex < SIMULATION_PHASES.length - 1) {
          setCurrentPhaseIndex(prev => prev + 1);
          setPhaseProgress(0);
        } else {
          setIsPlaying(false);
          return;
        }
      } else {
        setPhaseProgress(newProgress);
      }
      
      // Update simulation state based on phase
      const phase = SIMULATION_PHASES[currentPhaseIndex];
      
      switch (phase.id) {
        case 'normal':
          setWaterLevel(prev => Math.max(0, prev - 0.05));
          setRainIntensity(0.1);
          break;
          
        case 'rain_start':
          setRainIntensity(0.5 + newProgress / 200);
          setWaterLevel(prev => Math.min(8, prev + 0.15));
          break;
          
        case 'flood_risk':
          setRainIntensity(0.8);
          setWaterLevel(prev => Math.min(15, prev + 0.2));
          break;
          
        case 'system_activate':
          setSystemActive(true);
          setRainIntensity(0.6);
          setDiversionRate(prev => Math.min(5000, prev + 100));
          setWaterLevel(prev => Math.max(10, prev - 0.05));
          break;
          
        case 'diversion':
          setDiversionRate(prev => Math.min(8000, prev + 50));
          setWaterLevel(prev => Math.max(5, prev - 0.15));
          setZones(prev => prev.map((z, idx) => ({
            ...z,
            isProtected: idx < Math.floor((newProgress / 100) * prev.length)
          })));
          break;
          
        case 'protection':
          setDiversionRate(8000);
          setWaterLevel(prev => Math.max(2, prev - 0.1));
          setRainIntensity(prev => Math.max(0.2, prev - 0.01));
          setZones(prev => prev.map(z => ({ ...z, isProtected: true })));
          break;
          
        case 'complete':
          setRainIntensity(prev => Math.max(0, prev - 0.02));
          setWaterLevel(prev => Math.max(0, prev - 0.1));
          setDiversionRate(prev => Math.max(0, prev - 200));
          break;
      }
      
      lastTimeRef.current = timestamp;
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentPhaseIndex, phaseProgress]);
  
  const currentPhase = SIMULATION_PHASES[currentPhaseIndex] || SIMULATION_PHASES[0];
  
  return (
    <div className="relative w-full h-[700px] bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }} />
      </div>
      
      {/* Rain Overlay */}
      <RainOverlay intensity={rainIntensity} />
      
      {/* Water Channels */}
      {WATER_CHANNELS.map(channel => (
        <WaterChannel
          key={channel.id}
          channel={channel}
          flowIntensity={waterLevel / 5}
          isActive={systemActive}
        />
      ))}
      
      {/* 3D Zones */}
      {zones.map(zone => (
        <Zone3D
          key={zone.id}
          zone={zone}
          waterLevel={waterLevel}
          isFlooding={waterLevel > zone.elevation}
          isProtected={zone.isProtected}
          isPumpActive={systemActive && zone.hasPump}
          isGateOpen={systemActive && zone.hasGate}
          systemActive={systemActive}
        />
      ))}
      
      {/* Stats Panel */}
      <SimulationStats
        phase={currentPhase}
        zones={zones}
        waterLevel={waterLevel}
        systemActive={systemActive}
        diversionRate={diversionRate}
      />
      
      {/* Timeline */}
      <SimulationTimeline
        phases={SIMULATION_PHASES}
        currentPhaseIndex={currentPhaseIndex}
        progress={phaseProgress}
      />
      
      {/* Controls */}
      <div className="absolute top-4 left-4 flex space-x-2 z-20">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`px-4 py-2 rounded-lg font-bold flex items-center space-x-2 transition-all ${
            isPlaying
              ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          <span>{isPlaying ? 'Pause' : 'Play'}</span>
        </button>
        
        <button
          onClick={resetSimulation}
          className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold flex items-center space-x-2 transition-all"
        >
          <RotateCcw className="w-5 h-5" />
          <span>Reset</span>
        </button>
        
        <button
          onClick={() => {
            if (currentPhaseIndex < SIMULATION_PHASES.length - 1) {
              setCurrentPhaseIndex(prev => prev + 1);
              setPhaseProgress(0);
            }
          }}
          className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-bold flex items-center space-x-2 transition-all"
        >
          <FastForward className="w-5 h-5" />
          <span>Skip</span>
        </button>
      </div>
      
      {/* Title Overlay */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
        <div className="bg-gray-900/90 backdrop-blur-md px-6 py-3 rounded-xl border border-gray-700">
          <h2 className="text-white font-bold text-xl flex items-center">
            <Droplets className="w-6 h-6 mr-2 text-blue-400" />
            Chennai Flood Management - 3D Simulation
          </h2>
        </div>
      </div>
    </div>
  );
}
