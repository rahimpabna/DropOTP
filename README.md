# DropOTP — Enterprise Cloud OTP & Email Rental SaaS Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Docker Compose](https://img.shields.io/badge/Docker-Compose%20v2-blue.svg)](https://docs.docker.com/compose/)
[![Node.js](https://img.shields.io/badge/Node.js-v20%20LTS-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18%20%2B%20Vite-cyan.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)

A full-stack, enterprise-grade SaaS platform for temporary & dedicated email address rentals with instant OTP/verification link extraction, real-time WebSockets, SMSBower-compatible REST API, multi-gateway payments, an automated outbound mail engine, and complete administrative control.

Built for seamless deployment on standard Ubuntu VPS servers (**2 vCore, 2GB RAM, 60GB SSD**) using Docker Compose.

---

## 📑 Table of Contents
1. [Architecture & Flow](#-architecture--flow)
2. [Core Feature Breakdown](#-core-feature-breakdown)
3. [Technology Stack](#-technology-stack)
4. [Folder Structure](#-folder-structure)
5. [Environment Variables Reference](#-environment-variables-reference)
6. [Step-by-Step Installation & Deployment](#-step-by-step-installation--deployment)
7. [Inbound & Outbound Mail Engine Configuration](#-inbound--outbound-mail-engine-configuration)
8. [Payment Gateway Setup](#-payment-gateway-setup)
9. [API Documentation (SMSBower & REST)](#-api-documentation)
10. [Automated Email Notification System](#-automated-email-notification-system)
11. [Troubleshooting & Maintenance](#-troubleshooting--maintenance)

---

## 🏗️ Architecture & Flow

```
[External Services (Google, Telegram, WhatsApp, etc.)]
                      │ (Port 25 MX / IMAP Pool)
                      ▼
        [Inbound Mail Engine (Port 25 Catch-All)]
                      │ (Regex OTP & Activation Link Extraction)
                      ▼
  [Redis Pub/Sub] ──> [Node.js Fastify/Express API] <──> [PostgreSQL DB]
                             │ (Port 4000)
                             ├── [Socket.io WebSockets] ────> Instant Realtime OTP Delivery
                             ├── [Double-Entry Ledger] ─────> Hold Balance / Refund / Settle
                             ├── [Outbound Mail Engine] ────> Direct MX Port 25 / Brevo / Resend / SMTP
                             ├── [SMSBower REST API] ───────> Bot Automation Clients
                             ▲
                             │ (SSL & Reverse Proxy)
                      [Caddy Web Server]
                             │
                      [React + Vite Frontend]
```

---

## 🌟 Core Feature Breakdown

### 1. Temporary & Dedicated Email Rental
- **Service-Based Rentals**: Rent numbers/emails for Telegram, WhatsApp, Google, Tinder, TikTok, Microsoft, OpenAI, etc.
- **Dynamic Time Durations**: 20 Minutes, 1 Hour, or 24 Hours.
- **Smart Countdown & Auto-Decision**:
  - If at least one OTP code is received before expiration: transitions to **COMPLETED** (Paid).
  - If no code is received before countdown reaches zero: transitions to **CANCELLED** and funds are **instantly refunded** back to user's wallet.
- **Live Activations UI**: Live ticking countdowns, one-click copy, and automatic UI tab switching without page reload.

### 2. Inbound Email Extraction (Zero Latency)
- **Port 25 Catch-All Server**: Listens on Port 25 for incoming mails to any active custom domain.
- **Multi-Engine OTP Parser**: Detects 4, 6, and 8 digit verification codes and activation links with regex fallback across 50+ languages and patterns.
- **IMAP Pool Sync**: Supports external email mailbox pools (Outlook, Yahoo, custom IMAP) with automated health checking and concurrent polling.

### 3. Outbound Mail Engine & Webmail Suite
- **Direct MX Port 25 Delivery**: Dispatches directly to destination mail exchangers using opportunistic STARTTLS.
- **Custom Provider Fallback**: Supports Brevo API, Resend API, and custom authenticated SMTP.
- **Admin Webmail & Mass Campaign**: Compose rich HTML emails, upload attachments, and broadcast bulk marketing newsletters to all active users.

### 4. Double-Entry Ledger & Wallet
- Safe balance reservation (`reservedBalance`) when ordering.
- Funds are only deducted when a valid OTP is delivered to the user.
- Full ledger audit log (`LedgerEntry`) tracking credits, debits, holds, and refunds.

### 5. Multi-Channel Payment Gateways
- **bKash Tokenized Checkout**: Automatic token grant, checkout URL redirect, and instant BDT-to-USD wallet credit.
- **Nagad PGW**: Remote merchant callback verification.
- **Paymento.io**: Card & international crypto gateway with automated IPN webhooks.
- **Maxelpay.com**: Direct crypto deposit (USDT, BTC, ETH) with instant auto-redirect and webhook crediting.
- **Redeemable Promo Codes**: Fixed amount or percentage discount codes with expiration and per-user limits.

### 6. Automated Customer Email Alerts
1. **Deposit Request Initiated**: Order reference, amount, gateway, and direct pay link.
2. **Deposit Success / Failure**: Real-time confirmation email with transaction ID and wallet balance updates.
3. **New Service Announcement**: Broadcast to all active users when admin adds a new service.
4. **Service Price Up/Down Notice**: Auto-alerts users when purchasing rates change.
5. **Unlimited Promo Code Drops**: Auto-broadcasts marketing promotional emails when an unlimited (`Max uses = 0`) code is generated.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Backend** | Node.js 20, TypeScript, Express, Prisma ORM, Nodemailer, ImapFlow, Socket.io |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Axios |
| **Database & Cache** | PostgreSQL 15, Redis 7 (Pub/Sub & Session Cache) |
| **Web Server / SSL** | Caddy 2 (Automatic Let's Encrypt SSL & Reverse Proxy) |
| **Containerization** | Docker, Docker Compose |

---

## 📁 Folder Structure

```
SaaS OTP Platform/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Database models (User, RentalSession, PaymentOrder, etc.)
│   ├── src/
│   │   ├── config/                # Environment configuration
│   │   ├── db/                    # Prisma & Redis client singletons
│   │   ├── middlewares/           # Auth & admin verification middlewares
│   │   ├── routes/                # API Endpoints (auth, rental, admin, payment, public)
│   │   ├── services/
│   │   │   ├── mail-engine/       # Inbound Port 25, Outbound MX, IMAP Pool, SMTP
│   │   │   ├── notification/      # Branded HTML email alert dispatchers
│   │   │   ├── payments/          # bKash, Nagad, Paymento, Maxelpay integrations
│   │   │   ├── promo/             # Promo code validation & redemption
│   │   │   ├── rental/            # Session lifecycle & auto-expiration cleanup
│   │   │   └── wallet/            # Financial double-entry ledger service
│   │   └── index.ts               # Server bootstrap & background workers
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/            # React UI components (Navbar, LiveActivations, TopUpHistory, etc.)
│   │   │   └── admin/             # Admin tabs (Mail Settings, Webmail, Domain Manager, etc.)
│   │   ├── App.tsx                # Main routing & state container
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml             # Multi-container orchestration (Backend, Frontend, DB, Redis, Caddy)
├── Caddyfile                      # Production reverse-proxy & SSL definitions
├── scripts/                       # Remote deployment & synchronization automation scripts
└── README.md                      # Comprehensive developer & AI documentation
```

---

## ⚙️ Environment Variables Reference

Create a `.env` file in the `backend/` directory based on the following template:

```env
# Server & Domain
PORT=4000
NODE_ENV=production
BASE_URL=https://dropotp.com
FRONTEND_URL=https://dropotp.com
JWT_SECRET=your_super_secret_jwt_key_here

# Database (PostgreSQL)
DATABASE_URL=postgresql://otp_user:your_secure_password@postgres:5432/otp_db?schema=public

# Redis
REDIS_URL=redis://redis:6379

# Inbound Mail Server
SMTP_PORT=25
SMTP_DOMAIN=dropotp.com

# Payment Gateway - bKash
BKASH_BASE_URL=https://tokenized.pay.bka.sh/v1.2.0-beta
BKASH_APP_KEY=your_bkash_app_key
BKASH_APP_SECRET=your_bkash_app_secret
BKASH_USERNAME=your_bkash_username
BKASH_PASSWORD=your_bkash_password

# Payment Gateway - Nagad
NAGAD_BASE_URL=https://api.mynagad.com
NAGAD_MERCHANT_ID=your_merchant_id
NAGAD_PUBLIC_KEY=your_public_key
NAGAD_PRIVATE_KEY=your_private_key

# Payment Gateway - Paymento
PAYMENTO_API_KEY=your_paymento_api_key

# Payment Gateway - Maxelpay
MAXELPAY_API_KEY=your_maxelpay_api_key
```

---

## 🚀 Step-by-Step Installation & Deployment

### 1. Server Prerequisites
- Ubuntu 22.04 or 24.04 LTS VPS.
- **Port 25 Unblocked** (HOSTKEY, Contabo, OVH, or similar VPS provider) for receiving and sending direct emails.
- Docker & Docker Compose installed:
  ```bash
  curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
  ```

### 2. DNS Configuration
Point your domain DNS records to your VPS IP:
- `A` record: `@` -> `YOUR_SERVER_IP`
- `A` record: `*` -> `YOUR_SERVER_IP`
- `MX` record: `@` -> `mail.yourdomain.com` (Priority: 10)
- `A` record: `mail` -> `YOUR_SERVER_IP`
- `TXT` record: `@` -> `v=spf1 mx a ~all`

### 3. Clone and Run
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git /opt/otp-platform
cd /opt/otp-platform

# Generate Prisma Client & Run DB Migrations
docker compose run --rm backend npx prisma migrate deploy
docker compose run --rm backend npx prisma db seed

# Build and Start All Containers
docker compose up -d --build
```

### 4. Verify Running Services
```bash
docker compose ps
```
You should see:
- `otp_backend` (Express API & Port 25 Inbound SMTP)
- `otp_frontend` (Nginx serving compiled React UI)
- `otp_caddy` (Edge proxy with automatic SSL)
- `otp_postgres` (PostgreSQL 15)
- `otp_redis` (Redis 7)

---

## 🔌 API Documentation (SMSBower Standard)

DropOTP provides full backward-compatibility with SMSBower bot APIs:

| Method | Endpoint | Parameters | Description |
|---|---|---|---|
| `GET` | `/api/mail/getActivation` | `api_key`, `service`, `duration`, `domain` | Rent an email address |
| `GET` | `/api/mail/getCode` | `api_key`, `id` | Poll for received OTP code |
| `GET` | `/api/mail/setStatus` | `api_key`, `id`, `status` (3=Paid, 2=Cancel, 5=Extend) | Settle or cancel session |
| `GET` | `/api/mail/getPriceRests` | `api_key` | Query live service inventory and pricing |
| `GET` | `/api/mail/getBalance` | `api_key` | Check user wallet balance |

---

## 🛡️ License
Distributed under the MIT License. Open source and ready for production deployment.
