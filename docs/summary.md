# Tower Incremental — Project Summary

## What we are building

**Tower Incremental** is a mobile-browser tower-defence / incremental hybrid, delivered as an installable Progressive Web App. Two towers face each other across a battlefield. Troops walk, fight, and die automatically; the player's role is **economic**: earn passive income, spawn troops, and between matches spend earned money on upgrades. Survive long enough and the player can "purchase the next level" — a prestige-style reset that permanently buffs their troops.

The game runs entirely in the browser — no server, no account, no network calls during play. State persists to `localStorage`. The same build artefact must work both behind a self-hosted nginx server and on GitHub Pages (subpath SPA).

## Game design

### Hierarchy

- **Match** — one combat session. Ends when either tower's HP hits zero.
- **Wave** — a burst of enemy troops within a match, separated by short breathers.
- **Troop** — a single unit. Has HP and damage. Walks toward the opposing tower; stops to attack when it meets an enemy troop or the enemy tower.

### Round of play (the core loop)

1. Player starts a match against the current enemy level.
2. Enemy spawns waves of troops on a fixed schedule.
3. Player accrues passive income; spends it to spawn their own troops.
4. Troops walk, collide with opposing troops (stop and trade attacks until one dies), or reach the opposing tower (stop and attack the tower).
5. Match ends when a tower falls.
6. Player receives money based on **enemy troops defeated** and **damage dealt to the enemy tower**.
7. Player spends money on upgrades: income rate, tower max HP, and (later) unlocking new troop types.
8. If the player won, the **enemy upgrades** for the next match (HP and damage both step up by a fixed amount).
9. Player may instead **purchase the next level** ("prestige"): all match-state progress resets (income rate, tower HP, unlocked troop types) but base troop HP and damage are permanently boosted by the same step the enemy uses.

### Troop types

The MVP introduces three troop types, but only one is unlocked at the start. The other two are unlock-purchases on the upgrade screen and are reset by prestige.

### Hard constraints

- Runs entirely in the web page; no backend.
- All state in the browser (`localStorage`).
- Deployable to nginx **and** GitHub Pages (SPA, may live at a subpath).
- Mobile-first, **landscape orientation only**.
- Installable PWA (manifest + service worker, offline-capable shell).
- Browser-cache-safe: bumping the deployed version must never strand a user on stale assets.

## Technology

| Concern | Choice |
|---|---|
| Language | TypeScript (strict) |
| Build | Vite |
| Game engine | Phaser 3 |
| UI overlays (menus, HUD bits, upgrade screen) | DOM/HTML over the canvas |
| Persistence | `localStorage` via a versioned `SaveStore` |
| PWA | `vite-plugin-pwa` (`autoUpdate`) |
| Lint/format | ESLint (typescript-eslint) + Prettier |
| Tests | Vitest (unit, narrow) + Playwright (integration, primary) |
| Deploy | Static `dist/` behind nginx, or via GitHub Actions to GitHub Pages |

## Architecture overview

The codebase is structured to keep **game logic** separated from **rendering** and **UI**, so the underlying logic can be unit-tested headlessly and the renderer can later be swapped (placeholder shapes → SVG art) without rewriting systems.

```
src/
  config/        # Tunables: troop stats, income rate, wave definitions
  game/
    scenes/      # Phaser scenes (Boot, Match, Menu)
    entities/    # Troop, Tower (Phaser GameObjects)
    systems/     # CombatSystem, WaveSystem, IncomeSystem, RewardSystem (pure-ish logic)
    types.ts     # Shared domain types
  state/         # GameState + SaveStore (versioned localStorage)
  ui/            # DOM overlays: Hud, UpgradeScreen, MainMenu
  render/        # palette.ts, shapes.ts — the swap-point for SVG later
  main.ts
  index.html
  styles.css
tests/
  e2e/           # Playwright integration tests (one spec per phase)
  unit/          # Vitest specs for utilities and boundary conditions
public/          # manifest, icons, static files
deploy/          # nginx config + GitHub Pages workflow
docs/
  summary.md     # This file
  tickets/       # phase-0-skeleton.md … phase-10-troop-types.md
```

### Architectural rules (KISS / DRY / SoC / SRP)

1. **Pure logic, applied rendering.** Systems compute outcomes (damage, deaths, spawns); scenes apply them to GameObjects. Pure logic is testable without spinning up a browser.
2. **One source of truth for tunables.** All numbers live in `src/config/`. No magic constants in scenes or entities.
3. **Renderer swap-point.** Anything visual goes through `src/render/`. Replacing shape primitives with SVG sprites later touches only that folder + asset loading.
4. **Save versioning from day one.** `SaveStore` writes `{ version, data }` and runs registered migrations on load. Adding a field never wipes a save.
5. **Integration tests over unit tests.** Per the project guideline: prefer Playwright specs that drive the running app. Use Vitest only for utilities (e.g. damage maths) and boundary conditions.

## Browser-cache safety

This is called out explicitly because the user has been bitten before:

- **Hashed asset filenames.** Vite emits `app.[hash].js`, `app.[hash].css` etc. — cache-forever safe.
- **`index.html` is `no-cache`.** Provided in `deploy/nginx.conf.example`; GitHub Pages already does the right thing for HTML.
- **Service worker in `autoUpdate` mode.** New versions install in the background; on next reload the user gets the new bundle. A small "Update available" toast appears in the HUD when a waiting SW is detected, so a player can opt to refresh immediately.
- **Save migration, not save wipe.** `SaveStore` versioning means schema changes never silently destroy a player's progress.

## Phase plan

The build is intentionally split into 11 phases (Phase 0 = skeleton + 10 mechanic phases the user proposed). Each phase is a self-contained, testable unit with its own ticket:

| # | Title | Ticket |
|---|---|---|
| 0 | Project skeleton | `docs/tickets/phase-0-skeleton.md` |
| 1 | Troops walk | `docs/tickets/phase-1-troops-walk.md` |
| 2 | Troop vs troop combat | `docs/tickets/phase-2-troop-combat.md` |
| 3 | Troop vs tower combat + match end | `docs/tickets/phase-3-tower-combat.md` |
| 4 | Player income + spawn cost | `docs/tickets/phase-4-income-spawn-cost.md` |
| 5 | Enemy waves | `docs/tickets/phase-5-enemy-waves.md` |
| 6 | Enemy upgrade on win + persistence | `docs/tickets/phase-6-enemy-upgrade.md` |
| 7 | Player earns money from results | `docs/tickets/phase-7-player-rewards.md` |
| 8 | Upgrade screen | `docs/tickets/phase-8-upgrade-screen.md` |
| 9 | Prestige (purchase next level) | `docs/tickets/phase-9-prestige.md` |
| 10 | Additional troop types | `docs/tickets/phase-10-troop-types.md` |

Phases must be completed in order — each one builds on the previous one's mechanics. Every phase ships:

- A working `npm run dev` build.
- At least one Playwright integration test for the phase's mechanic.
- All previous phase tests still passing.
- Updated ticket with acceptance criteria ticked.

## Definition of done (MVP)

- All 11 phase tickets complete with acceptance criteria met.
- `npm run lint && npm run test && npm run test:e2e && npm run build` green in CI.
- The built app runs on a phone-sized landscape viewport, persists state across reloads, and survives a deploy-version bump without leaving users on stale assets.
- Game can be played end-to-end: start a match → spawn troops → win/lose → upgrade → continue or prestige.
