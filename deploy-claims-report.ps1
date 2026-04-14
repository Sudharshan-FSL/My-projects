$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeExe = (Get-Command node).Source
$port = 3000
$hostName = $env:COMPUTERNAME
$logDir = Join-Path $projectRoot 'logs'
$stdoutLog = Join-Path $logDir 'claims-report.out.log'
$stderrLog = Join-Path $logDir 'claims-report.err.log'

if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir | Out-Null
}

$existingRule = Get-NetFirewallRule -DisplayName 'Claims Report 3000' -ErrorAction SilentlyContinue
if (-not $existingRule) {
  try {
    New-NetFirewallRule -DisplayName 'Claims Report 3000' -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port -Profile Private | Out-Null
  } catch {
    Write-Warning 'Firewall rule was not created. Re-run this script as Administrator to allow other users on the network to connect.'
  }
}

$existingNode = Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq 'node.exe' -and $_.CommandLine -match 'claims-report\\server.js'
}

if (-not $existingNode) {
  Start-Process -FilePath $nodeExe -ArgumentList 'server.js' -WorkingDirectory $projectRoot -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog -WindowStyle Hidden
}

Write-Host "Claims Report URL: http://$hostName`:$port"
Write-Host "Health URL: http://$hostName`:$port/health"
