// api/update.js
import { Redis } from '@upstash/redis'
import OpenAI from 'openai';

const UPDATE_FREQUENCY = 0.3;

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

function calculateMovement(sprite, targetSprite, gameState) {
  const dx = targetSprite.x - sprite.x;
  const dy = targetSprite.y - sprite.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (!sprite.state) sprite.state = 'idle';
  if (!sprite.stateTimer) sprite.stateTimer = 0;
  if (!sprite.currentTarget) sprite.currentTarget = null;
  
  sprite.stateTimer--;
  
  // Choose new state and target when timer expires
  if (sprite.stateTimer <= 0) {
    // Much higher chance of being idle
    sprite.state = Math.random() < 0.2 ? 'moving' : 'idle';
    // Longer timers - especially for idle state
    sprite.stateTimer = sprite.state === 'idle' ? 300 : 100;
    
    // For Truman, occasionally choose an NPC to approach
    if (sprite.id === 'truman' && Math.random() < 0.4) {
      const npcs = gameState.sprites.filter(s => s.id !== 'truman');
      sprite.currentTarget = npcs[Math.floor(Math.random() * npcs.length)];
    }
  }

  if (sprite.state === 'idle') {
    return { momentumX: 0, momentumY: 0 };
  }

  // If Truman has a target, move towards it
  if (sprite.id === 'truman' && sprite.currentTarget) {
    const targetDx = sprite.currentTarget.x - sprite.x;
    const targetDy = sprite.currentTarget.y - sprite.y;
    const targetDist = Math.sqrt(targetDx * targetDx + targetDy * targetDy);
    return {
      momentumX: (sprite.momentumX || 0) * 0.9 + (targetDx / targetDist) * 2,
      momentumY: (sprite.momentumY || 0) * 0.9 + (targetDy / targetDist) * 2
    };
  }

  const targetDistance = sprite.id === 'truman' ? 0 : 80;
  const strength = (distance - targetDistance) * 0.1;
  
  return {
    momentumX: (sprite.momentumX || 0) * 0.9 + (dx / distance) * strength,
    momentumY: (sprite.momentumY || 0) * 0.9 + (dy / distance) * strength
  };
}

async function generateDialogue(sprite1, sprite2) {
  console.log('Generating dialogue between', sprite1.id, 'and', sprite2.id);
  
  const isTrumanPresent = sprite2.id === 'truman';
  const recentThoughts = sprite2.thoughts?.slice(-3) || [];
  const context = recentThoughts.length > 0 
    ? `Recent thoughts: ${recentThoughts.join('. ')}` 
    : '';

  const prompt = isTrumanPresent ? 
    `You are an AI named ${sprite1.id} talking to Truman. ${context}
     Truman seems suspicious of reality. Naturally reassure him while hiding that you're AI.
     Respond in first person, max 20 words.` :
    `You are an AI named ${sprite1.id} talking to ${sprite2.id} about Truman. ${context}
     Discuss concerns about Truman's growing suspicions.
     Respond in first person, max 20 words.`;

  try {
    console.log('Sending OpenAI request with prompt:', prompt);
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 30,
      temperature: 0.7,
    });
    const thought = completion.choices[0].message.content;
    console.log('Received thought:', thought);
    return thought;
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
          ...Array.from({ length: 7 }, (_, i) => ({
            id: `npc${i + 1}`,
            x: Math.random() * 800 + 50,
            y: Math.random() * 800 + 50,
            type: 'NPCSprite',
            thoughts: [],
            memories: [],
            momentumX: 0,
            momentumY: 0
          }))
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

    // Process all sprites
    gameState.sprites = await Promise.all(gameState.sprites.map(async sprite => {
      if (sprite.id === 'truman') {
        // Random wandering for Truman with occasional NPC targeting
        const targetSprite = sprite.currentTarget || {
          x: sprite.x + (Math.random() - 0.5) * 100,
          y: sprite.y + (Math.random() - 0.5) * 100
        };
        
        const { momentumX, momentumY } = calculateMovement(sprite, targetSprite, gameState);
        sprite.momentumX = momentumX;
        sprite.momentumY = momentumY;
      } else {
        // NPCs either follow Truman or interact with other NPCs
        const truman = gameState.sprites.find(s => s.id === 'truman');
        const otherNPCs = gameState.sprites.filter(s => s.id !== sprite.id && s.id !== 'truman');
        const targetSprite = Math.random() < 0.3 ? truman : otherNPCs[Math.floor(Math.random() * otherNPCs.length)];
        
        const { momentumX, momentumY } = calculateMovement(sprite, targetSprite, gameState);
        sprite.momentumX = momentumX;
        sprite.momentumY = momentumY;

        // Generate dialogue when close
        const distance = Math.sqrt(
          Math.pow(targetSprite.x - sprite.x, 2) + 
          Math.pow(targetSprite.y - sprite.y, 2)
        );
        
        if (distance < 80 && sprite.state === 'idle' && Math.random() < 0.3) {
          const thought = await generateDialogue(sprite, targetSprite);
          if (thought) {
            if (!gameState.thoughts) gameState.thoughts = [];
            if (!sprite.thoughts) sprite.thoughts = [];
            
            const newThought = {
              spriteId: sprite.id,
              thought,
              timestamp: Date.now()
            };
            
            gameState.thoughts.push(newThought);
            sprite.thoughts.push(newThought);
            
            // Keep last 50 thoughts for each
            if (gameState.thoughts.length > 50) gameState.thoughts = gameState.thoughts.slice(-50);
            if (sprite.thoughts.length > 10) sprite.thoughts = sprite.thoughts.slice(-10);
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
        momentumY: sprite.momentumY,
        state: sprite.state,
        stateTimer: sprite.stateTimer,
        currentTarget: sprite.currentTarget,
        thoughts: sprite.thoughts
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
