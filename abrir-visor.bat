@echo off
REM Levanta el visor y abre el navegador. Doble clic y listo.
REM Lo importante: se para en la carpeta de ESTE archivo (%~dp0), no en la que
REM tenga abierta el cmd. python -m http.server publica la carpeta actual, asi
REM que si arrancas desde panoramas\ no encuentra el index.html y te muestra un
REM listado de archivos en vez del recorrido.
cd /d "%~dp0"
if not exist "index.html" (
  echo No encuentro index.html en esta carpeta.
  echo Este .bat tiene que estar al lado del index.html, en tour360-web\.
  pause & exit /b 1
)
echo.
echo   Recorrido 360 FRG  -  http://localhost:8000
echo   Para cortarlo: Ctrl+C en esta ventana.
echo.
start "" http://localhost:8000
python -m http.server 8000
