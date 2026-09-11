"""
=================================================================================================
STARTUP SCRIPT FOR CHENNAI FLOOD MANAGEMENT SYSTEM
=================================================================================================
Run this script to start all services for the enhanced prototype demonstration.
=================================================================================================
"""

import subprocess
import sys
import os
import time
import webbrowser
from threading import Thread

def install_dependencies():
    """Install Python dependencies"""
    print("\n📦 Installing Python dependencies...")
    subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt", "-q"])
    print("   ✅ Python dependencies installed")

def start_backend():
    """Start the enhanced backend API server"""
    print("\n🔧 Starting Enhanced Backend API...")
    backend_script = os.path.join("backend", "enhanced_api.py")
    subprocess.run([sys.executable, backend_script])

def start_frontend():
    """Start the Vite frontend server"""
    print("\n🎨 Starting Frontend (Vite)...")
    subprocess.run(["npm", "run", "dev"], shell=True)

def check_npm_dependencies():
    """Check and install npm dependencies if needed"""
    if not os.path.exists("node_modules"):
        print("\n📦 Installing npm dependencies...")
        subprocess.run(["npm", "install"], shell=True)
        print("   ✅ npm dependencies installed")

def main():
    print("=" * 80)
    print("🌊 CHENNAI FLOOD MANAGEMENT SYSTEM - ENHANCED PROTOTYPE")
    print("=" * 80)
    print("\nThis script will start all services for the live demonstration.")
    print("\nServices:")
    print("   • Enhanced Backend API (Port 5000)")
    print("   • Vite Frontend Dev Server (Port 5173)")
    print("   • WebSocket Real-time Updates")
    print("   • Live IoT Sensor Network Simulation")
    print("   • Live Weather Data Integration")
    
    # Install dependencies
    install_dependencies()
    check_npm_dependencies()
    
    print("\n" + "=" * 80)
    print("🚀 Starting Services...")
    print("=" * 80)
    
    # Start backend in a separate thread
    backend_thread = Thread(target=start_backend, daemon=True)
    backend_thread.start()
    
    # Wait for backend to initialize
    print("\n⏳ Waiting for backend to initialize...")
    time.sleep(5)
    
    # Open browser
    print("\n🌐 Opening browser at http://localhost:5173")
    webbrowser.open("http://localhost:5173")
    
    # Start frontend (this will block)
    start_frontend()

if __name__ == "__main__":
    main()
