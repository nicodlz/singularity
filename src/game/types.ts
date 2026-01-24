import type { Ctx, Game } from 'boardgame.io';

// ============ Resources ============

export type RawResource = 'metal' | 'organic' | 'energy';
export type RefinedResource = 'alloy' | 'biomass' | 'plasma';
export type FinalResource = 'intelligence';
export type ResourceType = RawResource | RefinedResource | FinalResource;

export interface Resources {
  // Raw
  metal: number;
  organic: number;
  energy: number;
  // Refined
  alloy: number;
  biomass: number;
  plasma: number;
  // Final
  intelligence: number;
}

// ============ Buildings ============

export type BuildingType =
  | 'windTurbine'    // +2 energy/turn
  | 'factory'        // Enables construction
  | 'orbitalForge'   // 2 metal → 1 alloy
  | 'bioLab'         // 2 organic → 1 biomass
  | 'condenser'      // 3 energy → 1 plasma
  | 'chipEngraver'   // 1 alloy + 1 biomass → 1 intelligence
  | 'biomassFactory' // Burn 1 biomass → +2 energy
  | 'turret';        // +1 defense on tile

export interface Building {
  id: string;
  type: BuildingType;
  owner: string;
  tileId: number | null;
  activated: boolean;
}

// ============ Probes (Dice) ============

export interface Probe {
  id: string;
  value: number | null;  // 1-6 after roll, null if not rolled
  tileId: number | null; // null if in reserve
}

// ============ Tiles ============

export interface TileProbe {
  playerId: string;
  probeId: string;
}

export interface Tile {
  id: number;
  value: number;              // 1-6, matches dice values
  resourceType: 'metal' | 'organic';
  resourceCount: number;
  probes: TileProbe[];
  buildings: string[];        // Building IDs
}

// ============ Player State ============

export interface PlayerState {
  resources: Resources;
  probes: Probe[];
  buildings: Building[];
}

// ============ Game State ============

export type GamePhase = 'main';

export interface GameState {
  tiles: Tile[];
  players: Record<string, PlayerState>;
  round: number;
  // Deployment phase state
  rolledDice: boolean;
  diceValues: number[];
  deployedValues: number[];
  deploymentComplete: boolean; // True when player finished deploying and can now build
  // Track which players have finished their turn in current phase
  playersFinishedPhase: string[];
}

// ============ Game Over ============

export interface GameOver {
  winner: string;
  intelligence: number;
}

// ============ Game Type ============

export type SingularityGame = Game<GameState>;

// ============ Move Context ============

export interface MoveContext {
  G: GameState;
  ctx: Ctx;
  playerID: string;
  events: {
    endTurn: (args?: { next?: string }) => void;
    endPhase: () => void;
    setPhase: (phase: string) => void;
  };
  random: {
    D6: (count?: number) => number | number[];
    Die: (sides: number) => number;
    Shuffle: <T>(arr: T[]) => T[];
  };
}

// ============ Control ============

export interface TileControl {
  controller: string | null;
  strengths: Record<string, number>;
  harvestCount: number;
}
