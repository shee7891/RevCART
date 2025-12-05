# CI/CD Pipeline Setup

## Prerequisites
- Jenkins server with Docker and AWS CLI installed
- AWS ECR repository created
- EC2 instance with Docker installed
- SSH key configured in Jenkins for EC2 access

## Setup Steps

### 1. AWS ECR Setup
```bash
cd aws-setup
chmod +x ecr-setup.sh
./ecr-setup.sh
```

### 2. Jenkins Configuration
- Install plugins: Docker Pipeline, AWS Steps, SSH Agent
- Add credentials: AWS credentials, EC2 SSH key
- Create new Pipeline job pointing to this repository

### 3. Update Configuration
Replace placeholders in Jenkinsfile:
- `<account-id>`: Your AWS account ID
- `<ec2-ip>`: Your EC2 instance IP

### 4. EC2 Setup
```bash
# Install Docker and AWS CLI on EC2
sudo yum update -y
sudo yum install -y docker aws-cli
sudo service docker start
sudo usermod -a -G docker ec2-user

# Copy deployment script
scp deploy-scripts/deploy-to-ec2.sh ec2-user@<ec2-ip>:~/
chmod +x ~/deploy-to-ec2.sh
```

## Pipeline Flow
1. Code push triggers Jenkins
2. Maven builds JAR file
3. Docker image created and pushed to ECR
4. EC2 pulls image and deploys container