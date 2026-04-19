import type { MatchScene } from '../game/scenes/MatchScene';

type GameWindow = Window & {
  __game__?: { scene: { getScene: (key: string) => MatchScene | null } };
};

export function createDebugSpawnButtons(): void {
  const container = document.createElement('div');
  container.id = 'debug-spawn';
  container.style.cssText = 'position:fixed;top:8px;left:8px;z-index:100;display:flex;gap:8px;';

  const playerBtn = document.createElement('button');
  playerBtn.textContent = 'Spawn Player';
  playerBtn.addEventListener('click', () => {
    (window as GameWindow).__game__?.scene.getScene('Match')?.spawnTroop('player', 'base');
  });

  const enemyBtn = document.createElement('button');
  enemyBtn.textContent = 'Spawn Enemy';
  enemyBtn.addEventListener('click', () => {
    (window as GameWindow).__game__?.scene.getScene('Match')?.spawnTroop('enemy', 'base');
  });

  container.appendChild(playerBtn);
  container.appendChild(enemyBtn);
  document.body.appendChild(container);
}
