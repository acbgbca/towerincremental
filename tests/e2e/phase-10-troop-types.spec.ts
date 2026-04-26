import { test, expect, type Page } from '@playwright/test';
import { TROOP_TYPES, UNLOCK_COSTS } from '../../src/config/troopTypes';
import { ENEMY_LEVEL_STAT_STEP } from '../../src/config/gameConfig';
import { LEVEL_4_WAVES, wavesForLevel } from '../../src/config/enemyWaves';

type TroopShape = { type: string; maxHp: number; damage: number; width: number; height: number };

type SceneShape = {
  sys: { settings: { active: boolean } };
  playerTroops: TroopShape[];
  enemyTroops: TroopShape[];
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

test('Fresh save: HUD shows only the base spawn button', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForMatch(page);

  await expect(page.locator('#hud-spawn-base')).toBeVisible();
  await expect(page.locator('#hud-spawn-runner')).toHaveCount(0);
  await expect(page.locator('#hud-spawn-tank')).toHaveCount(0);
});

test('Upgrade screen shows Unlock rows for runner and tank', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForMatch(page);

  await openUpgradeScreen(page);

  await expect(page.locator('#unlock-runner')).toBeVisible();
  await expect(page.locator('#unlock-tank')).toBeVisible();
  await expect(page.locator('#unlock-runner')).toContainText(`$${UNLOCK_COSTS.runner}`);
  await expect(page.locator('#unlock-tank')).toContainText(`$${UNLOCK_COSTS.tank}`);
});

test('Buying Unlock Runner persists and HUD shows runner button', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await seedSave(page, { money: UNLOCK_COSTS.runner! + 50 });
  await page.reload();
  await waitForMatch(page);

  await openUpgradeScreen(page);
  await page.locator('#unlock-runner-buy').click();

  await expect(page.locator('#unlock-runner')).toHaveCount(0);

  const stored = await page.evaluate(() => localStorage.getItem('towerincremental:save'));
  const parsed = JSON.parse(stored!);
  expect(parsed.data.unlockedTroopTypes).toContain('runner');

  await page.locator('#upgrade-screen-continue').click();
  await expect(page.locator('#hud-spawn-runner')).toBeVisible();
});

test('Spawned runner has runner stats from the catalogue', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await seedSave(page, { unlockedTroopTypes: ['base', 'runner'] });
  await page.reload();
  await waitForMatch(page);

  await page.evaluate(() =>
    (window as GameWindow).__game__?.scene.getScene('Match')?.spawnTroop('player', 'runner'),
  );

  const stats = await page.evaluate(() => {
    const t = (window as GameWindow).__game__?.scene.getScene('Match')?.playerTroops[0];
    return { type: t?.type, maxHp: t?.maxHp, damage: t?.damage, width: t?.width, height: t?.height };
  });
  expect(stats.type).toBe('runner');
  expect(stats.maxHp).toBe(TROOP_TYPES.runner.hp);
  expect(stats.damage).toBe(TROOP_TYPES.runner.damage);
  expect(stats.width).toBe(TROOP_TYPES.runner.width);
  expect(stats.height).toBe(TROOP_TYPES.runner.height);
});

test('Spawned tank has tank stats and is larger than base', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await seedSave(page, { unlockedTroopTypes: ['base', 'runner', 'tank'] });
  await page.reload();
  await waitForMatch(page);

  await page.evaluate(() =>
    (window as GameWindow).__game__?.scene.getScene('Match')?.spawnTroop('player', 'tank'),
  );

  const stats = await page.evaluate(() => {
    const t = (window as GameWindow).__game__?.scene.getScene('Match')?.playerTroops[0];
    return { type: t?.type, maxHp: t?.maxHp, damage: t?.damage, width: t?.width, height: t?.height };
  });
  expect(stats.type).toBe('tank');
  expect(stats.maxHp).toBe(TROOP_TYPES.tank.hp);
  expect(stats.damage).toBe(TROOP_TYPES.tank.damage);
  expect(stats.width).toBeGreaterThan(TROOP_TYPES.base.width);
  expect(stats.height).toBeGreaterThan(TROOP_TYPES.base.height);
});

