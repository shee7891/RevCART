pipeline {
  agent any

  environment {
    DOCKERHUB_CRED = 'dockerhub-creds'                // Jenkins credentials (username/password)
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
          // Windows/PowerShell friendly mvn invocation
          powershell label: 'Maven package', script: "mvn ${env.MVN_OPTS} clean package"
        }
      }
    }

    stage('Build Frontend (npm)') {
      steps {
        dir('Frontend') {
          powershell label: 'npm ci', script: 'npm ci'

          // PowerShell script that tries production build and falls back to normal build,
          // without using shell '||' which fails in Windows PS.
          powershell label: 'Build frontend (prod then fallback)', script: '''
            Write-Host "Running production build..."
            npm run build -- --configuration=production
            if ($LASTEXITCODE -ne 0) {
              Write-Host "Production build failed with exit code $LASTEXITCODE, trying default build..."
              npm run build
              if ($LASTEXITCODE -ne 0) {
                throw "Both production and default frontend builds failed (exit $LASTEXITCODE). See log above."
              }
              else { Write-Host "Default build succeeded." }
            } else {
              Write-Host "Production build succeeded."
            }
          '''
        }
      }
    }

    stage('Docker: build & push') {
      steps {
        // use username/password Jenkins credentials (type: Username with password)
        withCredentials([usernamePassword(credentialsId: "${DOCKERHUB_CRED}", usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
          powershell label: 'Docker build & push (robust)', script: '''
            set -e

            # point to user DOCKER_CONFIG so contexts are available in this job
            if (-not $env:DOCKER_CONFIG) {
              $env:DOCKER_CONFIG = Join-Path $env:USERPROFILE ".docker"
            }
            Write-Host "DOCKER_CONFIG = $env:DOCKER_CONFIG"

            # detect docker context to use (desktop-linux common for Docker Desktop WSL)
            $contextArg = ""
            try {
              $contexts = docker context ls --format "{{.Name}}" 2>$null
              if ($contexts) {
                if ($contexts -match "desktop-linux") {
                  Write-Host "Using docker context: desktop-linux"
                  $contextArg = "--context desktop-linux"
                } elseif ($contexts -match "default") {
                  Write-Host "Using docker context: default"
                  $contextArg = "--context default"
                } else {
                  Write-Host "No special docker context selected; using default CLI context"
                }
              }
            } catch {
              Write-Host "Warning: failed to list docker contexts. continuing without explicit --context. Error: $_"
            }

            Write-Host "Logging into Docker Hub..."
            $pass = $env:DH_PASS
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($pass)
            $ms = New-Object System.IO.MemoryStream (,$bytes)
            $proc = Start-Process -FilePath "docker" -ArgumentList "login", "-u", $env:DH_USER, "--password-stdin" -NoNewWindow -RedirectStandardInput "pipe" -RedirectStandardOutput "pipe" -RedirectStandardError "pipe" -PassThru
            $sw = $proc.StandardInput
            $sw.Write($pass)
            $sw.Close()
            $proc.WaitForExit()
            $out = $proc.StandardOutput.ReadToEnd()
            $err = $proc.StandardError.ReadToEnd()
            Write-Host $out
            if ($proc.ExitCode -ne 0) {
              Write-Host "docker login (stdin) returned exit code $($proc.ExitCode). stderr: $err"
              Write-Host "Attempting fallback docker login (insecure fallback for CI only)..."
              docker login -u $env:DH_USER -p $env:DH_PASS
              if ($LASTEXITCODE -ne 0) { throw "Docker login failed (fallback)." }
            }

            # Build backend image
            Write-Host "Building backend image..."
            $backendBuildCmd = "docker $contextArg build -t ${env.BACKEND_IMAGE}:${env.IMAGE_TAG} -f Backend/Dockerfile Backend"
            Write-Host $backendBuildCmd
            iex $backendBuildCmd
            if ($LASTEXITCODE -ne 0) { throw "Backend docker build failed (exit $LASTEXITCODE)" }
            docker tag ${env.BACKEND_IMAGE}:${env.IMAGE_TAG} ${env.BACKEND_IMAGE}:latest

            # Build frontend image
            Write-Host "Building frontend image..."
            $frontendBuildCmd = "docker $contextArg build -t ${env.FRONTEND_IMAGE}:${env.IMAGE_TAG} -f Frontend/Dockerfile Frontend"
            Write-Host $frontendBuildCmd
            iex $frontendBuildCmd
            if ($LASTEXITCODE -ne 0) { throw "Frontend docker build failed (exit $LASTEXITCODE)" }
            docker tag ${env.FRONTEND_IMAGE}:${env.IMAGE_TAG} ${env.FRONTEND_IMAGE}:latest

            # Push images
            Write-Host "Pushing images..."
            docker push ${env.BACKEND_IMAGE}:${env.IMAGE_TAG}
            docker push ${env.BACKEND_IMAGE}:latest
            docker push ${env.FRONTEND_IMAGE}:${env.IMAGE_TAG}
            docker push ${env.FRONTEND_IMAGE}:latest

            Write-Host "Docker logout"
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
