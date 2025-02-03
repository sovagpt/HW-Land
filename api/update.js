// api/update.js
import { Redis } from '@upstash/redis'

const redis = new Redis({
 url: process.env.KV_REST_API_URL,
 token: process.env.KV_REST_API_TOKEN,
})

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

   gameState.sprites = gameState.sprites.map(sprite => {
     const moveX = (Math.random() - 0.5) * 40;
     const moveY = (Math.random() - 0.5) * 40;
     
     sprite.momentumX = (sprite.momentumX || 0) * 0.8 + moveX * 0.2;
     sprite.momentumY = (sprite.momentumY || 0) * 0.8 + moveY * 0.2;
     
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
   });

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
