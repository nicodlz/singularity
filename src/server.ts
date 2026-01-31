import { Server, Origins } from 'boardgame.io/server';
import path from 'path';
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

// Serve static files from Vite build output
const distPath = path.resolve(process.cwd(), 'dist');
const express = await import('express');
server.app.use(express.default.static(distPath));

// SPA fallback - serve index.html for any non-API route
server.app.get('*', (req: any, res: any, next: any) => {
  // Don't intercept boardgame.io API routes
  if (req.path.startsWith('/games') || req.path.startsWith('/socket.io')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

server.run({ port: PORT, callback: () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Serving static files from ${distPath}`);
  console.log(`Lobby API available at http://localhost:${PORT}/games`);
}});
