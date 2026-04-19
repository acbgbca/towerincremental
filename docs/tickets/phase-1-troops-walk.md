# Phase 1 — Troops Walk

> **Read first**: [`docs/summary.md`](../summary.md). This phase assumes [Phase 0](./phase-0-skeleton.md) is complete (skeleton, two static towers rendered, all tooling green).

## Context

The skeleton renders two static towers. We now introduce **troops** — the basic moving entity. Troops in this phase have a single job: spawn at one tower and walk in a straight line toward the other. **No combat, no collisions, no cost.** Troops walk past each other and off the far edge of the screen, then despawn.

This phase exists to nail the troop GameObject, the spawn API, and the walk behaviour in isolation, so all subsequent combat / cost / wave work has a clean substrate.

## Goal

Two debug buttons (player-spawn, enemy-spawn) overlaid on the canvas. Each click adds a troop walking from its tower toward the opposite side at a configured speed.

## Scope

### In scope

- A `Troop` entity (Phaser GameObject) rendered as a coloured rectangle (player and enemy use the existing palette colours).
- A `spawnTroop(side: 'player' | 'enemy', type: TroopType)` method on `MatchScene`.
- Walk behaviour: troops move horizontally at a constant velocity from `gameConfig.ts` until they leave the play area, then are destroyed.
- Two debug buttons in the DOM overlay (top-left of viewport): "Spawn Player" / "Spawn Enemy".
- A new `MatchScene` (the Boot scene transitions to it on start).

### Out of scope

- Collision between troops (Phase 2).
- Tower attacks (Phase 3).
- Income / spawn cost (Phase 4).
- Wave logic (Phase 5).
- Multiple troop types — only the **base troop** exists yet (the type field is plumbed but only one variant is defined).

## Files

### New

```
src/game/scenes/MatchScene.ts
src/game/entities/Troop.ts
src/game/types.ts                # TroopType enum, TroopStats interface
src/ui/DebugSpawnButtons.ts      # DOM overlay with two buttons
tests/e2e/phase-1-troops-walk.spec.ts
```

### Modified

```
src/main.ts                      # Add MatchScene to Phaser game config; transition Boot → Match
src/config/gameConfig.ts         # Add TROOP_BASE { walkSpeed, width, height, spawnY }
src/render/shapes.ts             # drawTroop(scene, side) helper
src/render/palette.ts            # Add TROOP_PLAYER / TROOP_ENEMY tokens if not present
```

## Implementation notes

### `Troop`

- A thin wrapper around a `Phaser.GameObjects.Rectangle` (or sprite later).
- Constructor: `new Troop(scene, side, type, x, y)`.
- `update(delta)` advances `x` by `walkSpeed * direction * (delta / 1000)`.
- Player direction = +1, enemy direction = −1.
- When the troop's `x` leaves the play area (player troop x > worldWidth, enemy troop x < 0), destroy it and emit a `troop:despawn` event.

### `MatchScene`

- Maintain `playerTroops: Troop[]` and `enemyTroops: Troop[]` arrays.
- `spawnTroop(side, type)` instantiates a `Troop` at the relevant tower's spawn point and pushes it onto the right array.
- Per-frame: iterate both arrays, call `troop.update(delta)`, prune destroyed troops.

### Debug buttons

- Plain `<button>` elements positioned via CSS in `index.html` / `styles.css`. They call `window.__game__.scene.getScene('Match').spawnTroop('player'|'enemy', 'base')`.
- Buttons are visible by default in this phase. They will be replaced by purchase buttons in Phase 4 — keep the styling simple to avoid throwaway polish.

### Tunables (in `gameConfig.ts`)

```ts
export const TROOP_BASE: TroopStats = {
  walkSpeed: 80,        // px/s
  width: 24,
  height: 36,
  hp: 0,                // unused this phase; populated in Phase 2
  damage: 0,            // unused this phase
  attackInterval: 0,    // unused this phase
};
```

## Acceptance criteria

- [ ] Clicking "Spawn Player" produces a player-coloured rectangle that walks from the player tower toward the enemy tower at `TROOP_BASE.walkSpeed`.
- [ ] Clicking "Spawn Enemy" does the symmetric thing from the enemy side.
- [ ] Player and enemy troops walk **past each other** without interacting.
- [ ] Troops are destroyed when they exit the play area (no off-screen accumulation visible in `window.__game__`).
- [ ] Multiple rapid clicks spawn multiple troops correctly, all walking independently.
- [ ] The Phase 0 Playwright spec still passes (towers still render).

## Test plan

`tests/e2e/phase-1-troops-walk.spec.ts`:

1. Load the page, wait for the Match scene to be active.
2. Click "Spawn Player". Read `window.__game__.scene.getScene('Match').playerTroops.length` — expect 1.
3. Sample the troop's `x` at `t=0` and `t=500ms`; expect it to have moved by `~walkSpeed * 0.5` px to the right.
4. Click "Spawn Enemy"; assert it walks left.
5. Wait long enough for both troops to leave the play area; expect both troop arrays to be empty.

## Verification

```bash
npm run dev          # Manually click both buttons; confirm troops walk and despawn.
npm run test:e2e
```
