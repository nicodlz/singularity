import type { GameState } from '../types';
import {
  calculateTileControl,
  getEnemyBuildingsOnTile,
  captureBuilding,
} from '../utils/control';

/**
 * Control phase - runs automatically
 * - Calculate control for each tile
 * - Capture enemy buildings
 * - Harvest resources
 */
export function onControlBegin({ G }: { G: GameState }): void {
  // Process each tile
  for (const tile of G.tiles) {
    const control = calculateTileControl(tile, G.players);

    // Skip tiles with no controller
    if (!control.controller) continue;

    const controllerId = control.controller;
    const controllerState = G.players[controllerId];

    // Capture enemy buildings
    const enemyBuildings = getEnemyBuildingsOnTile(tile, controllerId, G.players);
    for (const building of enemyBuildings) {
      captureBuilding(building, controllerId, G.players);
    }

    // Harvest resources
    if (control.harvestCount > 0 && tile.resourceCount > 0) {
      const harvestAmount = Math.min(control.harvestCount, tile.resourceCount);

      // Add resources to controller
      controllerState.resources[tile.resourceType] += harvestAmount;

      // Deplete tile resources
      tile.resourceCount -= harvestAmount;
    }
  }
}

/**
 * Control phase ends immediately (no player actions)
 */
export function controlEndIf(): boolean {
  return true;
}
