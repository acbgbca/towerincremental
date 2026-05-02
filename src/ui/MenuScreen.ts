import { UPGRADES, nextCost, type UpgradeDef } from '../config/upgradeConfig';
import { PRESTIGE_COST } from '../config/gameConfig';
import { TROOP_LABELS, UNLOCK_COSTS } from '../config/troopTypes';
import { save as persistSave } from '../state/SaveStore';
import { showConfirmDialog } from './ConfirmDialog';
import type { GameState } from '../state/GameState';
import type { TroopType } from '../game/types';

export interface MatchResultDisplay {
  winner: 'player' | 'enemy';
  reward: number;
}

export interface MenuShowOptions {
  matchResult?: MatchResultDisplay;
}

export class MenuScreen {
  private el: HTMLDivElement;
  private messageEl: HTMLParagraphElement;
  private rewardEl: HTMLParagraphElement;
  private bankEl: HTMLParagraphElement;
  private enemyLevelEl: HTMLParagraphElement;
  private prestigeTierEl: HTMLParagraphElement;
  private rowsEl: HTMLDivElement;
  private primaryBtn: HTMLButtonElement;
  private prestigeBtn: HTMLButtonElement;
  private onContinue: () => void = () => {};
  private onPrestige: () => void = () => {};

  constructor(private gameState: GameState) {
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

    this.enemyLevelEl = document.createElement('p');
    this.enemyLevelEl.id = 'menu-screen-enemy-level';
    this.enemyLevelEl.style.cssText = 'color:#fff;font-size:18px;margin:0;';

    this.prestigeTierEl = document.createElement('p');
    this.prestigeTierEl.id = 'menu-screen-prestige-tier';
    this.prestigeTierEl.style.cssText = 'color:#ffaaff;font-size:18px;margin:0;';

    this.rowsEl = document.createElement('div');
    this.rowsEl.style.cssText = 'display:flex;flex-direction:column;gap:12px;min-width:360px;';

    this.primaryBtn = document.createElement('button');
    this.primaryBtn.style.cssText = 'font-size:24px;padding:12px 32px;cursor:pointer;margin-top:8px;';
    this.primaryBtn.addEventListener('click', () => {
      this.hide();
      this.onContinue();
    });

    this.prestigeBtn = document.createElement('button');
    this.prestigeBtn.id = 'upgrade-screen-prestige';
    this.prestigeBtn.addEventListener('click', () => this.handlePrestige());

    this.el.appendChild(this.messageEl);
    this.el.appendChild(this.rewardEl);
    this.el.appendChild(this.bankEl);
    this.el.appendChild(this.enemyLevelEl);
    this.el.appendChild(this.prestigeTierEl);
    this.el.appendChild(this.rowsEl);
    this.el.appendChild(this.primaryBtn);
    this.el.appendChild(this.prestigeBtn);
    document.body.appendChild(this.el);
  }

  setContinueHandler(fn: () => void): void {
    this.onContinue = fn;
  }

  setPrestigeHandler(fn: () => void): void {
    this.onPrestige = fn;
  }

  show(opts?: MenuShowOptions): void {
    if (opts?.matchResult) {
      this.messageEl.textContent =
        opts.matchResult.winner === 'player' ? 'You won!' : 'You lost!';
      this.rewardEl.textContent = `Earned: $${opts.matchResult.reward}`;
      this.messageEl.style.display = '';
      this.rewardEl.style.display = '';
      this.primaryBtn.id = 'upgrade-screen-continue';
      this.primaryBtn.textContent = 'Continue';
    } else {
      this.messageEl.textContent = '';
      this.rewardEl.textContent = '';
      this.messageEl.style.display = 'none';
      this.rewardEl.style.display = 'none';
      this.primaryBtn.id = 'menu-screen-start';
      this.primaryBtn.textContent = 'Start Game';
    }
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
    this.enemyLevelEl.textContent = `Enemy Level: ${this.gameState.enemyLevel}`;
    this.prestigeTierEl.textContent = `Prestige Tier: ${this.gameState.prestigeTier}`;
    this.rowsEl.innerHTML = '';
    for (const def of UPGRADES) {
      this.rowsEl.appendChild(this.buildUpgradeRow(def));
    }
    for (const [type, cost] of Object.entries(UNLOCK_COSTS) as [TroopType, number][]) {
      if (this.gameState.unlockedTroopTypes.includes(type)) continue;
      this.rowsEl.appendChild(this.buildUnlockRow(type, cost));
    }
    this.renderPrestigeButton();
  }

