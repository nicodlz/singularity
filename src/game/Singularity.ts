import type { Game, Ctx } from 'boardgame.io';
import { TurnOrder } from 'boardgame.io/core';
import type { GameState, GameOver } from './types';
import { setupGame } from './setup';
import { VICTORY_INTELLIGENCE } from './constants';
import { onProductionBegin, onControlBegin } from './phases';
import {
  rollProbes,
  deployProbes,
  recallProbe,
  buildBuilding,
  buildProbe,
  activateBuilding,
} from './moves';

export const Singularity: Game<GameState> = {
  name: 'singularity',

  setup: setupGame,

  turn: {
    order: TurnOrder.DEFAULT,
  },

  phases: {
    // Single phase: Players take turns doing everything (deploy + build)
    main: {
      start: true,
      onBegin: ({ G }) => {
        // Production at start of round
        onProductionBegin({ G });
        G.playersFinishedPhase = [];
      },
      moves: {
        // Deployment moves
        rollProbes,
        deployProbes,
        recallProbe,
        // End deployment (allows construction phase)
        endDeployment: ({ G }: { G: GameState }) => {
          G.deploymentComplete = true;
        },
        // Construction moves
        buildBuilding,
        buildProbe,
        activateBuilding,
        // End turn (finishes construction and passes to next player)
        endTurn: ({ G, ctx, events }: { G: GameState; ctx: Ctx; events: { endTurn: () => void } }) => {
          const playerId = ctx.currentPlayer;

          // Mark player as finished
          if (!G.playersFinishedPhase.includes(playerId)) {
            G.playersFinishedPhase.push(playerId);
          }

          // Reset state for next player
          G.rolledDice = false;
          G.diceValues = [];
          G.deployedValues = [];
          G.deploymentComplete = false;

          events.endTurn();
        },
      },
      turn: {
        order: TurnOrder.DEFAULT,
        minMoves: 0,
        onBegin: ({ G }) => {
          // Reset state at start of each player's turn
          G.rolledDice = false;
          G.diceValues = [];
          G.deployedValues = [];
          G.deploymentComplete = false;
        },
      },
      endIf: ({ G, ctx }) => {
        return G.playersFinishedPhase.length >= ctx.numPlayers;
      },
      onEnd: ({ G }) => {
        // Control & Harvest at end of round (after all players played)
        onControlBegin({ G });
        // Increment round
        G.round += 1;
        // Clear for next round
        G.playersFinishedPhase = [];
      },
      next: 'main',
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
      }

      return moves;
    },
  },
};
