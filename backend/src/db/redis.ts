import Redis from 'ioredis';
import { ENV } from '../config/env';

export const redis = new Redis(ENV.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    return Math.min(times * 200, 2000);
  },
});

export const redisSubscriber = new Redis(ENV.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    return Math.min(times * 200, 2000);
  },
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully.');
});

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});
