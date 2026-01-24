# Plan d'implémentation - Singularity

## 1. Structure des Types

```
src/
├── game/
│   ├── Singularity.ts       # Définition principale du jeu
│   ├── types.ts             # Types TypeScript
│   ├── constants.ts         # Constantes (coûts, configs)
│   ├── setup.ts             # Logique d'initialisation
│   ├── phases/
│   │   ├── production.ts    # Phase de production
│   │   ├── deployment.ts    # Phase de déploiement des sondes
│   │   ├── control.ts       # Phase de contrôle et récolte
│   │   └── construction.ts  # Phase de construction
│   ├── moves/
│   │   ├── index.ts         # Export des moves
│   │   ├── probe.ts         # Moves liés aux sondes
│   │   ├── building.ts      # Moves de construction
│   │   └── resource.ts      # Moves de ressources
│   └── utils/
│       ├── validation.ts    # Fonctions de validation
│       ├── control.ts       # Calcul de contrôle des tuiles
│       └── board.ts         # Génération du plateau
```

## 2. Types TypeScript

### Ressources
```typescript
type RawResource = 'metal' | 'organic' | 'energy';
type RefinedResource = 'alloy' | 'biomass' | 'plasma';
type FinalResource = 'intelligence';

interface PlayerResources {
  metal: number;
  organic: number;
  energy: number;
  alloy: number;
  biomass: number;
  plasma: number;
  intelligence: number;
}
```

### Bâtiments
```typescript
type BuildingType =
  | 'windTurbine'    // +2 énergie/tour
  | 'factory'        // Permet constructions
  | 'orbitalForge'   // 2 métal → 1 alliage
  | 'bioLab'         // 2 organique → 1 biomasse
  | 'condenser'      // 3 énergie → 1 plasma
  | 'chipEngraver'   // 1 alliage + 1 biomasse → 1 intelligence
  | 'biomassFactory' // Brûle 1 biomasse → +2 énergie
  | 'turret';        // +1 défense

interface Building {
  id: string;
  type: BuildingType;
  owner: string;        // playerID
  tileId: number;
  activated: boolean;   // Pour ce tour
}
```

### Sondes (Dés)
```typescript
interface Probe {
  id: string;
  value: number | null;  // 1-6 après lancer, null si pas lancé
  tileId: number | null; // null si en réserve
  deployed: boolean;
}
```

### Tuiles
```typescript
interface Tile {
  id: number;
  value: number;           // 1-6, correspond aux dés
  resourceType: RawResource;
  resourceCount: number;   // Stock restant
  probes: { playerId: string; probeId: string }[];
  buildings: string[];     // Building IDs
}
```

### État du joueur
```typescript
interface PlayerState {
  resources: PlayerResources;
  probes: Probe[];          // Max 12
  buildings: Building[];
  factoryCount: number;     // Pour constructions multiples
}
```

### État global
```typescript
interface GameState {
  tiles: Tile[];
  players: Record<string, PlayerState>;
  currentPhase: Phase;
  turnOrder: string[];
  round: number;
}
```

## 3. Phases du jeu

### Phase 1: Production
```typescript
// Automatique au début du tour
- Chaque éolienne → +2 énergie
- Reset des activations de bâtiments
```

### Phase 2: Déploiement
```typescript
moves: {
  rollProbes,      // Lancer tous les dés libres
  deployProbes,    // Placer dés d'une valeur sur une tuile (coût: 1 énergie/dé)
  recallProbe,     // Retirer une sonde (coût: 1 énergie)
  skipDeployment,  // Passer
}
```

### Phase 3: Contrôle & Récolte
```typescript
// Automatique
- Calcul du contrôle par tuile (majorité sondes + tourelles)
- Capture des bâtiments ennemis
- Récolte: sondes non-occupées → 1 ressource chacune
```

### Phase 4: Construction
```typescript
moves: {
  activateBuilding,  // Activer un bâtiment de production (1 énergie)
  buildBuilding,     // Construire un bâtiment
  buildProbe,        // Créer une nouvelle sonde
  endConstruction,   // Terminer
}
```

## 4. Constantes

