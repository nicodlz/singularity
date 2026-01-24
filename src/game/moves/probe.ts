import { INVALID_MOVE } from 'boardgame.io/core';
import type { Ctx } from 'boardgame.io';
import type { GameState } from '../types';
import { DEPLOY_ENERGY_COST, RECALL_ENERGY_COST } from '../constants';
import { getTile } from '../utils/board';
import { hasEnergy } from '../utils/validation';

interface MoveContext {
  G: GameState;
  ctx: Ctx;
  events: {
    endTurn: () => void;
    endPhase: () => void;
  };
  random: {
    D6: (count?: number) => number | number[];
  };
}

/**
 * Roll all free probes (not deployed)
 */
export function rollProbes({ G, ctx, random }: MoveContext): typeof INVALID_MOVE | void {
  const playerId = ctx.currentPlayer;
  const player = G.players[playerId];

  // Check if already rolled this turn
  if (G.rolledDice) {
    return INVALID_MOVE;
  }

  // Get free probes (not deployed)
  const freeProbes = player.probes.filter(p => p.tileId === null);

  if (freeProbes.length === 0) {
    return INVALID_MOVE;
  }

  // Roll dice for each free probe
  const rolls = random.D6(freeProbes.length) as number[];
  const rollArray = Array.isArray(rolls) ? rolls : [rolls];

  freeProbes.forEach((probe, i) => {
    probe.value = rollArray[i];
  });

  // Track rolled values for this player
  G.rolledDice = true;
  G.diceValues = rollArray;
  G.deployedValues = [];
}

/**
 * Deploy probes of a specific value to a tile
 */
export function deployProbes(
  { G, ctx }: MoveContext,
  diceValue: number,
  tileId: number
): typeof INVALID_MOVE | void {
  const playerId = ctx.currentPlayer;
  const player = G.players[playerId];

  // Must have rolled first
  if (!G.rolledDice) {
    return INVALID_MOVE;
  }

  // Check if this value was already deployed
  if (G.deployedValues.includes(diceValue)) {
    return INVALID_MOVE;
  }

  // Validate dice value
  if (diceValue < 1 || diceValue > 6) {
    return INVALID_MOVE;
  }

  // Get probes with this value that are not deployed
  const probesToDeploy = player.probes.filter(
    p => p.value === diceValue && p.tileId === null
  );

  if (probesToDeploy.length === 0) {
    return INVALID_MOVE;
  }

  // Check tile exists and matches dice value
  const tile = getTile(G.tiles, tileId);
  if (!tile || tile.value !== diceValue) {
    return INVALID_MOVE;
  }

  // Check energy cost
  const energyCost = probesToDeploy.length * DEPLOY_ENERGY_COST;
  if (!hasEnergy(player, energyCost)) {
    return INVALID_MOVE;
  }

  // Deduct energy
  player.resources.energy -= energyCost;

  // Deploy probes
  for (const probe of probesToDeploy) {
    probe.tileId = tileId;
    tile.probes.push({ playerId, probeId: probe.id });
  }

  // Mark value as deployed
  G.deployedValues.push(diceValue);
}

/**
 * Recall a probe from a tile
 */
export function recallProbe(
  { G, ctx }: MoveContext,
  probeId: string
): typeof INVALID_MOVE | void {
  const playerId = ctx.currentPlayer;
  const player = G.players[playerId];

  // Find probe
  const probe = player.probes.find(p => p.id === probeId);
  if (!probe || probe.tileId === null) {
    return INVALID_MOVE;
  }

  // Check energy
  if (!hasEnergy(player, RECALL_ENERGY_COST)) {
    return INVALID_MOVE;
  }

  // Find tile and remove probe
  const tile = getTile(G.tiles, probe.tileId);
  if (tile) {
    const probeIndex = tile.probes.findIndex(
      p => p.playerId === playerId && p.probeId === probeId
    );
    if (probeIndex !== -1) {
      tile.probes.splice(probeIndex, 1);
    }
  }

  // Deduct energy
  player.resources.energy -= RECALL_ENERGY_COST;

  // Reset probe
  probe.tileId = null;
  probe.value = null;
}

/**
 * End deployment turn
 */
export function endDeployment({ G, ctx, events }: MoveContext): void {
  const playerId = ctx.currentPlayer;

  // Mark this player as finished with this phase
  if (!G.playersFinishedPhase.includes(playerId)) {
    G.playersFinishedPhase.push(playerId);
  }

  // Reset dice state for next player's turn
  G.rolledDice = false;
  G.diceValues = [];
  G.deployedValues = [];

  // End this player's turn
  events.endTurn();
}
