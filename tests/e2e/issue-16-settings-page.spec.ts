import { test, expect, type Page } from '@playwright/test';

async function clearSave(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
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

async function openSettings(page: Page) {
  await expect(page.locator('#menu-screen-settings')).toBeVisible();
  await page.locator('#menu-screen-settings').click();
  await expect(page.locator('#settings-screen')).toBeVisible();
}

test('Settings button is visible on the main menu', async ({ page }) => {
  await clearSave(page);
  await page.reload();

  await expect(page.locator('#menu-screen-settings')).toBeVisible();
  await expect(page.locator('#menu-screen-settings')).toHaveText('Settings');
});

test('Clicking Settings opens the settings screen and hides the menu', async ({ page }) => {
  await clearSave(page);
  await page.reload();

  await openSettings(page);
  await expect(page.locator('#match-result-overlay')).toBeHidden();
});

test('Settings screen shows General and Advanced sections', async ({ page }) => {
  await clearSave(page);
  await page.reload();

  await openSettings(page);
  await expect(page.locator('#settings-general')).toBeVisible();
  await expect(page.locator('#settings-advanced')).toBeVisible();
  await expect(page.locator('#settings-reset-game')).toBeVisible();
  await expect(page.locator('#settings-decrease-enemy-level')).toBeVisible();
  await expect(page.locator('#settings-decrease-prestige')).toBeVisible();
});

test('Back button returns to the main menu', async ({ page }) => {
  await clearSave(page);
  await page.reload();

  await openSettings(page);
  await page.locator('#settings-back').click();

  await expect(page.locator('#settings-screen')).toBeHidden();
  await expect(page.locator('#match-result-overlay')).toBeVisible();
  await expect(page.locator('#menu-screen-start')).toBeVisible();
});

test('Decrease enemy level button shows current value', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await seedSave(page, { enemyLevel: 5 });
  await page.reload();

  await openSettings(page);
  await expect(page.locator('#settings-decrease-enemy-level')).toContainText('current: 5');
});

test('Decrease prestige button shows current value', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await seedSave(page, { prestigeTier: 3 });
  await page.reload();

  await openSettings(page);
  await expect(page.locator('#settings-decrease-prestige')).toContainText('current: 3');
});

test('Decrease enemy level is disabled when enemyLevel === 1', async ({ page }) => {
  await clearSave(page);
  await page.reload();

  await openSettings(page);
  await expect(page.locator('#settings-decrease-enemy-level')).toBeDisabled();
});

test('Decrease prestige is disabled when prestigeTier === 0', async ({ page }) => {
  await clearSave(page);
  await page.reload();

  await openSettings(page);
  await expect(page.locator('#settings-decrease-prestige')).toBeDisabled();
});

test('Cancelling Reset game does nothing', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await seedSave(page, { enemyLevel: 5, money: 200, prestigeTier: 2 });
  await page.reload();

  await openSettings(page);
  await page.locator('#settings-reset-game').click();
  await expect(page.locator('#settings-reset-confirm')).toBeVisible();
  await page.locator('#settings-reset-confirm .confirm-dialog-cancel').click();
  await expect(page.locator('#settings-reset-confirm')).toHaveCount(0);

  const stored = await page.evaluate(() => localStorage.getItem('towerincremental:save'));
  const parsed = JSON.parse(stored!);
  expect(parsed.data.enemyLevel).toBe(5);
  expect(parsed.data.money).toBe(200);
  expect(parsed.data.prestigeTier).toBe(2);
});

test('Confirming Reset game wipes save and the menu reflects the wipe', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await seedSave(page, {
    enemyLevel: 5,
    money: 200,
    prestigeTier: 2,
    upgrades: { incomeRate: 3, towerMaxHp: 2 },
    unlockedTroopTypes: ['base', 'tank'],
  });
  await page.reload();

  await openSettings(page);
  await page.locator('#settings-reset-game').click();
  await page.locator('#settings-reset-confirm .confirm-dialog-confirm').click();
  await expect(page.locator('#settings-reset-confirm')).toHaveCount(0);

  // Returns to menu and reflects defaults
  await expect(page.locator('#menu-screen-enemy-level')).toContainText('Enemy Level: 1');
  await expect(page.locator('#menu-screen-prestige-tier')).toContainText('Prestige Tier: 0');
  await expect(page.locator('#upgrade-screen-bank')).toContainText('Bank: $0');

  const stored = await page.evaluate(() => localStorage.getItem('towerincremental:save'));
  const parsed = JSON.parse(stored!);
  expect(parsed.data.enemyLevel).toBe(1);
  expect(parsed.data.money).toBe(0);
  expect(parsed.data.prestigeTier).toBe(0);
  expect(parsed.data.upgrades).toEqual({ incomeRate: 0, towerMaxHp: 0 });
  expect(parsed.data.unlockedTroopTypes).toEqual(['base']);
});

