# 📧 DropOTP - Email OTP Rental Platform

> A production-ready, high-performance SaaS platform for temporary & dedicated email address rentals with instant OTP code extraction, real-time WebSockets, SMSBower-compatible REST API, multiple payment gateways, and comprehensive administration dashboard.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

## ⚡ Quick Start

Optimized to run seamlessly on a low-cost Ubuntu VPS (**2 vCore, 2GB RAM, 60GB SSD**) using Docker Compose.

---

## 🏗️ Architecture Overview

```
[Incoming Mails from External Services]
         │ (Port 25 MX)
         ▼
[Inbound SMTP Catch-All Server (smtp-server)]
         │ (MIME Parsing + Regex OTP Extraction)
         ▼
   [Redis Pub/Sub] ───> [Fastify/Express Backend API] <───> [PostgreSQL Database]
                                │ (Port 4000)
                                ├── [WebSockets (Socket.io)] ──> Instant Live OTP Push to UI
                                └── [SMSBower Compatible API] ──> Automated Bot Clients
                                └── [Double-Entry Ledger] ───> bKash / Nagad / Crypto Top-Up
                                ▲
                                │ (Reverse Proxy / Auto SSL)
                        [Caddy / Nginx Edge Proxy]
                                │
                        [Frontend Web Dashboard (React + Refine + Tailwind)]
```

---

## 📋 Features

1. **Inbound Mail Server (Port 25 Catch-All)**:
   - Accepts incoming emails for all configured domains in real-time.
   - Built-in multi-pattern regex engine for Google, Telegram, WhatsApp, Tinder, Facebook, Instagram, Microsoft, etc.
   - Extracts 4-8 digit OTP verification codes in milliseconds.
2. **SMSBower Standard API**:
   - `GET /api/mail/getActivation`: Rent an address for a specified service.
   - `GET /api/mail/getCode`: Retrieve received verification OTP.
   - `GET /api/mail/setStatus`: Settle (3), cancel (2), or extend wait (5).
   - `GET /api/mail/getPriceRests`: Dynamic pricing and inventory inquiry.
   - `GET /api/mail/getDomains`: List of active domains.
   - `GET /api/mail/getBalance`: Query user account balance.
3. **Double-Entry Wallet & Financial Ledger**:
   - Balance hold reservation upon ordering email.
   - Settle deduction only when OTP code is delivered.
   - Automatic refund upon cancellation or 20-minute expiration timeout.
4. **Integrated Multi-Payment Gateways**:
   - **bKash Tokenized Checkout**: Direct payment URL, token grant, payment execute, and auto-credit.
   - **Nagad Gateway**: Remote PGW checkout & instant callback verification.
   - **Paymento.io**: Global card & multi-currency IPN webhooks.
   - **Maxelpay.com**: Direct crypto deposit (USDT, BTC, ETH) IPN webhooks.
5. **Modern User & Admin Interface**:
   - SMSBower UI aesthetics (emerald theme, quick service bar, domain selector, live countdown timer, glowing OTP badges, one-click copy).
   - Admin panel for managing Domains (add, delete, public/private), Services, User balances (credit/debit adjustments), and Live Inbound Email stream.

---

## 🌐 Domain DNS Setup (Prerequisites)

Point your domain (e.g. `yourdomain.com`) to your server IP:

| Type | Host / Name | Value / Target | Priority | TTL |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` | `YOUR_SERVER_IP` | — | Automatic |
| **A** | `mail` | `YOUR_SERVER_IP` | — | Automatic |
| **MX** | `@` | `mail.yourdomain.com` | **10** | Automatic |

*(Note: In Cloudflare, make sure the MX record and `mail` A record have Proxy status set to **DNS Only / Gray Cloud** so that inbound SMTP port 25 is not blocked).*

---

## 🚀 Step-by-Step VPS Deployment Guide

### Step 1: Connect to your Ubuntu VPS via SSH
```bash
ssh root@YOUR_SERVER_IP
```

### Step 2: Configure 2GB Swap Memory (Crucial for 2GB RAM VPS)
Run the automated swap script to prevent any Out-Of-Memory (OOM) issues:
```bash
bash scripts/setup_swap.sh
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env` and configure your domain & secrets:
```bash
cp .env.example .env
nano .env
```
*(Configure `BASE_URL`, `ADMIN_PASSWORD`, and your payment gateway credentials).*

### Step 4: Open Required Firewall Ports
```bash
ufw allow 22/tcp
ufw allow 25/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### Step 5: Build and Start Containers
```bash
docker compose up -d --build
```

### Step 6: Verify System Health
```bash
# Check running containers
docker compose ps

# Check memory consumption (should remain under 1GB!)
free -m

# Watch backend logs in real time
docker compose logs -f backend
```

---

## 🧪 Testing Inbound Email & OTP Extraction

Once the server is running, you can test the inbound SMTP engine on Port 25 locally:

