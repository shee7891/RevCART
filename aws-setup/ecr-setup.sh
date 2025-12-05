#!/bin/bash

# Create ECR repository
aws ecr create-repository --repository-name revcart --region us-east-1

# Get repository URI
aws ecr describe-repositories --repository-names revcart --region us-east-1 --query 'repositories[0].repositoryUri' --output text