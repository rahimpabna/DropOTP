#!/bin/bash
# ==============================================================================
# Setup 2GB Swap Space for 2GB RAM VPS (Ubuntu 22.04 / 20.04)
# ==============================================================================
set -e

echo "[*] Checking existing swap..."
swapon --show

if [ $(swapon --show | wc -l) -gt 0 ]; then
    echo "[!] Swap already exists. Skipping creation."
else
    echo "[*] Creating 2GB swap file at /swapfile..."
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    
    # Make swap permanent across reboots
    if ! grep -q '/swapfile' /etc/fstab; then
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
    
    # Optimize swappiness for low-RAM server (use RAM first, swap as backup)
    sysctl vm.swappiness=20
    sysctl vm.vfs_cache_pressure=50
    
    if ! grep -q 'vm.swappiness' /etc/sysctl.conf; then
        echo 'vm.swappiness=20' >> /etc/sysctl.conf
        echo 'vm.vfs_cache_pressure=50' >> /etc/sysctl.conf
    fi
    
    echo "[OK] 2GB Swap space successfully created and activated!"
fi

echo "[*] Current Memory & Swap Status:"
free -h
