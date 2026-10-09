import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export interface Rect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CanonicalLevel {
  $schema: string;
  name: string;
  version: number;
  unitScale: number;
  world: {
    width: number;
    height: number;
    deathY: number;
    ticksPerSecond: number;
    maxTicks: number;
  };
  player: {
    width: number;
    height: number;
    moveSpeed: number;
    jumpVelocity: number;
    gravity: number;
    maxFallSpeed: number;
  };
  spawn: {
    x: number;
    y: number;
  };
  goal: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  solids: Rect[];
  hazards: Rect[];
}

export function loadAndValidateCanonicalLevel(jsonPath: string): { level: CanonicalLevel; hash: string } {
  const content = fs.readFileSync(jsonPath, 'utf-8');
  const level = JSON.parse(content) as CanonicalLevel;

  // Basic validation
  if (!level.world || level.world.width <= 0 || level.world.height <= 0) {
    throw new Error('Invalid level world dimensions');
  }
  if (!level.player || level.player.width <= 0 || level.player.height <= 0) {
    throw new Error('Invalid player dimensions');
  }
  if (level.world.maxTicks <= 0 || level.world.maxTicks > 2000) {
    throw new Error('Invalid maxTicks constraint');
  }
  if (!Array.isArray(level.solids) || level.solids.length === 0) {
    throw new Error('Level must contain at least one solid platform');
  }

  // Compute canonical hash (stable JSON string)
  const hash = crypto.createHash('sha256').update(JSON.stringify(level)).digest('hex');
  return { level, hash };
}

export function generateTypeScriptArtifact(level: CanonicalLevel, hash: string): string {
  return `// AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
// Generated from src/level/canonical_level.json
// Canonical SHA-256: ${hash}

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

export const CANONICAL_LEVEL_HASH = "${hash}";

export const LEVEL_DATA: LevelConfig = {
  name: ${JSON.stringify(level.name)},
  version: ${level.version},
  unitScale: ${level.unitScale},
  canonicalHash: "${hash}",
  world: {
    width: ${level.world.width},
    height: ${level.world.height},
    deathY: ${level.world.deathY},
    ticksPerSecond: ${level.world.ticksPerSecond},
    maxTicks: ${level.world.maxTicks},
  },
  player: {
    width: ${level.player.width},
    height: ${level.player.height},
    moveSpeed: ${level.player.moveSpeed},
    jumpVelocity: ${level.player.jumpVelocity},
    gravity: ${level.player.gravity},
    maxFallSpeed: ${level.player.maxFallSpeed},
  },
  spawn: {
    x: ${level.spawn.x},
    y: ${level.spawn.y},
  },
  goal: {
    x: ${level.goal.x},
    y: ${level.goal.y},
    w: ${level.goal.w},
    h: ${level.goal.h},
  },
  solids: ${JSON.stringify(level.solids, null, 2)} as const,
  hazards: ${JSON.stringify(level.hazards, null, 2)} as const,
} as const;
`;
}

export function generateSolidityArtifact(level: CanonicalLevel, hash: string): string {
  const solidsLines = level.solids
    .map((s, i) => `        solids[${i}] = Rect({ x: ${s.x}, y: ${s.y}, w: ${s.w}, h: ${s.h} });`)
    .join('\n');

  const hazardsLines = level.hazards
    .map((h, i) => `        hazards[${i}] = Rect({ x: ${h.x}, y: ${h.y}, w: ${h.w}, h: ${h.h} });`)
    .join('\n');

  return `// SPDX-License-Identifier: MIT
// AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
// Generated from src/level/canonical_level.json
// Canonical SHA-256: ${hash}
pragma solidity ^0.8.24;

struct Rect {
    int32 x;
    int32 y;
    int32 w;
    int32 h;
}

uint256 constant SOLIDS_COUNT = ${level.solids.length};
uint256 constant HAZARDS_COUNT = ${level.hazards.length};

library LevelConstants {
    bytes32 internal constant LEVEL_HASH = bytes32(0x${hash});
    uint16 internal constant LEVEL_VERSION = ${level.version};

    int32 internal constant UNIT_SCALE = ${level.unitScale};

    // World bounds
    int32 internal constant WORLD_WIDTH = ${level.world.width};
    int32 internal constant WORLD_HEIGHT = ${level.world.height};
    int32 internal constant DEATH_Y = ${level.world.deathY};
    uint16 internal constant TICKS_PER_SECOND = ${level.world.ticksPerSecond};
    uint16 internal constant MAX_TICKS = ${level.world.maxTicks};

    // Player constants
    int32 internal constant PLAYER_WIDTH = ${level.player.width};
    int32 internal constant PLAYER_HEIGHT = ${level.player.height};
    int32 internal constant MOVE_SPEED = ${level.player.moveSpeed};
    int32 internal constant JUMP_VELOCITY = ${level.player.jumpVelocity};
    int32 internal constant GRAVITY = ${level.player.gravity};
    int32 internal constant MAX_FALL_SPEED = ${level.player.maxFallSpeed};

    // Spawn point
    int32 internal constant SPAWN_X = ${level.spawn.x};
    int32 internal constant SPAWN_Y = ${level.spawn.y};

    // Goal
    int32 internal constant GOAL_X = ${level.goal.x};
    int32 internal constant GOAL_Y = ${level.goal.y};
    int32 internal constant GOAL_W = ${level.goal.w};
    int32 internal constant GOAL_H = ${level.goal.h};

    function getSolids() internal pure returns (Rect[SOLIDS_COUNT] memory solids) {
${solidsLines}
    }

    function getHazards() internal pure returns (Rect[HAZARDS_COUNT] memory hazards) {
${hazardsLines}
    }
}
`;
}

export function runGeneration(): void {
  const jsonPath = path.join(rootDir, 'src', 'level', 'canonical_level.json');
  const tsPath = path.join(rootDir, 'src', 'level', 'generated_level.ts');
  const solPath = path.join(rootDir, 'contracts', 'LevelConstants.sol');

  const { level, hash } = loadAndValidateCanonicalLevel(jsonPath);

  const tsCode = generateTypeScriptArtifact(level, hash);
  fs.mkdirSync(path.dirname(tsPath), { recursive: true });
  fs.writeFileSync(tsPath, tsCode, 'utf-8');
  console.log(`[LevelGen] Generated ${tsPath}`);

  const solCode = generateSolidityArtifact(level, hash);
  fs.mkdirSync(path.dirname(solPath), { recursive: true });
  fs.writeFileSync(solPath, solCode, 'utf-8');
  console.log(`[LevelGen] Generated ${solPath}`);
}

// If invoked directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runGeneration();
}
