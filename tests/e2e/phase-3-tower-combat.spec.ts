import { test, expect, type Page } from '@playwright/test';
import { TOWER, TOWER_WIDTH, TOWER_MARGIN, BOARD_WIDTH } from '../../src/config/gameConfig';

type TowerShape = {
  currentHp: number;
  maxHp: number;
};

type SceneShape = {
  sys: { settings: { active: boolean } };
  playerTroops: Array<{ state: string }>;
  enemyTroops: Array<{ state: string }>;
  playerTower: TowerShape;
  enemyTower: TowerShape;
  spawnTroop: (side: string, type: string) => void;
};

type GameWindow = Window & {
  __game__?: { scene: { getScene: (key: string) => SceneShape | null } };
};

async function waitForMatch(page: Page) {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.sys.settings.active === true,
    { timeout: 15_000 },
  );
}

test('Player troop reaches enemy tower and destroys it — "You won" overlay appears', async ({ page }) => {
  await waitForMatch(page);

  // Spawn multiple player troops to kill the tower within test timeout
  for (let i = 0; i < 5; i++) {
    await page.click('button:text("Spawn Player")');
  }

  // Wait for enemy tower HP to hit 0
  const hitsToKill = TOWER.maxHp / 20; // 25 hits per troop
  const timePerHit = 500;
  const walkTime = ((BOARD_WIDTH - TOWER_MARGIN - TOWER_WIDTH) - (TOWER_MARGIN + TOWER_WIDTH)) / 80 * 1000;
  const estimatedMs = walkTime + hitsToKill * timePerHit;

  await page.waitForFunction(
    () => {
      const scene = (window as GameWindow).__game__?.scene.getScene('Match');
      return scene?.enemyTower?.currentHp === 0;
    },
    { timeout: estimatedMs + 10_000 },
  );

  // Overlay should be visible with "You won!"
  await expect(page.locator('#match-result-overlay')).toBeVisible();
  await expect(page.locator('#match-result-overlay p')).toHaveText('You won!');
});

test('Restart resets both towers to full HP and clears all troops', async ({ page }) => {
  await waitForMatch(page);

  // Kill the enemy tower
  for (let i = 0; i < 5; i++) {
    await page.click('button:text("Spawn Player")');
  }

  await page.waitForFunction(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.enemyTower?.currentHp === 0,
    { timeout: 30_000 },
  );

  await page.click('#match-result-overlay button');

  // Overlay should be hidden
  await expect(page.locator('#match-result-overlay')).toBeHidden();

  // Both towers back at full HP
  const state = await page.evaluate(() => {
    const scene = (window as GameWindow).__game__?.scene.getScene('Match');
    return {
      playerHp: scene?.playerTower?.currentHp,
      enemyHp: scene?.enemyTower?.currentHp,
      playerTroops: scene?.playerTroops?.length ?? -1,
      enemyTroops: scene?.enemyTroops?.length ?? -1,
    };
  });

  expect(state.playerHp).toBe(TOWER.maxHp);
  expect(state.enemyHp).toBe(TOWER.maxHp);
  expect(state.playerTroops).toBe(0);
  expect(state.enemyTroops).toBe(0);

  // Spawn buttons should work after restart
  await page.click('button:text("Spawn Player")');
  const count = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.playerTroops?.length ?? 0,
  );
  expect(count).toBe(1);
});

test('Enemy troop kills player tower — "You lost" overlay appears', async ({ page }) => {
  await waitForMatch(page);

  for (let i = 0; i < 5; i++) {
    await page.click('button:text("Spawn Enemy")');
  }

  await page.waitForFunction(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.playerTower?.currentHp === 0,
    { timeout: 30_000 },
  );

  await expect(page.locator('#match-result-overlay')).toBeVisible();
  await expect(page.locator('#match-result-overlay p')).toHaveText('You lost!');
});

test('Troop engaged with an enemy troop does not damage the tower', async ({ page }) => {
  await waitForMatch(page);

  await page.click('button:text("Spawn Player")');
  await page.click('button:text("Spawn Enemy")');

  // Wait until both are fighting each other
  await page.waitForFunction(
    () => {
      const scene = (window as GameWindow).__game__?.scene.getScene('Match');
      return (
        scene?.playerTroops[0]?.state === 'ATTACKING' &&
        scene?.enemyTroops[0]?.state === 'ATTACKING'
      );
    },
    { timeout: 20_000 },
  );

  // Capture tower HPs while the troops fight
  const hpBefore = await page.evaluate(() => {
    const scene = (window as GameWindow).__game__?.scene.getScene('Match');
    return {
      player: scene?.playerTower?.currentHp,
      enemy: scene?.enemyTower?.currentHp,
    };
  });

  // Wait one full attack interval and check towers are still untouched
  await page.waitForTimeout(600);

  const hpAfter = await page.evaluate(() => {
    const scene = (window as GameWindow).__game__?.scene.getScene('Match');
    return {
      player: scene?.playerTower?.currentHp,
      enemy: scene?.enemyTower?.currentHp,
    };
  });

  expect(hpAfter.player).toBe(hpBefore.player);
  expect(hpAfter.enemy).toBe(hpBefore.enemy);
});
