# Phase 10 — Additional Troop Types

> **Read first**: [`docs/summary.md`](../summary.md). Builds on [Phase 9](./phase-9-prestige.md). This is the final MVP phase.

## Context

The game has been played end-to-end with a single base troop. This phase adds the **other two troop archetypes** the user wants in the MVP, completing the design. The new troops are unlock-purchases on the upgrade screen, locked again by prestige (per the design — prestige resets unlocked troop types).

The HUD spawn UI gets a small expansion: instead of one button, the player sees up to three troop spawn buttons (one per unlocked type), each with its own cost.

## Goal

The player can unlock and spawn three distinct troop types: a balanced **base**, a fast-but-fragile **runner**, and a slow-but-tanky **tank**. Each has different stats, costs, and visual size. Unlocks persist; prestige resets them.

## Scope

### In scope

- Two new troop type definitions: `runner` and `tank`.
- Each troop type has its own stats (`walkSpeed`, `hp`, `damage`, `attackInterval`, `cost`, `width`, `height`).
- Each is rendered with a distinct shape size and (optionally) a slight colour variation while still matching the player/enemy palette.
- `unlockedTroopTypes` (added in Phase 9) is now actually used.
- Upgrade screen gets two new "Unlock" rows: one per locked troop type, each with a one-time cost.
- HUD spawn area shows one button per unlocked type, each with its own cost.
- Player troop type prestige buff applies symmetrically: all player troop types gain `prestigeTier * step` HP and damage.
- Enemy waves (Phase 5) **may** reference any troop type. For MVP, level 1 waves stay base-only; later levels can mix in `runner` / `tank`. Update `enemyWaves.ts` to support this and add at least one wave config that uses each type so we exercise the rendering / stats end-to-end.

### Out of scope

- Special abilities (e.g. ranged attack, splash damage). All troops use the same melee tick model.
- Per-troop-type upgrades (we keep upgrades global; fold into a future phase).

## Files

### New

```
src/config/troopTypes.ts               # All troop type definitions in one place
tests/e2e/phase-10-troop-types.spec.ts
```

### Modified

```
src/game/types.ts                      # TroopType becomes 'base' | 'runner' | 'tank'
src/game/entities/Troop.ts             # Construct from a TroopStats descriptor (already passed in; just verify path)
src/game/scenes/MatchScene.ts          # Look up stats by type when spawning
src/config/enemyWaves.ts               # Support different troop types per wave; introduce mixed waves at higher levels
src/ui/UpgradeScreen.ts                # Add Unlock rows for runner + tank
src/ui/Hud.ts                          # Render one spawn button per unlocked troop type
src/state/GameState.ts                 # No new field; we use the existing unlockedTroopTypes from Phase 9
src/render/shapes.ts                   # Distinct sizes / minor colour shift per troop type
src/config/gameConfig.ts               # UNLOCK_COST_RUNNER, UNLOCK_COST_TANK
```

## Implementation notes

### Troop type catalogue

```ts
// src/config/troopTypes.ts
import type { TroopType, TroopStats } from '../game/types';

export const TROOP_TYPES: Record<TroopType, TroopStats> = {
  base:   { walkSpeed: 80,  hp: 100, damage: 20, attackInterval: 500, cost: 25, width: 24, height: 36 },
  runner: { walkSpeed: 140, hp: 60,  damage: 15, attackInterval: 350, cost: 35, width: 18, height: 30 },
  tank:   { walkSpeed: 50,  hp: 250, damage: 30, attackInterval: 800, cost: 60, width: 32, height: 48 },
};

export const UNLOCK_COSTS: Partial<Record<TroopType, number>> = {
  runner: 200,
  tank:   400,
};
```

The base troop is included in this catalogue (and `TROOP_BASE` in `gameConfig.ts` becomes a re-export for backwards compat — or just inlined and removed).

### Effective stats with prestige

The Phase 9 helper extends to all troop types:

```ts
function effectivePlayerStats(type: TroopType, prestigeTier: number): TroopStats {
  const base = TROOP_TYPES[type];
  return {
    ...base,
    hp:     base.hp     + prestigeTier * ENEMY_LEVEL_STAT_STEP.hp,
    damage: base.damage + prestigeTier * ENEMY_LEVEL_STAT_STEP.damage,
  };
}
```

