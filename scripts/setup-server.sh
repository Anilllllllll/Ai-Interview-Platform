#!/bin/bash
# ============================================
# EC2 Server Setup Script
# Run this ONCE on a fresh Ubuntu EC2 instance
# ============================================
# USAGE: After SSH'ing into your EC2, run:
#   chmod +x setup-server.sh
#   ./setup-server.sh
#
# This script installs Docker, Docker Compose,
# and prepares the server to run your app.

set -e  # Exit on any error

echo "=========================================="
echo "  AI Interview App - Server Setup"
echo "=========================================="

# 1. UPDATE SYSTEM PACKAGES
# Always update first on a fresh server to get security patches
echo "[1/5] Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# 2. INSTALL DOCKER
# We install Docker from Docker's official repository (not Ubuntu's)
# Ubuntu's default Docker package is often outdated
echo "[2/5] Installing Docker..."

# Install prerequisites for adding Docker's repo
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key (verifies package authenticity)
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Add Docker's repository to apt sources
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine + Docker Compose plugin
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 3. ADD USER TO DOCKER GROUP
# Without this, you need 'sudo' before every Docker command
# The 'ubuntu' user is the default on AWS Ubuntu instances
echo "[3/5] Adding user to Docker group..."
sudo usermod -aG docker $USER

# 4. ENABLE DOCKER TO START ON BOOT
# If your EC2 instance restarts, Docker starts automatically
echo "[4/5] Enabling Docker on boot..."
sudo systemctl enable docker
sudo systemctl start docker

# 5. CREATE APP DIRECTORY
echo "[5/5] Creating app directory..."
mkdir -p ~/ai-interview-app

echo ""
echo "=========================================="
echo "  ✅ Server setup complete!"
echo "=========================================="
echo ""
echo "IMPORTANT: Log out and log back in for Docker group to take effect:"
echo "  exit"
echo "  ssh -i your-key.pem ubuntu@your-ec2-ip"
echo ""
echo "Then verify Docker works (without sudo):"
echo "  docker --version"
echo "  docker compose version"
echo ""
echo "Next: Clone your repo and deploy!"
echo "  cd ~/ai-interview-app"
echo "  git clone https://github.com/Anilllllllll/Ai-Interview-Platform.git ."
echo "  # Create .env.docker with production values"
echo "  # Then run: docker compose up --build -d"
