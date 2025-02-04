import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

export const config = {
  runtime: 'edge'
}

export default async function handler(request) {
  await redis.del('gameState');
  return new Response('Redis cleared', {
    headers: { 'Content-Type': 'text/plain' }
  });
}