test('Prestige buff applies to runner and tank symmetrically', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await seedSave(page, { prestigeTier: 2, unlockedTroopTypes: ['base', 'runner', 'tank'] });
  await page.reload();
  await waitForMatch(page);

  await page.evaluate(() => {
    const scene = (window as GameWindow).__game__?.scene.getScene('Match');
    scene?.spawnTroop('player', 'runner');
    scene?.spawnTroop('player', 'tank');
  });

  const [runner, tank] = await page.evaluate(() => {
    const troops = (window as GameWindow).__game__?.scene.getScene('Match')?.playerTroops;
    return troops!.map((t) => ({ type: t.type, maxHp: t.maxHp, damage: t.damage }));
  });

  expect(runner.type).toBe('runner');
  expect(runner.maxHp).toBe(TROOP_TYPES.runner.hp + 2 * ENEMY_LEVEL_STAT_STEP.hp);
  expect(runner.damage).toBe(TROOP_TYPES.runner.damage + 2 * ENEMY_LEVEL_STAT_STEP.damage);

  expect(tank.type).toBe('tank');
  expect(tank.maxHp).toBe(TROOP_TYPES.tank.hp + 2 * ENEMY_LEVEL_STAT_STEP.hp);
  expect(tank.damage).toBe(TROOP_TYPES.tank.damage + 2 * ENEMY_LEVEL_STAT_STEP.damage);
});

test('Prestige re-locks runner and tank; rows reappear on upgrade screen', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await seedSave(page, {
    money: 5000,
    enemyLevel: 3,
    upgrades: { incomeRate: 1, towerMaxHp: 1 },
    unlockedTroopTypes: ['base', 'runner', 'tank'],
  });
  await page.reload();
  await waitForMatch(page);

  await openUpgradeScreen(page);

  // Pre-prestige: rows are hidden because already unlocked
  await expect(page.locator('#unlock-runner')).toHaveCount(0);
  await expect(page.locator('#unlock-tank')).toHaveCount(0);

  await page.locator('#upgrade-screen-prestige').click();
  await page.locator('#prestige-confirm .confirm-dialog-confirm').click();
  await expect(page.locator('#match-result-overlay')).toBeHidden();

  // Open the next upgrade screen to verify rows reappear
  await openUpgradeScreen(page);
  await expect(page.locator('#unlock-runner')).toBeVisible();
  await expect(page.locator('#unlock-tank')).toBeVisible();

  const state = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.gameState,
  );
  expect(state?.unlockedTroopTypes).toEqual(['base']);
});

test('LEVEL_4_WAVES config selector returns waves containing runner and tank', () => {
  const cfg = wavesForLevel(4);
  expect(cfg).toBe(LEVEL_4_WAVES);
  const allTypes = cfg.waves.flatMap((w) => w.troops.map((t) => t.type));
  expect(allTypes).toContain('runner');
  expect(allTypes).toContain('tank');
});

test('At enemyLevel 4, real waves spawn runner and tank enemies', async ({ page }) => {
  // Note: not using ?test so real waves run. __game__ is exposed in DEV.
  await page.evaluate(() => localStorage.clear()).catch(() => undefined);
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem(
      'towerincremental:save',
      JSON.stringify({
        version: 4,
        data: {
          enemyLevel: 4,
          money: 0,
          upgrades: { incomeRate: 0, towerMaxHp: 0 },
          prestigeTier: 0,
          unlockedTroopTypes: ['base'],
        },
      }),
    );
  });
  await page.reload();
  await waitForMatch(page);

  // Wait until at least one runner and one tank have appeared in enemyTroops
  await page.waitForFunction(
    () => {
      const troops = (window as GameWindow).__game__?.scene.getScene('Match')?.enemyTroops ?? [];
      const types = new Set(troops.map((t) => t.type));
      return types.has('runner') && types.has('tank');
    },
    { timeout: 30_000 },
  );
});
