@echo off
rem ============================================================
rem  WebUIDemo - thin wrapper around Gradle
rem      gradlew.bat shadowJar  -> out\WebUIDemo.jar
rem  Paths: AOH_GAME_ROOT / -PgameRoot= / -PhostJar= / -PuiApiJar=
rem ============================================================
setlocal
call "%~dp0gradlew.bat" shadowJar %*
set "RC=%ERRORLEVEL%"
pause
exit /b %RC%
