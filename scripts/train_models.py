"""
=================================================================================================
COMPREHENSIVE ML MODEL TRAINING FOR CHENNAI FLOOD MANAGEMENT SYSTEM
=================================================================================================
This script trains multiple ML models:
1. Enhanced Flood Risk Model (5-level classification with 10,596 points)
2. SCS-CN Runoff Estimation Model (rainfall to runoff conversion)
3. Encroachment Detection Model (change detection for drainage/water body blockage)
4. Water Level Prediction Model (time-series forecasting)
=================================================================================================
"""

import os
import sys
import pandas as pd
import numpy as np
import json
import joblib
from datetime import datetime, timedelta
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import (
    classification_report, confusion_matrix, accuracy_score,
    mean_squared_error, r2_score, mean_absolute_error
)
import warnings
warnings.filterwarnings('ignore')

# Paths
DATA_DIR = os.path.join('data_collection', 'collected_data')
MODELS_DIR = 'models'
os.makedirs(MODELS_DIR, exist_ok=True)

print("="*90)
print("CHENNAI FLOOD MANAGEMENT - ML MODEL TRAINING PIPELINE")
print("="*90)
print(f"Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("="*90)

# ================================================================================================
# MODEL 1: ENHANCED FLOOD RISK PREDICTION (5-Level Classification)
# ================================================================================================

def train_flood_risk_model():
    """
    Train enhanced flood risk model with 5-level classification:
    - critical (< 3m), high (3-10m), medium (10-20m), low (20-50m), minimal (> 50m)
    """
    print("\n" + "="*90)
    print("MODEL 1: ENHANCED FLOOD RISK PREDICTION")
    print("="*90)
    
    # Load enhanced elevation data
    elevation_file = os.path.join(DATA_DIR, 'elevation', 'chennai_elevation_labeled.csv')
    
    if not os.path.exists(elevation_file):
        print(f"❌ ERROR: File not found: {elevation_file}")
        return None
    
    print(f"Loading data from: {elevation_file}")
    df = pd.read_csv(elevation_file)
    print(f"✅ Loaded {len(df)} elevation points")
    
    # Verify columns
    print(f"Columns: {list(df.columns)}")
    
    # Feature engineering
    print("\n📊 Feature Engineering...")
    
    # Basic features
    df['elevation_squared'] = df['elevation'] ** 2
    df['elevation_log'] = np.log1p(df['elevation'] + 2.1)  # Shift for negative values
    
    # Distance from coast (approximate - Chennai coastline ~80.28°E)
    df['distance_from_coast'] = abs(df['longitude'] - 80.28) * 111  # Convert to km
    
    # Latitude zones (North Chennai has different topography)
    df['lat_zone'] = pd.cut(df['latitude'], bins=5, labels=['south', 'south_mid', 'central', 'north_mid', 'north'])
    
    # Interaction features
    df['elev_x_coast_dist'] = df['elevation'] * df['distance_from_coast']
    
    # Encode categorical
    le = LabelEncoder()
    df['lat_zone_encoded'] = le.fit_transform(df['lat_zone'])
    
    # Features for modeling
    feature_cols = ['elevation', 'elevation_squared', 'elevation_log', 'latitude', 'longitude',
                    'distance_from_coast', 'lat_zone_encoded', 'elev_x_coast_dist']
    
    X = df[feature_cols]
    
    # Target: flood_risk (5 levels)
    if 'flood_risk' in df.columns:
        y_risk = df['flood_risk']
    else:
        print("⚠️  'flood_risk' column not found, creating 5-level classification...")
        y_risk = pd.cut(df['elevation'], 
                        bins=[-float('inf'), 3, 10, 20, 50, float('inf')],
                        labels=['critical', 'high', 'medium', 'low', 'minimal'])
    
    # Target: safety_label (binary)
    if 'safety_label' in df.columns:
        y_safety = df['safety_label']
    else:
        y_safety = (df['elevation'] < 10).astype(int)
    
    # Distribution
    print("\n📈 Class Distribution:")
    print(y_risk.value_counts().sort_index())
    print(f"\nBinary Safety Distribution:")
    print(y_safety.value_counts())
    
    # Split data
    X_train, X_test, y_risk_train, y_risk_test, y_safety_train, y_safety_test = train_test_split(
        X, y_risk, y_safety, test_size=0.2, random_state=42, stratify=y_risk
    )
    
    print(f"\nTrain set: {len(X_train)} | Test set: {len(X_test)}")
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # =============================
    # Model 1A: 5-Level Risk Classifier
    # =============================
    print("\n🤖 Training 5-Level Flood Risk Classifier...")
    
    rf_risk = RandomForestClassifier(
        n_estimators=200,
        max_depth=15,
        min_samples_split=20,
        min_samples_leaf=10,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )
    
    rf_risk.fit(X_train_scaled, y_risk_train)
    
    # Predictions
    y_risk_pred = rf_risk.predict(X_test_scaled)
    accuracy = accuracy_score(y_risk_test, y_risk_pred)
    
    print(f"\n✅ 5-Level Classifier Accuracy: {accuracy:.4f} ({accuracy*100:.2f}%)")
    print("\nClassification Report:")
    print(classification_report(y_risk_test, y_risk_pred, zero_division=0))
    
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_risk_test, y_risk_pred))
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': feature_cols,
        'importance': rf_risk.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\nTop 5 Important Features:")
    print(feature_importance.head())
    
    # =============================
    # Model 1B: Binary Safety Classifier
    # =============================
    print("\n🤖 Training Binary Safety Classifier...")
    
    rf_safety = RandomForestClassifier(
        n_estimators=150,
        max_depth=12,
        min_samples_split=10,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )
    
    rf_safety.fit(X_train_scaled, y_safety_train)
    
    # Predictions
    y_safety_pred = rf_safety.predict(X_test_scaled)
    safety_accuracy = accuracy_score(y_safety_test, y_safety_pred)
    
    print(f"\n✅ Binary Safety Classifier Accuracy: {safety_accuracy:.4f} ({safety_accuracy*100:.2f}%)")
    print("\nClassification Report:")
    print(classification_report(y_safety_test, y_safety_pred, zero_division=0))
    
    # Save models
    model_package = {
        'risk_model': rf_risk,
        'safety_model': rf_safety,
        'scaler': scaler,
        'label_encoder': le,
        'feature_cols': feature_cols,
        'risk_accuracy': accuracy,
        'safety_accuracy': safety_accuracy,
        'trained_on': datetime.now().isoformat(),
        'data_points': len(df),
        'class_distribution': y_risk.value_counts().to_dict()
    }
    
    model_path = os.path.join(MODELS_DIR, 'flood_risk_model_enhanced.pkl')
    joblib.dump(model_package, model_path)
    print(f"\n💾 Model saved: {model_path}")
    
    return model_package

