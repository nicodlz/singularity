"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/server.ts
var import_server = require("boardgame.io/server");
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_koa_static = __toESM(require("koa-static"), 1);

// src/game/Singularity.ts
var import_core3 = require("boardgame.io/core");

// src/game/constants.ts
var VICTORY_INTELLIGENCE = 10;
var INITIAL_PROBES = 3;
var MAX_PROBES = 12;
var PROBE_COST = {
  alloy: 1,
  organic: 1
};
var DEPLOY_ENERGY_COST = 1;
var RECALL_ENERGY_COST = 1;
var ACTIVATE_ENERGY_COST = 1;
var BUILDING_COSTS = {
  windTurbine: { metal: 2, organic: 1 },
  factory: { metal: 2 },
  orbitalForge: { metal: 2 },
  bioLab: { organic: 2 },
  condenser: { energy: 3 },
  chipEngraver: { alloy: 1, biomass: 1 },
  biomassFactory: { metal: 1, biomass: 1 },
  turret: { metal: 1, energy: 1 }
};
var WIND_TURBINE_PRODUCTION = 2;
var BUILDING_CONVERSIONS = {
  orbitalForge: {
    input: { metal: 2 },
    output: { alloy: 1 }
  },
  bioLab: {
    input: { organic: 2 },
    output: { biomass: 1 }
  },
  condenser: {
    input: { energy: 3 },
    output: { plasma: 1 }
  },
  chipEngraver: {
    input: { alloy: 1, biomass: 1 },
    output: { intelligence: 1 }
  },
  biomassFactory: {
    input: { biomass: 1 },
    output: { energy: 2 }
  }
};
var TILE_CONFIG = {
  "2": {
    tileCount: 12,
    tilesPerValue: [2, 2, 2, 2, 2, 2],
    // 2 tiles per value 1-6
    minResourcesPerType: 3
  },
  "3": {
    tileCount: 12,
    tilesPerValue: [2, 2, 2, 2, 2, 2],
    minResourcesPerType: 3
  },
  "4": {
    tileCount: 16,
    tilesPerValue: [3, 3, 3, 3, 2, 2],
    // 3 tiles for 1-4, 2 for 5-6
    minResourcesPerType: 4
  },
  "5": {
    tileCount: 16,
    tilesPerValue: [3, 3, 3, 3, 2, 2],
    minResourcesPerType: 4
  }
};
var INITIAL_RESOURCES = {
  metal: 0,
  organic: 0,
  energy: 3,
  // Start with 3 to deploy all 3 initial probes on turn 1
  alloy: 0,
  biomass: 0,
  plasma: 0,
  intelligence: 0
};
var INITIAL_BUILDINGS = ["factory", "windTurbine"];

// src/game/utils/board.ts
function generateTiles(numPlayers, random) {
  const config = TILE_CONFIG[String(numPlayers)] || TILE_CONFIG["2"];
  const tiles = [];
  let tileId = 0;
  for (let value = 1; value <= 6; value++) {
    const count = config.tilesPerValue[value - 1];
    for (let i = 0; i < count; i++) {
      tiles.push({
        id: tileId++,
        value,
        resourceType: "metal",
        // Will be assigned later
        resourceCount: 0,
        // Will be assigned later
        probes: [],
        buildings: []
      });
    }
  }
  const shuffledTiles = random.Shuffle(tiles);
  const totalTiles = shuffledTiles.length;
  const minPerType = config.minResourcesPerType;
  const remainingTiles = totalTiles - 2 * minPerType;
  const bonusMetalTiles = remainingTiles > 0 ? Math.floor(remainingTiles / 2) : 0;
  const bonusOrganicTiles = remainingTiles - bonusMetalTiles;
  const metalCount = minPerType + bonusMetalTiles;
  const organicCount = minPerType + bonusOrganicTiles;
  const resourceTypes = [
    ...Array(metalCount).fill("metal"),
    ...Array(organicCount).fill("organic")
  ];
  const shuffledTypes = random.Shuffle(resourceTypes);
  shuffledTiles.forEach((tile, index) => {
    tile.resourceType = shuffledTypes[index];
    tile.resourceCount = random.Die(4) + 4;
  });
  return shuffledTiles;
}
function getTile(tiles, tileId) {
  return tiles.find((t) => t.id === tileId);
}

