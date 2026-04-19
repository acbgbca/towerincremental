# Phase 2 — Troop vs Troop Combat

> **Read first**: [`docs/summary.md`](../summary.md). Builds on [Phase 1](./phase-1-troops-walk.md).

## Context

Troops can spawn and walk. They currently pass through each other. This phase introduces **combat** between opposing troops: when a player troop and an enemy troop overlap, both stop, attack each other on a regular tick, and continue walking only when their opponent is dead.

Combat is intentionally simple — fixed damage per tick, no special abilities, no targeting priorities — so we can verify the core loop before adding complexity.

## Goal

Spawning a player troop and an enemy troop on a collision course results in them stopping when they meet, exchanging attacks until one (or both, if HP/damage are tuned that way) dies, and the survivor resuming its walk.

## Scope

### In scope

- HP and damage on every troop (`TROOP_BASE.hp`, `TROOP_BASE.damage`, `TROOP_BASE.attackInterval`).
- A `CombatSystem` that, each frame, finds overlapping opposing-side troops and pairs them as combatants.
- Troop state machine: `WALKING` ↔ `ATTACKING`. While `ATTACKING`, the troop's velocity is zero and it deals damage to its target every `attackInterval` ms.
- A simple HP bar above each troop (a small rect inside `shapes.ts`).
- Death cleanup: when a troop's HP reaches 0, destroy it; if it had a combatant, that combatant returns to `WALKING`.

### Out of scope

- Tower attacks (Phase 3).
- Multi-target combat (a troop attacks at most one opponent at a time).
- Spawn cost or income (Phase 4).

## Files

### New

```
src/game/systems/CombatSystem.ts
tests/e2e/phase-2-troop-combat.spec.ts
```

### Modified

```
src/config/gameConfig.ts         # Populate hp / damage / attackInterval on TROOP_BASE
src/game/entities/Troop.ts       # Add hp, currentTarget, state, attackTimer; takeDamage(); update reads state
src/game/scenes/MatchScene.ts    # Construct CombatSystem; call combatSystem.update(delta) each frame
src/render/shapes.ts             # drawTroopHpBar(troop) helper; troop refreshes the bar after damage
src/game/types.ts                # TroopState enum: 'WALKING' | 'ATTACKING' | 'DEAD'
```

## Implementation notes

### `CombatSystem.update(delta, playerTroops, enemyTroops)`

A single per-frame pass:

1. **Pair finding** — for each `WALKING` player troop, find the nearest overlapping (or touching) `WALKING` enemy troop. If found, both transition to `ATTACKING` and set `currentTarget` to each other.
2. **Attack ticks** — for each `ATTACKING` troop, advance its `attackTimer` by `delta`. When it exceeds `attackInterval`, deal `damage` to `currentTarget` and reset the timer.
3. **Death handling** — any troop whose HP ≤ 0 transitions to `DEAD` and is removed at end of frame. Any troop whose `currentTarget` is `DEAD` (or destroyed) resets to `WALKING` (clearing target and timer).

Keep this system **pure-ish**: it accepts arrays of troops, mutates their state fields, and returns no value. Phaser's arcade physics overlap helper can be used to simplify pair finding, but you can also do simple AABB overlap on `(x, y, width, height)`.

### Troop state machine

- `WALKING`: position advances per Phase 1 logic.
- `ATTACKING`: position is frozen; `attackTimer` advances; periodic damage to `currentTarget`.
- `DEAD`: terminal — scheduled for removal this frame.

A troop returning from `ATTACKING` to `WALKING` after killing its target should reset its `attackTimer` to 0 so its next attack timing is consistent.

### Tunables

```ts
export const TROOP_BASE: TroopStats = {
  walkSpeed: 80,
  width: 24,
  height: 36,
  hp: 100,
  damage: 20,
  attackInterval: 500,   // ms
};
```

A troop kills another in 5 hits ≈ 2.5s — slow enough to watch, fast enough to test.

### HP bar

A small rect above the troop, scaled by `currentHp / maxHp`. Recolour from green → red as HP drops (use simple thresholds; don't lerp). The bar lives in `render/shapes.ts` so the SVG swap later is clean.

## Acceptance criteria

- [ ] A player troop and an enemy troop spawned simultaneously meet roughly at the centre, stop, and exchange attacks.
- [ ] HP bars visibly tick down on both troops.
- [ ] When one troop's HP reaches 0, it is removed and the survivor resumes walking.
- [ ] If both troops die on the same attack tick (mutual kill), both are removed.
- [ ] HP bar reflects current HP every tick.
- [ ] Phase 0 + Phase 1 tests still pass.

## Test plan

`tests/e2e/phase-2-troop-combat.spec.ts`:

1. Spawn one player and one enemy troop simultaneously.
2. Wait until both are `ATTACKING` (poll `troop.state`); assert their `x` positions stop changing.
3. Wait `attackInterval * (hp / damage) + buffer` ms; assert at least one troop is destroyed and the survivor (if any) is `WALKING` again.
4. Edge case: spawn two player troops and one enemy. Assert that only one player troop is paired with the enemy at a time, while the other walks past unimpeded toward the enemy tower (the second engagement comes once the first ends).

## Verification

```bash
npm run dev          # Manual: spawn pairs and watch combat resolve.
npm run test:e2e
```
