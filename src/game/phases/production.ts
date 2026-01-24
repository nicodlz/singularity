import type { GameState } from '../types';
import { WIND_TURBINE_PRODUCTION } from '../constants';

/**
 * Production phase - runs automatically at the start of each round
 * - Wind turbines produce energy
 * - Reset building activations
 */
export function onProductionBegin({ G }: { G: GameState }): void {
  // Process each player
  for (const playerId of Object.keys(G.players)) {
    const player = G.players[playerId];

    // Reset all building activations
    for (const building of player.buildings) {
      building.activated = false;
    }

    // Wind turbines produce energy
    const windTurbines = player.buildings.filter(b => b.type === 'windTurbine');
    const energyProduced = windTurbines.length * WIND_TURBINE_PRODUCTION;

    player.resources.energy += energyProduced;
  }
}

/**
 * Production phase ends immediately (no player actions)
 */
export function productionEndIf(): boolean {
  return true; // Always end immediately
}
