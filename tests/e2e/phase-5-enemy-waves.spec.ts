import { test, expect, type Page } from '@playwright/test';
import { LEVEL_1_WAVES } from '../../src/config/enemyWaves';

type WaveSystemShape = {
  state: 'BREATHER' | 'SPAWNING' | 'DONE';
  currentWaveIndex: number;
  nextWaveInMs: number;
  troopsRemainingInWave: number;
  totalWaves: number;
};

type SceneShape = {
  sys: { settings: { active: boolean } };
  enemyTroops: unknown[];
  playerTroops: unknown[];
  waveSystem: WaveSystemShape;
  resetMatch: () => void;
};

type GameWindow = Window & {
  __game__?: { scene: { getScene: (key: string) => SceneShape | null } };
};

async function waitForMatch(page: Page) {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 });
  const startBtn = page.locator('#menu-screen-start');
  if (await startBtn.count()) {
    await startBtn.click();
  }
  await page.waitForFunction(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.sys.settings.active === true,
    { timeout: 15_000 },
  );
}

function readWaveState(page: Page) {
  return page.evaluate(() => {
    const ws = (window as GameWindow).__game__?.scene.getScene('Match')?.waveSystem;
    if (!ws) return null;
    return {
      state: ws.state,
      currentWaveIndex: ws.currentWaveIndex,
      nextWaveInMs: ws.nextWaveInMs,
      troopsRemainingInWave: ws.troopsRemainingInWave,
      totalWaves: ws.totalWaves,
    };
  });
}

test('Wave 1 begins spawning shortly after match start', async ({ page }) => {
  await waitForMatch(page);

  await page.waitForFunction(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.waveSystem.state === 'SPAWNING',
    { timeout: 2_000 },
  );

  const ws = await readWaveState(page);
  expect(ws?.currentWaveIndex).toBe(0);
  expect(ws?.totalWaves).toBe(LEVEL_1_WAVES.waves.length);
});

test('Wave 1 spawns the configured number of enemies', async ({ page }) => {
  await waitForMatch(page);

  const wave1 = LEVEL_1_WAVES.waves[0];
  const expectedCount = wave1.troops[0].count;
  const expectedDurationMs = expectedCount * wave1.troops[0].spawnIntervalMs;

  // Wait until the wave system has finished spawning wave 1 (advanced to wave 2 index)
  await page.waitForFunction(
    () => ((window as GameWindow).__game__?.scene.getScene('Match')?.waveSystem.currentWaveIndex ?? 0) >= 1,
    { timeout: expectedDurationMs + 5_000 },
  );

  const enemyCount = await page.evaluate(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.enemyTroops.length ?? 0,
  );
  expect(enemyCount).toBeGreaterThanOrEqual(expectedCount);
});

test('HUD shows breather countdown between waves', async ({ page }) => {
  await waitForMatch(page);

  // Wait until wave 1 finishes spawning and we enter the breather
  await page.waitForFunction(
    () => {
      const ws = (window as GameWindow).__game__?.scene.getScene('Match')?.waveSystem;
      return ws?.state === 'BREATHER' && ws.currentWaveIndex === 1;
    },
    { timeout: 15_000 },
  );

  // HUD updates on a 100ms interval; allow it to catch up.
  await expect(page.locator('#hud-wave-sub')).toHaveText(/Next wave in \d+s/);
  await expect(page.locator('#hud-wave-title')).toHaveText(`Wave 2 / ${LEVEL_1_WAVES.waves.length}`);
});

test('Restart resets the wave schedule to wave 1', async ({ page }) => {
  await waitForMatch(page);

  // Let wave 1 start spawning at minimum
  await page.waitForFunction(
    () => ((window as GameWindow).__game__?.scene.getScene('Match')?.enemyTroops.length ?? 0) >= 1,
    { timeout: 5_000 },
  );

  await page.evaluate(() => (window as GameWindow).__game__?.scene.getScene('Match')?.resetMatch());

  // Right after reset, currentWaveIndex must be 0. troopsRemainingInWave decreases as
  // soon as the first update tick spawns wave 1's first troop, so we don't assert on it.
  const ws = await readWaveState(page);
  expect(ws?.currentWaveIndex).toBe(0);
  expect(ws?.totalWaves).toBe(LEVEL_1_WAVES.waves.length);

  // And it begins spawning again
  await page.waitForFunction(
    () => (window as GameWindow).__game__?.scene.getScene('Match')?.waveSystem.state === 'SPAWNING',
    { timeout: 2_000 },
  );
});

test('Debug Spawn Enemy button is hidden in the default build', async ({ page }) => {
  await waitForMatch(page);
  await expect(page.locator('button:text("Spawn Enemy")')).toHaveCount(0);
});
