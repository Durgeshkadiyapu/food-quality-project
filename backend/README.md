# AI Food Quality Predictor — Backend Service

A robust, production-grade Node.js and Express backend for the **AI Food Quality Predictor** system.

This service acts as the public API bridge between the React frontend, the experimental Python/FastAPI Machine Learning inference service, and MongoDB persistence.

---

## Architecture Diagram

```
+-------------------------------------------------------------------+
|                        React + Vite Frontend                      |
+-------------------------------------------------------------------+
                                  |
                                  | HTTP REST API (/api/v1)
                                  v
+-------------------------------------------------------------------+
|                Node.js + Express Backend (:5000)                  |
|                                                                   |
|  - Request Validation & Physical Sensor Bounds Checking           |
|  - Rate Limiting, Security Headers (Helmet), CORS                 |
|  - Centralized Error Handling & Safe Diagnostic Logging           |
|  - Dedicated ML Adapter (src/services/mlService.js)               |
|  - Repository Layer & MongoDB Persistence (Mongoose)              |
+-------------------------------------------------------------------+
             |                                          |
             | Server-to-Server HTTP                    | Mongoose ODM
             v                                          v
+---------------------------------------+  +------------------------+
| Python + FastAPI ML Service (:8000)   |  |   MongoDB (:27017)     |
|                                       |  |                        |
|  - GET /health                        |  | - Predictions          |
|  - GET /model-info (/capabilities)    |  | - Sensor Readings      |
|  - POST /predict                      |  | - Indexes              |
|  - Model Artifacts:                   |  +------------------------+
|    * proxy_real (Default)             |
|    * synthetic_demo                   |
|    * combined_demo                    |
+---------------------------------------+
```

### Key Architectural Safeguards
1. **Frontend Isolation**: The React frontend communicates strictly with this Node.js backend. It never talks directly to the Python service or the database.
2. **Persistence Integrity**: If Python ML inference fails or times out, **no fake prediction is fabricated**. If MongoDB persistence fails after successful inference, the user is notified with a safe 500 error and the result is **never falsely claimed as saved**.
3. **Dedicated ML Adapter**: All ML HTTP communication is encapsulated in `src/services/mlService.js` with explicit request timeouts (`AbortSignal.timeout`) and failure mappings.

---

## Prerequisites & Supported Environments

- **Operating System**: Windows 10/11 (or Linux/macOS)
- **Node.js**: `v20.x` or higher (verified on `v24.14.0`)
- **npm**: `v10.x` or higher (verified on `v11.9.0`)
- **Database**: **MongoDB** `v6.x` or `v7.x` (MongoDB Community Server running on `127.0.0.1:27017`)
- **Python ML Service**: Python 3.10–3.12 running FastAPI/Uvicorn on `http://127.0.0.1:8000`

---

## Directory Structure

