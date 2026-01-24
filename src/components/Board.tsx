import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, RegularPolygon, Text, Circle, Group, Line, Path, Rect } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { Loader2, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { BoardProps } from '@/types/game';
import type { Tile, Building, Probe } from '@/game/types';
import { VICTORY_INTELLIGENCE } from '@/game/constants';
import { calculateTileControl } from '@/game/utils/control';

const NUM_PLAYERS = 2;

// ============ Colors ============

const COLORS = {
  bg: { dark: '#0a0a0f', medium: '#12121a', light: '#1a1a2e' },
  metal: { base: '#2d3748', light: '#4a5568', accent: '#718096' },
  organic: { base: '#1a4731', light: '#276749', accent: '#48bb78' },
  player0: { fill: '#0891b2', stroke: '#22d3ee', glow: '#06b6d4' },
  player1: { fill: '#ea580c', stroke: '#fb923c', glow: '#f97316' },
  neutral: { stroke: '#3f3f5a', fill: '#1e1e2f' },
  highlight: { valid: '#fbbf24', active: '#f59e0b' },
};

const PLAYER_COLORS = {
  '0': { bg: 'bg-cyan-500', bgLight: 'bg-cyan-500/20', border: 'border-cyan-400', text: 'text-cyan-400' },
  '1': { bg: 'bg-orange-500', bgLight: 'bg-orange-500/20', border: 'border-orange-400', text: 'text-orange-400' },
};

// ============ SVG Resource Icons (for Konva canvas) ============

function CrystalIcon({ x, y, size = 20, color = '#718096' }: { x: number; y: number; size?: number; color?: string }) {
  const s = size / 20;
  return (
    <Group x={x} y={y}>
      <Path
        data={`M 0 ${-8*s} L ${5*s} ${-2*s} L ${3*s} ${8*s} L ${-3*s} ${8*s} L ${-5*s} ${-2*s} Z`}
        fill={color}
        stroke="#cbd5e1"
        strokeWidth={1.5}
        opacity={0.9}
      />
      <Path
        data={`M ${-2*s} ${-5*s} L 0 ${-2*s} L ${-1*s} ${2*s}`}
        stroke="#ffffff"
        strokeWidth={1.5}
        opacity={0.6}
        lineCap="round"
        lineJoin="round"
      />
    </Group>
  );
}

function LeafIcon({ x, y, size = 20 }: { x: number; y: number; size?: number }) {
  const s = size / 20;
  return (
    <Group x={x} y={y}>
      <Path
        data={`M 0 ${-8*s} Q ${7*s} ${-4*s} ${5*s} ${4*s} Q ${2*s} ${8*s} 0 ${8*s} Q ${-2*s} ${8*s} ${-5*s} ${4*s} Q ${-7*s} ${-4*s} 0 ${-8*s}`}
        fill="#48bb78"
        stroke="#276749"
        strokeWidth={1.5}
      />
      <Line points={[0, -4*s, 0, 6*s]} stroke="#276749" strokeWidth={1.5} lineCap="round" />
      <Line points={[0, 0, 3*s, -2*s]} stroke="#276749" strokeWidth={1} lineCap="round" />
      <Line points={[0, 2*s, -2.5*s, 0]} stroke="#276749" strokeWidth={1} lineCap="round" />
    </Group>
  );
}

// ============ HTML/CSS Resource Icons (for React panels) ============

function MetalIconSvg({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {/* Blue-gray crystal/ore */}
      <path d="M12 2 L18 8 L15 20 L9 20 L6 8 Z" fill="#475569" stroke="#64748b" strokeWidth="1.5"/>
      <path d="M9 6 L12 10 L10 14" stroke="#94a3b8" strokeWidth="1.5" fill="none" opacity="0.7"/>
    </svg>
  );
}

function OrganicIconSvg({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {/* Bright green leaf */}
      <path d="M12 2 Q20 6 17 14 Q14 20 12 20 Q10 20 7 14 Q4 6 12 2" fill="#22c55e" stroke="#16a34a" strokeWidth="1.5"/>
      <path d="M12 6 L12 18 M12 10 L15 7 M12 14 L9 12" stroke="#16a34a" strokeWidth="1.5" fill="none"/>
    </svg>
  );
}

function EnergyIconSvg({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {/* Bright yellow lightning bolt */}
      <path d="M13 2 L6 14 L11 14 L10 22 L18 10 L13 10 Z" fill="#facc15" stroke="#eab308" strokeWidth="1.5"/>
    </svg>
  );
}

function AlloyIconSvg({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {/* Bronze/copper gear */}
      <circle cx="12" cy="12" r="8" fill="#b45309" stroke="#d97706" strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="4" fill="#fbbf24" stroke="#d97706" strokeWidth="1"/>
      <circle cx="12" cy="12" r="2" fill="#b45309"/>
    </svg>
  );
}

function BiomassIconSvg({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {/* Teal/cyan DNA helix */}
      <ellipse cx="12" cy="12" rx="7" ry="9" fill="#0d9488" stroke="#14b8a6" strokeWidth="1.5"/>
      <path d="M9 8 Q12 12 9 16 M15 8 Q12 12 15 16" stroke="#5eead4" strokeWidth="1.5" fill="none"/>
    </svg>
  );
}

function PlasmaIconSvg({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {/* Pink/magenta plasma orb */}
      <circle cx="12" cy="12" r="7" fill="#c026d3" stroke="#e879f9" strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="3" fill="#f0abfc" opacity="0.8"/>
      <circle cx="12" cy="12" r="1" fill="#fff"/>
    </svg>
  );
}

function IntelligenceIconSvg({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <ellipse cx="12" cy="10" rx="8" ry="7" fill="#6366f1" stroke="#818cf8" strokeWidth="1.5"/>
      <path d="M8 17 Q12 20 16 17" stroke="#818cf8" strokeWidth="1.5" fill="none"/>
      <circle cx="9" cy="9" r="1.5" fill="#c7d2fe"/>
      <circle cx="15" cy="9" r="1.5" fill="#c7d2fe"/>
    </svg>
  );
}

// ============ Building Icons for Konva ============

function WindTurbineIcon({ x, y, size = 16, color = '#facc15' }: { x: number; y: number; size?: number; color?: string }) {
  const s = size / 16;
  return (
    <Group x={x} y={y}>
      {/* Pole */}
      <Line points={[0, 8*s, 0, -2*s]} stroke={color} strokeWidth={2*s} lineCap="round" />
      {/* Blades */}
      <Line points={[0, -2*s, 0, -8*s]} stroke={color} strokeWidth={2*s} lineCap="round" />
      <Line points={[0, -2*s, 5*s, 2*s]} stroke={color} strokeWidth={2*s} lineCap="round" />
      <Line points={[0, -2*s, -5*s, 2*s]} stroke={color} strokeWidth={2*s} lineCap="round" />
      {/* Hub */}
      <Circle radius={2*s} fill={color} />
    </Group>
  );
}

function FactoryIcon({ x, y, size = 16, color = '#94a3b8' }: { x: number; y: number; size?: number; color?: string }) {
  const s = size / 16;
  return (
    <Group x={x} y={y}>
      <Path data={`M ${-6*s} ${8*s} L ${-6*s} ${-2*s} L ${-2*s} ${-6*s} L ${2*s} ${-2*s} L ${6*s} ${-6*s} L ${6*s} ${8*s} Z`} fill={color} stroke="#64748b" strokeWidth={1} />
      <Rect x={-2*s} y={2*s} width={4*s} height={6*s} fill="#475569" />
    </Group>
  );
}

function ForgeIcon({ x, y, size = 16, color = '#f97316' }: { x: number; y: number; size?: number; color?: string }) {
  const s = size / 16;
  return (
    <Group x={x} y={y}>
      {/* Anvil shape */}
      <Path data={`M ${-6*s} ${4*s} L ${-4*s} ${-4*s} L ${4*s} ${-4*s} L ${6*s} ${4*s} L ${4*s} ${8*s} L ${-4*s} ${8*s} Z`} fill={color} stroke="#c2410c" strokeWidth={1} />
      {/* Sparks */}
      <Circle x={0} y={-6*s} radius={2*s} fill="#fbbf24" />
    </Group>
  );
}

function BioLabIcon({ x, y, size = 16, color = '#22c55e' }: { x: number; y: number; size?: number; color?: string }) {
  const s = size / 16;
  return (
    <Group x={x} y={y}>
      {/* Flask */}
      <Path data={`M ${-2*s} ${-8*s} L ${-2*s} ${-2*s} L ${-6*s} ${8*s} L ${6*s} ${8*s} L ${2*s} ${-2*s} L ${2*s} ${-8*s} Z`} fill={color} stroke="#16a34a" strokeWidth={1} />
      {/* Liquid */}
      <Path data={`M ${-4*s} ${4*s} L ${4*s} ${4*s} L ${5*s} ${8*s} L ${-5*s} ${8*s} Z`} fill="#4ade80" />
    </Group>
  );
}

function CondenserIcon({ x, y, size = 16, color = '#c026d3' }: { x: number; y: number; size?: number; color?: string }) {
  const s = size / 16;
  return (
    <Group x={x} y={y}>
      {/* Coil */}
      <Circle radius={6*s} fill="transparent" stroke={color} strokeWidth={3*s} />
      <Circle radius={3*s} fill={color} />
      <Circle radius={1.5*s} fill="#f0abfc" />
    </Group>
  );
}

function ChipEngraverIcon({ x, y, size = 16, color = '#6366f1' }: { x: number; y: number; size?: number; color?: string }) {
  const s = size / 16;
  return (
    <Group x={x} y={y}>
      {/* Chip */}
      <Rect x={-5*s} y={-5*s} width={10*s} height={10*s} fill={color} stroke="#818cf8" strokeWidth={1} />
      {/* Pins */}
      <Line points={[-7*s, -3*s, -5*s, -3*s]} stroke="#818cf8" strokeWidth={2*s} />
      <Line points={[-7*s, 0, -5*s, 0]} stroke="#818cf8" strokeWidth={2*s} />
      <Line points={[-7*s, 3*s, -5*s, 3*s]} stroke="#818cf8" strokeWidth={2*s} />
      <Line points={[5*s, -3*s, 7*s, -3*s]} stroke="#818cf8" strokeWidth={2*s} />
      <Line points={[5*s, 0, 7*s, 0]} stroke="#818cf8" strokeWidth={2*s} />
      <Line points={[5*s, 3*s, 7*s, 3*s]} stroke="#818cf8" strokeWidth={2*s} />
      {/* Core */}
      <Rect x={-2*s} y={-2*s} width={4*s} height={4*s} fill="#c7d2fe" />
    </Group>
  );
}

function BiomassFactoryIcon({ x, y, size = 16, color = '#14b8a6' }: { x: number; y: number; size?: number; color?: string }) {
  const s = size / 16;
  return (
    <Group x={x} y={y}>
      {/* Tank */}
      <Rect x={-5*s} y={-4*s} width={10*s} height={12*s} fill={color} stroke="#0d9488" strokeWidth={1} cornerRadius={2*s} />
      {/* Bubbles */}
      <Circle x={-2*s} y={2*s} radius={2*s} fill="#5eead4" />
      <Circle x={2*s} y={0} radius={1.5*s} fill="#5eead4" />
      <Circle x={0} y={4*s} radius={1*s} fill="#5eead4" />
    </Group>
  );
}

function TurretIcon({ x, y, size = 16, color = '#ef4444' }: { x: number; y: number; size?: number; color?: string }) {
  const s = size / 16;
  return (
    <Group x={x} y={y}>
      {/* Base */}
      <Rect x={-5*s} y={2*s} width={10*s} height={6*s} fill={color} stroke="#dc2626" strokeWidth={1} />
      {/* Turret */}
      <Circle y={0} radius={4*s} fill={color} stroke="#dc2626" strokeWidth={1} />
      {/* Barrel */}
      <Rect x={-1.5*s} y={-8*s} width={3*s} height={6*s} fill="#fca5a5" stroke="#dc2626" strokeWidth={1} />
    </Group>
  );
}

const BUILDING_NAMES: Record<string, string> = {
  windTurbine: 'Éolienne (+2 énergie/tour)',
  factory: 'Usine (permet construction)',
  orbitalForge: 'Forge (2 métal → 1 alliage)',
  bioLab: 'Labo Bio (2 organique → 1 biomasse)',
  condenser: 'Condenseur (3 énergie → 1 plasma)',
  chipEngraver: 'Graveur (1 alliage + 1 biomasse → 1 intel)',
  biomassFactory: 'Usine Bio (1 biomasse → 2 énergie)',
  turret: 'Tourelle (+1 défense)',
};

// Building icon renderer for tiles
function BuildingIcon({ type, x, y, size = 14, playerColor }: { type: string; x: number; y: number; size?: number; playerColor: string }) {
  const icons: Record<string, React.ReactElement> = {
    windTurbine: <WindTurbineIcon x={x} y={y} size={size} color="#facc15" />,
    factory: <FactoryIcon x={x} y={y} size={size} color={playerColor} />,
    orbitalForge: <ForgeIcon x={x} y={y} size={size} color="#f97316" />,
    bioLab: <BioLabIcon x={x} y={y} size={size} color="#22c55e" />,
    condenser: <CondenserIcon x={x} y={y} size={size} color="#c026d3" />,
    chipEngraver: <ChipEngraverIcon x={x} y={y} size={size} color="#6366f1" />,
    biomassFactory: <BiomassFactoryIcon x={x} y={y} size={size} color="#14b8a6" />,
    turret: <TurretIcon x={x} y={y} size={size} color={playerColor} />,
  };
  return icons[type] || null;
}

// ============ Hex Tile Component ============

const HEX_SIZE = 60; // Increased from 52

interface HexTileProps {
  tile: Tile;
  x: number;
  y: number;
  size: number;
  isSelected: boolean;
  controllerId: string | null;
  currentPlayerId: string;
  isValidDrop: boolean;
  isDragOver: boolean;
  canBuildOnTile: boolean;
  probesByPlayer: { playerId: string; count: number }[];
  buildingsOnTile: { type: string; owner: string }[];
  onClick: (e: KonvaEventObject<MouseEvent>) => void;
  onBuildingHover?: (type: string | null, x: number, y: number) => void;
}

function HexTile({ tile, x, y, size, isSelected, controllerId, currentPlayerId, isValidDrop, isDragOver, canBuildOnTile, probesByPlayer, buildingsOnTile, onClick, onBuildingHover }: HexTileProps) {
  const isMetal = tile.resourceType === 'metal';
  const isControlled = controllerId === currentPlayerId;
  const isEnemyControlled = controllerId !== null && controllerId !== currentPlayerId;

  // Colors based on resource type and control
  let baseFill = isMetal ? COLORS.metal.base : COLORS.organic.base;
  let baseStroke = isMetal ? COLORS.metal.light : COLORS.organic.light;
  let strokeWidth = 2;

  if (isControlled) {
    baseStroke = COLORS.player0.stroke;
    strokeWidth = 3;
  } else if (isEnemyControlled) {
    baseStroke = COLORS.player1.stroke;
    strokeWidth = 3;
  }

  // Highlight buildable tiles
  if (canBuildOnTile) {
    baseStroke = '#10b981'; // Emerald
    strokeWidth = 4;
  }

  if (isValidDrop) {
    baseStroke = COLORS.highlight.valid;
    strokeWidth = 4;
  }
  if (isDragOver) {
    baseFill = '#3d2810';
    baseStroke = COLORS.highlight.active;
    strokeWidth = 5;
  }
  if (isSelected) {
    baseStroke = '#ffffff';
    strokeWidth = 4;
  }

  return (
    <Group x={x} y={y} onClick={onClick} style={{ cursor: canBuildOnTile ? 'pointer' : 'default' }}>
      {/* Glow effect for valid drop */}
      {(isValidDrop || isDragOver) && (
        <RegularPolygon
          sides={6}
          radius={size + 6}
          fill={COLORS.highlight.valid}
          rotation={0}
          opacity={0.2}
        />
      )}
      {/* Glow effect for buildable tiles */}
      {canBuildOnTile && !isValidDrop && !isDragOver && (
        <RegularPolygon
          sides={6}
          radius={size + 4}
          fill="#10b981"
          rotation={0}
          opacity={0.15}
        />
      )}

      {/* Main hex - pointy-top (rotation=0) */}
      <RegularPolygon
        sides={6}
        radius={size}
        fill={baseFill}
        stroke={baseStroke}
        strokeWidth={strokeWidth}
        rotation={0}
      />

      {/* Dice value badge - top left outside hex */}
      <Group x={-size * 0.7} y={-size * 0.7}>
        <Circle radius={12} fill="#0f0f1a" stroke={baseStroke} strokeWidth={2} />
        <Text
          x={-4}
          y={-5}
          text={String(tile.value)}
          fontSize={12}
          fontStyle="bold"
          fill="#ffffff"
          fontFamily="monospace"
        />
      </Group>

      {/* Resource icon and count - center of hex */}
      <Group y={-8}>
        {isMetal ? (
          <CrystalIcon x={0} y={0} size={20} color={COLORS.metal.accent} />
        ) : (
          <LeafIcon x={0} y={0} size={20} />
        )}
      </Group>
      <Text
        x={-8}
        y={10}
        text={String(tile.resourceCount)}
        fontSize={14}
        fontStyle="bold"
        fill="#e2e8f0"
        fontFamily="monospace"
        width={16}
        align="center"
      />

      {/* Buildings on tile - arranged around center */}
      {buildingsOnTile.length > 0 && (
        <Group>
          {buildingsOnTile.slice(0, 4).map((b, i) => {
            const angle = (i * 90 + 45) * (Math.PI / 180); // Distribute around center
            const bx = Math.cos(angle) * (size * 0.5);
            const by = Math.sin(angle) * (size * 0.5);
            const playerColor = b.owner === '0' ? COLORS.player0.fill : COLORS.player1.fill;
            return (
              <Group
                key={i}
                onMouseEnter={(e) => {
                  if (onBuildingHover) {
                    // Use native event for accurate screen position
                    const evt = e.evt as MouseEvent;
                    onBuildingHover(b.type, evt.clientX, evt.clientY);
                  }
                }}
                onMouseLeave={() => onBuildingHover?.(null, 0, 0)}
              >
                <Circle x={bx} y={by} radius={16} fill="#0f0f1a" opacity={0.8} />
                <BuildingIcon type={b.type} x={bx} y={by} size={18} playerColor={playerColor} />
              </Group>
            );
          })}
        </Group>
      )}

      {/* Probes - bottom of hex */}
      {probesByPlayer.length > 0 && (
        <Group y={size * 0.5}>
          {probesByPlayer.map((p, i) => {
            const colors = p.playerId === '0' ? COLORS.player0 : COLORS.player1;
            const offsetX = (i - (probesByPlayer.length - 1) / 2) * 28;
            return (
              <Group key={p.playerId} x={offsetX}>
                <Circle radius={14} fill={colors.glow} opacity={0.3} />
                <Circle radius={11} fill={colors.fill} stroke={colors.stroke} strokeWidth={2} />
                <Text
                  x={-4}
                  y={-6}
                  text={String(p.count)}
                  fontSize={12}
                  fontStyle="bold"
                  fill="#ffffff"
                />
              </Group>
            );
          })}
        </Group>
      )}
    </Group>
  );
}

// ============ Draggable Dice ============

const DICE_SIZE = 40;

function DraggableDice({ value, count, x, y, isDeployed, onDragEnd, onDragMove }: {
  value: number;
  count: number;
  x: number;
  y: number;
  isDeployed: boolean;
  onDragEnd: (value: number, x: number, y: number) => void;
  onDragMove: (value: number, x: number, y: number) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);

  if (isDeployed) {
    return (
      <Group x={x} y={y}>
        <Rect x={-DICE_SIZE/2} y={-DICE_SIZE/2} width={DICE_SIZE} height={DICE_SIZE} fill="#059669" stroke="#34d399" strokeWidth={2} cornerRadius={8} />
        <Text x={-7} y={-10} text={String(value)} fontSize={18} fontStyle="bold" fill="#fff" fontFamily="monospace" />
        <Text x={-5} y={6} text="✓" fontSize={12} fill="#fff" />
      </Group>
    );
  }

  return (
    <Group
      x={x} y={y}
      draggable
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(e: KonvaEventObject<DragEvent>) => {
        setIsDragging(false);
        onDragEnd(value, e.target.x(), e.target.y());
        e.target.position({ x, y });
      }}
      onDragMove={(e: KonvaEventObject<DragEvent>) => onDragMove(value, e.target.x(), e.target.y())}
    >
      {/* Glow */}
      <Rect
        x={-DICE_SIZE/2 - 6}
        y={-DICE_SIZE/2 - 6}
        width={DICE_SIZE + 12}
        height={DICE_SIZE + 12}
        fill={COLORS.highlight.valid}
        opacity={isDragging ? 0.5 : 0.25}
        cornerRadius={12}
      />
      {/* Dice body */}
      <Rect
        x={-DICE_SIZE/2}
        y={-DICE_SIZE/2}
        width={DICE_SIZE}
        height={DICE_SIZE}
        fill={isDragging ? '#d97706' : COLORS.highlight.valid}
        stroke="#fcd34d"
        strokeWidth={isDragging ? 4 : 2}
        cornerRadius={8}
        shadowColor={COLORS.highlight.valid}
        shadowBlur={isDragging ? 25 : 15}
        shadowOpacity={0.6}
      />
      {/* Value */}
      <Text x={-7} y={-12} text={String(value)} fontSize={20} fontStyle="bold" fill="#000" fontFamily="monospace" />
      {/* Count */}
      {count > 1 && (
        <Text x={-10} y={6} text={`×${count}`} fontSize={11} fontStyle="bold" fill="#000" />
      )}
    </Group>
  );
}

