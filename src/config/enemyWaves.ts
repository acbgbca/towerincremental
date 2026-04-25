import type { MatchWaveConfig } from '../game/types';

export const LEVEL_1_WAVES: MatchWaveConfig = {
  waves: [
    { troops: [{ type: 'base', count: 3, spawnIntervalMs: 1000 }], breatherMs: 5000 },
    { troops: [{ type: 'base', count: 5, spawnIntervalMs: 800 }], breatherMs: 6000 },
    { troops: [{ type: 'base', count: 8, spawnIntervalMs: 600 }], breatherMs: 0 },
  ],
};

export const EMPTY_WAVES: MatchWaveConfig = { waves: [] };
