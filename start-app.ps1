# Starts the Ace It Up API and the Vite frontend, in that order.
# The frontend proxies /tests, /attempts and /api to http://localhost:3000, so
# the API MUST be listening before the app is opened - otherwise every call
# comes back as "Request failed (500)".
$root  = Split-Path -Parent $MyInvocation.MyCommand.Path
$node  = Join-Path $root 'node-v22.23.2-win-x64'
$log   = Join-Path $root 'api.log'

Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 700

$env:Path = $node + ';' + $env:Path

$api = Start-Process powershell -ArgumentList '-NoExit', '-Command', `
  "cd '$root'; `$env:Path = '$node;' + `$env:Path; node app.js *>> '$log'" -PassThru

Write-Host 'Waiting for the API on http://localhost:3000 ...'
$ready = $false
for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Milliseconds 500
  try {
    $r = Invoke-WebRequest -Uri 'http://localhost:3000/api/health' -UseBasicParsing -TimeoutSec 3
    if ($r.StatusCode -eq 200) { $ready = $true; break }
  } catch { }
}

if ($ready) {
  Write-Host 'API is up.' -ForegroundColor Green
} else {
  Write-Host 'API did not come up in 20s - last log lines:' -ForegroundColor Red
  if (Test-Path $log) { Get-Content $log -Tail 20 }
  Write-Host 'Fix the API error above, then run this script again.'
  exit 1
}

Start-Process powershell -ArgumentList '-NoExit', '-Command', `
  "cd '$root\frontend'; `$env:Path = '$node;' + `$env:Path; node ..\node-v22.23.2-win-x64\node_modules\npm\bin\npm-cli.js run dev"

Write-Host 'Frontend starting on http://localhost:5174' -ForegroundColor Green
