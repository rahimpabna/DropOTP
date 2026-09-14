import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  BASE_URL: process.env.BASE_URL || 'http://localhost:4000',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret_key_change_me',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@example.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Admin123456!',

  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres_pass_123@localhost:5432/otp_platform?schema=public',

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',

  // SMTP Port 25
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '25', 10),
  SMTP_DOMAIN: process.env.SMTP_DOMAIN || 'localhost',
  SMTP_PROXY_URL: process.env.SMTP_PROXY_URL || '',

  // bKash
  BKASH_BASE_URL: process.env.BKASH_BASE_URL || 'https://tokenized.sandbox.bka.sh/v1.2.0-beta',
  BKASH_APP_KEY: process.env.BKASH_APP_KEY || '',
  BKASH_APP_SECRET: process.env.BKASH_APP_SECRET || '',
  BKASH_USERNAME: process.env.BKASH_USERNAME || '',
  BKASH_PASSWORD: process.env.BKASH_PASSWORD || '',

  // Nagad
  NAGAD_BASE_URL: process.env.NAGAD_BASE_URL || 'http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs',
  NAGAD_MERCHANT_ID: process.env.NAGAD_MERCHANT_ID || '',
  NAGAD_MERCHANT_PG_PUBLIC_KEY: process.env.NAGAD_MERCHANT_PG_PUBLIC_KEY || '',
  NAGAD_MERCHANT_PRIVATE_KEY: process.env.NAGAD_MERCHANT_PRIVATE_KEY || '',

  // Paymento
  PAYMENTO_API_KEY: process.env.PAYMENTO_API_KEY || '',
  PAYMENTO_SECRET: process.env.PAYMENTO_SECRET || '',

  // Maxelpay
  MAXELPAY_API_KEY: process.env.MAXELPAY_API_KEY || '',
};
