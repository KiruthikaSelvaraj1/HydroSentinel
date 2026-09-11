"""
OpenStreetMap Drainage Network Data Collection
Downloads drainage channels, canals, rivers from OSM for Chennai
Uses Overpass API
"""

import requests
import json
import os
from datetime import datetime
import time

# Chennai bounding box (south, west, north, east)
CHENNAI_BBOX = {
    'south': 12.8,
    'west': 79.8,
    'north': 13.3,
    'east': 80.4
}

OVERPASS_URL = "https://overpass-api.de/api/interpreter"


def build_overpass_query():
    """Build Overpass QL query for Chennai water infrastructure"""
    bbox = f"{CHENNAI_BBOX['south']},{CHENNAI_BBOX['west']},{CHENNAI_BBOX['north']},{CHENNAI_BBOX['east']}"
    
    query = f"""
    [out:json][timeout:90];
    (
      // Drainage channels
      way["waterway"="drain"]({bbox});
      way["waterway"="ditch"]({bbox});
      
      // Canals
      way["waterway"="canal"]({bbox});
      
      // Rivers and streams
      way["waterway"="river"]({bbox});
      way["waterway"="stream"]({bbox});
      
      // Storm drains
      way["man_made"="storm_drain"]({bbox});
      
      // Water bodies
      way["natural"="water"]({bbox});
      relation["natural"="water"]({bbox});
      
      // Wetlands
      way["natural"="wetland"]({bbox});
    );
    out geom;
    >;
    out skel qt;
    """
    return query


def fetch_osm_data():
    """Fetch data from Overpass API"""
    print("=" * 60)
    print("DOWNLOADING CHENNAI DRAINAGE NETWORK FROM OPENSTREETMAP")
    print("=" * 60)
    print(f"\n📍 Bounding Box: {CHENNAI_BBOX}")
    print("🔄 Sending query to Overpass API...")
    print("   (This may take 30-60 seconds...)\n")
    
    query = build_overpass_query()
    
    try:
        response = requests.post(
            OVERPASS_URL,
            data={'data': query},
            timeout=120
        )
        response.raise_for_status()
        data = response.json()
        
        print(f"✅ Successfully downloaded OSM data")
        print(f"   • Total elements: {len(data.get('elements', []))}")
        
        return data
    except requests.Timeout:
        print("❌ Request timed out. Try again or reduce bounding box size.")
        return None
    except Exception as e:
        print(f"❌ Error fetching OSM data: {e}")
        return None


def process_osm_data(osm_data):
    """Process OSM data into structured format"""
    if not osm_data or 'elements' not in osm_data:
        return []
    
    print("\n🔧 Processing OSM data...")
    
    features = []
    nodes_dict = {}  # Store nodes for way reconstruction
    
    # First pass: collect all nodes
    for element in osm_data['elements']:
        if element['type'] == 'node':
            nodes_dict[element['id']] = {
                'lat': element['lat'],
                'lon': element['lon']
            }
    
    # Second pass: process ways and relations
    for element in osm_data['elements']:
        if element['type'] == 'way':
            tags = element.get('tags', {})
            
            # Extract coordinates
            coords = []
            if 'geometry' in element:
                coords = [[pt['lon'], pt['lat']] for pt in element['geometry']]
            elif 'nodes' in element:
                for node_id in element['nodes']:
                    if node_id in nodes_dict:
                        node = nodes_dict[node_id]
                        coords.append([node['lon'], node['lat']])
            
            if not coords:
                continue
            
            # Determine feature type
            waterway_type = tags.get('waterway', tags.get('natural', tags.get('man_made', 'unknown')))
            
            feature = {
                'id': element['id'],
                'type': waterway_type,
                'name': tags.get('name', f'Unnamed {waterway_type}'),
                'coordinates': coords,
                'tags': tags,
                'length_km': calculate_length(coords)
            }
            
            features.append(feature)
    
    print(f"   ✓ Processed {len(features)} features")
    
    # Group by type
    by_type = {}
    for feature in features:
        ftype = feature['type']
        if ftype not in by_type:
            by_type[ftype] = []
        by_type[ftype].append(feature)
    
    print(f"\n📊 Features by type:")
    for ftype, items in sorted(by_type.items()):
        print(f"   • {ftype}: {len(items)}")
    
    return features


