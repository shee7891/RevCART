pipeline {
    agent any
    
    environment {
        AWS_REGION = 'us-east-1'
        ECR_REPO = '<account-id>.dkr.ecr.us-east-1.amazonaws.com/revcart'
        IMAGE_TAG = "${BUILD_NUMBER}"
    }
    
    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/shee7891/RevCART.git'
            }
        }
        
        stage('Build JAR') {
            steps {
                dir('Backend') {
                    sh 'mvn clean package -DskipTests'
                }
            }
        }
        
        stage('Build Docker Image') {
            steps {
                dir('Backend') {
                    sh "docker build -t revcart:${IMAGE_TAG} ."
                    sh "docker tag revcart:${IMAGE_TAG} ${ECR_REPO}:${IMAGE_TAG}"
                }
            }
        }
        
        stage('Push to ECR') {
            steps {
                script {
                    sh "aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REPO}"
                    sh "docker push ${ECR_REPO}:${IMAGE_TAG}"
                }
            }
        }
        
        stage('Deploy to EC2') {
            steps {
                sshagent(['ec2-ssh-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ec2-user@<ec2-ip> '
                            aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REPO}
                            docker pull ${ECR_REPO}:${IMAGE_TAG}
                            docker stop revcart || true
                            docker rm revcart || true
                            docker run -d --name revcart -p 8080:8080 ${ECR_REPO}:${IMAGE_TAG}
                        '
                    """
                }
            }
        }
    }
}