// src/game/setup.ts
function createInitialProbes(playerId) {
  return Array.from({ length: INITIAL_PROBES }, (_, i) => ({
    id: `${playerId}-probe-${i}`,
    value: null,
    tileId: null
  }));
}
function createInitialBuildings(playerId) {
  return INITIAL_BUILDINGS.map((type, i) => ({
    id: `${playerId}-${type}-${i}`,
    type,
    owner: playerId,
    tileId: null,
    // Not placed on a tile initially
    activated: false
  }));
}
function createPlayerState(playerId) {
  return {
    resources: { ...INITIAL_RESOURCES },
    probes: createInitialProbes(playerId),
    buildings: createInitialBuildings(playerId)
  };
}
function setupGame({ ctx, random }) {
  const numPlayers = ctx.numPlayers;
  const tiles = generateTiles(numPlayers, random);
  const players = {};
  for (let i = 0; i < numPlayers; i++) {
    const playerId = String(i);
    players[playerId] = createPlayerState(playerId);
  }
  return {
    tiles,
    players,
    round: 1,
    rolledDice: false,
    diceValues: [],
    deployedValues: [],
    deploymentComplete: false,
    playersFinishedPhase: []
  };
}

// src/game/phases/production.ts
function onProductionBegin({ G }) {
  for (const playerId of Object.keys(G.players)) {
    const player = G.players[playerId];
    for (const building of player.buildings) {
      building.activated = false;
    }
    const windTurbines = player.buildings.filter((b) => b.type === "windTurbine");
    const energyProduced = windTurbines.length * WIND_TURBINE_PRODUCTION;
    player.resources.energy += energyProduced;
  }
}

// src/game/utils/control.ts
function findBuilding(buildingId, players) {
  for (const player of Object.values(players)) {
    const building = player.buildings.find((b) => b.id === buildingId);
    if (building) return building;
  }
  return void 0;
}
function calculateTileControl(tile, players) {
  const strengths = {};
  for (const { playerId } of tile.probes) {
    strengths[playerId] = (strengths[playerId] || 0) + 1;
  }
  for (const buildingId of tile.buildings) {
    const building = findBuilding(buildingId, players);
    if (building && building.type === "turret") {
      strengths[building.owner] = (strengths[building.owner] || 0) + 1;
    }
  }
  const sorted = Object.entries(strengths).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) {
    return { controller: null, strengths, harvestCount: 0 };
  }
  if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) {
    return { controller: null, strengths, harvestCount: 0 };
  }
  const controller = sorted[0][0];
  const controllerStrength = sorted[0][1];
  const strongestOpponent = sorted.length > 1 ? sorted[1][1] : 0;
  const controllerProbeCount = tile.probes.filter((p) => p.playerId === controller).length;
  const occupiedProbes = strongestOpponent;
  const harvestingProbes = Math.max(0, controllerProbeCount - occupiedProbes);
  const harvestCount = Math.min(harvestingProbes, tile.resourceCount);
  return { controller, strengths, harvestCount };
}
function getEnemyBuildingsOnTile(tile, controllerId, players) {
  const buildings = [];
  for (const buildingId of tile.buildings) {
    const building = findBuilding(buildingId, players);
    if (building && building.owner !== controllerId) {
      buildings.push(building);
    }
  }
  return buildings;
}
function captureBuilding(building, newOwner, players) {
  const oldOwnerState = players[building.owner];
  if (oldOwnerState) {
    const index = oldOwnerState.buildings.findIndex((b) => b.id === building.id);
    if (index !== -1) {
      oldOwnerState.buildings.splice(index, 1);
    }
  }
  building.owner = newOwner;
  players[newOwner].buildings.push(building);
}

// src/game/phases/control.ts
function onControlBegin({ G }) {
  for (const tile of G.tiles) {
    const control = calculateTileControl(tile, G.players);
    if (!control.controller) continue;
    const controllerId = control.controller;
    const controllerState = G.players[controllerId];
    const enemyBuildings = getEnemyBuildingsOnTile(tile, controllerId, G.players);
    for (const building of enemyBuildings) {
      captureBuilding(building, controllerId, G.players);
    }
    if (control.harvestCount > 0 && tile.resourceCount > 0) {
      const harvestAmount = Math.min(control.harvestCount, tile.resourceCount);
      controllerState.resources[tile.resourceType] += harvestAmount;
      tile.resourceCount -= harvestAmount;
    }
  }
}