def calculate_length(coords):
    """Calculate approximate length of a line in kilometers"""
    if len(coords) < 2:
        return 0
    
    total_length = 0
    for i in range(len(coords) - 1):
        lon1, lat1 = coords[i]
        lon2, lat2 = coords[i + 1]
        
        # Haversine formula (approximate)
        from math import radians, sin, cos, sqrt, atan2
        R = 6371  # Earth radius in km
        
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        total_length += R * c
    
    return round(total_length, 3)


def convert_to_geojson(features):
    """Convert features to GeoJSON format"""
    geojson = {
        'type': 'FeatureCollection',
        'metadata': {
            'generated': datetime.now().isoformat(),
            'source': 'OpenStreetMap via Overpass API',
            'bbox': CHENNAI_BBOX,
            'count': len(features)
        },
        'features': []
    }
    
    for feature in features:
        geojson_feature = {
            'type': 'Feature',
            'id': feature['id'],
            'geometry': {
                'type': 'LineString',
                'coordinates': feature['coordinates']
            },
            'properties': {
                'name': feature['name'],
                'type': feature['type'],
                'length_km': feature['length_km'],
                'tags': feature['tags']
            }
        }
        geojson['features'].append(geojson_feature)
    
    return geojson


def save_data(features, osm_raw):
    """Save collected data in multiple formats"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    os.makedirs('collected_data/drainage', exist_ok=True)
    
    # Save raw OSM JSON
    raw_file = f'collected_data/drainage/osm_raw_{timestamp}.json'
    with open(raw_file, 'w') as f:
        json.dump(osm_raw, f, indent=2)
    print(f"\n✅ Saved raw OSM data to: {raw_file}")
    
    # Save processed features as JSON
    features_file = f'collected_data/drainage/drainage_features_{timestamp}.json'
    with open(features_file, 'w') as f:
        json.dump(features, f, indent=2)
    print(f"✅ Saved processed features to: {features_file}")
    
    # Save as GeoJSON
    geojson = convert_to_geojson(features)
    geojson_file = f'collected_data/drainage/drainage_network_{timestamp}.geojson'
    with open(geojson_file, 'w') as f:
        json.dump(geojson, f, indent=2)
    print(f"✅ Saved GeoJSON to: {geojson_file}")
    print(f"   💡 You can visualize this on: https://geojson.io/")
    
    # Save summary as CSV
    import pandas as pd
    df = pd.DataFrame([
        {
            'id': f['id'],
            'name': f['name'],
            'type': f['type'],
            'length_km': f['length_km'],
            'num_points': len(f['coordinates'])
        }
        for f in features
    ])
    csv_file = f'collected_data/drainage/drainage_summary_{timestamp}.csv'
    df.to_csv(csv_file, index=False)
    print(f"✅ Saved summary to: {csv_file}")
    
    # Print statistics
    print(f"\n📊 COLLECTION SUMMARY")
    print(f"   • Total features: {len(features)}")
    print(f"   • Total length: {df['length_km'].sum():.1f} km")
    print(f"   • Average length: {df['length_km'].mean():.2f} km")
    print(f"   • Named features: {df['name'].str.contains('Unnamed').sum()} unnamed")


if __name__ == '__main__':
    print("🗺️  Starting OSM drainage network collection...")
    print(f"⏰ Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # Fetch data
    osm_data = fetch_osm_data()
    
    if osm_data:
        # Process data
        features = process_osm_data(osm_data)
        
        if features:
            # Save data
            save_data(features, osm_data)
            print("\n✅ Drainage network collection complete!")
            print("\n💡 NEXT STEPS:")
            print("   1. Open the .geojson file in QGIS or https://geojson.io/")
            print("   2. Verify the drainage network looks correct")
            print("   3. Import to PostgreSQL with PostGIS for analysis")
        else:
            print("\n⚠️  No features extracted. Check bounding box or query.")
    else:
        print("\n❌ Data collection failed. Check internet connection.")
