export class MatchResultOverlay {
  private el: HTMLDivElement;
  private message: HTMLParagraphElement;

  constructor(onRestart: () => void) {
    const existing = document.getElementById('match-result-overlay');
    if (existing) existing.remove();

    this.el = document.createElement('div');
    this.el.id = 'match-result-overlay';
    this.el.style.cssText =
      'display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.75);' +
      'flex-direction:column;align-items:center;justify-content:center;gap:24px;';

    this.message = document.createElement('p');
    this.message.style.cssText = 'color:#fff;font-size:48px;font-weight:bold;margin:0;';

    const btn = document.createElement('button');
    btn.textContent = 'Restart';
    btn.style.cssText = 'font-size:24px;padding:12px 32px;cursor:pointer;';
    btn.addEventListener('click', () => {
      this.hide();
      onRestart();
    });

    this.el.appendChild(this.message);
    this.el.appendChild(btn);
    document.body.appendChild(this.el);
  }

  show(winner: 'player' | 'enemy'): void {
    this.message.textContent = winner === 'player' ? 'You won!' : 'You lost!';
    this.el.style.display = 'flex';
  }

  hide(): void {
    this.el.style.display = 'none';
  }

  isVisible(): boolean {
    return this.el.style.display !== 'none';
  }
}
