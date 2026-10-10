import { GameEngine, GameStatus } from '../game/engine.ts';
import { walletService, LeaderboardEntry } from '../wallet/account.ts';
import { sounds } from '../game/audio.ts';
import { LEVEL_DATA } from '../level/generated_level.ts';
import { hexToBytes } from '../utils/hex.ts';

// Demo verified run (174 ticks = 5.80s) available immediately for ghost racing
const DEMO_GHOST_RUN: LeaderboardEntry = {
  runId: 0,
  player: '0x3F8a1B896424D98f7956B2c3664d4A0f507A4A28',
  finishTick: 174,
  timestamp: Math.floor(Date.now() / 1000) - 3600,
  inputs: hexToBytes(
    '060202020202020202020202020202020202020202020202020202020202050602020202020202020202020202020202020202020202020202020602020202020202020202020202020202020202020202020202020202020202020602020202020202020202020202020202020202020202020202020602020202020202020202020202020202020202020202020202020202020202020202020202020202020202020202020202020202020202'
  ),
};

export class App {
  public engine!: GameEngine;
  public lastRunInputs: Uint8Array | null = null;
  public lastFinishTick = 0;
  public leaderboard: LeaderboardEntry[] = [DEMO_GHOST_RUN];
  public isSubmitting = false;
  public submissionResult: { txHash: string; finishTick: number; runId: number } | null = null;
  public userPB: { bestTick: number; runId: number } | null = null;

  public init() {
    this.renderDOM();
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

    this.engine = new GameEngine(canvas, {
      onStateChange: (status) => this.handleStateChange(status),
      onFinish: (finishTick, inputs) => this.handleFinish(finishTick, inputs),
      onTick: (tick) => this.handleTick(tick),
    });

    this.bindEvents();
    this.engine.startLoop();

    // Auto-select demo ghost for exciting immediate ghost race
    this.selectGhost(DEMO_GHOST_RUN);
    this.loadOnchainData();
  }

