@echo off

taskkill /F /IM node.exe >nul 2>&1

start "Backend" powershell -NoExit -Command "cd 'C:\Users\sanch\ace it up'; $env:Path='C:\Users\sanch\ace it up\node-v22.23.2-win-x64;' + $env:Path; node app.js"

start "Frontend" powershell -NoExit -Command "cd 'C:\Users\sanch\ace it up\frontend'; $env:Path='C:\Users\sanch\ace it up\node-v22.23.2-win-x64;' + $env:Path; node ..\node-v22.23.2-win-x64\node_modules\npm\bin\npm-cli.js run dev"