import { LEVEL_DATA } from '../level/generated_level.ts';
import { PlayerState } from './physics.ts';
import { GhostInfo } from './ghost.ts';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private scaleX = 1;
  private scaleY = 1;
  private animTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.handleResize();
  }

  public handleResize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width || 800;
    const height = (width * 500) / 800; // 16:10 aspect ratio

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.scale(dpr, dpr);

    this.scaleX = width / (LEVEL_DATA.world.width / LEVEL_DATA.unitScale);
    this.scaleY = height / (LEVEL_DATA.world.height / LEVEL_DATA.unitScale);
  }

  public addSparks(worldX: number, worldY: number, color = '#00f7ff', count = 12) {
    const px = worldX / LEVEL_DATA.unitScale;
    const py = worldY / LEVEL_DATA.unitScale;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      this.particles.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 20 + Math.random() * 20,
        color,
        size: 2 + Math.random() * 2,
      });
    }
  }

  public render(
    playerState: PlayerState,
    ghostState: PlayerState | null,
    ghostInfo: GhostInfo | null,
    currentTick: number,
    gameState: 'READY' | 'PLAYING' | 'WON' | 'DEAD'
  ) {
    this.animTime += 0.03;
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    const ctx = this.ctx;
    ctx.clearRect(0, 0, width, height);

    // 1. Background Grid & Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0a0d18');
    bgGrad.addColorStop(1, '#05070c');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle neon grid lines
    ctx.strokeStyle = 'rgba(0, 247, 255, 0.04)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 2. Render Solid Platforms
    for (const solid of LEVEL_DATA.solids) {
      const sx = (solid.x / LEVEL_DATA.unitScale) * this.scaleX;
      const sy = (solid.y / LEVEL_DATA.unitScale) * this.scaleY;
      const sw = (solid.w / LEVEL_DATA.unitScale) * this.scaleX;
      const sh = (solid.h / LEVEL_DATA.unitScale) * this.scaleY;

      // Platform body
      ctx.fillStyle = '#101728';
      ctx.fillRect(sx, sy, sw, sh);

      // Top glowing rim
      ctx.fillStyle = '#00f7ff';
      ctx.shadowColor = '#00f7ff';
      ctx.shadowBlur = 8;
      ctx.fillRect(sx, sy, sw, 3);
      ctx.shadowBlur = 0;

      // Platform border
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sx, sy, sw, sh);
    }

    // 3. Render Hazards (Spikes)
    for (const hazard of LEVEL_DATA.hazards) {
      const hx = (hazard.x / LEVEL_DATA.unitScale) * this.scaleX;
      const hy = (hazard.y / LEVEL_DATA.unitScale) * this.scaleY;
      const hw = (hazard.w / LEVEL_DATA.unitScale) * this.scaleX;
      const hh = (hazard.h / LEVEL_DATA.unitScale) * this.scaleY;

      // Hazard field glow
      const pulse = 0.6 + 0.4 * Math.sin(this.animTime * 4);
      ctx.fillStyle = `rgba(255, 30, 86, ${0.15 * pulse})`;
      ctx.fillRect(hx, hy, hw, hh);

      // Draw sharp spike teeth
      const spikeW = 15;
      const spikeCount = Math.max(1, Math.floor(hw / spikeW));
      ctx.fillStyle = '#ff1e56';
      ctx.shadowColor = '#ff1e56';
      ctx.shadowBlur = 10 * pulse;

      for (let i = 0; i < spikeCount; i++) {
        const x1 = hx + (i * hw) / spikeCount;
        const x2 = hx + ((i + 1) * hw) / spikeCount;
        const xm = (x1 + x2) / 2;
        ctx.beginPath();
        ctx.moveTo(x1, hy + hh);
        ctx.lineTo(xm, hy);
        ctx.lineTo(x2, hy + hh);
        ctx.closePath();
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }

    // 4. Render Goal (Energy Beacon & Flag)
    const gx = (LEVEL_DATA.goal.x / LEVEL_DATA.unitScale) * this.scaleX;
    const gy = (LEVEL_DATA.goal.y / LEVEL_DATA.unitScale) * this.scaleY;
    const gw = (LEVEL_DATA.goal.w / LEVEL_DATA.unitScale) * this.scaleX;
    const gh = (LEVEL_DATA.goal.h / LEVEL_DATA.unitScale) * this.scaleY;

    // Spinning portal ring
    const goalPulse = Math.sin(this.animTime * 3) * 3;
    ctx.save();
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 15 + goalPulse;
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.strokeRect(gx - 2, gy - 2, gw + 4, gh + 4);

    // Goal Flag Banner
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.moveTo(gx + 4, gy + 4);
    ctx.lineTo(gx + gw - 4, gy + gh * 0.35);
    ctx.lineTo(gx + 4, gy + gh * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // 5. Render Ghost (if active)
    if (ghostState && ghostInfo) {
      const gpx = (ghostState.x / LEVEL_DATA.unitScale) * this.scaleX;
      const gpy = (ghostState.y / LEVEL_DATA.unitScale) * this.scaleY;
      const gpw = (LEVEL_DATA.player.width / LEVEL_DATA.unitScale) * this.scaleX;
      const gph = (LEVEL_DATA.player.height / LEVEL_DATA.unitScale) * this.scaleY;

      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.shadowColor = '#bd00ff';
      ctx.shadowBlur = 12;

      // Ghost silhouette
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.roundRect(gpx, gpy, gpw, gph, 4);
      ctx.fill();

      // Ghost eyes / visor
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(gpx + (ghostState.vx < 0 ? 2 : gpw - 7), gpy + 5, 5, 4);

      // Ghost label
      ctx.font = '10px monospace';
      ctx.fillStyle = '#e9d5ff';
      ctx.textAlign = 'center';
      const shortAddr = ghostInfo.player ? `${ghostInfo.player.slice(0, 6)}...` : 'GHOST';
      ctx.fillText(`👻 ${shortAddr}`, gpx + gpw / 2, gpy - 6);

      ctx.restore();
    }

    // 6. Render Live Player
    const px = (playerState.x / LEVEL_DATA.unitScale) * this.scaleX;
    const py = (playerState.y / LEVEL_DATA.unitScale) * this.scaleY;
    const pw = (LEVEL_DATA.player.width / LEVEL_DATA.unitScale) * this.scaleX;
    const ph = (LEVEL_DATA.player.height / LEVEL_DATA.unitScale) * this.scaleY;

    ctx.save();
    ctx.shadowColor = gameState === 'DEAD' ? '#ff1e56' : '#00f7ff';
    ctx.shadowBlur = 14;

    // Player body
    ctx.fillStyle = gameState === 'DEAD' ? '#ff1e56' : '#00f7ff';
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 4);
    ctx.fill();

    // Cyber Visor
    ctx.fillStyle = '#ffffff';
    const isFacingLeft = playerState.vx < 0;
    const visorX = isFacingLeft ? px + 2 : px + pw - 8;
    ctx.fillRect(visorX, py + 6, 6, 4);

    // Jetpack flame if in air
    if (!playerState.onGround && playerState.vy < 0) {
      ctx.fillStyle = '#ffaa00';
      ctx.shadowColor = '#ffaa00';
      ctx.fillRect(px + (isFacingLeft ? pw - 4 : 1), py + ph, 4, 6 + Math.random() * 4);
    }

    ctx.restore();

    // 7. Render Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;

      const progress = p.life / p.maxLife;
      const alpha = 1 - progress;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x * this.scaleX, p.y * this.scaleY, p.size * (1 - progress * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    // 8. On-Canvas Dynamic Speedrun HUD
    const elapsedSecs = (currentTick / LEVEL_DATA.world.ticksPerSecond).toFixed(2);
    ctx.save();
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(`⏱ ${elapsedSecs}s (${currentTick} ticks)`, 16, 28);

    if (ghostState && ghostInfo) {
      const ghostSecs = (ghostInfo.finishTick / LEVEL_DATA.world.ticksPerSecond).toFixed(2);
      ctx.font = '12px monospace';
      ctx.fillStyle = '#c084fc';
      ctx.fillText(`👻 Ghost Target: ${ghostSecs}s (${ghostInfo.finishTick} ticks)`, 16, 48);
    }
    ctx.restore();
  }
}
