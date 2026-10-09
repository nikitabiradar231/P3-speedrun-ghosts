import { describe, it, expect } from 'vitest';
import { runFullSimulation, INPUT_MASK } from '../src/game/physics.ts';

// Fast winning inputs (174 ticks) computed by solver
const FAST_WINNING_INPUTS = Buffer.from(
  '060202020202020202020202020202020202020202020202020202020202050602020202020202020202020202020202020202020202020202020602020202020202020202020202020202020202020202020202020202020202020602020202020202020202020202020202020202020202020202020602020202020202020202020202020202020202020202020202020202020202020202020202020202020202020202020202020202020202',
  'hex'
);

describe('Simulation & Ghost Replay Verification', () => {
  it('Test 3: computes deterministic finish time for winning inputs', () => {
    const result = runFullSimulation(FAST_WINNING_INPUTS);
    expect(result.completed).toBe(true);
    expect(result.died).toBe(false);
    expect(result.finishTick).toBe(174);
  });

  it('Test 6: rejects runs that hit hazards or never reach goal', () => {
    // 1. Pit fall (walk right without jumping)
    const walkInputs = new Uint8Array(50).fill(INPUT_MASK.RIGHT);
    const pitResult = runFullSimulation(walkInputs);
    expect(pitResult.completed).toBe(false);
    expect(pitResult.died).toBe(true);
    expect(pitResult.finishTick).toBe(0);

    // 2. Idle run (never reaches goal)
    const idleInputs = new Uint8Array(60).fill(INPUT_MASK.NONE);
    const idleResult = runFullSimulation(idleInputs);
    expect(idleResult.completed).toBe(false);
    expect(idleResult.died).toBe(false);
    expect(idleResult.finishTick).toBe(0);
  });

  it('Test 9: ghost replay reproduces exact position trajectory tick-for-tick', () => {
    const ghost1 = runFullSimulation(FAST_WINNING_INPUTS);
    const ghost2 = runFullSimulation(FAST_WINNING_INPUTS);

    expect(ghost1.states.length).toBe(ghost2.states.length);
    for (let t = 0; t < ghost1.states.length; t++) {
      expect(ghost1.states[t].x).toBe(ghost2.states[t].x);
      expect(ghost1.states[t].y).toBe(ghost2.states[t].y);
      expect(ghost1.states[t].vx).toBe(ghost2.states[t].vx);
      expect(ghost1.states[t].vy).toBe(ghost2.states[t].vy);
      expect(ghost1.states[t].onGround).toBe(ghost2.states[t].onGround);
    }
  });

  it('Test 10: personal best simulation comparison logic', () => {
    // Slower run with 30 idle ticks
    const slowInputs = new Uint8Array(30 + FAST_WINNING_INPUTS.length);
    slowInputs.set(FAST_WINNING_INPUTS, 30);

    const slowRes = runFullSimulation(slowInputs);
    const fastRes = runFullSimulation(FAST_WINNING_INPUTS);

    expect(slowRes.completed).toBe(true);
    expect(slowRes.finishTick).toBe(204);
    expect(fastRes.finishTick).toBe(174);

    let personalBest = slowRes.finishTick; // 204
    if (fastRes.finishTick < personalBest) {
      personalBest = fastRes.finishTick;
    }
    expect(personalBest).toBe(174);

    // Slower run attempted again
    if (slowRes.finishTick < personalBest) {
      personalBest = slowRes.finishTick;
    }
    expect(personalBest).toBe(174); // Remained 174
  });
});
