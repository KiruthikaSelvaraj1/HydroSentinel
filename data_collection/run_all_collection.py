"""
Data Collection Master Script
Runs all data collection scripts in sequence
"""

import os
import sys
from datetime import datetime
import subprocess

COLLECTION_SCRIPTS = [
    {
        'id': 1,
        'name': 'OpenWeatherMap Real-Time Data',
        'script': '01_openweather_realtime.py',
        'requires_api_key': True,
        'estimated_time': '2 minutes',
        'description': 'Collect current weather and 5-day forecast for Chennai'
    },
    {
        'id': 2,
        'name': 'OSM Drainage Network',
        'script': '02_osm_drainage_network.py',
        'requires_api_key': False,
        'estimated_time': '1-2 minutes',
        'description': 'Download drainage channels, canals, rivers from OpenStreetMap'
    },
    {
        'id': 3,
        'name': 'Elevation Data Instructions',
        'script': '03_elevation_high_res.py',
        'requires_api_key': False,
        'estimated_time': '1 minute',
        'description': 'Generate instructions for high-resolution DEM download'
    },
    {
        'id': 4,
        'name': 'Historical Flood Events',
        'script': '04_historical_floods.py',
        'requires_api_key': False,
        'estimated_time': '30 seconds',
        'description': 'Compile documented flood events in Chennai (2005-2023)'
    }
]


def print_banner():
    """Print collection banner"""
    print("\n" + "=" * 70)
    print("     CHENNAI FLOOD MANAGEMENT SYSTEM - DATA COLLECTION")
    print("=" * 70)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70 + "\n")


def check_environment():
    """Check if required packages are installed"""
    print("🔍 Checking environment...")
    
    required_packages = ['requests', 'pandas']
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
            print(f"   ✓ {package}")
        except ImportError:
            print(f"   ✗ {package} (missing)")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\n❌ Missing packages: {', '.join(missing_packages)}")
        print(f"   Install with: pip install {' '.join(missing_packages)}")
        return False
    
    print("✅ Environment OK\n")
    return True


def check_api_key():
    """Check if OpenWeatherMap API key is set"""
    api_key = os.environ.get('OPENWEATHER_API_KEY', '')
    
    if not api_key or api_key == 'YOUR_API_KEY_HERE':
        print("⚠️  OpenWeatherMap API key not found")
        print("   Script 1 will be skipped.")
        print("   To enable: Set environment variable OPENWEATHER_API_KEY")
        return False
    
    print("✅ API key found\n")
    return True


def run_script(script_info, script_dir):
    """Run a single data collection script"""
    print("\n" + "=" * 70)
    print(f"SCRIPT {script_info['id']}: {script_info['name']}")
    print("=" * 70)
    print(f"Description: {script_info['description']}")
    print(f"Estimated time: {script_info['estimated_time']}")
    print("-" * 70)
    
    script_path = os.path.join(script_dir, script_info['script'])
    
    if not os.path.exists(script_path):
        print(f"❌ Script not found: {script_path}")
        return False
    
    try:
        # Run script
        result = subprocess.run(
            [sys.executable, script_path],
            cwd=script_dir,
            capture_output=False,
            text=True
        )
        
        if result.returncode == 0:
            print(f"\n✅ Script {script_info['id']} completed successfully")
            return True
        else:
            print(f"\n⚠️  Script {script_info['id']} completed with warnings")
            return False
    
    except Exception as e:
        print(f"\n❌ Error running script {script_info['id']}: {e}")
        return False


def main():
    """Main collection orchestrator"""
    print_banner()
    
    # Get script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Check environment
    if not check_environment():
        print("\n❌ Environment check failed. Please install missing packages.")
        return
    
    # Check API key
    has_api_key = check_api_key()
    
    # Ask user what to collect
    print("📋 Available data collection scripts:\n")
    for script in COLLECTION_SCRIPTS:
        status = "✓" if not script['requires_api_key'] or has_api_key else "⚠️ (needs API key)"
        print(f"{script['id']}. {script['name']} {status}")
        print(f"   {script['description']}")
        print(f"   Estimated time: {script['estimated_time']}\n")
    
    print("Options:")
    print("  • Enter 'all' to run all available scripts")
    print("  • Enter numbers separated by commas (e.g., '2,3,4')")
    print("  • Enter 'q' to quit")
    
    choice = input("\nYour choice: ").strip().lower()
    
    if choice == 'q':
        print("Cancelled.")
        return
    
    # Determine which scripts to run
    if choice == 'all':
        scripts_to_run = COLLECTION_SCRIPTS.copy()
        # Skip script 1 if no API key
        if not has_api_key:
            scripts_to_run = [s for s in scripts_to_run if s['id'] != 1]
    else:
        try:
            script_ids = [int(x.strip()) for x in choice.split(',')]
            scripts_to_run = [s for s in COLLECTION_SCRIPTS if s['id'] in script_ids]
            
            # Warn if trying to run script 1 without API key
            if any(s['id'] == 1 for s in scripts_to_run) and not has_api_key:
                print("\n⚠️  Script 1 requires API key. Skipping...")
                scripts_to_run = [s for s in scripts_to_run if s['id'] != 1]
        except ValueError:
            print("❌ Invalid input. Please enter numbers separated by commas.")
            return
    
    if not scripts_to_run:
        print("No scripts selected.")
        return
    
    # Run selected scripts
    print(f"\n🚀 Running {len(scripts_to_run)} script(s)...")
    
    results = []
    for script_info in scripts_to_run:
        success = run_script(script_info, script_dir)
        results.append((script_info['name'], success))
    
    # Print summary
    print("\n" + "=" * 70)
    print("COLLECTION SUMMARY")
    print("=" * 70)
    
    for name, success in results:
        status = "✅ SUCCESS" if success else "⚠️  WARNING"
        print(f"{status}: {name}")
    
    successful = sum(1 for _, s in results if s)
    print(f"\n{successful}/{len(results)} scripts completed successfully")
    
    # Show collected data location
    data_dir = os.path.join(os.path.dirname(script_dir), 'collected_data')
    print(f"\n📂 Collected data location:")
    print(f"   {os.path.abspath(data_dir)}")
    
    print("\n" + "=" * 70)
    print(f"Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    
    print("\n💡 NEXT STEPS:")
    print("1. Review collected data in collected_data/ folder")
    print("2. Verify data quality")
    print("3. Integrate into your Flask backend")
    print("4. Update frontend to display new data")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Collection interrupted by user.")
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
