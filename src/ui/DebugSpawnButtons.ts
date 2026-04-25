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

  container.appendChild(enemyBtn);
  document.body.appendChild(container);
}
