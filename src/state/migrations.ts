import type { GameState } from './GameState';

export function migrate(fromVersion: number, data: unknown): GameState {
  if (fromVersion === 1) return migrateV1ToV2(data);
  if (fromVersion === 2) return data as GameState;
  throw new Error(`Unknown save version: ${fromVersion}`);
}

function migrateV1ToV2(data: unknown): GameState {
  const v1 = data as { enemyLevel: number };
  return { ...v1, money: 0 };
}
