@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\saber-theme.ps1" -Action Start -Interactive
if errorlevel 1 pause
