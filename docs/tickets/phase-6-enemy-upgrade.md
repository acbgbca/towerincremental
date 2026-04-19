# Phase 6 — Enemy Upgrade on Win + Persistence

> **Read first**: [`docs/summary.md`](../summary.md). Builds on [Phase 5](./phase-5-enemy-waves.md).

## Context

Until now, every match resets identically. This phase introduces **persistence** and **enemy progression**: when the player wins a match, the enemy permanently upgrades — its troops gain a fixed amount of HP and damage. The new enemy level is saved to `localStorage` and survives a page reload. Losing a match does **not** upgrade the enemy.

This is the first phase that introduces save state, so we also lay down the `SaveStore` foundation that Phases 7–10 will build on.

## Goal

Defeating the enemy tower causes the enemy to upgrade. The HUD shows the current enemy level. Reloading the page preserves the enemy level. A "Reset save" debug control exists for development convenience.

## Scope

### In scope

- A versioned `SaveStore` (read/write to `localStorage`, schema `{ version, data }`, migrations stub).
- A persistent `GameState` (separate from in-match `MatchState`) with at minimum `enemyLevel: number`.
- Enemy stat scaling: `effectiveHp = base.hp + (enemyLevel - 1) * step`, same for damage.
- HUD shows current enemy level.
- On player win, increment `enemyLevel`, persist, and the next match uses the new stats.
- A debug "Reset save" button (visible only when a debug flag is set) clears the save.

### Out of scope

- Player money persistence (Phase 7).
- Upgrade screen (Phase 8).
- Different wave configs per level — re-use `LEVEL_1_WAVES` for all levels for now; only stats scale.

## Files

### New

```
src/state/SaveStore.ts
src/state/GameState.ts
src/state/migrations.ts                # Empty registry for now; structure ready for future use
tests/unit/SaveStore.test.ts           # Unit-test versioning + migration registry (boundary case)
tests/e2e/phase-6-enemy-upgrade.spec.ts
```

### Modified

```
src/main.ts                            # Load saved GameState on startup; inject into MatchScene
src/game/scenes/MatchScene.ts          # Read enemyLevel; apply stat scaling to spawned enemy troops; on win, increment + save
src/config/gameConfig.ts               # Add ENEMY_LEVEL_STAT_STEP (e.g. { hp: 25, damage: 5 })
src/ui/Hud.ts                          # Show "Enemy Level: N"
```

## Implementation notes

### `SaveStore`

```ts
const STORAGE_KEY = 'towerincremental:save';
const CURRENT_VERSION = 1;

interface Saved<T> { version: number; data: T; }

function load(): GameState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultGameState();
  const parsed = JSON.parse(raw) as Saved<unknown>;
  return migrate(parsed.version, parsed.data); // migrations.ts owns this
}

function save(state: GameState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: CURRENT_VERSION, data: state }));
}
```

`migrations.ts` exports `migrate(fromVersion, data) => GameState` and starts as a stub: `if (fromVersion === CURRENT_VERSION) return data as GameState;` plus a thrown-error fallback. The pattern is the point — we add real migrations as the schema grows.

### `GameState`

```ts
export interface GameState {
  enemyLevel: number;       // starts at 1
}

export function defaultGameState(): GameState {
  return { enemyLevel: 1 };
}
```

Future fields (money, upgrades, prestige buffs, unlocked troops) get added in their respective phases.

### Stat scaling

Compute effective enemy stats once per match-start, not per troop spawn:

```ts
const enemyStats = {
  hp:     TROOP_BASE.hp     + (enemyLevel - 1) * ENEMY_LEVEL_STAT_STEP.hp,
  damage: TROOP_BASE.damage + (enemyLevel - 1) * ENEMY_LEVEL_STAT_STEP.damage,
  walkSpeed: TROOP_BASE.walkSpeed,
  attackInterval: TROOP_BASE.attackInterval,
  width: TROOP_BASE.width,
  height: TROOP_BASE.height,
  cost: TROOP_BASE.cost,
};
```

Pass these into the enemy `Troop` constructor.

### Save trigger

Save on:
- `match:end` with `winner === 'player'` → increment then save.
- A debug "Reset save" button → write `defaultGameState()`.

Don't save every frame or on every match restart — saves should be deliberate.

## Acceptance criteria

- [ ] HUD shows "Enemy Level: 1" on a fresh save.
- [ ] After winning a match, the next match's enemies have visibly more HP (their HP bar takes longer to deplete) and deal more damage to player troops.
- [ ] HUD updates to show the new enemy level immediately on match end.
- [ ] Reloading the page preserves the enemy level.
- [ ] Losing a match does **not** increment enemy level.
- [ ] Debug "Reset save" button restores enemy level to 1.
- [ ] Phase 0–5 tests still pass.

## Test plan

### Unit (`tests/unit/SaveStore.test.ts`)

- `load()` on an empty store returns `defaultGameState()`.
- `save()` then `load()` round-trips a non-trivial state.
- `load()` on a malformed JSON falls back to `defaultGameState()` (boundary case).
- `migrate()` from `CURRENT_VERSION` is identity; from an unknown version throws (we can change the policy later).

### E2E (`tests/e2e/phase-6-enemy-upgrade.spec.ts`)

1. Start with a clean `localStorage`. Assert HUD shows level 1.
2. Trigger a player-win match (spawn enough troops to kill enemy tower); assert HUD updates to level 2.
3. Reload the page; assert HUD still shows level 2 and the next match's enemy troops are using the upgraded stats.
4. Click "Reset save"; reload; assert level 1 again.

## Verification

```bash
npm run test
npm run dev          # Win a match; reload; confirm enemies are tougher.
npm run test:e2e
```
