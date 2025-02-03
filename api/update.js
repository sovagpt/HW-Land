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
 // Define forbidden areas
 const forbiddenAreas = [
   // Main river
   { x: 300, y: 0, width: 100, height: 960 },
   // Forest areas
   { x: 600, y: 100, width: 200, height: 300 },
   { x: 100, y: 400, width: 150, height: 200 }
 ];

 // Check for collisions
 for (const area of forbiddenAreas) {
   if (x >= area.x && x <= area.x + area.width &&
       y >= area.y && y <= area.y + area.height) {
     return true; // Collision detected
   }
 }
 return false; // No collision
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
           memories: []
         },
         {
           id: 'npc1',
           x: 450,
           y: 450,
           type: 'NPCSprite',
           thoughts: [],
           memories: []
         },
         {
           id: 'npc2',
           x: 550,
           y: 550,
           type: 'NPCSprite',
           thoughts: [],
           memories: []
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

   // Update sprite positions with collision detection
   gameState.sprites = gameState.sprites.map(sprite => {
     let validMove = false;
     let newX = sprite.x;
     let newY = sprite.y;
     let attempts = 0;

     while (!validMove && attempts < 5) {
       const moveX = (Math.random() - 0.5) * 20;
       const moveY = (Math.random() - 0.5) * 20;
       
       const testX = Math.max(50, Math.min(910, sprite.x + moveX));
       const testY = Math.max(50, Math.min(910, sprite.y + moveY));
       
       if (!checkCollision(testX, testY)) {
         newX = testX;
         newY = testY;
         validMove = true;
         console.log(`Valid move found for ${sprite.id} to (${newX},${newY})`);
       }
       attempts++;
     }

     return {
       ...sprite,
       x: newX,
       y: newY,
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