// src/game/moves/probe.ts
var import_core = require("boardgame.io/core");

// src/game/utils/validation.ts
function hasResources(playerResources, cost) {
  for (const [resource, amount] of Object.entries(cost)) {
    if ((playerResources[resource] || 0) < (amount || 0)) {
      return false;
    }
  }
  return true;
}
function deductResources(playerResources, cost) {
  for (const [resource, amount] of Object.entries(cost)) {
    playerResources[resource] -= amount || 0;
  }
}
function addResources(playerResources, gain) {
  for (const [resource, amount] of Object.entries(gain)) {
    playerResources[resource] += amount || 0;
  }
}
function canBuild(player, buildingType, tile, players, playerId) {
  const control = calculateTileControl(tile, players);
  if (control.controller !== playerId) {
    return { valid: false, reason: "You do not control this tile" };
  }
  const cost = BUILDING_COSTS[buildingType];
  if (!hasResources(player.resources, cost)) {
    return { valid: false, reason: "Not enough resources" };
  }
  const hasFactory = player.buildings.some((b) => b.type === "factory");
  if (!hasFactory) {
    return { valid: false, reason: "You need a factory to build" };
  }
  return { valid: true };
}
function canBuildProbe(player) {
  if (player.probes.length >= MAX_PROBES) {
    return { valid: false, reason: `Maximum ${MAX_PROBES} probes reached` };
  }
  if (!hasResources(player.resources, PROBE_COST)) {
    return { valid: false, reason: "Not enough resources" };
  }
  return { valid: true };
}
function hasEnergy(player, amount) {
  return player.resources.energy >= amount;
}

// src/game/moves/probe.ts
function rollProbes({ G, ctx, random }) {
  const playerId = ctx.currentPlayer;
  const player = G.players[playerId];
  if (G.rolledDice) {
    return import_core.INVALID_MOVE;
  }
  const freeProbes = player.probes.filter((p) => p.tileId === null);
  if (freeProbes.length === 0) {
    return import_core.INVALID_MOVE;
  }
  const rolls = random.D6(freeProbes.length);
  const rollArray = Array.isArray(rolls) ? rolls : [rolls];
  freeProbes.forEach((probe, i) => {
    probe.value = rollArray[i];
  });
  G.rolledDice = true;
  G.diceValues = rollArray;
  G.deployedValues = [];
}
function deployProbes({ G, ctx }, diceValue, tileId) {
  const playerId = ctx.currentPlayer;
  const player = G.players[playerId];
  if (!G.rolledDice) {
    return import_core.INVALID_MOVE;
  }
  if (G.deployedValues.includes(diceValue)) {
    return import_core.INVALID_MOVE;
  }
  if (diceValue < 1 || diceValue > 6) {
    return import_core.INVALID_MOVE;
  }
  const probesToDeploy = player.probes.filter(
    (p) => p.value === diceValue && p.tileId === null
  );
  if (probesToDeploy.length === 0) {
    return import_core.INVALID_MOVE;
  }
  const tile = getTile(G.tiles, tileId);
  if (!tile || tile.value !== diceValue) {
    return import_core.INVALID_MOVE;
  }
  const energyCost = probesToDeploy.length * DEPLOY_ENERGY_COST;
  if (!hasEnergy(player, energyCost)) {
    return import_core.INVALID_MOVE;
  }
  player.resources.energy -= energyCost;
  for (const probe of probesToDeploy) {
    probe.tileId = tileId;
    tile.probes.push({ playerId, probeId: probe.id });
  }
  G.deployedValues.push(diceValue);
}
function recallProbe({ G, ctx }, probeId) {
  const playerId = ctx.currentPlayer;
  const player = G.players[playerId];
  const probe = player.probes.find((p) => p.id === probeId);
  if (!probe || probe.tileId === null) {
    return import_core.INVALID_MOVE;
  }
  if (!hasEnergy(player, RECALL_ENERGY_COST)) {
    return import_core.INVALID_MOVE;
  }
  const tile = getTile(G.tiles, probe.tileId);
  if (tile) {
    const probeIndex = tile.probes.findIndex(
      (p) => p.playerId === playerId && p.probeId === probeId
    );
    if (probeIndex !== -1) {
      tile.probes.splice(probeIndex, 1);
    }
  }
  player.resources.energy -= RECALL_ENERGY_COST;
  probe.tileId = null;
  probe.value = null;
}
function endDeployment({ G, ctx, events }) {
  const playerId = ctx.currentPlayer;
  if (!G.playersFinishedPhase.includes(playerId)) {
    G.playersFinishedPhase.push(playerId);
  }
  G.rolledDice = false;
  G.diceValues = [];
  G.deployedValues = [];
  events.endTurn();
}

