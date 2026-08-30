@echo off
rem Start the Vite dev server (frontend) with the portable Node runtime.
set PATH=%~dp0node-v22.23.2-win-x64;%PATH%
cd /d "%~dp0frontend"
npm run dev
