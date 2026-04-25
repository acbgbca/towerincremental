import { reset as resetSave, save } from '../state/SaveStore';
import { defaultGameState } from '../state/GameState';
import type { MatchScene } from '../game/scenes/MatchScene';

type GameWindow = Window & {
  __game__?: { scene: { getScene: (key: string) => MatchScene | null } };
};

export function createDebugSpawnButtons(): void {
  const search = window.location.search;
  if (!search.includes('debug') && !search.includes('test')) return;

  const container = document.createElement('div');
  container.id = 'debug-spawn';
  container.style.cssText = 'position:fixed;top:8px;left:8px;z-index:100;display:flex;gap:8px;';

  const enemyBtn = document.createElement('button');
  enemyBtn.textContent = 'Spawn Enemy';
  enemyBtn.addEventListener('click', () => {
    (window as GameWindow).__game__?.scene.getScene('Match')?.spawnTroop('enemy', 'base');
  });

  const resetBtn = document.createElement('button');
  resetBtn.id = 'debug-reset-save';
  resetBtn.textContent = 'Reset save';
  resetBtn.addEventListener('click', () => {
    resetSave();
    save(defaultGameState());
  });

  container.appendChild(enemyBtn);
  container.appendChild(resetBtn);
  document.body.appendChild(container);
}