  private renderPrestigeButton(): void {
    const canAfford = this.gameState.money >= PRESTIGE_COST;
    this.prestigeBtn.textContent = `Purchase Next Level — $${PRESTIGE_COST}`;
    this.prestigeBtn.disabled = !canAfford;
    this.prestigeBtn.style.cssText = `font-size:16px;padding:8px 20px;cursor:${canAfford ? 'pointer' : 'not-allowed'};opacity:${canAfford ? '1' : '0.5'};`;
  }

  private async handlePrestige(): Promise<void> {
    if (this.gameState.money < PRESTIGE_COST) return;
    const confirmed = await showConfirmDialog({
      id: 'prestige-confirm',
      message:
        'This will reset your money, upgrades, and enemy progress. You will gain a permanent troop boost. Continue?',
      confirmLabel: 'Prestige',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    if (this.gameState.money < PRESTIGE_COST) return;

    this.gameState.enemyLevel = 1;
    this.gameState.money = 0;
    this.gameState.upgrades = { incomeRate: 0, towerMaxHp: 0 };
    this.gameState.unlockedTroopTypes = ['base'];
    this.gameState.prestigeTier += 1;
    persistSave(this.gameState);

    this.render();
    this.hide();
    this.onPrestige();
  }

  private buildUpgradeRow(def: UpgradeDef): HTMLDivElement {
    const tier = this.gameState.upgrades[def.id];
    const cost = nextCost(def, tier);
    const canAfford = this.gameState.money >= cost;

    const row = this.makeRow();

    const label = this.makeLabel(def.label);

    const tierEl = document.createElement('span');
    tierEl.id = `upgrade-tier-${def.id}`;
    tierEl.style.cssText = 'color:#aef;font-size:16px;min-width:60px;text-align:center;';
    tierEl.textContent = `Tier ${tier}`;

    const costEl = this.makeCost(cost);

    const btn = document.createElement('button');
    btn.dataset.upgradeId = def.id;
    btn.textContent = 'BUY';
    btn.disabled = !canAfford;
    btn.style.cssText = `font-size:16px;padding:6px 16px;cursor:${canAfford ? 'pointer' : 'not-allowed'};opacity:${canAfford ? '1' : '0.5'};`;
    btn.addEventListener('click', () => this.purchaseUpgrade(def));

    row.appendChild(label);
    row.appendChild(tierEl);
    row.appendChild(costEl);
    row.appendChild(btn);
    return row;
  }

  private buildUnlockRow(type: TroopType, cost: number): HTMLDivElement {
    const canAfford = this.gameState.money >= cost;
    const row = this.makeRow();
    row.id = `unlock-${type}`;

    const label = this.makeLabel(`Unlock ${TROOP_LABELS[type]}`);
    const costEl = this.makeCost(cost);

    const btn = document.createElement('button');
    btn.id = `unlock-${type}-buy`;
    btn.textContent = 'BUY';
    btn.disabled = !canAfford;
    btn.style.cssText = `font-size:16px;padding:6px 16px;cursor:${canAfford ? 'pointer' : 'not-allowed'};opacity:${canAfford ? '1' : '0.5'};`;
    btn.addEventListener('click', () => this.purchaseUnlock(type, cost));

    row.appendChild(label);
    row.appendChild(costEl);
    row.appendChild(btn);
    return row;
  }

  private makeRow(): HTMLDivElement {
    const row = document.createElement('div');
    row.style.cssText =
      'display:flex;align-items:center;gap:16px;background:rgba(255,255,255,0.1);' +
      'padding:10px 16px;border-radius:8px;';
    return row;
  }

  private makeLabel(text: string): HTMLSpanElement {
    const label = document.createElement('span');
    label.style.cssText = 'color:#fff;font-size:18px;flex:1;';
    label.textContent = text;
    return label;
  }

  private makeCost(cost: number): HTMLSpanElement {
    const costEl = document.createElement('span');
    costEl.style.cssText = 'color:#ffd700;font-size:16px;min-width:80px;text-align:right;';
    costEl.textContent = `$${cost}`;
    return costEl;
  }

  private purchaseUpgrade(def: UpgradeDef): void {
    const tier = this.gameState.upgrades[def.id];
    const cost = nextCost(def, tier);
    if (this.gameState.money < cost) return;
    this.gameState.money -= cost;
    this.gameState.upgrades[def.id] += 1;
    persistSave(this.gameState);
    this.render();
  }

  private purchaseUnlock(type: TroopType, cost: number): void {
    if (this.gameState.money < cost) return;
    if (this.gameState.unlockedTroopTypes.includes(type)) return;
    this.gameState.money -= cost;
    this.gameState.unlockedTroopTypes = [...this.gameState.unlockedTroopTypes, type];
    persistSave(this.gameState);
    this.render();
  }
}
