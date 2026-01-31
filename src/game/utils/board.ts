import type { Tile } from '../types';
import { TILE_CONFIG } from '../constants';

interface RandomAPI {
  Die: (sides: number) => number;
  Shuffle: <T>(arr: T[]) => T[];
}

/**
 * Generate tiles based on player count
 */
export function generateTiles(numPlayers: number, random: RandomAPI): Tile[] {
  const config = TILE_CONFIG[String(numPlayers)] || TILE_CONFIG['2'];
  const tiles: Tile[] = [];

  let tileId = 0;

  // Create tiles for each dice value (1-6)
  for (let value = 1; value <= 6; value++) {
    const count = config.tilesPerValue[value - 1];

    for (let i = 0; i < count; i++) {
      tiles.push({
        id: tileId++,
        value,
        resourceType: 'metal', // Will be assigned later
        resourceCount: 0,      // Will be assigned later
        probes: [],
        buildings: [],
      });
    }
  }

  // Shuffle tiles
  const shuffledTiles = random.Shuffle(tiles);

  // Assign resource types (ensure minimum per type)
  const totalTiles = shuffledTiles.length;
  const minPerType = config.minResourcesPerType;
  
  // Ensure minimum per type, distribute remaining randomly
  const remainingTiles = totalTiles - (2 * minPerType);
  const bonusMetalTiles = remainingTiles > 0 ? Math.floor(remainingTiles / 2) : 0;
  const bonusOrganicTiles = remainingTiles - bonusMetalTiles;
  
  const metalCount = minPerType + bonusMetalTiles;
  const organicCount = minPerType + bonusOrganicTiles;

  const resourceTypes: ('metal' | 'organic')[] = [
    ...Array(metalCount).fill('metal'),
    ...Array(organicCount).fill('organic'),
  ];

  const shuffledTypes = random.Shuffle(resourceTypes);

  // Assign resource types and counts
  shuffledTiles.forEach((tile, index) => {
    tile.resourceType = shuffledTypes[index];
    // 1d4+4 = 5-8 resources per tile
    tile.resourceCount = random.Die(4) + 4;
  });

  return shuffledTiles;
}

/**
 * Find a tile by ID
 */
export function getTile(tiles: Tile[], tileId: number): Tile | undefined {
  return tiles.find(t => t.id === tileId);
}

/**
 * Get tiles matching a dice value
 */
export function getTilesByValue(tiles: Tile[], value: number): Tile[] {
  return tiles.filter(t => t.value === value);
}

/**
 * Check if a tile has available resources
 */
export function tileHasResources(tile: Tile): boolean {
  return tile.resourceCount > 0;
}
