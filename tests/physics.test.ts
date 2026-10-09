import { describe, it, expect } from 'vitest';
import {
  stepSimulation,
  runFullSimulation,
  encodeInputByte,
  decodeInputByte,
  PlayerState,
  INPUT_MASK,
} from '../src/game/physics.ts';
import { LEVEL_DATA } from '../src/level/generated_level.ts';

describe('Test 7: Integer-Only Authoritative Physics', () => {
  it('should use integer-only arithmetic without floating-point math in simulation step', () => {
    const state: PlayerState = {
      x: 40000,
      y: 372000,
      vx: 0,
      vy: 0,
      onGround: true,
    };

    // Verify all level constants are integers
    expect(Number.isInteger(LEVEL_DATA.world.width)).toBe(true);
    expect(Number.isInteger(LEVEL_DATA.world.height)).toBe(true);
    expect(Number.isInteger(LEVEL_DATA.world.deathY)).toBe(true);
    expect(Number.isInteger(LEVEL_DATA.player.width)).toBe(true);
    expect(Number.isInteger(LEVEL_DATA.player.height)).toBe(true);
    expect(Number.isInteger(LEVEL_DATA.player.moveSpeed)).toBe(true);
    expect(Number.isInteger(LEVEL_DATA.player.jumpVelocity)).toBe(true);
    expect(Number.isInteger(LEVEL_DATA.player.gravity)).toBe(true);
    expect(Number.isInteger(LEVEL_DATA.player.maxFallSpeed)).toBe(true);

    // Step with RIGHT + JUMP
    const inputByte = encodeInputByte({ left: false, right: true, jump: true });
    stepSimulation(state, inputByte);

    // State coordinates and velocities must remain strict integers
    expect(Number.isInteger(state.x)).toBe(true);
    expect(Number.isInteger(state.y)).toBe(true);
    expect(Number.isInteger(state.vx)).toBe(true);
    expect(Number.isInteger(state.vy)).toBe(true);
  });

  it('should encode and decode input bytes accurately', () => {
    const original = { left: true, right: false, jump: true };
    const byte = encodeInputByte(original);
    expect(byte).toBe(INPUT_MASK.LEFT | INPUT_MASK.JUMP);

    const decoded = decodeInputByte(byte);
    expect(decoded.left).toBe(true);
    expect(decoded.right).toBe(false);
    expect(decoded.jump).toBe(true);
  });

  it('should produce 100% deterministic trajectory across multiple independent runs', () => {
    const testInputs = [
      INPUT_MASK.RIGHT | INPUT_MASK.JUMP,
      INPUT_MASK.RIGHT,
      INPUT_MASK.RIGHT,
      INPUT_MASK.NONE,
      INPUT_MASK.LEFT,
    ];

    const sim1 = runFullSimulation(testInputs);
    const sim2 = runFullSimulation(testInputs);

    expect(sim1.states.length).toBe(sim2.states.length);
    for (let i = 0; i < sim1.states.length; i++) {
      expect(sim1.states[i].x).toBe(sim2.states[i].x);
      expect(sim1.states[i].y).toBe(sim2.states[i].y);
      expect(sim1.states[i].vx).toBe(sim2.states[i].vx);
      expect(sim1.states[i].vy).toBe(sim2.states[i].vy);
      expect(sim1.states[i].onGround).toBe(sim2.states[i].onGround);
    }
  });

  it('should enforce terminal fall velocity ceiling', () => {
    const state: PlayerState = {
      x: 40000,
      y: 0,
      vx: 0,
      vy: 10000,
      onGround: false,
    };

    // Step multiple times without landing
    for (let i = 0; i < 20; i++) {
      stepSimulation(state, INPUT_MASK.NONE);
      expect(state.vy).toBeLessThanOrEqual(LEVEL_DATA.player.maxFallSpeed);
    }
    expect(state.vy).toBe(LEVEL_DATA.player.maxFallSpeed);
  });

  it('should cancel horizontal velocity when both LEFT and RIGHT are pressed simultaneously', () => {
    const state: PlayerState = {
      x: 40000,
      y: 372000,
      vx: 1000,
      vy: 0,
      onGround: true,
    };

    const dualInput = encodeInputByte({ left: true, right: true, jump: false });
    stepSimulation(state, dualInput);
    expect(state.vx).toBe(0);
  });
});
