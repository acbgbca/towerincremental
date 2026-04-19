# Phase 5 — Enemy Waves

> **Read first**: [`docs/summary.md`](../summary.md). Builds on [Phase 4](./phase-4-income-spawn-cost.md).

## Context

Enemy troops have only ever spawned via the debug button. This phase replaces that with the **proper enemy AI**: a declarative wave config drives spawns over the course of a match. Each match contains multiple waves separated by breathers. The HUD shows which wave is active.

The enemy is otherwise dumb — no targeting, no economy, just "spawn troops on this schedule". Difficulty scaling (enemy upgrades) arrives in Phase 6.

## Goal

A match starts; the enemy spawns waves of troops on a schedule defined in `enemyWaves.ts`. The player can see which wave is active and how many waves remain. The debug enemy-spawn button is removed (or hidden behind a debug flag).

## Scope

### In scope

- A declarative wave-config format (`enemyWaves.ts`).
- A `WaveSystem` that, given a config, schedules enemy spawns over time.
- Wave indicator in the HUD: "Wave 2 / 5 — next in 3.2s" or "Wave 2 / 5 — in progress".
- Match-start triggers the wave schedule from wave 1.
- Match restart resets the wave schedule.

### Out of scope

- Enemy stat scaling (Phase 6).
- Enemy economy (the enemy never has a budget — wave config is the authority).
- Multiple troop types — waves only contain `'base'` troops in this phase.

## Files

### New

```
src/config/enemyWaves.ts
src/game/systems/WaveSystem.ts
tests/e2e/phase-5-enemy-waves.spec.ts
```

### Modified

```
src/game/scenes/MatchScene.ts          # Construct WaveSystem; pass it the current level's wave config (level 1 only for now)
src/ui/Hud.ts                          # Wave indicator
src/ui/DebugSpawnButtons.ts            # Hide enemy spawn button behind a debug flag
src/game/types.ts                      # WaveDefinition, MatchWaveConfig types
```

## Implementation notes

### Wave config shape

```ts
// src/config/enemyWaves.ts
export interface WaveDefinition {
  troops: { type: TroopType; count: number; spawnIntervalMs: number }[];
  breatherMs: number;       // Pause AFTER this wave finishes spawning
}

export interface MatchWaveConfig {
  waves: WaveDefinition[];
}

export const LEVEL_1_WAVES: MatchWaveConfig = {
  waves: [
    { troops: [{ type: 'base', count: 3, spawnIntervalMs: 1000 }], breatherMs: 5000 },
    { troops: [{ type: 'base', count: 5, spawnIntervalMs: 800  }], breatherMs: 6000 },
    { troops: [{ type: 'base', count: 8, spawnIntervalMs: 600  }], breatherMs: 0    },
  ],
};
```

Three waves, escalating count, decreasing spawn interval. The final wave has `breatherMs: 0` because there's nothing after it.

### `WaveSystem`

A small state machine driven by `update(delta)`:

- States: `BREATHER` (initial, with a `0ms` breather is fine to skip) → `SPAWNING` → `BREATHER` → … → `DONE`.
- Tracks `currentWaveIndex`, `nextSpawnInMs`, and `troopsRemainingInWave`.
- When `SPAWNING`, decrements `nextSpawnInMs` by delta; when ≤ 0, spawns one troop, decrements `troopsRemainingInWave`, resets `nextSpawnInMs = spawnIntervalMs`.
- When all troops in the current wave are spawned, transitions to `BREATHER` for `breatherMs`.
- After the last wave finishes spawning + breathing, transitions to `DONE`. `DONE` does not auto-end the match — the match still ends only by tower destruction (per design). So if the player kills all the enemy troops without taking the enemy tower down, the match continues with only the player attacking.

> Note: this is the right behaviour per the design — the player wins by destroying the enemy tower, not by surviving. Survival isn't a win condition.

### HUD wave indicator

- Shows `Wave {currentWaveIndex + 1} / {totalWaves}`.
- Sub-line shows either `Spawning…` or `Next wave in {ceil(nextWaveInMs/1000)}s`.
- After `DONE`, sub-line shows `All waves spawned`.

### Match restart

`resetMatch()` from Phase 3 must re-instantiate / reset the `WaveSystem`. Simplest: throw away the old one and build a new one from the current level's config.

## Acceptance criteria

- [ ] Starting a match begins the wave schedule for level 1.
- [ ] Enemy troops appear in three waves with the configured timing.
- [ ] HUD wave indicator updates correctly through `Spawning` and breather countdowns.
- [ ] Restarting the match restarts the wave schedule from wave 1.
- [ ] Debug enemy-spawn button is no longer visible in the default build.
- [ ] Phase 0–4 tests still pass.

## Test plan

`tests/e2e/phase-5-enemy-waves.spec.ts`:

1. Start a match with player towers / spawning disabled (don't click anything).
2. Read `WaveSystem` state via `window.__game__`; confirm wave 1 begins spawning at t≈0.
3. Wait through wave 1; assert `count` enemy troops appeared on screen.
4. Confirm a breather period (no new enemies for ~`breatherMs`); HUD shows the countdown.
5. Wait through all waves; confirm `WaveSystem.state === 'DONE'`.
6. Restart the match; confirm wave 1 starts again.

## Verification

```bash
npm run dev          # Manual: start a match, do nothing, watch waves arrive on schedule.
npm run test:e2e
```
