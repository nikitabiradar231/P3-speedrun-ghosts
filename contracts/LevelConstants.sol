// SPDX-License-Identifier: MIT
// AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
// Generated from src/level/canonical_level.json
// Canonical SHA-256: 52fdf0a33202b2c18254749ff4abc32c0a27b82a8b7fb9c2e0253afe7410620e
pragma solidity ^0.8.24;

struct Rect {
    int32 x;
    int32 y;
    int32 w;
    int32 h;
}

uint256 constant SOLIDS_COUNT = 7;
uint256 constant HAZARDS_COUNT = 3;

library LevelConstants {
    bytes32 internal constant LEVEL_HASH = bytes32(0x52fdf0a33202b2c18254749ff4abc32c0a27b82a8b7fb9c2e0253afe7410620e);
    uint16 internal constant LEVEL_VERSION = 1;

    int32 internal constant UNIT_SCALE = 1000;

    // World bounds
    int32 internal constant WORLD_WIDTH = 800000;
    int32 internal constant WORLD_HEIGHT = 500000;
    int32 internal constant DEATH_Y = 500000;
    uint16 internal constant TICKS_PER_SECOND = 30;
    uint16 internal constant MAX_TICKS = 600;

    // Player constants
    int32 internal constant PLAYER_WIDTH = 20000;
    int32 internal constant PLAYER_HEIGHT = 28000;
    int32 internal constant MOVE_SPEED = 4000;
    int32 internal constant JUMP_VELOCITY = -11000;
    int32 internal constant GRAVITY = 700;
    int32 internal constant MAX_FALL_SPEED = 14000;

    // Spawn point
    int32 internal constant SPAWN_X = 40000;
    int32 internal constant SPAWN_Y = 372000;

    // Goal
    int32 internal constant GOAL_X = 720000;
    int32 internal constant GOAL_Y = 300000;
    int32 internal constant GOAL_W = 30000;
    int32 internal constant GOAL_H = 50000;

    function getSolids() internal pure returns (Rect[SOLIDS_COUNT] memory solids) {
        solids[0] = Rect({ x: 0, y: 400000, w: 160000, h: 100000 });
        solids[1] = Rect({ x: 180000, y: 360000, w: 90000, h: 20000 });
        solids[2] = Rect({ x: 300000, y: 310000, w: 90000, h: 20000 });
        solids[3] = Rect({ x: 420000, y: 260000, w: 90000, h: 20000 });
        solids[4] = Rect({ x: 530000, y: 200000, w: 20000, h: 120000 });
        solids[5] = Rect({ x: 570000, y: 280000, w: 80000, h: 20000 });
        solids[6] = Rect({ x: 670000, y: 350000, w: 130000, h: 150000 });
    }

    function getHazards() internal pure returns (Rect[HAZARDS_COUNT] memory hazards) {
        hazards[0] = Rect({ x: 160000, y: 460000, w: 140000, h: 40000 });
        hazards[1] = Rect({ x: 300000, y: 460000, w: 370000, h: 40000 });
        hazards[2] = Rect({ x: 530000, y: 320000, w: 20000, h: 30000 });
    }
}