```typescript
const BUILDING_COSTS = {
  windTurbine: { metal: 2, organic: 1 },
  factory: { metal: 2 },
  orbitalForge: { metal: 2 },
  bioLab: { organic: 2 },
  condenser: { energy: 3 },
  chipEngraver: { alloy: 1, biomass: 1 },
  biomassFactory: { metal: 1, biomass: 1 },
  turret: { metal: 1, energy: 1 },
};

const PROBE_COST = { alloy: 1, organic: 1 };
const MAX_PROBES = 12;
const VICTORY_INTELLIGENCE = 10;

const TILE_CONFIG = {
  '2-3': { count: 12, perValue: 2 },  // 2 tuiles par valeur 1-6
  '4-5': { count: 16, perValue: [3,3,3,3,2,2] }, // 3 de 1-4, 2 de 5-6
};
```

## 5. Logique de Contrôle

```typescript
function calculateControl(tile: Tile, players: Record<string, PlayerState>) {
  // Compter sondes + tourelles par joueur
  const strength: Record<string, number> = {};

  for (const { playerId } of tile.probes) {
    strength[playerId] = (strength[playerId] || 0) + 1;
  }

  // Ajouter tourelles
  for (const buildingId of tile.buildings) {
    const building = findBuilding(buildingId, players);
    if (building.type === 'turret') {
      strength[building.owner] = (strength[building.owner] || 0) + 1;
    }
  }

  // Trouver le max
  const sorted = Object.entries(strength).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0][0];
  if (sorted[0][1] === sorted[1][1]) return null; // Égalité

  return sorted[0][0]; // Contrôleur
}

function calculateHarvest(tile: Tile, controller: string) {
  // Sondes non-occupées au contrôle
  const controllerProbes = tile.probes.filter(p => p.playerId === controller);
  const otherProbes = tile.probes.filter(p => p.playerId !== controller);

  // Sondes occupées = max(autres joueurs)
  const occupiedCount = otherProbes.length > 0
    ? Math.max(...Object.values(groupByPlayer(otherProbes)).map(p => p.length))
    : 0;

  const harvestingProbes = Math.max(0, controllerProbes.length - occupiedCount);
  return Math.min(harvestingProbes, tile.resourceCount);
}
```

## 6. Setup du jeu

```typescript
function setupGame({ ctx, random }) {
  const numPlayers = ctx.numPlayers;
  const tileCount = numPlayers <= 3 ? 12 : 16;

  // Générer les tuiles
  const tiles = generateTiles(tileCount, random);

  // Initialiser les joueurs
  const players = {};
  for (let i = 0; i < numPlayers; i++) {
    players[String(i)] = {
      resources: {
        metal: 0, organic: 0, energy: 0,
        alloy: 0, biomass: 0, plasma: 0,
        intelligence: 0,
      },
      probes: Array(3).fill(null).map((_, j) => ({
        id: `${i}-probe-${j}`,
        value: null,
        tileId: null,
        deployed: false,
      })),
      buildings: [
        { id: `${i}-factory-0`, type: 'factory', owner: String(i), tileId: null, activated: false },
        { id: `${i}-turbine-0`, type: 'windTurbine', owner: String(i), tileId: null, activated: false },
      ],
      factoryCount: 1,
    };
  }

  return { tiles, players, round: 1 };
}
```

## 7. Ordre d'implémentation

### Étape 1: Types et constantes
- [ ] `types.ts` - Tous les types
- [ ] `constants.ts` - Coûts, configs

### Étape 2: Setup
- [ ] `setup.ts` - Génération plateau et état initial
- [ ] `utils/board.ts` - Génération tuiles

### Étape 3: Phases simples
- [ ] `phases/production.ts` - Production automatique
- [ ] `phases/control.ts` - Contrôle et récolte

### Étape 4: Moves de déploiement
- [ ] `moves/probe.ts` - rollProbes, deployProbes, recallProbe
- [ ] `phases/deployment.ts` - Phase de déploiement

### Étape 5: Moves de construction
- [ ] `moves/building.ts` - buildBuilding, activateBuilding
- [ ] `moves/resource.ts` - Conversions de ressources
- [ ] `phases/construction.ts` - Phase de construction

### Étape 6: Game principal
- [ ] `Singularity.ts` - Assemblage final avec endIf

### Étape 7: UI
- [ ] Composant plateau (tuiles hexagonales ou grille)
- [ ] Panneau ressources joueur
- [ ] Actions disponibles par phase
- [ ] Indicateurs de contrôle

## 8. Points d'attention

1. **Énergie**: Ressource centrale, nécessaire pour presque tout
2. **Sondes persistantes**: Restent jusqu'à retrait manuel
3. **Capture**: Bâtiments capturés non démontables
4. **Validation**: Vérifier coûts avant chaque action
5. **Fin de partie**: Premier à 10 intelligence gagne
