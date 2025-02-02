// api/stream.js
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

export const config = {
  runtime: 'edge'
}

export default async function handler(request) {
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

    // Format the response as an SSE message
    const message = `data: ${JSON.stringify(gameState)}\n\n`;

    return new Response(message, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    return new Response(`data: ${JSON.stringify({ error: error.message })}\n\n`, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}
