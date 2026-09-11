import requests
import pandas as pd

# Chennai coordinates
latitude, longitude = 13.0827, 80.2707

# NASA POWER API URL
url = (
    f"https://power.larc.nasa.gov/api/temporal/daily/point?"
    f"parameters=PRECTOTCORR,T2M&community=RE&longitude={longitude}&latitude={latitude}"
    f"&start=20240101&end=20241007&format=JSON"
)

response = requests.get(url)
data = response.json()

# Extract parameter dictionary
parameters = data["properties"]["parameter"]
print("Available keys:", parameters.keys())

# Get rainfall and temperature
rainfall = parameters.get("PRECTOTCORR", {})
temperature = parameters.get("T2M", {})

if len(rainfall) > 0 and len(temperature) > 0:
    df = pd.DataFrame({
        "date": list(rainfall.keys()),
        "rainfall_mm": list(rainfall.values()),
        "temperature_c": list(temperature.values())
    })
    df["date"] = pd.to_datetime(df["date"])
    print(df.head())
    df.to_csv("rain_temp_chennai.csv", index=False)
    print("✅ Data saved to rain_temp_chennai.csv")
else:
    print("⚠️ No valid data found for given dates or location.")
