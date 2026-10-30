@echo off
rem ============================================================
rem  WebUIDemo - thin wrapper around Gradle
rem      gradlew.bat build     -> out\WebUIDemo.jar + out\WebUIDemo.dex
rem      gradlew.bat shadowJar -> out\WebUIDemo.jar
rem      gradlew.bat dex       -> out\WebUIDemo.dex (设备端 D8 失败时用)
rem  Paths: AOH_GAME_ROOT / -PgameRoot= / -PhostJar= / -PuiApiJar=
rem ============================================================
setlocal
call "%~dp0gradlew.bat" build %*
set "RC=%ERRORLEVEL%"
pause
exit /b %RC%
