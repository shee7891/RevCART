# RevCart Deployment Checklist

## Phase 1: Local Testing ✓

- [ ] Run `test-local.bat` script
- [ ] Wait for all containers to start (30 seconds)
- [ ] Open http://localhost:4200 - Frontend should load
- [ ] Open http://localhost:8080/actuator/health - Should return {"status":"UP"}
- [ ] Test login/signup functionality
- [ ] Check backend logs: `docker logs revcart-backend`
- [ ] Check frontend logs: `docker logs revcart-frontend`
- [ ] If everything works, proceed to Phase 2

**If issues occur:**
```bash
docker-compose down -v
docker-compose up --build
docker-compose logs -f
```

## Phase 2: Git & Jenkins ✓

- [ ] Commit all changes:
  ```bash
  git add .
  git commit -m "Fix Docker deployment with database services"
  git push origin main
  ```
- [ ] Open Jenkins (your local Jenkins)
- [ ] Trigger pipeline build
- [ ] Wait for "BUILD SUCCESS"
- [ ] Verify images on Docker Hub:
  - https://hub.docker.com/r/amanpardeshi01/revcart-backend
  - https://hub.docker.com/r/amanpardeshi01/revcart-frontend
- [ ] Check image tags (should have :latest and :BUILD_NUMBER)

## Phase 3: AWS EC2 Setup ✓

### 3.1 Launch EC2 Instance
- [ ] Login to AWS Console
- [ ] Go to EC2 Dashboard
- [ ] Click "Launch Instance"
- [ ] Name: `revcart-app`
- [ ] AMI: **Ubuntu Server 22.04 LTS** (Free tier eligible)
- [ ] Instance type: **t2.medium** (or t2.micro for testing)
- [ ] Key pair: Create new or select existing
  - [ ] Download .pem file if new
  - [ ] Save in safe location (e.g., C:\Users\YourName\.ssh\)
- [ ] Network settings:
  - [ ] Create security group: `revcart-sg`
  - [ ] Add rule: SSH (22) - My IP
  - [ ] Add rule: HTTP (80) - Anywhere (0.0.0.0/0)
  - [ ] Add rule: Custom TCP (8080) - Anywhere (0.0.0.0/0)
  - [ ] Add rule: Custom TCP (4200) - Anywhere (0.0.0.0/0) [optional]
- [ ] Storage: 20 GB gp3
- [ ] Click "Launch Instance"
- [ ] Wait for instance state: "Running"
- [ ] Note down Public IPv4 address: `___________________`

### 3.2 Connect to EC2
- [ ] Open PowerShell/CMD
- [ ] Navigate to .pem file location
- [ ] Set permissions (Windows):
  ```powershell
  icacls your-key.pem /inheritance:r
  icacls your-key.pem /grant:r "%username%:R"
  ```
- [ ] Connect:
  ```bash
  ssh -i your-key.pem ubuntu@YOUR_EC2_IP
  ```
- [ ] Type "yes" when prompted
- [ ] You should see Ubuntu welcome message

### 3.3 Install Docker on EC2
Copy and paste these commands one by one:

- [ ] Update packages:
  ```bash
  sudo apt update
  ```
- [ ] Install Docker:
  ```bash
  sudo apt install -y docker.io
  ```
- [ ] Start Docker:
  ```bash
  sudo systemctl start docker
  sudo systemctl enable docker
  ```
- [ ] Add user to docker group:
  ```bash
  sudo usermod -aG docker ubuntu
  ```
- [ ] Install Docker Compose:
  ```bash
  sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
  ```
- [ ] Verify installations:
  ```bash
  docker --version
  docker-compose --version
  ```
- [ ] Logout and login again:
  ```bash
  exit
  ssh -i your-key.pem ubuntu@YOUR_EC2_IP
  ```

## Phase 4: Deploy Application ✓

### 4.1 Transfer Deployment Script
On your Windows machine:
- [ ] Open new PowerShell/CMD
- [ ] Navigate to RevCart folder:
  ```bash
  cd d:\RevCart
  ```
- [ ] Copy script to EC2:
  ```bash
  scp -i C:\path\to\your-key.pem ec2-deploy.sh ubuntu@YOUR_EC2_IP:~/
  ```

### 4.2 Run Deployment
On EC2 (SSH session):
- [ ] Make script executable:
  ```bash
  chmod +x ec2-deploy.sh
  ```
- [ ] Run deployment:
  ```bash
  ./ec2-deploy.sh
  ```
- [ ] Wait for completion (2-3 minutes)
- [ ] Check output for any errors

### 4.3 Verify Deployment
- [ ] Check running containers:
  ```bash
  docker ps
  ```
  Should show 4 containers: mysql, mongodb, backend, frontend

- [ ] Check backend logs:
  ```bash
  docker logs revcart-backend
  ```
  Look for: "Started RevCartApplication"

