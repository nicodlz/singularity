import { Server, Origins } from 'boardgame.io/server';
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

server.run({ port: PORT, callback: () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Lobby API available at http://localhost:${PORT}/games`);
}});
