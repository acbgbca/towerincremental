# Phase 4 — Player Income & Spawn Cost

> **Read first**: [`docs/summary.md`](../summary.md). Builds on [Phase 3](./phase-3-tower-combat.md).

## Context

Until now, spawning troops has been free via debug buttons. This phase introduces the **economic side** of the game: the player accrues passive income at a fixed rate, and spawning a troop costs a fixed amount. The debug "Spawn Enemy" button stays for now (real enemy waves arrive in Phase 5); the "Spawn Player" button is replaced by a real, cost-gated spawn UI.

This is the first phase that has a "is this fun?" tuning element — the values in `gameConfig.ts` are guesses and will be refined later.

## Goal

The player has a visible, ticking income counter. A spawn button shows the troop's cost; clicking it deducts the cost and spawns the troop, but only if affordable. When the player can't afford it, the button is visibly disabled.

## Scope

### In scope

- An `IncomeSystem` that ticks the player's `money` upward at `INCOME_RATE` per second.
- A `cost` field on `TROOP_BASE` and a check before spawn.
- Replace the player debug spawn button with a "Spawn Base Troop (cost: N)" button in the in-match HUD.
- HUD shows current money, ticking visibly.
- Per-frame button enable/disable based on `money >= cost`.

### Out of scope

- Earning money from defeating enemies (Phase 7).
- Persisting money between matches (Phase 6).
- Any upgrade screen (Phase 8).
- Removing the debug enemy-spawn button (still needed until Phase 5).

## Files

### New

```
src/game/systems/IncomeSystem.ts
src/ui/Hud.ts                          # Money display + spawn button(s)
tests/e2e/phase-4-income-spawn-cost.spec.ts
```

### Modified

```
src/config/gameConfig.ts               # Add INCOME_RATE; add cost to TROOP_BASE
src/game/scenes/MatchScene.ts          # Construct IncomeSystem; expose money via a small in-match state object; HUD reads it
src/ui/DebugSpawnButtons.ts            # Player button removed; enemy button kept (under a debug flag)
src/game/types.ts                      # MatchState interface: { money: number, ... }
```

## Implementation notes

### `IncomeSystem`

- Holds a reference to a `MatchState` object (plain `{ money: number }`).
- `update(delta)` adds `INCOME_RATE * (delta / 1000)` to `state.money`.
- That's it. Pure, testable, easy to swap rates later (e.g. for upgrades in Phase 8).

### `MatchState`

A small in-match plain-data object owned by `MatchScene`. Don't conflate it with the persisted `GameState` (that arrives in Phase 6) — `MatchState` resets every match.

```ts
interface MatchState {
  money: number;
  // future fields: troopsDefeated, towerDamageDealt (Phase 7)
}
```

### Hud

- Plain DOM positioned over the canvas (top-left for money, bottom-centre for spawn buttons).
- Subscribes to a per-frame tick (or polls every 100ms) to update the money display — don't re-render the whole HUD every frame.
- Spawn button:
  - Shows label `Base Troop  💰{cost}` (text, no emoji needed if you'd prefer plain "$").
  - Disabled (CSS class + `disabled` attribute) when `state.money < cost`.
  - On click: deduct cost, call `MatchScene.spawnTroop('player', 'base')`.

### Tunables

```ts
export const INCOME_RATE = 10;      // money/sec
export const TROOP_BASE = {
  ...,
  cost: 25,                         // affordable in 2.5s of idle income
};
```

### Match restart

When `resetMatch()` runs (from Phase 3), reset `MatchState.money` to 0 (or a small starting amount, your call — start with 0).

## Acceptance criteria

- [ ] HUD shows money starting at 0 and increasing visibly at the configured rate.
- [ ] The spawn button is disabled until money ≥ cost; enabled the moment it crosses the threshold.
- [ ] Clicking the spawn button deducts the cost and spawns a base player troop.
- [ ] Multiple clicks deduct multiple times; cannot go negative.
- [ ] Restarting a match resets money to 0.
- [ ] Phase 0–3 tests still pass.

## Test plan

`tests/e2e/phase-4-income-spawn-cost.spec.ts`:

1. Load the page, assert the spawn button is disabled and money shows 0.
2. Wait `cost / INCOME_RATE` seconds; assert button becomes enabled.
3. Click the button; assert money decreases by `cost`, button is now disabled again, and one player troop is in the scene.
4. Wait until enough money accumulates for two spawns; rapidly click twice; assert two troops spawned and money is `(2 * INCOME_RATE * elapsed) - 2 * cost` (within tolerance).
5. Trigger a match end (use the debug enemy spawn button); restart; assert money is back to 0.

## Verification

```bash
npm run dev          # Manual: watch money tick; spawn button enables/disables; cost deducted.
npm run test:e2e
```
