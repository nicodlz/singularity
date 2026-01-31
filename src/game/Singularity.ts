import type { Game, Ctx } from 'boardgame.io';
import { TurnOrder } from 'boardgame.io/core';
import type { GameState, GameOver, BuildingType } from './types';
import { setupGame } from './setup';
import { VICTORY_INTELLIGENCE } from './constants';
import { onProductionBegin, onControlBegin } from './phases';
import { calculateTileControl } from './utils/control';
import {
  rollProbes,
  deployProbes,
  recallProbe,
  endDeployment,
  buildBuilding,
  buildProbe,
  activateBuilding,
  endConstruction,
} from './moves';

export const Singularity: Game<GameState> = {
  name: 'singularity',

  setup: setupGame,

  turn: {
    order: TurnOrder.DEFAULT,
  },

  phases: {
    // Phase 1: Production (automatic)
    production: {
      start: true,
      onBegin: ({ G }) => {
        onProductionBegin({ G });
      },
      moves: {},
      turn: {
        order: TurnOrder.DEFAULT,
        minMoves: 0,
      },
      endIf: () => true, // Ends immediately 
      next: 'deployment',
    },

    // Phase 2: Probe deployment (players take turns)
    deployment: {
      moves: {
        rollProbes,
        deployProbes,
        recallProbe,
        endDeployment,
      },
      turn: {
        order: TurnOrder.DEFAULT,
        onBegin: ({ G }) => {
          // Reset state at start of each player's turn
          G.rolledDice = false;
          G.diceValues = [];
          G.deployedValues = [];
          G.deploymentComplete = false;
        },
      },
      endIf: ({ G, ctx }) => {
        // All players have finished deployment
        return G.playersFinishedPhase.length >= ctx.numPlayers;
      },
      onEnd: ({ G }) => {
        G.playersFinishedPhase = [];
      },
      next: 'control',
    },

    // Phase 4: Control and harvest (automatic)
    control: {
      onBegin: ({ G }) => {
        onControlBegin({ G });
      },
      moves: {},
      turn: {
        order: TurnOrder.DEFAULT,
        minMoves: 0,
      },
      endIf: () => true, // Ends immediately
      next: 'construction',
    },

    // Phase 6: Construction (players take turns)
    construction: {
      moves: {
        buildBuilding,
        buildProbe,
        activateBuilding,
        endConstruction,
      },
      turn: {
        order: TurnOrder.DEFAULT,
      },
      endIf: ({ G, ctx }) => {
        // All players have finished construction
        return G.playersFinishedPhase.length >= ctx.numPlayers;
      },
      onEnd: ({ G }) => {
        // Increment round and reset for next round
        G.round += 1;
        G.playersFinishedPhase = [];
      },
      next: 'production',
    },
  },

  // End game when a player reaches victory condition
  endIf: ({ G }): GameOver | undefined => {
    for (const [playerId, player] of Object.entries(G.players)) {
      if (player.resources.intelligence >= VICTORY_INTELLIGENCE) {
        return {
          winner: playerId,
          intelligence: player.resources.intelligence,
        };
      }
    }
    return undefined;
  },

  // AI enumeration for bots
  ai: {
    enumerate: (G, ctx) => {
      const moves: { move: string; args?: unknown[] }[] = [];
      const playerId = ctx.currentPlayer;
      const player = G.players[playerId];

      if (ctx.phase === 'deployment') {
        if (!G.rolledDice) {
          const freeProbes = player.probes.filter(p => p.tileId === null);
          if (freeProbes.length > 0) {
            moves.push({ move: 'rollProbes' });
          }
        }

        if (G.rolledDice) {
          const undeployedValues = G.diceValues.filter(
            v => !G.deployedValues.includes(v)
          );

          for (const value of [...new Set(undeployedValues)]) {
            const matchingTiles = G.tiles.filter(t => t.value === value);
            for (const tile of matchingTiles) {
              moves.push({ move: 'deployProbes', args: [value, tile.id] });
            }
          }
        }

        moves.push({ move: 'endDeployment' });

        for (const probe of player.probes) {
          if (probe.tileId !== null) {
            moves.push({ move: 'recallProbe', args: [probe.id] });
          }
        }
      }

      if (ctx.phase === 'construction') {
        moves.push({ move: 'endConstruction' });
        moves.push({ move: 'buildProbe' });

        // Add building construction moves for controlled tiles
        for (const tile of G.tiles) {
          const control = calculateTileControl(tile, G.players);
          if (control.controller === playerId) {
            const buildingTypes: BuildingType[] = [
              'windTurbine', 'factory', 'orbitalForge', 'bioLab', 
              'condenser', 'chipEngraver', 'biomassFactory', 'turret'
            ];
            for (const buildingType of buildingTypes) {
              moves.push({ move: 'buildBuilding', args: [buildingType, tile.id] });
            }
          }
        }

        // Add building activation moves
        for (const building of player.buildings) {
          if (!building.activated) {
            moves.push({ move: 'activateBuilding', args: [building.id] });
          }
        }
      }

      return moves;
    },
  },
};
