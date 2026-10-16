@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\saber-theme.ps1" -Action Install -Interactive
if errorlevel 1 pause
