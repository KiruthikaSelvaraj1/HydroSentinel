import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix 

df = pd.read_csv("chennai_elevation_data.csv")

df['safety_label'] = df['elevation'].apply(lambda x: 1 if x < 10 else 0)  # 1=unsafe, 0=safe

# Features: elevation (can add slope/aspect later)
X = df[['elevation']]
y = df['safety_label']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
print(classification_report(y_test, y_pred))

# Save the model
import joblib
joblib.dump(model, 'flood_risk_model.pkl')
print("Model saved to flood_risk_model.pkl")

import matplotlib.pyplot as plt

# Convert lat/lon/elevation to numpy arrays
lon = df['longitude'].values
lat = df['latitude'].values
labels = df['safety_label'].values

# Create a simple scatter plot (quick visual)
plt.figure(figsize=(10, 8))
plt.scatter(lon, lat, c=labels, cmap='coolwarm', s=1)
plt.title("Safe (0) vs Unsafe (1) Regions in Chennai")
plt.xlabel("Longitude")
plt.ylabel("Latitude")
plt.colorbar(label="Safety (0=Safe, 1=Unsafe)")
plt.savefig('chennai_flood_risk_map.png', dpi=300, bbox_inches='tight')
print("Map saved to chennai_flood_risk_map.png")
