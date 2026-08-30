Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd 'C:\Users\sanch\ace it up'; `$env:Path = 'C:\Users\sanch\ace it up\node-v22.23.2-win-x64;' + `$env:Path; node app.js"

Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd 'C:\Users\sanch\ace it up\frontend'; `$env:Path = 'C:\Users\sanch\ace it up\node-v22.23.2-win-x64;' + `$env:Path; node ..\node-v22.23.2-win-x64\node_modules\npm\bin\npm-cli.js run dev"