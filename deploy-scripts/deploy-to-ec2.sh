#!/bin/bash

# Configuration
ECR_REPO="<account-id>.dkr.ecr.us-east-1.amazonaws.com/revcart"
IMAGE_TAG="$1"
AWS_REGION="us-east-1"

if [ -z "$IMAGE_TAG" ]; then
    echo "Usage: $0 <image-tag>"
    exit 1
fi

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO

# Pull latest image
docker pull $ECR_REPO:$IMAGE_TAG

# Stop and remove existing container
docker stop revcart 2>/dev/null || true
docker rm revcart 2>/dev/null || true

# Run new container
docker run -d \
    --name revcart \
    -p 8080:8080 \
    --restart unless-stopped \
    $ECR_REPO:$IMAGE_TAG

echo "Deployment completed successfully"