Symmetric for enemy:

```ts
function effectiveEnemyStats(type: TroopType, enemyLevel: number): TroopStats {
  const base = TROOP_TYPES[type];
  return {
    ...base,
    hp:     base.hp     + (enemyLevel - 1) * ENEMY_LEVEL_STAT_STEP.hp,
    damage: base.damage + (enemyLevel - 1) * ENEMY_LEVEL_STAT_STEP.damage,
  };
}
```

### HUD spawn buttons

Render `unlockedTroopTypes.map(type => <SpawnButton type cost={TROOP_TYPES[type].cost} />)`. Stack horizontally bottom-centre. Each button is independently disabled based on `matchState.money >= cost`.

### Upgrade screen unlock rows

Below the income / tower-HP rows, insert:

```
┌─ Unlock Runner ──────  $200  [BUY] ─┐
└─ Unlock Tank ────────  $400  [BUY] ─┘
```

After unlock: hide the row (or show a disabled "Unlocked" badge). When prestige resets, the rows reappear.

### Wave config update

```ts
export const LEVEL_4_WAVES: MatchWaveConfig = {
  waves: [
    { troops: [{ type: 'base',   count: 5, spawnIntervalMs: 700 }], breatherMs: 4000 },
    { troops: [{ type: 'runner', count: 6, spawnIntervalMs: 400 }], breatherMs: 5000 },
    { troops: [{ type: 'tank',   count: 2, spawnIntervalMs: 1500 },
               { type: 'base',   count: 4, spawnIntervalMs: 700  }], breatherMs: 0 },
  ],
};
```

Pick which level config to use based on `enemyLevel` (e.g. levels 1–3 → `LEVEL_1_WAVES`, levels 4+ → `LEVEL_4_WAVES`). Keep this lookup in one place.

### Visual differentiation

- `runner`: smaller rectangle, slightly lighter shade.
- `tank`: larger rectangle, slightly darker shade.
- Player vs enemy still distinguished by base hue (existing palette tokens).

When SVG art arrives later, this is the seam where unique sprites slot in.

## Acceptance criteria

- [ ] After unlocking the runner from the upgrade screen, the HUD shows two spawn buttons; clicking the runner button spawns a smaller, faster troop.
- [ ] After unlocking the tank, three spawn buttons; tank troops are visibly larger, slower, and absorb more damage.
- [ ] Each troop type has the correct stats (verified via `window.__game__`).
- [ ] Unlocked troop types persist across reload.
- [ ] Prestige re-locks runner and tank; the upgrade screen rows reappear.
- [ ] Enemy waves at higher levels include runners and tanks; they render and behave correctly.
- [ ] Prestige buff applies to all player troop types.
- [ ] Phase 0–9 tests still pass.

## Test plan

`tests/e2e/phase-10-troop-types.spec.ts`:

1. Pre-seed save with enough money to unlock runner; confirm upgrade screen row; click Unlock; confirm `unlockedTroopTypes` includes `runner` and persists across reload.
2. Start a match; assert HUD shows two spawn buttons; spawn a runner; assert its `walkSpeed` matches the catalogue.
3. Repeat for tank; assert size / hp differences via `window.__game__`.
4. Pre-seed save with `prestigeTier = 2`; spawn each troop type; assert hp/damage match the prestige-buffed formula.
5. Pre-seed `enemyLevel = 4`; start match; wait through waves; assert at least one runner and one tank enemy troop appear (probe via `window.__game__.scene.getScene('Match').enemyTroops`).
6. Trigger prestige; confirm runner / tank are re-locked and the unlock rows are visible again on the next upgrade screen.

## Verification

```bash
npm run dev          # Manual: full play-through using all three troop types.
npm run test
npm run test:e2e
npm run build        # Confirm production build still passes.
```

## Definition of MVP done

With Phase 10 complete:
- All 11 phase tickets have their acceptance criteria ticked.
- A user can install the PWA on their phone, play a full match with three troop types, win/lose, upgrade, prestige, and have the state persist across closes.
- CI is green.
- The build runs unchanged on nginx and on GitHub Pages.
