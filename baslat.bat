@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Ajan Ofisi baslatiliyor...
start "" cmd /c "timeout /t 1 >nul & start http://localhost:4777"
node server.js
pause
