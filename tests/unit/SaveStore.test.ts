import { describe, it, expect, beforeEach, vi } from 'vitest';
import { load, save } from '../../src/state/SaveStore';
import { migrate } from '../../src/state/migrations';
import { defaultGameState } from '../../src/state/GameState';

function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { for (const k in store) delete store[k]; }),
  };
}

describe('SaveStore', () => {
  let storage: ReturnType<typeof makeLocalStorageMock>;

  beforeEach(() => {
    storage = makeLocalStorageMock();
    vi.stubGlobal('localStorage', storage);
  });

  it('load() on an empty store returns defaultGameState', () => {
    const state = load();
    expect(state).toEqual(defaultGameState());
  });

  it('save() then load() round-trips a non-trivial state', () => {
    const state = { enemyLevel: 7 };
    save(state);
    const loaded = load();
    expect(loaded).toEqual(state);
  });

  it('load() on malformed JSON falls back to defaultGameState', () => {
    storage.getItem.mockReturnValueOnce('not-valid-json{{{');
    const state = load();
    expect(state).toEqual(defaultGameState());
  });
});

describe('migrate', () => {
  it('migrate from CURRENT_VERSION (1) is identity', () => {
    const data = { enemyLevel: 3 };
    expect(migrate(1, data)).toEqual(data);
  });

  it('migrate from unknown version throws', () => {
    expect(() => migrate(99, {})).toThrow();
  });
});
