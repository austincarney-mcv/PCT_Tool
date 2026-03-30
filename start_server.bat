@echo off
echo Starting PCT App...

echo Starting API server on port 3002...
start "PCT API" /D "%~dp0server" node server.js

timeout /t 2 /nobreak >nul

echo Starting client on port 5175...
start "PCT Client" /D "%~dp0client" cmd /k "npm run dev"

echo.
echo PCT App is running.
echo   API:    http://localhost:3002
echo   Client: http://localhost:5175
echo.
echo Close the PCT API and PCT Client windows to stop the servers,
echo or run stop_server.bat.
