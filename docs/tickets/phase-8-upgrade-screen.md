# Phase 8 — Upgrade Screen

> **Read first**: [`docs/summary.md`](../summary.md). Builds on [Phase 7](./phase-7-player-rewards.md).

## Context

The player now earns persistent money but has nothing to spend it on. This phase adds the **upgrade screen**, shown after every match (win or lose) instead of the bare result overlay. The player can spend their bank on:

- **Income rate** — increases passive in-match income per second.
- **Tower max HP** — increases the player tower's starting HP for future matches.

Each upgrade has tiered cost (each purchase costs more than the last). All upgrades persist.

The "purchase next level" prestige button arrives in Phase 9 — leave a placeholder for it but don't implement.

## Goal

After a match ends, the player sees an upgrade screen showing their bank, the available upgrades with their next-tier costs, and a "Continue" button that starts the next match. Purchases are reflected immediately and persist across reloads.

## Scope

### In scope

- Replace the bare match result overlay with a full upgrade screen.
- Two upgrade tracks: `incomeRate` and `towerMaxHp`.
- Cost curve: tier `n` costs `BASE_COST * GROWTH ^ n` (typical idle-game shape).
- Persist `upgrades: { incomeRate: number, towerMaxHp: number }` in `GameState` (each is the current tier count).
- `MatchScene` reads these tiers at match start and applies them.
- A "Continue" button starts a new match against the current enemy level (incremented if last match was a win — Phase 6 behaviour preserved).
- A placeholder, **disabled** "Purchase Next Level" button in the corner with tooltip "Coming soon" (real in Phase 9).

### Out of scope

- Prestige reset (Phase 9).
- Unlocking troop types (Phase 10).

## Files

### New

```
src/ui/UpgradeScreen.ts
src/config/upgradeConfig.ts            # Upgrade definitions: cost curves + per-tier effect deltas
tests/unit/upgradeCost.test.ts         # Boundary tests on cost curve
tests/e2e/phase-8-upgrade-screen.spec.ts
```

### Modified

```
src/ui/MatchResultOverlay.ts           # Either delete or fold into UpgradeScreen — keep one entry-point
src/state/GameState.ts                 # Add upgrades: { incomeRate: number, towerMaxHp: number } (defaults 0/0)
src/state/migrations.ts                # v2 → v3: initialise upgrades to defaults
src/game/scenes/MatchScene.ts          # On match start, apply upgrades to INCOME_RATE and TOWER.maxHp
src/game/systems/IncomeSystem.ts       # Accept an effective rate, not a hardcoded constant
src/game/entities/Tower.ts             # Accept maxHp via constructor / setter
```

## Implementation notes

### Upgrade definitions

```ts
// src/config/upgradeConfig.ts
export interface UpgradeDef {
  id: 'incomeRate' | 'towerMaxHp';
  label: string;
  baseCost: number;
  growth: number;            // multiplicative cost growth per tier
  perTierDelta: number;      // amount added to the underlying stat per tier
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'incomeRate',  label: 'Income Rate',     baseCost: 50,  growth: 1.5, perTierDelta: 2   },
  { id: 'towerMaxHp',  label: 'Tower Max HP',    baseCost: 75,  growth: 1.6, perTierDelta: 100 },
];

export function nextCost(def: UpgradeDef, currentTier: number): number {
  return Math.floor(def.baseCost * Math.pow(def.growth, currentTier));
}

export function effectiveValue(def: UpgradeDef, base: number, currentTier: number): number {
  return base + def.perTierDelta * currentTier;
}
```

Tunable in one place. The cost curve and per-tier delta will need tuning later — the architecture must make that trivial.

### Applying upgrades at match start

In `MatchScene.startMatch()`:

```ts
const incomeRate  = effectiveValue(UPGRADES[0], INCOME_RATE,    gameState.upgrades.incomeRate);
const towerMaxHp  = effectiveValue(UPGRADES[1], TOWER.maxHp,    gameState.upgrades.towerMaxHp);
this.incomeSystem = new IncomeSystem(this.matchState, incomeRate);
this.playerTower  = new Tower(scene, 'player', towerMaxHp);
this.enemyTower   = new Tower(scene, 'enemy', TOWER.maxHp);  // unchanged
```

### `UpgradeScreen` (DOM)

- Layout: header with `Bank: $N`, two upgrade rows (label, current tier, next-tier cost, BUY button), a "Continue" button, a disabled "Purchase Next Level" placeholder.
- BUY:
  - Disabled when `bank < cost`.
  - On click: deduct cost, increment tier, save, re-render.
- Continue:
  - Closes the screen, calls `MatchScene.startMatch()` with current `GameState`.

### Save migration

Bump to v3. Add migration v2 → v3 that initialises `upgrades: { incomeRate: 0, towerMaxHp: 0 }`.

## Acceptance criteria

- [ ] After a match ends, the upgrade screen appears (replacing the bare result overlay).
- [ ] Bank, current tiers, and next-tier costs are all displayed correctly.
- [ ] Buying an upgrade deducts the right cost and increments the tier; UI re-renders immediately.
- [ ] BUY buttons disable when unaffordable.
- [ ] Cost grows per tier per the formula.
- [ ] After Continue, the next match has the upgraded income rate / tower HP applied.
- [ ] Upgrades persist across page reload (and don't break older saves — migration covers this).
- [ ] "Purchase Next Level" is visible but disabled with a "Coming soon" tooltip.
- [ ] Phase 0–7 tests still pass.

## Test plan

### Unit (`tests/unit/upgradeCost.test.ts`)

- `nextCost` at tier 0 = `baseCost`.
- `nextCost` grows multiplicatively (boundary: tier 0, 1, 5, 10).
- `effectiveValue` at tier 0 = base; at tier N = base + N * delta.

### E2E (`tests/e2e/phase-8-upgrade-screen.spec.ts`)

1. Trigger a match end with enough reward to afford one income-rate upgrade; confirm BUY enables, click it, confirm tier increments and bank decreases.
2. Click Continue; confirm the next match's HUD income ticks at the upgraded rate (sample money over a known interval).
3. Trigger another match end; confirm the upgrade is still applied; reload page; confirm the upgrade still applies on the next match.
4. Confirm "Purchase Next Level" is rendered but disabled.

## Verification

```bash
npm run test
npm run dev
npm run test:e2e
```
