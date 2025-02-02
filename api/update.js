// api/update.js
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

export const config = {
  runtime: 'edge'
}

function isValidPosition(x, y) {
  // Keep sprites within map bounds
  if (x < 50 || x > 750 || y < 50 || y > 750) {
    return false;
  }

  // Avoid the river area (rough estimate)
  const riverX = 300;
  const riverWidth = 100;
  if (x > riverX && x < riverX + riverWidth) {
    // Allow crossing at the bridge locations
    const bridgeY1 = 200;
    const bridgeY2 = 400;
    if (!(y > bridgeY1 - 20 && y < bridgeY1 + 20) && 
        !(y > bridgeY2 - 20 && y < bridgeY2 + 20)) {
      return false;
    }
  }

  return true;
}

export default async function handler(request) {
  // Handle CORS preflight request
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
  }

  // Only allow POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
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

    // Update sprite positions
    gameState.sprites = gameState.sprites.map(sprite => {
      let newX = sprite.x;
      let newY = sprite.y;
      
      // Try to move the sprite
      for (let attempts = 0; attempts < 5; attempts++) {
        // Generate random movement (larger movement range)
        const deltaX = (Math.random() - 0.5) * 4; // Increased from 2 to 4
        const deltaY = (Math.random() - 0.5) * 4;
        
        const testX = sprite.x + deltaX;
        const testY = sprite.y + deltaY;
        
        if (isValidPosition(testX, testY)) {
          newX = testX;
          newY = testY;
          break;
        }
      }

      return {
        ...sprite,
        x: newX,
        y: newY
      }
    })

    await redis.set('gameState', gameState)

    return new Response(JSON.stringify(gameState), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}
