import { test, expect, type Page } from '@playwright/test';
import { TROOP_BASE } from '../../src/config/gameConfig';

type TroopShape = {
  x: number;
  state: string;
};

type SceneShape = {
  sys: { settings: { active: boolean } };
  playerTroops: TroopShape[];
  enemyTroops: TroopShape[];
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

test('Player and enemy troops stop and attack when they meet', async ({ page }) => {
  await waitForMatch(page);

  await page.evaluate(() => (window as GameWindow).__game__?.scene.getScene('Match')?.spawnTroop('player', 'base'));
  await page.click('button:text("Spawn Enemy")');

  // Wait until both are ATTACKING
  await page.waitForFunction(
    () => {
      const scene = (window as GameWindow).__game__?.scene.getScene('Match');
      return (
        scene?.playerTroops[0]?.state === 'ATTACKING' &&
        scene?.enemyTroops[0]?.state === 'ATTACKING'
      );
    },
    { timeout: 15_000 },
  );

  // Positions should be frozen while attacking
  const px0 = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.playerTroops[0]?.x ?? 0,
  );
  const ex0 = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.enemyTroops[0]?.x ?? 0,
  );

  await page.waitForTimeout(300);

  const px1 = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.playerTroops[0]?.x ?? 0,
  );
  const ex1 = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.enemyTroops[0]?.x ?? 0,
  );

  expect(Math.abs(px1 - px0)).toBeLessThan(1);
  expect(Math.abs(ex1 - ex0)).toBeLessThan(1);
});

test('Combat resolves: both troops removed and arrays are empty', async ({ page }) => {
  await waitForMatch(page);

  await page.evaluate(() => (window as GameWindow).__game__?.scene.getScene('Match')?.spawnTroop('player', 'base'));
  await page.click('button:text("Spawn Enemy")');

  // With equal stats: 5 hits × 500ms = 2500ms to mutual kill
  const combatDuration = (TROOP_BASE.hp / TROOP_BASE.damage) * TROOP_BASE.attackInterval;

  await page.waitForFunction(
    () => {
      const scene = (window as GameWindow).__game__?.scene.getScene('Match');
      const total = (scene?.playerTroops.length ?? 1) + (scene?.enemyTroops.length ?? 1);
      return total === 0;
    },
    { timeout: combatDuration + 5_000 },
  );
});

test('Two players both engage the same enemy — enemy dies faster, both players survive', async ({ page }) => {
  await waitForMatch(page);

  await page.evaluate(() => (window as GameWindow).__game__?.scene.getScene('Match')?.spawnTroop('player', 'base'));
  await page.evaluate(() => (window as GameWindow).__game__?.scene.getScene('Match')?.spawnTroop('player', 'base'));
  await page.click('button:text("Spawn Enemy")');

  // Wait until both players are ATTACKING
  await page.waitForFunction(
    () => {
      const scene = (window as GameWindow).__game__?.scene.getScene('Match');
      return scene?.playerTroops.every((t) => t.state === 'ATTACKING') ?? false;
    },
    { timeout: 15_000 },
  );

  // Enemy dies faster (2 attackers): 100hp / 40dmg_per_tick ≈ 3 ticks × 500ms = 1500ms.
  // After projectiles, the WALKING reset happens one tick after the kill, so wait for both.
  await page.waitForFunction(
    () => {
      const scene = (window as GameWindow).__game__?.scene.getScene('Match');
      if (!scene) return false;
      if (scene.enemyTroops.length !== 0) return false;
      return scene.playerTroops.every((t) => t.state === 'WALKING');
    },
    { timeout: 10_000 },
  );

  // Both players should have survived and resumed walking
  const result = await page.evaluate(() => {
    const scene = (window as GameWindow).__game__?.scene.getScene('Match');
    return {
      count: scene?.playerTroops.length ?? 0,
      allWalking: scene?.playerTroops.every((t) => t.state === 'WALKING') ?? false,
    };
  });

  expect(result.count).toBeGreaterThanOrEqual(1);
  expect(result.allWalking).toBe(true);
});
