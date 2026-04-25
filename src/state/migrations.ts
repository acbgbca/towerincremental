import type { GameState } from './GameState';

export function migrate(fromVersion: number, data: unknown): GameState {
  if (fromVersion === 1) return data as GameState;
  throw new Error(`Unknown save version: ${fromVersion}`);
}
