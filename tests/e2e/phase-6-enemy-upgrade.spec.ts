import { test, expect, type Page } from '@playwright/test';
import { TOWER, BOARD_WIDTH, TOWER_MARGIN, TOWER_WIDTH, TROOP_BASE, ENEMY_LEVEL_STAT_STEP } from '../../src/config/gameConfig';

type SceneShape = {
  sys: { settings: { active: boolean } };
  enemyTower: { currentHp: number };
  playerTower: { currentHp: number };
  gameState: { enemyLevel: number };
  spawnTroop: (side: string, type: string) => void;
  resetMatch: () => void;
};

type GameWindow = Window & {
  __game__?: { scene: { getScene: (key: string) => SceneShape | null } };
};

async function waitForMatch(page: Page) {
  await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.sys.settings.active === true,
    { timeout: 15_000 },
  );
}

async function triggerPlayerWin(page: Page) {
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() =>
      (window as GameWindow).__game__?.scene.getScene('Match')?.spawnTroop('player', 'base'),
    );
  }
  const walkMs = ((BOARD_WIDTH - TOWER_MARGIN - TOWER_WIDTH) - (TOWER_MARGIN + TOWER_WIDTH)) / TROOP_BASE.walkSpeed * 1000;
  const hitsToKill = TOWER.maxHp / TROOP_BASE.damage;
  await page.waitForFunction(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.enemyTower.currentHp === 0,
    { timeout: walkMs + hitsToKill * TROOP_BASE.attackInterval + 10_000 },
  );
}

test('HUD shows "Enemy Level: 1" on a fresh save', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForMatch(page);

  await expect(page.locator('#hud-enemy-level')).toHaveText('Enemy Level: 1');
});

test('Winning increments enemy level in HUD and persists on reload', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForMatch(page);

  await triggerPlayerWin(page);

  await expect(page.locator('#hud-enemy-level')).toHaveText('Enemy Level: 2');

  await page.reload();
  await waitForMatch(page);

  await expect(page.locator('#hud-enemy-level')).toHaveText('Enemy Level: 2');
});

test('After winning, enemy troops use upgraded stats', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForMatch(page);

  await triggerPlayerWin(page);
  await page.click('#upgrade-screen-continue');

  await page.evaluate(() =>
    (window as GameWindow).__game__?.scene.getScene('Match')?.spawnTroop('enemy', 'base'),
  );

  const enemyMaxHp = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.gameState.enemyLevel,
  );

  expect(enemyMaxHp).toBe(2);

  const expectedHp = TROOP_BASE.hp + ENEMY_LEVEL_STAT_STEP.hp;
  const actualEnemyHp = await page.evaluate(() => {
    const scene = (window as GameWindow).__game__?.scene.getScene('Match');
    const enemy = (scene as unknown as { enemyTroops: Array<{ maxHp: number }> })?.enemyTroops?.[0];
    return enemy?.maxHp;
  });
  expect(actualEnemyHp).toBe(expectedHp);
});

test('Losing does not increment enemy level', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForMatch(page);

  for (let i = 0; i < 10; i++) {
    await page.evaluate(() =>
      (window as GameWindow).__game__?.scene.getScene('Match')?.spawnTroop('enemy', 'base'),
    );
  }

  await page.waitForFunction(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.playerTower.currentHp === 0,
    { timeout: 30_000 },
  );

  await expect(page.locator('#hud-enemy-level')).toHaveText('Enemy Level: 1');
});

test('Reset save button restores enemy level to 1', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForMatch(page);

  await triggerPlayerWin(page);
  await expect(page.locator('#hud-enemy-level')).toHaveText('Enemy Level: 2');

  await page.click('#upgrade-screen-continue');
  await page.click('#debug-reset-save');
  await page.reload();
  await waitForMatch(page);

  await expect(page.locator('#hud-enemy-level')).toHaveText('Enemy Level: 1');
});
