import type { GameState } from './GameState';

export function migrate(fromVersion: number, data: unknown): GameState {
  let state = data;
  if (fromVersion < 2) state = migrateV1ToV2(state);
  if (fromVersion < 3) state = migrateV2ToV3(state);
  return state as GameState;
}

function migrateV1ToV2(data: unknown): unknown {
  const v1 = data as { enemyLevel: number };
  return { ...v1, money: 0 };
}

function migrateV2ToV3(data: unknown): unknown {
  const v2 = data as { enemyLevel: number; money: number };
  return { ...v2, upgrades: { incomeRate: 0, towerMaxHp: 0 } };
}
