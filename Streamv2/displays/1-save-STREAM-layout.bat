@echo off
REM ===================================================================
REM  Run ONCE, with monitors arranged for STREAMING.
REM  Captures what is on screen NOW - so set it up first.
REM ===================================================================
setlocal
set "TOOL=%~dp0MultiMonitorTool.exe"
if not exist "%TOOL%" set "TOOL=%~dp0multimonitortool-x64\MultiMonitorTool.exe"
if not exist "%TOOL%" (
  echo.
  echo   MultiMonitorTool.exe not found in this folder or in
  echo   the multimonitortool-x64 subfolder.
  echo   Get the 64-bit zip: nirsoft.net/utils/multi_monitor_tool.html
  echo.
  pause
  exit /b 1
)
"%TOOL%" /SaveConfig "%~dp0stream.cfg"
if not exist "%~dp0stream.cfg" (
  echo.
  echo   FAILED - stream.cfg was not written.
  echo.
  pause
  exit /b 1
)
echo.
echo   Saved STREAM layout to stream.cfg
echo.
pause
