@echo off
color 0a
title Neogleamz Local Engine
echo ========================================================
echo   NEOGLEAMZ ENGINE BOOT SEQUENCE
echo ========================================================
echo.
echo Starting local Node.js control tower...
echo.

node tools/local-engine.js

echo.
echo [!] Engine terminated or crashed.
pause