1. Create a rental session on the frontend dashboard or via API:
   ```bash
   curl "http://localhost:4000/api/mail/getActivation?api_key=YOUR_API_KEY&service=tg"
   # Output: {"status":1,"mail":"k8293js@mailnestpro.com","mailId":1}
   ```

2. Send a simulated verification email to Port 25:
   ```bash
   python3 scripts/test_inbound_smtp.py k8293js@mailnestpro.com tg
   ```

3. Watch the frontend dashboard: The OTP will appear **instantly in real time** without any page refresh via WebSockets!

---

## 🔐 Default Admin Access

- **Dashboard URL**: `http://YOUR_SERVER_IP` or `https://yourdomain.com`
- **Default Admin Email**: Configured in `.env` file (`ADMIN_EMAIL`)
- **Default Admin Password**: Configured in `.env` file (`ADMIN_PASSWORD`)

**⚠️ Important**: Change default credentials in production!

---

## 📚 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Vite** for fast development
- **Socket.io Client** for real-time updates
- **Axios** for API calls

### Backend
- **Node.js** with Express
- **Prisma ORM** with PostgreSQL
- **Redis** for caching & pub/sub
- **Socket.io** for WebSocket connections
- **SMTP Server** for inbound emails

### Infrastructure
- **Docker & Docker Compose**
- **Caddy** as reverse proxy with auto SSL
- **PostgreSQL** database
- **Redis** for caching

---

## 💳 Payment Gateway Integration

- **bKash** - Tokenized checkout (Bangladesh)
- **Nagad** - Payment gateway (Bangladesh)
- **Paymento.io** - Global card payments
- **Maxelpay.com** - Cryptocurrency payments (USDT, BTC, ETH)

---

## 📊 Key Features

### For Users
✅ Instant email rental with OTP extraction  
✅ Real-time WebSocket notifications  
✅ Multiple payment methods  
✅ Service-specific email addresses  
✅ Auto-refund on timeout  
✅ Transaction history  
✅ API key management  

### For Admins
✅ Complete user management  
✅ Service & domain configuration  
✅ Email pool management  
✅ Live email monitoring  
✅ Financial ledger tracking  
✅ Promo code generation  
✅ System overview dashboard  

---

## 🔧 Configuration

Edit the `.env` file with your settings:

```bash
# Server Configuration
BASE_URL=https://yourdomain.com
API_URL=https://yourdomain.com/api
JWT_SECRET=your_secure_random_secret_min_32_chars

# Admin Account
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your_secure_password

# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_DB=otp_platform

# Redis
REDIS_PASSWORD=your_redis_password

# SMTP
SMTP_DOMAIN=yourdomain.com

# Payment Gateways (Configure as needed)
BKASH_APP_KEY=your_bkash_key
NAGAD_MERCHANT_ID=your_nagad_id
PAYMENTO_API_KEY=your_paymento_key
MAXELPAY_API_KEY=your_maxelpay_key
```

---

## 📖 API Documentation

### SMSBower Compatible API Endpoints

#### Get Activation
```http
GET /api/mail/getActivation?api_key=YOUR_KEY&service=tg
```

#### Get OTP Code
```http
GET /api/mail/getCode?api_key=YOUR_KEY&mailId=123
```

#### Set Status
```http
GET /api/mail/setStatus?api_key=YOUR_KEY&mailId=123&status=3
```
Status codes: `2` (cancel), `3` (complete), `5` (extend)

#### Get Balance
```http
GET /api/mail/getBalance?api_key=YOUR_KEY
```

#### Get Domains
```http
GET /api/mail/getDomains?api_key=YOUR_KEY
```

#### Get Pricing
```http
GET /api/mail/getPriceRests?api_key=YOUR_KEY
```

---

## 🛡️ Security Best Practices

1. **Change default credentials** in `.env` file
2. **Use strong passwords** for database and Redis
3. **Enable firewall** and only allow necessary ports
4. **Use HTTPS** in production (Caddy auto-enables)
5. **Regularly update** Docker images and dependencies
6. **Backup database** regularly
7. **Monitor logs** for suspicious activities

---

## 📁 Project Structure

```
DropOTP/
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── middlewares/    # Auth & validation
│   │   └── db/             # Database connections
│   └── prisma/             # Database schema
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   └── context/        # React context
│   └── public/             # Static assets
├── caddy/                  # Reverse proxy config
├── scripts/                # Utility scripts
├── docker-compose.yml      # Docker orchestration
└── .env.example           # Environment template
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📝 License

This project is licensed under the MIT License.

---

## 🐛 Troubleshooting

### Container fails to start
```bash
# Check logs
docker compose logs backend
docker compose logs frontend

# Restart services
docker compose restart
```

### Database connection issues
```bash
# Check PostgreSQL container
docker compose ps postgres

# Reset database
docker compose down -v
docker compose up -d
```

### Email not receiving
1. Check MX records are configured correctly
2. Verify port 25 is open: `telnet YOUR_IP 25`
3. Check SMTP logs: `docker compose logs -f backend`

---

## 💬 Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions

---

**Made with ❤️ for the OTP rental community**