test('Cancelling Decrease enemy level does nothing', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await seedSave(page, { enemyLevel: 5 });
  await page.reload();

  await openSettings(page);
  await page.locator('#settings-decrease-enemy-level').click();
  await expect(page.locator('#settings-decrease-enemy-confirm')).toBeVisible();
  await page.locator('#settings-decrease-enemy-confirm .confirm-dialog-cancel').click();
  await expect(page.locator('#settings-decrease-enemy-confirm')).toHaveCount(0);

  const stored = await page.evaluate(() => localStorage.getItem('towerincremental:save'));
  const parsed = JSON.parse(stored!);
  expect(parsed.data.enemyLevel).toBe(5);
});

test('Confirming Decrease enemy level decrements and persists', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await seedSave(page, { enemyLevel: 5 });
  await page.reload();

  await openSettings(page);
  await page.locator('#settings-decrease-enemy-level').click();
  await page.locator('#settings-decrease-enemy-confirm .confirm-dialog-confirm').click();
  await expect(page.locator('#settings-decrease-enemy-confirm')).toHaveCount(0);

  await expect(page.locator('#settings-decrease-enemy-level')).toContainText('current: 4');

  const stored = await page.evaluate(() => localStorage.getItem('towerincremental:save'));
  const parsed = JSON.parse(stored!);
  expect(parsed.data.enemyLevel).toBe(4);

  // Returning to menu reflects the change
  await page.locator('#settings-back').click();
  await expect(page.locator('#menu-screen-enemy-level')).toContainText('Enemy Level: 4');
});

test('Cancelling Decrease prestige does nothing', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await seedSave(page, { prestigeTier: 3 });
  await page.reload();

  await openSettings(page);
  await page.locator('#settings-decrease-prestige').click();
  await expect(page.locator('#settings-decrease-prestige-confirm')).toBeVisible();
  await page.locator('#settings-decrease-prestige-confirm .confirm-dialog-cancel').click();
  await expect(page.locator('#settings-decrease-prestige-confirm')).toHaveCount(0);

  const stored = await page.evaluate(() => localStorage.getItem('towerincremental:save'));
  const parsed = JSON.parse(stored!);
  expect(parsed.data.prestigeTier).toBe(3);
});

test('Confirming Decrease prestige decrements and persists', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await seedSave(page, { prestigeTier: 3 });
  await page.reload();

  await openSettings(page);
  await page.locator('#settings-decrease-prestige').click();
  await page.locator('#settings-decrease-prestige-confirm .confirm-dialog-confirm').click();
  await expect(page.locator('#settings-decrease-prestige-confirm')).toHaveCount(0);

  await expect(page.locator('#settings-decrease-prestige')).toContainText('current: 2');

  const stored = await page.evaluate(() => localStorage.getItem('towerincremental:save'));
  const parsed = JSON.parse(stored!);
  expect(parsed.data.prestigeTier).toBe(2);

  await page.locator('#settings-back').click();
  await expect(page.locator('#menu-screen-prestige-tier')).toContainText('Prestige Tier: 2');
});

test('State changes from settings persist across reload', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await seedSave(page, { enemyLevel: 5, prestigeTier: 3 });
  await page.reload();

  await openSettings(page);
  await page.locator('#settings-decrease-enemy-level').click();
  await page.locator('#settings-decrease-enemy-confirm .confirm-dialog-confirm').click();
  await page.locator('#settings-decrease-prestige').click();
  await page.locator('#settings-decrease-prestige-confirm .confirm-dialog-confirm').click();

  await page.reload();

  await expect(page.locator('#menu-screen-enemy-level')).toContainText('Enemy Level: 4');
  await expect(page.locator('#menu-screen-prestige-tier')).toContainText('Prestige Tier: 2');
});
