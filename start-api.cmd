@echo off
rem Start the Express API with the portable Node runtime.
set PATH=%~dp0node-v22.23.2-win-x64;%PATH%
node "%~dp0app.js"
