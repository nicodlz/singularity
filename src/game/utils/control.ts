import type { Tile, PlayerState, TileControl, Building } from '../types';

/**
 * Find a building by ID across all players
 */
export function findBuilding(
  buildingId: string,
  players: Record<string, PlayerState>
): Building | undefined {
  for (const player of Object.values(players)) {
    const building = player.buildings.find(b => b.id === buildingId);
    if (building) return building;
  }
  return undefined;
}

/**
 * Calculate control and harvest for a tile
 */
export function calculateTileControl(
  tile: Tile,
  players: Record<string, PlayerState>
): TileControl {
  const strengths: Record<string, number> = {};

  // Count probes per player
  for (const { playerId } of tile.probes) {
    strengths[playerId] = (strengths[playerId] || 0) + 1;
  }

  // Add turrets
  for (const buildingId of tile.buildings) {
    const building = findBuilding(buildingId, players);
    if (building && building.type === 'turret') {
      strengths[building.owner] = (strengths[building.owner] || 0) + 1;
    }
  }

  // Sort by strength
  const sorted = Object.entries(strengths).sort((a, b) => b[1] - a[1]);

  // No one controls empty tile
  if (sorted.length === 0) {
    return { controller: null, strengths, harvestCount: 0 };
  }

  // Check for tie at top
  if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) {
    return { controller: null, strengths, harvestCount: 0 };
  }

  const controller = sorted[0][0];
  const controllerStrength = sorted[0][1];

  // Calculate harvest: probes not occupied by control
  // Occupied = need to match the strongest opponent
  const strongestOpponent = sorted.length > 1 ? sorted[1][1] : 0;
  const controllerProbeCount = tile.probes.filter(p => p.playerId === controller).length;

  // Probes occupied in control = opponent strength (those "matched")
  const occupiedProbes = strongestOpponent;
  const harvestingProbes = Math.max(0, controllerProbeCount - occupiedProbes);
  const harvestCount = Math.min(harvestingProbes, tile.resourceCount);

  return { controller, strengths, harvestCount };
}

/**
 * Get all buildings on a tile owned by a specific player
 */
export function getPlayerBuildingsOnTile(
  tile: Tile,
  playerId: string,
  players: Record<string, PlayerState>
): Building[] {
  const buildings: Building[] = [];

  for (const buildingId of tile.buildings) {
    const building = findBuilding(buildingId, players);
    if (building && building.owner === playerId) {
      buildings.push(building);
    }
  }

  return buildings;
}

/**
 * Get all enemy buildings on a tile (not owned by controller)
 */
export function getEnemyBuildingsOnTile(
  tile: Tile,
  controllerId: string,
  players: Record<string, PlayerState>
): Building[] {
  const buildings: Building[] = [];

  for (const buildingId of tile.buildings) {
    const building = findBuilding(buildingId, players);
    if (building && building.owner !== controllerId) {
      buildings.push(building);
    }
  }

  return buildings;
}

/**
 * Transfer building ownership
 */
export function captureBuilding(
  building: Building,
  newOwner: string,
  players: Record<string, PlayerState>
): void {
  // Remove from old owner
  const oldOwnerState = players[building.owner];
  if (oldOwnerState) {
    const index = oldOwnerState.buildings.findIndex(b => b.id === building.id);
    if (index !== -1) {
      oldOwnerState.buildings.splice(index, 1);
    }
  }

  // Add to new owner
  building.owner = newOwner;
  players[newOwner].buildings.push(building);
}
