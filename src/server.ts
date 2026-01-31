import { Server, Origins } from 'boardgame.io/server';
import path from 'path';
import fs from 'fs';
import serve from 'koa-static';
import { Singularity } from './game';

const server = Server({
  games: [Singularity],
  origins: [
    Origins.LOCALHOST,
    /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
    /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
    /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:\d+$/,
    /^https?:\/\/.*\.ndlz\.net$/,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ],
});

const PORT = Number(process.env.PORT) || 8000;

// Serve static files from Vite build output (boardgame.io uses Koa)
const distPath = path.resolve(process.cwd(), 'dist');
server.app.use(serve(distPath));

// SPA fallback - serve index.html for non-API, non-file routes
const indexHtml = path.join(distPath, 'index.html');
server.app.use(async (ctx, next) => {
  await next();
  if (ctx.status === 404 && !ctx.path.startsWith('/games') && !ctx.path.startsWith('/socket.io') && !ctx.path.startsWith('/.well-known')) {
    ctx.type = 'html';
    ctx.body = fs.createReadStream(indexHtml);
  }
});

server.run({ port: PORT, callback: () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Serving static files from ${distPath}`);
  console.log(`Lobby API available at http://localhost:${PORT}/games`);
}});
