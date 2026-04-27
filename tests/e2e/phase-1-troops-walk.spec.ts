import { test, expect, type Page } from '@playwright/test';
import { TROOP_BASE } from '../../src/config/gameConfig';

type SceneShape = {
  sys: { settings: { active: boolean } };
  playerTroops: Array<{ x: number }>;
  enemyTroops: Array<{ x: number }>;
  spawnTroop: (side: string, type: string) => void;
};

type GameWindow = Window & {
  __game__?: { scene: { getScene: (key: string) => SceneShape | null } };
};

async function waitForMatch(page: Page) {
  await page.goto('/?test');
  await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.sys.settings.active === true,
    { timeout: 15_000 },
  );
}

test('Match scene is active after boot', async ({ page }) => {
  await waitForMatch(page);
});

test('Spawn Player creates a troop walking right', async ({ page }) => {
  await waitForMatch(page);

  await page.evaluate(() => (window as GameWindow).__game__?.scene.getScene('Match')?.spawnTroop('player', 'base'));

  const count = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.playerTroops.length ?? 0,
  );
  expect(count).toBe(1);

  const x0 = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.playerTroops[0]?.x ?? 0,
  );
  await page.waitForTimeout(1000);
  const x1 = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.playerTroops[0]?.x ?? 0,
  );

  expect(x1).toBeGreaterThan(x0 + TROOP_BASE.walkSpeed * 0.2);
});

test('Spawn Enemy creates a troop walking left', async ({ page }) => {
  await waitForMatch(page);

  await page.click('button:text("Spawn Enemy")');

  const x0 = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.enemyTroops[0]?.x ?? 0,
  );
  await page.waitForTimeout(1000);
  const x1 = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.enemyTroops[0]?.x ?? 0,
  );

  expect(x1).toBeLessThan(x0 - TROOP_BASE.walkSpeed * 0.2);
});

test('Troops despawn after leaving play area', async ({ page }) => {
  await waitForMatch(page);

  await page.evaluate(() => (window as GameWindow).__game__?.scene.getScene('Match')?.spawnTroop('player', 'base'));
  await page.click('button:text("Spawn Enemy")');

  await page.waitForFunction(
    () => {
      const scene = (window as GameWindow).__game__?.scene.getScene('Match');
      return (scene?.playerTroops.length ?? 1) === 0 && (scene?.enemyTroops.length ?? 1) === 0;
    },
    { timeout: 20_000 },
  );
});

test('Multiple rapid spawns work independently', async ({ page }) => {
  await waitForMatch(page);

  await page.evaluate(() => (window as GameWindow).__game__?.scene.getScene('Match')?.spawnTroop('player', 'base'));
  await page.evaluate(() => (window as GameWindow).__game__?.scene.getScene('Match')?.spawnTroop('player', 'base'));
  await page.evaluate(() => (window as GameWindow).__game__?.scene.getScene('Match')?.spawnTroop('player', 'base'));

  const count = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.playerTroops.length ?? 0,
  );
  expect(count).toBe(3);
});
