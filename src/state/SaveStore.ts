import type { GameState } from './GameState';
import { defaultGameState } from './GameState';
import { migrate } from './migrations';

const STORAGE_KEY = 'towerincremental:save';
const CURRENT_VERSION = 2;

interface Saved<T> {
  version: number;
  data: T;
}

export function load(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultGameState();
    const parsed = JSON.parse(raw) as Saved<unknown>;
    return migrate(parsed.version, parsed.data);
  } catch {
    return defaultGameState();
  }
}

export function save(state: GameState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: CURRENT_VERSION, data: state }));
}

export function reset(): void {
  localStorage.removeItem(STORAGE_KEY);
}
