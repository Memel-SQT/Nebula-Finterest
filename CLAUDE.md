# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Finterest is a local, offline Electron desktop app that helps a single user visualize their monthly budget more clearly than with a simple calculator. It is explicitly **not** a fintech/investment app: no network calls, no market data, no bank connections. The renderer UI is in French; displayed amounts use EUR formatting.

## Commands

```bash
npm install                # install dependencies
npm run dev                 # run Vite + watched Electron rebuild + Electron shell together
npm run build                # build renderer (vite) then electron main/preload (tsup)
npm run typecheck           # tsc --noEmit
npm run lint                 # eslint over src/**/*.{ts,tsx} and tests/**/*.{ts,tsx}
npm test                     # jest (ts-jest, jsdom environment)
npx jest src/shared/budget.test.ts   # run a single test file
npm run dist                 # full production build + electron-builder (current OS)
npm run dist:win / dist:mac / dist:linux   # platform-specific installers, output to install/<platform>/
```

There is no `test:watch` script; pass Jest CLI flags directly (e.g. `npx jest --watch`) if needed.

## Architecture

Three-layer split enforced by TS path aliases (`@shared`, `@renderer`, `@electron`) and mirrored in both `tsconfig.json` and `vite.config.ts` / `jest.config.ts`:

- **`src/electron/`** — Electron main process. `main.ts` creates the `BrowserWindow` and registers all `ipcMain.handle` routes (`account:*`, `budget:*`). `preload.ts` exposes a single `window.finterest` bridge via `contextBridge` (context isolation on, node integration off) — this is the *only* surface the renderer can call into the main process through. `accounts.ts` (`AccountManager`) manages multiple local accounts: each account is a scrypt-hashed PIN record in `accounts.json`, with its own separate SQLite file (`finterest-<accountId>.sqlite`) and its own `BudgetStore` instance. `store.ts` (`BudgetStore`) owns one account's data using `sql.js` (SQLite compiled to WASM, not a native binding) — every mutation runs in an explicit `BEGIN IMMEDIATE`/`COMMIT`/`ROLLBACK` transaction and then serializes the whole DB back to disk via `persist()` (`database.export()` → `fs.writeFile`). There is no incremental/streaming persistence — every write rewrites the full file.
- **`src/shared/`** — Pure, framework-free modules used by both the main process and the renderer. `budget.ts` centralizes all budget math (`computeBudgetSummary`) and validation/sanitization (`sanitizeFixedExpense`, `sanitizeVariableExpense`, `validateBackupFile`) — this is the module to extend for any new calculation or data-shape rule, and the only one with a test file (`budget.test.ts`). `types.ts` and `accounts.ts` define the shared data contracts (`BudgetSnapshot`, `FixedExpense`, `VariableExpense`, `BackupFile`, `AccountBackup`, etc.) that flow across the IPC boundary.
- **`src/renderer/`** — React UI. `App.tsx` is a single top-level component covering account selection/login, the budgeting dashboard, and settings; `styles.css` holds one variable-driven theme (light by default, dark variant selected via OS color-scheme preference — not a manual toggle). No component library or router is used.

### Data flow

Renderer → `window.finterest.<method>()` (preload) → `ipcMain.handle` (main.ts) → `AccountManager` → active account's `BudgetStore` → sql.js DB → `persist()` to `finterest-<accountId>.sqlite` in Electron's `userData` path. Every mutating `BudgetStore` method returns the fresh `BudgetSnapshot`, so the renderer re-syncs state directly from each IPC call's return value rather than maintaining independent derived state.

### Backup/import

Export produces a single JSON `BackupFile`/`AccountBackup` (app name + version + ISO timestamp + full snapshot) written via a native save dialog; import reads a JSON file via a native open dialog, runs it through `validateBackupFile`, and replaces the active account's tables inside one transaction. A full account export currently contains only the active account — other local accounts on the same machine are not included in that file.

### Security posture (current, not final)

Local accounts use salted scrypt for PIN verification (`accounts.ts`) — this protects in-app access only. Database-at-rest encryption and full account recreation on import are explicitly noted as pending work (see `README.md`).

## Repo-specific conventions

- **Mandatory documentation updates**: `.github/copilot-instructions.md` and repo convention require that non-trivial changes update `README.md` (project overview, user guide, and light technical reference — this is what GitHub renders as the repo's landing page; there is no separate README.txt), `DEV_CHANGES.md` (new dated section at the top, technical/developer detail), and `PATCH_NOTES.md` (new version section at the top — the single clear, user-facing changelog; there is no separate USER_UPDATE_SUMMARY.txt) — check these files' existing structure before adding to them.
- **Styling work**: for renderer visual/layout/accessibility changes, follow `.github/agents/finterest-styling.agent.md` — preserve the warm/light theme as primary and the dark blue/violet declarations as an intentional secondary theme (do not delete them), keep IPC behavior and budget semantics untouched, define repeated colors/spacing as CSS variables, and validate with `npm run typecheck` / `npm run lint` / `npm run build` after changes.
- **Electron kept external**: the main-process bundle (tsup) marks `electron` external so packaged builds use Electron's built-in runtime instead of bundling it.
- Windows builds set `CSC_IDENTITY_AUTO_DISCOVERY=false` (unsigned code signing disabled) automatically via `npm run dist`; `.github/workflows/build-installers.yml` builds Windows/macOS/Linux artifacts on their native runners.
