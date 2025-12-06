pipeline {
  agent any

  environment {
    DOCKERHUB_CRED = 'dockerhub-creds'
    DOCKERHUB_USER = 'amanpardeshi01'
    BACKEND_IMAGE = "${DOCKERHUB_USER}/revcart-backend"
    FRONTEND_IMAGE = "${DOCKERHUB_USER}/revcart-frontend"
    IMAGE_TAG = "${env.BUILD_NUMBER}"
    MVN_OPTS = "-B -DskipTests"
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
          // Install deps
          powershell 'npm ci'

          // Build with PowerShell-friendly fallback
          powershell '''
            Write-Host "Running production build..."
            npm run build -- --configuration=production
            if ($LASTEXITCODE -ne 0) {
              Write-Host "Production build failed with exit code $LASTEXITCODE, trying default build..."
              npm run build
              if ($LASTEXITCODE -ne 0) {
                throw "Both production and default frontend builds failed (exit $LASTEXITCODE). See log above."
              }
            } else {
              Write-Host "Production build succeeded."
            }
          '''
        }
      }
    }

    stage('Docker: build & push (robust login)') {
      steps {
        // Use the dockerhub PAT stored in Jenkins credentials
        withCredentials([usernamePassword(credentialsId: "${DOCKERHUB_CRED}", usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
          powershell '''
            $ErrorActionPreference = "Continue"

            # Point Docker to the user's docker config so contexts (desktop-linux) are available
            $env:DOCKER_CONFIG = Join-Path $env:USERPROFILE ".docker"
            Write-Host "DOCKER_CONFIG = $env:DOCKER_CONFIG"

            # primary login: secure password-stdin
            $loginOk = $false
            try {
              Write-Host "Trying docker login using --password-stdin..."
              echo $env:DH_PASS | docker login -u $env:DH_USER --password-stdin
              if ($LASTEXITCODE -eq 0) {
                Write-Host "docker login (stdin) succeeded."
                $loginOk = $true
              } else {
                Write-Host "docker login (stdin) returned exit code $LASTEXITCODE"
              }
            } catch {
              Write-Host "docker login (stdin) threw: $($_.Exception.Message)"
            }

            # fallback login (debug / fallback only)
            if (-not $loginOk) {
              Write-Host "Attempting fallback docker login with --password (insecure fallback for CI only)..."
              try {
                docker --debug login -u $env:DH_USER --password $env:DH_PASS https://index.docker.io/v1/ 2>&1 | Write-Host
                if ($LASTEXITCODE -eq 0) {
                  Write-Host "docker login (fallback) succeeded."
                  $loginOk = $true
                } else {
                  Write-Host "docker login (fallback) returned exit code $LASTEXITCODE"
                }
              } catch {
                Write-Host "docker login (fallback) threw: $($_.Exception.Message)"
              }
            }

            if (-not $loginOk) {
              throw "Docker login failed (both primary and fallback attempts). Check credentials and network."
            }

            # Build backend image
            Write-Host "Building backend image..."
            docker build -t $env:BACKEND_IMAGE:$env:IMAGE_TAG -f Backend/Dockerfile Backend
            if ($LASTEXITCODE -ne 0) { throw "Backend docker build failed (exit $LASTEXITCODE)" }
            docker tag $env:BACKEND_IMAGE:$env:IMAGE_TAG $env:BACKEND_IMAGE:latest

            # Build frontend image
            Write-Host "Building frontend image..."
            docker build -t $env:FRONTEND_IMAGE:$env:IMAGE_TAG -f Frontend/Dockerfile Frontend
            if ($LASTEXITCODE -ne 0) { throw "Frontend docker build failed (exit $LASTEXITCODE)" }
            docker tag $env:FRONTEND_IMAGE:$env:IMAGE_TAG $env:FRONTEND_IMAGE:latest

            # Push images
            Write-Host "Pushing backend images..."
            docker push $env:BACKEND_IMAGE:$env:IMAGE_TAG
            if ($LASTEXITCODE -ne 0) { throw "Push failed for $env:BACKEND_IMAGE:$env:IMAGE_TAG" }
            docker push $env:BACKEND_IMAGE:latest
            if ($LASTEXITCODE -ne 0) { throw "Push failed for $env:BACKEND_IMAGE:latest" }

            Write-Host "Pushing frontend images..."
            docker push $env:FRONTEND_IMAGE:$env:IMAGE_TAG
            if ($LASTEXITCODE -ne 0) { throw "Push failed for $env:FRONTEND_IMAGE:$env:IMAGE_TAG" }
            docker push $env:FRONTEND_IMAGE:latest
            if ($LASTEXITCODE -ne 0) { throw "Push failed for $env:FRONTEND_IMAGE:latest" }

            Write-Host "Docker logout..."
            docker logout
          '''
        }
      }
    }
  }

  post {
    success {
      echo "Build and push succeeded: ${env.BUILD_NUMBER}"
    }
    failure {
      echo "Build failed. Check console output."
    }
  }
}
