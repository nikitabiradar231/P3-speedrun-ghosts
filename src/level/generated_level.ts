// AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
// Generated from src/level/canonical_level.json
// Canonical SHA-256: 52fdf0a33202b2c18254749ff4abc32c0a27b82a8b7fb9c2e0253afe7410620e

export interface LevelRect {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface LevelConfig {
  readonly name: string;
  readonly version: number;
  readonly unitScale: number;
  readonly canonicalHash: string;
  readonly world: {
    readonly width: number;
    readonly height: number;
    readonly deathY: number;
    readonly ticksPerSecond: number;
    readonly maxTicks: number;
  };
  readonly player: {
    readonly width: number;
    readonly height: number;
    readonly moveSpeed: number;
    readonly jumpVelocity: number;
    readonly gravity: number;
    readonly maxFallSpeed: number;
  };
  readonly spawn: {
    readonly x: number;
    readonly y: number;
  };
  readonly goal: {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
  };
  readonly solids: readonly LevelRect[];
  readonly hazards: readonly LevelRect[];
}

export const CANONICAL_LEVEL_HASH = "52fdf0a33202b2c18254749ff4abc32c0a27b82a8b7fb9c2e0253afe7410620e";

export const LEVEL_DATA: LevelConfig = {
  name: "Neon Gauntlet Alpha",
  version: 1,
  unitScale: 1000,
  canonicalHash: "52fdf0a33202b2c18254749ff4abc32c0a27b82a8b7fb9c2e0253afe7410620e",
  world: {
    width: 800000,
    height: 500000,
    deathY: 500000,
    ticksPerSecond: 30,
    maxTicks: 600,
  },
  player: {
    width: 20000,
    height: 28000,
    moveSpeed: 4000,
    jumpVelocity: -11000,
    gravity: 700,
    maxFallSpeed: 14000,
  },
  spawn: {
    x: 40000,
    y: 372000,
  },
  goal: {
    x: 720000,
    y: 300000,
    w: 30000,
    h: 50000,
  },
  solids: [
  {
    "id": "start_floor",
    "x": 0,
    "y": 400000,
    "w": 160000,
    "h": 100000
  },
  {
    "id": "plat_1",
    "x": 180000,
    "y": 360000,
    "w": 90000,
    "h": 20000
  },
  {
    "id": "plat_2",
    "x": 300000,
    "y": 310000,
    "w": 90000,
    "h": 20000
  },
  {
    "id": "plat_3",
    "x": 420000,
    "y": 260000,
    "w": 90000,
    "h": 20000
  },
  {
    "id": "obstacle_wall",
    "x": 530000,
    "y": 200000,
    "w": 20000,
    "h": 120000
  },
  {
    "id": "plat_4",
    "x": 570000,
    "y": 280000,
    "w": 80000,
    "h": 20000
  },
  {
    "id": "goal_island",
    "x": 670000,
    "y": 350000,
    "w": 130000,
    "h": 150000
  }
] as const,
  hazards: [
  {
    "id": "pit_spikes_1",
    "x": 160000,
    "y": 460000,
    "w": 140000,
    "h": 40000
  },
  {
    "id": "pit_spikes_2",
    "x": 300000,
    "y": 460000,
    "w": 370000,
    "h": 40000
  },
  {
    "id": "wall_spikes",
    "x": 530000,
    "y": 320000,
    "w": 20000,
    "h": 30000
  }
] as const,
} as const;
