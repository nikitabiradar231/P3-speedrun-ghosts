import { LEVEL_DATA } from '../level/generated_level.ts';

export interface PlayerState {
  x: number; // in milliunits
  y: number; // in milliunits
  vx: number;
  vy: number;
  onGround: boolean;
}

export interface SimulationResult {
  completed: boolean;
  died: boolean;
  finishTick: number; // 1-indexed tick when goal was reached
  deathTick: number;
  finalX: number;
  finalY: number;
  states: PlayerState[]; // full trajectory snapshot for visualization / ghost replay
}

export interface TickInput {
  left: boolean;
  right: boolean;
  jump: boolean;
}

export const INPUT_MASK = {
  NONE: 0x00,
  LEFT: 0x01,
  RIGHT: 0x02,
  JUMP: 0x04,
} as const;

export function encodeInputByte(input: TickInput): number {
  let byte = 0;
  if (input.left) byte |= INPUT_MASK.LEFT;
  if (input.right) byte |= INPUT_MASK.RIGHT;
  if (input.jump) byte |= INPUT_MASK.JUMP;
  return byte;
}

export function decodeInputByte(byte: number): TickInput {
  return {
    left: (byte & INPUT_MASK.LEFT) !== 0,
    right: (byte & INPUT_MASK.RIGHT) !== 0,
    jump: (byte & INPUT_MASK.JUMP) !== 0,
  };
}

export function intersects(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

/**
 * Deterministic integer fixed-point physics simulation matching Solidity contract exactly.
 */
export function stepSimulation(state: PlayerState, inputByte: number): { died: boolean; completed: boolean } {
  // Check for invalid bits
  if ((inputByte & 0xf8) !== 0) {
    return { died: true, completed: false };
  }

  const { left, right, jump } = decodeInputByte(inputByte);

  // Horizontal acceleration / movement
  if (left && right) {
    state.vx = 0;
  } else if (left) {
    state.vx = -LEVEL_DATA.player.moveSpeed;
  } else if (right) {
    state.vx = LEVEL_DATA.player.moveSpeed;
  } else {
    state.vx = 0;
  }

  // Jump impulse
  if (jump && state.onGround) {
    state.vy = LEVEL_DATA.player.jumpVelocity;
    state.onGround = false;
  }

  // Gravity
  state.vy += LEVEL_DATA.player.gravity;
  if (state.vy > LEVEL_DATA.player.maxFallSpeed) {
    state.vy = LEVEL_DATA.player.maxFallSpeed;
  }

  // Horizontal movement & collision
  let xNext = state.x + state.vx;
  if (xNext < 0) xNext = 0;
  const maxWorldX = LEVEL_DATA.world.width - LEVEL_DATA.player.width;
  if (xNext > maxWorldX) {
    xNext = maxWorldX;
  }

  for (const solid of LEVEL_DATA.solids) {
    if (intersects(xNext, state.y, LEVEL_DATA.player.width, LEVEL_DATA.player.height, solid.x, solid.y, solid.w, solid.h)) {
      if (state.vx > 0) {
        xNext = solid.x - LEVEL_DATA.player.width;
      } else if (state.vx < 0) {
        xNext = solid.x + solid.w;
      }
    }
  }
  state.x = xNext;

  // Vertical movement & collision
  let yNext = state.y + state.vy;
  let landed = false;

  for (const solid of LEVEL_DATA.solids) {
    if (intersects(state.x, yNext, LEVEL_DATA.player.width, LEVEL_DATA.player.height, solid.x, solid.y, solid.w, solid.h)) {
      if (state.vy > 0) {
        // Falling down onto solid platform
        if (state.y + LEVEL_DATA.player.height <= solid.y) {
          yNext = solid.y - LEVEL_DATA.player.height;
          state.vy = 0;
          landed = true;
        }
      } else if (state.vy < 0) {
        // Moving up hitting ceiling
        if (state.y >= solid.y + solid.h) {
          yNext = solid.y + solid.h;
          state.vy = 0;
        }
      }
    }
  }
  state.y = yNext;
  state.onGround = landed;

  // Hazard collision check
  for (const hazard of LEVEL_DATA.hazards) {
    if (intersects(state.x, state.y, LEVEL_DATA.player.width, LEVEL_DATA.player.height, hazard.x, hazard.y, hazard.w, hazard.h)) {
      return { died: true, completed: false };
    }
  }

  // Death Y bound
  if (state.y + LEVEL_DATA.player.height >= LEVEL_DATA.world.deathY) {
    return { died: true, completed: false };
  }

  // Goal collision check
  if (
    intersects(
      state.x,
      state.y,
      LEVEL_DATA.player.width,
      LEVEL_DATA.player.height,
      LEVEL_DATA.goal.x,
      LEVEL_DATA.goal.y,
      LEVEL_DATA.goal.w,
      LEVEL_DATA.goal.h
    )
  ) {
    return { died: false, completed: true };
  }

  return { died: false, completed: false };
}

export function runFullSimulation(inputs: Uint8Array | number[]): SimulationResult {
  const state: PlayerState = {
    x: LEVEL_DATA.spawn.x,
    y: LEVEL_DATA.spawn.y,
    vx: 0,
    vy: 0,
    onGround: true,
  };

  const states: PlayerState[] = [{ ...state }];

  for (let t = 0; t < inputs.length; t++) {
    const inputByte = inputs[t];
    const { died, completed } = stepSimulation(state, inputByte);
    states.push({ ...state });

    if (died) {
      return {
        completed: false,
        died: true,
        finishTick: 0,
        deathTick: t,
        finalX: state.x,
        finalY: state.y,
        states,
      };
    }

    if (completed) {
      return {
        completed: true,
        died: false,
        finishTick: t + 1,
        deathTick: 0,
        finalX: state.x,
        finalY: state.y,
        states,
      };
    }
  }

  return {
    completed: false,
    died: false,
    finishTick: 0,
    deathTick: 0,
    finalX: state.x,
    finalY: state.y,
    states,
  };
}
