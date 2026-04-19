import { test, expect } from '@playwright/test';
import { PLAYER, ENEMY } from '../../src/render/palette';
import { BOARD_WIDTH } from '../../src/config/gameConfig';

test('renders battlefield with two tower rectangles', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 });

  const towers = await page.waitForFunction(
    () => {
      const game = (window as unknown as Record<string, unknown>)['__game__'] as
        | { scene: { getScene: (key: string) => Record<string, unknown> | null } }
        | undefined;
      if (!game) return null;
      const scene = game.scene.getScene('BootScene') as
        | {
            playerTower?: { fillColor: number; x: number };
            enemyTower?: { fillColor: number; x: number };
          }
        | null;
      if (!scene?.playerTower || !scene?.enemyTower) return null;
      return {
        playerColor: scene.playerTower.fillColor,
        enemyColor: scene.enemyTower.fillColor,
        playerX: scene.playerTower.x,
        enemyX: scene.enemyTower.x,
      };
    },
    undefined,
    { timeout: 15_000 },
  );

  const data = await towers.jsonValue();
  expect(data).not.toBeNull();
  const { playerColor, enemyColor, playerX, enemyX } = data!;
  expect(playerColor).toBe(PLAYER);
  expect(enemyColor).toBe(ENEMY);
  expect(playerX).toBeLessThan(BOARD_WIDTH / 2);
  expect(enemyX).toBeGreaterThan(BOARD_WIDTH / 2);
});
