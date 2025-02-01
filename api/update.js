// api/update.js
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  if (req.method === 'OPTIONS') {
    return new Response('OK', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  try {
    // Get or initialize game state
    let gameState = await redis.get('gameState');
    if (!gameState) {
      gameState = {
        sprites: [
          {
            id: 'truman',
            x: 500,
            y: 500,
            type: 'TrumanSprite',
            isUnaware: true,
            thoughts: [],
            memories: [],
          }
        ],
        time: Date.now(),
        thoughts: [],
        currentEvent: null,
        votes: {},
        activeVoting: false,
      };
    }

    // Simple update - just move sprites slightly
    gameState.sprites = gameState.sprites.map(sprite => ({
      ...sprite,
      x: sprite.x + (Math.random() - 0.5) * 2,
      y: sprite.y + (Math.random() - 0.5) * 2,
    }));

    // Save updated state
    await redis.set('gameState', gameState);

    return new Response(JSON.stringify(gameState), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Update error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
