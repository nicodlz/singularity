import type { Ctx } from 'boardgame.io';
import type { GameState, PlayerState, Probe, Building } from './types';
import { generateTiles } from './utils/board';
import {
  INITIAL_RESOURCES,
  INITIAL_PROBES,
  INITIAL_BUILDINGS,
} from './constants';

interface SetupContext {
  ctx: Ctx;
  random: {
    Die: (sides: number) => number;
    Shuffle: <T>(arr: T[]) => T[];
  };
}

/**
 * Create initial probes for a player
 */
function createInitialProbes(playerId: string): Probe[] {
  return Array.from({ length: INITIAL_PROBES }, (_, i) => ({
    id: `${playerId}-probe-${i}`,
    value: null,
    tileId: null,
  }));
}

/**
 * Create initial buildings for a player
 */
function createInitialBuildings(playerId: string): Building[] {
  return INITIAL_BUILDINGS.map((type, i) => ({
    id: `${playerId}-${type}-${i}`,
    type,
    owner: playerId,
    tileId: null,       // Not placed on a tile initially
    activated: false,
  }));
}

/**
 * Create initial state for a player
 */
function createPlayerState(playerId: string): PlayerState {
  return {
    resources: { ...INITIAL_RESOURCES },
    probes: createInitialProbes(playerId),
    buildings: createInitialBuildings(playerId),
  };
}

/**
 * Setup the game state
 */
export function setupGame({ ctx, random }: SetupContext): GameState {
  const numPlayers = ctx.numPlayers;

  // Generate tiles
  const tiles = generateTiles(numPlayers, random);

  // Initialize players
  const players: Record<string, PlayerState> = {};
  for (let i = 0; i < numPlayers; i++) {
    const playerId = String(i);
    players[playerId] = createPlayerState(playerId);
  }

  return {
    tiles,
    players,
    round: 1,
    rolledDice: false,
    diceValues: [],
    deployedValues: [],
    deploymentComplete: false,
    playersFinishedPhase: [],
  };
}
