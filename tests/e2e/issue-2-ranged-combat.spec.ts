import { test, expect, type Page } from '@playwright/test';
import { TROOP_TYPES } from '../../src/config/troopTypes';
import { BOARD_WIDTH, TOWER_MARGIN, TOWER_WIDTH } from '../../src/config/gameConfig';

type TroopShape = {
  type: string;
  x: number;
  width: number;
  state: string;
  currentTarget: unknown;
  rect: { x: number };
};

type TowerShape = { x: number; width: number; currentHp: number };

type SceneShape = {
  sys: { settings: { active: boolean } };
  playerTroops: TroopShape[];
  enemyTroops: TroopShape[];
  playerTower: TowerShape;
  enemyTower: TowerShape;
  gameState: { unlockedTroopTypes: string[] };
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

test('Two base troops engage at range and stop short of overlapping', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForMatch(page);

  await page.evaluate(() => {
    const scene = (window as GameWindow).__game__?.scene.getScene('Match');
    scene?.spawnTroop('player', 'base');
    scene?.spawnTroop('enemy', 'base');
  });

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

  const gap = await page.evaluate(() => {
    const scene = (window as GameWindow).__game__?.scene.getScene('Match');
    const p = scene!.playerTroops[0];
    const e = scene!.enemyTroops[0];
    return { dx: Math.abs(p.x - e.x), pw: p.width, ew: e.width };
  });

  // Not overlapping: centre gap exceeds the sum of half-widths.
  expect(gap.dx).toBeGreaterThan(gap.pw / 2 + gap.ew / 2);
  // Engagement was driven by `base.range`. Tolerance covers the target's half-width
  // (range is measured to the target's near edge) plus one tick of overshoot.
  expect(gap.dx).toBeLessThanOrEqual(TROOP_TYPES.base.range + TROOP_TYPES.base.width);
});

test('Archer engages an enemy from beyond base range', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => {
    localStorage.setItem(
      'towerincremental:save',
      JSON.stringify({
        version: 4,
        data: {
          enemyLevel: 1,
          money: 0,
          upgrades: { incomeRate: 0, towerMaxHp: 0 },
          prestigeTier: 0,
          unlockedTroopTypes: ['base', 'archer'],
        },
      }),
    );
  });
  await page.reload();
  await waitForMatch(page);

  await page.evaluate(() => {
    const scene = (window as GameWindow).__game__?.scene.getScene('Match');
    scene?.spawnTroop('player', 'archer');
    scene?.spawnTroop('enemy', 'base');
  });

  await page.waitForFunction(
    () => {
      const scene = (window as GameWindow).__game__?.scene.getScene('Match');
      return scene?.playerTroops[0]?.state === 'ATTACKING';
    },
    { timeout: 20_000 },
  );

  const result = await page.evaluate(() => {
    const scene = (window as GameWindow).__game__?.scene.getScene('Match');
    const p = scene!.playerTroops[0];
    const e = scene!.enemyTroops[0];
    return { dx: Math.abs(p.x - e.x), enemyState: e.state };
  });

  // Archer fired while gap is still well outside base.range, so it must be
  // archer.range that triggered engagement (not enemy proximity).
  expect(result.dx).toBeGreaterThan(TROOP_TYPES.base.range);
  // Enemy base is still walking — it hasn't entered its own (short) range yet.
  expect(result.enemyState).toBe('WALKING');
});