```
backend-Food/
├── src/
│   ├── app.js                          # Express application setup, security, & middlewares
│   ├── server.js                       # HTTP server startup & graceful shutdown lifecycle
│   │
│   ├── config/
│   │   ├── env.js                      # Centralized environment variable validation
│   │   └── database.js                 # MongoDB connection & readiness manager
│   │
│   ├── constants/
│   │   └── errorCodes.js               # Error codes, HTTP mappings, modes & physical ranges
│   │
│   ├── controllers/
│   │   ├── healthController.js         # Health check & database readiness controller
│   │   ├── mlController.js             # Python ML reachability & capabilities controller
│   │   └── predictionController.js     # Prediction creation & query history controller
│   │
│   ├── middleware/
│   │   ├── errorHandler.js             # Centralized JSON error handler
│   │   ├── notFound.js                 # 404 handler for undefined routes
│   │   └── requestLogger.js            # Structured non-sensitive HTTP request logger
│   │
│   ├── models/
│   │   └── Prediction.js               # Mongoose schema, compound indexes, & JSON transforms
│   │
│   ├── repositories/
│   │   └── predictionRepository.js     # Safe parameterized DB queries (NoSQL injection safe)
│   │
│   ├── routes/
│   │   ├── healthRoutes.js             # /api/v1/health
│   │   ├── mlRoutes.js                 # /api/v1/ml/*
│   │   ├── predictionRoutes.js         # /api/v1/predictions/*
│   │   └── index.js                    # API v1 aggregator router
│   │
│   ├── services/
│   │   ├── mlService.js                # ML HTTP client adapter (GET /health, POST /predict)
│   │   └── predictionService.js        # Prediction workflow orchestration
│   │
│   ├── utils/
│   │   ├── AppError.js                 # Structured application error class
│   │   ├── asyncHandler.js             # Async Express middleware wrapper
│   │   └── pagination.js               # Query pagination parser & metadata builder
│   │
│   └── validators/
│       └── predictionValidator.js      # Input validation & physical sensor bounds checking
│
├── tests/
│   ├── fixtures/
│   │   └── mockData.js                 # Shared test payloads and fixtures
│   ├── integration/
│   │   ├── e2eFlow.test.js             # End-to-end integration tests (Client -> Node -> ML -> DB)
│   │   ├── healthRoutes.test.js        # Health endpoints integration tests
│   │   ├── mlRoutes.test.js            # ML routes integration tests
│   │   ├── predictionRepository.test.js# Live MongoDB persistence, indexing & filter tests
│   │   └── predictionRoutes.test.js    # Prediction endpoints integration tests
│   └── unit/
│       ├── mlService.test.js           # ML adapter timeout, connection refusal & error mapping
│       ├── pagination.test.js          # Pagination calculation & validation tests
│       ├── predictionService.test.js   # Service orchestration & failure safety tests
│       └── predictionValidator.test.js # Validation rules, sensor ranges, & food mode tests
│
├── .env.example                        # Template environment variables
├── .gitignore                          # Git ignore list
├── package.json                        # Node dependencies & scripts
├── vitest.config.js                    # Vitest test runner configuration
└── README.md                           # Documentation
```

---

## Environment Configuration

Create a `.env` file in the root directory (based on `.env.example`):

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Port for the Express backend server |
| `NODE_ENV` | `development` | Runtime mode: `development`, `production`, or `test` |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/food_quality_db` | MongoDB connection string |
| `ML_BASE_URL` | `http://127.0.0.1:8000` | Base URL of the Python FastAPI ML inference service |
| `ML_REQUEST_TIMEOUT_MS`| `10000` | ML inference timeout in milliseconds before throwing 504 |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated list of allowed frontend origins |
| `LOG_LEVEL` | `info` | Logging verbosity |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limiting sliding window in ms (1 minute) |
| `RATE_LIMIT_MAX_PREDICTIONS` | `30` | Max prediction requests per IP within the window |

---

## Installation & Running

### 1. Install Dependencies
```powershell
npm install
```

### 2. Verify Database
Ensure local MongoDB is running:
```powershell
Get-Service -Name "*mongo*"
```

### 3. Run Automated Tests
Run all 55 unit, integration, live MongoDB, and end-to-end tests:
```powershell
npm test
```

### 4. Start Development Server
```powershell
npm run dev
```

### 5. Start Production Server
```powershell
npm start
```

---

## Public REST API Endpoints (`/api/v1`)

### 1. Health & Readiness Check
- **Route**: `GET /api/v1/health`
- **Purpose**: Checks backend uptime and MongoDB connection readiness.
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "ai-food-quality-backend",
    "uptime_seconds": 124,
    "timestamp": "2026-10-22T21:30:00.000Z",
    "dependencies": {
      "database": {
        "ready": true,
        "status": "connected",
        "type": "MongoDB"
      }
    }
  }
}
```

---

### 2. ML Service Health Status
- **Route**: `GET /api/v1/ml/status`
- **Purpose**: Actively probes the Python FastAPI service's `GET /health` endpoint with a timeout.
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "service": "food_quality_ml_service",
    "reachable": true,
    "ready": true,
    "checked_at": "2026-10-22T21:30:00.000Z",
    "details": {
      "status": "healthy",
      "modes_available": ["proxy_real", "synthetic_demo"]
    },
    "error": null
  }
}
```
- **Error Response (503 Service Unavailable)**:
```json
{
  "success": false,
  "data": {
    "service": "food_quality_ml_service",
    "reachable": false,
    "ready": false,
    "checked_at": "2026-10-22T21:30:00.000Z",
    "details": null,
    "error": "Prediction service is temporarily unavailable."
  }
}
```

