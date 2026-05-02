import { test, expect, type Page } from '@playwright/test';
import { LANE_BAND } from '../../src/config/gameConfig';

type TroopShape = {
  x: number;
  y: number;
  state: string;
  type: string;
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

test('Five player troops form a wall — distinct Y positions, all inside the lane band', async ({ page }) => {
  await waitForMatch(page);

  // Spawn one enemy first, then 5 player troops in quick succession
  await page.click('button:text("Spawn Enemy")');

  for (let i = 0; i < 5; i++) {
    await page.evaluate(() =>
      (window as GameWindow).__game__?.scene.getScene('Match')?.spawnTroop('player', 'base'),
    );
  }

  // Wait until at least one player troop is attacking the enemy
  await page.waitForFunction(
    () => {
      const scene = (window as GameWindow).__game__?.scene.getScene('Match');
      if (!scene) return false;
      if (scene.playerTroops.length < 5) return false;
      return scene.playerTroops.some((t) => t.state === 'ATTACKING');
    },
    { timeout: 20_000 },
  );

  const ys = await page.evaluate(() => {
    const scene = (window as GameWindow).__game__?.scene.getScene('Match');
    return scene?.playerTroops.map((t) => t.y) ?? [];
  });

  expect(ys).toHaveLength(5);

  // All five Y positions are inside the lane band
  const minY = LANE_BAND.centerY - LANE_BAND.height / 2;
  const maxY = LANE_BAND.centerY + LANE_BAND.height / 2;
  for (const y of ys) {
    expect(y).toBeGreaterThanOrEqual(minY - 1);
    expect(y).toBeLessThanOrEqual(maxY + 1);
  }

  // No two troops within ~5 px of each other in Y
  for (let i = 0; i < ys.length; i++) {
    for (let j = i + 1; j < ys.length; j++) {
      expect(Math.abs(ys[i]! - ys[j]!)).toBeGreaterThan(5);
    }
  }
});

test('A single player troop with no friends does not jitter sideways', async ({ page }) => {
  await waitForMatch(page);

  await page.evaluate(() =>
    (window as GameWindow).__game__?.scene.getScene('Match')?.spawnTroop('player', 'base'),
  );

  const y0 = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.playerTroops[0]?.y ?? 0,
  );

  await page.waitForTimeout(1000);

  const y1 = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.playerTroops[0]?.y ?? 0,
  );

  expect(Math.abs(y1 - y0)).toBeLessThan(2);
});

test('Archer steps around base friend and ends up offset in Y when both engage', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await seedSave(page, { unlockedTroopTypes: ['base', 'archer'] });
  await page.reload();
  await waitForMatch(page);

  // Enemy at far end first
  await page.click('button:text("Spawn Enemy")');

  // Spawn base then archer close together
  await page.evaluate(() =>
    (window as GameWindow).__game__?.scene.getScene('Match')?.spawnTroop('player', 'base'),
  );
  await page.evaluate(() =>
    (window as GameWindow).__game__?.scene.getScene('Match')?.spawnTroop('player', 'archer'),
  );

  // Wait until archer is ATTACKING (it has the longer range, so it engages first)
  await page.waitForFunction(
    () => {
      const scene = (window as GameWindow).__game__?.scene.getScene('Match');
      if (!scene) return false;
      const archer = scene.playerTroops.find((t) => t.type === 'archer');
      return archer?.state === 'ATTACKING';
    },
    { timeout: 20_000 },
  );

  const positions = await page.evaluate(() => {
    const scene = (window as GameWindow).__game__?.scene.getScene('Match');
    const archer = scene?.playerTroops.find((t) => t.type === 'archer');
    const base = scene?.playerTroops.find((t) => t.type === 'base');
    return { archerY: archer?.y, baseY: base?.y };
  });

  expect(positions.archerY).toBeDefined();
  expect(positions.baseY).toBeDefined();
  expect(Math.abs(positions.archerY! - positions.baseY!)).toBeGreaterThan(5);
});
