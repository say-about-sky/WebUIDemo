@echo off
rem ============================================================================
rem  WebUIDemo - build the demo hot plugin and deploy it into hotplugins/
rem  Requires: HotPluginLoader/build/libs/HotPluginLoader-0.2.0.jar
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
set "DEST=%GAME%\hotplugins"

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

echo [1/4] javac ...
"%JDK%\bin\javac.exe" -encoding UTF-8 -source 8 -target 8 -nowarn -cp "%HJAR%;%APIJAR%" -d build\classes ^
  src\com\saysky\webdemo\WebDemoPlugin.java
if errorlevel 1 goto :fail

echo [2/4] jar ...
"%JDK%\bin\jar.exe" cfM out\WebUIDemo.jar -C build\classes .
if errorlevel 1 goto :fail

echo [3/4] deploy jar + manifest ...
if not exist "%DEST%" mkdir "%DEST%"
copy /y out\WebUIDemo.jar "%DEST%\WebUIDemo.jar" >nul
copy /y WebUIDemo.json "%DEST%\WebUIDemo.json" >nul
if errorlevel 1 goto :fail

rem remove stale converted artifacts so the loader converts the fresh jar next scan
if exist "%DEST%\WebUIDemo.dex" del /q "%DEST%\WebUIDemo.dex"
if exist "%DEST%\WebUIDemo.jar.done" del /q "%DEST%\WebUIDemo.jar.done"
if exist "%DEST%\dex\WebUIDemo.dex" del /q "%DEST%\dex\WebUIDemo.dex"
if exist "%DEST%\jar\WebUIDemo.jar.done" del /q "%DEST%\jar\WebUIDemo.jar.done"
if exist "%DEST%\jar\WebUIDemo.jar" del /q "%DEST%\jar\WebUIDemo.jar"

echo [4/4] deploy resources (web + event) ...
if not exist "%DEST%\resources\WebUIDemo" mkdir "%DEST%\resources\WebUIDemo"
xcopy /e /i /y /q resources "%DEST%\resources\WebUIDemo" >nul
if errorlevel 1 goto :fail

echo DONE.
echo   %DEST%\WebUIDemo.jar
echo   %DEST%\WebUIDemo.json
echo   %DEST%\resources\WebUIDemo\
exit /b 0

:fail
echo BUILD FAILED (exitcode %errorlevel%)
exit /b 1
