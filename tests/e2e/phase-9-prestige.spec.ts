import { test, expect, type Page } from '@playwright/test';
import {
  TROOP_BASE,
  ENEMY_LEVEL_STAT_STEP,
  PRESTIGE_COST,
} from '../../src/config/gameConfig';

type SceneShape = {
  sys: { settings: { active: boolean } };
  playerTroops: Array<{ maxHp: number; damage: number }>;
  gameState: {
    enemyLevel: number;
    money: number;
    upgrades: { incomeRate: number; towerMaxHp: number };
    prestigeTier: number;
    unlockedTroopTypes: string[];
  };
  spawnTroop: (side: string, type: string) => void;
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

async function seedSave(
  page: Page,
  data: {
    enemyLevel?: number;
    money?: number;
    upgrades?: { incomeRate: number; towerMaxHp: number };
    prestigeTier?: number;
    unlockedTroopTypes?: string[];
  },
) {
  const full = {
    enemyLevel: data.enemyLevel ?? 1,
    money: data.money ?? 0,
    upgrades: data.upgrades ?? { incomeRate: 0, towerMaxHp: 0 },
    prestigeTier: data.prestigeTier ?? 0,
    unlockedTroopTypes: data.unlockedTroopTypes ?? ['base'],
  };
  await page.evaluate((payload) => {
    localStorage.setItem(
      'towerincremental:save',
      JSON.stringify({ version: 4, data: payload }),
    );
  }, full);
}

async function openUpgradeScreen(page: Page) {
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() =>
      (window as GameWindow).__game__?.scene.getScene('Match')?.spawnTroop('player', 'base'),
    );
  }
  await expect(page.locator('#match-result-overlay')).toBeVisible({ timeout: 30_000 });
}

test('HUD shows Prestige: 0 on a fresh save', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForMatch(page);

  await expect(page.locator('#hud-prestige')).toHaveText('Prestige: 0');
});

test('Purchase Next Level shows the cost on the button', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForMatch(page);

  await openUpgradeScreen(page);

  const prestige = page.locator('#upgrade-screen-prestige');
  await expect(prestige).toContainText(`$${PRESTIGE_COST}`);
});

test('Purchase Next Level enabled when bank >= PRESTIGE_COST', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await seedSave(page, { money: PRESTIGE_COST + 100, enemyLevel: 5, upgrades: { incomeRate: 3, towerMaxHp: 2 } });
  await page.reload();
  await waitForMatch(page);

  await openUpgradeScreen(page);

  await expect(page.locator('#upgrade-screen-prestige')).toBeEnabled();
});

test('Cancelling the confirm dialog does not prestige', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await seedSave(page, { money: PRESTIGE_COST + 100, enemyLevel: 5, upgrades: { incomeRate: 3, towerMaxHp: 2 } });
  await page.reload();
  await waitForMatch(page);

  await openUpgradeScreen(page);
  await page.locator('#upgrade-screen-prestige').click();
  await expect(page.locator('#prestige-confirm')).toBeVisible();
  await page.locator('#prestige-confirm .confirm-dialog-cancel').click();
  await expect(page.locator('#prestige-confirm')).toHaveCount(0);

  const state = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.gameState,
  );
  expect(state?.prestigeTier).toBe(0);
  expect(state?.enemyLevel).not.toBe(1);
  expect(state?.upgrades).toEqual({ incomeRate: 3, towerMaxHp: 2 });
});