---

### 3. ML Capabilities
- **Route**: `GET /api/v1/ml/capabilities`
- **Purpose**: Returns authoritative supported foods, model modes, training ranges, and scientific disclaimers.
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "source": "static_authoritative",
    "supported_modes": ["proxy_real", "synthetic_demo", "combined_demo"],
    "mode_food_support": {
      "proxy_real": ["Apple", "Banana", "Tomato"],
      "synthetic_demo": ["Apple", "Banana", "Tomato", "Orange", "..."]
    },
    "model_versions": {
      "proxy_real": "1.0.0-proxy_real"
    },
    "training_ranges": {
      "temperature_C": { "min": 28.5, "max": 33.6 },
      "humidity_pct": { "min": 66.0, "max": 100.0 }
    },
    "disclaimer": "Model predictions are prototype estimates derived from experimental proxy data and are NOT a food-safety guarantee."
  }
}
```

---

### 4. Create Prediction
- **Route**: `POST /api/v1/predictions`
- **Rate Limit**: 30 requests per minute per IP.
- **Request Body**:
```json
{
  "fruit_type": "Apple",
  "model_mode": "proxy_real",
  "sensor_readings": {
    "MQ3_raw": 2150,
    "MQ135_raw": 1800,
    "temperature_C": 28.5,
    "humidity_pct": 75.0
  }
}
```

- **Success Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "prediction_id": "671804f378a87b2184cfb031",
    "fruit_type": "Apple",
    "sensor_readings": {
      "MQ3_raw": 2150,
      "MQ135_raw": 1800,
      "temperature_C": 28.5,
      "humidity_pct": 75.0
    },
    "predicted_class": "Semi-Fresh",
    "class_probabilities": {
      "Fresh": 0.366273,
      "Semi-Fresh": 0.566125,
      "Spoiled": 0.067602
    },
    "requested_model_mode": "proxy_real",
    "reported_training_mode": "proxy_real",
    "model_version": "1.0.0-proxy_real",
    "label_method": "storage_day_proxy_days1-2_fresh_days3-4_semi_day5plus_spoiled",
    "warnings": [
      "Model trained on real sensor readings from only 9 specimens ... Not validated for real-world use."
    ],
    "out_of_training_range": [],
    "spoilage_tendency_score": 35.1,
    "created_at": "2026-10-22T21:30:00.000Z"
  }
}
```

---

### 5. Upload Chamber Excel / CSV File
- **Route**: `POST /api/v1/predictions/upload`
- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `file`: The `.xlsx` or `.csv` spreadsheet file (Required)
  - `item_id`: Optional custom identifier for the chamber item (auto-detected if omitted)
  - `fruit_type`: Optional produce type (auto-detected from sheet title or contents if omitted)
