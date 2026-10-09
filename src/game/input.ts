import { encodeInputByte, TickInput } from './physics.ts';

export class InputManager {
  private keyState = {
    left: false,
    right: false,
    jump: false,
  };

  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;

  constructor() {
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.attach();
  }

  private attach() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
  }

  public detach() {
    if (typeof window === 'undefined') return;
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.repeat) return;
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.keyState.left = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.keyState.right = true;
        break;
      case 'ArrowUp':
      case 'KeyW':
      case 'Space':
        this.keyState.jump = true;
        e.preventDefault();
        break;
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.keyState.left = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.keyState.right = false;
        break;
      case 'ArrowUp':
      case 'KeyW':
      case 'Space':
        this.keyState.jump = false;
        break;
    }
  }

  public setVirtualButton(action: 'left' | 'right' | 'jump', active: boolean) {
    this.keyState[action] = active;
  }

  public sampleCurrentInput(): { input: TickInput; byte: number } {
    const input: TickInput = {
      left: this.keyState.left,
      right: this.keyState.right,
      jump: this.keyState.jump,
    };
    return {
      input,
      byte: encodeInputByte(input),
    };
  }

  public reset() {
    this.keyState.left = false;
    this.keyState.right = false;
    this.keyState.jump = false;
  }
}
