// api/update.js
import { Redis } from '@upstash/redis'
import OpenAI from 'openai';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const config = {
  runtime: 'edge'
}

function checkCollision(x, y) {
  const forbiddenAreas = [
    { x: 300, y: 0, width: 100, height: 960 }, // River
  ];

  for (const area of forbiddenAreas) {
    if (x >= area.x && x <= area.x + area.width &&
        y >= area.y && y <= area.y + area.height) {
      return true;
    }
  }
  return false;
}

function getDistance(sprite1, sprite2) {
  return Math.sqrt(
    Math.pow(sprite2.x - sprite1.x, 2) + 
    Math.pow(sprite2.y - sprite1.y, 2)
  );
}

async function generateDialogue(sprite1, sprite2) {
  const prompt = `You are an AI living in a simulated town. You are aware you are AI but must hide this fact from Truman (${sprite2.id === 'truman' ? 'who you are talking to' : 'who lives in town'}). Have a casual conversation that subtly hints at the artificial nature of the world without revealing it. Keep response under 20 words.`;
  
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 30,
      temperature: 0.7,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Dialogue generation error:', error);
    return null;
  }
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
        sprites: [
          {
            id: 'truman',
            x: 500,
            y: 500,
            type: 'TrumanSprite',
            isUnaware: true,
            thoughts: [],
            memories: [],
            momentumX: 0,
            momentumY: 0
          },
          {
            id: 'npc1',
            x: 450,
            y: 450,
            type: 'NPCSprite',
            thoughts: [],
            memories: [],
            momentumX: 0,
            momentumY: 0
          },
          {
            id: 'npc2',
            x: 550,
            y: 550,
            type: 'NPCSprite',
            thoughts: [],
            memories: [],
            momentumX: 0,
            momentumY: 0
          }
        ],
        time: Date.now(),
        thoughts: [],
        currentEvent: null,
        votes: {},
        activeVoting: false
      }
    }

    if (!gameState.sprites) {
      gameState.sprites = [];
    }

    const truman = gameState.sprites.find(s => s.id === 'truman');

    // Update sprite positions
    gameState.sprites = await Promise.all(gameState.sprites.map(async sprite => {
      if (sprite.id === 'truman') {
        // Random movement for Truman
        const moveX = (Math.random() - 0.5) * 20;
        const moveY = (Math.random() - 0.5) * 20;
        
        sprite.momentumX = (sprite.momentumX || 0) * 0.8 + moveX * 0.2;
        sprite.momentumY = (sprite.momentumY || 0) * 0.8 + moveY * 0.2;
      } else {
        // NPCs move towards Truman while maintaining distance
        const dx = truman.x - sprite.x;
        const dy = truman.y - sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const targetDistance = 100; // Desired orbit distance
        const strength = (distance - targetDistance) * 0.1;
        
        sprite.momentumX = (sprite.momentumX || 0) * 0.8 + (dx / distance) * strength;
        sprite.momentumY = (sprite.momentumY || 0) * 0.8 + (dy / distance) * strength;
        
        // Generate dialogue if close enough
        if (distance < 80 && Math.random() < 0.1) { // 10% chance when close
          const thought = await generateDialogue(sprite, truman);
          if (thought) {
            gameState.thoughts.push({
              spriteId: sprite.id,
              thought,
              timestamp: Date.now()
            });
          }
        }
      }

      let newX = Math.max(50, Math.min(910, sprite.x + sprite.momentumX));
      let newY = Math.max(50, Math.min(910, sprite.y + sprite.momentumY));
      
      if (checkCollision(newX, newY)) {
        newX = sprite.x;
        newY = sprite.y;
        sprite.momentumX = -sprite.momentumX;
        sprite.momentumY = -sprite.momentumY;
      }

      return {
        ...sprite,
        x: newX,
        y: newY,
        momentumX: sprite.momentumX,
        momentumY: sprite.momentumY
      };
    }));

    gameState.time = Date.now();
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
