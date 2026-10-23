@echo off
echo ========================================================
echo   Starting AI Food Quality Predictor Services...
echo ========================================================

echo [1/3] Checking and Starting Python ML Service on port 8000...
start "ML Service (:8000)" cmd /k "cd /d %~dp0ml_service && if exist .venv\Scripts\activate.bat (call .venv\Scripts\activate.bat) && (python -m uvicorn app.main:app --port 8000 || uvicorn app.main:app --port 8000)"

timeout /t 3 /nobreak >nul

echo [2/3] Checking and Starting Node.js Backend Gateway on port 5000...
start "Backend Gateway (:5000)" cmd /k "cd /d %~dp0backend && if not exist node_modules (echo Installing backend dependencies... && npm install) && (node src/server.js || npm start)"

timeout /t 2 /nobreak >nul

echo [3/3] Checking and Starting React Frontend on port 5173...
start "Frontend (:5173)" cmd /k "cd /d %~dp0frontend && if not exist node_modules (echo Installing frontend dependencies... && npm install) && npm run dev"

echo.
echo All three service windows have been launched!
echo - ML Service:   http://127.0.0.1:8000/docs
echo - Backend API:  http://localhost:5000/api/v1/health
echo - Frontend UI:  http://localhost:5173
echo ========================================================
echo You can keep this launcher open or close it anytime.
pause
