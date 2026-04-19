import type { MatchState } from '../game/types';
import { TROOP_BASE } from '../config/gameConfig';

export class Hud {
  private moneyEl: HTMLElement;
  private spawnBtn: HTMLButtonElement;
  private intervalId: ReturnType<typeof setInterval>;

  constructor(
    private state: MatchState,
    onSpawn: () => void,
  ) {
    const container = document.createElement('div');
    container.id = 'hud';
    container.style.cssText =
      'position:fixed;z-index:100;pointer-events:none;top:0;left:0;right:0;bottom:0;';

    this.moneyEl = document.createElement('div');
    this.moneyEl.id = 'hud-money';
    this.moneyEl.style.cssText =
      'position:absolute;top:8px;right:8px;color:white;font:bold 18px monospace;text-shadow:0 0 4px #000;';

    this.spawnBtn = document.createElement('button');
    this.spawnBtn.id = 'hud-spawn-base';
    this.spawnBtn.textContent = `Base Troop $${TROOP_BASE.cost}`;
    this.spawnBtn.style.cssText =
      'position:absolute;bottom:16px;left:50%;transform:translateX(-50%);pointer-events:auto;padding:8px 16px;font-size:16px;';
    this.spawnBtn.addEventListener('click', onSpawn);

    container.appendChild(this.moneyEl);
    container.appendChild(this.spawnBtn);
    document.body.appendChild(container);

    this.tick();
    this.intervalId = setInterval(() => this.tick(), 100);
  }

  private tick(): void {
    this.moneyEl.textContent = `$${Math.floor(this.state.money)}`;
    const canAfford = this.state.money >= TROOP_BASE.cost;
    this.spawnBtn.disabled = !canAfford;
  }

  destroy(): void {
    clearInterval(this.intervalId);
    document.getElementById('hud')?.remove();
  }
}
