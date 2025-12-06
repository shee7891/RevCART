# RevCart Deployment Guide

## Prerequisites
- AWS Account with EC2 access
- Docker Hub account (you have: amanpardeshi01)
- Git repository (already set up)
- Jenkins running locally (jenkins.war)

## Current Status ✅
- ✅ Code pushed to Git
- ✅ Jenkins pipeline configured
- ✅ Docker images building successfully
- ✅ Images pushed to Docker Hub

## Issues Fixed
1. **Backend JAR not executable** - Fixed pom.xml spring-boot-maven-plugin
2. **Frontend routing** - Added nginx.conf for Angular SPA routing
3. **Database connectivity** - Added MySQL and MongoDB to docker-compose
4. **Container networking** - Fixed service names and dependencies

## Local Testing (Before EC2 Deployment)

### Step 1: Rebuild Backend JAR
```bash
cd Backend
mvn clean package
```

### Step 2: Test with Docker Compose
```bash
cd d:\RevCart
docker-compose down -v
docker-compose up --build
```

Access:
- Frontend: http://localhost:4200
- Backend: http://localhost:8080
- Backend Health: http://localhost:8080/actuator/health

### Step 3: Run Jenkins Pipeline
1. Open Jenkins: http://localhost:8080 (or your Jenkins port)
2. Trigger the pipeline
3. Verify images pushed to Docker Hub

## EC2 Deployment Steps

### Step 1: Launch EC2 Instance
1. Go to AWS Console → EC2 → Launch Instance
2. Choose **Ubuntu Server 22.04 LTS**
3. Instance type: **t2.medium** (minimum for your app)
4. Key pair: Create new or use existing
5. Security Group - Allow:
   - SSH (22) - Your IP
   - HTTP (80) - Anywhere
   - Custom TCP (8080) - Anywhere
   - Custom TCP (4200) - Anywhere
6. Storage: 20 GB minimum
7. Launch instance

### Step 2: Connect to EC2
```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

### Step 3: Install Docker on EC2
```bash
# Update packages
sudo apt update

# Install Docker
sudo apt install -y docker.io

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again for group changes
exit
```

### Step 4: Deploy Application on EC2

**Option A: Using Docker Compose (Recommended)**
```bash
# SSH back to EC2
ssh -i your-key.pem ubuntu@your-ec2-public-ip

# Create project directory
mkdir -p ~/revcart
cd ~/revcart

# Create docker-compose.yml
nano docker-compose.yml
```

Paste this content:
```yaml
version: "3.8"

services:
  mysql:
    image: mysql:8.0
    container_name: revcart-mysql
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: revcart
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    restart: unless-stopped

  mongodb:
    image: mongo:7
    container_name: revcart-mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

  backend:
    image: amanpardeshi01/revcart-backend:latest
    container_name: revcart-backend
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: "jdbc:mysql://mysql:3306/revcart?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true"
      SPRING_DATASOURCE_USERNAME: "root"
      SPRING_DATASOURCE_PASSWORD: "root"
      SPRING_DATA_MONGODB_URI: "mongodb://mongodb:27017/revcart_logs"
    depends_on:
      - mysql
      - mongodb
    restart: unless-stopped

  frontend:
    image: amanpardeshi01/revcart-frontend:latest
    container_name: revcart-frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  mysql_data:
  mongo_data:
```

```bash
# Start services
docker-compose up -d

# Check logs
docker-compose logs -f

# Check status
docker-compose ps
```

**Option B: Using Docker Run Commands**
```bash
# Create network
docker network create revcart-network

# Run MySQL
docker run -d \
  --name revcart-mysql \
  --network revcart-network \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=revcart \
  -p 3306:3306 \
  -v mysql_data:/var/lib/mysql \
  --restart unless-stopped \
  mysql:8.0

# Run MongoDB
docker run -d \
  --name revcart-mongodb \
  --network revcart-network \
  -p 27017:27017 \
  -v mongo_data:/data/db \
  --restart unless-stopped \
  mongo:7

# Run Backend
docker run -d \
  --name revcart-backend \
  --network revcart-network \
  -e SPRING_DATASOURCE_URL="jdbc:mysql://revcart-mysql:3306/revcart?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true" \
  -e SPRING_DATASOURCE_USERNAME="root" \
  -e SPRING_DATASOURCE_PASSWORD="root" \
  -e SPRING_DATA_MONGODB_URI="mongodb://revcart-mongodb:27017/revcart_logs" \
  -p 8080:8080 \
  --restart unless-stopped \
  amanpardeshi01/revcart-backend:latest

# Run Frontend
docker run -d \
  --name revcart-frontend \
  --network revcart-network \
  -p 80:80 \
  --restart unless-stopped \
  amanpardeshi01/revcart-frontend:latest
```

### Step 5: Verify Deployment
```bash
# Check running containers
docker ps

# Check backend logs
docker logs revcart-backend

# Check frontend logs
docker logs revcart-frontend

# Test backend health
curl http://localhost:8080/actuator/health
```

Access your application:
- Frontend: http://your-ec2-public-ip
- Backend API: http://your-ec2-public-ip:8080

### Step 6: Import Database (if needed)
```bash
# Copy SQL file to EC2
scp -i your-key.pem d:\RevCart\RevCart.sql ubuntu@your-ec2-public-ip:~/

# Import to MySQL
docker exec -i revcart-mysql mysql -uroot -proot revcart < ~/RevCart.sql
```

## Continuous Deployment (CD)

### Update Application
When you push new code:
1. Jenkins builds and pushes new images to Docker Hub
2. On EC2, pull and restart:
```bash
cd ~/revcart
docker-compose pull
docker-compose up -d
```

### Auto-update Script (Optional)
Create `update.sh` on EC2:
```bash
#!/bin/bash
cd ~/revcart
docker-compose pull
docker-compose up -d
echo "Application updated at $(date)"
```

Make executable: `chmod +x update.sh`

## Troubleshooting

### Backend not starting
```bash
docker logs revcart-backend
# Check database connectivity
docker exec -it revcart-backend ping mysql
```

### Frontend not loading
```bash
docker logs revcart-frontend
# Check nginx config
docker exec -it revcart-frontend cat /etc/nginx/conf.d/default.conf
```

### Database connection issues
```bash
# Check MySQL
docker exec -it revcart-mysql mysql -uroot -proot -e "SHOW DATABASES;"

# Check MongoDB
docker exec -it revcart-mongodb mongosh --eval "db.adminCommand('ping')"
```

### Port already in use
```bash
# Find process using port
sudo lsof -i :8080
# Kill process
sudo kill -9 <PID>
```

## Security Recommendations (Production)

1. **Change default passwords** in docker-compose.yml
2. **Use environment files** for secrets
3. **Enable HTTPS** with Let's Encrypt
4. **Restrict Security Group** rules
5. **Use AWS RDS** for MySQL (managed database)
6. **Use AWS DocumentDB** for MongoDB
7. **Set up CloudWatch** for monitoring
8. **Enable backup** for volumes

## Cost Optimization

- Use **t2.micro** for testing (free tier)
- Use **t2.medium** for production
- Stop instance when not in use
- Use **Elastic IP** to keep same IP
- Consider **AWS Lightsail** for simpler setup

## Next Steps

1. ✅ Fix local Docker issues (DONE)
2. ⏳ Test locally with docker-compose
3. ⏳ Launch EC2 instance
4. ⏳ Deploy to EC2
5. ⏳ Set up domain name (optional)
6. ⏳ Configure HTTPS (optional)
