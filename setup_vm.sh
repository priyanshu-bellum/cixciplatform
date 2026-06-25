#!/usr/bin/env bash
# CIXCI Platform — VM Auto-Setup & Deployment Script
# Recommended OS: Ubuntu 22.04 LTS
# Run as: sudo bash setup_vm.sh

set -e

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Starting CIXCI Platform VM Setup ===${NC}"

# 1. Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Error: Please run this script as root (sudo bash setup_vm.sh)${NC}"
  exit 1
fi

# 2. Update System Packages
echo -e "${YELLOW}[1/6] Updating system packages...${NC}"
apt-get update -y && apt-get upgrade -y

# 3. Install Docker & Docker Compose
echo -e "${YELLOW}[2/6] Installing Docker & Docker Compose...${NC}"
apt-get install -y apt-transport-https ca-certificates curl software-properties-common gnupg lsb-release

if ! command -v docker &> /dev/null; then
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi

systemctl enable docker
systemctl start docker
echo -e "${GREEN}Docker installed successfully.${NC}"

# 4. Install Nginx & Certbot
echo -e "${YELLOW}[3/6] Installing Nginx & Certbot...${NC}"
apt-get install -y nginx certbot python3-certbot-nginx
systemctl enable nginx
systemctl start nginx
echo -e "${GREEN}Nginx and Certbot installed successfully.${NC}"

# 5. Set up Directory Structure
echo -e "${YELLOW}[4/6] Setting up project folders...${NC}"
mkdir -p /srv/cixci/test
mkdir -p /srv/cixci/live

# Copy current directory contents to test and live directories (excluding .git)
# Assumes this script is run from the root of the cloned repo on the VM
REPO_ROOT=$(pwd)
echo -e "Copying repository files from ${REPO_ROOT} to deployment environments..."

rsync -av --exclude='.git' --exclude='node_modules' --exclude='backend/venv' "${REPO_ROOT}/" /srv/cixci/test/
rsync -av --exclude='.git' --exclude='node_modules' --exclude='backend/venv' "${REPO_ROOT}/" /srv/cixci/live/

# Fix permissions
chown -R www-data:www-data /srv/cixci
chmod -R 755 /srv/cixci

echo -e "${GREEN}Project folders populated successfully.${NC}"

# 6. Configure Nginx Reverse Proxy
echo -e "${YELLOW}[5/6] Configuring Nginx reverse proxy...${NC}"
if [ -f "nginx/cixci.conf" ]; then
    cp nginx/cixci.conf /etc/nginx/sites-available/cixci
    ln -sf /etc/nginx/sites-available/cixci /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test Nginx and reload
    nginx -t
    systemctl reload nginx
    echo -e "${GREEN}Nginx reverse proxy configured and reloaded.${NC}"
else
    echo -e "${RED}Warning: nginx/cixci.conf not found. Skipping Nginx configuration.${NC}"
fi

# 7. Next Steps Guidelines
echo -e "${GREEN}=== Setup Complete! ===${NC}"
echo -e "${YELLOW}Please complete the following manual steps to finish deployment:${NC}"
echo -e ""
echo -e "1. Create your production environment files:"
echo -e "   - Edit ${GREEN}/srv/cixci/test/test.env${NC} (rename/copy from test.env.example) and fill in your Cloud SQL credentials."
echo -e "   - Edit ${GREEN}/srv/cixci/live/live.env${NC} (rename/copy from live.env.example) and fill in your Cloud SQL credentials."
echo -e ""
echo -e "2. Build & Launch the Test Environment:"
echo -e "   ${GREEN}cd /srv/cixci/test && docker compose -f docker-compose.prod.yml --env-file test.env up -d --build${NC}"
echo -e ""
echo -e "3. Build & Launch the Live Environment:"
echo -e "   ${GREEN}cd /srv/cixci/live && docker compose -f docker-compose.prod.yml --env-file live.env up -d --build${NC}"
echo -e ""
echo -e "4. Run migrations and collect static files for both environments:"
echo -e "   - Test: ${GREEN}docker exec -it cixci_backend_test python manage.py migrate --noinput${NC}"
echo -e "   - Test: ${GREEN}docker exec -it cixci_backend_test python manage.py collectstatic --noinput${NC}"
echo -e "   - Live: ${GREEN}docker exec -it cixci_backend_live python manage.py migrate --noinput${NC}"
echo -e "   - Live: ${GREEN}docker exec -it cixci_backend_live python manage.py collectstatic --noinput${NC}"
echo -e ""
echo -e "5. Configure HTTPS (SSL) via Certbot (ensure DNS A Records are pointing to this VM's IP first!):"
echo -e "   ${GREEN}sudo certbot --nginx -d testnew.cixci.com -d livenew.cixci.com${NC}"
echo -e ""
