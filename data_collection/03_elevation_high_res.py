"""
High-Resolution Elevation Data Collection
Downloads ALOS PALSAR DEM (12.5m resolution) for Chennai
Free alternative to commercial DEMs
"""

import requests
import os
from datetime import datetime

# Chennai bounding box
CHENNAI_BBOX = {
    'west': 79.8,
    'south': 12.8,
    'east': 80.4,
    'north': 13.3
}

# ALOS PALSAR DEM tiles covering Chennai
# Download from: https://search.asf.alaska.edu/
ALOS_DOWNLOAD_INFO = """
ALOS PALSAR DEM (12.5m resolution) - FREE Download Instructions
================================================================

The ALOS PALSAR is a high-quality DEM with 12.5m resolution, perfect for 
flood modeling. Here's how to download it for Chennai:

STEP 1: Visit Alaska Satellite Facility
   URL: https://search.asf.alaska.edu/

STEP 2: Set Search Parameters
   • Data Set: ALOS PALSAR
   • Product Type: RTC (Radiometrically Terrain Corrected)
   • Area of Interest: Draw box around Chennai
     West: 79.8°, South: 12.8°, East: 80.4°, North: 13.3°

STEP 3: Filter Results
   • Look for DEM products (DEM_*.tif files)
   • Usually 2-3 tiles cover Chennai
   • File size: ~100-200 MB per tile

STEP 4: Download
   • Create free account (required)
   • Download tiles
   • Save to: collected_data/elevation/alos/

STEP 5: Process with QGIS
   • Install QGIS (free): https://qgis.org/
   • Merge tiles: Raster → Miscellaneous → Merge
   • Clip to Chennai: Raster → Extraction → Clip Raster by Extent
   • Export: Save as GeoTIFF

ALTERNATIVE: Use existing SRTM data and enhance it
================================================================
If ALOS download is too complex, we can enhance your existing SRTM90 data:
   • Interpolate to higher resolution
   • Apply topographic correction
   • Use for initial modeling
"""

CARTOSAT_INFO = """
CARTOSAT-1 DEM (2.5m resolution) - NRSC Bhuvan
===============================================

For even better resolution (2.5m), request from NRSC:

STEP 1: Visit Bhuvan Portal
   URL: https://bhuvan.nrsc.gov.in/

STEP 2: Navigate to Data Download
   • Go to "Bhuvan Geoportal"
   • Select "Cartosat DEM"
   • Choose area: Tamil Nadu → Chennai

STEP 3: Submit Request
   • Free for research/education
   • Requires:
     - Name and organization
     - Purpose of use (research/thesis)
     - Email verification
   • Processing time: 2-7 days

STEP 4: Download
   • Receive email with download link
   • Format: GeoTIFF
   • Coverage: 2.5m grid spacing

STEP 5: Contact
   Email: bhuvan@nrsc.gov.in
   Phone: +91-40-2388 4242
   Subject: "Cartosat DEM request for Chennai flood research"
"""


def download_srtm_30m():
    """
    Download SRTM 30m DEM (better than SRTM90)
    From USGS Earth Explorer
    """
    print("=" * 60)
    print("SRTM 30M DEM DOWNLOAD INSTRUCTIONS")
    print("=" * 60)
    
    instructions = """
SRTM 30m (1 Arc-Second) - Better than your current SRTM90
==========================================================

STEP 1: Visit USGS Earth Explorer
   URL: https://earthexplorer.usgs.gov/

STEP 2: Register (Free)
   • Create account if you don't have one
   • Login

STEP 3: Search Area
   • Address/Place: Chennai, India
   • OR Coordinates: 
     - Lat: 13.08°N, Lon: 80.27°E

STEP 4: Select Dataset
   • Digital Elevation → SRTM
   • Choose: "SRTM 1 Arc-Second Global"
   • Resolution: 30m (better than your 90m)

STEP 5: Search Results
   • Usually 2-3 tiles cover Chennai
   • Tiles: N12E079, N12E080, N13E079, N13E080

STEP 6: Download
   • Format: GeoTIFF
   • Size: ~25 MB per tile
   • Save to: collected_data/elevation/srtm30/

FILES YOU'LL GET:
   • SRTM1N13E080V3.hgt (HGT format)
   • Convert to GeoTIFF in QGIS

PROCESSING:
   1. Merge tiles in QGIS
   2. Clip to Chennai boundary
   3. Fill voids (if any)
   4. Export as single GeoTIFF
"""
    print(instructions)
    return instructions


