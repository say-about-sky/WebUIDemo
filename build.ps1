#
#  WebUIDemo - one-shot build
#
#    powershell -ExecutionPolicy Bypass -File build.ps1
#    powershell -ExecutionPolicy Bypass -File build.ps1 -GameRoot <game dir>
#
#  Steps: resolve game root / JDK / SDK -> ensure host jar -> ensure LoaderSettings\out\ui-api.jar
#         (built from LoaderSettings sources when missing) -> run build.bat -> out\WebUIDemo.jar
#
param(
    [string]$GameRoot = "",
    [string]$JdkHome = "",
    [string]$AndroidSdk = "",
    [string]$HostJar = "",
    [string]$UiApiJar = ""
)
$ErrorActionPreference = "Stop"
$proj = $PSScriptRoot

function Fail([string]$m) { Write-Host ("[ERROR] " + $m); exit 1 }
function Get-JdkMajor([string]$jdkDir) {
    $rel = Join-Path $jdkDir "release"
    if (Test-Path -LiteralPath $rel) {
        $m = Select-String -LiteralPath $rel -Pattern 'JAVA_VERSION="(\d+)' | Select-Object -First 1
        if ($m) { return [int]$m.Matches[0].Groups[1].Value }
    }
    return 0
}

if ([string]::IsNullOrEmpty($GameRoot)) {
    if ($env:AOH_GAME_ROOT) { $GameRoot = $env:AOH_GAME_ROOT } else { $GameRoot = Split-Path -Parent $proj }
}
Write-Host "=== game root: $GameRoot"

if ([string]::IsNullOrEmpty($JdkHome)) {
    $cands = New-Object System.Collections.ArrayList
    if ($env:JAVA_HOME) { $cands.Add($env:JAVA_HOME) | Out-Null }
    Get-ChildItem "C:\Program Files\Microsoft\jdk-*","C:\Program Files\Java\jdk-*" -Directory -ErrorAction SilentlyContinue |
        ForEach-Object { $cands.Add($_.FullName) | Out-Null }
    foreach ($c in $cands) {
        if (-not (Test-Path -LiteralPath (Join-Path $c "bin\javac.exe"))) { continue }
        $major = Get-JdkMajor $c
        if ($major -ge 11 -and $major -le 17) { $JdkHome = $c; break }
    }
}
if ([string]::IsNullOrEmpty($JdkHome)) { Fail "JDK 11+ not found: set JAVA_HOME or pass -JdkHome" }
$javac = Join-Path $JdkHome "bin\javac.exe"
$jarExe = Join-Path $JdkHome "bin\jar.exe"
Write-Host "=== jdk      : $JdkHome"

# ---- host jar ----
function Find-HostJar {
    $hit = @(Get-ChildItem -LiteralPath (Join-Path $GameRoot "HotPluginLoader\build\libs") -Filter "HotPluginLoader-*.jar" -ErrorAction SilentlyContinue |
             Sort-Object LastWriteTime -Descending | Select-Object -First 1)
    if ($hit.Count -gt 0) { return $hit[0].FullName }
    return $null
}
if ([string]::IsNullOrEmpty($HostJar)) { $HostJar = Find-HostJar }
if ([string]::IsNullOrEmpty($HostJar)) {
    $hostPs1 = Join-Path $GameRoot "HotPluginLoader\build.ps1"
    if (Test-Path -LiteralPath $hostPs1) {
        Write-Host "=== host jar missing, building HotPluginLoader (jar only) ..."
        & powershell -NoProfile -ExecutionPolicy Bypass -File $hostPs1 -JarOnly -GameRoot $GameRoot -JdkHome $JdkHome
        $HostJar = Find-HostJar
    }
}
if ([string]::IsNullOrEmpty($HostJar)) { Fail "HotPluginLoader jar not found (build HotPluginLoader first, or pass -HostJar)" }
Write-Host "=== host jar : $HostJar"

