import type { BuildingType, Resources } from './types';

// ============ Victory ============

export const VICTORY_INTELLIGENCE = 10;

// ============ Probes ============

export const INITIAL_PROBES = 3;
export const MAX_PROBES = 12;

export const PROBE_COST: Partial<Resources> = {
  alloy: 1,
  organic: 1,
};

// ============ Energy Costs ============

export const DEPLOY_ENERGY_COST = 1;      // Per probe deployed
export const RECALL_ENERGY_COST = 1;      // Per probe recalled
export const ACTIVATE_ENERGY_COST = 1;    // Per building activated

// ============ Building Costs ============

export const BUILDING_COSTS: Record<BuildingType, Partial<Resources>> = {
  windTurbine: { metal: 2, organic: 1 },
  factory: { metal: 2 },
  orbitalForge: { metal: 2 },
  bioLab: { organic: 2 },
  condenser: { energy: 3 },
  chipEngraver: { alloy: 1, biomass: 1 },
  biomassFactory: { metal: 1, biomass: 1 },
  turret: { metal: 1, energy: 1 },
};

// ============ Building Production ============

export const WIND_TURBINE_PRODUCTION = 2;
export const BIOMASS_FACTORY_PRODUCTION = 2;

export const BUILDING_CONVERSIONS: Partial<Record<BuildingType, {
  input: Partial<Resources>;
  output: Partial<Resources>;
}>> = {
  orbitalForge: {
    input: { metal: 2 },
    output: { alloy: 1 },
  },
  bioLab: {
    input: { organic: 2 },
    output: { biomass: 1 },
  },
  condenser: {
    input: { energy: 3 },
    output: { plasma: 1 },
  },
  chipEngraver: {
    input: { alloy: 1, biomass: 1 },
    output: { intelligence: 1 },
  },
  biomassFactory: {
    input: { biomass: 1 },
    output: { energy: 2 },
  },
};

// ============ Tile Configuration ============

export const TILE_CONFIG: Record<string, {
  tileCount: number;
  tilesPerValue: number[];
  minResourcesPerType: number;
}> = {
  '2': {
    tileCount: 12,
    tilesPerValue: [2, 2, 2, 2, 2, 2], // 2 tiles per value 1-6
    minResourcesPerType: 3,
  },
  '3': {
    tileCount: 12,
    tilesPerValue: [2, 2, 2, 2, 2, 2],
    minResourcesPerType: 3,
  },
  '4': {
    tileCount: 16,
    tilesPerValue: [3, 3, 3, 3, 2, 2], // 3 tiles for 1-4, 2 for 5-6
    minResourcesPerType: 4,
  },
  '5': {
    tileCount: 16,
    tilesPerValue: [3, 3, 3, 3, 2, 2],
    minResourcesPerType: 4,
  },
};

// ============ Initial Resources ============

export const INITIAL_RESOURCES: Resources = {
  metal: 0,
  organic: 0,
  energy: 3,  // Start with 3 to deploy all 3 initial probes on turn 1
  alloy: 0,
  biomass: 0,
  plasma: 0,
  intelligence: 0,
};

// ============ Initial Buildings ============

export const INITIAL_BUILDINGS: BuildingType[] = ['factory', 'windTurbine'];
