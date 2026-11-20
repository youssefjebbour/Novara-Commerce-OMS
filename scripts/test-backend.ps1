$ErrorActionPreference='Stop'
. "$PSScriptRoot\env.ps1"
Push-Location "$projectRoot\backend"
try { mvn -s maven-settings.xml -gs maven-settings.xml -B test; if ($LASTEXITCODE -ne 0) { throw 'Backend tests failed' } } finally { Pop-Location }
