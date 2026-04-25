import { test, expect, type Page } from '@playwright/test';
import { TOWER, BOARD_WIDTH, TOWER_MARGIN, TOWER_WIDTH, TROOP_BASE, REWARD_PER_KILL, REWARD_PER_TOWER_DAMAGE } from '../../src/config/gameConfig';

type SceneShape = {
  sys: { settings: { active: boolean } };
  enemyTower: { currentHp: number };
  playerTower: { currentHp: number };
  gameState: { enemyLevel: number; money: number };
  matchState: { troopsDefeated: number; towerDamageDealt: number };
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

test('Persistent money starts at 0 on a fresh save', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForMatch(page);

  await expect(page.locator('#hud-bank')).toHaveText('Bank: $0');
});

test('Winning a match shows reward in overlay and updates bank in HUD', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForMatch(page);

  await triggerPlayerWin(page);

  const matchState = await page.evaluate(() => {
    const scene = (window as GameWindow).__game__?.scene.getScene('Match');
    return scene?.matchState;
  });

  const expectedReward = Math.floor(
    (matchState?.troopsDefeated ?? 0) * REWARD_PER_KILL +
    (matchState?.towerDamageDealt ?? 0) * REWARD_PER_TOWER_DAMAGE,
  );

  await expect(page.locator('#match-result-reward')).toHaveText(`Earned: $${expectedReward}`);
  await expect(page.locator('#hud-bank')).toHaveText(`Bank: $${expectedReward}`);
});

test('Persistent money is preserved after reload', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForMatch(page);

  await triggerPlayerWin(page);

  // Wait for overlay to confirm match ended and gameState.money is updated
  await expect(page.locator('#match-result-overlay')).toBeVisible();
  const rewardText = await page.locator('#match-result-reward').textContent();
  const reward = parseInt(rewardText?.replace('Earned: $', '') ?? '0', 10);

  await page.reload();
  await waitForMatch(page);

  await expect(page.locator('#hud-bank')).toHaveText(`Bank: $${reward}`);
});

test('Losing earns 0 reward when no damage dealt', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForMatch(page);

  // Spawn many enemy troops to destroy player tower quickly without player dealing damage
  for (let i = 0; i < 15; i++) {
    await page.evaluate(() =>
      (window as GameWindow).__game__?.scene.getScene('Match')?.spawnTroop('enemy', 'base'),
    );
  }

  await page.waitForFunction(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.playerTower.currentHp === 0,
    { timeout: 30_000 },
  );

  await expect(page.locator('#match-result-reward')).toHaveText('Earned: $0');
});

test('Migration: v1 save loads correctly with money: 0', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => {
    localStorage.setItem('towerincremental:save', JSON.stringify({ version: 1, data: { enemyLevel: 3 } }));
  });
  await page.reload();
  await waitForMatch(page);

  const state = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.gameState,
  );

  expect(state?.enemyLevel).toBe(3);
  expect(state?.money).toBe(0);
  await expect(page.locator('#hud-bank')).toHaveText('Bank: $0');
  await expect(page.locator('#hud-enemy-level')).toHaveText('Enemy Level: 3');
});
