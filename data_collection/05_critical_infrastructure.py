"""
Critical Infrastructure & Urban Features Collection
Extracts hospitals, schools, police stations, and other critical infrastructure from OpenStreetMap
"""

import requests
import json
import pandas as pd
from datetime import datetime
import os

# Chennai bounding box
CHENNAI_BBOX = {
    'south': 12.75,
    'west': 79.75,
    'north': 13.35,
    'east': 80.45
}

# Overpass API endpoint
OVERPASS_URL = "http://overpass-api.de/api/interpreter"

# Critical infrastructure categories
INFRASTRUCTURE_QUERIES = {
    'hospitals': '''
        [out:json][timeout:90];
        (
          node["amenity"="hospital"]({south},{west},{north},{east});
          way["amenity"="hospital"]({south},{west},{north},{east});
          node["amenity"="clinic"]({south},{west},{north},{east});
          way["amenity"="clinic"]({south},{west},{north},{east});
          node["healthcare"]({south},{west},{north},{east});
          way["healthcare"]({south},{west},{north},{east});
        );
        out center;
    ''',
    
    'schools': '''
        [out:json][timeout:90];
        (
          node["amenity"="school"]({south},{west},{north},{east});
          way["amenity"="school"]({south},{west},{north},{east});
          node["amenity"="college"]({south},{west},{north},{east});
          way["amenity"="college"]({south},{west},{north},{east});
          node["amenity"="university"]({south},{west},{north},{east});
          way["amenity"="university"]({south},{west},{north},{east});
        );
        out center;
    ''',
    
    'police_stations': '''
        [out:json][timeout:90];
        (
          node["amenity"="police"]({south},{west},{north},{east});
          way["amenity"="police"]({south},{west},{north},{east});
        );
        out center;
    ''',
    
    'fire_stations': '''
        [out:json][timeout:90];
        (
          node["amenity"="fire_station"]({south},{west},{north},{east});
          way["amenity"="fire_station"]({south},{west},{north},{east});
        );
        out center;
    ''',
    
    'power_infrastructure': '''
        [out:json][timeout:90];
        (
          node["power"="substation"]({south},{west},{north},{east});
          way["power"="substation"]({south},{west},{north},{east});
          node["power"="plant"]({south},{west},{north},{east});
          way["power"="plant"]({south},{west},{north},{east});
        );
        out center;
    ''',
    
    'water_treatment': '''
        [out:json][timeout:90];
        (
          node["man_made"="water_works"]({south},{west},{north},{east});
          way["man_made"="water_works"]({south},{west},{north},{east});
          node["man_made"="wastewater_plant"]({south},{west},{north},{east});
          way["man_made"="wastewater_plant"]({south},{west},{north},{east});
        );
        out center;
    ''',
    
    'transportation': '''
        [out:json][timeout:90];
        (
          node["railway"="station"]({south},{west},{north},{east});
          way["railway"="station"]({south},{west},{north},{east});
          node["aeroway"="aerodrome"]({south},{west},{north},{east});
          way["aeroway"="aerodrome"]({south},{west},{north},{east});
          node["public_transport"="station"]({south},{west},{north},{east});
          way["public_transport"="station"]({south},{west},{north},{east});
        );
        out center;
    ''',
    
    'emergency_shelters': '''
        [out:json][timeout:90];
        (
          node["amenity"="community_centre"]({south},{west},{north},{east});
          way["amenity"="community_centre"]({south},{west},{north},{east});
          node["amenity"="social_facility"]({south},{west},{north},{east});
          way["amenity"="social_facility"]({south},{west},{north},{east});
        );
        out center;
    ''',
    
    'markets': '''
        [out:json][timeout:90];
        (
          node["amenity"="marketplace"]({south},{west},{north},{east});
          way["amenity"="marketplace"]({south},{west},{north},{east});
          node["shop"="mall"]({south},{west},{north},{east});
          way["shop"="mall"]({south},{west},{north},{east});
        );
        out center;
    '''
}


