# Issues Fixed & Next Steps

## Problems Found ❌

1. **Backend JAR not executable**
   - Missing version in spring-boot-maven-plugin
   - Missing repackage goal

2. **Frontend routing broken**
   - No nginx configuration for Angular SPA
   - API proxy not configured

3. **Database not available**
   - MySQL and MongoDB not in docker-compose
   - Containers trying to connect to host.docker.internal

4. **Jenkins images not running**
   - Built images but no database to connect to
   - Missing proper container networking

## Fixes Applied ✅

### 1. Backend/pom.xml
- Added version to spring-boot-maven-plugin
- Added repackage goal for executable JAR

### 2. Frontend/nginx.conf (NEW FILE)
- Added Angular SPA routing (try_files)
- Added API proxy to backend
- Proper server configuration

### 3. Frontend/Dockerfile.prod
- Added nginx.conf copy
- Fixed optional file copy with || true

### 4. docker-compose.yml
- Added MySQL 8.0 service
- Added MongoDB 7 service
- Fixed backend environment variables
- Changed frontend port to 80
- Added proper service dependencies
- Added persistent volumes

## What You Need to Do Now

### Step 1: Test Locally (IMPORTANT!)
```bash
# Run this script
test-local.bat
```

This will:
1. Rebuild backend JAR with fixes
2. Start all services (MySQL, MongoDB, Backend, Frontend)
3. Show you the URLs to test

**Test these URLs:**
- http://localhost:4200 (Frontend)
- http://localhost:8080/actuator/health (Backend health)

### Step 2: Push Changes to Git
```bash
git add .
git commit -m "Fix Docker deployment issues"
git push origin main
```

### Step 3: Run Jenkins Pipeline
1. Open Jenkins (http://localhost:8080 or your Jenkins port)
2. Run your pipeline
3. Verify "BUILD SUCCESS"
4. Check Docker Hub for new images

### Step 4: Deploy to EC2

#### A. Launch EC2 Instance
1. Go to AWS Console → EC2
2. Click "Launch Instance"
3. Choose: **Ubuntu Server 22.04 LTS**
4. Instance type: **t2.medium** (or t2.micro for testing)
5. Create/select key pair (download .pem file)
6. Security Group - Add rules:
   - SSH (22) - Your IP
   - HTTP (80) - 0.0.0.0/0
   - Custom TCP (8080) - 0.0.0.0/0
7. Storage: 20 GB
8. Launch!

#### B. Install Docker on EC2
```bash
# Connect to EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Install Docker
sudo apt update
sudo apt install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again
exit
```

#### C. Deploy Application
```bash
# Connect again
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Copy deployment script (from your local machine)
# On your Windows machine:
scp -i your-key.pem d:\RevCart\ec2-deploy.sh ubuntu@YOUR_EC2_IP:~/

# On EC2, run deployment
chmod +x ec2-deploy.sh
./ec2-deploy.sh
```

#### D. Access Your Application
- Frontend: http://YOUR_EC2_IP
- Backend: http://YOUR_EC2_IP:8080

## Quick Commands Reference

### Local Development
```bash
# Start everything
docker-compose up -d

# View logs
docker-compose logs -f

# Stop everything
docker-compose down

# Rebuild and restart
docker-compose up --build -d
```

### EC2 Management
```bash
# Update to latest images
cd ~/revcart
docker-compose pull
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart services
docker-compose restart

# Check status
docker-compose ps
```

### Troubleshooting
```bash
# Check backend logs
docker logs revcart-backend

# Check if backend can reach MySQL
docker exec -it revcart-backend ping mysql

# Access MySQL
docker exec -it revcart-mysql mysql -uroot -proot revcart

# Check MongoDB
docker exec -it revcart-mongodb mongosh
```

## Files Created/Modified

### Modified:
- ✅ Backend/pom.xml
- ✅ Frontend/Dockerfile.prod
- ✅ docker-compose.yml

### Created:
- ✅ Frontend/nginx.conf
- ✅ DEPLOYMENT_GUIDE.md (detailed guide)
- ✅ FIXES_APPLIED.md (this file)
- ✅ test-local.bat (Windows testing script)
- ✅ ec2-deploy.sh (EC2 deployment script)

## What to Expect

### After Local Test:
- All 4 containers running (mysql, mongodb, backend, frontend)
- Frontend accessible at http://localhost:4200
- Backend health check working at http://localhost:8080/actuator/health

### After EC2 Deployment:
- Application accessible from anywhere via EC2 public IP
- All services running in Docker containers
- Automatic restart on failure
- Persistent data in Docker volumes

## Need Help?

### If backend fails to start:
```bash
docker logs revcart-backend
# Look for database connection errors
```

### If frontend shows blank page:
```bash
docker logs revcart-frontend
# Check nginx errors
```

### If you can't connect to EC2:
- Check Security Group rules (port 80, 8080 open)
- Check EC2 instance is running
- Use correct public IP (not private IP)

## Important Notes

1. **Database passwords**: Change "root" password in production
2. **Email credentials**: Your Gmail password is exposed in application.yml - use environment variables
3. **API keys**: Razorpay and Stripe keys should be in environment variables
4. **Security**: Add HTTPS before going to production
5. **Costs**: EC2 t2.medium costs ~$0.0464/hour (~$34/month)

## Next Steps After Deployment

1. Set up domain name (optional)
2. Configure HTTPS with Let's Encrypt
3. Set up monitoring (CloudWatch)
4. Configure backups
5. Set up CI/CD for automatic deployment
6. Move to managed databases (RDS, DocumentDB)