# ================================================================================================
# MODEL 2: SCS-CN RUNOFF ESTIMATION MODEL
# ================================================================================================

def train_runoff_model():
    """
    Train SCS-CN based runoff estimation model
    Converts rainfall to surface runoff based on curve number (CN) and soil/land use
    """
    print("\n" + "="*90)
    print("MODEL 2: SCS-CN RUNOFF ESTIMATION")
    print("="*90)
    
    # Generate synthetic training data (real-world data would come from historical events)
    print("📊 Generating training data...")
    
    np.random.seed(42)
    n_samples = 5000
    
    # Features
    rainfall = np.random.exponential(scale=30, size=n_samples)  # mm
    rainfall = np.clip(rainfall, 0, 500)  # Realistic range
    
    # Curve Number (CN) varies by land use
    # Urban: 80-95, Agriculture: 65-80, Forest: 50-70
    land_use = np.random.choice(['urban', 'agriculture', 'forest', 'residential'], size=n_samples)
    
    cn_map = {
        'urban': np.random.uniform(85, 95, size=n_samples),
        'residential': np.random.uniform(75, 85, size=n_samples),
        'agriculture': np.random.uniform(65, 80, size=n_samples),
        'forest': np.random.uniform(50, 70, size=n_samples)
    }
    
    curve_number = np.array([cn_map[lu][i] for i, lu in enumerate(land_use)])
    
    # Soil moisture (antecedent condition)
    soil_moisture = np.random.uniform(0, 1, size=n_samples)  # 0=dry, 1=saturated
    
    # Slope (affects infiltration)
    slope = np.random.exponential(scale=3, size=n_samples)  # degrees
    slope = np.clip(slope, 0, 30)
    
    # Calculate runoff using SCS-CN equation
    # Q = (P - Ia)^2 / (P - Ia + S)
    # where S = (1000/CN - 10) * 25.4, Ia = 0.2*S
    
    S = (1000 / curve_number - 10) * 25.4  # Potential maximum retention (mm)
    Ia = 0.2 * S  # Initial abstraction
    
    # Adjust for soil moisture (saturated soil reduces retention)
    S_adjusted = S * (1 - soil_moisture * 0.5)
    
    # Calculate runoff (if P > Ia)
    runoff = np.where(
        rainfall > Ia,
        ((rainfall - Ia) ** 2) / (rainfall - Ia + S_adjusted),
        0
    )
    
    # Add realistic noise
    runoff = runoff + np.random.normal(0, 2, size=n_samples)
    runoff = np.clip(runoff, 0, rainfall)  # Runoff cannot exceed rainfall
    
    # Create DataFrame
    df_runoff = pd.DataFrame({
        'rainfall_mm': rainfall,
        'curve_number': curve_number,
        'soil_moisture': soil_moisture,
        'slope_degrees': slope,
        'land_use': land_use,
        'runoff_mm': runoff
    })
    
    # Encode land use
    le_land = LabelEncoder()
    df_runoff['land_use_encoded'] = le_land.fit_transform(df_runoff['land_use'])
    
    # Features
    X_features = ['rainfall_mm', 'curve_number', 'soil_moisture', 'slope_degrees', 'land_use_encoded']
    X = df_runoff[X_features]
    y = df_runoff['runoff_mm']
    
    print(f"✅ Generated {len(df_runoff)} synthetic rainfall-runoff samples")
    print(f"Rainfall range: {rainfall.min():.1f} - {rainfall.max():.1f} mm")
    print(f"Runoff range: {runoff.min():.1f} - {runoff.max():.1f} mm")
    print(f"Average runoff coefficient: {(runoff/rainfall).mean():.3f}")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Scale features
    scaler_runoff = StandardScaler()
    X_train_scaled = scaler_runoff.fit_transform(X_train)
    X_test_scaled = scaler_runoff.transform(X_test)
    
    # Train Gradient Boosting Regressor
    print("\n🤖 Training Gradient Boosting Runoff Estimator...")
    
    gb_runoff = GradientBoostingRegressor(
        n_estimators=150,
        learning_rate=0.1,
        max_depth=8,
        min_samples_split=20,
        random_state=42
    )
    
    gb_runoff.fit(X_train_scaled, y_train)
    
    # Predictions
    y_pred = gb_runoff.predict(X_test_scaled)
    
    # Metrics
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"\n✅ Runoff Model Performance:")
    print(f"   RMSE: {rmse:.3f} mm")
    print(f"   MAE:  {mae:.3f} mm")
    print(f"   R²:   {r2:.4f}")
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': X_features,
        'importance': gb_runoff.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\nFeature Importance:")
    print(feature_importance)
    
    # Save model
    runoff_package = {
        'model': gb_runoff,
        'scaler': scaler_runoff,
        'land_use_encoder': le_land,
        'feature_cols': X_features,
        'performance': {'rmse': rmse, 'mae': mae, 'r2': r2},
        'trained_on': datetime.now().isoformat()
    }
    
    model_path = os.path.join(MODELS_DIR, 'runoff_estimation_model.pkl')
    joblib.dump(runoff_package, model_path)
    print(f"\n💾 Model saved: {model_path}")
    
    return runoff_package

