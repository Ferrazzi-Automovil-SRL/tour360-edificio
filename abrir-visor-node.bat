@echo off
REM Levanta el visor con Node, para maquinas sin Python.
REM El de siempre (abrir-visor.bat) usa python -m http.server.
cd /d "%~dp0"
start "" http://localhost:8000
node servidor.js . 8000
pause
