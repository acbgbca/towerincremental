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
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.sys.settings.active === true,
    { timeout: 15_000 },
  );
}

test('Player and enemy troops stop and attack when they meet', async ({ page }) => {
  await waitForMatch(page);

  await page.click('button:text("Spawn Player")');
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

  await page.click('button:text("Spawn Player")');
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

test('Survivor resumes walking after mutual kill clears the way', async ({ page }) => {
  await waitForMatch(page);

  // Two players vs one enemy: player A fights enemy (mutual kill), player B survives and walks
  await page.click('button:text("Spawn Player")');
  await page.click('button:text("Spawn Player")');
  await page.click('button:text("Spawn Enemy")');

  const combatDuration = (TROOP_BASE.hp / TROOP_BASE.damage) * TROOP_BASE.attackInterval;

  // Wait for the enemy to be destroyed
  await page.waitForFunction(
    () => {
      const scene = (window as GameWindow).__game__?.scene.getScene('Match');
      return (scene?.enemyTroops.length ?? 1) === 0;
    },
    { timeout: combatDuration + 5_000 },
  );

  // The surviving player troop (player B) should still be WALKING
  const survivorState = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.playerTroops[0]?.state,
  );

  expect(survivorState).toBe('WALKING');
});

test('Second player troop walks past while first is engaged', async ({ page }) => {
  await waitForMatch(page);

  await page.click('button:text("Spawn Player")');
  await page.click('button:text("Spawn Player")');
  await page.click('button:text("Spawn Enemy")');

  // Wait for the enemy to be engaged
  await page.waitForFunction(
    () => {
      const scene = (window as GameWindow).__game__?.scene.getScene('Match');
      return scene?.enemyTroops[0]?.state === 'ATTACKING';
    },
    { timeout: 15_000 },
  );

  // At least one player troop should still be WALKING
  const walkingCount = await page.evaluate(() => {
    const scene = (window as GameWindow).__game__?.scene.getScene('Match');
    return scene?.playerTroops.filter((t) => t.state === 'WALKING').length ?? 0;
  });

  expect(walkingCount).toBeGreaterThanOrEqual(1);
});