// src/game/moves/building.ts
var import_core2 = require("boardgame.io/core");
var buildingCounter = 0;
function buildBuilding({ G, ctx }, buildingType, tileId) {
  const playerId = ctx.currentPlayer;
  const player = G.players[playerId];
  const tile = getTile(G.tiles, tileId);
  if (!tile) return import_core2.INVALID_MOVE;
  const validation = canBuild(player, buildingType, tile, G.players, playerId);
  if (!validation.valid) {
    return import_core2.INVALID_MOVE;
  }
  const cost = BUILDING_COSTS[buildingType];
  deductResources(player.resources, cost);
  const building = {
    id: `${playerId}-${buildingType}-${++buildingCounter}`,
    type: buildingType,
    owner: playerId,
    tileId,
    activated: false
  };
  player.buildings.push(building);
  tile.buildings.push(building.id);
}
function buildProbe({ G, ctx }) {
  const playerId = ctx.currentPlayer;
  const player = G.players[playerId];
  const validation = canBuildProbe(player);
  if (!validation.valid) {
    return import_core2.INVALID_MOVE;
  }
  deductResources(player.resources, PROBE_COST);
  const probeId = `${playerId}-probe-${player.probes.length}`;
  player.probes.push({
    id: probeId,
    value: null,
    tileId: null
  });
}
function activateBuilding({ G, ctx }, buildingId) {
  const playerId = ctx.currentPlayer;
  const player = G.players[playerId];
  const building = player.buildings.find((b) => b.id === buildingId);
  if (!building) return import_core2.INVALID_MOVE;
  if (building.owner !== playerId) return import_core2.INVALID_MOVE;
  if (building.activated) return import_core2.INVALID_MOVE;
  const conversion = BUILDING_CONVERSIONS[building.type];
  if (!conversion) return import_core2.INVALID_MOVE;
  if (!hasEnergy(player, ACTIVATE_ENERGY_COST)) {
    return import_core2.INVALID_MOVE;
  }
  if (!hasResources(player.resources, conversion.input)) {
    return import_core2.INVALID_MOVE;
  }
  player.resources.energy -= ACTIVATE_ENERGY_COST;
  deductResources(player.resources, conversion.input);
  addResources(player.resources, conversion.output);
  building.activated = true;
}
function endConstruction({ G, ctx, events }) {
  const playerId = ctx.currentPlayer;
  if (!G.playersFinishedPhase.includes(playerId)) {
    G.playersFinishedPhase.push(playerId);
  }
  events.endTurn();
}

