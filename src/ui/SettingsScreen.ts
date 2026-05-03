import { defaultGameState, type GameState } from '../state/GameState';
import { save as persistSave, reset as resetSave } from '../state/SaveStore';
import { showConfirmDialog } from './ConfirmDialog';

export class SettingsScreen {
  private el: HTMLDivElement;
  private generalEl: HTMLDivElement;
  private resetBtn: HTMLButtonElement;
  private decreaseEnemyBtn: HTMLButtonElement;
  private decreasePrestigeBtn: HTMLButtonElement;
  private backBtn: HTMLButtonElement;
  private onBack: () => void = () => {};

  constructor(private gameState: GameState) {
    const existing = document.getElementById('settings-screen');
    if (existing) existing.remove();

    this.el = document.createElement('div');
    this.el.id = 'settings-screen';
    this.el.style.cssText =
      'display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.85);' +
      'flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:20px;';

    const heading = document.createElement('h1');
    heading.style.cssText = 'color:#fff;font-size:36px;margin:0;';
    heading.textContent = 'Settings';

    const generalSection = document.createElement('div');
    generalSection.style.cssText =
      'display:flex;flex-direction:column;gap:8px;min-width:360px;';
    const generalHeading = document.createElement('h2');
    generalHeading.style.cssText = 'color:#fff;font-size:22px;margin:0;';
    generalHeading.textContent = 'General';
    this.generalEl = document.createElement('div');
    this.generalEl.id = 'settings-general';
    this.generalEl.style.cssText =
      'background:rgba(255,255,255,0.1);padding:16px;border-radius:8px;' +
      'color:#aaa;font-size:14px;font-style:italic;text-align:center;';
    this.generalEl.textContent = 'No general settings yet.';
    generalSection.appendChild(generalHeading);
    generalSection.appendChild(this.generalEl);

    const advancedSection = document.createElement('div');
    advancedSection.id = 'settings-advanced';
    advancedSection.style.cssText =
      'display:flex;flex-direction:column;gap:8px;min-width:360px;';
    const advancedHeading = document.createElement('h2');
    advancedHeading.style.cssText = 'color:#fff;font-size:22px;margin:0;';
    advancedHeading.textContent = 'Advanced';

    this.resetBtn = this.makeAdvancedButton('settings-reset-game');
    this.resetBtn.addEventListener('click', () => this.handleReset());

    this.decreaseEnemyBtn = this.makeAdvancedButton('settings-decrease-enemy-level');
    this.decreaseEnemyBtn.addEventListener('click', () => this.handleDecreaseEnemy());

    this.decreasePrestigeBtn = this.makeAdvancedButton('settings-decrease-prestige');
    this.decreasePrestigeBtn.addEventListener('click', () => this.handleDecreasePrestige());

    advancedSection.appendChild(advancedHeading);
    advancedSection.appendChild(this.resetBtn);
    advancedSection.appendChild(this.decreaseEnemyBtn);
    advancedSection.appendChild(this.decreasePrestigeBtn);

    this.backBtn = document.createElement('button');
    this.backBtn.id = 'settings-back';
    this.backBtn.textContent = 'Back';
    this.backBtn.style.cssText = 'font-size:20px;padding:10px 28px;cursor:pointer;margin-top:12px;';
    this.backBtn.addEventListener('click', () => {
      this.hide();
      this.onBack();
    });

    this.el.appendChild(heading);
    this.el.appendChild(generalSection);
    this.el.appendChild(advancedSection);
    this.el.appendChild(this.backBtn);
    document.body.appendChild(this.el);
  }

  setBackHandler(fn: () => void): void {
    this.onBack = fn;
  }

  show(): void {
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
    this.renderResetButton();
    this.renderDecreaseEnemyButton();
    this.renderDecreasePrestigeButton();
  }

  private renderResetButton(): void {
    this.resetBtn.textContent = 'Reset game';
    this.applyButtonStyle(this.resetBtn, true);
  }

  private renderDecreaseEnemyButton(): void {
    const level = this.gameState.enemyLevel;
    const enabled = level > 1;
    this.decreaseEnemyBtn.textContent = `Decrease enemy level (current: ${level})`;
    this.decreaseEnemyBtn.disabled = !enabled;
    this.applyButtonStyle(this.decreaseEnemyBtn, enabled);
  }

  private renderDecreasePrestigeButton(): void {
    const tier = this.gameState.prestigeTier;
    const enabled = tier > 0;
    this.decreasePrestigeBtn.textContent = `Decrease prestige (current: ${tier})`;
    this.decreasePrestigeBtn.disabled = !enabled;
    this.applyButtonStyle(this.decreasePrestigeBtn, enabled);
  }

  private async handleReset(): Promise<void> {
    const confirmed = await showConfirmDialog({
      id: 'settings-reset-confirm',
      message: 'This will erase all progress and start a new game. Continue?',
      confirmLabel: 'Reset',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    resetSave();
    const fresh = defaultGameState();
    this.gameState.enemyLevel = fresh.enemyLevel;
    this.gameState.money = fresh.money;
    this.gameState.upgrades = { ...fresh.upgrades };
    this.gameState.prestigeTier = fresh.prestigeTier;
    this.gameState.unlockedTroopTypes = [...fresh.unlockedTroopTypes];
    persistSave(this.gameState);
    this.hide();
    this.onBack();
  }

  private async handleDecreaseEnemy(): Promise<void> {
    if (this.gameState.enemyLevel <= 1) return;
    const target = this.gameState.enemyLevel - 1;
    const confirmed = await showConfirmDialog({
      id: 'settings-decrease-enemy-confirm',
      message: `Decrease enemy level to ${target}?`,
      confirmLabel: 'Decrease',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    if (this.gameState.enemyLevel <= 1) return;
    this.gameState.enemyLevel -= 1;
    persistSave(this.gameState);
    this.render();
  }

  private async handleDecreasePrestige(): Promise<void> {
    if (this.gameState.prestigeTier <= 0) return;
    const target = this.gameState.prestigeTier - 1;
    const confirmed = await showConfirmDialog({
      id: 'settings-decrease-prestige-confirm',
      message: `Decrease prestige tier to ${target}?`,
      confirmLabel: 'Decrease',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    if (this.gameState.prestigeTier <= 0) return;
    this.gameState.prestigeTier -= 1;
    persistSave(this.gameState);
    this.render();
  }

  private makeAdvancedButton(id: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.id = id;
    return btn;
  }

  private applyButtonStyle(btn: HTMLButtonElement, enabled: boolean): void {
    btn.style.cssText =
      `font-size:16px;padding:10px 16px;cursor:${enabled ? 'pointer' : 'not-allowed'};` +
      `opacity:${enabled ? '1' : '0.5'};text-align:left;`;
  }
}
