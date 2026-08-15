@echo off
REM ===================================================================
REM  Run ONCE, AFTER putting monitors back to normal.
REM  Not straight after the stream save, or you capture the same
REM  layout twice and get two identical files.
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
"%TOOL%" /SaveConfig "%~dp0desktop.cfg"
if not exist "%~dp0desktop.cfg" (
  echo.
  echo   FAILED - desktop.cfg was not written.
  echo.
  pause
  exit /b 1
)
echo.
echo   Saved DESKTOP layout to desktop.cfg
echo.
pause
