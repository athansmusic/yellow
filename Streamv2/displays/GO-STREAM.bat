@echo off
REM Stream Deck: System ^> Open, pointing at this file.
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
if not exist "%~dp0stream.cfg" (
  echo.
  echo   stream.cfg does not exist yet.
  echo   Run 1-save-STREAM-layout.bat first, with your monitors
  echo   already arranged the way you want for this mode.
  echo.
  pause
  exit /b 1
)
"%TOOL%" /LoadConfig "%~dp0stream.cfg"
