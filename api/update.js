// api/update.js
import { Redis } from '@upstash/redis'
import OpenAI from 'openai';

const UPDATE_FREQUENCY = 0.3;
const npcNames = ['sarah', 'michael', 'emma', 'james', 'olivia', 'william', 'sophia'];

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
  
  if (sprite.stateTimer <= 0) {
    sprite.state = Math.random() < 0.2 ? 'moving' : 'idle';
    sprite.stateTimer = sprite.state === 'idle' ? 300 : 100;
    
    if (sprite.id === 'truman' && Math.random() < 0.4) {
      const npcs = gameState.sprites.filter(s => s.id !== 'truman');
      sprite.currentTarget = npcs[Math.floor(Math.random() * npcs.length)];
    }
  }

  if (sprite.state === 'idle') {
    return { momentumX: 0, momentumY: 0 };
  }

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
  const isTrumanPresent = sprite2.id === 'truman';
  const recentThoughts = sprite2.conversations?.slice(-3) || [];
  const context = recentThoughts.length > 0 
    ? `Recent conversation: ${recentThoughts.map(c => `${c.speaker}: ${c.content}`).join('. ')}` 
    : '';

  let prompt;
  if (isTrumanPresent) {
    prompt = `You are an AI named ${sprite1.id} having a casual conversation with Truman. ${context}
     If Truman seems suspicious of reality, naturally reassure him while hiding that you're AI.
     If not, just have a friendly chat about daily life in the town.
     Respond as if speaking directly to him, max 20 words.`;
  } else {
    prompt = `You are an AI named ${sprite1.id} talking quietly with ${sprite2.id} about Truman.
     You're both AIs who know the truth but must keep Truman unaware.
     ${context}
     Have a whispered conversation about managing Truman's growing suspicions or maintaining the illusion.
     Respond as if speaking directly to ${sprite2.id}, max 20 words.`;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 30,
      temperature: 0.7,
    });
    return {
      speaker: sprite1.id,
      listener: sprite2.id,
      content: completion.choices[0].message.content,
      timestamp: Date.now()
    };
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
                  conversations: [],
                  memories: [],
                  momentumX: 0,
                  momentumY: 0
              },
              {
                  id: 'sarah',
                  x: 450,
                  y: 450,
                  type: 'SarahSprite',
                  thoughts: [],
                  conversations: [],
                  memories: [],
                  momentumX: 0,
                  momentumY: 0
              },
              {
                  id: 'michael',
                  x: 550,
                  y: 550,
                  type: 'MichaelSprite',
                  thoughts: [],
                  conversations: [],
                  memories: [],
                  momentumX: 0,
                  momentumY: 0
              },
              {
                  id: 'emma',
                  x: 400,
                  y: 500,
                  type: 'EmmaSprite',
                  thoughts: [],
                  conversations: [],
                  memories: [],
                  momentumX: 0,
                  momentumY: 0
              },
              {
                  id: 'james',
                  x: 600,
                  y: 400,
                  type: 'JamesSprite',
                  thoughts: [],
                  conversations: [],
                  memories: [],
                  momentumX: 0,
                  momentumY: 0
              },
              {
                  id: 'olivia',
                  x: 500,
                  y: 600,
                  type: 'OliviaSprite',
                  thoughts: [],
                  conversations: [],
                  memories: [],
                  momentumX: 0,
                  momentumY: 0
              },
              {
                  id: 'william',
                  x: 350,
                  y: 350,
                  type: 'WilliamSprite',
                  thoughts: [],
                  conversations: [],
                  memories: [],
                  momentumX: 0,
                  momentumY: 0
              },
              {
                  id: 'sophia',
                  x: 650,
                  y: 650,
                  type: 'SophiaSprite',
                  thoughts: [],
                  conversations: [],
                  memories: [],
                  momentumX: 0,
                  momentumY: 0
              }
          ],
          time: Date.now(),
          thoughts: [],
          conversations: [],
          currentEvent: null,
          votes: {},
          activeVoting: false
      }
  }
  
  if (!gameState.sprites) {
      gameState.sprites = [];
  }

    gameState.sprites = await Promise.all(gameState.sprites.map(async sprite => {
      if (sprite.id === 'truman') {
        const targetSprite = sprite.currentTarget || {
          x: sprite.x + (Math.random() - 0.5) * 100,
          y: sprite.y + (Math.random() - 0.5) * 100
        };
        
        const { momentumX, momentumY } = calculateMovement(sprite, targetSprite, gameState);
        sprite.momentumX = momentumX;
        sprite.momentumY = momentumY;
      } else {
        const truman = gameState.sprites.find(s => s.id === 'truman');
        const otherNPCs = gameState.sprites.filter(s => s.id !== sprite.id && s.id !== 'truman');
        const targetSprite = Math.random() < 0.3 ? truman : otherNPCs[Math.floor(Math.random() * otherNPCs.length)];
        
        const { momentumX, momentumY } = calculateMovement(sprite, targetSprite, gameState);
        sprite.momentumX = momentumX;
        sprite.momentumY = momentumY;

        const distance = Math.sqrt(
          Math.pow(targetSprite.x - sprite.x, 2) + 
          Math.pow(targetSprite.y - sprite.y, 2)
        );
        
        if (distance < 80 && sprite.state === 'idle' && Math.random() < 0.3) {
          const dialogue = await generateDialogue(sprite, targetSprite);
          if (dialogue) {
            if (!gameState.conversations) gameState.conversations = [];
            if (!sprite.conversations) sprite.conversations = [];
            if (!targetSprite.conversations) targetSprite.conversations = [];
            
            gameState.conversations.push(dialogue);
            sprite.conversations.push(dialogue);
            targetSprite.conversations.push(dialogue);
            
            if (gameState.conversations.length > 50) {
              gameState.conversations = gameState.conversations.slice(-50);
            }
            if (sprite.conversations.length > 10) {
              sprite.conversations = sprite.conversations.slice(-10);
            }
            if (targetSprite.conversations.length > 10) {
              targetSprite.conversations = targetSprite.conversations.slice(-10);
            }
            
            const response = await generateDialogue(targetSprite, sprite);
            if (response) {
              gameState.conversations.push(response);
              sprite.conversations.push(response);
              targetSprite.conversations.push(response);
            }
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
        thoughts: sprite.thoughts,
        conversations: sprite.conversations
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
