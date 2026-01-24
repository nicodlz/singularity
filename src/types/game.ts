import type { Ctx } from 'boardgame.io';
import type { BoardProps as BGIOBoardProps } from 'boardgame.io/react';

// Re-export game types
export type {
  GameState,
  PlayerState,
  Resources,
  Tile,
  Probe,
  Building,
  BuildingType,
  TileControl,
  GameOver,
} from '../game/types';

// Import for local use
import type { GameState } from '../game/types';

// Board props for Singularity
export type BoardProps = BGIOBoardProps<GameState>;

// Lobby types
export interface LobbyMatch {
  matchID: string;
  players: LobbyPlayer[];
  createdAt: number;
  updatedAt: number;
  gameover?: { winner: string };
  unlisted?: boolean;
}

export interface LobbyPlayer {
  id: number;
  name?: string;
  isConnected?: boolean;
}

export interface PlayerCredentials {
  matchID: string;
  playerID: string;
  credentials: string;
  playerName: string;
}
