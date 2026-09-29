# Email Address Rental & Instant OTP Reception SaaS (SMSBower Architecture)

A production-ready, high-performance SaaS platform for temporary & dedicated email address rentals with instant OTP code extraction, real-time WebSockets, SMSBower-compatible REST API, Bangladeshi & Global payment gateways (bKash, Nagad, Paymento.io, Maxelpay.com), and an administration dashboard.

Optimized to run seamlessly on a low-cost Ubuntu VPS (**2 vCore, 2GB RAM, 60GB SSD**) using Docker Compose and automated 2GB Swap space.

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

Point your domain (e.g. `dropotp.com`) to your server IP (`162.141.78.116`):

| Type | Host / Name | Value / Target | Priority | TTL |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` | `162.141.78.116` | — | Automatic |
| **A** | `mail` | `162.141.78.116` | — | Automatic |
| **MX** | `@` | `mail.dropotp.com` | **10** | Automatic |

*(Note: In Cloudflare, make sure the MX record and `mail` A record have Proxy status set to **DNS Only / Gray Cloud** so that inbound SMTP port 25 is not blocked).*

---

## 🚀 Step-by-Step VPS Deployment Guide

### Step 1: Connect to your Ubuntu VPS via SSH
```bash
ssh root@162.141.78.116
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

- **Dashboard URL**: `http://YOUR_SERVER_IP` or `https://dropotp.com`
- **Default Admin Email**: `admin@dropotp.com` (configured in `.env`)
- **Default Admin Password**: `Sh330717@` (configured in `.env`)
