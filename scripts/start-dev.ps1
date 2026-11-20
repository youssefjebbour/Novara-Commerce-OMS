param([switch]$SkipBuild)
$ErrorActionPreference='Stop'
. "$PSScriptRoot\env.ps1"
Set-Location $projectRoot
New-Item -ItemType Directory -Path .runtime -Force | Out-Null
docker compose up -d db
if ($LASTEXITCODE -ne 0) { throw 'Database startup failed' }
if (!$SkipBuild) {
    $backendPidFile = Join-Path $projectRoot '.runtime\backend.pid'
    if (Test-Path -LiteralPath $backendPidFile) {
        $existingBackendPid = [int](Get-Content -LiteralPath $backendPidFile)
        $existingBackend = Get-CimInstance Win32_Process -Filter "ProcessId=$existingBackendPid" -ErrorAction SilentlyContinue
        if ($existingBackend -and $existingBackend.CommandLine.Contains('novara-api-1.0.0.jar')) {
            Stop-Process -Id $existingBackendPid
            Start-Sleep -Seconds 1
        }
    }
    npm ci
    if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }
    Push-Location backend
    try { mvn -s maven-settings.xml -gs maven-settings.xml -B package -DskipTests; if ($LASTEXITCODE -ne 0) { throw 'Backend build failed' } } finally { Pop-Location }
}
$services=@(
    @{Name='backend';Exe="$env:JAVA_HOME\bin\java.exe";Args=@('-jar',"$projectRoot\backend\target\novara-api-1.0.0.jar");Directory="$projectRoot\backend";Port=8081},
    @{Name='storefront';Exe=(Get-Command node).Source;Args=@("$projectRoot\node_modules\vite\bin\vite.js",'--host','127.0.0.1','--port','5174','--strictPort');Directory="$projectRoot\frontend\storefront";Port=5174},
    @{Name='admin';Exe=(Get-Command node).Source;Args=@("$projectRoot\node_modules\vite\bin\vite.js",'--host','127.0.0.1','--port','5175','--strictPort');Directory="$projectRoot\frontend\admin";Port=5175}
)
foreach ($service in $services) {
    if (Get-NetTCPConnection -LocalPort $service.Port -State Listen -ErrorAction SilentlyContinue) { Write-Output "$($service.Name): port $($service.Port) already in use; not starting a duplicate."; continue }
    $process=Start-Process -FilePath $service.Exe -ArgumentList $service.Args -WorkingDirectory $service.Directory -WindowStyle Hidden -RedirectStandardOutput "$projectRoot\.runtime\$($service.Name).log" -RedirectStandardError "$projectRoot\.runtime\$($service.Name)-error.log" -PassThru
    $process.Id | Set-Content "$projectRoot\.runtime\$($service.Name).pid"
    Write-Output "Started $($service.Name) (PID $($process.Id))."
}
Write-Output 'Storefront http://localhost:5174 | OMS http://localhost:5175 | API http://localhost:8081'
