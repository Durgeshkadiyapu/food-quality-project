# IoT-Based AI Food Quality Predictor — Full System

A complete end-to-end full stack system for non-destructive fruit freshness prediction using IoT environmental and gas sensor data (ESP32 + MQ-3 + MQ-135 + DHT22).

---

## Architecture Overview

```
+-------------------------------------------------------------+
|                 React + Vite Frontend (:5173)               |
+-------------------------------------------------------------+
                              │ HTTP REST (:5000/api/v1)
                              ▼
+-------------------------------------------------------------+
|              Node.js + Express Backend (:5000)              |
|  - Request validation & physical sensor bounds checking     |
|  - Rate limiting, Security headers (Helmet), CORS           |
|  - Repository layer & MongoDB Atlas cloud persistence       |
+------------------------------┬------------------------------+
                               │                              │ Mongoose ODM
     Server-to-Server HTTP (:8000)                            ▼
                               │               +-------------------------------+
                               │               |     MongoDB Atlas Cluster     |
                               ▼               | (koq2e1t.mongodb.net)         |
+---------------------------------------------+| - Predictions collection      |
|     Python + FastAPI ML Service (:8000)     || - Query history & indexes     |
|  - ExtraTreesClassifier (proxy_real model)  |+-------------------------------+
|  - LogisticRegression (synthetic_demo)      |
|  - Returns class probabilities & risk score |
+---------------------------------------------+
```

---

## Directory Structure

```text
ai-food-quality-predictor/
├── frontend/               # React + Vite web dashboard (:5173)
├── backend/                # Node.js + Express REST API gateway (:5000)
├── ml_service/             # Python + FastAPI ML inference engine (:8000)
└── README.md               # Root system documentation
```

---

## Startup Instructions

### 1. Python ML Inference Service (Port 8000)
```powershell
cd ml_service
python -m venv .venv
.venv\Scripts\Activate.ps1       # On Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --env-file .env --port 8000
```
- **Health check**: `http://127.0.0.1:8000/health`
- **Capabilities & Metadata**: `http://127.0.0.1:8000/capabilities`
- **Interactive OpenAPI docs**: `http://127.0.0.1:8000/docs`

### 2. Node.js Backend Gateway (Port 5000)
```powershell
cd backend
npm install
copy .env.example .env          # Verify MONGODB_URI and ML_BASE_URL
npm start                       # Or: node src/server.js
```
- **API Health**: `http://localhost:5000/api/v1/health`
- **ML Bridge Status**: `http://localhost:5000/api/v1/ml/status`
- **Query History**: `http://localhost:5000/api/v1/predictions`

### 3. React Frontend Dashboard (Port 5173)
```powershell
cd frontend
npm install
copy .env.example .env          # Ensure VITE_API_BASE_URL=http://localhost:5000
npm run dev
```
- **Dashboard UI**: `http://localhost:5173`

---

## Testing

- **Backend tests (55 passing)**: `cd backend && npm test`
- **ML service tests (59 passing)**: `cd ml_service && pytest -v`

---

## Notes & Limitations
- All models operate on **storage-day proxy labels** or synthetic demonstration sets, not laboratory-certified chemical ground truth.
- Outputs represent experimental demonstration scores, not regulatory food safety advice.
