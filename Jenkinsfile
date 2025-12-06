pipeline {
  agent any

  environment {
    DOCKERHUB_CRED = 'dockerhub-creds'
    DOCKERHUB_USER = 'amanpardeshi01'
    BACKEND_IMAGE   = "${DOCKERHUB_USER}/revcart-backend"
    FRONTEND_IMAGE  = "${DOCKERHUB_USER}/revcart-frontend"
    IMAGE_TAG       = "${env.BUILD_NUMBER ?: 'local'}"
    MVN_OPTS        = "-B -DskipTests"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build Backend (Maven)') {
      steps {
        dir('Backend') {
          powershell '''
            Write-Host "Running Maven package..."
            mvn ${env.MVN_OPTS} clean package
            if ($LASTEXITCODE -ne 0) { throw "Maven build failed (exit $LASTEXITCODE)" }
          '''
        }
      }
    }

    stage('Build Frontend (npm)') {
      steps {
        dir('Frontend') {
          powershell '''
            Write-Host "Installing frontend dependencies..."
            npm ci
            Write-Host "Running production build..."
            npm run build -- --configuration=production
            if ($LASTEXITCODE -ne 0) {
              Write-Host "Production build failed with exit code $LASTEXITCODE, trying default build..."
              npm run build
              if ($LASTEXITCODE -ne 0) {
                throw "Both production and default frontend builds failed (exit $LASTEXITCODE). See log above."
              } else {
                Write-Host "Default build succeeded."
              }
            } else {
              Write-Host "Production build succeeded."
            }
          '''
        }
      }
    }

    stage('Prepare Frontend Docker Context') {
      steps {
        // Prepare a clean Frontend/browser folder that contains the built static files
        powershell '''
          $ErrorActionPreference = 'Stop'
          Write-Host "Preparing frontend docker build context..."

          $frontendDir = (Resolve-Path -Path "Frontend").Path
          $distBrowser = Join-Path -Path $frontendDir -ChildPath "dist\\frontend\\browser"
          $destBrowser = Join-Path -Path $frontendDir -ChildPath "browser"

          # Remove any stale browser folder
          if (Test-Path -Path $destBrowser) {
            Write-Host "Removing old $destBrowser"
            Remove-Item -Recurse -Force -Path $destBrowser
          }

          if (-not (Test-Path -Path $distBrowser)) {
            throw "Frontend build output not found at: $distBrowser - ensure Build Frontend stage completed successfully."
          }

          # create destination folder
          New-Item -ItemType Directory -Force -Path $destBrowser | Out-Null

          # copy the *contents* of dist\frontend\browser into Frontend\browser
          Copy-Item -Path (Join-Path $distBrowser '*') -Destination $destBrowser -Recurse -Force

          # Ensure optional metadata files exist in Frontend/ so Dockerfile.prod can COPY them successfully.
          $preroute = Join-Path $frontendDir 'prerendered-routes.json'
          if (-not (Test-Path -Path $preroute)) {
            # If there is a prerendered-routes.json in dist, copy it; otherwise create an empty file
            $src = Join-Path $frontendDir 'dist\\frontend\\prerendered-routes.json'
            if (Test-Path -Path $src) {
              Copy-Item -Force $src $preroute
            } else {
              New-Item -ItemType File -Force -Path $preroute | Out-Null
            }
          }

          $licenses = Join-Path $frontendDir '3rdpartylicenses.txt'
          if (-not (Test-Path -Path $licenses)) {
            $src2 = Join-Path $frontendDir 'dist\\frontend\\3rdpartylicenses.txt'
            if (Test-Path -Path $src2) {
              Copy-Item -Force $src2 $licenses
            } else {
              New-Item -ItemType File -Force -Path $licenses | Out-Null
            }
          }

          Write-Host "Frontend docker context prepared at: $destBrowser"
        '''
      }
    }

    stage('Docker: build & push') {
      steps {
        withCredentials([usernamePassword(credentialsId: "${DOCKERHUB_CRED}", usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
          powershell '''
            $ErrorActionPreference = 'Stop'

            if (-not $env:DOCKER_CONFIG) {
              $env:DOCKER_CONFIG = Join-Path $env:USERPROFILE ".docker"
            }
            Write-Host "DOCKER_CONFIG = $env:DOCKER_CONFIG"

            # ---------- docker login (secure then fallback) ----------
            $loginSucceeded = $false
            try {
              Write-Host "Trying docker login (password-stdin)..."
              $env:DH_PASS | docker login -u $env:DH_USER --password-stdin
              if ($LASTEXITCODE -eq 0) {
                Write-Host "docker login (stdin) succeeded."
                $loginSucceeded = $true
              } else {
                Write-Host "docker login (stdin) exit code: $LASTEXITCODE"
              }
            } catch {
              Write-Host "docker login (stdin) failed: $($_.Exception.Message)"
            }

            if (-not $loginSucceeded) {
              Write-Host "Attempting fallback docker login (insecure, debug only)..."
              docker login -u $env:DH_USER -p $env:DH_PASS
              if ($LASTEXITCODE -ne 0) { throw "Fallback docker login failed (exit $LASTEXITCODE)" }
              Write-Host "docker login (fallback) succeeded."
            }

            # ---------- image names ----------
            if (-not $env:BACKEND_IMAGE -or -not $env:IMAGE_TAG) {
              throw "Required environment variables missing: BACKEND_IMAGE or IMAGE_TAG"
            }

            $backend = "$($env:BACKEND_IMAGE):$($env:IMAGE_TAG)"
            $backendLatest = "$($env:BACKEND_IMAGE):latest"
            $frontend = "$($env:FRONTEND_IMAGE):$($env:IMAGE_TAG)"
            $frontendLatest = "$($env:FRONTEND_IMAGE):latest"

            # ---------- build backend ----------
            Write-Host "Building backend image: $backend"
            docker build -t $backend -f Backend/Dockerfile Backend
            if ($LASTEXITCODE -ne 0) { throw "Backend docker build failed (exit $LASTEXITCODE)" }
            docker tag $backend $backendLatest

            # ---------- build frontend (prod Dockerfile) ----------
            Write-Host "Building frontend image (prod): $frontend"
            $retries = 3
            $success = $false
            for ($i = 1; $i -le $retries; $i++) {
              Write-Host "Attempt $i of $retries..."
              docker build -t $frontend -f Frontend/Dockerfile.prod Frontend
              if ($LASTEXITCODE -eq 0) {
                $success = $true
                break
              }
              if ($i -lt $retries) { Start-Sleep -Seconds 10 }
            }
            if (-not $success) { throw "Frontend docker build failed after $retries attempts" }
            docker tag $frontend $frontendLatest

            # ---------- push with retry ----------
            function Push-WithRetry {
              param([string]$image, [int]$maxRetries = 3)
              for ($i = 1; $i -le $maxRetries; $i++) {
                Write-Host "Pushing $image (attempt $i/$maxRetries)..."
                docker push $image
                if ($LASTEXITCODE -eq 0) { return }
                if ($i -lt $maxRetries) { Start-Sleep -Seconds 5 }
              }
              throw "Push failed after $maxRetries attempts: $image"
            }

            Write-Host "Pushing images..."
            Push-WithRetry -image $backend
            Push-WithRetry -image $backendLatest
            Push-WithRetry -image $frontend
            Push-WithRetry -image $frontendLatest

            Write-Host "Docker logout"
            docker logout

            # cleanup workspace artifacts (optional)
            Remove-Item -Recurse -Force Frontend\\browser -ErrorAction SilentlyContinue
            Remove-Item -Force Frontend\\prerendered-routes.json -ErrorAction SilentlyContinue
            Remove-Item -Force Frontend\\3rdpartylicenses.txt -ErrorAction SilentlyContinue
          '''
        }
      }
    }

    stage('Deploy Containers') {
      steps {
        powershell '''
          $ErrorActionPreference = 'Stop'
          Write-Host "Deploying containers..."

          # Stop and remove existing containers
          docker stop revcart-backend revcart-frontend revcart-mysql revcart-mongodb -ErrorAction SilentlyContinue
          docker rm revcart-backend revcart-frontend revcart-mysql revcart-mongodb -ErrorAction SilentlyContinue

          # Create network if not exists
          docker network create revcart-network -ErrorAction SilentlyContinue

          # Start MySQL
          docker run -d --name revcart-mysql --network revcart-network `
            -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=revcart `
            -p 3307:3306 mysql:8.0

          # Start MongoDB
          docker run -d --name revcart-mongodb --network revcart-network `
            -p 27018:27017 mongo:7

          Start-Sleep -Seconds 10

          # Start Backend
          docker run -d --name revcart-backend --network revcart-network --network-alias backend `
            -e SPRING_DATASOURCE_URL="jdbc:mysql://revcart-mysql:3306/revcart?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true" `
            -e SPRING_DATASOURCE_USERNAME=root -e SPRING_DATASOURCE_PASSWORD=root `
            -e SPRING_DATA_MONGODB_URI="mongodb://revcart-mongodb:27017/revcart_logs" `
            -e REVCART_SECURITY_JWT_SECRET="ChangeMeToAStrongSecretKeyForRevCartBackend123456" `
            -e REVCART_SECURITY_JWT_EXPIRATION_MS=86400000 `
            -p 8080:8080 amanpardeshi01/revcart-backend:latest

          Start-Sleep -Seconds 10

          # Start Frontend
          docker run -d --name revcart-frontend --network revcart-network `
            -p 4200:80 amanpardeshi01/revcart-frontend:latest

          Start-Sleep -Seconds 5
          docker ps
          Write-Host "Deployment complete!"
        '''
      }
    }
  }

  post {
    success { echo "Build and push succeeded: ${env.BUILD_NUMBER}" }
    failure { echo "Build failed. Check console output." }
  }
}
