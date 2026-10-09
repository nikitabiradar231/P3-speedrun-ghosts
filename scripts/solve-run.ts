import { runFullSimulation, stepSimulation, PlayerState, INPUT_MASK } from '../src/game/physics.ts';
import { LEVEL_DATA } from '../src/level/generated_level.ts';

export function solveLevel(): number[] {
  // Simple heuristic greedy + priority search
  interface QueueItem {
    state: PlayerState;
    inputs: number[];
    cost: number;
    h: number;
  }

  const startState: PlayerState = {
    x: LEVEL_DATA.spawn.x,
    y: LEVEL_DATA.spawn.y,
    vx: 0,
    vy: 0,
    onGround: true,
  };

  const queue: QueueItem[] = [
    {
      state: startState,
      inputs: [],
      cost: 0,
      h: LEVEL_DATA.goal.x - startState.x,
    },
  ];

  const visited = new Map<string, number>();

  function stateKey(s: PlayerState): string {
    const gx = Math.round(s.x / 4000);
    const gy = Math.round(s.y / 4000);
    const gvx = Math.round(s.vx / 2000);
    const gvy = Math.round(s.vy / 2000);
    return `${gx}_${gy}_${gvx}_${gvy}_${s.onGround ? 1 : 0}`;
  }

  // Common macro actions: right, right+jump, jump, left, none
  const actions = [
    INPUT_MASK.RIGHT,
    INPUT_MASK.RIGHT | INPUT_MASK.JUMP,
    INPUT_MASK.JUMP,
    INPUT_MASK.NONE,
    INPUT_MASK.LEFT | INPUT_MASK.JUMP,
    INPUT_MASK.LEFT,
  ];

  let iterations = 0;
  while (queue.length > 0 && iterations < 300000) {
    iterations++;
    // Pop best item (A*)
    queue.sort((a, b) => a.cost + a.h * 0.05 - (b.cost + b.h * 0.05));
    const current = queue.shift()!;

    if (current.inputs.length >= LEVEL_DATA.world.maxTicks) continue;

    for (const act of actions) {
      const s = { ...current.state };
      const { died, completed } = stepSimulation(s, act);

      const nextInputs = [...current.inputs, act];

      if (completed) {
        console.log(`[Solver] Goal reached in ${nextInputs.length} ticks (${iterations} iterations)!`);
        return nextInputs;
      }

      if (died) continue;

      const k = stateKey(s);
      const prevCost = visited.get(k);
      if (prevCost === undefined || nextInputs.length < prevCost) {
        visited.set(k, nextInputs.length);
        queue.push({
          state: s,
          inputs: nextInputs,
          cost: nextInputs.length,
          h: LEVEL_DATA.goal.x - s.x + Math.abs(LEVEL_DATA.goal.y - s.y) * 0.5,
        });
      }
    }
  }

  throw new Error(`Failed to find route within ${iterations} iterations`);
}

if (process.argv[1]?.includes('solve-run')) {
  const inputs = solveLevel();
  const hex = '0x' + Buffer.from(inputs).toString('hex');
  console.log(`Inputs (${inputs.length} ticks):`, hex);
  const sim = runFullSimulation(inputs);
  console.log(`Sim result: completed=${sim.completed}, finishTick=${sim.finishTick}`);
}
