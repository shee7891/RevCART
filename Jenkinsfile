pipeline {
    agent any
    
    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/shee7891/RevCART.git'
            }
        }
        
        stage('Build Backend') {
            steps {
                dir('Backend') {
                    bat 'mvn clean package -DskipTests'
                }
            }
        }
        
        stage('Build Frontend') {
            steps {
                dir('Frontend') {
                    bat 'npm install'
                }
            }
        }
        
        stage('Docker Build') {
            steps {
                bat 'docker-compose build'
            }
        }
    }
    
    post {
        success {
            echo 'Build Success!'
        }
        failure {
            echo 'Build Failed!'
        }
    }
}