- [ ] Check frontend logs:
  ```bash
  docker logs revcart-frontend
  ```
  Should be minimal (nginx)

- [ ] Test backend health:
  ```bash
  curl http://localhost:8080/actuator/health
  ```
  Should return: {"status":"UP"}

## Phase 5: Access Application ✓

- [ ] Open browser
- [ ] Go to: `http://YOUR_EC2_IP`
- [ ] Frontend should load
- [ ] Test backend API: `http://YOUR_EC2_IP:8080/actuator/health`
- [ ] Try to register/login
- [ ] Test main features

**Your Application URLs:**
- Frontend: http://___________________
- Backend: http://___________________:8080

## Phase 6: Import Database (Optional) ✓

If you have existing data in RevCart.sql:

- [ ] Copy SQL file to EC2:
  ```bash
  scp -i your-key.pem d:\RevCart\RevCart.sql ubuntu@YOUR_EC2_IP:~/
  ```
- [ ] On EC2, import to MySQL:
  ```bash
  docker exec -i revcart-mysql mysql -uroot -proot revcart < ~/RevCart.sql
  ```
- [ ] Verify import:
  ```bash
  docker exec -it revcart-mysql mysql -uroot -proot -e "USE revcart; SHOW TABLES;"
  ```

## Phase 7: Post-Deployment ✓

- [ ] Test all major features
- [ ] Check logs for errors
- [ ] Verify data persistence (restart containers)
- [ ] Document your EC2 IP address
- [ ] Share application URL with team/users

## Troubleshooting Checklist

### If backend container keeps restarting:
- [ ] Check logs: `docker logs revcart-backend`
- [ ] Verify MySQL is running: `docker ps | grep mysql`
- [ ] Check MySQL connection: `docker exec -it revcart-backend ping mysql`
- [ ] Verify environment variables: `docker inspect revcart-backend`

### If frontend shows 502 Bad Gateway:
- [ ] Check backend is running: `docker ps | grep backend`
- [ ] Check backend health: `curl http://localhost:8080/actuator/health`
- [ ] Check nginx config: `docker exec -it revcart-frontend cat /etc/nginx/conf.d/default.conf`

### If can't access from browser:
- [ ] Verify EC2 instance is running
- [ ] Check Security Group rules (port 80, 8080 open)
- [ ] Use Public IP (not Private IP)
- [ ] Try: `http://IP` not `https://IP`
- [ ] Check EC2 instance status checks

### If database connection fails:
- [ ] Check MySQL logs: `docker logs revcart-mysql`
- [ ] Check MongoDB logs: `docker logs revcart-mongodb`
- [ ] Verify network: `docker network ls`
- [ ] Restart all: `cd ~/revcart && docker-compose restart`

## Maintenance Commands

### View logs:
```bash
cd ~/revcart
docker-compose logs -f          # All services
docker-compose logs -f backend  # Backend only
docker-compose logs -f frontend # Frontend only
```

### Restart services:
```bash
cd ~/revcart
docker-compose restart          # All services
docker-compose restart backend  # Backend only
```

### Update to latest images:
```bash
cd ~/revcart
docker-compose pull
docker-compose up -d
```

### Stop everything:
```bash
cd ~/revcart
docker-compose down
```

### Start everything:
```bash
cd ~/revcart
docker-compose up -d
```

### Check disk space:
```bash
df -h
docker system df
```

### Clean up old images:
```bash
docker system prune -a
```

## Success Criteria ✓

Your deployment is successful when:
- [ ] All 4 containers are running
- [ ] Frontend loads in browser
- [ ] Backend health check returns UP
- [ ] Can register new user
- [ ] Can login
- [ ] Can browse products
- [ ] No errors in logs

## Important Notes

1. **Save your EC2 IP**: Write it down, you'll need it
2. **Save your .pem file**: Keep it safe, you can't download again
3. **Security Group**: Make sure ports 80 and 8080 are open
4. **Costs**: EC2 t2.medium costs ~$34/month, t2.micro is free tier
5. **Stop instance**: When not using, stop EC2 to save costs
6. **Elastic IP**: Consider attaching Elastic IP to keep same IP

## Next Steps After Successful Deployment

- [ ] Set up domain name (optional)
- [ ] Configure HTTPS with Let's Encrypt
- [ ] Set up monitoring
- [ ] Configure automated backups
- [ ] Set up CI/CD for auto-deployment
- [ ] Move secrets to environment variables
- [ ] Consider managed databases (RDS)

## Support

If you get stuck:
1. Check logs: `docker-compose logs -f`
2. Check this checklist's troubleshooting section
3. Review DEPLOYMENT_GUIDE.md for detailed steps
4. Check AWS EC2 console for instance status
5. Verify Security Group rules

---

**Good luck with your deployment! 🚀**