def query_overpass(category, query_template):
    """Query Overpass API for a specific infrastructure category"""
    print(f"\n📍 Querying {category}...")
    
    query = query_template.format(**CHENNAI_BBOX)
    
    try:
        response = requests.post(
            OVERPASS_URL,
            data={'data': query},
            timeout=120
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✓ Found {len(data.get('elements', []))} {category}")
            return data
        else:
            print(f"   ✗ Error {response.status_code}")
            return None
            
    except Exception as e:
        print(f"   ✗ Exception: {e}")
        return None


def extract_features(osm_data, category):
    """Extract features from OSM data"""
    features = []
    
    for element in osm_data.get('elements', []):
        feature = {
            'category': category,
            'osm_id': element.get('id'),
            'osm_type': element.get('type'),
        }
        
        # Get coordinates
        if element.get('type') == 'node':
            feature['lat'] = element.get('lat')
            feature['lon'] = element.get('lon')
        elif 'center' in element:
            feature['lat'] = element['center'].get('lat')
            feature['lon'] = element['center'].get('lon')
        else:
            continue  # Skip if no coordinates
        
        # Get tags
        tags = element.get('tags', {})
        feature['name'] = tags.get('name', 'Unnamed')
        feature['amenity'] = tags.get('amenity', '')
        feature['healthcare'] = tags.get('healthcare', '')
        feature['operator'] = tags.get('operator', '')
        feature['capacity'] = tags.get('capacity', '')
        feature['beds'] = tags.get('beds', '')
        feature['emergency'] = tags.get('emergency', '')
        feature['phone'] = tags.get('phone', '')
        feature['website'] = tags.get('website', '')
        
        # Priority calculation
        if category == 'hospitals':
            if 'emergency' in tags or 'trauma' in str(tags).lower():
                feature['priority'] = 'critical'
            elif tags.get('beds', 0):
                feature['priority'] = 'high'
            else:
                feature['priority'] = 'medium'
        else:
            feature['priority'] = 'medium'
        
        features.append(feature)
    
    return features


def create_geojson(all_features):
    """Create GeoJSON FeatureCollection"""
    geojson_features = []
    
    for feature in all_features:
        geojson_feature = {
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [feature['lon'], feature['lat']]
            },
            'properties': {k: v for k, v in feature.items() if k not in ['lat', 'lon']}
        }
        geojson_features.append(geojson_feature)
    
    return {
        'type': 'FeatureCollection',
        'features': geojson_features,
        'metadata': {
            'generated': datetime.now().isoformat(),
            'source': 'OpenStreetMap',
            'bbox': CHENNAI_BBOX,
            'total_features': len(geojson_features)
        }
    }


def main():
    print("=" * 70)
    print("CHENNAI CRITICAL INFRASTRUCTURE COLLECTION")
    print("=" * 70)
    print(f"Bounding Box: {CHENNAI_BBOX}")
    print(f"Categories: {len(INFRASTRUCTURE_QUERIES)}")
    print("=" * 70)
    
    os.makedirs('collected_data/infrastructure', exist_ok=True)
    
    all_features = []
    category_counts = {}
    
    # Query each category
    for category, query in INFRASTRUCTURE_QUERIES.items():
        osm_data = query_overpass(category, query)
        
        if osm_data:
            features = extract_features(osm_data, category)
            all_features.extend(features)
            category_counts[category] = len(features)
    
    print(f"\n📊 COLLECTION SUMMARY")
    print(f"   Total features: {len(all_features)}")
    print(f"\n   By category:")
    for cat, count in sorted(category_counts.items()):
        print(f"   • {cat}: {count}")
    
    # Save as CSV
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    df = pd.DataFrame(all_features)
    csv_file = f'collected_data/infrastructure/chennai_infrastructure_{timestamp}.csv'
    df.to_csv(csv_file, index=False)
    print(f"\n✅ Saved CSV: {csv_file}")
    
    # Save as GeoJSON
    geojson_data = create_geojson(all_features)
    geojson_file = f'collected_data/infrastructure/chennai_infrastructure_{timestamp}.geojson'
    with open(geojson_file, 'w') as f:
        json.dump(geojson_data, f, indent=2)
    print(f"✅ Saved GeoJSON: {geojson_file}")
    
    # Save by category
    for category in category_counts.keys():
        cat_features = [f for f in all_features if f['category'] == category]
        if cat_features:
            cat_df = pd.DataFrame(cat_features)
            cat_file = f'collected_data/infrastructure/{category}_{timestamp}.csv'
            cat_df.to_csv(cat_file, index=False)
    
    print(f"\n✅ Also saved individual category files")
    
    # Priority infrastructure summary
    print(f"\n⚠️  CRITICAL INFRASTRUCTURE:")
    critical = df[df['priority'] == 'critical']
    print(f"   • Critical: {len(critical)} facilities")
    print(f"   • Hospitals: {len(df[df['category'] == 'hospitals'])}")
    print(f"   • Police: {len(df[df['category'] == 'police_stations'])}")
    print(f"   • Fire: {len(df[df['category'] == 'fire_stations'])}")
    
    # Coverage check
    print(f"\n📍 SPATIAL COVERAGE:")
    lat_range = df['lat'].max() - df['lat'].min()
    lon_range = df['lon'].max() - df['lon'].min()
    print(f"   Latitude: {df['lat'].min():.4f} to {df['lat'].max():.4f} ({lat_range:.3f}°)")
    print(f"   Longitude: {df['lon'].min():.4f} to {df['lon'].max():.4f} ({lon_range:.3f}°)")
    
    expected_lat = CHENNAI_BBOX['north'] - CHENNAI_BBOX['south']
    expected_lon = CHENNAI_BBOX['east'] - CHENNAI_BBOX['west']
    print(f"   Coverage: {lat_range/expected_lat*100:.1f}% lat, {lon_range/expected_lon*100:.1f}% lon")
    
    print(f"\n✅ Collection complete!")
    print(f"\n💡 NEXT STEPS:")
    print(f"   1. Review the GeoJSON in https://geojson.io/")
    print(f"   2. Verify critical infrastructure locations")
    print(f"   3. Add to your flood risk calculations")
    print(f"   4. Integrate with population data for exposure")


if __name__ == '__main__':
    main()
