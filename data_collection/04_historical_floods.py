"""
Historical Flood Events Data Collection
Collects documented flood events in Chennai from various sources
"""

import json
import os
from datetime import datetime

# Historical flood events in Chennai (documented)
CHENNAI_FLOODS = [
    {
        'id': 1,
        'date': '2015-12-01',
        'event_name': 'Chennai Floods 2015',
        'description': 'Worst floods in 100 years. Caused by northeast monsoon depression',
        'rainfall_mm': 494,
        'duration_days': 7,
        'affected_population': 1800000,
        'casualties': 500,
        'economic_damage_inr_crores': 20000,
        'severity': 'critical',
        'trigger': 'Northeast monsoon depression over Bay of Bengal',
        'affected_areas': [
            'Adyar', 'Velachery', 'Tambaram', 'Pallavaram', 'Kotturpuram',
            'Nandanam', 'Saidapet', 'T Nagar', 'Anna Nagar', 'Madipakkam'
        ],
        'max_water_depth_m': 3.5,
        'recovery_days': 30,
        'sources': [
            'https://en.wikipedia.org/wiki/2015_South_Indian_floods',
            'IMD Chennai Report 2015',
            'Tamil Nadu State Disaster Management Authority'
        ]
    },
    {
        'id': 2,
        'date': '2021-11-11',
        'event_name': 'Northeast Monsoon 2021',
        'description': 'Heavy rainfall during northeast monsoon',
        'rainfall_mm': 210,
        'duration_days': 3,
        'affected_population': 450000,
        'casualties': 35,
        'economic_damage_inr_crores': 2500,
        'severity': 'high',
        'trigger': 'Northeast monsoon low pressure',
        'affected_areas': [
            'Madhavaram', 'Manali', 'Perambur', 'Anna Nagar',
            'Puzhuthivakkam', 'Mudichur', 'Palavakkam'
        ],
        'max_water_depth_m': 2.0,
        'recovery_days': 7,
        'sources': [
            'The Hindu - November 2021 reports',
            'Chennai Corporation flood reports'
        ]
    },
    {
        'id': 3,
        'date': '2023-12-04',
        'event_name': 'Cyclone Michaung',
        'description': 'Severe cyclonic storm crossing north Tamil Nadu coast',
        'rainfall_mm': 320,
        'duration_days': 4,
        'affected_population': 850000,
        'casualties': 17,
        'economic_damage_inr_crores': 8000,
        'severity': 'high',
        'trigger': 'Cyclone Michaung from Bay of Bengal',
        'affected_areas': [
            'Velachery', 'Pallikaranai', 'Chromepet', 'Porur',
            'ECR coastal areas', 'OMR IT corridor', 'Sholinganallur'
        ],
        'max_water_depth_m': 2.8,
        'recovery_days': 12,
        'sources': [
            'IMD Cyclone Warning 2023',
            'https://en.wikipedia.org/wiki/Cyclone_Michaung',
            'Tamil Nadu Revenue Department'
        ]
    },
    {
        'id': 4,
        'date': '2017-11-09',
        'event_name': 'November Floods 2017',
        'description': 'Flash floods in central Chennai',
        'rainfall_mm': 165,
        'duration_days': 2,
        'affected_population': 200000,
        'casualties': 12,
        'economic_damage_inr_crores': 1200,
        'severity': 'medium',
        'trigger': 'Intense monsoon spell',
        'affected_areas': [
            'T Nagar', 'Nungambakkam', 'Saidapet', 'Kodambakkam'
        ],
        'max_water_depth_m': 1.5,
        'recovery_days': 5,
        'sources': [
            'The Hindu archives',
            'Chennai Corporation reports'
        ]
    },
    {
        'id': 5,
        'date': '2020-11-27',
        'event_name': 'Cyclone Nivar',
        'description': 'Very severe cyclonic storm',
        'rainfall_mm': 287,
        'duration_days': 3,
        'affected_population': 600000,
        'casualties': 28,
        'economic_damage_inr_crores': 5000,
        'severity': 'high',
        'trigger': 'Cyclone Nivar landfall near Chennai',
        'affected_areas': [
            'Sholinganallur', 'OMR', 'ECR Coastal Areas', 'Neelankarai',
            'Injambakkam', 'Thiruvanmiyur'
        ],
        'max_water_depth_m': 2.3,
        'recovery_days': 10,
        'sources': [
            'IMD Cyclone Report 2020',
            'https://en.wikipedia.org/wiki/Cyclone_Nivar'
        ]
    },
    {
        'id': 6,
        'date': '2005-11-14',
        'event_name': 'Floods 2005',
        'description': 'Northeast monsoon floods',
        'rainfall_mm': 320,
        'duration_days': 5,
        'affected_population': 500000,
        'casualties': 75,
        'economic_damage_inr_crores': 3000,
        'severity': 'high',
        'trigger': 'Depression in Bay of Bengal',
        'affected_areas': [
            'North Chennai', 'Ambattur', 'Avadi', 'Poonamallee'
        ],
        'max_water_depth_m': 2.5,
        'recovery_days': 15,
        'sources': [
            'Chennai Corporation archives',
            'TNSDMA historical records'
        ]
    }
]

