import { Redis } from '@upstash/redis';

// Support both naming conventions for backwards compatibility
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN;

if (!redisUrl || !redisToken) {
  console.warn('⚠️  Upstash Redis credentials not configured. Redis functionality will be disabled.');
}

const redis = redisUrl && redisToken
  ? new Redis({
      url: redisUrl,
      token: redisToken,
    })
  : null;

export default redis;
