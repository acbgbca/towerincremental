# Phase 0 — Project Skeleton

> **Read first**: [`docs/summary.md`](../summary.md) for the project overview, hard constraints, and architectural rules.

## Context

The repository is currently empty (only `start_prompt.md`, `package-lock.json`, and `docs/` exist). This phase establishes the development foundation: tooling, build system, test harness, PWA scaffolding, deployment configs, and a single boot scene that proves Phaser is wired up. **No game mechanics yet.**

The skeleton must be high-quality from day one because every later phase builds on it. Linting, type-checking, and tests must all pass in CI before this phase is considered done.

## Goal

A minimal, deployable Phaser 3 PWA skeleton that renders an empty battlefield with two static tower rectangles, with all tooling in place for the phases that follow.

## Scope

### In scope

- Project initialisation (`package.json`, `tsconfig.json`, `.gitignore`).
- Build tooling: Vite + `vite-plugin-pwa`.
- Code quality: ESLint (typescript-eslint), Prettier, TypeScript `strict: true`.
- Test harness: Vitest (unit) + Playwright (e2e). One smoke test for each.
- Folder skeleton matching `docs/summary.md` (empty placeholder files allowed where a folder would otherwise be empty).
- A single Phaser scene that draws the battlefield background and two coloured rectangles representing the player tower (left) and enemy tower (right).
- PWA manifest + icons (placeholder PNGs are fine) + service worker via `vite-plugin-pwa` in `autoUpdate` mode.
- Deployment configs: `deploy/nginx.conf.example`, `.github/workflows/ci.yml`, `.github/workflows/deploy-pages.yml`.
- README-style notes in `docs/` updated where relevant (do **not** create new top-level docs).

### Out of scope

- Any troop or combat logic.
- Any UI overlay beyond the canvas (no menus, no HUD).
- Save state (`SaveStore` arrives in Phase 6).
- Real artwork.

## Files to create

```
package.json
tsconfig.json
.gitignore
.eslintrc.cjs
.prettierrc
.prettierignore
vite.config.ts
vitest.config.ts
playwright.config.ts
src/
  main.ts
  index.html
  styles.css
  config/gameConfig.ts          # Just board dimensions + tower colours for now
  game/
    scenes/BootScene.ts
  render/
    palette.ts
    shapes.ts
public/
  manifest.webmanifest
  icons/icon-192.png            # Placeholder
  icons/icon-512.png            # Placeholder
deploy/
  nginx.conf.example
.github/workflows/
  ci.yml
  deploy-pages.yml
tests/
  unit/.gitkeep
  e2e/phase-0-skeleton.spec.ts
```

## Implementation notes

### `package.json` scripts (minimum)

```jsonc
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext .ts,.tsx",
    "format": "prettier --write .",
    "test": "vitest run",
    "test:e2e": "playwright test"
  }
}
```

### Dependencies

- Runtime: `phaser`
- Build / PWA: `vite`, `vite-plugin-pwa`, `typescript`
- Lint/format: `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `eslint-config-prettier`, `prettier`
- Tests: `vitest`, `@playwright/test`

### `vite.config.ts`

- `base: process.env.VITE_BASE ?? '/'` so GitHub Pages can deploy under a subpath (`VITE_BASE=/towerincremental/`).
- Register `VitePWA({ registerType: 'autoUpdate', manifest: { display: 'standalone', orientation: 'landscape' } })`.

### `BootScene.ts`

- Phaser scene sized 1280×720 (game world units), `Scale.FIT`, `autoCenter: CENTER_BOTH`, orientation locked landscape.
- Fill background with a "field" colour from `palette.ts`.
- Draw two filled rectangles — `playerTower` on the left, `enemyTower` on the right — using `shapes.drawTower(scene, side)`.
- That's it. No interactivity.

### `render/palette.ts` and `render/shapes.ts`

- `palette.ts` exports named colours (`FIELD`, `PLAYER`, `ENEMY`, etc.) — when SVG art lands later, this is where the tokens stay.
- `shapes.ts` exports primitive draw helpers (`drawTower`, eventually `drawTroop`). Scenes never call `scene.add.rectangle(...)` directly — they go through these helpers so the renderer is swap-friendly.

### `nginx.conf.example`

Serve `dist/` with:
- `index.html` → `Cache-Control: no-cache`.
- All other static assets → `Cache-Control: public, max-age=31536000, immutable`.
- SPA fallback (`try_files $uri $uri/ /index.html;`).

### GitHub Pages workflow

- On push to `main`: install, lint, test, build with `VITE_BASE=/<repo-name>/`, upload `dist/` as Pages artifact, deploy.

### Tests

- **Vitest smoke test** (in `tests/unit/`): trivial e.g. `expect(1 + 1).toBe(2)` — proves the runner works. (Real unit tests start arriving once we have utility functions.)
- **Playwright smoke test** (`tests/e2e/phase-0-skeleton.spec.ts`):
  1. Start the dev server (configured via `playwright.config.ts` `webServer`).
  2. Navigate to `/` on a 1280×720 viewport.
  3. Wait for the canvas to be visible.
  4. Read `window.__game__` (exposed by `main.ts` in dev/test) and assert two tower GameObjects exist with the expected colours / positions.

> Expose `window.__game__ = game` from `main.ts` only when `import.meta.env.DEV` or a `?test` query param is present. Never in production.

## Acceptance criteria

- [ ] `npm install` succeeds from a clean clone.
- [ ] `npm run lint` exits 0.
- [ ] `npm run test` exits 0.
- [ ] `npm run test:e2e` exits 0.
- [ ] `npm run build` produces a `dist/` with hashed asset filenames and a registered service worker.
- [ ] `npm run dev` opens a landscape canvas with a green field and two tower rectangles, on both desktop and a mobile-emulated viewport.
- [ ] `nginx -c $(pwd)/deploy/nginx.conf.example` serves `dist/` correctly (manual check).
- [ ] CI workflow on a PR runs lint + tests + build and reports green.
- [ ] Pages workflow successfully publishes to `<user>.github.io/towerincremental/` on push to `main`.

## Verification

```bash
npm install
npm run lint
npm run test
npm run test:e2e
npm run build
npm run preview   # confirm built output also renders the towers
```
