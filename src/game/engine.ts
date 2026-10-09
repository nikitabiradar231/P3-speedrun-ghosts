import { LEVEL_DATA } from '../level/generated_level.ts';
import { PlayerState, stepSimulation } from './physics.ts';
import { InputManager } from './input.ts';
import { GhostManager, GhostInfo } from './ghost.ts';
import { CanvasRenderer } from './renderer.ts';
import { sounds } from './audio.ts';

export type GameStatus = 'READY' | 'PLAYING' | 'WON' | 'DEAD';

export interface GameEngineEvents {
  onStateChange: (status: GameStatus) => void;
  onFinish: (finishTick: number, inputs: Uint8Array) => void;
  onTick: (currentTick: number) => void;
}

export class GameEngine {
  public status: GameStatus = 'READY';
  public currentTick = 0;
  public recordedInputs: number[] = [];

  public playerState: PlayerState;
  public inputManager: InputManager;
  public ghostManager: GhostManager;
  public renderer: CanvasRenderer;
  private events: GameEngineEvents;

  private isRunning = false;
  private lastFrameTime = 0;
  private tickAccumulator = 0;
  private tickDurationMs = 1000 / LEVEL_DATA.world.ticksPerSecond; // 33.333ms
  private prevOnGround = true;

  constructor(
    canvas: HTMLCanvasElement,
    events: GameEngineEvents
  ) {
    this.events = events;
    this.inputManager = new InputManager();
    this.ghostManager = new GhostManager();
    this.renderer = new CanvasRenderer(canvas);

    this.playerState = {
      x: LEVEL_DATA.spawn.x,
      y: LEVEL_DATA.spawn.y,
      vx: 0,
      vy: 0,
      onGround: true,
    };

    window.addEventListener('resize', () => {
      this.renderer.handleResize();
    });
  }

  public resetRun() {
    this.status = 'READY';
    this.currentTick = 0;
    this.recordedInputs = [];
    this.tickAccumulator = 0;

    this.playerState = {
      x: LEVEL_DATA.spawn.x,
      y: LEVEL_DATA.spawn.y,
      vx: 0,
      vy: 0,
      onGround: true,
    };
    this.prevOnGround = true;
    this.inputManager.reset();
    this.events.onStateChange(this.status);
    this.events.onTick(this.currentTick);
  }

  public startLoop() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  public stopLoop() {
    this.isRunning = false;
  }

  private loop(currentTime: number) {
    if (!this.isRunning) return;

    const delta = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    // Fixed-step simulation accumulator
    this.tickAccumulator += Math.min(delta, 100); // cap max delta to prevent spiral

    while (this.tickAccumulator >= this.tickDurationMs) {
      this.tickAccumulator -= this.tickDurationMs;
      this.advanceAuthoritativeTick();
    }

    // Ghost state for current tick
    const ghostState = this.ghostManager.getGhostStateAtTick(this.currentTick);
    const ghostInfo = this.ghostManager.getActiveGhost();

    // Render smooth visuals
    this.renderer.render(
      this.playerState,
      ghostState,
      ghostInfo,
      this.currentTick,
      this.status
    );

    requestAnimationFrame(this.loop.bind(this));
  }

  private advanceAuthoritativeTick() {
    if (this.status === 'WON' || this.status === 'DEAD') {
      return;
    }

    // Sample current input from keyboard/touch
    const { byte, input } = this.inputManager.sampleCurrentInput();

    // If in READY state and player presses any key, transition to PLAYING
    if (this.status === 'READY') {
      if (byte !== 0) {
        this.status = 'PLAYING';
        this.events.onStateChange(this.status);
      } else {
        return; // wait for first input to start timer
      }
    }

    if (this.currentTick >= LEVEL_DATA.world.maxTicks) {
      this.status = 'DEAD';
      sounds.playDeath();
      this.events.onStateChange(this.status);
      return;
    }

    // Check jump sound trigger
    if (input.jump && this.playerState.onGround) {
      sounds.playJump();
      this.renderer.addSparks(
        this.playerState.x + LEVEL_DATA.player.width / 2,
        this.playerState.y + LEVEL_DATA.player.height,
        '#00f7ff',
        8
      );
    }

    // Step physics
    const { died, completed } = stepSimulation(this.playerState, byte);
    this.recordedInputs.push(byte);
    this.currentTick++;
    this.events.onTick(this.currentTick);

    // Landing sound & sparks
    if (!this.prevOnGround && this.playerState.onGround) {
      sounds.playLand();
      this.renderer.addSparks(
        this.playerState.x + LEVEL_DATA.player.width / 2,
        this.playerState.y + LEVEL_DATA.player.height,
        '#00f7ff',
        6
      );
    }
    this.prevOnGround = this.playerState.onGround;

    if (died) {
      this.status = 'DEAD';
      sounds.playDeath();
      this.renderer.addSparks(
        this.playerState.x + LEVEL_DATA.player.width / 2,
        this.playerState.y + LEVEL_DATA.player.height / 2,
        '#ff1e56',
        25
      );
      this.events.onStateChange(this.status);
      return;
    }

    if (completed) {
      this.status = 'WON';
      sounds.playVictory();
      this.renderer.addSparks(
        LEVEL_DATA.goal.x + LEVEL_DATA.goal.w / 2,
        LEVEL_DATA.goal.y + LEVEL_DATA.goal.h / 2,
        '#10b981',
        35
      );
      this.events.onStateChange(this.status);
      this.events.onFinish(this.currentTick, new Uint8Array(this.recordedInputs));
      return;
    }
  }

  public setGhost(ghost: GhostInfo | null) {
    if (ghost) {
      this.ghostManager.setGhost(
        ghost.runId,
        ghost.player,
        ghost.finishTick,
        ghost.timestamp,
        ghost.inputs
      );
    } else {
      this.ghostManager.clearGhost();
    }
  }
}