# Rainfall patterns during flood events
RAINFALL_PATTERNS = {
    '2015': {
        'November': [340, 480, 345, 220, 186],
        'December': [494, 286, 95, 42, 28]
    },
    '2021': {
        'November': [65, 128, 210, 185, 98]
    },
    '2023': {
        'December': [85, 165, 320, 245, 110]
    }
}


def save_flood_data():
    """Save historical flood data"""
    print("=" * 60)
    print("SAVING HISTORICAL FLOOD DATA FOR CHENNAI")
    print("=" * 60)
    
    os.makedirs('collected_data/historical_floods', exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Save as JSON
    json_file = f'collected_data/historical_floods/chennai_floods_{timestamp}.json'
    with open(json_file, 'w') as f:
        json.dump({
            'metadata': {
                'generated': datetime.now().isoformat(),
                'total_events': len(CHENNAI_FLOODS),
                'date_range': '2005-2023',
                'source': 'Compiled from IMD, TNSDMA, news archives'
            },
            'events': CHENNAI_FLOODS,
            'rainfall_patterns': RAINFALL_PATTERNS
        }, f, indent=2)
    
    print(f"\n✅ Saved JSON data: {json_file}")
    
    # Save as CSV
    import pandas as pd
    df = pd.DataFrame(CHENNAI_FLOODS)
    
    # Explode affected_areas into separate rows
    df_areas = df.explode('affected_areas')
    
    csv_file = f'collected_data/historical_floods/chennai_floods_{timestamp}.csv'
    df.to_csv(csv_file, index=False)
    print(f"✅ Saved CSV data: {csv_file}")
    
    # Save affected areas
    areas_csv = f'collected_data/historical_floods/affected_areas_{timestamp}.csv'
    df_areas[['id', 'event_name', 'date', 'affected_areas', 'severity']].to_csv(areas_csv, index=False)
    print(f"✅ Saved affected areas: {areas_csv}")
    
    # Create summary statistics
    print(f"\n📊 HISTORICAL FLOOD SUMMARY")
    print(f"   • Total documented events: {len(CHENNAI_FLOODS)}")
    print(f"   • Date range: 2005-2023")
    print(f"   • Total casualties: {sum(e['casualties'] for e in CHENNAI_FLOODS)}")
    print(f"   • Total affected: {sum(e['affected_population'] for e in CHENNAI_FLOODS):,}")
    print(f"   • Economic damage: ₹{sum(e['economic_damage_inr_crores'] for e in CHENNAI_FLOODS):,} crores")
    print(f"   • Average rainfall: {sum(e['rainfall_mm'] for e in CHENNAI_FLOODS) / len(CHENNAI_FLOODS):.1f} mm")
    
    # Severity distribution
    severity_count = {}
    for event in CHENNAI_FLOODS:
        sev = event['severity']
        severity_count[sev] = severity_count.get(sev, 0) + 1
    
    print(f"\n   Severity distribution:")
    for sev, count in severity_count.items():
        print(f"   • {sev.capitalize()}: {count}")
    
    # Most affected areas
    all_areas = []
    for event in CHENNAI_FLOODS:
        all_areas.extend(event['affected_areas'])
    
    from collections import Counter
    area_counts = Counter(all_areas)
    
    print(f"\n   Most flood-prone areas (top 10):")
    for area, count in area_counts.most_common(10):
        print(f"   • {area}: {count} times")
    
    # Create visualization data
    viz_data = {
        'timeline': [
            {'year': int(e['date'][:4]), 'casualties': e['casualties'], 
             'affected': e['affected_population'], 'event': e['event_name']}
            for e in CHENNAI_FLOODS
        ],
        'severity_counts': severity_count,
        'top_areas': dict(area_counts.most_common(15))
    }
    
    viz_file = f'collected_data/historical_floods/visualization_data_{timestamp}.json'
    with open(viz_file, 'w') as f:
        json.dump(viz_data, f, indent=2)
    print(f"\n✅ Saved visualization data: {viz_file}")


def create_validation_dataset():
    """Create dataset for model validation"""
    print("\n" + "=" * 60)
    print("CREATING MODEL VALIDATION DATASET")
    print("=" * 60)
    
    validation_data = []
    
    for event in CHENNAI_FLOODS:
        # For each affected area, create a validation point
        for area in event['affected_areas']:
            validation_data.append({
                'event_id': event['id'],
                'event_name': event['event_name'],
                'date': event['date'],
                'location': area,
                'rainfall_mm': event['rainfall_mm'],
                'water_depth_m': event['max_water_depth_m'],
                'flooded': 1,  # Binary indicator
                'severity': event['severity']
            })
    
    import pandas as pd
    df_val = pd.DataFrame(validation_data)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    val_file = f'collected_data/historical_floods/validation_dataset_{timestamp}.csv'
    df_val.to_csv(val_file, index=False)
    
    print(f"\n✅ Created validation dataset: {val_file}")
    print(f"   • Total validation points: {len(validation_data)}")
    print(f"   • Can be used to test ML model accuracy")


if __name__ == '__main__':
    print("📚 Historical Flood Data Collection")
    print(f"⏰ Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    save_flood_data()
    create_validation_dataset()
    
    print("\n✅ Historical flood data collection complete!")
    print("\n💡 NEXT STEPS:")
    print("   1. Review the JSON/CSV files")
    print("   2. Use validation_dataset.csv to test your ML model")
    print("   3. Integrate into frontend for historical flood display")
    print("   4. Use for hydraulic model calibration")
