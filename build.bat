@echo off
rem ============================================================================
rem  WebUIDemo - build the demo hot plugin (build only, no deployment)
rem  Output: out\WebUIDemo.jar
rem  Requires: HotPluginLoader jar + LoaderSettings\out\ui-api.jar
rem ============================================================================
setlocal
set "HERE=%~dp0"
rem --- game root / JDK: override with AOH_GAME_ROOT / JAVA_HOME ---
if defined AOH_GAME_ROOT set "GAME=%AOH_GAME_ROOT%"
if not defined GAME for %%I in ("%~dp0..") do set "GAME=%%~fI"
if defined JAVA_HOME set "JDK=%JAVA_HOME%"
if not defined JDK for /d %%D in ("C:\Program Files\Microsoft\jdk-*") do set "JDK=%%D"
if not defined JDK for /d %%D in ("C:\Program Files\Java\jdk-*") do set "JDK=%%D"
if not defined JDK ( echo [ERR] JDK11 not found - set JAVA_HOME & exit /b 1 )
if not defined HJAR for %%F in ("%GAME%\HotPluginLoader\build\libs\HotPluginLoader-*.jar") do set "HJAR=%%~fF"
if not defined APIJAR set "APIJAR=%GAME%\LoaderSettings\out\ui-api.jar"

if not exist "%HJAR%" (
  echo [ERR] missing HotPluginLoader jar: "%HJAR%"
  exit /b 1
)
if not exist "%APIJAR%" (
  echo [ERR] missing UI API jar: "%APIJAR%"
  echo       run LoaderSettings\build-dex.bat first
  exit /b 1
)

cd /d "%HERE%"
if exist build rmdir /s /q build
mkdir build\classes 2>nul
mkdir out 2>nul

echo [1/2] javac ...
"%JDK%\bin\javac.exe" -encoding UTF-8 -source 8 -target 8 -nowarn -cp "%HJAR%;%APIJAR%" -d build\classes ^
  src\com\saysky\webdemo\WebDemoPlugin.java
if errorlevel 1 goto :fail

echo [2/2] jar ...
"%JDK%\bin\jar.exe" cfM out\WebUIDemo.jar -C build\classes .
if errorlevel 1 goto :fail

echo DONE. build artifacts (copy into the game yourself):
echo   %HERE%out\WebUIDemo.jar      -^> hotplugins\
echo   %HERE%WebUIDemo.json         -^> hotplugins\
echo   %HERE%resources\             -^> hotplugins\resources\WebUIDemo\
exit /b 0

:fail
echo BUILD FAILED (exitcode %errorlevel%)
exit /b 1
