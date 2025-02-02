// api/update.js
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

export const config = {
  runtime: 'edge'
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }

  try {
    let gameState = await redis.get('gameState')
    
    if (!gameState) {
      gameState = {
        sprites: [{
          id: 'truman',
          x: 500,
          y: 500,
          type: 'TrumanSprite',
          isUnaware: true,
          thoughts: [],
          memories: []
        }],
        time: Date.now(),
        thoughts: [],
        currentEvent: null,
        votes: {},
        activeVoting: false
      }
    }

    // Ensure we have the sprites array
    if (!gameState.sprites) {
      gameState.sprites = [];
    }

    // Update each sprite's position
    gameState.sprites = gameState.sprites.map(sprite => {
      // Generate new random position
      const moveX = (Math.random() - 0.5) * 10; // Larger movement for testing
      const moveY = (Math.random() - 0.5) * 10;

      return {
        ...sprite,
        x: Math.max(50, Math.min(750, sprite.x + moveX)),
        y: Math.max(50, Math.min(750, sprite.y + moveY))
      };
    });

    // Update timestamp
    gameState.time = Date.now();

    // Save the new state
    await redis.set('gameState', gameState);

    return new Response(JSON.stringify(gameState), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    console.error('Update error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
}
