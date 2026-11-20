$projectRoot = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $projectRoot '.env'
if (!(Test-Path -LiteralPath $envFile)) { throw 'Copy .env.example to .env and configure its values first.' }
Get-Content -LiteralPath $envFile | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process') }
}
if (!$env:JAVA_HOME -or !(Test-Path "$env:JAVA_HOME\bin\java.exe") -or !(& "$env:JAVA_HOME\bin\java.exe" -version 2>&1 | Select-String 'version "21')) {
    $jdk21 = Get-ChildItem 'C:\Program Files\Eclipse Adoptium','C:\Program Files\Java','C:\Java' -Directory -ErrorAction SilentlyContinue | Where-Object Name -Match 'jdk-?21' | Select-Object -First 1
    if ($jdk21) { $env:JAVA_HOME = $jdk21.FullName }
}
if ($env:JAVA_HOME) { $env:Path = "$env:JAVA_HOME\bin;$env:Path" }
