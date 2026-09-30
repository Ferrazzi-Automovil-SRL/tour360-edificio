@echo off
REM ---------------------------------------------------------------------------
REM Los minimapas del visor. Doble click DESPUES de 4-plano.bat.
REM
REM Toma export\tour360_salida\planta-color.png, recorta plano-mono.png y
REM plano-dos.png y reescribe js\planos.js (la constante PLANOS).
REM Usa el Python que trae Blender: no hace falta instalar nada.
REM ---------------------------------------------------------------------------
setlocal
cd /d "%~dp0"

set "BLENDER="
for /f "delims=" %%i in ('dir /b /s "C:\Program Files\Blender Foundation\blender.exe" 2^>nul') do set "BLENDER=%%i"
if not defined BLENDER (
  echo.
  echo   No encontre blender.exe.
  echo.
  pause
  exit /b 1
)

"%BLENDER%" -b --factory-startup -P "hacer-planos.py" -- "..\export\tour360_salida\planta-color.png"
echo.
echo   Para verlo: abrir-visor-node.bat
echo.
pause
