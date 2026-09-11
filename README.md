# 🌊 HydroSentinel

**AI-powered Chennai flood monitoring and risk prediction system**

[![Status](https://img.shields.io/badge/Status-MVP%20Built-brightgreen)]()
[![Progress](https://img.shields.io/badge/Progress-Project%20Prototype-blue)]()
[![License](https://img.shields.io/badge/License-MIT-yellow)]()

HydroSentinel is a flood management dashboard built to monitor, predict, and visualize flood risk conditions in Chennai using real-time data, historical flood patterns, and geospatial intelligence.

It combines:
- a React frontend for visual analytics and operational dashboards
- a Flask backend for API and authentication services
- Firebase for user authentication and Firestore-based data access
- ML-based flood risk estimation and geospatial flood simulation workflows

---

## 🎯 Project Goal

This project aims to support proactive urban flood response by helping stakeholders:
- monitor rainfall and sensor-driven conditions
- identify flood-prone zones
- inspect historical flood events
- simulate flood scenarios and control actions
- make faster operational decisions before major flooding occurs

---

## ✨ Features

### Current capabilities
- ✅ Interactive flood dashboard
- ✅ Chennai map with flood-related overlays and sensor data
- ✅ Role-based access flow with Firebase authentication
- ✅ Admin and user views for operational monitoring
- ✅ Historical flood event visualization
- ✅ ML risk prediction workflow
- ✅ Flask REST API backend
- ✅ Real-time and simulation-oriented data services

### Planned enhancements
- 🔜 OpenWeatherMap integration for live weather data
- 🔜 Sensor simulation and streaming updates
- 🔜 AI optimization for control actions
- 🔜 More advanced hydraulic modeling and forecasting

---

## 🏗️ Repository Structure

```text
Hydro-Sentinel-Flood-Management-System-/
├── .gitignore
├── .env.local
├── LICENSE
├── README.md
├── index.html
├── package.json
├── package-lock.json
├── requirements.txt
├── vite.config.js
├── flood-management-4001c-firebase-adminsdk-fbsvc-ec339ffc75.json
├── start_prototype.py
├── update_firebase_config.py
├── backend/
│   ├── .env
│   ├── __pycache__/
│   ├── api.py
│   ├── app.py
│   ├── enhanced_api.py
│   ├── live_data_service.py
│   ├── serviceAccountKey.json
│   └── setup_admin_user.py
├── data_collection/
│   ├── README.md
│   ├── run_all_collection.py
│   ├── 01_openweather_realtime.py
│   ├── 02_osm_drainage_network.py
│   ├── 03_elevation_high_res.py
│   ├── 04_historical_floods.py
│   ├── 05_critical_infrastructure.py
│   ├── 06_population_grid.py
│   └── collected_data/
│       ├── drainage/
│       ├── elevation/
│       ├── historical_floods/
│       ├── infrastructure/
│       ├── population/
│       └── weather/
├── models/
│   └── (trained model artifacts and outputs)
├── scripts/
│   ├── hydraulic_simulation.py
│   ├── run.py
│   ├── sample.py
│   ├── train_models.py
│   └── models/
├── src/
│   ├── App.jsx
│   ├── ChennaiMap.jsx
│   ├── EnhancedFloodDashboard.jsx
│   ├── EnhancedFloodDashboard_backup.jsx
│   ├── FloodDashboard.jsx
│   ├── FloodSimulation3D.jsx
│   └── main.jsx
└── .github/ (if added later)
```

---

## 🛠️ Tech Stack

### Frontend
- React
- Vite
- Leaflet / map visualization
- Recharts
- Tailwind CSS

### Backend
- Python
- Flask
- Firebase Admin SDK
- Pandas / NumPy / scikit-learn
- Requests

### Data & modeling
- OpenWeatherMap
- Historical flood datasets
- Geospatial and elevation data
- Machine learning-based risk prediction

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Git

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd Hydro-Sentinel-Flood-Management-System-
```

### 2. Install frontend dependencies
```bash
npm install
```

### 3. Install backend dependencies
```bash
cd backend
pip install -r ../requirements.txt
```

### 4. Configure environment variables
Create a root `.env.local` file for frontend config and a `backend/.env` file for backend config.

Frontend example:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_APP_ID=your-project-id
```

Backend example:
```env
OPENWEATHER_API_KEY=your_key_here
FIREBASE_SERVICE_ACCOUNT_PATH=../your-service-account.json
APP_ID=your-project-id
```

### 5. Run the app
```bash
# Terminal 1: backend
cd backend
py -3.11 app.py

# Terminal 2: frontend
cd ..
npm run dev
```

Access the app at:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

---

## 🔐 Firebase Setup

This project expects a Firebase project with:
- Firebase Authentication enabled
- Email/Password sign-in enabled
- Anonymous sign-in enabled
- Firestore database created
- Service account JSON downloaded for backend admin access

The app uses Firebase in two different ways:
1. Frontend web SDK for client-side auth and app initialization
2. Backend Admin SDK for server-side user verification and Firestore access

---

## 📦 Project Ownership

- Developer: Kiruthika S
- Email: kirthikaselvaraj38@gmail.com

---

## 📜 License

This project is released under the MIT License. See [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

Contributions are welcome. If you want to improve the UI, add new predictions, or extend the data pipeline, open a pull request with a clear description of your changes.

---

## 🏆 Acknowledgments

- Chennai flood resilience and monitoring research
- Firebase and Flask ecosystem
- OpenWeatherMap and open geospatial data sources
- Open-source contributors and project collaborators

---

## 📌 Current Status

This project is in active prototype / MVP stage and is intended to evolve toward a more complete predictive flood management system with live data, optimization logic, and automated response workflows.

---

*"The best way to predict the future is to prevent it from flooding."* 🌊
