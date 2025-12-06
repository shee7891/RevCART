@echo off
echo ========================================
echo RevCart Local Testing Script
echo ========================================
echo.

echo Step 1: Rebuilding Backend JAR...
cd Backend
call mvn clean package -DskipTests
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Maven build failed!
    pause
    exit /b 1
)
cd ..

echo.
echo Step 2: Building Frontend...
cd Frontend
call npm install
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Frontend build failed!
    pause
    exit /b 1
)

echo Preparing browser folder for Docker...
if exist browser rmdir /s /q browser
mkdir browser
xcopy /E /I /Y dist\frontend\browser\* browser\
cd ..

echo.
echo Step 3: Starting Docker Compose...
docker-compose down -v
docker-compose up --build -d

echo.
echo Step 3: Waiting for services to start...
timeout /t 30

echo.
echo Step 4: Checking service status...
docker-compose ps

echo.
echo ========================================
echo Services should be running at:
echo Frontend: http://localhost:4200
echo Backend:  http://localhost:8080
echo Health:   http://localhost:8080/actuator/health
echo ========================================
echo.
echo To view logs: docker-compose logs -f
echo To stop:      docker-compose down
echo.
pause
