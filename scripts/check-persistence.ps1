$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
New-Item -ItemType Directory -Path .runtime -Force | Out-Null

function Read-CommerceSnapshot {
    $sql = 'SELECT COUNT(*),COALESCE(SUM(total),0),MAX(id) FROM orders; SELECT id,number,status,total FROM orders ORDER BY id DESC LIMIT 5; SELECT product_id,quantity FROM inventory ORDER BY product_id; SELECT status,COUNT(*),SUM(amount) FROM payments GROUP BY status ORDER BY status;'
    $result = $sql | docker compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -N -B -u"$MYSQL_USER" "$MYSQL_DATABASE"'
    if ($LASTEXITCODE -ne 0) { throw 'Could not read database snapshot' }
    return ($result -join "`n")
}

$before = Read-CommerceSnapshot
$before | Set-Content .runtime/persistence-before.txt
docker compose restart db
if ($LASTEXITCODE -ne 0) { throw 'Database restart failed' }
$ready = $false
for ($attempt = 0; $attempt -lt 30; $attempt++) {
    $container = docker compose ps -q db
    $health = docker inspect --format '{{.State.Health.Status}}' $container
    if ($health -eq 'healthy') { $ready = $true; break }
    Start-Sleep -Seconds 2
}
if (!$ready) { throw 'Database did not become healthy' }
$after = Read-CommerceSnapshot
$after | Set-Content .runtime/persistence-after.txt
if ($before -cne $after) { throw 'Commerce data changed across database restart; compare .runtime/persistence-*.txt' }
$apiReady = $false
for ($attempt = 0; $attempt -lt 15; $attempt++) {
    try {
        if ((Invoke-RestMethod http://localhost:8081/actuator/health -TimeoutSec 5).status -eq 'UP') { $apiReady = $true; break }
    } catch { }
    Start-Sleep -Seconds 2
}
if (!$apiReady) { throw 'API did not reconnect to MySQL' }
Write-Output 'PASS: order counts/totals, recent order details, all inventory quantities and payment totals survived MySQL restart. API is UP.'
