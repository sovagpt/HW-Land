// api/update.js
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

export const config = {
  runtime: 'edge',
}

export default async function handler(request) {
  // Allow POST method
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  try {
    // Get current game state
    const gameState = await redis.get('gameState') || initializeGameState()
    
    // Update state
    const updatedState = await updateGameState(gameState)
    
    // Save updated state
    await redis.set('gameState', updatedState)

    // Return updated state
    return new Response(JSON.stringify(updatedState), {
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Update error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}

function initializeGameState() {
  return {
    sprites: [
      {
        id: 'truman',
        x: 500,
        y: 500,
        type: 'TrumanSprite',
        isUnaware: true,
        thoughts: [],
        memories: [],
      },
      {
        id: 'npc1',
        x: 300,
        y: 300,
        type: 'NPCSprite',
        isUnaware: false,
        thoughts: [],
        memories: [],
      }
    ],
    time: Date.now(),
    thoughts: [],
    currentEvent: null,
    votes: {},
    activeVoting: false,
  }
}

async function updateGameState(state) {
  // Update sprite positions
  state.sprites = state.sprites.map(sprite => ({
    ...sprite,
    x: sprite.x + (Math.random() - 0.5) * 5,
    y: sprite.y + (Math.random() - 0.5) * 5,
  }))

  return state
}
