Finterest

Finterest is a local, offline desktop app that helps a single user visualize their monthly budget more clearly than with a simple calculator.

Tech stack
- Electron for the desktop shell.
- TypeScript for application code.
- React for the renderer UI.
- SQL.js as the SQLite-compatible local persistence layer.
- Jest and React Testing Library for tests.
- Vite and tsup for build tooling.
- electron-updater for checking and installing application updates via GitHub Releases.

Project structure
- src/electron/ - Electron main process, preload bridge, and local database store.
- src/renderer/ - React UI, styles, and entry point.
- src/renderer/components/ - Extracted screens and shared UI atoms (account gate, calendar, loans, settings, profile).
- src/renderer/i18n.ts - French/English translation dictionaries and the language switch.
- src/renderer/theme.ts - Light/dark/system theme resolution and the `data-theme` toggle.
- src/shared/ - Shared types and budget calculations.
- tests/ - Test setup.
- assets/ - Logo and app icon sources.
- assets/finterest-logo.svg - Finterest F monogram used inline by the app UI.
- assets/app-icon.svg - Full-bleed source artwork rasterized into build/icon.png for the packaged app icon.
- build/icon.png - Generated 1024x1024 app icon consumed by electron-builder for macOS/Linux icon output.
- build/icon.ico - Hand-assembled multi-resolution (16-256px) Windows icon, built with png-to-ico since electron-builder's own PNG-to-ICO conversion produced a broken single-size file; referenced directly by build.win.icon.
- assets/icon.png - 512px icon referenced by BrowserWindow's `icon` option, so the running app window and taskbar show the Finterest mark instead of Electron's default (independent of the exe's own embedded icon resource).
- build/installer.nsh - Custom NSIS script that backs up local accounts before the Windows uninstaller removes them.
- install/windows/ - Windows NSIS installers.
- install/mac/ - macOS DMG installers.
- install/linux/ - Linux AppImage installers.
- install/README.txt - Distribution folder guide.
- .github/ - Project instructions.

Setup
- Prerequisite: Node.js 20 or newer.
- Install dependencies: npm install
- Run in development: npm run dev
- The dev command starts Vite plus a watched Electron rebuild so the desktop shell follows source changes.
- Build for production: npm run build
- Create installable artifacts: npm run dist
- Create a Windows installer: npm run dist:win; output goes to install/windows/.
- Create a macOS disk image: npm run dist:mac (on macOS); output goes to install/mac/.
- Create a Linux AppImage: npm run dist:linux (on Linux); output goes to install/linux/.
- Temporary Electron Builder output is kept out of the install folders; only distributable files belong there.
- Run lint checks: npm run lint

Usage basics
- Start the app with npm run dev during development or the packaged app after npm run dist.
- The local database is stored in the user data folder as finterest.sqlite.
- Use Export backup to write a single JSON backup file.
- Use Import backup to restore that JSON backup on another machine or after reinstalling Finterest.

Current notes
- The core budget calculation logic is centralized in src/shared/budget.ts.
- Backup files include the full snapshot of income, fixed expenses, and variable expenses.
- The renderer uses local alias paths for shared modules, and Vite is configured to resolve them.
- Electron is kept external in the main-process bundle so packaged builds use Electron's built-in runtime API.
- The renderer uses a single dark, premium theme (near-black surfaces, emerald accent, muted gold secondary accent) across the full interface; there is no light theme and no OS-preference-based switch. The `.github/agents/finterest-styling.agent.md` file predates this direction and still describes an older warm-light/dark-secondary theme — it should be refreshed to match before it is relied on for future styling work.
- The renderer is translated into French. `Budget simple` covers income, recurring subscriptions, and planned purchases; `Calcul avancé` provides an independent compound-interest estimate. Displayed amounts use EUR formatting.
- Planned local-account migration rule: a complete export will contain only the active account, including its profile settings and full budget. Other local accounts will not be included in that file.
- Local accounts now use salted scrypt PIN verification and separate budget files. This currently protects application access; database encryption at rest and full account recreation on import remain pending security work.
- When multiple accounts exist, startup shows account selection, a personalized welcome page, and a separate code login page. The sidebar is intentionally compact for the budget workflow.
- The Windows NSIS installation creates `Uninstall Finterest.exe` in the installed Finterest folder and adds the normal Windows uninstall entry. Electron Builder 24.13.3 does not support renaming this generated file to `uninstall.exe`.
- The renderer uses responsive layouts for desktop, tablet, and narrow windows, including stacked forms and a compact calendar.
- The simple budget includes a monthly `Calendrier` for active subscription payment days and predefined subscription categories with associated icons.
- Calendar entries use the selected subscription category and its icon, with previous/next month navigation.
- Subscriptions can be added directly from a selected calendar day using a focused name, price, and category form.
- Page changes use short fade transitions, with reduced-motion support.
- Windows packaging disables executable editing for unsigned builds, and npm run dist configures CSC_IDENTITY_AUTO_DISCOVERY=false automatically.
- The CI workflow in .github/workflows/build-installers.yml builds Windows, macOS, and Linux artifacts on their native runners.
- macOS production releases should be signed and notarized with Apple Developer credentials; the current CI output is unsigned.
- The renderer is split into src/renderer/components/ (account gate, calendar, loans, settings, shared atoms) with App.tsx acting as a thin orchestrator; this replaced the previous single large component file without changing the visual design.
- Fixed expenses (abonnements) now carry a Type distinguishing "Abonnement" (subscription) from "Prélèvement" (direct debit), shown as a badge and selectable when adding one; existing local databases gain this column automatically on first launch after the update.
- A new "Prêts" section tracks bank loans (amount borrowed, monthly payment, rate, remaining term); active loan payments are included in the "reste à vivre" calculation alongside abonnements/prélèvements.
- The interface language can be switched between French and English from the account screens and the Settings panel; the choice is stored locally per computer.
- Local accounts can be created and deleted from a dedicated "Gérer les comptes" screen reachable from account selection; deleting an account requires re-entering its PIN.
- Subscription category icons use the same monochrome symbol style as the sidebar navigation instead of color emoji.
- The packaged Windows build checks GitHub Releases for updates on launch via electron-updater and can install a downloaded update on request; macOS/Linux builds only surface update availability, since the current dmg/AppImage targets are not configured for a full silent update cycle.
- The Windows uninstaller (NSIS) writes a combined JSON backup of every local account to Documents\Finterest before deleting the app's local data folder (accounts.json and every account's SQLite file). This safety net is Windows-only; macOS and Linux packaging has no scripted uninstall step to hook into.
- The `customUnInit` NSIS macro used for the pre-uninstall backup is confirmed against the installed electron-builder 24.13.3 templates (`node_modules/app-builder-lib/templates/nsis/uninstaller.nsh`); a full `npm run dist:win` build succeeds with it. Actual install/uninstall execution could not be automated in this environment (blocked by an application-control policy on unsigned executables) and should be verified manually by running the built installer and its uninstaller.
- Accounts now support a profile picture and an editable display name. Avatars are stored as local files under the app's user data folder (avatars/<accountId>.<ext>), never embedded in accounts.json.
- A dedicated in-app "Profil" screen (reachable from the sidebar profile chip once logged in) lets the active user change their pseudonym and photo, and switch to a different local account without closing the app.
- The account selection and management screens show each account's avatar as a circle, falling back to a colored initial when no photo has been set.
- The interface was fully re-themed to a more premium palette (near-black surfaces, a single emerald accent, a muted gold secondary accent) in place of the previous copper/terracotta theme; component structure and behavior are unchanged. A corresponding light palette was added afterward (see below) — the renderer is no longer dark-only.
- Finterest has a new logo and application icon (assets/finterest-logo.svg, assets/app-icon.svg, build/icon.png), replacing the earlier blue/violet placeholder mark.
- The account selection screen shows accounts as a grid of circular avatar tiles with no name shown by default; the pseudonym appears on hover or keyboard focus. A dashed "+" tile in the same grid is the primary way to create another account; "Gérer les comptes" (create/delete) sits directly below it. It is shown whenever at least one account exists, not only with 2+ accounts.
- The BrowserWindow sets an explicit icon (assets/icon.png), so the app window and the taskbar icon while running show the Finterest mark rather than Electron's default. The desktop shortcut / Explorer / Start Menu icon still needs the exe's own icon resource embedded via rcedit, which requires `signAndEditExecutable: true` in package.json's `build.win` — currently `false` because rcedit's `winCodeSign` dependency fails to extract without symlink privilege on this machine (`Cannot create symbolic link`). Enable Windows Developer Mode or build from an elevated terminal, then flip that setting, to get the desktop icon too. build/icon.ico is already a correctly-formed multi-resolution icon ready for that switch.
- The app shows a short startup splash animation (src/renderer/components/SplashScreen.tsx, the F monogram drawing itself in) before the account gate; it respects prefers-reduced-motion. It sits in front of the existing account-selection routing rather than changing it.
- Updates can be checked manually from Settings ("Mises à jour" section) via a new `app:checkForUpdates` IPC handler, in addition to the automatic check on launch (Windows only, packaged builds only).
- Added a real light/dark/system theme: `src/renderer/theme.ts` (same pattern as `i18n.ts`) resolves `'system'` via `prefers-color-scheme`, listens for live OS changes, and applies the effective theme as `document.documentElement.dataset.theme` via `useLayoutEffect` (before paint, no flash). `styles.css` was fully audited so every color routes through a CSS custom property defined once on `:root` (light, the default) and overridden under `[data-theme="dark"]` — no hardcoded hex colors remain outside those two blocks. New tokens: `--accent-hover`, `--accent-glow`, `--on-accent` (button/badge text color, since the accent hue's contrast direction flips between the two themes), `--focus-ring`, `--shadow-strong`.
- Simplified several purely decorative rules for a flatter, more minimalist look: card backgrounds went from multi-stop gradients to a solid `var(--surface)` fill, page-level radial-gradient background flourishes (body, account gate, splash) were flattened to a solid `var(--page)`, and shadow opacity was reduced. Functional gradients (the budget-progress ring's conic-gradient, the logo mark's accent gradient) were kept.
- The Settings screen ("Sauvegarde" nav item) is reorganized into labeled sections — Apparence (theme + language), Données (export/import/database path), Mises à jour, Compte (a "Voir mon profil" shortcut into the existing Profil screen) — replacing the previous flat list of controls.
- The advanced compound-interest calculator (`AdvancedCalculator.tsx`) gained a monthly recurring investment field. The math switched from annual to monthly compounding throughout (needed for the monthly-contribution case) and the result now also reports the total amount contributed (capital + monthly × months) alongside the interest earned.
- Renderer cleanup: extracted the dashboard body (KPI cards, the overview insight panel, and the overview/fixed/variable/loans forms and lists) out of `App.tsx` into `src/renderer/components/Dashboard.tsx`, bringing `App.tsx` from 555 back down to ~440 lines of state/handlers/routing. Removed the orphaned root `icon.png` (1.3 MB, never referenced by the build config since the new logo was created). Rewrote `README.md` as a full user-facing guide (features, installation, usage) — GitHub renders it as the repository's landing page, and it previously was a one-line stub; `README.txt` remains the technical/developer reference.
- macOS and Linux packaged builds are not currently published or prioritized — `dist:mac`/`dist:linux` scripts and CI jobs exist and are exercised, but no release distributes them yet. Windows is the only actively distributed platform for now.
- See PATCH_NOTES.md for the latest user-facing changes.