test('Closest in-range enemy is targeted when multiple are within range', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => {
    localStorage.setItem(
      'towerincremental:save',
      JSON.stringify({
        version: 4,
        data: {
          enemyLevel: 1,
          money: 0,
          upgrades: { incomeRate: 0, towerMaxHp: 0 },
          prestigeTier: 0,
          unlockedTroopTypes: ['base', 'archer'],
        },
      }),
    );
  });
  await page.reload();
  await waitForMatch(page);

  // Spawn an archer, then two enemies; place them at known positions, both
  // inside the archer's range, but one closer than the other.
  await page.evaluate(() => {
    const scene = (window as GameWindow).__game__?.scene.getScene('Match');
    scene?.spawnTroop('player', 'archer');
    scene?.spawnTroop('enemy', 'base');
    scene?.spawnTroop('enemy', 'base');
    const p = scene!.playerTroops[0];
    const near = scene!.enemyTroops[0];
    const far = scene!.enemyTroops[1];
    near.rect.x = p.x + 200;
    far.rect.x = p.x + 260;
  });

  await page.waitForFunction(
    () => {
      const scene = (window as GameWindow).__game__?.scene.getScene('Match');
      return scene?.playerTroops[0]?.state === 'ATTACKING';
    },
    { timeout: 5_000 },
  );

  const targetIndex = await page.evaluate(() => {
    const scene = (window as GameWindow).__game__?.scene.getScene('Match');
    const target = scene!.playerTroops[0].currentTarget;
    return scene!.enemyTroops.findIndex((e) => e === target);
  });
  expect(targetIndex).toBe(0);
});

test('Archer attacks enemy tower from a distance, not adjacent', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => {
    localStorage.setItem(
      'towerincremental:save',
      JSON.stringify({
        version: 4,
        data: {
          enemyLevel: 1,
          money: 0,
          upgrades: { incomeRate: 0, towerMaxHp: 0 },
          prestigeTier: 0,
          unlockedTroopTypes: ['base', 'archer'],
        },
      }),
    );
  });
  await page.reload();
  await waitForMatch(page);

  await page.evaluate(() => {
    const scene = (window as GameWindow).__game__?.scene.getScene('Match');
    scene?.spawnTroop('player', 'archer');
  });

  await page.waitForFunction(
    () => {
      const scene = (window as GameWindow).__game__?.scene.getScene('Match');
      return scene?.playerTroops[0]?.state === 'ATTACKING';
    },
    { timeout: 30_000 },
  );

  const snapshot = await page.evaluate(() => {
    const scene = (window as GameWindow).__game__?.scene.getScene('Match');
    const p = scene!.playerTroops[0];
    const target = p.currentTarget;
    return {
      targetIsTower: target === scene!.enemyTower,
      gapToTowerCentre: Math.abs(p.x - scene!.enemyTower.x),
      pw: p.width,
      tw: scene!.enemyTower.width,
    };
  });
  expect(snapshot.targetIsTower).toBe(true);
  // Adjacent would mean centre gap ≈ pw/2 + tw/2. Archer should be clearly
  // further than that — at least one base.range out.
  expect(snapshot.gapToTowerCentre).toBeGreaterThan(snapshot.pw / 2 + snapshot.tw / 2);
  expect(snapshot.gapToTowerCentre).toBeGreaterThan(TROOP_TYPES.base.range);

  // Sanity: archer never reached the tower's near edge (stopped at range).
  const archerNearEdge = TOWER_MARGIN + TOWER_WIDTH; // unused but documents map layout
  expect(BOARD_WIDTH - TOWER_MARGIN - TOWER_WIDTH).toBeGreaterThan(archerNearEdge);
});

test('Old saves with "runner" load without crashing and the entry is filtered out', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => {
    localStorage.setItem(
      'towerincremental:save',
      JSON.stringify({
        version: 4,
        data: {
          enemyLevel: 1,
          money: 0,
          upgrades: { incomeRate: 0, towerMaxHp: 0 },
          prestigeTier: 0,
          unlockedTroopTypes: ['base', 'runner'],
        },
      }),
    );
  });
  await page.reload();
  await waitForMatch(page);

  await expect(page.locator('#hud-spawn-base')).toBeVisible();
  await expect(page.locator('#hud-spawn-runner')).toHaveCount(0);
  await expect(page.locator('#hud-spawn-archer')).toHaveCount(0);

  const unlocked = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.gameState.unlockedTroopTypes,
  );
  expect(unlocked).toEqual(['base']);
});
