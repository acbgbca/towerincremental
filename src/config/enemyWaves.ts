import type { MatchWaveConfig } from '../game/types';

export const LEVEL_1_WAVES: MatchWaveConfig = {
  waves: [
    { troops: [{ type: 'base', count: 3, spawnIntervalMs: 1000 }], breatherMs: 5000 },
    { troops: [{ type: 'base', count: 5, spawnIntervalMs: 800 }], breatherMs: 6000 },
    { troops: [{ type: 'base', count: 8, spawnIntervalMs: 600 }], breatherMs: 0 },
  ],
};

export const LEVEL_4_WAVES: MatchWaveConfig = {
  waves: [
    { troops: [{ type: 'base',   count: 5, spawnIntervalMs: 700 }], breatherMs: 4000 },
    { troops: [{ type: 'runner', count: 6, spawnIntervalMs: 400 }], breatherMs: 5000 },
    {
      troops: [
        { type: 'tank', count: 2, spawnIntervalMs: 1500 },
        { type: 'base', count: 4, spawnIntervalMs: 700 },
      ],
      breatherMs: 0,
    },
  ],
};

export const EMPTY_WAVES: MatchWaveConfig = { waves: [] };

export function wavesForLevel(enemyLevel: number): MatchWaveConfig {
  return enemyLevel >= 4 ? LEVEL_4_WAVES : LEVEL_1_WAVES;
}