  private renderDOM() {
    const root = document.getElementById('app')!;
    root.innerHTML = `
      <div class="app-container">
        <!-- Header -->
        <header class="header">
          <div class="logo-wrap">
            <div class="logo-icon">⚡</div>
            <div class="title-group">
              <h1>SPEEDRUN GHOSTS</h1>
              <div class="subtitle">Base Sepolia • Onchain Deterministic Verification</div>
            </div>
          </div>

          <div class="header-actions">
            <button id="soundToggleBtn" class="btn btn-outline" title="Toggle Sound">
              🔊 Sound: ON
            </button>
            <div id="networkBadge" class="badge badge-chain">
              ⛓️ Base Sepolia (84532)
            </div>
            <button id="walletBtn" class="btn btn-primary">
              Connect Wallet
            </button>
          </div>
        </header>

        <!-- Main Layout -->
        <div class="main-grid">
          <!-- Left: Canvas & Controls -->
          <div class="game-card">
            <div class="canvas-wrapper">
              <canvas id="gameCanvas"></canvas>

              <!-- State Overlays -->
              <div id="overlayReady" class="overlay-notice">
                <h2>⚡ PRESS ANY KEY TO START</h2>
                <p style="color: var(--text-secondary); font-size: 0.9rem;">
                  Use [A]/[D] to run, [W] or [Space] to jump!
                </p>
              </div>

              <div id="overlayDead" class="overlay-notice death" style="display: none;">
                <h2>💥 RUN TERMINATED</h2>
                <p style="color: var(--text-secondary); font-size: 0.85rem;">
                  You hit a hazard or fell out of bounds.
                </p>
                <button id="restartDeadBtn" class="btn btn-primary">
                  🔄 Retry Run (R)
                </button>
              </div>

              <div id="overlayWon" class="overlay-notice victory" style="display: none;">
                <h2>🏆 GOAL REACHED!</h2>
                <div id="winStats" style="font-family: var(--font-mono); font-size: 1.1rem; color: var(--accent-cyan);">
                  Finish Time: 00.00s (0 ticks)
                </div>
                <p style="color: var(--text-secondary); font-size: 0.85rem;">
                  Your inputs were recorded locally and are ready for onchain replay verification!
                </p>

                <div id="submissionContainer" style="width: 100%; display: flex; flex-direction: column; gap: 0.5rem; align-items: center;">
                  <button id="submitRunBtn" class="btn btn-ghost-purple" style="width: 100%;">
                    ⚡ Submit Run to Base Sepolia
                  </button>
                  <div id="submissionStatus"></div>
                </div>

                <div style="display: flex; gap: 0.75rem; margin-top: 0.5rem;">
                  <button id="restartWonBtn" class="btn btn-outline">
                    🔄 Play Again (R)
                  </button>
                </div>
              </div>
            </div>

            <!-- Ghost Active Bar -->
            <div id="ghostBar" class="ghost-indicator" style="display: none;">
              <span>👻 Racing against ghost: <strong id="ghostName"></strong> (<span id="ghostTarget"></span>)</span>
              <button id="clearGhostBtn" class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                Remove Ghost
              </button>
            </div>

            <!-- Control Bar -->
            <div class="control-bar">
              <div class="instructions-list">
                <div><span class="key-badge">A</span> / <span class="key-badge">D</span> Move</div>
                <div><span class="key-badge">W</span> / <span class="key-badge">Space</span> Jump</div>
                <div><span class="key-badge">R</span> Restart</div>
              </div>
              <button id="restartBarBtn" class="btn btn-outline">
                🔄 Restart
              </button>
            </div>

            <!-- Mobile Touch Controls -->
            <div class="touch-controls">
              <button id="touchLeft" class="touch-btn">◀</button>
              <button id="touchJump" class="touch-btn">▲ JUMP</button>
              <button id="touchRight" class="touch-btn">▶</button>
            </div>
          </div>

          <!-- Right Side Panels -->
          <div class="side-panel">
            <!-- Personal Best Card -->
            <div class="card">
              <div class="card-header">
                <div class="card-title">👤 Your Personal Best</div>
                <span id="userPbBadge" class="badge badge-practice">Practice Mode</span>
              </div>
              <div id="pbContent" style="font-family: var(--font-mono); font-size: 1.2rem; color: var(--accent-cyan); font-weight: 700;">
                No verified run yet
              </div>
              <div style="font-size: 0.8rem; color: var(--text-secondary);">
                Connect wallet to view your onchain verified personal best record.
              </div>
            </div>

            <!-- Verified Leaderboard Card -->
            <div class="card">
              <div class="card-header">
                <div class="card-title">🏆 Verified Leaderboard</div>
                <button id="refreshLeaderboardBtn" class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">
                  🔄 Refresh
                </button>
              </div>

              <div class="table-wrap">
                <table class="leaderboard-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Player</th>
                      <th>Time</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody id="leaderboardBody">
                    <!-- Dynamic entries -->
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Verification Architecture Info -->
            <div class="card">
              <div class="card-header">
                <div class="card-title">🛡️ Trustless Security</div>
              </div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5;">
                <p><strong>Zero client trust:</strong> The smart contract independently simulates submitted raw button presses onchain with integer arithmetic.</p>
                <p style="margin-top: 0.5rem;"><strong>Replayable Ghosts:</strong> Every verified record contains its full input log, allowing anyone to race against the exact verified ghost.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private bindEvents() {
    // Keyboard restart
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR') {
        this.engine.resetRun();
      }
    });

    // Buttons
    document.getElementById('restartBarBtn')?.addEventListener('click', () => this.engine.resetRun());
    document.getElementById('restartDeadBtn')?.addEventListener('click', () => this.engine.resetRun());
    document.getElementById('restartWonBtn')?.addEventListener('click', () => this.engine.resetRun());

    // Sound toggle
    const soundBtn = document.getElementById('soundToggleBtn');
    soundBtn?.addEventListener('click', () => {
      sounds.enabled = !sounds.enabled;
      soundBtn.textContent = `🔊 Sound: ${sounds.enabled ? 'ON' : 'OFF'}`;
    });

    // Wallet connection
    document.getElementById('walletBtn')?.addEventListener('click', () => this.handleWalletConnect());

    // Submit run
    document.getElementById('submitRunBtn')?.addEventListener('click', () => this.handleSubmitRun());

    // Clear ghost
    document.getElementById('clearGhostBtn')?.addEventListener('click', () => {
      this.engine.setGhost(null);
      this.updateGhostUI();
    });

    // Refresh leaderboard
    document.getElementById('refreshLeaderboardBtn')?.addEventListener('click', () => this.loadOnchainData());

    // Touch controls
    const tLeft = document.getElementById('touchLeft');
    const tRight = document.getElementById('touchRight');
    const tJump = document.getElementById('touchJump');

    const bindTouch = (el: HTMLElement | null, action: 'left' | 'right' | 'jump') => {
      if (!el) return;
      el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.engine.inputManager.setVirtualButton(action, true);
      });
      el.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.engine.inputManager.setVirtualButton(action, false);
      });
      el.addEventListener('mousedown', () => this.engine.inputManager.setVirtualButton(action, true));
      el.addEventListener('mouseup', () => this.engine.inputManager.setVirtualButton(action, false));
    };

    bindTouch(tLeft, 'left');
    bindTouch(tRight, 'right');
    bindTouch(tJump, 'jump');
  }

  private handleStateChange(status: GameStatus) {
    const readyEl = document.getElementById('overlayReady');
    const deadEl = document.getElementById('overlayDead');
    const wonEl = document.getElementById('overlayWon');

    if (readyEl) readyEl.style.display = status === 'READY' ? 'flex' : 'none';
    if (deadEl) deadEl.style.display = status === 'DEAD' ? 'flex' : 'none';
    if (wonEl) wonEl.style.display = status === 'WON' ? 'flex' : 'none';
  }

  private handleFinish(finishTick: number, inputs: Uint8Array) {
    this.lastFinishTick = finishTick;
    this.lastRunInputs = inputs;

    const timeSecs = (finishTick / LEVEL_DATA.world.ticksPerSecond).toFixed(2);
    const winStatsEl = document.getElementById('winStats');
    if (winStatsEl) {
      winStatsEl.textContent = `Finish Time: ${timeSecs}s (${finishTick} ticks)`;
    }

    const subStatus = document.getElementById('submissionStatus');
    if (subStatus) subStatus.innerHTML = '';
  }

  private handleTick(_tick: number) {
    // Canvas HUD renders ticks and elapsed time
  }

  private async handleWalletConnect() {
    try {
      const { address, chainId } = await walletService.connect();
      const walletBtn = document.getElementById('walletBtn');
      if (walletBtn) {
        walletBtn.textContent = `${address.slice(0, 6)}...${address.slice(-4)}`;
      }

      if (chainId !== 84532) {
        const netBadge = document.getElementById('networkBadge');
        if (netBadge) {
          netBadge.className = 'badge badge-practice';
          netBadge.textContent = '⚠️ Switch to Base Sepolia';
          netBadge.style.cursor = 'pointer';
          netBadge.onclick = async () => {
            await walletService.switchToBaseSepolia();
            window.location.reload();
          };
        }
      }

      await this.loadOnchainData();
    } catch (err: any) {
      alert(err.message || 'Failed to connect wallet');
    }
  }

  private async handleSubmitRun() {
    if (!this.lastRunInputs) return;

    if (!walletService.userAddress) {
      try {
        await this.handleWalletConnect();
      } catch {
        return;
      }
    }

    const subStatus = document.getElementById('submissionStatus');
    const submitBtn = document.getElementById('submitRunBtn') as HTMLButtonElement;

    if (walletService.chainId !== 84532) {
      const switched = await walletService.switchToBaseSepolia();
      if (!switched) {
        if (subStatus) {
          subStatus.innerHTML = `<div class="status-banner warning">⚠️ Please switch to Base Sepolia (84532)</div>`;
        }
        return;
      }
    }

    try {
      this.isSubmitting = true;
      if (submitBtn) submitBtn.disabled = true;
      if (subStatus) {
        subStatus.innerHTML = `
          <div class="status-banner info">
            ⏳ Submitting inputs to Base Sepolia for contract simulation...
          </div>
        `;
      }

      const result = await walletService.submitRunToChain(this.lastRunInputs);
      this.submissionResult = result;
      sounds.playSubmit();

      const timeSecs = (result.finishTick / LEVEL_DATA.world.ticksPerSecond).toFixed(2);
      if (subStatus) {
        subStatus.innerHTML = `
          <div class="status-banner" style="background: rgba(16, 185, 129, 0.2); border: 1px solid var(--accent-green); color: #34d399;">
            ✅ <strong>VERIFIED ONCHAIN!</strong> Run #${result.runId} • Official Time: ${timeSecs}s (${result.finishTick} ticks)<br>
            <a href="https://sepolia.basescan.org/tx/${result.txHash}" target="_blank" style="color: var(--accent-cyan); text-decoration: underline;">
              View on Basescan ↗
            </a>
          </div>
        `;
      }

      await this.loadOnchainData();
    } catch (err: any) {
      console.error('Submission failed', err);
      if (subStatus) {
        subStatus.innerHTML = `
          <div class="status-banner error">
            ❌ Submission failed: ${err.shortMessage || err.message || 'Transaction reverted'}
          </div>
        `;
      }
    } finally {
      this.isSubmitting = false;
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  public selectGhost(entry: LeaderboardEntry) {
    this.engine.setGhost({
      runId: entry.runId,
      player: entry.player,
      finishTick: entry.finishTick,
      timestamp: entry.timestamp,
      inputs: entry.inputs,
      simulation: null as any,
    });
    this.updateGhostUI();
    this.engine.resetRun();
  }

  private updateGhostUI() {
    const ghost = this.engine.ghostManager.getActiveGhost();
    const ghostBar = document.getElementById('ghostBar');
    const ghostName = document.getElementById('ghostName');
    const ghostTarget = document.getElementById('ghostTarget');

    if (ghost && ghostBar && ghostName && ghostTarget) {
      ghostBar.style.display = 'flex';
      ghostName.textContent = `${ghost.player.slice(0, 6)}...${ghost.player.slice(-4)}`;
      const secs = (ghost.finishTick / LEVEL_DATA.world.ticksPerSecond).toFixed(2);
      ghostTarget.textContent = `${secs}s (${ghost.finishTick} ticks)`;
    } else if (ghostBar) {
      ghostBar.style.display = 'none';
    }
  }

  private async loadOnchainData() {
    if (walletService.userAddress) {
      const pb = await walletService.fetchPersonalBest(walletService.userAddress);
      this.userPB = pb;
      const pbContent = document.getElementById('pbContent');
      const pbBadge = document.getElementById('userPbBadge');

      if (pb.bestTick > 0) {
        const secs = (pb.bestTick / LEVEL_DATA.world.ticksPerSecond).toFixed(2);
        if (pbContent) pbContent.textContent = `${secs}s (${pb.bestTick} ticks)`;
        if (pbBadge) {
          pbBadge.className = 'badge badge-verified';
          pbBadge.textContent = `Verified Run #${pb.runId}`;
        }
      }
    }

    // Fetch onchain runs
    const onchainRuns = await walletService.fetchLeaderboard();
    if (onchainRuns.length > 0) {
      this.leaderboard = onchainRuns;
    }

    this.renderLeaderboard();
  }

  private renderLeaderboard() {
    const tbody = document.getElementById('leaderboardBody');
    if (!tbody) return;

    // Sort by finishTick ascending (fastest first)
    const sorted = [...this.leaderboard].sort((a, b) => a.finishTick - b.finishTick);

    tbody.innerHTML = sorted
      .map((entry, idx) => {
        const rankClass = idx === 0 ? 'rank-gold' : idx === 1 ? 'rank-silver' : idx === 2 ? 'rank-bronze' : '';
        const shortAddr = `${entry.player.slice(0, 6)}...${entry.player.slice(-4)}`;
        const timeSecs = (entry.finishTick / LEVEL_DATA.world.ticksPerSecond).toFixed(2);

        return `
          <tr>
            <td class="${rankClass}">#${idx + 1}</td>
            <td title="${entry.player}">${shortAddr}</td>
            <td class="time-val">${timeSecs}s</td>
            <td>
              <button class="btn btn-outline race-ghost-btn" data-run-id="${entry.runId}" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">
                👻 Race
              </button>
            </td>
          </tr>
        `;
      })
      .join('');

    // Bind race ghost buttons
    tbody.querySelectorAll('.race-ghost-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const runId = Number((e.currentTarget as HTMLElement).getAttribute('data-run-id'));
        const targetRun = this.leaderboard.find((r) => r.runId === runId);
        if (targetRun) {
          this.selectGhost(targetRun);
        }
      });
    });
  }
}
