@echo off
SET NODE_ENV=production
SET PORT=3002
cd /d "C:\Users\austin.carney\Projects\014_PCT_App\server"
if not exist "..\data" mkdir "..\data"
echo [%date% %time%] Starting PCT API server... >> "..\data\server.log"
node server.js >> "..\data\server.log" 2>&1
