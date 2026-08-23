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
- src/shared/ - Shared types and budget calculations.
- tests/ - Test setup.
- assets/ - Logo and app icon sources.
- assets/finterest-logo.svg - Finterest F monogram used inline by the app UI.
- assets/app-icon.svg - Full-bleed source artwork rasterized into build/icon.png for the packaged app icon.
- build/icon.png - Generated 1024x1024 app icon consumed by electron-builder for Windows/macOS/Linux icon output.
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
- The interface was fully re-themed to a darker, more premium palette (near-black surfaces, a single emerald accent, a muted gold secondary accent) in place of the previous copper/terracotta theme; component structure and behavior are unchanged.
- Finterest has a new logo and application icon (assets/finterest-logo.svg, assets/app-icon.svg, build/icon.png), replacing the earlier blue/violet placeholder mark.
- The account selection screen shows accounts as a grid of circular avatar tiles with no name shown by default; the pseudonym appears on hover or keyboard focus. A dashed "+" tile in the same grid is the primary way to create another account; "Gérer les comptes" (create/delete) sits directly below it.
- See PATCH_NOTES.md for the latest user-facing changes.
