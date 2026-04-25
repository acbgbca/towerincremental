import type { MatchState } from '../game/types';
import type { WaveSystem } from '../game/systems/WaveSystem';
import { TROOP_BASE } from '../config/gameConfig';

export class Hud {
  private moneyEl: HTMLElement;
  private spawnBtn: HTMLButtonElement;
  private waveTitleEl: HTMLElement;
  private waveSubEl: HTMLElement;
  private intervalId: ReturnType<typeof setInterval>;

  constructor(
    private state: MatchState,
    onSpawn: () => void,
    private getWaveSystem: () => WaveSystem,
  ) {
    const container = document.createElement('div');
    container.id = 'hud';
    container.style.cssText =
      'position:fixed;z-index:100;pointer-events:none;top:0;left:0;right:0;bottom:0;';

    this.moneyEl = document.createElement('div');
    this.moneyEl.id = 'hud-money';
    this.moneyEl.style.cssText =
      'position:absolute;top:8px;right:8px;color:white;font:bold 18px monospace;text-shadow:0 0 4px #000;';

    const waveBox = document.createElement('div');
    waveBox.id = 'hud-wave';
    waveBox.style.cssText =
      'position:absolute;top:8px;left:50%;transform:translateX(-50%);color:white;font-family:monospace;text-align:center;text-shadow:0 0 4px #000;';

    this.waveTitleEl = document.createElement('div');
    this.waveTitleEl.id = 'hud-wave-title';
    this.waveTitleEl.style.cssText = 'font-size:18px;font-weight:bold;';

    this.waveSubEl = document.createElement('div');
    this.waveSubEl.id = 'hud-wave-sub';
    this.waveSubEl.style.cssText = 'font-size:14px;opacity:0.9;';

    waveBox.appendChild(this.waveTitleEl);
    waveBox.appendChild(this.waveSubEl);

    this.spawnBtn = document.createElement('button');
    this.spawnBtn.id = 'hud-spawn-base';
    this.spawnBtn.textContent = `Base Troop $${TROOP_BASE.cost}`;
    this.spawnBtn.style.cssText =
      'position:absolute;bottom:16px;left:50%;transform:translateX(-50%);pointer-events:auto;padding:8px 16px;font-size:16px;';
    this.spawnBtn.addEventListener('click', onSpawn);

    container.appendChild(this.moneyEl);
    container.appendChild(waveBox);
    container.appendChild(this.spawnBtn);
    document.body.appendChild(container);

    this.tick();
    this.intervalId = setInterval(() => this.tick(), 100);
  }

  private tick(): void {
    this.moneyEl.textContent = `$${Math.floor(this.state.money)}`;
    const canAfford = this.state.money >= TROOP_BASE.cost;
    this.spawnBtn.disabled = !canAfford;
    this.renderWaveStatus();
  }

  private renderWaveStatus(): void {
    const ws = this.getWaveSystem();
    const total = ws.totalWaves;
    if (total === 0) {
      this.waveTitleEl.textContent = '';
      this.waveSubEl.textContent = '';
      return;
    }
    const displayIndex = Math.min(ws.currentWaveIndex + 1, total);
    this.waveTitleEl.textContent = `Wave ${displayIndex} / ${total}`;
    if (ws.state === 'SPAWNING') {
      this.waveSubEl.textContent = 'Spawning…';
    } else if (ws.state === 'BREATHER') {
      const seconds = Math.max(0, Math.ceil(ws.nextWaveInMs / 1000));
      this.waveSubEl.textContent = `Next wave in ${seconds}s`;
    } else {
      this.waveSubEl.textContent = 'All waves spawned';
    }
  }

  destroy(): void {
    clearInterval(this.intervalId);
    document.getElementById('hud')?.remove();
  }
}
