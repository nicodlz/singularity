import type { Resources, PlayerState, BuildingType, Tile } from '../types';
import { BUILDING_COSTS, PROBE_COST, MAX_PROBES } from '../constants';
import { calculateTileControl } from './control';

/**
 * Check if player has enough resources
 */
export function hasResources(
  playerResources: Resources,
  cost: Partial<Resources>
): boolean {
  for (const [resource, amount] of Object.entries(cost)) {
    if ((playerResources[resource as keyof Resources] || 0) < (amount || 0)) {
      return false;
    }
  }
  return true;
}

/**
 * Deduct resources from player
 */
export function deductResources(
  playerResources: Resources,
  cost: Partial<Resources>
): void {
  for (const [resource, amount] of Object.entries(cost)) {
    playerResources[resource as keyof Resources] -= amount || 0;
  }
}

/**
 * Add resources to player
 */
export function addResources(
  playerResources: Resources,
  gain: Partial<Resources>
): void {
  for (const [resource, amount] of Object.entries(gain)) {
    playerResources[resource as keyof Resources] += amount || 0;
  }
}

/**
 * Check if player can build a building
 */
export function canBuild(
  player: PlayerState,
  buildingType: BuildingType,
  tile: Tile,
  players: Record<string, PlayerState>,
  playerId: string
): { valid: boolean; reason?: string } {
  // Check if player controls the tile
  const control = calculateTileControl(tile, players);
  if (control.controller !== playerId) {
    return { valid: false, reason: 'You do not control this tile' };
  }

  // Check resources
  const cost = BUILDING_COSTS[buildingType];
  if (!hasResources(player.resources, cost)) {
    return { valid: false, reason: 'Not enough resources' };
  }

  // Check if player has a factory (required for construction)
  const hasFactory = player.buildings.some(b => b.type === 'factory');
  if (!hasFactory) {
    return { valid: false, reason: 'You need a factory to build' };
  }

  return { valid: true };
}

/**
 * Check if player can build a new probe
 */
export function canBuildProbe(player: PlayerState): { valid: boolean; reason?: string } {
  if (player.probes.length >= MAX_PROBES) {
    return { valid: false, reason: `Maximum ${MAX_PROBES} probes reached` };
  }

  if (!hasResources(player.resources, PROBE_COST)) {
    return { valid: false, reason: 'Not enough resources' };
  }

  return { valid: true };
}

/**
 * Check if player has enough energy
 */
export function hasEnergy(player: PlayerState, amount: number): boolean {
  return player.resources.energy >= amount;
}
