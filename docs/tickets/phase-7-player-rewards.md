# Phase 7 — Player Earns Money from Match Results

> **Read first**: [`docs/summary.md`](../summary.md). Builds on [Phase 6](./phase-6-enemy-upgrade.md).

## Context

The player has had passive income (Phase 4) and the enemy has progressed (Phase 6), but the player has had no way to *earn anything they keep*. This phase introduces **end-of-match rewards**: the player is paid based on enemy troops defeated and damage dealt to the enemy tower. The reward is added to a **persistent** money balance (separate from the per-match income that resets each match).

Phase 8 will then let them spend that persistent money on upgrades.

## Scope

### In scope

- Track `troopsDefeated` and `towerDamageDealt` during a match (in `MatchState`).
- A `RewardSystem.computeReward(matchState, matchResult)` that returns a money figure (pure function — easy to unit-test).
- Add a persistent `money` field to `GameState`.
- On match end (win **or** lose), award the reward and persist.
- Result overlay shows the reward earned.

### Out of scope

- Spending the money (Phase 8).
- Different reward weights for different troop types (Phase 10 may revisit).

## Files

### New

```
src/game/systems/RewardSystem.ts
tests/unit/RewardSystem.test.ts
tests/e2e/phase-7-player-rewards.spec.ts
```

### Modified

```
src/game/types.ts                      # Extend MatchState with troopsDefeated, towerDamageDealt
src/game/systems/CombatSystem.ts       # Increment matchState.troopsDefeated when an enemy troop dies; matchState.towerDamageDealt when player troop damages enemy tower
src/game/scenes/MatchScene.ts          # On match:end, call RewardSystem; add to GameState.money; save; pass reward to overlay
src/state/GameState.ts                 # Add money: number (default 0); update defaultGameState()
src/state/migrations.ts                # Add migration v1 → v2 that initialises money to 0
src/ui/MatchResultOverlay.ts           # Show "Earned: $N"
src/ui/Hud.ts                          # Show persistent money (separate row from in-match income)
src/config/gameConfig.ts               # Add REWARD_PER_KILL, REWARD_PER_TOWER_DAMAGE
```

## Implementation notes

### `RewardSystem` (pure function)

```ts
export function computeReward(matchState: MatchState, _result: MatchResult): number {
  return Math.floor(
    matchState.troopsDefeated * REWARD_PER_KILL
      + matchState.towerDamageDealt * REWARD_PER_TOWER_DAMAGE
  );
}
```

Loss still earns money — playing earns money. Tune weights so winning is meaningfully more rewarding (you killed all their troops AND took down the tower).

```ts
export const REWARD_PER_KILL = 5;
export const REWARD_PER_TOWER_DAMAGE = 0.2;
```

A clean win on level 1 (~16 enemy kills + 500 tower damage) ≈ `16*5 + 500*0.2 = 180`. A loss where you killed half the wave and dealt half the tower's HP ≈ `8*5 + 250*0.2 = 90`.

### Tracking inside `CombatSystem`

When an enemy troop's HP drops to 0 due to player troop damage → `matchState.troopsDefeated++`.
When a player troop deals X damage to the enemy tower → `matchState.towerDamageDealt += X`.

Pass `matchState` into `CombatSystem.update(...)` so it has access. Don't reach into the scene.

### Save migration

Bump `CURRENT_VERSION` to 2. Add to `migrations.ts`:

```ts
function migrateV1ToV2(data: unknown): GameState {
  const v1 = data as { enemyLevel: number };
  return { ...v1, money: 0 };
}
```

Wire into the `migrate(fromVersion, data)` chain. This is the first real migration — make sure the unit test covers it.

### HUD layout

Two money displays:
- **Match income** (top-left, ticks up during match, resets per match) — already exists from Phase 4.
- **Bank** (top-right, persistent) — new in this phase.

Don't merge them; they are conceptually different and the player needs to see both.

## Acceptance criteria

- [ ] Match result overlay shows "Earned: $N" with N matching `troopsDefeated * REWARD_PER_KILL + towerDamageDealt * REWARD_PER_TOWER_DAMAGE`.
- [ ] Persistent money in the HUD increases by exactly the awarded amount on match end.
- [ ] Both winning and losing award money (loss is just typically lower).
- [ ] Reloading after a match preserves the persistent money.
- [ ] Existing saves from Phase 6 (only `enemyLevel`) load correctly via the v1→v2 migration with `money: 0`.
- [ ] Phase 0–6 tests still pass.

## Test plan

### Unit (`tests/unit/RewardSystem.test.ts`)

- Reward = 0 when no kills and no damage.
- Reward = expected total for a known `MatchState` + result.
- Reward is integer (`Math.floor` applied).

### E2E (`tests/e2e/phase-7-player-rewards.spec.ts`)

1. Start fresh save; persistent money = 0.
2. Spawn troops, win the match; assert overlay shows the expected reward and HUD persistent money matches.
3. Reload page; assert money preserved.
4. Trigger a quick loss (don't spawn anything; let enemy waves kill player tower); assert a small but non-zero reward (because some tower damage was dealt by enemy troops, but the player didn't earn for *taking* damage — only for *dealing* damage; if no damage was dealt the reward is 0, that's also correct).
5. Migration test: pre-seed `localStorage` with a v1 save (`{ version: 1, data: { enemyLevel: 3 } }`); load page; assert `enemyLevel: 3` and `money: 0` in `window.__game__` state.

## Verification

```bash
npm run test
npm run dev
npm run test:e2e
```
