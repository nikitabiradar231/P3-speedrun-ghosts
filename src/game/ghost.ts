import { runFullSimulation, PlayerState, SimulationResult } from './physics.ts';

export interface GhostInfo {
  runId: number;
  player: string;
  finishTick: number;
  timestamp: number;
  inputs: Uint8Array;
  simulation: SimulationResult;
}

export class GhostManager {
  private activeGhost: GhostInfo | null = null;

  public setGhost(
    runId: number,
    player: string,
    finishTick: number,
    timestamp: number,
    inputs: Uint8Array | number[]
  ): GhostInfo {
    const rawInputs = inputs instanceof Uint8Array ? inputs : new Uint8Array(inputs);
    const simulation = runFullSimulation(rawInputs);

    this.activeGhost = {
      runId,
      player,
      finishTick,
      timestamp,
      inputs: rawInputs,
      simulation,
    };

    return this.activeGhost;
  }

  public getActiveGhost(): GhostInfo | null {
    return this.activeGhost;
  }

  public clearGhost() {
    this.activeGhost = null;
  }

  public getGhostStateAtTick(tick: number): PlayerState | null {
    if (!this.activeGhost || !this.activeGhost.simulation.states) return null;
    const states = this.activeGhost.simulation.states;
    if (tick >= states.length) {
      // Return final completed state
      return states[states.length - 1];
    }
    return states[tick];
  }
}
