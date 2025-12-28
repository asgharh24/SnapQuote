#!/bin/bash

# Sirkap Quote Tool - VPS Setup Script for Ubuntu 24.04
# This script installs Node.js, PM2, Nginx, MySQL, and Certbot.

set -e

echo "🚀 Starting VPS Setup for SnapQuote..."

# 1. Update System
sudo apt update && sudo apt upgrade -y

# 2. Install Essentials
sudo apt install -y curl git wget build-essential graphicsmagick

# 3. Install Node.js (v20 LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 4. Install PM2 (Process Manager)
sudo npm install -g pm2

# 5. Install Nginx
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# 6. Install MySQL Server
sudo apt install -y mysql-server
sudo systemctl enable mysql
sudo systemctl start mysql

# 7. Install Certbot (for SSL)
sudo apt install -y certbot python3-certbot-nginx

# 8. Setup Directory Structure
sudo mkdir -p /var/www/snapquote/staging
sudo mkdir -p /var/www/snapquote/live
sudo chown -R $USER:$USER /var/www/snapquote

echo "✅ Basic dependencies installed!"
echo "------------------------------------------------"
echo "Next Steps:"
echo "1. Run 'sudo mysql_secure_installation' to set your DB password."
echo "2. Create two databases: 'snapquote_staging' and 'snapquote_live'."
echo "3. We will now configure Nginx for staging and live subdomains."
