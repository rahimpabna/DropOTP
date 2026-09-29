#!/bin/bash
# ==============================================================================
# Production Deployment Automation Script for Ubuntu VPS
# ==============================================================================
set -e

echo "=========================================================="
echo " Starting Deployment for SaaS Email & Instant OTP Cloud"
echo "=========================================================="

# 1. Configure 2GB Swap Memory (Critical for 2GB RAM VPS)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
if [ -f "$SCRIPT_DIR/setup_swap.sh" ]; then
    echo "[*] Configuring Swap space..."
    bash "$SCRIPT_DIR/setup_swap.sh"
fi

# 2. Check and Install Docker / Docker Compose if missing
if ! command -v docker &> /dev/null; then
    echo "[*] Docker not found. Installing Docker CE..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
fi

# 3. Configure VPS Firewall for Port 25 (SMTP), 80 (HTTP), and 443 (HTTPS)
echo "[*] Opening required ports in UFW firewall (25, 80, 443)..."
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp || true
    ufw allow 25/tcp || true
    ufw allow 80/tcp || true
    ufw allow 443/tcp || true
    echo "y" | ufw enable || true
fi

# 4. Check Environment File
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
    echo "[!] .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "[!] IMPORTANT: Edit .env and configure your Domain and Payment Gateway API Keys!"
fi

# 5. Build and Launch Containers
echo "[*] Building and starting Docker containers with resource limits..."
docker compose down --remove-orphans || true
docker compose up -d --build

echo ""
echo "=========================================================="
echo " [✓] Deployment Complete!"
echo "=========================================================="
echo "Check running containers with: docker compose ps"
echo "View live logs with: docker compose logs -f backend"
echo "=========================================================="
