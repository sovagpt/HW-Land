# AI Stream World

A persistent AI-driven world stream where viewers can watch AI characters interact and influence events through voting.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up Vercel KV:
```bash
vercel link
vercel kv create
```

3. Add environment variables:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `OPENAI_API_KEY`

4. Add your assets:
- Place sprite sheets in `/public/sprites/`
- Place Tiled map in `/public/maps/`
- Place tileset in `/public/tilesets/`

5. Deploy:
```bash
vercel deploy
```

## Development

Run locally:
```bash
vercel dev
```

## Structure

- `index.html`: Main game client
- `/api`: Serverless functions for game logic
- `/public`: Static assets (sprites, maps, etc.)

## Configuration

Update `vercel.json` for any custom routing or build settings.

## Environment Variables

Required environment variables:
- `OPENAI_API_KEY`: Your OpenAI API key
- `KV_REST_API_URL`: Vercel KV REST API URL
- `KV_REST_API_TOKEN`: Vercel KV REST API Token