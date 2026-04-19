# Phase 9 — Prestige (Purchase Next Level)

> **Read first**: [`docs/summary.md`](../summary.md). Builds on [Phase 8](./phase-8-upgrade-screen.md).

## Context

The player has been upgrading income and tower HP. At some point those upgrades become too expensive relative to what they can earn — that's the point at which **prestige** unlocks meaningful progression. Buying "next level" costs a fixed (or scaling) threshold and:

- **Resets**: enemy level → 1, money → 0, all per-match upgrades (income, tower HP) → 0, all unlocked extra troop types → locked (Phase 10 detail).
- **Permanently buffs**: the player's base troop HP and damage by `ENEMY_LEVEL_STAT_STEP.{hp,damage}` per prestige (the same step the enemy uses).

This is the classic incremental-game prestige mechanic: a soft reset that makes the next run-through faster.

## Goal

The "Purchase Next Level" button on the upgrade screen becomes active once the player can afford it. Clicking it (with a confirmation prompt) performs the prestige reset, increments the player's prestige tier, and persists everything. The next match starts from scratch — but the player's troops are noticeably stronger.

## Scope

### In scope

- A `prestigeTier: number` field in `GameState`.
- A configurable cost for the next prestige (constant for MVP, e.g. `PRESTIGE_COST = 1000`; scales as tier `n → cost * (n+1)` is fine if you want).
- Confirmation modal: "This will reset your money, upgrades, and enemy progress. You will gain a permanent troop boost. Continue?"
- The reset operation (atomic save):
  - `enemyLevel = 1`
  - `money = 0`
  - `upgrades = { incomeRate: 0, towerMaxHp: 0 }`
  - `unlockedTroopTypes = ['base']` (forward-compat for Phase 10)
  - `prestigeTier += 1`
- Player troop stats at runtime are computed as `base + prestigeTier * ENEMY_LEVEL_STAT_STEP.{hp,damage}` (mirror of how enemy scaling works in Phase 6).
- HUD shows current prestige tier.

### Out of scope

- Multiple troop types — they exist as a slot but only `base` is implemented (Phase 10 fills the rest).
- Different prestige currencies / multi-currency systems (out of scope for MVP).

## Files

### New

```
src/ui/ConfirmDialog.ts                # Generic Yes/No DOM dialog (small, reusable)
tests/e2e/phase-9-prestige.spec.ts
```

### Modified

```
src/state/GameState.ts                 # Add prestigeTier (default 0), unlockedTroopTypes (default ['base'])
src/state/migrations.ts                # v3 → v4: initialise prestigeTier to 0, unlockedTroopTypes to ['base']
src/config/gameConfig.ts               # Add PRESTIGE_COST; ENEMY_LEVEL_STAT_STEP already exists from Phase 6
src/game/scenes/MatchScene.ts          # Compute effective player troop stats from prestigeTier when constructing player troops
src/ui/UpgradeScreen.ts                # Implement the previously-disabled "Purchase Next Level" button
src/ui/Hud.ts                          # Show prestige tier
```

## Implementation notes

### Player stat scaling — mirror the enemy formula

```ts
function effectivePlayerStats(prestigeTier: number): TroopStats {
  return {
    ...TROOP_BASE,
    hp:     TROOP_BASE.hp     + prestigeTier * ENEMY_LEVEL_STAT_STEP.hp,
    damage: TROOP_BASE.damage + prestigeTier * ENEMY_LEVEL_STAT_STEP.damage,
  };
}
```

Use this everywhere a player troop is constructed. Don't sprinkle the formula in scenes.

### Prestige action (atomic)

```ts
function prestige(state: GameState): GameState {
  return {
    enemyLevel: 1,
    money: 0,
    upgrades: { incomeRate: 0, towerMaxHp: 0 },
    unlockedTroopTypes: ['base'],
    prestigeTier: state.prestigeTier + 1,
  };
}
```

Save the result, then trigger a full match-state reset (towers full HP, troops cleared, wave system rebuilt). This should be the same code path as `resetMatch()` from Phase 3, with the new `GameState` already in place.

### Confirmation dialog

Don't ship a destructive button without a confirm step. The `ConfirmDialog` should be a thin reusable DOM component — useful again in future (e.g. "Reset save" in dev tools).

### Cost gating

```ts
const canPrestige = gameState.money >= PRESTIGE_COST;
```

Show the cost on the button: `Purchase Next Level — $1000`. Disable + style accordingly when unaffordable.

> Tuning note: `PRESTIGE_COST = 1000` is a starting guess. Once Phase 10 ships and the game can be played end-to-end, tune so a player typically prestiges around enemy level 8–12 on their first run.

## Acceptance criteria

- [ ] HUD shows "Prestige: 0" on a fresh save.
- [ ] "Purchase Next Level" is disabled when `money < PRESTIGE_COST`.
- [ ] Clicking it shows a confirm dialog; cancelling does nothing.
- [ ] Confirming resets enemy level to 1, money to 0, upgrades to 0, increments prestige tier, persists.
- [ ] On the next match, player troops have visibly more HP and damage (HP bar drops slower; enemy troops die faster).
- [ ] Reload preserves prestige tier and the reset state.
- [ ] Multiple prestige cycles stack the troop buff additively.
- [ ] Phase 0–8 tests still pass.

## Test plan

`tests/e2e/phase-9-prestige.spec.ts`:

1. Pre-seed save state with `money = PRESTIGE_COST + 100, enemyLevel = 5, upgrades = { incomeRate: 3, towerMaxHp: 2 }`.
2. Open upgrade screen; assert "Purchase Next Level" is enabled and shows the cost.
3. Click; confirm; assert `GameState` is reset (`enemyLevel === 1, money === 0, upgrades === {0,0}, prestigeTier === 1`).
4. Start a match; assert player troop's `hp` (read via `window.__game__`) equals `TROOP_BASE.hp + ENEMY_LEVEL_STAT_STEP.hp`.
5. Reload; assert state persisted.
6. Repeat prestige to tier 2; assert player troop hp equals `TROOP_BASE.hp + 2 * ENEMY_LEVEL_STAT_STEP.hp`.

## Verification

```bash
npm run dev          # Manual: grind enough money, prestige, observe stronger troops.
npm run test:e2e
```
