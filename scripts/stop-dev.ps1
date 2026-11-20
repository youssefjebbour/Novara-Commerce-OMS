$projectRoot=Split-Path $PSScriptRoot -Parent
foreach ($name in @('backend','storefront','admin')) {
    $pidFile=Join-Path $projectRoot ".runtime\$name.pid"
    if (Test-Path -LiteralPath $pidFile) {
        $servicePid=[int](Get-Content -LiteralPath $pidFile)
        $process=Get-CimInstance Win32_Process -Filter "ProcessId=$servicePid" -ErrorAction SilentlyContinue
        if ($process -and ($process.CommandLine.Contains($projectRoot) -or ($name -eq 'backend' -and $process.CommandLine.Contains('novara-api-1.0.0.jar')))) {
            Stop-Process -Id $servicePid
            Write-Output "Stopped $name."
        }
        Remove-Item -LiteralPath $pidFile
    }
}
Write-Output 'MySQL remains running. To stop it without deleting data: docker compose stop db'
