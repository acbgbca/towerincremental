import { test, expect, type Page } from '@playwright/test';
import { TOWER, BOARD_WIDTH, TOWER_MARGIN, TOWER_WIDTH, TROOP_BASE } from '../../src/config/gameConfig';
import { UPGRADES, effectiveValue } from '../../src/config/upgradeConfig';

type SceneShape = {
  sys: { settings: { active: boolean } };
  enemyTower: { currentHp: number };
  playerTower: { currentHp: number; maxHp: number };
  incomeSystem: { rate: number };
  gameState: { enemyLevel: number; money: number; upgrades: { incomeRate: number; towerMaxHp: number } };
  matchState: { money: number; troopDamageDealt: number; towerDamageDealt: number };
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

const incomeRateDef = UPGRADES.find((u) => u.id === 'incomeRate')!;
const towerMaxHpDef = UPGRADES.find((u) => u.id === 'towerMaxHp')!;

test('Upgrade screen appears after match end with bank and upgrade rows', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForMatch(page);

  await triggerPlayerWin(page);

  await expect(page.locator('#match-result-overlay')).toBeVisible();
  await expect(page.locator('#upgrade-screen-bank')).toBeVisible();
  await expect(page.locator(`#upgrade-tier-incomeRate`)).toBeVisible();
  await expect(page.locator(`#upgrade-tier-towerMaxHp`)).toBeVisible();
  await expect(page.locator('#upgrade-screen-continue')).toBeVisible();
  await expect(page.locator('#upgrade-screen-prestige')).toBeDisabled();
});

test('Purchase Next Level button is disabled when bank is below cost', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForMatch(page);

  await triggerPlayerWin(page);

  const prestige = page.locator('#upgrade-screen-prestige');
  await expect(prestige).toBeDisabled();
});

test('BUY enables when bank >= cost, clicking deducts bank and increments tier', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  // Set money high enough to afford the income rate upgrade (tier 0 costs baseCost=50)
  await page.evaluate(() => {
    localStorage.setItem(
      'towerincremental:save',
      JSON.stringify({ version: 3, data: { enemyLevel: 1, money: 200, upgrades: { incomeRate: 0, towerMaxHp: 0 } } }),
    );
  });
  await page.reload();
  await waitForMatch(page);

  await triggerPlayerWin(page);
  await expect(page.locator('#match-result-overlay')).toBeVisible();

  // The bank shown should include both pre-loaded money and match reward
  const bankText = await page.locator('#upgrade-screen-bank').textContent();
  const bank = parseInt(bankText?.replace('Bank: $', '') ?? '0', 10);
  expect(bank).toBeGreaterThanOrEqual(incomeRateDef.baseCost);

  const tierBefore = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.gameState.upgrades.incomeRate ?? -1,
  );
  expect(tierBefore).toBe(0);

  // Find and click the income rate BUY button
  const buyBtn = page.locator('[data-upgrade-id="incomeRate"]');
  await expect(buyBtn).toBeEnabled();
  await buyBtn.click();

  // Tier incremented
  const tierAfter = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.gameState.upgrades.incomeRate ?? -1,
  );
  expect(tierAfter).toBe(1);

  // Bank decreased by baseCost
  const bankTextAfter = await page.locator('#upgrade-screen-bank').textContent();
  const bankAfter = parseInt(bankTextAfter?.replace('Bank: $', '') ?? '0', 10);
  expect(bankAfter).toBe(bank - incomeRateDef.baseCost);
});

test('After Continue, next match uses upgraded income rate', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  // Pre-set one income rate upgrade already applied
  await page.evaluate(() => {
    localStorage.setItem(
      'towerincremental:save',
      JSON.stringify({ version: 3, data: { enemyLevel: 1, money: 0, upgrades: { incomeRate: 1, towerMaxHp: 0 } } }),
    );
  });
  await page.reload();
  await waitForMatch(page);

  // Check the incomeSystem rate directly rather than timing
  const activeRate = await page.evaluate(() => {
    const scene = (window as GameWindow).__game__?.scene.getScene('Match') as unknown as {
      incomeSystem: { rate: number };
    } | null;
    return scene?.incomeSystem?.rate ?? 0;
  });

  const { INCOME_RATE } = await import('../../src/config/gameConfig');
  const expectedRate = effectiveValue(incomeRateDef, INCOME_RATE, 1);
  expect(activeRate).toBe(expectedRate);
});

test('After Continue, next match applies upgraded tower max HP', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  // 2 towerMaxHp upgrades
  await page.evaluate(() => {
    localStorage.setItem(
      'towerincremental:save',
      JSON.stringify({ version: 3, data: { enemyLevel: 1, money: 0, upgrades: { incomeRate: 0, towerMaxHp: 2 } } }),
    );
  });
  await page.reload();
  await waitForMatch(page);

  const playerMaxHp = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.playerTower.maxHp ?? 0,
  );
  const { TOWER } = await import('../../src/config/gameConfig');
  const expected = effectiveValue(towerMaxHpDef, TOWER.maxHp, 2);
  expect(playerMaxHp).toBe(expected);
});

test('Upgrades persist across page reload', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => {
    localStorage.setItem(
      'towerincremental:save',
      JSON.stringify({ version: 3, data: { enemyLevel: 1, money: 200, upgrades: { incomeRate: 0, towerMaxHp: 0 } } }),
    );
  });
  await page.reload();
  await waitForMatch(page);

  await triggerPlayerWin(page);
  await expect(page.locator('#match-result-overlay')).toBeVisible();

  // Buy the income rate upgrade
  const buyBtn = page.locator('[data-upgrade-id="incomeRate"]');
  await expect(buyBtn).toBeEnabled();
  await buyBtn.click();

  const tierAfterPurchase = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.gameState.upgrades.incomeRate,
  );
  expect(tierAfterPurchase).toBe(1);

  // Reload and check upgrade still present
  await page.reload();
  await waitForMatch(page);

  const tierAfterReload = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.gameState.upgrades.incomeRate,
  );
  expect(tierAfterReload).toBe(1);
});

test('Migration: v2 save loads with upgrades defaulted to 0', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => {
    localStorage.setItem(
      'towerincremental:save',
      JSON.stringify({ version: 2, data: { enemyLevel: 2, money: 50 } }),
    );
  });
  await page.reload();
  await waitForMatch(page);

  const state = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.gameState,
  );

  expect(state?.enemyLevel).toBe(2);
  expect(state?.money).toBe(50);
  expect(state?.upgrades?.incomeRate).toBe(0);
  expect(state?.upgrades?.towerMaxHp).toBe(0);
});
