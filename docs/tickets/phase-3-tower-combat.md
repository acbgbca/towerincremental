# Phase 3 — Troop vs Tower Combat & Match End

> **Read first**: [`docs/summary.md`](../summary.md). Builds on [Phase 2](./phase-2-troop-combat.md).

## Context

Troops can fight other troops. Now they need to attack the **tower** if they reach it. Towers have HP. When a tower's HP hits 0, the match ends and a "You won" / "You lost" placeholder screen is shown. This phase introduces the **win/lose condition** — the first end-to-end-meaningful state.

## Goal

A troop that reaches the opposing tower stops at it and attacks on the same tick interval as troop combat. Tower HP is visible. When a tower hits 0 HP, a result overlay is shown with a "Restart" button that resets the match to a fresh state.

## Scope

### In scope

- HP on towers; a max HP from `gameConfig.ts`.
- Troop state extended: `ATTACKING_TOWER` (a sub-state of `ATTACKING` is fine — the target is just a `Tower`).
- Tower HP bar rendered above each tower.
- A `MatchResult` event fired when either tower hits 0 HP, with `{ winner: 'player' | 'enemy' }`.
- A DOM result overlay shown on `MatchResult`, with a "Restart" button that:
  - Destroys all troops.
  - Restores both towers to full HP.
  - Returns the scene to a fresh playable state.

### Out of scope

- Any reward / income calculation (Phase 7).
- Any persistence (Phase 6).
- Any wave logic — manual debug spawn buttons remain.

## Files

### New

```
src/game/entities/Tower.ts            # HP wrapper around the existing tower rectangle
src/ui/MatchResultOverlay.ts          # DOM overlay with result text + restart button
tests/e2e/phase-3-tower-combat.spec.ts
```

### Modified

```
src/config/gameConfig.ts              # Add TOWER { maxHp }
src/game/scenes/MatchScene.ts         # Hold Tower instances; wire combat with towers; emit MatchResult
src/game/systems/CombatSystem.ts      # Extend pair-finding to also pair WALKING troops with the opposing tower when adjacent
src/render/shapes.ts                  # drawTowerHpBar(tower) helper
src/game/types.ts                     # MatchResult interface; extend TroopState if you choose ATTACKING_TOWER
```

## Implementation notes

### Tower as a target

Treat a `Tower` and a `Troop` polymorphically as `Damageable` — both have `takeDamage(n)` and `isAlive()`. The `CombatSystem`'s "find a target" routine can then treat the tower as a fallback target when no opposing troop is in reach:

- Player troop with no enemy in overlap range → if its `x` is past the enemy tower's leading edge, target the enemy tower.
- Symmetric for enemy troops vs player tower.

Once attacking the tower, the troop stays put until either the tower dies or the troop dies. (No "re-prioritise to a fresh enemy troop" yet — keep it simple.)

### Match end

- `MatchScene` listens for `Tower.died` events.
- On the first such event, emit `match:end` with the winner, freeze all troop updates (so nothing keeps moving on the result screen), and show `MatchResultOverlay`.
- "Restart" hides the overlay and calls a `MatchScene.resetMatch()` method that:
  - Destroys all troops.
  - Resets both towers to `TOWER.maxHp`.
  - Re-enables troop spawning.

### Tunables

```ts
export const TOWER = {
  maxHp: 500,
  attackTargetingMargin: 4,   // px overlap to consider 'at the tower'
};
```

`maxHp = 500` and `TROOP_BASE.damage = 20 / attackInterval = 500ms` means one unopposed troop kills a tower in ~12.5s — long enough to set up scenarios in tests, short enough to play.

## Acceptance criteria

- [ ] A lone player troop walks all the way to the enemy tower, stops, and attacks it. Tower HP bar visibly drops.
- [ ] When the enemy tower hits 0 HP, the result overlay shows "You won" with a Restart button.
- [ ] Symmetric: a lone enemy troop kills the player tower → "You lost" overlay.
- [ ] Restart returns the scene to a fresh state (full tower HP, no troops, spawn buttons working).
- [ ] If a troop is engaged with an enemy troop, it does **not** attack the tower until that fight ends.
- [ ] Phase 0–2 tests still pass.

## Test plan

`tests/e2e/phase-3-tower-combat.spec.ts`:

1. Spawn player troops repeatedly until enemy tower HP reaches 0; assert the result overlay appears with `winner === 'player'`.
2. Click Restart; assert overlay disappears, both towers back at full HP, troop arrays empty.
3. Mirror test: spawn enemy troops only and assert "You lost" overlay.
4. Edge case: troop engaged with an opposing troop just outside the tower hit-range → assert the troop does not damage the tower until the troop fight resolves.

## Verification

```bash
npm run dev          # Manual: spam-spawn until a tower falls; verify overlay + restart.
npm run test:e2e
```
