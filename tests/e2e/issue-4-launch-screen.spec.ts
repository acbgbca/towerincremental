import { test, expect, type Page } from '@playwright/test';

type SceneShape = {
  sys: { settings: { active: boolean } };
};

type GameWindow = Window & {
  __game__?: { scene: { getScene: (key: string) => SceneShape | null } };
};

async function clearSave(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
}

test('Launch screen is visible on first load (no ?test)', async ({ page }) => {
  await clearSave(page);
  await page.reload();

  await expect(page.locator('#match-result-overlay')).toBeVisible();
  await expect(page.locator('#menu-screen-start')).toBeVisible();
  await expect(page.locator('#menu-screen-start')).toHaveText('Start Game');
});

test('Launch screen does not show match-result header in launch mode', async ({ page }) => {
  await clearSave(page);
  await page.reload();

  await expect(page.locator('#match-result-overlay')).toBeVisible();
  // The match-result message and reward elements should not be visible in launch mode
  const messageVisible = await page.locator('#match-result-overlay > p').first().isVisible();
  expect(messageVisible).toBe(false);
  await expect(page.locator('#match-result-reward')).toBeHidden();
});

test('Launch screen shows persistent state: Bank, Enemy Level, Prestige Tier', async ({ page }) => {
  await clearSave(page);
  await page.reload();

  await expect(page.locator('#upgrade-screen-bank')).toBeVisible();
  await expect(page.locator('#upgrade-screen-bank')).toContainText('Bank: $');

  await expect(page.locator('#menu-screen-enemy-level')).toBeVisible();
  await expect(page.locator('#menu-screen-enemy-level')).toContainText('Enemy Level: 1');

  await expect(page.locator('#menu-screen-prestige-tier')).toBeVisible();
  await expect(page.locator('#menu-screen-prestige-tier')).toContainText('Prestige Tier: 0');
});

test('Clicking Start Game hides the launch screen and starts the match', async ({ page }) => {
  await clearSave(page);
  await page.reload();

  await expect(page.locator('#menu-screen-start')).toBeVisible();
  await page.locator('#menu-screen-start').click();

  await expect(page.locator('#match-result-overlay')).toBeHidden();
  await expect(page.locator('#hud')).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();

  // Match scene becomes active
  await page.waitForFunction(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.sys.settings.active === true,
    { timeout: 10_000 },
  );
});

test('Launch screen reappears after page reload (every load behaviour)', async ({ page }) => {
  await clearSave(page);
  await page.reload();

  await expect(page.locator('#menu-screen-start')).toBeVisible();
  await page.locator('#menu-screen-start').click();
  await expect(page.locator('#match-result-overlay')).toBeHidden();

  await page.reload();
  await expect(page.locator('#match-result-overlay')).toBeVisible();
  await expect(page.locator('#menu-screen-start')).toBeVisible();
});

test('Launch screen reflects persisted enemy level and prestige tier', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem(
      'towerincremental:save',
      JSON.stringify({
        version: 4,
        data: {
          enemyLevel: 5,
          money: 123,
          upgrades: { incomeRate: 0, towerMaxHp: 0 },
          prestigeTier: 2,
          unlockedTroopTypes: ['base'],
        },
      }),
    );
  });
  await page.reload();

  await expect(page.locator('#menu-screen-enemy-level')).toContainText('Enemy Level: 5');
  await expect(page.locator('#menu-screen-prestige-tier')).toContainText('Prestige Tier: 2');
  await expect(page.locator('#upgrade-screen-bank')).toContainText('Bank: $123');
});

test('?test bypasses the launch screen', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // Match becomes active without any user click
  await page.waitForFunction(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.sys.settings.active === true,
    { timeout: 10_000 },
  );
  // Launch-mode start button should not be visible
  await expect(page.locator('#menu-screen-start')).toBeHidden();
});
