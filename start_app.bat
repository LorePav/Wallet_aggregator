@echo off
echo ==========================================
echo   Avvio My Portfolio App...
echo ==========================================

:: 1. Avvia il Backend (FastAPI) in una nuova finestra
echo [1/3] Avvio del Backend...
start "Backend - Portfolio API" cmd /k "cd /d %~dp0backend && .\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000"

:: 2. Avvia il Frontend (Vite) in una nuova finestra
echo [2/3] Avvio del Frontend...
start "Frontend - Portfolio React" cmd /k "cd /d %~dp0frontend && npm run dev"

:: 3. Aspetta qualche secondo e apri il browser
echo [3/3] Apertura del browser in corso...
timeout /t 5 /nobreak > nul
start http://localhost:5173

echo ==========================================
echo   App avviata con successo!
echo   Chiudi le finestre dei terminali per fermare l'app.
echo ==========================================
pause