- **Purpose**: Uploads continuous Arduino chamber readings, streams them through the inference model, updates the chamber item's live health in MongoDB Atlas in place, and returns the updated health state.
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Successfully processed chamber readings from 'freshSample.xlsx'.",
  "data": {
    "item_id": "2nd_fresh_apple_day_1",
    "prediction_id": "6ada51dc6f335675766bd0ab",
    "fruit_type": "Apple",
    "predicted_class": "Semi-Fresh",
    "readings_count": 560,
    "class_probabilities": {
      "Fresh": 0.1095,
      "Semi-Fresh": 0.7567,
      "Spoiled": 0.1338
    },
    "sensor_readings": {
      "MQ3_raw": 2117,
      "MQ135_raw": 2311,
      "temperature_C": 30.7,
      "humidity_pct": 90.5
    },
    "spoilage_tendency_score": 53.8,
    "first_monitored_at": "2026-10-22T17:00:26.523Z",
    "last_updated_at": "2026-10-22T17:06:49.344Z"
  }
}
```

---

### 5. Prediction History
- **Route**: `GET /api/v1/predictions`
- **Query Parameters**:
  - `page`: Page number (integer >= 1, default: 1)
  - `limit`: Items per page (integer 1-100, default: 20)
  - `fruit_type`: Filter by fruit (e.g. `Apple`)
  - `predicted_class`: Filter by class (`Fresh`, `Semi-Fresh`, `Spoiled`)
  - `model_mode`: Filter by mode (`proxy_real`, `synthetic_demo`, `combined_demo`)
  - `start_date`: ISO-8601 date string
  - `end_date`: ISO-8601 date string
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "prediction_id": "671804f378a87b2184cfb031",
      "fruit_type": "Apple",
      "predicted_class": "Semi-Fresh",
      "requested_model_mode": "proxy_real",
      "created_at": "2026-10-22T21:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "total_pages": 3,
    "has_next": true,
    "has_prev": false
  }
}
```

---

### 6. Prediction Details
- **Route**: `GET /api/v1/predictions/:id`
- **Success Response (200 OK)**: Complete prediction record.
- **Error (400 Bad Request)**: When `:id` is not a valid 24-character hexadecimal MongoDB ObjectId.
- **Error (404 Not Found)**: When record is not found.

---

## Standard Error Envelope & HTTP Status Codes

All errors follow a unified structure:
```json
{
  "success": false,
  "error": {
    "code": "UNSUPPORTED_FOOD_OR_MODE",
    "message": "Food 'Orange' is not supported in 'proxy_real' mode. Supported foods: Apple, Banana, Tomato",
    "details": [
      {
        "field": "fruit_type",
        "problem": "Not supported in 'proxy_real'. Supported: Apple, Banana, Tomato"
      }
    ]
  }
}
```

| HTTP Status | Error Code | Description |
|---|---|---|
| **400 Bad Request** | `BAD_REQUEST`, `MALFORMED_JSON`, `INVALID_IDENTIFIER`, `INVALID_PAGINATION` | Malformed JSON, non-numeric pagination, or invalid MongoDB ObjectId |
| **404 Not Found** | `ROUTE_NOT_FOUND`, `PREDICTION_NOT_FOUND` | Unknown route or nonexistent prediction record |
| **422 Unprocessable Entity** | `VALIDATION_ERROR`, `UNSUPPORTED_FOOD_OR_MODE` | Out-of-bounds readings, unsupported fruit for mode, missing sensor fields |
| **429 Too Many Requests**| `TOO_MANY_REQUESTS` | Rate limit exceeded for prediction creation |
| **500 Internal Error** | `INTERNAL_SERVER_ERROR`, `DATABASE_ERROR` | Server fault or database write failure |
| **502 Bad Gateway** | `ML_UPSTREAM_ERROR`, `ML_INVALID_RESPONSE` | Python service returned invalid JSON or malformed schema |
| **503 Service Unavailable** | `ML_SERVICE_UNAVAILABLE` | Python ML service connection refused or dependency unready |
| **504 Gateway Timeout** | `ML_GATEWAY_TIMEOUT` | Python ML inference timed out past `ML_REQUEST_TIMEOUT_MS` |

---

## Food Quality & Scientific Limitations

1. **Experimental Prototype**: This system is designed as an educational/experimental prototype.
2. **Storage-Day Proxy Labels**: The `proxy_real` mode was trained on 23,008 sensor readings from 9 specimens (3 Apple, 3 Banana, 3 Tomato) using storage duration as a proxy for freshness, **not independently verified microbiological freshness**.
3. **No Safety Guarantee**: Predictions must **NEVER** be interpreted as proof that food is safe to consume.
4. **Sensor Saturation**: MQ-135 reading values near 4095 represent ADC saturation, not definitive freshness indicators.
5. **Training Ranges**: Physical sensor data outside approximate training ranges (Temperature: 28.5–33.6 °C, Humidity: 66–100%) are accepted if physically valid, but flagged in `out_of_training_range` as potentially unreliable.
