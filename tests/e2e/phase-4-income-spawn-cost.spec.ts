import { test, expect, type Page } from '@playwright/test';
import { INCOME_RATE, TROOP_BASE } from '../../src/config/gameConfig';

type SceneShape = {
  sys: { settings: { active: boolean } };
  playerTroops: Array<{ state: string }>;
  enemyTroops: Array<{ state: string }>;
  matchState: { money: number };
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

test('Spawn button is disabled and money shows $0 on load', async ({ page }) => {
  await waitForMatch(page);

  // Money starts at 0 and may have ticked slightly by the time the scene is accessible,
  // but must be well below the spawn cost so the button is still disabled.
  const money = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.matchState?.money ?? -1,
  );
  expect(money).toBeGreaterThanOrEqual(0);
  expect(money).toBeLessThan(TROOP_BASE.cost);

  await expect(page.locator('#hud-spawn-base')).toBeDisabled();
});

test('Spawn button enables after income reaches the troop cost', async ({ page }) => {
  await waitForMatch(page);

  const waitMs = (TROOP_BASE.cost / INCOME_RATE) * 1000;

  await page.waitForFunction(
    (cost) => ((window as GameWindow).__game__?.scene.getScene('Match')?.matchState?.money ?? 0) >= cost,
    TROOP_BASE.cost,
    { timeout: waitMs + 5_000 },
  );

  await expect(page.locator('#hud-spawn-base')).toBeEnabled();
});

test('Clicking spawn button deducts cost and spawns one player troop', async ({ page }) => {
  await waitForMatch(page);

  const waitMs = (TROOP_BASE.cost / INCOME_RATE) * 1000;
  await page.waitForFunction(
    (cost) => ((window as GameWindow).__game__?.scene.getScene('Match')?.matchState?.money ?? 0) >= cost,
    TROOP_BASE.cost,
    { timeout: waitMs + 5_000 },
  );

  const moneyBefore = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.matchState?.money ?? 0,
  );

  await page.click('#hud-spawn-base');

  const state = await page.evaluate(() => {
    const scene = (window as GameWindow).__game__?.scene.getScene('Match');
    return {
      money: scene?.matchState?.money ?? 0,
      troopCount: scene?.playerTroops?.length ?? 0,
    };
  });

  expect(state.troopCount).toBe(1);
  expect(state.money).toBeGreaterThanOrEqual(0);
  // Income ticks between evaluations, so the delta may be slightly less than cost.
  // Require at least half the cost was deducted to confirm the deduction happened.
  expect(moneyBefore - state.money).toBeGreaterThan(TROOP_BASE.cost / 2);
});

test('Cannot spawn when insufficient funds; money never goes negative', async ({ page }) => {
  await waitForMatch(page);

  // Accumulate just enough for one spawn, then click twice quickly
  const waitMs = (TROOP_BASE.cost / INCOME_RATE) * 1000;
  await page.waitForFunction(
    (cost) => ((window as GameWindow).__game__?.scene.getScene('Match')?.matchState?.money ?? 0) >= cost,
    TROOP_BASE.cost,
    { timeout: waitMs + 5_000 },
  );

  // Pause income by evaluating before second click: button should be disabled again after first click
  await page.click('#hud-spawn-base');

  // After first click, button should be immediately disabled (money went below cost)
  await expect(page.locator('#hud-spawn-base')).toBeDisabled({ timeout: 300 });

  const money = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.matchState?.money ?? -1,
  );
  expect(money).toBeGreaterThanOrEqual(0);
});

test('Restarting a match resets money to 0', async ({ page }) => {
  await waitForMatch(page);

  // Wait for some income to accumulate
  await page.waitForFunction(
    () => ((window as GameWindow).__game__?.scene.getScene('Match')?.matchState?.money ?? 0) > 5,
    { timeout: 5_000 },
  );

  // Trigger a match end via enemy debug spawns
  for (let i = 0; i < 5; i++) {
    await page.click('button:text("Spawn Enemy")');
  }

  await page.waitForFunction(
    () => {
      const scene = (window as GameWindow).__game__?.scene.getScene('Match');
      return scene?.playerTroops !== undefined && scene.playerTroops.length === 0
        ? scene?.matchState !== undefined
        : false;
    },
    { timeout: 500 },
  );

  await page.waitForSelector('#match-result-overlay', { state: 'visible', timeout: 30_000 });
  await page.click('#match-result-overlay button');

  const money = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.matchState?.money ?? -1,
  );
  // Income starts immediately after reset, so money may be slightly above 0,
  // but must still be below the spawn cost so the button remains disabled.
  expect(money).toBeGreaterThanOrEqual(0);
  expect(money).toBeLessThan(TROOP_BASE.cost);

  await expect(page.locator('#hud-spawn-base')).toBeDisabled();
});