// src/game/Singularity.ts
var Singularity = {
  name: "singularity",
  setup: setupGame,
  turn: {
    order: import_core3.TurnOrder.DEFAULT
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
        order: import_core3.TurnOrder.DEFAULT,
        minMoves: 0
      },
      endIf: () => true,
      // Ends immediately 
      next: "deployment"
    },
    // Phase 2: Probe deployment (players take turns)
    deployment: {
      moves: {
        rollProbes,
        deployProbes,
        recallProbe,
        endDeployment
      },
      turn: {
        order: import_core3.TurnOrder.DEFAULT,
        onBegin: ({ G }) => {
          G.rolledDice = false;
          G.diceValues = [];
          G.deployedValues = [];
          G.deploymentComplete = false;
        }
      },
      endIf: ({ G, ctx }) => {
        return G.playersFinishedPhase.length >= ctx.numPlayers;
      },
      onEnd: ({ G }) => {
        G.playersFinishedPhase = [];
      },
      next: "control"
    },
    // Phase 4: Control and harvest (automatic)
    control: {
      onBegin: ({ G }) => {
        onControlBegin({ G });
      },
      moves: {},
      turn: {
        order: import_core3.TurnOrder.DEFAULT,
        minMoves: 0
      },
      endIf: () => true,
      // Ends immediately
      next: "construction"
    },
    // Phase 6: Construction (players take turns)
    construction: {
      moves: {
        buildBuilding,
        buildProbe,
        activateBuilding,
        endConstruction
      },
      turn: {
        order: import_core3.TurnOrder.DEFAULT
      },
      endIf: ({ G, ctx }) => {
        return G.playersFinishedPhase.length >= ctx.numPlayers;
      },
      onEnd: ({ G }) => {
        G.round += 1;
        G.playersFinishedPhase = [];
      },
      next: "production"
    }
  },
  // End game when a player reaches victory condition
  endIf: ({ G }) => {
    for (const [playerId, player] of Object.entries(G.players)) {
      if (player.resources.intelligence >= VICTORY_INTELLIGENCE) {
        return {
          winner: playerId,
          intelligence: player.resources.intelligence
        };
      }
    }
    return void 0;
  },
  // AI enumeration for bots
  ai: {
    enumerate: (G, ctx) => {
      const moves = [];
      const playerId = ctx.currentPlayer;
      const player = G.players[playerId];
      if (ctx.phase === "deployment") {
        if (!G.rolledDice) {
          const freeProbes = player.probes.filter((p) => p.tileId === null);
          if (freeProbes.length > 0) {
            moves.push({ move: "rollProbes" });
          }
        }
        if (G.rolledDice) {
          const undeployedValues = G.diceValues.filter(
            (v) => !G.deployedValues.includes(v)
          );
          for (const value of [...new Set(undeployedValues)]) {
            const matchingTiles = G.tiles.filter((t) => t.value === value);
            for (const tile of matchingTiles) {
              moves.push({ move: "deployProbes", args: [value, tile.id] });
            }
          }
        }
        moves.push({ move: "endDeployment" });
        for (const probe of player.probes) {
          if (probe.tileId !== null) {
            moves.push({ move: "recallProbe", args: [probe.id] });
          }
        }
      }
      if (ctx.phase === "construction") {
        moves.push({ move: "endConstruction" });
        moves.push({ move: "buildProbe" });
        for (const tile of G.tiles) {
          const control = calculateTileControl(tile, G.players);
          if (control.controller === playerId) {
            const buildingTypes = [
              "windTurbine",
              "factory",
              "orbitalForge",
              "bioLab",
              "condenser",
              "chipEngraver",
              "biomassFactory",
              "turret"
            ];
            for (const buildingType of buildingTypes) {
              moves.push({ move: "buildBuilding", args: [buildingType, tile.id] });
            }
          }
        }
        for (const building of player.buildings) {
          if (!building.activated) {
            moves.push({ move: "activateBuilding", args: [building.id] });
          }
        }
      }
      return moves;
    }
  }
};

// src/server.ts
var server = (0, import_server.Server)({
  games: [Singularity],
  origins: [
    import_server.Origins.LOCALHOST,
    /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
    /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
    /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:\d+$/,
    /^https?:\/\/.*\.ndlz\.net$/,
    "http://localhost:5173",
    "http://127.0.0.1:5173"
  ]
});
var PORT = Number(process.env.PORT) || 8e3;
var distPath = import_path.default.resolve(process.cwd(), "dist");
server.app.use((0, import_koa_static.default)(distPath));
var indexHtml = import_path.default.join(distPath, "index.html");
server.app.use(async (ctx, next) => {
  await next();
  if (ctx.status === 404 && !ctx.path.startsWith("/games") && !ctx.path.startsWith("/socket.io") && !ctx.path.startsWith("/.well-known")) {
    ctx.type = "html";
    ctx.body = import_fs.default.createReadStream(indexHtml);
  }
});
server.run({ port: PORT, callback: () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Serving static files from ${distPath}`);
  console.log(`Lobby API available at http://localhost:${PORT}/games`);
} });
