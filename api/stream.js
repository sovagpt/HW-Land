import { createClient } from '@vercel/kv';
import OpenAI from 'openai';

const kv = createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default function handler(req, res) {
  if (req.headers.accept?.includes('text/event-stream')) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send initial state
    sendGameState(res);

    // Keep connection alive
    const intervalId = setInterval(() => {
      res.write(':\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(intervalId);
    });
  } else {
    res.status(400).json({ error: 'Unsupported request type' });
  }
}

async function sendGameState(res) {
  const gameState = await kv.get('gameState') || initializeGameState();
  res.write(`data: ${JSON.stringify(gameState)}\n\n`);
}

function initializeGameState() {
  const initialState = {
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
      // Additional NPCs
      {
        id: 'npc1',
        x: 300,
        y: 300,
        type: 'NPCSprite',
        isUnaware: false,
        thoughts: [],
        memories: [],
      },
      {
        id: 'npc2',
        x: 700,
        y: 400,
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
  };

  kv.set('gameState', initialState);
  return initialState;
}