# ---- ui-api.jar ----
$lsProj = Join-Path $GameRoot "LoaderSettings"
if ([string]::IsNullOrEmpty($UiApiJar)) {
    $UiApiJar = Join-Path $lsProj "out\ui-api.jar"
}
if (-not (Test-Path -LiteralPath $UiApiJar)) {
    Write-Host "=== ui-api.jar missing, building it from LoaderSettings sources ..."
    if (-not (Test-Path -LiteralPath (Join-Path $lsProj "java\src"))) {
        Fail "LoaderSettings sources not found under '$lsProj' (clone LoaderSettings next to this project, or pass -UiApiJar)"
    }
    if ([string]::IsNullOrEmpty($AndroidSdk)) {
        if ($env:ANDROID_HOME) { $AndroidSdk = $env:ANDROID_HOME }
        elseif ($env:ANDROID_SDK_ROOT) { $AndroidSdk = $env:ANDROID_SDK_ROOT }
        else { foreach ($c in @((Join-Path $env:LOCALAPPDATA "Android\Sdk"), "C:\Android\Sdk")) { if (Test-Path -LiteralPath $c) { $AndroidSdk = $c; break } } }
    }
    $androidJar = $null
    if ($AndroidSdk) {
        $pref = Join-Path $AndroidSdk "platforms\android-34\android.jar"
        if (Test-Path -LiteralPath $pref) { $androidJar = $pref }
        else {
            $plat = @(Get-ChildItem -LiteralPath (Join-Path $AndroidSdk "platforms") -Directory -ErrorAction SilentlyContinue |
                      Sort-Object Name -Descending | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName "android.jar") } | Select-Object -First 1)
            if ($plat.Count -gt 0) { $androidJar = Join-Path $plat[0].FullName "android.jar" }
        }
    }
    if (-not $androidJar) { Fail "android.jar not found: set ANDROID_HOME (needed to compile ui-api.jar)" }

    $stubOut = Join-Path $env:TEMP "webuidemo_stub"
    $srcOut = Join-Path $env:TEMP "webuidemo_api"
    foreach ($d in @($stubOut, $srcOut)) { if (Test-Path -LiteralPath $d) { Remove-Item -LiteralPath $d -Recurse -Force }; New-Item -ItemType Directory -Path $d | Out-Null }
    $stubFiles = @(Get-ChildItem -LiteralPath (Join-Path $lsProj "java\stubs") -Recurse -Filter *.java | ForEach-Object { $_.FullName })
    if ($stubFiles.Count -eq 0) { Fail "LoaderSettings\java\stubs not found" }
    & $javac -encoding UTF-8 --release 8 -d $stubOut @stubFiles
    if ($LASTEXITCODE -ne 0) { Fail "javac stubs failed" }
    $srcFiles = @(Get-ChildItem -LiteralPath (Join-Path $lsProj "java\src") -Recurse -Filter *.java | ForEach-Object { $_.FullName })
    & $javac -encoding UTF-8 --release 8 -cp "$androidJar;$stubOut" -d $srcOut @srcFiles
    if ($LASTEXITCODE -ne 0) { Fail "javac LoaderSettings src failed" }
    $apiDir = Split-Path -Parent $UiApiJar
    if (-not (Test-Path -LiteralPath $apiDir)) { New-Item -ItemType Directory -Path $apiDir | Out-Null }
    & $jarExe cf $UiApiJar -C $srcOut "com/saysky/ui/api" -C $srcOut "com/saysky/ui/UiHost.class" -C $srcOut "com/saysky/game/GameApi.class"
    if ($LASTEXITCODE -ne 0) { Fail "jar ui-api failed" }
    Write-Host "=== ui-api.jar built"
}
Write-Host "=== ui-api   : $UiApiJar"

$env:AOH_GAME_ROOT = $GameRoot
$env:HJAR = $HostJar
$env:APIJAR = $UiApiJar
$env:JAVA_HOME = $JdkHome
Write-Host "=== build.bat"
& cmd /c "`"$proj\build.bat`""
if ($LASTEXITCODE -ne 0) { Fail "build.bat failed" }

$jar = Join-Path $proj "out\WebUIDemo.jar"
if (-not (Test-Path -LiteralPath $jar)) { Fail "out\WebUIDemo.jar not produced" }
Write-Host ""
Write-Host ("[OK] " + $jar + "  (" + (Get-Item -LiteralPath $jar).Length + " bytes)")
exit 0
