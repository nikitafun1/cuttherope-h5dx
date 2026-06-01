@echo off
set ANDROID_HOME=D:\Programs\AndroidSDK
set JAVA_HOME=D:\Programs\AndroidStudio\jbr
set PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%

echo ========================================================
echo Building Cut the Rope Burmalda Mobile Android App
echo ========================================================

echo 1. Compiling web application...
set VITE_BASE_NETLIFY=/
call npm run build

if %ERRORLEVEL% neq 0 (
    echo [ERROR] Web application compilation failed!
    exit /b %ERRORLEVEL%
)

echo 2. Syncing web files with Capacitor...
call npx cap sync

if %ERRORLEVEL% neq 0 (
    echo [ERROR] Capacitor sync failed!
    exit /b %ERRORLEVEL%
)

echo 3. Compiling Android APKs...
cd android
call gradlew.bat assembleDebug
call gradlew.bat assembleRelease
cd ..

echo ========================================================
echo Build Completed Successfully!
echo ========================================================
echo APKs generated at:
echo - Debug: android\app\build\outputs\apk\debug\app-debug.apk
echo - Release: android\app\build\outputs\apk\release\app-release-unsigned.apk
echo ========================================================
