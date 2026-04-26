import type { MatchState, TroopType } from '../game/types';
import type { WaveSystem } from '../game/systems/WaveSystem';
import type { GameState } from '../state/GameState';
import { TROOP_TYPES, TROOP_LABELS } from '../config/troopTypes';

interface SpawnButtonEntry {
  type: TroopType;
  el: HTMLButtonElement;
}

export class Hud {
  private moneyEl: HTMLElement;
  private bankEl: HTMLElement;
  private spawnContainer: HTMLDivElement;
  private spawnButtons: SpawnButtonEntry[] = [];
  private waveTitleEl: HTMLElement;
  private waveSubEl: HTMLElement;
  private enemyLevelEl: HTMLElement;
  private prestigeEl: HTMLElement;
  private intervalId: ReturnType<typeof setInterval>;

  constructor(
    private state: MatchState,
    private gameState: GameState,
    private onSpawn: (type: TroopType) => void,
    private getWaveSystem: () => WaveSystem,
  ) {
    const container = document.createElement('div');
    container.id = 'hud';
    container.style.cssText =
      'position:fixed;z-index:100;pointer-events:none;top:0;left:0;right:0;bottom:0;';

    this.moneyEl = document.createElement('div');
    this.moneyEl.id = 'hud-money';
    this.moneyEl.style.cssText =
      'position:absolute;top:8px;left:8px;color:white;font:bold 18px monospace;text-shadow:0 0 4px #000;';

    this.bankEl = document.createElement('div');
    this.bankEl.id = 'hud-bank';
    this.bankEl.style.cssText =
      'position:absolute;top:8px;right:8px;color:#ffd700;font:bold 18px monospace;text-shadow:0 0 4px #000;';

    this.enemyLevelEl = document.createElement('div');
    this.enemyLevelEl.id = 'hud-enemy-level';
    this.enemyLevelEl.style.cssText =
      'position:absolute;top:32px;right:8px;color:white;font:14px monospace;text-shadow:0 0 4px #000;';

    this.prestigeEl = document.createElement('div');
    this.prestigeEl.id = 'hud-prestige';
    this.prestigeEl.style.cssText =
      'position:absolute;top:52px;right:8px;color:#ffaaff;font:14px monospace;text-shadow:0 0 4px #000;';

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

    this.spawnContainer = document.createElement('div');
    this.spawnContainer.id = 'hud-spawn-container';
    this.spawnContainer.style.cssText =
      'position:absolute;bottom:16px;left:50%;transform:translateX(-50%);' +
      'display:flex;gap:12px;pointer-events:auto;';

    container.appendChild(this.moneyEl);
    container.appendChild(this.bankEl);
    container.appendChild(this.enemyLevelEl);
    container.appendChild(this.prestigeEl);
    container.appendChild(waveBox);
    container.appendChild(this.spawnContainer);
    document.body.appendChild(container);

    this.refreshSpawnButtons();
    this.tick();
    this.intervalId = setInterval(() => this.tick(), 100);
  }

  refreshSpawnButtons(): void {
    this.spawnContainer.innerHTML = '';
    this.spawnButtons = [];
    for (const type of this.gameState.unlockedTroopTypes) {
      const btn = document.createElement('button');
      btn.id = `hud-spawn-${type}`;
      btn.textContent = `${TROOP_LABELS[type]} $${TROOP_TYPES[type].cost}`;
      btn.style.cssText = 'padding:8px 16px;font-size:16px;cursor:pointer;';
      btn.addEventListener('click', () => this.onSpawn(type));
      this.spawnContainer.appendChild(btn);
      this.spawnButtons.push({ type, el: btn });
    }
  }

  private tick(): void {
    if (this.spawnButtons.length !== this.gameState.unlockedTroopTypes.length) {
      this.refreshSpawnButtons();
    }
    this.moneyEl.textContent = `$${Math.floor(this.state.money)}`;
    this.bankEl.textContent = `Bank: $${this.gameState.money}`;
    this.enemyLevelEl.textContent = `Enemy Level: ${this.gameState.enemyLevel}`;
    this.prestigeEl.textContent = `Prestige: ${this.gameState.prestigeTier}`;
    for (const { type, el } of this.spawnButtons) {
      el.disabled = this.state.money < TROOP_TYPES[type].cost;
    }
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
