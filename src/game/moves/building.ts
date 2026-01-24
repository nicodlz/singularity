import { INVALID_MOVE } from 'boardgame.io/core';
import type { Ctx } from 'boardgame.io';
import type { GameState, BuildingType, Building } from '../types';
import {
  BUILDING_COSTS,
  BUILDING_CONVERSIONS,
  ACTIVATE_ENERGY_COST,
  PROBE_COST,
} from '../constants';
import { getTile } from '../utils/board';
import {
  canBuild,
  canBuildProbe,
  hasResources,
  deductResources,
  addResources,
  hasEnergy,
} from '../utils/validation';

interface MoveContext {
  G: GameState;
  ctx: Ctx;
  events: {
    endTurn: () => void;
    endPhase: () => void;
  };
}

let buildingCounter = 0;

/**
 * Build a new building on a controlled tile
 */
export function buildBuilding(
  { G, ctx }: MoveContext,
  buildingType: BuildingType,
  tileId: number
): typeof INVALID_MOVE | void {
  const playerId = ctx.currentPlayer;
  const player = G.players[playerId];

  const tile = getTile(G.tiles, tileId);
  if (!tile) return INVALID_MOVE;

  // Validate
  const validation = canBuild(player, buildingType, tile, G.players, playerId);
  if (!validation.valid) {
    return INVALID_MOVE;
  }

  // Deduct cost
  const cost = BUILDING_COSTS[buildingType];
  deductResources(player.resources, cost);

  // Create building
  const building: Building = {
    id: `${playerId}-${buildingType}-${++buildingCounter}`,
    type: buildingType,
    owner: playerId,
    tileId,
    activated: false,
  };

  // Add to player and tile
  player.buildings.push(building);
  tile.buildings.push(building.id);
}

/**
 * Build a new probe
 */
export function buildProbe({ G, ctx }: MoveContext): typeof INVALID_MOVE | void {
  const playerId = ctx.currentPlayer;
  const player = G.players[playerId];

  // Validate
  const validation = canBuildProbe(player);
  if (!validation.valid) {
    return INVALID_MOVE;
  }

  // Deduct cost
  deductResources(player.resources, PROBE_COST);

  // Create probe
  const probeId = `${playerId}-probe-${player.probes.length}`;
  player.probes.push({
    id: probeId,
    value: null,
    tileId: null,
  });
}

/**
 * Activate a production building (forge, lab, condenser, chip engraver, biomass factory)
 */
export function activateBuilding(
  { G, ctx }: MoveContext,
  buildingId: string
): typeof INVALID_MOVE | void {
  const playerId = ctx.currentPlayer;
  const player = G.players[playerId];

  // Find building
  const building = player.buildings.find(b => b.id === buildingId);
  if (!building) return INVALID_MOVE;

  // Check ownership
  if (building.owner !== playerId) return INVALID_MOVE;

  // Check not already activated
  if (building.activated) return INVALID_MOVE;

  // Check if it's a production building
  const conversion = BUILDING_CONVERSIONS[building.type];
  if (!conversion) return INVALID_MOVE;

  // Check energy for activation
  if (!hasEnergy(player, ACTIVATE_ENERGY_COST)) {
    return INVALID_MOVE;
  }

  // Check input resources
  if (!hasResources(player.resources, conversion.input)) {
    return INVALID_MOVE;
  }

  // Deduct energy
  player.resources.energy -= ACTIVATE_ENERGY_COST;

  // Deduct input resources
  deductResources(player.resources, conversion.input);

  // Add output resources
  addResources(player.resources, conversion.output);

  // Mark as activated
  building.activated = true;
}

/**
 * End construction turn - ends this player's turn
 */
export function endConstruction({ G, ctx, events }: MoveContext): void {
  const playerId = ctx.currentPlayer;

  // Mark this player as finished with this phase
  if (!G.playersFinishedPhase.includes(playerId)) {
    G.playersFinishedPhase.push(playerId);
  }

  // End this player's turn
  events.endTurn();
}