# ================================================================================================
# MODEL 3: ENCROACHMENT DETECTION MODEL
# ================================================================================================

def train_encroachment_model():
    """
    Train model to detect encroachment on drainage/water bodies
    Uses change detection features (building density, vegetation loss, etc.)
    """
    print("\n" + "="*90)
    print("MODEL 3: ENCROACHMENT DETECTION")
    print("="*90)
    
    # Load infrastructure and drainage data
    infra_file = os.path.join(DATA_DIR, 'infrastructure', 'chennai_infrastructure_20251106_085326.csv')
    drainage_file = os.path.join(DATA_DIR, 'drainage', 'drainage_summary_20251106_080053.csv')
    
    if not os.path.exists(infra_file) or not os.path.exists(drainage_file):
        print(f"⚠️  Required files not found, generating synthetic data...")
        
        # Generate synthetic encroachment data
        np.random.seed(42)
        n_samples = 3000
        
        # Features that indicate encroachment
        proximity_to_drain = np.random.exponential(scale=100, size=n_samples)  # meters
        proximity_to_drain = np.clip(proximity_to_drain, 0, 500)
        
        building_density = np.random.uniform(0, 1, size=n_samples)  # 0=sparse, 1=dense
        vegetation_loss = np.random.uniform(0, 1, size=n_samples)  # 0=no loss, 1=complete loss
        land_value_change = np.random.normal(0, 20, size=n_samples)  # % change in land value
        
        # Years since last survey
        years_since_survey = np.random.randint(1, 10, size=n_samples)
        
        # Target: encroachment probability
        # High if: close to drain + high building density + high vegetation loss
        encroachment_score = (
            (1 - proximity_to_drain / 500) * 0.4 +  # Closer = higher score
            building_density * 0.3 +
            vegetation_loss * 0.2 +
            (years_since_survey / 10) * 0.1
        )
        
        # Add noise
        encroachment_score += np.random.normal(0, 0.1, size=n_samples)
        encroachment_score = np.clip(encroachment_score, 0, 1)
        
        # Binary label: encroachment (1) or not (0)
        encroachment = (encroachment_score > 0.6).astype(int)
        
        df_encroach = pd.DataFrame({
            'proximity_to_drain_m': proximity_to_drain,
            'building_density': building_density,
            'vegetation_loss': vegetation_loss,
            'land_value_change_pct': land_value_change,
            'years_since_survey': years_since_survey,
            'encroachment_score': encroachment_score,
            'encroachment': encroachment
        })
    else:
        print(f"⚠️  Using synthetic data for encroachment detection (placeholder)")
        # In real implementation, this would analyze satellite imagery time series
        df_encroach = pd.DataFrame()  # Placeholder
    
    if len(df_encroach) == 0:
        print("⏭️  Skipping encroachment model (no data available)")
        return None
    
    print(f"✅ Generated {len(df_encroach)} samples")
    print(f"Encroachment cases: {df_encroach['encroachment'].sum()} ({df_encroach['encroachment'].mean()*100:.1f}%)")
    
    # Features
    X_features = ['proximity_to_drain_m', 'building_density', 'vegetation_loss', 
                  'land_value_change_pct', 'years_since_survey']
    X = df_encroach[X_features]
    y = df_encroach['encroachment']
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # Scale features
    scaler_encroach = StandardScaler()
    X_train_scaled = scaler_encroach.fit_transform(X_train)
    X_test_scaled = scaler_encroach.transform(X_test)
    
    # Train Random Forest
    print("\n🤖 Training Encroachment Detection Classifier...")
    
    rf_encroach = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=20,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )
    
    rf_encroach.fit(X_train_scaled, y_train)
    
    # Predictions
    y_pred = rf_encroach.predict(X_test_scaled)
    y_prob = rf_encroach.predict_proba(X_test_scaled)[:, 1]
    
    # Metrics
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"\n✅ Encroachment Model Accuracy: {accuracy:.4f} ({accuracy*100:.2f}%)")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, zero_division=0))
    
    # Save model
    encroach_package = {
        'model': rf_encroach,
        'scaler': scaler_encroach,
        'feature_cols': X_features,
        'accuracy': accuracy,
        'trained_on': datetime.now().isoformat()
    }
    
    model_path = os.path.join(MODELS_DIR, 'encroachment_detection_model.pkl')
    joblib.dump(encroach_package, model_path)
    print(f"\n💾 Model saved: {model_path}")
    
    return encroach_package

