// api/stream.js
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

export const config = {
  runtime: 'edge',
}

export default async function handler(request) {
  try {
    // Get current game state
    const gameState = await redis.get('gameState') || initializeGameState()
    
    // Return state with proper headers for SSE
    return new Response(JSON.stringify(gameState), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
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
