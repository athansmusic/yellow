@echo off
REM Live Listen control server - visible console, Ctrl+C to stop.
REM Double-click this, or use start-control-silent.vbs for no window.
title Stream Control Server
cd /d "%~dp0"
python control\server.py
echo.
echo Server stopped. Press any key to close.
pause >nul
