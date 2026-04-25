import { UPGRADES, nextCost, type UpgradeDef } from '../config/upgradeConfig';
import { save as persistSave } from '../state/SaveStore';
import type { GameState } from '../state/GameState';

export class UpgradeScreen {
  private el: HTMLDivElement;
  private messageEl: HTMLParagraphElement;
  private rewardEl: HTMLParagraphElement;
  private bankEl: HTMLParagraphElement;
  private rowsEl: HTMLDivElement;

  constructor(
    private gameState: GameState,
    private onContinue: () => void,
  ) {
    const existing = document.getElementById('match-result-overlay');
    if (existing) existing.remove();

    this.el = document.createElement('div');
    this.el.id = 'match-result-overlay';
    this.el.style.cssText =
      'display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.85);' +
      'flex-direction:column;align-items:center;justify-content:center;gap:16px;';

    this.messageEl = document.createElement('p');
    this.messageEl.style.cssText = 'color:#fff;font-size:48px;font-weight:bold;margin:0;';

    this.rewardEl = document.createElement('p');
    this.rewardEl.id = 'match-result-reward';
    this.rewardEl.style.cssText = 'color:#ffd700;font-size:28px;font-weight:bold;margin:0;';

    this.bankEl = document.createElement('p');
    this.bankEl.id = 'upgrade-screen-bank';
    this.bankEl.style.cssText = 'color:#fff;font-size:22px;margin:0;';

    this.rowsEl = document.createElement('div');
    this.rowsEl.style.cssText = 'display:flex;flex-direction:column;gap:12px;min-width:360px;';

    const continueBtn = document.createElement('button');
    continueBtn.id = 'upgrade-screen-continue';
    continueBtn.textContent = 'Continue';
    continueBtn.style.cssText = 'font-size:24px;padding:12px 32px;cursor:pointer;margin-top:8px;';
    continueBtn.addEventListener('click', () => {
      this.hide();
      this.onContinue();
    });

    const prestigeBtn = document.createElement('button');
    prestigeBtn.id = 'upgrade-screen-prestige';
    prestigeBtn.textContent = 'Purchase Next Level';
    prestigeBtn.title = 'Coming soon';
    prestigeBtn.disabled = true;
    prestigeBtn.style.cssText = 'font-size:16px;padding:8px 20px;opacity:0.5;cursor:not-allowed;';

    this.el.appendChild(this.messageEl);
    this.el.appendChild(this.rewardEl);
    this.el.appendChild(this.bankEl);
    this.el.appendChild(this.rowsEl);
    this.el.appendChild(continueBtn);
    this.el.appendChild(prestigeBtn);
    document.body.appendChild(this.el);
  }

  show(winner: 'player' | 'enemy', reward: number): void {
    this.messageEl.textContent = winner === 'player' ? 'You won!' : 'You lost!';
    this.rewardEl.textContent = `Earned: $${reward}`;
    this.render();
    this.el.style.display = 'flex';
  }

  hide(): void {
    this.el.style.display = 'none';
  }

  isVisible(): boolean {
    return this.el.style.display !== 'none';
  }

  private render(): void {
    this.bankEl.textContent = `Bank: $${Math.floor(this.gameState.money)}`;
    this.rowsEl.innerHTML = '';
    for (const def of UPGRADES) {
      this.rowsEl.appendChild(this.buildRow(def));
    }
  }

  private buildRow(def: UpgradeDef): HTMLDivElement {
    const tier = this.gameState.upgrades[def.id];
    const cost = nextCost(def, tier);
    const canAfford = this.gameState.money >= cost;

    const row = document.createElement('div');
    row.style.cssText =
      'display:flex;align-items:center;gap:16px;background:rgba(255,255,255,0.1);' +
      'padding:10px 16px;border-radius:8px;';

    const label = document.createElement('span');
    label.style.cssText = 'color:#fff;font-size:18px;flex:1;';
    label.textContent = def.label;

    const tierEl = document.createElement('span');
    tierEl.id = `upgrade-tier-${def.id}`;
    tierEl.style.cssText = 'color:#aef;font-size:16px;min-width:60px;text-align:center;';
    tierEl.textContent = `Tier ${tier}`;

    const costEl = document.createElement('span');
    costEl.style.cssText = 'color:#ffd700;font-size:16px;min-width:80px;text-align:right;';
    costEl.textContent = `$${cost}`;

    const btn = document.createElement('button');
    btn.dataset.upgradeId = def.id;
    btn.textContent = 'BUY';
    btn.disabled = !canAfford;
    btn.style.cssText = `font-size:16px;padding:6px 16px;cursor:${canAfford ? 'pointer' : 'not-allowed'};opacity:${canAfford ? '1' : '0.5'};`;
    btn.addEventListener('click', () => this.purchase(def));

    row.appendChild(label);
    row.appendChild(tierEl);
    row.appendChild(costEl);
    row.appendChild(btn);
    return row;
  }

  private purchase(def: UpgradeDef): void {
    const tier = this.gameState.upgrades[def.id];
    const cost = nextCost(def, tier);
    if (this.gameState.money < cost) return;
    this.gameState.money -= cost;
    this.gameState.upgrades[def.id] += 1;
    persistSave(this.gameState);
    this.render();
  }
}
