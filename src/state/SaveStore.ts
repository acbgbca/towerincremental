import type { GameState } from './GameState';
import { defaultGameState } from './GameState';
import { migrate } from './migrations';
import { TROOP_TYPES } from '../config/troopTypes';
import type { TroopType } from '../game/types';

const STORAGE_KEY = 'towerincremental:save';
const CURRENT_VERSION = 4;

interface Saved<T> {
  version: number;
  data: T;
}

export function load(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultGameState();
    const parsed = JSON.parse(raw) as Saved<unknown>;
    const state = migrate(parsed.version, parsed.data);
    // Drop legacy entries (e.g. 'runner') so the rest of the app can trust this list.
    state.unlockedTroopTypes = state.unlockedTroopTypes.filter(
      (t): t is TroopType => t in TROOP_TYPES,
    );
    return state;
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