# ================================================================================================
# MODEL 4: WATER LEVEL PREDICTION (TIME SERIES)
# ================================================================================================

def train_water_level_model():
    """
    Train model to predict water level based on rainfall, drainage capacity, and time factors
    """
    print("\n" + "="*90)
    print("MODEL 4: WATER LEVEL PREDICTION")
    print("="*90)
    
    # Generate synthetic time series data
    print("📊 Generating time series data...")
    
    np.random.seed(42)
    n_hours = 2000  # Simulate 2000 hours of data
    
    # Time features
    hours = np.arange(n_hours)
    hour_of_day = hours % 24
    day_of_week = (hours // 24) % 7
    
    # Rainfall (higher during certain hours - monsoon pattern)
    base_rainfall = np.random.exponential(scale=3, size=n_hours)
    monsoon_factor = 1 + 2 * np.sin(2 * np.pi * hours / (24 * 90))  # Seasonal pattern
    rainfall = base_rainfall * monsoon_factor
    rainfall = np.clip(rainfall, 0, 100)
    
    # Cumulative rainfall (last 6 hours)
    rainfall_6hr = np.array([rainfall[max(0, i-6):i+1].sum() for i in range(n_hours)])
    
    # Drainage capacity utilization (0-1)
    drainage_capacity = np.random.uniform(0.5, 1, size=n_hours)
    
    # Tide level (coastal effect)
    tide = 1 + 0.5 * np.sin(2 * np.pi * hours / 12.42)  # 12.42hr tidal cycle
    
    # Calculate water level (simplified physics)
    water_level = (
        rainfall_6hr * 0.03 +  # Rainfall contribution
        (1 - drainage_capacity) * 10 +  # Poor drainage increases level
        tide * 0.5 +  # Tidal effect
        np.random.normal(0, 0.5, size=n_hours)  # Noise
    )
    water_level = np.clip(water_level, 0, 15)  # Realistic range 0-15m
    
    # Create DataFrame
    df_water = pd.DataFrame({
        'hour': hours,
        'hour_of_day': hour_of_day,
        'day_of_week': day_of_week,
        'rainfall_mm': rainfall,
        'rainfall_6hr_mm': rainfall_6hr,
        'drainage_capacity': drainage_capacity,
        'tide_level': tide,
        'water_level_m': water_level
    })
    
    # Add lagged features (previous water levels)
    df_water['water_level_lag1'] = df_water['water_level_m'].shift(1).fillna(0)
    df_water['water_level_lag3'] = df_water['water_level_m'].shift(3).fillna(0)
    df_water['water_level_lag6'] = df_water['water_level_m'].shift(6).fillna(0)
    
    print(f"✅ Generated {len(df_water)} hourly records")
    print(f"Water level range: {water_level.min():.2f} - {water_level.max():.2f} m")
    print(f"Average water level: {water_level.mean():.2f} m")
    
    # Features
    X_features = ['hour_of_day', 'day_of_week', 'rainfall_mm', 'rainfall_6hr_mm',
                  'drainage_capacity', 'tide_level', 'water_level_lag1', 
                  'water_level_lag3', 'water_level_lag6']
    X = df_water[X_features]
    y = df_water['water_level_m']
    
    # Split data (time-based split)
    train_size = int(0.8 * len(df_water))
    X_train, X_test = X[:train_size], X[train_size:]
    y_train, y_test = y[:train_size], y[train_size:]
    
    print(f"Train set: {len(X_train)} | Test set: {len(X_test)}")
    
    # Scale features
    scaler_water = StandardScaler()
    X_train_scaled = scaler_water.fit_transform(X_train)
    X_test_scaled = scaler_water.transform(X_test)
    
    # Train Random Forest Regressor
    print("\n🤖 Training Water Level Predictor...")
    
    rf_water = RandomForestRegressor(
        n_estimators=150,
        max_depth=15,
        min_samples_split=10,
        random_state=42,
        n_jobs=-1
    )
    
    rf_water.fit(X_train_scaled, y_train)
    
    # Predictions
    y_pred = rf_water.predict(X_test_scaled)
    
    # Metrics
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"\n✅ Water Level Model Performance:")
    print(f"   RMSE: {rmse:.3f} m")
    print(f"   MAE:  {mae:.3f} m")
    print(f"   R²:   {r2:.4f}")
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': X_features,
        'importance': rf_water.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\nTop Features:")
    print(feature_importance.head())
    
    # Save model
    water_package = {
        'model': rf_water,
        'scaler': scaler_water,
        'feature_cols': X_features,
        'performance': {'rmse': rmse, 'mae': mae, 'r2': r2},
        'trained_on': datetime.now().isoformat()
    }
    
    model_path = os.path.join(MODELS_DIR, 'water_level_prediction_model.pkl')
    joblib.dump(water_package, model_path)
    print(f"\n💾 Model saved: {model_path}")
    
    return water_package