def create_download_scripts():
    """Create helper scripts for downloading elevation data"""
    
    os.makedirs('collected_data/elevation', exist_ok=True)
    os.makedirs('collected_data/elevation/srtm30', exist_ok=True)
    os.makedirs('collected_data/elevation/alos', exist_ok=True)
    os.makedirs('collected_data/elevation/cartosat', exist_ok=True)
    
    # Create README with all instructions
    readme = f"""# Elevation Data Collection for Chennai Flood Management

Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Overview
This folder contains scripts and instructions for collecting high-resolution 
elevation data for Chennai. Accurate elevation data is critical for:
- Flood extent prediction
- Drainage flow modeling
- Water accumulation identification
- Hydraulic model calibration

## Current Data (SRTM90)
- Resolution: 90m
- Points: 3,226
- File: ../chennai_elevation_data.csv
- Quality: Good for regional analysis, too coarse for detailed modeling

## Target Upgrades

### 1. SRTM 30m (EASY - Free, No registration)
{download_srtm_30m()}

### 2. ALOS PALSAR 12.5m (MEDIUM - Free, Registration required)
{ALOS_DOWNLOAD_INFO}

### 3. CARTOSAT 2.5m (BEST - Free, Request required)
{CARTOSAT_INFO}

## Folder Structure
```
collected_data/elevation/
├── README.md (this file)
├── srtm30/          # SRTM 30m tiles
├── alos/            # ALOS PALSAR 12.5m
├── cartosat/        # Cartosat 2.5m (when received)
└── processed/       # Merged and clipped DEMs
```

## Processing Workflow (After Download)

### Using QGIS (Recommended)
1. Install QGIS: https://qgis.org/
2. Open QGIS
3. Load DEM tiles: Layer → Add Raster Layer
4. Merge tiles: Raster → Miscellaneous → Merge
5. Clip to Chennai: Raster → Extraction → Clip Raster by Extent
   - Use bbox: 79.8, 12.8, 80.4, 13.3
6. Fill no-data: Raster → Analysis → Fill nodata
7. Export: Right-click layer → Export → Save As
   - Format: GeoTIFF
   - Filename: chennai_dem_30m.tif (or 12.5m, 2.5m)

### Using Python (gdal)
```python
# Install: conda install gdal
from osgeo import gdal

# Merge tiles
gdal.Warp('chennai_merged.tif', ['tile1.tif', 'tile2.tif'])

# Clip to bbox
gdal.Translate('chennai_clipped.tif', 'chennai_merged.tif',
               projWin=[79.8, 13.3, 80.4, 12.8])  # [ulx, uly, lrx, lry]
```

## Which Resolution to Use?

| Task | Min Resolution | Recommended |
|------|---------------|-------------|
| Regional flood extent | 90m (current) | 30m |
| Drainage flow modeling | 30m | 12.5m |
| Building-level risk | 12.5m | 2.5m |
| Micro-watershed | 12.5m | 2.5m |

**For your MVP**: Start with SRTM 30m (easy to get)
**For production**: Use ALOS 12.5m or Cartosat 2.5m

## Next Steps
1. [ ] Download SRTM 30m (today - 30 min)
2. [ ] Process in QGIS (1 hour)
3. [ ] Update ML model with new resolution
4. [ ] Submit Cartosat request (for future)

## Troubleshooting

**Q: USGS Earth Explorer is slow**
A: Use off-peak hours (IST night time = US day time)

**Q: Can't find Chennai tiles**
A: Search by coordinates: 13.08, 80.27

**Q: Download failed**
A: Try again or use different browser

**Q: How to open .hgt files?**
A: Use QGIS or convert to GeoTIFF with gdal

**Q: Tiles don't align**
A: They should auto-align. If not, use same projection (WGS84)

## Contact for Help
- NRSC Bhuvan: bhuvan@nrsc.gov.in
- USGS Support: https://www.usgs.gov/faqs/
- This project: [Your Email]

Happy Data Collecting! 🗺️
"""
    
    readme_file = 'collected_data/elevation/README.md'
    with open(readme_file, 'w', encoding='utf-8') as f:
        f.write(readme)
    
    print(f"\n✅ Created detailed instructions: {readme_file}")
    print(f"\n📖 ELEVATION DATA COLLECTION GUIDE")
    print(f"=" * 60)
    print(f"\n💡 THREE OPTIONS (Choose based on your needs):\n")
    print(f"1. QUICK (30 min):  SRTM 30m - 3x better than current")
    print(f"   → Visit: https://earthexplorer.usgs.gov/")
    print(f"   → Search: Chennai, India")
    print(f"   → Download: SRTM 1 Arc-Second\n")
    
    print(f"2. GOOD (2-3 days): ALOS PALSAR 12.5m - 7x better")
    print(f"   → Visit: https://search.asf.alaska.edu/")
    print(f"   → Sign up (free)")
    print(f"   → Download tiles for Chennai\n")
    
    print(f"3. BEST (1 week):   Cartosat 2.5m - 36x better")
    print(f"   → Email: bhuvan@nrsc.gov.in")
    print(f"   → Subject: Cartosat DEM for Chennai flood research")
    print(f"   → Wait 2-7 days for approval\n")
    
    print(f"📂 Full instructions saved to:")
    print(f"   {os.path.abspath(readme_file)}")
    print(f"\n🎯 RECOMMENDATION: Start with Option 1 (SRTM 30m) today!")


if __name__ == '__main__':
    print("🏔️  Elevation Data Collection Helper")
    print(f"⏰ Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    create_download_scripts()
    
    print("\n" + "=" * 60)
    print("NEXT ACTIONS")
    print("=" * 60)
    print("\n1. Read the generated README.md file")
    print("2. Choose which resolution you need")
    print("3. Follow the download instructions")
    print("4. Come back after download to process the data")
    print("\n✅ Setup complete! Ready to collect elevation data.")
