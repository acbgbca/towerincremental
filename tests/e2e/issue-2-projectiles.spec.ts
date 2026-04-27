import { test, expect, type Page } from '@playwright/test';
import { TROOP_TYPES } from '../../src/config/troopTypes';

type TroopShape = {
  type: string;
  x: number;
  width: number;
  state: string;
  currentHp: number;
  damage: number;
  takeDamage: (n: number) => void;
};

type TowerShape = { x: number; width: number; currentHp: number };

type ProjectileShape = {
  attackerSide: 'player' | 'enemy';
  damage: number;
  expired: boolean;
};

type SceneShape = {
  sys: { settings: { active: boolean } };
  playerTroops: TroopShape[];
  enemyTroops: TroopShape[];
  playerTower: TowerShape;
  enemyTower: TowerShape;
  projectiles: ProjectileShape[];
  matchState: { troopDamageDealt: number; towerDamageDealt: number; money: number };
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

async function setUnlocks(page: Page, unlocks: string[]) {
  await page.evaluate((u) => {
    localStorage.setItem(
      'towerincremental:save',
      JSON.stringify({
        version: 4,
        data: {
          enemyLevel: 1,
          money: 0,
          upgrades: { incomeRate: 0, towerMaxHp: 0 },
          prestigeTier: 0,
          unlockedTroopTypes: u,
        },
      }),
    );
  }, unlocks);
}

test('Firing creates projectiles', async ({ page }) => {
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

  // Once both are attacking, a projectile should appear on the scene shortly.
  await page.waitForFunction(
    () => {
      const scene = (window as GameWindow).__game__?.scene.getScene('Match');
      return (scene?.projectiles?.length ?? 0) >= 1;
    },
    { timeout: 5_000 },
  );

  const count = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.projectiles.length ?? 0,
  );
  expect(count).toBeGreaterThanOrEqual(1);
});

test('Projectiles deal damage on impact', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForMatch(page);

  await page.evaluate(() => {
    const scene = (window as GameWindow).__game__?.scene.getScene('Match');
    scene?.spawnTroop('player', 'base');
    scene?.spawnTroop('enemy', 'base');
  });

  // Wait until at least one projectile is in flight.
  await page.waitForFunction(
    () => {
      const scene = (window as GameWindow).__game__?.scene.getScene('Match');
      return (scene?.projectiles?.length ?? 0) >= 1;
    },
    { timeout: 20_000 },
  );

  // Snapshot enemy HP and projectile count before impact resolves.
  const before = await page.evaluate(() => {
    const scene = (window as GameWindow).__game__?.scene.getScene('Match');
    return {
      enemyHp: scene!.enemyTroops[0].currentHp,
      enemyMax: scene!.enemyTroops[0].currentHp,
      playerDamage: scene!.playerTroops[0].damage,
    };
  });

  // Wait for the enemy HP to drop, indicating an impact landed.
  await page.waitForFunction(
    (initialHp) => {
      const scene = (window as GameWindow).__game__?.scene.getScene('Match');
      return (scene?.enemyTroops[0]?.currentHp ?? initialHp) < initialHp;
    },
    before.enemyHp,
    { timeout: 10_000 },
  );

  const after = await page.evaluate(() => {
    const scene = (window as GameWindow).__game__?.scene.getScene('Match');
    return { enemyHp: scene!.enemyTroops[0].currentHp };
  });

  // Damage equal to a multiple of player base damage (a single impact's worth).
  const dropped = before.enemyHp - after.enemyHp;
  expect(dropped % before.playerDamage).toBe(0);
  expect(dropped).toBeGreaterThanOrEqual(before.playerDamage);
});

test('Projectile cancels harmlessly when target dies in flight', async ({ page }) => {
  await page.goto('/?test');
  await setUnlocks(page, ['base', 'archer']);
  await page.reload();
  await waitForMatch(page);

  await page.evaluate(() => {
    const scene = (window as GameWindow).__game__?.scene.getScene('Match');
    scene?.spawnTroop('player', 'archer');
    scene?.spawnTroop('enemy', 'base');
  });

  // Wait for a projectile to be in flight.
  await page.waitForFunction(
    () => {
      const scene = (window as GameWindow).__game__?.scene.getScene('Match');
      return (scene?.projectiles?.length ?? 0) >= 1;
    },
    { timeout: 20_000 },
  );

  // Force-kill the enemy while a projectile is mid-flight.
  await page.evaluate(() => {
    const scene = (window as GameWindow).__game__?.scene.getScene('Match');
    scene!.enemyTroops[0].takeDamage(100000);
  });

  // The in-flight projectile must be removed (drops out of the array)
  // and the player must return to WALKING — without crashing.
  await page.waitForFunction(
    () => {
      const scene = (window as GameWindow).__game__?.scene.getScene('Match');
      return (scene?.projectiles?.length ?? 0) === 0;
    },
    { timeout: 5_000 },
  );

  const playerState = await page.evaluate(() => {
    const scene = (window as GameWindow).__game__?.scene.getScene('Match');
    return scene!.playerTroops[0]?.state;
  });
  expect(playerState).toBe('WALKING');
});

test('Reward attribution still increments troopDamageDealt and towerDamageDealt', async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForMatch(page);

  // Player base vs enemy base — wait for the player's projectiles to chip the enemy.
  await page.evaluate(() => {
    const scene = (window as GameWindow).__game__?.scene.getScene('Match');
    scene?.spawnTroop('player', 'base');
    scene?.spawnTroop('enemy', 'base');
  });

  await page.waitForFunction(
    () => {
      const scene = (window as GameWindow).__game__?.scene.getScene('Match');
      return (scene?.matchState.troopDamageDealt ?? 0) > 0;
    },
    { timeout: 20_000 },
  );

  const troopDamage = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.matchState.troopDamageDealt ?? 0,
  );
  expect(troopDamage).toBeGreaterThanOrEqual(TROOP_TYPES.base.damage);

  // Now reset and run a player vs enemy-tower scenario.
  await page.evaluate(() => {
    const scene = (window as GameWindow).__game__?.scene.getScene('Match');
    // Kill the enemy troop so player walks to the tower, then reset damage counters.
    scene!.enemyTroops.forEach((t) => t.takeDamage(100000));
    scene!.matchState.towerDamageDealt = 0;
    scene?.spawnTroop('player', 'base');
  });

  await page.waitForFunction(
    () => {
      const scene = (window as GameWindow).__game__?.scene.getScene('Match');
      return (scene?.matchState.towerDamageDealt ?? 0) > 0;
    },
    { timeout: 30_000 },
  );

  const towerDamage = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.matchState.towerDamageDealt ?? 0,
  );
  expect(towerDamage).toBeGreaterThanOrEqual(TROOP_TYPES.base.damage);
});
