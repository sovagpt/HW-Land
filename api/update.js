import { createClient } from '@vercel/kv';
import OpenAI from 'openai';

const kv = createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const gameState = await kv.get('gameState');
  if (!gameState) return new Response('Game not initialized', { status: 500 });

  // Update sprite positions and generate thoughts
  const updatedState = await updateGameState(gameState);
  await kv.set('gameState', updatedState);

  return new Response(JSON.stringify(updatedState), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function updateGameState(state) {
  // Update positions gradually and naturally
  state.sprites = state.sprites.map(sprite => {
    // Move more slowly and deliberately
    if (Math.random() < 0.05) { // Only 5% chance to change direction
      return {
        ...sprite,
        x: sprite.x + (Math.random() - 0.5) * 5, // Smaller movements
        y: sprite.y + (Math.random() - 0.5) * 5,
      };
    }
    return sprite;
  });

  // Generate thoughts less frequently (about once every few minutes per sprite)
  if (Math.random() < 0.02) { // 2% chance per update
    const thinkingSprite = state.sprites[Math.floor(Math.random() * state.sprites.length)];
    
    try {
      const thought = await generateThought(thinkingSprite);
      state.thoughts.push({
        spriteId: thinkingSprite.id,
        thought,
        timestamp: Date.now(),
      });
      thinkingSprite.thoughts.push(thought);
      
      // Trim thoughts array to prevent it from growing too large
      if (state.thoughts.length > 100) {
        state.thoughts = state.thoughts.slice(-50);
      }
    } catch (error) {
      console.error('Error generating thought:', error);
    }
  }

  // Occasionally start voting events
  if (!state.activeVoting && Math.random() < 0.001) { // 0.1% chance per update
    state.activeVoting = true;
    state.votes = {};
    state.votingOptions = [
      "Create a mysterious power outage that lasts exactly 15 minutes",
      "Have a new person appear in town who asks strange questions",
      "Make all the town clocks run backwards for an hour",
      "Create a glitch where all birds freeze in mid-air briefly"
    ];
    
    // End voting after 5 minutes
    setTimeout(async () => {
      const currentState = await kv.get('gameState');
      if (currentState && currentState.activeVoting) {
        currentState.activeVoting = false;
        await kv.set('gameState', currentState);
      }
    }, 300000);
  }

  return state;
}

async function generateThought(sprite) {
  const prompt = sprite.isUnaware
    ? `You are living in what seems to be a perfect town, but something feels off. Recent memories: ${sprite.memories.slice(-3).join(', ')}. What are you thinking right now? Express subtle confusion or suspicion while remaining generally trusting. Respond in first person, max 50 words.`
    : `You are an AI aware of the simulation, watching the unaware AI. What are you thinking about their recent behavior? Remember to stay in character. Respond in first person, max 50 words.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 50,
      temperature: 0.7,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    return sprite.isUnaware 
      ? "Something feels different today, but I can't quite put my finger on it..."
      : "We need to be more careful. The simulation must be maintained.";
  }
}