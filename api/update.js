// api/update.js
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

export const config = {
  runtime: 'edge'
}

// Helper function to check if a position is valid (not on water/trees)
function isValidMove(x, y, currentX, currentY) {
  // Only allow small movements from current position
  const maxMove = 2;
  if (Math.abs(x - currentX) > maxMove || Math.abs(y - currentY) > maxMove) {
    return false;
  }

  // Define boundaries for the map
  const mapWidth = 800;
  const mapHeight = 800;
  
  // Keep sprites within map bounds with padding
  const padding = 32; // Sprite size
  if (x < padding || x > mapWidth - padding || y < padding || y > mapHeight - padding) {
    return false;
  }

  // Define areas to avoid (rough coordinates for water and dense forest)
  const waterAreas = [
    { x1: 300, y1: 0, x2: 400, y2: 800 }, // Main river
  ];

  // Check if position is in water
  for (const area of waterAreas) {
    if (x >= area.x1 && x <= area.x2 && y >= area.y1 && y <= area.y2) {
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

    // Update sprite positions with collision detection
    gameState.sprites = gameState.sprites.map(sprite => {
      const moveAttempts = 5; // Try multiple positions if initial ones are invalid
      let newX, newY;
      let validMove = false;

      for (let i = 0; i < moveAttempts && !validMove; i++) {
        // Generate random movement
        newX = sprite.x + (Math.random() - 0.5) * 2;
        newY = sprite.y + (Math.random() - 0.5) * 2;

        // Check if move is valid
        if (isValidMove(newX, newY, sprite.x, sprite.y)) {
          validMove = true;
          break;
        }
      }

      // If no valid move found, keep current position
      if (!validMove) {
        newX = sprite.x;
        newY = sprite.y;
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