// ============ Game Board Component ============

function GameBoard({ tiles, players, currentPlayerId, selectedTile, onTileClick, diceValues, deployedValues, moves, canDeploy, canBuild, playerEnergy, fullscreen }: {
  tiles: Tile[];
  players: Record<string, { probes: Probe[]; buildings: Building[]; resources: any }>;
  currentPlayerId: string;
  selectedTile: number | null;
  onTileClick: (id: number, screenX: number, screenY: number) => void;
  diceValues: number[];
  deployedValues: number[];
  moves: BoardProps['moves'];
  canDeploy: boolean;
  canBuild: boolean;
  playerEnergy: number;
  fullscreen?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const [boardSize, setBoardSize] = useState(500);
  const [dragOverTile, setDragOverTile] = useState<number | null>(null);
  const [draggingValue, setDraggingValue] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  // Responsive board - fill available space
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Use slightly smaller to prevent overflow
        const availableSize = Math.min(rect.width - 16, rect.height - 16, 800);
        setBoardSize(Math.max(350, availableSize));
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Calculate hex positions - EXPLICIT PIXEL POSITIONS for 12-tile honeycomb
  // Using pointy-top hexagons (rotation=0)
  const hexSize = boardSize / 10; // Radius from center to vertex
  const centerX = boardSize / 2;
  const centerY = boardSize / 2 - 40; // Offset up for dice tray

  const sqrt3 = Math.sqrt(3);
  const gap = 1.15; // Spacing multiplier (1.0 = touching, >1 = gap)
  const hSpace = sqrt3 * hexSize * gap; // Horizontal distance between hex centers
  const vSpace = 1.5 * hexSize * gap;   // Vertical distance between rows

  // Explicit positions for 12-tile honeycomb:
  //      [0]  [1]  [2]           <- Row 0: 3 tiles
  //   [3]  [4]  [5]  [6]         <- Row 1: 4 tiles (offset left by hSpace/2)
  //      [7]  [8]  [9]           <- Row 2: 3 tiles
  //        [10] [11]             <- Row 3: 2 tiles (offset left by hSpace/2)
  const hexPositions = [
    // Row 0: 3 tiles centered
    { x: centerX - hSpace, y: centerY - vSpace },
    { x: centerX, y: centerY - vSpace },
    { x: centerX + hSpace, y: centerY - vSpace },
    // Row 1: 4 tiles (shifted left by half)
    { x: centerX - 1.5 * hSpace, y: centerY },
    { x: centerX - 0.5 * hSpace, y: centerY },
    { x: centerX + 0.5 * hSpace, y: centerY },
    { x: centerX + 1.5 * hSpace, y: centerY },
    // Row 2: 3 tiles centered
    { x: centerX - hSpace, y: centerY + vSpace },
    { x: centerX, y: centerY + vSpace },
    { x: centerX + hSpace, y: centerY + vSpace },
    // Row 3: 2 tiles (shifted left by half)
    { x: centerX - 0.5 * hSpace, y: centerY + 2 * vSpace },
    { x: centerX + 0.5 * hSpace, y: centerY + 2 * vSpace },
  ];

  const tilePositions: { tile: Tile; x: number; y: number }[] = [];

  tiles.forEach((tile, i) => {
    if (i < hexPositions.length) {
      const pos = hexPositions[i];
      tilePositions.push({ tile, x: pos.x, y: pos.y });
    }
  });

  // Drag handlers
  const handleDragMove = (value: number, dragX: number, dragY: number) => {
    setDraggingValue(value);
    let found: number | null = null;
    for (const { tile, x, y } of tilePositions) {
      const dist = Math.sqrt((dragX - x) ** 2 + (dragY - y) ** 2);
      if (dist < hexSize && tile.value === value) {
        found = tile.id;
        break;
      }
    }
    setDragOverTile(found);
  };

  const handleDragEnd = (value: number, dragX: number, dragY: number) => {
    setDraggingValue(null);
    setDragOverTile(null);
    if (!canDeploy || deployedValues.includes(value)) return;
    for (const { tile, x, y } of tilePositions) {
      const dist = Math.sqrt((dragX - x) ** 2 + (dragY - y) ** 2);
      if (dist < hexSize && tile.value === value) {
        const probesCount = diceValues.filter(v => v === value).length;
        if (playerEnergy >= probesCount) moves.deployProbes(value, tile.id);
        break;
      }
    }
  };

  // Dice display
  const diceByValue: Record<number, number> = {};
  diceValues.forEach(v => { diceByValue[v] = (diceByValue[v] || 0) + 1; });
  const diceEntries = Object.entries(diceByValue).map(([v, c]) => ({ value: parseInt(v), count: c }));
  const diceY = boardSize - 40;
  const diceStartX = centerX - (diceEntries.length - 1) * 30;

  return (
    <div ref={containerRef} className={fullscreen ? "w-full flex items-center justify-center" : "w-full"} style={fullscreen ? { height: '100%', maxHeight: '100%' } : undefined}>
      <div
        className="rounded-xl overflow-hidden"
        style={{
          width: boardSize,
          height: boardSize,
          background: 'radial-gradient(ellipse at center, #12121f 0%, #0a0a0f 100%)',
        }}
      >
        <Stage ref={stageRef} width={boardSize} height={boardSize}>
          <Layer>
            {/* Hex tiles */}
            {tilePositions.map(({ tile, x, y }) => {
              const control = calculateTileControl(tile, players);
              const isValidDrop = canDeploy && diceValues.includes(tile.value) && !deployedValues.includes(tile.value) && draggingValue === tile.value;
              const isControlledByMe = control.controller === currentPlayerId;
              const canBuildOnTile = canBuild && isControlledByMe;

              const probesByPlayer: { playerId: string; count: number }[] = [];
              for (const [pid, player] of Object.entries(players)) {
                const cnt = player.probes.filter(p => p.tileId === tile.id).length;
                if (cnt > 0) probesByPlayer.push({ playerId: pid, count: cnt });
              }

              // Get buildings on this tile
              const buildingsOnTile: { type: string; owner: string }[] = [];
              for (const [pid, player] of Object.entries(players)) {
                for (const building of player.buildings) {
                  if (building.tileId === tile.id) {
                    buildingsOnTile.push({ type: building.type, owner: pid });
                  }
                }
              }

              // Click handler that calculates screen position
              const handleClick = (e: KonvaEventObject<MouseEvent>) => {
                const stage = stageRef.current;
                if (stage && containerRef.current) {
                  const containerRect = containerRef.current.getBoundingClientRect();
                  // Get click position relative to viewport
                  const screenX = containerRect.left + x;
                  const screenY = containerRect.top + y;
                  onTileClick(tile.id, screenX, screenY);
                }
              };

              return (
                <HexTile
                  key={tile.id}
                  tile={tile}
                  x={x}
                  y={y}
                  size={hexSize}
                  isSelected={selectedTile === tile.id}
                  controllerId={control.controller}
                  currentPlayerId={currentPlayerId}
                  isValidDrop={isValidDrop}
                  isDragOver={dragOverTile === tile.id}
                  canBuildOnTile={canBuildOnTile}
                  probesByPlayer={probesByPlayer}
                  buildingsOnTile={buildingsOnTile}
                  onClick={handleClick}
                  onBuildingHover={(type, mouseX, mouseY) => {
                    if (type) {
                      setTooltip({ x: mouseX, y: mouseY, text: BUILDING_NAMES[type] || type });
                    } else {
                      setTooltip(null);
                    }
                  }}
                />
              );
            })}

            {/* Dice tray */}
            {canDeploy && (
              <>
                <Rect
                  x={centerX - 110}
                  y={diceY - 30}
                  width={220}
                  height={60}
                  fill="#0f0f1a"
                  stroke="#2d2d4a"
                  strokeWidth={2}
                  cornerRadius={10}
                  opacity={0.95}
                />
                <Text
                  x={centerX - 100}
                  y={diceY - 25}
                  text="Glisse sur les cases"
                  fontSize={10}
                  fill="#6b7280"
                  width={200}
                  align="center"
                />
                {diceEntries.map((d, i) => (
                  <DraggableDice
                    key={`${d.value}-${i}`}
                    value={d.value}
                    count={d.count}
                    x={diceStartX + i * 60}
                    y={diceY + 5}
                    isDeployed={deployedValues.includes(d.value)}
                    onDragEnd={handleDragEnd}
                    onDragMove={handleDragMove}
                  />
                ))}
              </>
            )}
          </Layer>
        </Stage>
      </div>

      {/* Tooltip for buildings */}
      {tooltip && (
        <div
          className="fixed bg-gray-900 text-white text-xs px-2 py-1 rounded border border-gray-700 pointer-events-none z-50 whitespace-nowrap shadow-lg"
          style={{ left: tooltip.x + 15, top: tooltip.y - 35 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

// ============ Main Board Export ============

export function Board({ G, ctx, moves, playerID, isConnected, matchData }: BoardProps) {
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [buildPopupTile, setBuildPopupTile] = useState<number | null>(null);
  const [probePopupTile, setProbePopupTile] = useState<number | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);

  const allPlayersJoined = matchData?.length === NUM_PLAYERS && matchData.every((p) => p.name);
  const allPlayersConnected = allPlayersJoined && matchData.every((p) => p.isConnected);

  if (!allPlayersJoined || !allPlayersConnected) {
    return <WaitingRoom matchData={matchData} playerID={playerID} isConnected={isConnected} />;
  }

  if (ctx.gameover) {
    return <GameOver ctx={ctx} matchData={matchData} playerID={playerID} />;
  }

  const currentPlayer = G.players[playerID || '0'];
  const isMyTurn = ctx.currentPlayer === playerID;
  const canBuild = isMyTurn && G.deploymentComplete && currentPlayer.buildings.some(b => b.type === 'factory');

  // Get my probes on a tile
  const getMyProbesOnTile = (tileId: number) => {
    return currentPlayer.probes.filter(p => p.tileId === tileId);
  };

  // Handle tile click - show build popup or probe popup depending on context
  const handleTileClick = (tileId: number, screenX: number, screenY: number) => {
    setSelectedTile(tileId);
    setBuildPopupTile(null);
    setProbePopupTile(null);

    const tile = G.tiles.find(t => t.id === tileId);
    if (!tile || !isMyTurn) return;

    const myProbesOnTile = getMyProbesOnTile(tileId);

    // If in construction mode and tile is controlled, show build popup
    if (canBuild) {
      const control = calculateTileControl(tile, G.players);
      if (control.controller === playerID) {
        setBuildPopupTile(tileId);
        setPopupPosition({ x: screenX, y: screenY });
        return;
      }
    }

    // If I have probes on this tile, show probe popup to allow recall
    if (myProbesOnTile.length > 0) {
      setProbePopupTile(tileId);
      setPopupPosition({ x: screenX, y: screenY });
    }
  };

  const handleBuild = (buildingType: string, tileId: number) => {
    moves.buildBuilding(buildingType, tileId);
    setBuildPopupTile(null);
  };

  const handleRecall = (probeIds: string[]) => {
    probeIds.forEach(probeId => moves.recallProbe(probeId));
    setProbePopupTile(null);
  };

  // Height of the site's topbar
  const siteTopbarHeight = 56;

  return (
    <div
      className="bg-[#0a0a0f] flex flex-col"
      style={{
        position: 'fixed',
        top: siteTopbarHeight,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      {/* Top bar - resources & info */}
      <div className="px-3 py-2 border-b border-gray-800/50 bg-[#0a0a0f] shrink-0">
        <div className="flex flex-col sm:flex-row items-center justify-between max-w-6xl mx-auto gap-2 sm:gap-4">
          {/* Row 1 on mobile: Player info + Players panel */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-3">
            {/* Player info */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`w-4 h-4 rounded-full ${PLAYER_COLORS[playerID as '0' | '1']?.bg || 'bg-cyan-500'}`} />
              <span className="text-white font-medium">{matchData?.find(p => String(p.id) === playerID)?.name || 'Joueur'}</span>
              <Badge className={`${isMyTurn ? 'bg-emerald-600' : 'bg-gray-700'}`}>{isMyTurn ? 'Ton tour' : 'Attente'}</Badge>
              <span className="text-sm text-gray-500">R{G.round}</span>
            </div>

            {/* Players - visible on mobile in row 1 */}
            <div className="sm:hidden">
              <CompactPlayersPanel players={G.players} matchData={matchData} currentPlayerId={playerID || '0'} />
            </div>
          </div>

          {/* Row 2 on mobile / center on desktop: Resources */}
          <CompactResourcePanel resources={currentPlayer.resources} />

          {/* Players - hidden on mobile, shown on desktop */}
          <div className="hidden sm:block">
            <CompactPlayersPanel players={G.players} matchData={matchData} currentPlayerId={playerID || '0'} />
          </div>
        </div>
      </div>

      {/* Main game area - fills remaining space */}
      <div className="flex-1 min-h-0 overflow-hidden flex items-center justify-center p-2">
        <GameBoard
          tiles={G.tiles}
          players={G.players}
          currentPlayerId={playerID || '0'}
          selectedTile={selectedTile}
          onTileClick={handleTileClick}
          diceValues={G.diceValues}
          deployedValues={G.deployedValues}
          moves={moves}
          canDeploy={ctx.phase === 'main' && isMyTurn && G.rolledDice && !G.deploymentComplete}
          canBuild={canBuild}
          playerEnergy={currentPlayer.resources.energy}
          fullscreen
        />
      </div>

      {/* Bottom bar - action panel only */}
      <div className="shrink-0 border-t border-gray-800/50 bg-[#0c0c14] p-3">
        <div className="max-w-4xl mx-auto">
          {ctx.phase === 'main' && isMyTurn ? (
            <CompactActionPanel G={G} moves={moves} playerID={playerID || '0'} />
          ) : (
            <div className="w-full h-14 flex items-center justify-center px-6 bg-gray-900/50 rounded-lg border border-gray-800">
              <span className="text-gray-500">⏳ En attente de l'adversaire...</span>
            </div>
          )}
        </div>
      </div>

      {/* Building Popup */}
      {buildPopupTile !== null && popupPosition && (
        <BuildingPopup
          x={popupPosition.x}
          y={popupPosition.y}
          tileId={buildPopupTile}
          player={currentPlayer}
          onBuild={handleBuild}
          onClose={() => setBuildPopupTile(null)}
        />
      )}

      {/* Probe Popup */}
      {probePopupTile !== null && popupPosition && (
        <ProbePopup
          x={popupPosition.x}
          y={popupPosition.y}
          tileId={probePopupTile}
          tile={G.tiles.find(t => t.id === probePopupTile)!}
          probesOnTile={getMyProbesOnTile(probePopupTile)}
          playerEnergy={currentPlayer.resources.energy}
          onRecall={handleRecall}
          onClose={() => setProbePopupTile(null)}
        />
      )}
    </div>
  );
}

// ============ Header ============

function Header({ G, ctx, matchData, playerID, isMyTurn }: { G: BoardProps['G']; ctx: BoardProps['ctx']; matchData: BoardProps['matchData']; playerID: string | null; isMyTurn: boolean }) {
  const colors = PLAYER_COLORS[playerID as '0' | '1'] || PLAYER_COLORS['0'];
  const playerName = matchData?.find(p => String(p.id) === playerID)?.name || 'Joueur';

  return (
    <div className="max-w-6xl mx-auto flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-4 h-4 rounded-full ${colors.bg}`} />
        <span className="text-white font-semibold">{playerName}</span>
      </div>
      <div className="flex items-center gap-4">
        <Badge className={isMyTurn ? 'bg-emerald-600' : 'bg-gray-700'}>{isMyTurn ? 'Ton tour' : 'Attente'}</Badge>
        <span className="text-gray-500 text-sm">Round {G.round} • {ctx.phase}</span>
      </div>
    </div>
  );
}

// ============ Resource Panel ============

function ResourcePanel({ resources }: { resources: { metal: number; organic: number; energy: number; alloy: number; biomass: number; plasma: number; intelligence: number } }) {
  return (
    <Card className="bg-[#12121a] border-[#2d2d4a]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-white">Ressources</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Intelligence progress */}
        <div className="p-3 bg-indigo-950/50 rounded-lg border border-indigo-800/50">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="flex items-center gap-1.5 text-indigo-300">
              <IntelligenceIconSvg size={16} /> Intelligence
            </span>
            <span className="font-bold text-indigo-200">{resources.intelligence}/{VICTORY_INTELLIGENCE}</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-600 to-purple-500 transition-all" style={{ width: `${(resources.intelligence / VICTORY_INTELLIGENCE) * 100}%` }} />
          </div>
        </div>

        {/* Raw resources */}
        <div className="grid grid-cols-3 gap-2">
          <ResourceBadge icon={<MetalIconSvg size={20} />} value={resources.metal} color="bg-slate-800" label="Métal" />
          <ResourceBadge icon={<OrganicIconSvg size={20} />} value={resources.organic} color="bg-green-900" label="Organique" />
          <ResourceBadge icon={<EnergyIconSvg size={20} />} value={resources.energy} color="bg-yellow-950" highlight label="Énergie" />
        </div>

        {/* Refined resources */}
        <div className="grid grid-cols-3 gap-2">
          <ResourceBadge icon={<AlloyIconSvg size={20} />} value={resources.alloy} color="bg-orange-950" label="Alliage" />
          <ResourceBadge icon={<BiomassIconSvg size={20} />} value={resources.biomass} color="bg-teal-950" label="Biomasse" />
          <ResourceBadge icon={<PlasmaIconSvg size={20} />} value={resources.plasma} color="bg-fuchsia-950" label="Plasma" />
        </div>
      </CardContent>
    </Card>
  );
}

function ResourceBadge({ icon, value, color, highlight, label }: { icon: React.ReactNode; value: number; color: string; highlight?: boolean; label: string }) {
  return (
    <div className={`p-2 rounded-lg ${color} ${highlight ? 'ring-1 ring-yellow-500/50' : ''} group relative cursor-help`} title={label}>
      <div className="flex justify-center">{icon}</div>
      <div className={`text-center text-lg font-bold ${highlight ? 'text-yellow-400' : 'text-white'}`}>{value}</div>
      <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        {label}
      </div>
    </div>
  );
}

// ============ Players Panel ============

function PlayersPanel({ players, matchData, currentPlayerId }: { players: Record<string, { probes: Probe[]; buildings: Building[]; resources: any }>; matchData?: { id: number; name?: string; isConnected?: boolean }[]; currentPlayerId: string }) {
  return (
    <Card className="bg-[#12121a] border-[#2d2d4a]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-white">Joueurs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {Object.entries(players).map(([playerId, player]) => {
          const info = matchData?.find(p => String(p.id) === playerId);
          const colors = PLAYER_COLORS[playerId as '0' | '1'];
          const isMe = playerId === currentPlayerId;

          return (
            <div key={playerId} className={`p-3 rounded-lg ${colors.bgLight} border ${colors.border}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${colors.bg}`} />
                  <span className="text-sm font-medium text-white">{info?.name || `P${playerId}`}</span>
                  {isMe && <span className="text-xs text-gray-500">(toi)</span>}
                </div>
                {info?.isConnected ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1"><IntelligenceIconSvg size={14} /> {player.resources.intelligence}</span>
                <span className="flex items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#3b82f6" stroke="#60a5fa" strokeWidth="2"/></svg>
                  {player.probes.filter(p => p.tileId === null).length}/{player.probes.length}
                </span>
                <span className="flex items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 24 24"><path d="M4 20 L4 8 L12 4 L20 8 L20 20 Z" fill="#64748b" stroke="#94a3b8" strokeWidth="1.5"/></svg>
                  {player.buildings.length}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ============ Tile Details ============

function TileDetails({ tile, players, currentPlayerId }: { tile: Tile; players: Record<string, { probes: Probe[]; buildings: Building[]; resources: any }>; currentPlayerId: string }) {
  const control = calculateTileControl(tile, players);

  return (
    <Card className="bg-[#12121a] border-[#2d2d4a]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-white">Tuile {tile.id}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <div className="flex items-center gap-2 text-gray-300">
          {tile.resourceType === 'metal' ? <MetalIconSvg size={18} /> : <OrganicIconSvg size={18} />}
          <span>{tile.resourceType === 'metal' ? 'Métal' : 'Organique'}: {tile.resourceCount}</span>
        </div>
        <div className="text-gray-300">
          Dé: <span className="font-bold text-white">{tile.value}</span>
        </div>
        <div className="text-gray-300">
          Contrôle: {control.controller ? (
            <span className={PLAYER_COLORS[control.controller as '0' | '1']?.text}>Joueur {control.controller}</span>
          ) : (
            <span className="text-gray-500">Aucun</span>
          )}
        </div>
        {control.harvestCount > 0 && <div className="text-green-400">Récolte: +{control.harvestCount}</div>}
      </CardContent>
    </Card>
  );
}

// ============ Building Data ============

const BUILDINGS: { type: string; name: string; desc: string; cost: { metal?: number; organic?: number; energy?: number; alloy?: number; biomass?: number } }[] = [
  { type: 'windTurbine', name: 'Éolienne', desc: '+2 énergie/tour', cost: { metal: 2, organic: 1 } },
  { type: 'factory', name: 'Usine', desc: 'Permet construction', cost: { metal: 2 } },
  { type: 'orbitalForge', name: 'Forge', desc: '2 métal → 1 alliage', cost: { metal: 2 } },
  { type: 'bioLab', name: 'Labo Bio', desc: '2 organique → 1 biomasse', cost: { organic: 2 } },
  { type: 'condenser', name: 'Condenseur', desc: '3 énergie → 1 plasma', cost: { energy: 3 } },
  { type: 'chipEngraver', name: 'Graveur', desc: '1 alliage + 1 biomasse → 1 intel', cost: { alloy: 1, biomass: 1 } },
  { type: 'biomassFactory', name: 'Usine Bio', desc: 'Brûle biomasse → +2 énergie', cost: { metal: 1, biomass: 1 } },
  { type: 'turret', name: 'Tourelle', desc: '+1 défense sur tuile', cost: { metal: 1, energy: 1 } },
];

const ACTIVATABLE_NAMES: Record<string, string> = { orbitalForge: 'Forge', bioLab: 'Labo', condenser: 'Condenseur', chipEngraver: 'Graveur', biomassFactory: 'Usine Bio' };

function renderCost(cost: typeof BUILDINGS[0]['cost']) {
  const icons: Record<string, React.ReactNode> = {
    metal: <MetalIconSvg size={12} />,
    organic: <OrganicIconSvg size={12} />,
    energy: <EnergyIconSvg size={12} />,
    alloy: <AlloyIconSvg size={12} />,
    biomass: <BiomassIconSvg size={12} />,
  };
  return (
    <span className="flex items-center gap-1 text-[10px] text-gray-400">
      {Object.entries(cost).map(([res, amt], i) => (
        <span key={res} className="flex items-center">
          {i > 0 && <span className="mx-0.5">+</span>}
          {amt}{icons[res]}
        </span>
      ))}
    </span>
  );
}

// ============ Building Popup (Context Menu) ============

function BuildingPopup({ x, y, tileId, player, onBuild, onClose }: {
  x: number;
  y: number;
  tileId: number;
  player: { resources: { metal: number; organic: number; energy: number; alloy: number; biomass: number; plasma: number; intelligence: number } };
  onBuild: (buildingType: string, tileId: number) => void;
  onClose: () => void;
}) {
  const canAfford = (cost: typeof BUILDINGS[0]['cost']) => {
    return Object.entries(cost).every(([res, amt]) =>
      player.resources[res as keyof typeof player.resources] >= (amt || 0)
    );
  };

  // Adjust position to stay on screen
  const popupWidth = 200;
  const popupHeight = 320;
  const adjustedX = Math.min(x, window.innerWidth - popupWidth - 20);
  const adjustedY = Math.min(y, window.innerHeight - popupHeight - 20);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Popup */}
      <div
        className="fixed z-50 bg-[#1a1a2e] border border-emerald-700 rounded-lg shadow-xl p-2"
        style={{ left: adjustedX, top: adjustedY, width: popupWidth }}
      >
        <div className="flex justify-between items-center mb-2 pb-1 border-b border-gray-700">
          <span className="text-xs font-semibold text-emerald-400">Construire sur T{tileId}</span>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-sm">✕</button>
        </div>

        <div className="space-y-1 max-h-72 overflow-y-auto">
          {BUILDINGS.map(b => {
            const affordable = canAfford(b.cost);
            return (
              <button
                key={b.type}
                onClick={() => { if (affordable) onBuild(b.type, tileId); }}
                disabled={!affordable}
                className={`w-full p-2 rounded text-left transition-colors ${
                  affordable
                    ? 'bg-gray-800 hover:bg-emerald-900/50 border border-gray-700 hover:border-emerald-600'
                    : 'bg-gray-900 border border-gray-800 opacity-40 cursor-not-allowed'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-white">{b.name}</span>
                  {renderCost(b.cost)}
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">{b.desc}</p>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ============ Probe Popup (Context Menu for recalling probes) ============

function ProbePopup({ x, y, tileId, tile, probesOnTile, playerEnergy, onRecall, onClose }: {
  x: number;
  y: number;
  tileId: number;
  tile: Tile;
  probesOnTile: Probe[];
  playerEnergy: number;
  onRecall: (probeIds: string[]) => void;
  onClose: () => void;
}) {
  const probeCount = probesOnTile.length;
  const maxRecallable = Math.min(probeCount, playerEnergy);

  // Adjust position to stay on screen
  const popupWidth = 180;
  const popupHeight = 160;
  const adjustedX = Math.min(Math.max(10, x - popupWidth / 2), window.innerWidth - popupWidth - 10);
  const adjustedY = Math.min(y + 20, window.innerHeight - popupHeight - 10);

  const handleRecallCount = (count: number) => {
    const probeIds = probesOnTile.slice(0, count).map(p => p.id);
    onRecall(probeIds);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Popup */}
      <div
        className="fixed z-50 bg-[#1a1a2e] border border-cyan-700 rounded-lg shadow-xl p-3"
        style={{ left: adjustedX, top: adjustedY, width: popupWidth }}
      >
        <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-700">
          <span className="text-xs font-semibold text-cyan-400">
            Sondes sur T{tileId}
          </span>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-sm">✕</button>
        </div>

        <div className="text-center mb-3">
          <div className="text-2xl font-bold text-white">{probeCount}</div>
          <div className="text-xs text-gray-400">sonde{probeCount > 1 ? 's' : ''} déployée{probeCount > 1 ? 's' : ''}</div>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] text-gray-500 mb-2">
            Rappeler (1 <EnergyIconSvg size={10} className="inline" /> / sonde)
          </p>

          {maxRecallable === 0 ? (
            <p className="text-xs text-red-400 text-center py-2">Pas assez d'énergie</p>
          ) : (
            <div className="flex flex-wrap gap-1 justify-center">
              {Array.from({ length: maxRecallable }, (_, i) => i + 1).map(count => (
                <button
                  key={count}
                  onClick={() => handleRecallCount(count)}
                  className="px-3 py-1.5 bg-cyan-900/50 hover:bg-cyan-800 border border-cyan-700 rounded text-xs text-white font-medium transition-colors"
                >
                  {count === probeCount ? 'Toutes' : count}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ============ Action Panel (Deploy → Build flow) ============

function ActionPanel({ G, moves, playerID }: { G: BoardProps['G']; moves: BoardProps['moves']; playerID: string }) {
  const player = G.players[playerID];
  const freeProbes = player.probes.filter(p => p.tileId === null);
  const deployedProbes = player.probes.filter(p => p.tileId !== null);
  const deployedCount = G.deployedValues.length;
  const totalDice = [...new Set(G.diceValues)].length;
  const canRecall = player.resources.energy >= 1;

  // Construction data
  const activatable = player.buildings.filter(b => !b.activated && ['orbitalForge', 'bioLab', 'condenser', 'chipEngraver', 'biomassFactory'].includes(b.type));
  const hasFactory = player.buildings.some(b => b.type === 'factory');
  const controlledTiles = G.tiles.filter(tile => {
    const control = calculateTileControl(tile, G.players);
    return control.controller === playerID;
  });

  const canAfford = (cost: typeof BUILDINGS[0]['cost']) => {
    return Object.entries(cost).every(([res, amt]) =>
      player.resources[res as keyof typeof player.resources] >= (amt || 0)
    );
  };

  // Phase 1: Deployment (not yet complete)
  if (!G.deploymentComplete) {
    return (
      <Card className="bg-[#12121a] border-amber-800/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-amber-400">🎲 Déploiement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!G.rolledDice ? (
            <>
              <div className="text-[10px] text-gray-400">
                {freeProbes.length} sondes libres • {deployedProbes.length} déployées
              </div>
              {freeProbes.length > 0 ? (
                <Button size="sm" className="w-full h-8 text-xs bg-amber-600 hover:bg-amber-500" onClick={() => moves.rollProbes()}>
                  🎲 Lancer {freeProbes.length} dés
                </Button>
              ) : (
                <p className="text-[10px] text-gray-500">Aucune sonde libre à lancer</p>
              )}

              {/* Recall deployed probes */}
              {deployedProbes.length > 0 && (
                <div className="pt-2 border-t border-gray-800">
                  <p className="text-[10px] text-gray-500 mb-1">Rappeler (1 énergie):</p>
                  <div className="flex flex-wrap gap-1">
                    {deployedProbes.slice(0, 6).map(probe => {
                      const tile = G.tiles.find(t => t.id === probe.tileId);
                      return (
                        <Button key={probe.id} size="sm" variant="outline" className="text-[10px] px-1.5 py-0.5 h-auto"
                          onClick={() => moves.recallProbe(probe.id)} disabled={!canRecall}>
                          ↩T{tile?.id}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-xs text-gray-300">
                Glisse les dés sur les tuiles correspondantes
              </div>
              <div className="text-sm font-bold text-amber-400">
                Déployé: {deployedCount}/{totalDice}
              </div>
            </>
          )}

          {/* End deployment button */}
          <Button
            size="sm"
            className="w-full bg-emerald-600 hover:bg-emerald-500"
            onClick={() => moves.endDeployment()}
          >
            {G.rolledDice ? 'Terminer déploiement →' : 'Passer au build →'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Phase 2: Construction (after deployment complete)
  return (
    <Card className="bg-[#12121a] border-emerald-800/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-emerald-400">🔨 Construction</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-[10px] text-gray-400">
          Clique sur une tuile contrôlée pour construire
        </p>

        {/* Activate existing buildings */}
        {activatable.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] text-gray-500">Activer (1 énergie):</p>
            <div className="flex flex-wrap gap-1">
              {activatable.map(b => (
                <Button key={b.id} size="sm" variant="outline" className="text-[10px] px-2 py-1 h-auto"
                  onClick={() => moves.activateBuilding(b.id)} disabled={player.resources.energy < 1}>
                  ⚡ {ACTIVATABLE_NAMES[b.type] || b.type}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Build probe */}
        <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={() => moves.buildProbe()}
          disabled={player.probes.length >= 12 || player.resources.alloy < 1 || player.resources.organic < 1}>
          + Nouvelle sonde (1 alliage + 1 organique)
        </Button>

        {/* Info about clicking tiles */}
        {hasFactory && controlledTiles.length > 0 ? (
          <div className="p-2 bg-emerald-950/30 rounded border border-emerald-800/50">
            <p className="text-[10px] text-emerald-300">
              💡 {controlledTiles.length} tuile{controlledTiles.length > 1 ? 's' : ''} contrôlée{controlledTiles.length > 1 ? 's' : ''}
            </p>
            <p className="text-[9px] text-gray-500 mt-1">Clique dessus pour ouvrir le menu de construction</p>
          </div>
        ) : !hasFactory ? (
          <p className="text-[10px] text-red-400">⚠️ Usine requise pour construire</p>
        ) : (
          <p className="text-[10px] text-yellow-400">⚠️ Contrôle une tuile d'abord</p>
        )}

        {/* End turn */}
        <Button size="sm" className="w-full bg-cyan-600 hover:bg-cyan-500" onClick={() => moves.endTurn()}>
          Fin du tour →
        </Button>
      </CardContent>
    </Card>
  );
}

// ============ Compact Resource Panel (Bottom bar) ============

function ResourceWithTooltip({ icon, value, label, highlight }: { icon: React.ReactNode; value: number; label: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 relative group cursor-help">
      {icon}
      <span className={`font-bold ${highlight ? 'text-yellow-400' : 'text-white'}`}>{value}</span>
      <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-gray-700">
        {label}
      </div>
    </div>
  );
}

function CompactResourcePanel({ resources }: { resources: { metal: number; organic: number; energy: number; alloy: number; biomass: number; plasma: number; intelligence: number } }) {
  return (
    <div className="flex items-center gap-1 px-3 sm:px-4 py-2 bg-gray-900/50 rounded-lg border border-gray-800">
      {/* Raw */}
      <div className="flex items-center gap-2 sm:gap-4 pr-2 sm:pr-4 border-r border-gray-700">
        <ResourceWithTooltip icon={<MetalIconSvg size={22} />} value={resources.metal} label="Métal" />
        <ResourceWithTooltip icon={<OrganicIconSvg size={22} />} value={resources.organic} label="Organique" />
        <ResourceWithTooltip icon={<EnergyIconSvg size={22} />} value={resources.energy} label="Énergie" highlight />
      </div>
      {/* Refined */}
      <div className="flex items-center gap-2 sm:gap-4 px-2 sm:px-4 border-r border-gray-700">
        <ResourceWithTooltip icon={<AlloyIconSvg size={22} />} value={resources.alloy} label="Alliage" />
        <ResourceWithTooltip icon={<BiomassIconSvg size={22} />} value={resources.biomass} label="Biomasse" />
        <ResourceWithTooltip icon={<PlasmaIconSvg size={22} />} value={resources.plasma} label="Plasma" />
      </div>
      {/* Intelligence */}
      <div className="pl-2 sm:pl-4">
        <ResourceWithTooltip icon={<IntelligenceIconSvg size={22} />} value={resources.intelligence} label="Intelligence" />
      </div>
    </div>
  );
}

// ============ Compact Action Panel (Bottom bar) ============

function CompactActionPanel({ G, moves, playerID }: { G: BoardProps['G']; moves: BoardProps['moves']; playerID: string }) {
  const player = G.players[playerID];
  const freeProbes = player.probes.filter(p => p.tileId === null);
  const deployedProbes = player.probes.filter(p => p.tileId !== null);
  const deployedCount = G.deployedValues.length;
  const totalDice = [...new Set(G.diceValues)].length;

  const activatable = player.buildings.filter(b => !b.activated && ['orbitalForge', 'bioLab', 'condenser', 'chipEngraver', 'biomassFactory'].includes(b.type));
  const hasFactory = player.buildings.some(b => b.type === 'factory');
  const controlledTiles = G.tiles.filter(tile => calculateTileControl(tile, G.players).controller === playerID);

  // Deployment phase
  if (!G.deploymentComplete) {
    return (
      <div className="w-full flex items-center gap-4 h-14 px-5 bg-amber-950/30 rounded-lg border border-amber-800/50">
        <span className="text-amber-400 font-semibold">🎲 Déploiement</span>
        {!G.rolledDice ? (
          <>
            <span className="text-sm text-gray-400">{freeProbes.length} sondes libres • {deployedProbes.length} déployées</span>
            {freeProbes.length > 0 && (
              <Button size="sm" className="h-9 px-4 bg-amber-600 hover:bg-amber-500" onClick={() => moves.rollProbes()}>
                🎲 Lancer {freeProbes.length} dés
              </Button>
            )}
          </>
        ) : (
          <span className="text-sm text-amber-300">Glisse les dés sur les tuiles • <span className="font-bold text-lg">{deployedCount}/{totalDice}</span></span>
        )}
        <Button size="sm" className="h-9 px-4 bg-emerald-600 hover:bg-emerald-500 ml-auto" onClick={() => moves.endDeployment()}>
          {G.rolledDice ? 'Terminer déploiement →' : 'Passer au build →'}
        </Button>
      </div>
    );
  }

  // Construction phase
  return (
    <div className="w-full flex items-center gap-4 h-14 px-5 bg-emerald-950/30 rounded-lg border border-emerald-800/50">
      <span className="text-emerald-400 font-semibold">🔨 Construction</span>

      {/* Activate buildings */}
      {activatable.length > 0 && (
        <div className="flex items-center gap-1">
          {activatable.slice(0, 4).map(b => (
            <Button key={b.id} size="sm" variant="outline" className="h-8 text-xs px-3"
              onClick={() => moves.activateBuilding(b.id)} disabled={player.resources.energy < 1}>
              ⚡ {ACTIVATABLE_NAMES[b.type]}
            </Button>
          ))}
        </div>
      )}

      {/* Build probe */}
      <Button size="sm" variant="outline" className="h-8 px-3" onClick={() => moves.buildProbe()}
        disabled={player.probes.length >= 12 || player.resources.alloy < 1 || player.resources.organic < 1}>
        + Sonde
      </Button>

      {/* Status */}
      {hasFactory && controlledTiles.length > 0 ? (
        <span className="text-sm text-emerald-300">💡 Clique sur une tuile contrôlée pour construire</span>
      ) : !hasFactory ? (
        <span className="text-sm text-red-400">⚠️ Usine requise pour construire</span>
      ) : (
        <span className="text-sm text-yellow-400">⚠️ Contrôle une tuile d'abord</span>
      )}

      <Button size="sm" className="h-9 px-4 bg-cyan-600 hover:bg-cyan-500 ml-auto" onClick={() => moves.endTurn()}>
        Fin du tour →
      </Button>
    </div>
  );
}

// ============ Compact Players Panel (Bottom bar) ============

function CompactPlayersPanel({ players, matchData, currentPlayerId }: { players: Record<string, { probes: Probe[]; buildings: Building[]; resources: any }>; matchData?: { id: number; name?: string; isConnected?: boolean }[]; currentPlayerId: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-900/50 rounded-lg border border-gray-800">
      {Object.entries(players).map(([playerId, player]) => {
        const info = matchData?.find(p => String(p.id) === playerId);
        const colors = PLAYER_COLORS[playerId as '0' | '1'];
        const isMe = playerId === currentPlayerId;

        return (
          <div key={playerId} className={`flex items-center gap-2 px-2 py-1 rounded ${isMe ? colors.bgLight : ''}`}>
            <div className={`w-2.5 h-2.5 rounded-full ${colors.bg}`} />
            <span className="text-xs text-white font-medium">{info?.name || `P${playerId}`}</span>
            <span className="text-xs text-gray-400">
              <IntelligenceIconSvg size={12} className="inline mr-0.5" />
              {player.resources.intelligence}
            </span>
            <span className="text-xs text-gray-500">
              {player.probes.filter(p => p.tileId === null).length}/{player.probes.length}🔵
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ============ Waiting Room ============

function WaitingRoom({ matchData, playerID, isConnected }: { matchData?: { id: number; name?: string; isConnected?: boolean }[]; playerID: string | null; isConnected?: boolean }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-4">
      <Card className="max-w-sm w-full bg-[#12121a] border-[#2d2d4a]">
        <CardHeader className="text-center pb-2">
          <CardTitle className="flex items-center justify-center gap-2 text-white">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
            En attente des joueurs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: NUM_PLAYERS }, (_, i) => {
            const p = matchData?.find(x => x.id === i);
            const isYou = p && String(p.id) === playerID;
            const colors = PLAYER_COLORS[String(i) as '0' | '1'];

            return (
              <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${p?.name ? colors.bgLight : 'bg-gray-800/30'} ${p?.name ? colors.border : 'border-gray-700'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${p?.name ? colors.bg : 'bg-gray-600'}`} />
                  <span className="text-white">{p?.name || 'En attente...'}{isYou && ' (toi)'}</span>
                </div>
                {p?.name && (p.isConnected ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />)}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

// ============ Game Over ============

function GameOver({ ctx, matchData, playerID }: { ctx: BoardProps['ctx']; matchData: BoardProps['matchData']; playerID: string | null }) {
  const winner = ctx.gameover?.winner;
  const winnerName = matchData?.find(p => String(p.id) === winner)?.name || `Joueur ${winner}`;
  const isWinner = winner === playerID;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-4">
      <Card className={`max-w-sm w-full border-2 ${isWinner ? 'border-amber-500 bg-amber-950/30' : 'border-gray-700 bg-[#12121a]'}`}>
        <CardHeader className="text-center">
          <CardTitle className={`text-3xl ${isWinner ? 'text-amber-400' : 'text-gray-400'}`}>
            {isWinner ? '🏆 Victoire!' : 'Défaite'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-white text-lg">{winnerName} a atteint la Singularité!</p>
          <p className="text-gray-400 mt-2">Intelligence: {ctx.gameover?.intelligence}</p>
        </CardContent>
      </Card>
    </div>
  );
}