# ================================================================================================
# MAIN EXECUTION
# ================================================================================================

def main():
    """Train all ML models"""
    
    results = {}
    
    try:
        # Model 1: Flood Risk
        print("\n🚀 Starting Model 1...")
        results['flood_risk'] = train_flood_risk_model()
        
        # Model 2: Runoff Estimation
        print("\n🚀 Starting Model 2...")
        results['runoff'] = train_runoff_model()
        
        # Model 3: Encroachment Detection
        print("\n🚀 Starting Model 3...")
        results['encroachment'] = train_encroachment_model()
        
        # Model 4: Water Level Prediction
        print("\n🚀 Starting Model 4...")
        results['water_level'] = train_water_level_model()
        
        # Summary
        print("\n" + "="*90)
        print("TRAINING COMPLETE - MODEL SUMMARY")
        print("="*90)
        
        for model_name, result in results.items():
            if result:
                print(f"\n✅ {model_name.upper()}: Trained successfully")
                if 'risk_accuracy' in result:
                    print(f"   - Risk Accuracy: {result['risk_accuracy']:.4f}")
                    print(f"   - Safety Accuracy: {result['safety_accuracy']:.4f}")
                elif 'accuracy' in result:
                    print(f"   - Accuracy: {result['accuracy']:.4f}")
                elif 'performance' in result:
                    perf = result['performance']
                    print(f"   - RMSE: {perf.get('rmse', 'N/A')}")
                    print(f"   - R²: {perf.get('r2', 'N/A')}")
            else:
                print(f"\n⚠️  {model_name.upper()}: Skipped or failed")
        
        print("\n" + "="*90)
        print("All models saved in:", MODELS_DIR)
        print("="*90)
        print(f"End Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*90)
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
