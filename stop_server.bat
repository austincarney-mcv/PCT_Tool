@echo off
echo Stopping PCT App...

echo Releasing port 3002 (API)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3002 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo Releasing port 5175 (Client)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5175 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo PCT App stopped.
