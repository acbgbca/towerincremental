# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Tower Incremental — a mobile-browser tower-defence/incremental hybrid built as an installable PWA. Runs entirely client-side; state persists to `localStorage`. Same `dist/` artifact must work behind nginx **and** on GitHub Pages at a subpath. See `docs/summary.md` for the full design and `docs/tickets/phase-*.md` for per-phase requirements.

## Commands

```bash
npm run dev           # Vite dev server on http://localhost:5173 (--host)
npm run build         # tsc --noEmit + vite build → dist/
npm run preview       # serve the built dist/
npm run lint          # eslint . --ext .ts,.tsx
npm run format        # prettier --write .
npm run test          # vitest run  (unit, tests/unit/**/*.test.ts, node env)
npm run test:e2e      # playwright test (tests/e2e/**, auto-starts dev server)
```

Run a single test:
```bash
npx vitest run tests/unit/RewardSystem.test.ts
npx playwright test tests/e2e/phase-7-player-rewards.spec.ts
npx playwright test -g "earns money"
```

GitHub Pages deploy uses `VITE_BASE=/towerincremental/ npm run build` (see `.github/workflows/deploy-pages.yml`); the default `VITE_BASE` is `/`.

## Architecture

### Layered separation (the core rule)

Game logic, rendering, and UI are deliberately split so logic can be unit-tested headlessly and the visual layer can be swapped (placeholder shapes → SVG art) without rewriting systems.

```
src/
  config/      # All tunables — troop stats, income rate, wave defs, upgrade table.
               #   No magic numbers should live elsewhere.
  game/
    scenes/    # Phaser scenes (Boot, Match). Scenes orchestrate; they don't compute.
    entities/  # Troop, Tower — Phaser GameObjects implementing Damageable.
    systems/   # CombatSystem, WaveSystem, IncomeSystem, RewardSystem.
               #   Pure-ish: take state in, mutate it, no rendering.
    types.ts   # Shared domain types (TroopType, MatchState, WaveDefinition, …).
  state/       # GameState shape + SaveStore (versioned localStorage) + migrations.
  render/      # palette.ts, shapes.ts — the swap-point for SVG later.
  ui/          # DOM overlays drawn over the canvas: Hud, UpgradeScreen, ConfirmDialog.
```

Scenes call systems each `update(delta)`; systems mutate the `MatchState` / entity state; entities own their own `Phaser.GameObjects` and HP bars. UI overlays live in the DOM, not the canvas — they read `GameState` / `MatchState` and emit callbacks back to the scene.

### Save versioning

`SaveStore` writes `{ version, data }` (current version `4`, key `towerincremental:save`). On load, `migrations.ts` runs every `migrateVNToVN+1` step needed. **Always add a new migration when changing `GameState` shape — never bump version without one.** Defaulting fields silently is what causes save wipes.

### Stat scaling

Player and enemy troop stats both come from `effectivePlayerStats` / `effectiveEnemyStats` in `gameConfig.ts`, which apply a per-tier step (`ENEMY_LEVEL_STAT_STEP`) on top of base stats. Enemy level steps up on win; player tier steps up on prestige. Treat these helpers as the only source of truth for in-match stats.

### Test/debug query strings

`?test` and `?debug` toggle test affordances in `src/main.ts` and `src/ui/DebugSpawnButtons.ts`:
- `?test` exposes `window.__game__` and forces empty enemy waves so e2e specs control spawning deterministically.
- `?debug` shows the manual spawn / reset-save buttons.

Playwright specs rely on `?test` plus `window.__game__.scene.getScene('Match')` to drive the game directly.

## Development model

Work is organised into phases (`docs/tickets/phase-0-skeleton.md` through `phase-10-troop-types.md`). Each phase is a self-contained, testable mechanic with acceptance criteria; phases must be completed in order. When implementing a phase:

1. Read its ticket — acceptance criteria are authoritative.
2. Update `src/config/` first when introducing new tunables.
3. Add at least one Playwright spec for the new mechanic; previous-phase specs must still pass.
4. Prefer integration tests (Playwright) over unit tests. Unit tests (Vitest) are for utility/maths only — see existing `RewardSystem.test.ts`, `WaveSystem.test.ts`, `upgradeCost.test.ts`.

CI (`.github/workflows/ci.yml`) runs lint + unit + e2e + build on every push/PR.

## Browser-cache safety (called out because it has bitten the project before)

- Asset filenames are hashed by Vite — safe to cache forever.
- `index.html` must be `no-cache` (see `deploy/nginx.conf.example`).
- Service worker uses `autoUpdate` mode (`vite-plugin-pwa`).
- Schema changes go through `migrations.ts`, never a save wipe.