test('Confirming prestige resets state and increments prestigeTier', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await seedSave(page, { money: PRESTIGE_COST + 100, enemyLevel: 5, upgrades: { incomeRate: 3, towerMaxHp: 2 } });
  await page.reload();
  await waitForMatch(page);

  await openUpgradeScreen(page);
  await page.locator('#upgrade-screen-prestige').click();
  await page.locator('#prestige-confirm .confirm-dialog-confirm').click();

  // Wait for overlay to dismiss + state to settle
  await expect(page.locator('#match-result-overlay')).toBeHidden();

  const state = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.gameState,
  );
  expect(state?.enemyLevel).toBe(1);
  expect(state?.money).toBe(0);
  expect(state?.upgrades).toEqual({ incomeRate: 0, towerMaxHp: 0 });
  expect(state?.prestigeTier).toBe(1);
  expect(state?.unlockedTroopTypes).toEqual(['base']);

  // Persisted to localStorage
  const stored = await page.evaluate(() => localStorage.getItem('towerincremental:save'));
  const parsed = JSON.parse(stored!);
  expect(parsed.data.prestigeTier).toBe(1);
  expect(parsed.data.money).toBe(0);
});

test('After prestige, player troops are stronger by one ENEMY_LEVEL_STAT_STEP', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await seedSave(page, { prestigeTier: 1, money: 0, enemyLevel: 1 });
  await page.reload();
  await waitForMatch(page);

  await page.evaluate(() =>
    (window as GameWindow).__game__?.scene.getScene('Match')?.spawnTroop('player', 'base'),
  );

  const stats = await page.evaluate(() => {
    const t = (window as GameWindow).__game__?.scene.getScene('Match')?.playerTroops[0];
    return { hp: t?.maxHp, damage: t?.damage };
  });
  expect(stats.hp).toBe(TROOP_BASE.hp + ENEMY_LEVEL_STAT_STEP.hp);
  expect(stats.damage).toBe(TROOP_BASE.damage + ENEMY_LEVEL_STAT_STEP.damage);
});

test('Reload preserves prestige tier and reset state', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await seedSave(page, { money: PRESTIGE_COST + 100, enemyLevel: 5, upgrades: { incomeRate: 3, towerMaxHp: 2 } });
  await page.reload();
  await waitForMatch(page);

  await openUpgradeScreen(page);
  await page.locator('#upgrade-screen-prestige').click();
  await page.locator('#prestige-confirm .confirm-dialog-confirm').click();
  await expect(page.locator('#match-result-overlay')).toBeHidden();

  await page.reload();
  await waitForMatch(page);

  const state = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.gameState,
  );
  expect(state?.prestigeTier).toBe(1);
  expect(state?.enemyLevel).toBe(1);
  expect(state?.money).toBe(0);
  await expect(page.locator('#hud-prestige')).toHaveText('Prestige: 1');
});

test('Multiple prestige cycles stack the troop buff additively', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await seedSave(page, { prestigeTier: 2, money: 0 });
  await page.reload();
  await waitForMatch(page);

  await page.evaluate(() =>
    (window as GameWindow).__game__?.scene.getScene('Match')?.spawnTroop('player', 'base'),
  );

  const stats = await page.evaluate(() => {
    const t = (window as GameWindow).__game__?.scene.getScene('Match')?.playerTroops[0];
    return { hp: t?.maxHp, damage: t?.damage };
  });
  expect(stats.hp).toBe(TROOP_BASE.hp + 2 * ENEMY_LEVEL_STAT_STEP.hp);
  expect(stats.damage).toBe(TROOP_BASE.damage + 2 * ENEMY_LEVEL_STAT_STEP.damage);
});

test('Migration: v3 save loads with prestigeTier=0 and unlockedTroopTypes=[base]', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => {
    localStorage.setItem(
      'towerincremental:save',
      JSON.stringify({
        version: 3,
        data: { enemyLevel: 4, money: 80, upgrades: { incomeRate: 1, towerMaxHp: 1 } },
      }),
    );
  });
  await page.reload();
  await waitForMatch(page);

  const state = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.gameState,
  );
  expect(state?.enemyLevel).toBe(4);
  expect(state?.money).toBe(80);
  expect(state?.prestigeTier).toBe(0);
  expect(state?.unlockedTroopTypes).toEqual(['base']);
});
