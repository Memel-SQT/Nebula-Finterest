## [2026-08-23] - Finterest Change Session #33
- Files added: `src/renderer/theme.ts`, `src/renderer/components/Dashboard.tsx`.
- Files removed: `icon.png` (root, 1.3 MB, orphaned since the new logo was created).
- Files modified: `src/renderer/styles.css`, `src/renderer/App.tsx`, `src/renderer/i18n.ts`, `src/renderer/components/SettingsPanel.tsx`, `src/renderer/components/AdvancedCalculator.tsx`, `README.md`, `README.txt`, `DEV_CHANGES.md`, `PATCH_NOTES.md`, `USER_UPDATE_SUMMARY.txt`.
- **Light/dark/system theme**: new `src/renderer/theme.ts` mirrors the `i18n.ts` pattern — `useTheme()` reads/writes `localStorage['finterest-theme']` (default `'system'`), resolves `'system'` via `window.matchMedia('(prefers-color-scheme: dark)')` and live-updates on OS changes, and applies the effective theme via `document.documentElement.dataset.theme` inside `useLayoutEffect` (runs before paint, avoids a flash of the wrong theme). Wired into `App.tsx` alongside the existing `useLanguage()`.
- **Full CSS token audit** (`styles.css`): every color used to be hardcoded dark values; now `:root` defines a full light palette (default) and `[data-theme="dark"]` overrides it — verified zero hex colors remain outside those two blocks. Added `--accent-hover`, `--accent-glow`, `--on-accent` (replaces hardcoded button/badge text colors like `#04140c`, since the accent hue needs light text in dark mode but dark text in light mode for contrast), `--focus-ring`, `--shadow-strong`.
- **Minimalist simplification**: flattened decorative multi-stop gradients (card backgrounds, the body/account-gate/splash page backgrounds) to solid token-based fills; reduced shadow opacity; kept only the gradients that carry information (budget-ring conic-gradient, logo mark gradient).
- **Settings reorganized** (`SettingsPanel.tsx`): four labeled sections (Apparence: theme + language selectors; Données: export/import/database path; Mises à jour: existing check/install block; Compte: new "Voir mon profil" button wired to a new `onOpenProfile` prop from `App.tsx` that calls `setActiveView('profile')`). New `.settings-section`/`.settings-fields`/`.select-field` CSS classes replace the old single `.language-field`.
- **Advanced calculator gained a monthly investment option**, per user request: `AdvancedCalculatorForm` gained `monthlyInvestment`; the future-value formula switched from annual to monthly compounding throughout (`FV = capital × (1+i)^n + monthlyInvestment × ((1+i)^n − 1) / i`, `i` = monthly rate, `n` = months, with the `i = 0` edge case handled separately) so the lump sum and the recurring contribution compound on the same monthly cadence. The result panel now also shows total contributed (capital + monthly × months) in addition to interest earned.
- **App.tsx split**: extracted the KPI summary cards, the overview insight panel (balance ring + snapshot), and the overview/fixed/variable/loans forms-and-lists into `src/renderer/components/Dashboard.tsx` (a presentational component receiving snapshot/summary/forms/handlers as props). `App.tsx` dropped from 555 to ~440 lines, now holding state, IPC handlers, and view routing only.
- **`README.md` rewritten** as a complete user-facing guide (French): features, installation (Windows via Releases; macOS/Linux explicitly noted as planned but not currently available or prioritized, per user request), usage walkthrough, data/privacy note, links to `PATCH_NOTES.md`/`USER_UPDATE_SUMMARY.txt`/`README.txt`. Previously a one-line stub; this is what GitHub renders as the repo's landing page. `README.txt` keeps the technical/developer content.
- Validation: `npm run typecheck`, `npm run lint`, `npm test -- --runInBand`, and `npm run build` all pass. Smoke-tested the theme system via the Vite dev server: confirmed `document.documentElement.dataset.theme` and the resolved `--page`/`--accent`/`--ink`/`--on-accent` tokens flip correctly when `localStorage['finterest-theme']` is set to `'light'` vs `'dark'` and the page is reloaded, with no console errors beyond the expected missing-`window.finterest`-bridge ones, and confirmed the account-gate DOM structure is unaffected (same elements, only colors changed).
- Not yet done this session: creating a GitHub Release with a freshly rebuilt Windows installer (requested by the user) — pending a final rebuild and confirmation of the version/tag before publishing anything public.

## [2026-08-23] - Finterest Change Session #32
- Files added: `src/renderer/components/SplashScreen.tsx`.
- Files modified: `src/renderer/App.tsx`, `src/renderer/styles.css`, `src/renderer/i18n.ts`, `src/renderer/components/SettingsPanel.tsx`, `src/electron/main.ts`, `src/shared/global.d.ts`, `src/electron/preload.ts`, `README.txt`, `DEV_CHANGES.md`, `PATCH_NOTES.md`, `USER_UPDATE_SUMMARY.txt`.
- Added a startup splash animation (`SplashScreen.tsx`): the F monogram draws itself in (SVG `stroke-dasharray`/`stroke-dashoffset` animation on each path), the gold accent dot pops in, then the app name/tagline fade in, held briefly, then the whole overlay fades out. Runs for ~1.9s (or ~250ms under `prefers-reduced-motion: reduce`, on top of the existing global reduced-motion override that collapses all animation/transition durations). `App.tsx` renders it before anything else via a `showSplash` state flag; account loading (`loadAccounts()`) already runs in parallel during the splash, so by the time it fades out `authStage` is already resolved — the splash also incidentally hides the brief IPC round-trip instead of showing a loading flash.
- The account-selection screen being the default landing page (requested again this session) was already fixed in Session #31 (`loadAccounts()` routes to `select` whenever any account exists); the splash now sits in front of that already-correct routing rather than needing its own logic.
- Added a manual "check for updates" control, requested as "un menu pour vérifier les maj": new `app:checkForUpdates` IPC handler (`main.ts`) triggers `autoUpdater.checkForUpdates()` on a packaged app (reusing the existing `update:status` event listeners from Session #29, so the same status flows through), or immediately reports `not-available` in dev mode where there's no published build to check against. Surfaced as a "Vérifier les mises à jour" button plus a status line in a new "Mises à jour" section of `SettingsPanel.tsx`, with a "Redémarrer et installer" action once a Windows update has actually downloaded. Also fixed `setUpAutoUpdater`'s Windows branch to explicitly set `autoDownload = true` (matches electron-updater's default, made explicit for clarity now there's a second, manual entry point into the same check).
- Validation: `npm run typecheck`, `npm run lint`, `npm test -- --runInBand`, and `npm run build` all pass. Smoke-tested the splash-to-account-gate handoff via the Vite dev server: confirmed the splash renders first (logo + tagline, no `window.finterest` errors beyond the expected missing-bridge ones), then after ~2.5s the DOM correctly shows the account gate underneath. The manual update-check button could not be exercised end-to-end (needs a packaged, published build) — reviewed by hand instead.

## [2026-08-23] - Finterest Change Session #31
- Files added: `assets/icon.png`, `build/icon.ico`.
- Files modified: `src/renderer/App.tsx`, `src/renderer/components/AccountGate.tsx`, `src/renderer/styles.css`, `src/electron/main.ts`, `package.json`, `README.txt`, `DEV_CHANGES.md`, `PATCH_NOTES.md`, `USER_UPDATE_SUMMARY.txt`.
- **Fixed the account picker not appearing**: `App.tsx`'s `loadAccounts()` only routed to the new avatar-grid `select` stage when 2+ accounts existed (`nextAccounts.length > 1 ? 'select' : ... === 1 ? 'login' : 'create'`), so anyone with exactly one account — the common case — never saw it and went straight to the old `login` form. Now routes to `select` whenever at least one account exists (`nextAccounts.length > 0 ? 'select' : 'create'`).
- **Added more animation** to `AccountGate`, per user request: stage transitions now replay a fade/slide-up entrance (`.account-stage`, `key={stage}` forces a remount so the CSS animation retriggers on every stage change, not just first mount); account tiles get a staggered pop-in on the grid (`tile-pop-in`, `:nth-child` delays), a stronger hover/focus state (avatar scales up with a gold glow ring, label slides up while fading in, tile lifts slightly, press feedback via `:active`), and the `+` tile rotates on hover; `.account-card` now smoothly transitions its width when switching between the wide picker/manage stages and the narrower forms.
- **Investigated and fixed the app icon showing Electron's default**, in two parts:
  - `src/electron/main.ts`'s `BrowserWindow` never set an `icon` option, so both dev mode and the packaged app's *running window* (title bar, and the taskbar icon while running, which Windows derives from the window's live HICON via `WM_SETICON`) always used Electron's built-in icon. Added `icon: path.join(__dirname, '../../assets/icon.png')` (new `assets/icon.png`, rasterized from `assets/app-icon.svg`) and fixed `backgroundColor` (was still the old theme's `#f4efe8`, a stale light flash against the new dark theme — now `#05070a`). Verified the packaged `app.asar` contains `assets/icon.png` at the path this relative reference expects.
  - The **desktop shortcut / Explorer / Start Menu icon** (the exe's static PE resource) is set by `rcedit`, which electron-builder only runs when `signAndEditExecutable` is not `false`. It's `false` here — set in Session #4 to work around `winCodeSign` failing to extract (`Cannot create symbolic link`) when unpacked without symlink privilege. That underlying limitation still reproduces on this machine (verified by temporarily flipping it to `true` and reproducing the exact same error, then reverting), so the static exe icon cannot be embedded by the automated build in this environment. This needs the user to either enable Windows Developer Mode (Settings → Privacy & security → For developers) or run `npm run dist:win` from an elevated terminal once, then set `signAndEditExecutable: true` in `package.json`.
  - Along the way, found and fixed a real bug in the icon asset itself: electron-builder's own PNG→ICO conversion (when given `build/icon.png`, a single 1024×1024 PNG) silently produced a broken single-resolution `.ico` (only a 256×256 PNG-compressed frame, 5KB) that even fails to load via .NET's `System.Drawing.Icon` — this is now moot for the exe (since `signAndEditExecutable: false` skips icon embedding entirely) but was fixed anyway for when that setting can be re-enabled: `build/icon.ico` is now hand-built with `png-to-ico` from 7 rasterized sizes (16/24/32/48/64/128/256), verified to load correctly, and referenced directly via `"icon": "build/icon.ico"` in `package.json`'s `build.win`, bypassing electron-builder's own from-PNG conversion.
- Validation: `npm run typecheck`, `npm run lint`, `npm test -- --runInBand`, and `npm run build` pass. Rebuilt `install/windows/Finterest Setup 0.1.0.exe` twice while diagnosing (once per icon fix); extracted the packaged exe's embedded icon via .NET `Icon.ExtractAssociatedIcon` both times to confirm the desktop/Explorer icon issue is real and unresolved pending the symlink-privilege fix above — do not assume it's fixed without re-testing after enabling Developer Mode.

## [2026-08-23] - Finterest Change Session #30
- Files modified: `src/renderer/components/AccountGate.tsx`, `src/renderer/components/atoms.tsx`, `src/renderer/styles.css`, `README.txt`, `DEV_CHANGES.md`, `PATCH_NOTES.md`, `USER_UPDATE_SUMMARY.txt`.
- Redesigned the account selection screen (`AccountGate.tsx`, `select` stage) as a "who's using this" style picker: accounts render as a wrapping grid of circular avatar tiles (`.account-grid`/`.account-tile`, new `avatar-xl` size on the shared `Avatar` component) with no name label shown by default — the pseudonym fades in on hover/keyboard focus (`.account-tile-label`), addressing the discoverability gap where the previous list-row layout always showed names. Added a dashed "+" tile in the same grid as the primary way to create another account, replacing the separate "Créer un autre compte" text button; the existing "Gérer les comptes" link (leading to the already-built create/delete management stage from Session #28) remains directly below the grid.
- The account card widens (`account-card-wide`, 560px vs the normal 430px) on the `select` and `manage` stages only, to give the tile grid room without affecting the narrower login/create/welcome/profile forms.
- No IPC, data model, or account-management logic changed — this is a renderer-only follow-up to Session #28's account management feature, aimed at making it visually discoverable and giving the selection screen the requested photo-grid-with-hover-name behavior.
- Validation: `npm run typecheck`, `npm run lint`, `npm test -- --runInBand`, and `npm run build` all pass. Could not visually exercise the `select` stage in this environment (it requires 2+ real accounts behind a working Electron `window.finterest` bridge, unavailable when smoke-testing via the bare Vite dev server); reviewed the JSX/CSS diff by hand instead.

## [2026-08-23] - Finterest Change Session #29
- Files added: `src/renderer/components/ProfileScreen.tsx`, `assets/app-icon.svg`, `build/icon.png`.
- Files modified: `src/shared/accounts.ts`, `src/electron/accounts.ts`, `src/electron/main.ts`, `src/electron/preload.ts`, `src/shared/global.d.ts`, `src/renderer/App.tsx`, `src/renderer/i18n.ts`, `src/renderer/components/atoms.tsx`, `src/renderer/components/AccountGate.tsx`, `src/renderer/styles.css`, `assets/finterest-logo.svg`, `package.json`, `README.txt`, `DEV_CHANGES.md`, `PATCH_NOTES.md`, `USER_UPDATE_SUMMARY.txt`.
- Added profile customization: `LocalAccountSummary` gained `avatarUrl?`; `AccountManager` (`src/electron/accounts.ts`) now manages a `userData/avatars/` folder, computes `file://` URLs via `pathToFileURL` for the renderer (never exposing raw filesystem paths), and adds `renameActive(name)` and `setActiveAvatar(sourceFilePath)` (copies the chosen image, replacing any previous avatar file). New IPC handlers `account:rename` and `account:chooseAvatar` (the latter opens a native image-file picker) are exposed through `preload.ts`/`global.d.ts`.
- Added a shared `Avatar` component (`atoms.tsx`) — renders the account's photo as a circle, or a colored initial when none is set — reused in the account selection/management screens (`AccountGate.tsx`) and the new sidebar profile chip.
- Added a dedicated post-login "Profil" screen (`ProfileScreen.tsx`, new `profile` entry in `ActiveView`) for editing the pseudonym and photo, and a "Changer de compte" action that calls the existing `lockAccount()` IPC, clears local state, and returns to `AccountGate`. Reachable via a new sidebar profile chip (avatar + name) and a "Profil" nav item.
- Full visual re-theme of `src/renderer/styles.css`: replaced the copper/terracotta dark palette with a darker, more premium palette (near-black `--page`/`--surface`, a single emerald `--accent`, a muted gold `--gold` secondary accent used for highlights, active states, and the fixed-expense/remaining accents), refined borders/shadows, and new rules for the avatar, profile chip, and profile screen. No component structure or DOM class contract changed beyond what sections above required, so this was a pure visual pass on top of the prior session's structural refactor.
- New logo and app icon: `assets/finterest-logo.svg` (in-app monogram, small transparent-friendly rounded square) was redrawn in the new emerald/gold palette; a new `assets/app-icon.svg` (1024×1024, full-bleed, opaque background — required for OS icon masks) was authored and rasterized to `build/icon.png` via `@resvg/resvg-js`, installed and used ad hoc with `npm install --no-save`/`npm uninstall --no-save` so it never became a project dependency. `package.json`'s `build.win`/`build.mac`/`build.linux` now explicitly set `"icon": "build/icon.png"` rather than relying on electron-builder's default `buildResources` resolution.
- Verified the pre-uninstall backup NSIS hook against the installed electron-builder 24.13.3 source: `customUnInit` (used in `build/installer.nsh`, added last session) is a real macro, inserted by `node_modules/app-builder-lib/templates/nsis/uninstaller.nsh` inside `un.onInit`, which runs before the `un.install` section's `RMDir /r "$APPDATA\${APP_FILENAME}"` — confirms the ordering assumption from Session #28 was correct.
- Ran `npm run dist:win` end-to-end: build succeeded, produced `install/windows/Finterest Setup 0.1.0.exe`, generated `.icon-ico` from `build/icon.png`, and emitted `latest.yml` (confirms the `electron-updater`/GitHub publish config is wired correctly). Attempting to actually run the built installer/uninstaller from this automated environment was blocked by a Windows application-control policy (AppLocker/WDAC) rejecting the unsigned executable — this could not be worked around and was not bypassed. Real install/uninstall/backup behavior therefore still needs manual verification by a human running `install/windows/Finterest Setup 0.1.0.exe` and its generated uninstaller interactively.
- While investigating this, found a pre-existing real Finterest install with one account ("Noa Rodrigues") and live budget data in `%APPDATA%\Finterest` on the dev machine, unrelated to this session's changes. Confirmed with the user it was disposable test data before any further local testing.
- Validation: `npm run typecheck`, `npm run lint`, `npm test -- --runInBand` (3/3 passing, unchanged from Session #28), and `npm run build` all pass. Manually smoke-tested the re-themed renderer via the Vite dev server (no Electron bridge) — confirmed via `getComputedStyle` that `--accent`/`--gold`/`--page` resolve to the new palette and that the account-creation screen still renders with the expected structure and no console errors beyond the environment's missing `window.finterest` bridge. `npm run dist:win` build succeeded; interactive install/uninstall verification is pending (see above).

## [2026-08-23] - Finterest Change Session #28
- Files added: `src/renderer/i18n.ts`, `src/renderer/constants.ts`, `src/renderer/components/atoms.tsx`, `src/renderer/components/AccountGate.tsx`, `src/renderer/components/SubscriptionCalendar.tsx`, `src/renderer/components/AdvancedCalculator.tsx`, `src/renderer/components/SettingsPanel.tsx`, `src/renderer/components/LoansPanel.tsx`, `build/installer.nsh`.
- Files modified: `src/renderer/App.tsx`, `src/renderer/styles.css`, `src/shared/types.ts`, `src/shared/budget.ts`, `src/shared/budget.test.ts`, `src/shared/global.d.ts`, `src/electron/store.ts`, `src/electron/accounts.ts`, `src/electron/main.ts`, `src/electron/preload.ts`, `package.json`, `README.txt`, `DEV_CHANGES.md`, `PATCH_NOTES.md`, `USER_UPDATE_SUMMARY.txt`.
- Restructured the renderer: `App.tsx` (previously 447 lines, a single component tree) is now a thin state/IPC orchestrator; screens and shared UI atoms moved into `src/renderer/components/` and `src/renderer/constants.ts`. The visual design is unchanged — this was a pure structural extraction. As part of this, the fragile `.view-fixed`/`.view-variable` `:nth-child` CSS show/hide rules in `styles.css` were removed, since each view now renders only its own JSX subtree instead of relying on DOM-position selectors.
- Added a `Loan` data model (`src/shared/types.ts`) and a `loans` SQLite table (`src/electron/store.ts`), with `addLoan`/`toggleLoan`/`deleteLoan` IPC handlers mirroring the existing fixed-expense CRUD pattern. `computeBudgetSummary` (`src/shared/budget.ts`) now adds `totalLoanPayments` (sum of active loans' monthly payments) into `totalExpenses`/`remainingIncome`. A new "Prêts" nav item and `LoansPanel.tsx` expose this in the UI. Backups (`BackupFile`) include `loans` and remain readable without a version bump (missing `loans` defaults to `[]`).
- Added a `kind: 'subscription' | 'directDebit'` field to `FixedExpense`, exposed as a Type selector in the fixed-expense form, the calendar quick-add form, and the calendar day view, and shown as a badge in the fixed-expenses list. `store.ts` now runs a one-time schema migration (`PRAGMA table_info` check + `ALTER TABLE fixed_expenses ADD COLUMN kind ...`) so existing local databases pick up the column without losing data; `sanitizeFixedExpense` defaults missing/invalid `kind` to `'subscription'` for backward compatibility with older records and backups.
- Added French/English language switching (`src/renderer/i18n.ts`): two compile-time-checked dictionaries keyed by a shared `TranslationKey` union, no external i18n library. The active language is stored in `localStorage` (`finterest-language`, default `fr`) and is available before login so the account screens translate too. Error messages that cross the IPC boundary (`accounts.ts`, `store.ts`) now throw stable `ERR_*` codes instead of French sentences; the renderer maps them back to a localized message via `translateError()`, falling back to a generic per-action message for unrecognized codes.
- Added account management: `AccountManager.delete(id, pin)` (`src/electron/accounts.ts`) verifies the target account's PIN, removes its `accounts.json` entry, and deletes its `finterest-<id>.sqlite` file. Exposed via a new `account:delete` IPC handler and a "Gérer les comptes" screen (`AccountGate.tsx`, new `manage` stage) reachable from account selection, listing every account with an inline PIN-confirmed delete action and a path back to account creation.
- Removed the color emoji from `subscriptionCategories` (`src/renderer/constants.ts`); categories now use the same monochrome Unicode glyph style already used for sidebar navigation icons (⌂ ▤ ▶ ⇄ ▣ ✚ •).
- Added `electron-updater` (GitHub Releases provider, `Memel-SQT/Finterest`, configured in `package.json`'s `build.publish`). On a packaged Windows build, `main.ts` calls `checkForUpdatesAndNotify()` on launch; on macOS/Linux it only checks and surfaces availability (`autoDownload = false`), since the current `dmg`/`AppImage` targets aren't configured for a full silent update cycle. Update state is relayed to the renderer over a new `update:status` IPC event, shown as a dismissible banner with a "Redémarrer et installer" action once a Windows update has downloaded (`app:installUpdate` → `autoUpdater.quitAndInstall()`).
- Added a pre-uninstall backup safety net, Windows-only: `package.json`'s `build.nsis` now sets `deleteAppDataOnUninstall: true` and `include: "build/installer.nsh"`. The new `customUnInit` NSIS macro runs the still-installed app with `--backup-before-uninstall=<path>` before the default uninstall deletes `%APPDATA%\Finterest`; `main.ts` detects that flag at startup, runs headlessly (no window), calls the new `AccountManager.exportAllForBackup()` (iterates every local account without requiring its PIN, since disk access is already implied at uninstall time) and writes a combined `FullBackupFile` JSON to `Documents\Finterest\finterest-uninstall-backup.json`, then exits. macOS (`dmg`) and Linux (`AppImage`) have no installer-driven uninstall step to hook into, so this feature does not extend to them.
- Notes/limitations carried over from this session: the exact electron-builder NSIS macro name (`customUnInit`) should be re-confirmed against the installed electron-builder 24.13.3 docs on the next Windows packaging pass, since it was not exercised through an actual `npm run dist:win` in this session. Category labels are stored as free text at the language active when an item is created (like the pre-existing variable-expense category field), so switching language later does not retroactively retranslate already-saved category names — only UI chrome is guaranteed to retranslate live.
- Validation: `npm run typecheck`, `npm run lint`, `npm test -- --runInBand` (3/3 passing, including new loan-total and `kind`-default cases), and `npm run build` all pass. Manually smoke-tested the restructured renderer by loading the Vite dev server directly in a browser (without the Electron preload bridge) and confirmed the account-creation screen renders with the expected French copy and DOM structure, matching the pre-refactor layout. `npm run dist:win`, the auto-updater, and the uninstall backup script were not exercised end-to-end in this session (they require a packaged Windows build).

## [2026-08-22] - Finterest Change Session #27
- Files modified: `src/renderer/styles.css`, `README.txt`, `DEV_CHANGES.md`, `PATCH_NOTES.md`, `USER_UPDATE_SUMMARY.txt`.
- Improved responsive behavior for desktop, tablet, and narrow mobile-like windows.
- Added fluid workspace spacing, compact navigation behavior, stacked forms, responsive calendar sizing, and wrapping action rows.
- Preserved the account flow, budget semantics, and desktop layout.
- Validation: `npm run build:renderer`, `npm run typecheck`, `npm run lint`, and renderer diagnostics pass.

## [2026-08-22] - Finterest Change Session #26
- Files modified: `src/renderer/styles.css`, `README.txt`, `DEV_CHANGES.md`, `PATCH_NOTES.md`, `USER_UPDATE_SUMMARY.txt`.
- Restyled the local account selection and login surface with a dark anthracite treatment, warm ivory typography, subdued fields, and copper accents.
- Kept the main budget workflow minimal and readable while making the account gate visually distinct.
- No account, budget, persistence, IPC, or backup behavior changed.
- Validation: `npm run build:renderer` passes without CSS warnings. Full checks follow.

## [2026-08-22] - Finterest Change Session #25
- Files modified: `package.json`, `README.txt`, `DEV_CHANGES.md`, `PATCH_NOTES.md`, `USER_UPDATE_SUMMARY.txt`.
- Verified that Electron Builder 24.13.3 does not support the `uninstallerName` option. The standard generated `Uninstall Finterest.exe` remains the supported uninstaller and is registered with Windows during installation.
- The attempted unsupported option was removed before the final rebuild.

## [2026-08-22] - Finterest Change Session #24
- Files modified: `src/renderer/App.tsx`, `src/renderer/styles.css`, `README.txt`, `DEV_CHANGES.md`, `PATCH_NOTES.md`, `USER_UPDATE_SUMMARY.txt`.
- Added a short fade-and-rise transition when changing application pages or calculation modes.
- Added a subtle scale fade when the account access card appears.
- Added reduced-motion overrides so users who request less motion see no entrance animations.
- No budget, account, IPC, persistence, or backup behavior changed.
- Validation: `npm run build:renderer` passes without CSS warnings. Full checks follow.

## [2026-08-22] - Finterest Change Session #23
- Files modified: `src/renderer/App.tsx`, `src/renderer/styles.css`, `README.txt`, `DEV_CHANGES.md`, `PATCH_NOTES.md`, `USER_UPDATE_SUMMARY.txt`.
- Added direct subscription creation from the calendar by selecting a day and completing a focused form.
- Subscription payment day is now selected from the calendar rather than entered manually in that workflow.
- Reworked the visual theme with a deep charcoal navigation area, warmer paper surfaces, clearer spacing, and distinct calendar states.
- Preserved existing account, budget, persistence, and backup behavior.
- Validation: `npm run build:renderer` passes without CSS warnings; full typecheck, lint, and tests follow.

## [2026-08-22] - Finterest Change Session #22
- Files modified: `src/renderer/styles.css`, `src/renderer/App.tsx`, `README.txt`, `DEV_CHANGES.md`, `PATCH_NOTES.md`, `USER_UPDATE_SUMMARY.txt`.
- Refined the subscription calendar presentation and ensured category icons are visible in calendar entries and lists.
- Added predefined category selection with icons, calendar month navigation, responsive sizing, and visible select focus states.
- No persistence or data model migration was required.
- Validation: `npm run typecheck`, `npm run lint`, `npm test -- --runInBand`, and `npm run build:renderer` pass.

## [2026-08-22] - Finterest Change Session #21
- Files modified: `src/renderer/App.tsx`, `src/renderer/styles.css`, `README.txt`, `DEV_CHANGES.md`, `PATCH_NOTES.md`, `USER_UPDATE_SUMMARY.txt`.
- Added a dedicated monthly calendar page showing active subscriptions on their payment days.
- Added predefined subscription categories with associated icons and displayed those icons in subscription and planned-purchase lists.
- Added previous/next month navigation and responsive calendar sizing.
- Validation: `npm run typecheck`, `npm run lint`, `npm test -- --runInBand`, and `npm run build:renderer` pass. Windows packaging follows.

## [2026-08-22] - Finterest Change Session #20
- Files modified: `src/renderer/styles.css`, `README.txt`, `DEV_CHANGES.md`, `PATCH_NOTES.md`, `USER_UPDATE_SUMMARY.txt`.
- Rebalanced the light theme toward deeper ivory and greige surfaces so the application no longer reads as overly bright.
- Strengthened borders and shadows while preserving the dark secondary theme.
- No renderer behavior, account handling, budget calculation, or persistence behavior changed.
- Validation: `npm run build:renderer`, `npm run typecheck`, and `npm run lint` pass. Windows packaging follows.

## [2026-08-22] - Finterest Change Session #19
- Files modified: `src/renderer/styles.css`, `README.txt`, `DEV_CHANGES.md`, `PATCH_NOTES.md`, `USER_UPDATE_SUMMARY.txt`.
- Darkened the overly bright light-theme surfaces and strengthened borders across the full UI.
- Rebuilt the Windows installer after closing stale development instances that had locked the unpacked Electron files.
- Validation: `npm run build:renderer`, `npm run typecheck`, `npm run lint`, and `npm run dist:win` pass.
- Windows installer refreshed at `install/windows/Finterest Setup 0.1.0.exe`.

## [2026-08-22] - Finterest Change Session #18
- Files modified: `src/renderer/styles.css`, `README.txt`, `DEV_CHANGES.md`, `PATCH_NOTES.md`, `USER_UPDATE_SUMMARY.txt`.
- Reduced the brightness of the light theme across the page background, sidebar, cards, fields, account screen, selectors, and list items.
- Increased border contrast and shadow depth so grouped surfaces are easier to distinguish without switching to a dark theme.
- Preserved the existing dark theme variant and all application behavior.
- Validation: `npm run build:renderer` passes without CSS warnings. Full validation and Windows packaging follow.

## [2026-08-22] - Finterest Change Session #17
- Files modified: `src/renderer/App.tsx`, `src/renderer/styles.css`, `README.txt`, `DEV_CHANGES.md`, `PATCH_NOTES.md`, `USER_UPDATE_SUMMARY.txt`.
- Added separate account selection, welcome, and login screens. Selecting an account now displays `Bonjour <nom>` before requesting its code.
- Reduced the sidebar width and refined account choices, controls, surfaces, contrast, and responsive behavior.
- Validation: `npm run typecheck`, `npm run lint`, and `npm run dist:win` pass.
- Windows installer rebuilt at `install/windows/Finterest Setup 0.1.0.exe`.

## [2026-08-22] - Finterest Change Session #16
- Files added: `src/shared/accounts.ts`, `src/electron/accounts.ts`.
- Files modified: `src/electron/main.ts`, `src/electron/store.ts`, `src/electron/preload.ts`, `src/shared/global.d.ts`, `src/renderer/App.tsx`, `src/renderer/styles.css`, `README.txt`, `DEV_CHANGES.md`, `PATCH_NOTES.md`, `USER_UPDATE_SUMMARY.txt`.
- Added local account creation, account selection, PIN verification using scrypt, separate SQLite-compatible budget files per account, and a locked entry screen.
- Added active-account backup metadata so the current account identity and budget are included in its export.
- Refined the account gate UI and completed the French UX pass.
- Important limitation: the current implementation protects access through Electron and stores account PINs as salted hashes, but the per-account SQLite files are not yet encrypted at rest. A later migration is required for full disk-level database protection and account recreation during import.
- Validation: `npm run typecheck`, `npm run lint`, `npm test -- --runInBand`, `npm run build`, and `npm run dist:win` pass.
- Windows installer rebuilt at `install/windows/Finterest Setup 0.1.0.exe`.

## [2026-08-22] - Finterest Change Session #15
- Files modified: `README.txt`, `DEV_CHANGES.md`, `PATCH_NOTES.md`, `USER_UPDATE_SUMMARY.txt`.
- Recorded the selected account migration contract: a complete export contains only the active local account and all of its budget data.
- The future account export must preserve profile settings and protected credential metadata without exporting other local accounts or a reversible plaintext code.
- No account storage or export implementation was added because local accounts and encrypted per-account storage are not yet present in the current application.
- No application data changed.
## [2026-08-22] - Finterest Change Session #14
- Files modified: `src/renderer/App.tsx`, `src/renderer/styles.css`, `README.txt`, `DEV_CHANGES.md`, `PATCH_NOTES.md`, `USER_UPDATE_SUMMARY.txt`.
- Translated the renderer interface into French and changed displayed amounts to French euro formatting.
- Reframed the primary workflow as a simple budget calculator with monthly income, recurring subscriptions, and planned purchases.
- Added a separate advanced calculator mode for compound-interest estimates, kept independent from saved budget data.
- Preserved existing IPC, SQLite-compatible storage, backup/restore, and budget calculation behavior.
- Validation: `npm run typecheck`, `npm run lint`, and `npm run build` pass. `npm run dist:win` successfully rebuilt the Windows installer. `dist:mac` requires macOS; `dist:linux` reached AppImage packaging but was blocked by Windows symlink privileges.

## [2026-08-22] - Finterest Change Session #13
- Files modified: `src/renderer/styles.css`, `README.txt`, `DEV_CHANGES.md`, `PATCH_NOTES.md`, `USER_UPDATE_SUMMARY.txt`.
- Replaced two conflicting CSS generations with one variable-driven theme applied consistently across the entire renderer.
- Unified the sidebar, workspace, summary cards, budget ring, forms, expense lists, settings panel, error state, controls, focus states, and responsive breakpoints.
- Kept warm light as the primary theme and retained a scoped dark blue/violet variant through `prefers-color-scheme: dark`.
- Added reduced-motion handling and stronger visible keyboard focus treatment without changing application behavior.
- No data model, IPC, persistence, backup, or calculation changes.
- Validation: `npm run build:renderer` passes without CSS warnings. Full typecheck and lint are pending final verification.

## [2026-08-22] - Finterest Change Session #12
- Files added: `.github/agents/finterest-styling.agent.md`.
- Files modified: `README.txt`, `DEV_CHANGES.md`, `PATCH_NOTES.md`, `USER_UPDATE_SUMMARY.txt`.
- Added a workspace custom agent for Finterest visual styling, responsive layout, accessibility, and renderer UI polish.
- The agent is limited to styling-oriented work, documents warm light as the primary direction, and preserves the existing dark blue/violet declarations as an intentional secondary theme.
- No application code, data model, persistence, backup behavior, or user data changed.
- No new tests were added. Validation is limited to checking the customization file structure because Node.js/npm is unavailable on this environment.

## [2026-08-22] - Finterest Change Session #11
- Files added: install/README.txt.
- Files modified: README.txt, DEV_CHANGES.md, PATCH_NOTES.md, USER_UPDATE_SUMMARY.txt.
- Cleaned install/windows by removing generated win-unpacked files and Electron Builder diagnostic configuration files; the installer and blockmap remain available.
- Added a root distribution guide describing the Windows, macOS, and Linux folders and their corresponding build commands.
- The platform output configuration remains unchanged: dist:win, dist:mac, and dist:linux write directly to their dedicated folders.
- No application data, backup, or migration behavior changed.

## [2026-08-22] - Finterest Change Session #10
- Files added: assets/finterest-logo.svg, src/shared/assets.d.ts.
- Files modified: src/renderer/App.tsx, src/renderer/styles.css, package.json, README.txt, DEV_CHANGES.md, PATCH_NOTES.md, USER_UPDATE_SUMMARY.txt.
- Replaced the initial light prototype with an original dark premium dashboard focused on budget clarity rather than investment tracking.
- Added sidebar navigation for Overview, Fixed expenses, Variable expenses, and Settings & backup.
- Added KPI cards, a budget-health ring, monthly spending snapshot, local data status, and a dedicated backup/settings panel.
- Added the Finterest F monogram asset using the requested deep blue, violet, and neon gradient identity. The asset is imported through Vite and included in packaged files.
- The original provided icon was not present in the repository assets folder, so the added SVG is a faithful identity placeholder based on the supplied visual requirements rather than a claim to use an unavailable source file.
- No budget calculations, application data, backup format, or migration behavior changed.
- Validation: npm run typecheck, npm test -- --runInBand, npm run lint, and npm run build all pass. The build completes without the prior CSS warning.

## [2026-08-22] - Finterest Change Session #9
- Files modified: package.json, README.txt, DEV_CHANGES.md, PATCH_NOTES.md, USER_UPDATE_SUMMARY.txt.
- Fixed the packaged application startup error by marking electron as external in both the production and watch tsup commands.
- Previously, tsup bundled the npm electron launcher into main.js; the packaged runtime then executed getElectronPath and reported that Electron was not installed correctly.
- The main process now keeps require('electron') for Electron's built-in runtime API.
- No application data, backup, or migration behavior changed.

## [2026-08-22] - Finterest Change Session #8
- Files added: install/windows/README.txt, install/mac/README.txt, install/linux/README.txt.
- Files modified: package.json, .github/workflows/build-installers.yml, README.txt, DEV_CHANGES.md, PATCH_NOTES.md, USER_UPDATE_SUMMARY.txt.
- Routed dist:win, dist:mac, and dist:linux output to dedicated platform folders under install/.
- Updated CI artifact collection to upload from the matching platform folder.
- The generated Windows installer is now stored under install/windows/; macOS and Linux folders are ready for their native builds.
- No application data, backup, or migration behavior changed.

## [2026-08-22] - Finterest Change Session #7
- Files added: .github/workflows/build-installers.yml.
- Files modified: package.json, README.txt, DEV_CHANGES.md, PATCH_NOTES.md, USER_UPDATE_SUMMARY.txt.
- Added platform-specific scripts: dist:win, dist:mac, and dist:linux.
- Added a native-runner CI matrix that builds a Windows NSIS installer, a macOS DMG, and a Linux AppImage, then uploads each result as a workflow artifact.
- CI uses Node.js 20 and npm ci for reproducible dependency installation.
- Unsigned packaging remains intentional for this initial release. macOS signing/notarization and Windows certificate signing can be added later through CI secrets.
- No application data, backup, or migration behavior changed.

## [2026-08-22] - Finterest Change Session #6
- Files modified: package.json, README.txt, DEV_CHANGES.md, PATCH_NOTES.md, USER_UPDATE_SUMMARY.txt.
- Added cross-env to the dist script so unsigned Windows packaging automatically disables certificate discovery on PowerShell, cmd.exe, and other shells.
- Confirmed the Windows NSIS installer was generated in release/Finterest Setup 0.1.0.exe.
- No application data model or backup format changes were introduced.

## [2026-08-22] - Finterest Change Session #5
- Files modified: package.json, README.txt, DEV_CHANGES.md, PATCH_NOTES.md, USER_UPDATE_SUMMARY.txt.
- Removed the unsupported sign: false property from the Windows Electron Builder configuration.
- Kept signAndEditExecutable: false and documented CSC_IDENTITY_AUTO_DISCOVERY=false for unsigned packaging.
- This avoids the undefined certificate object that caused Electron Builder to fail after NSIS packaging began.
- No application data model or backup format changes were introduced.

## [2026-08-22] - Finterest Change Session #4
- Files modified: package.json, README.txt, DEV_CHANGES.md, PATCH_NOTES.md, USER_UPDATE_SUMMARY.txt.
- Updated the Windows Electron Builder configuration with signAndEditExecutable: false in addition to sign: false.
- This prevents unsigned development packaging from downloading and unpacking winCodeSign, which was failing because the current Windows shell cannot create symbolic links.
- No application data model or backup format changes were introduced.
- The next validation step is npm run dist.

## [2026-08-22] - Finterest Change Session #3
- Files modified: package.json, eslint.config.js, README.txt, DEV_CHANGES.md, PATCH_NOTES.md, USER_UPDATE_SUMMARY.txt.
- Added @typescript-eslint/parser and replaced the placeholder ESLint ignore-only config with a real flat config that parses src and tests as TypeScript.
- Confirmed npm run lint now completes successfully against the current source tree.
- Validation status: npm run typecheck, npm test -- --runInBand, npm run build, and npm run lint all pass.
- Packaging status: npm run dist still fails in this Windows shell because Electron Builder tries to unpack winCodeSign and cannot create the symbolic links required by that archive extraction.
- Documented the lint command and the remaining packaging caveat in README.txt and the user-facing notes.

## [2026-08-22] - Finterest Change Session #2
- Files modified: package.json, vite.config.ts, src/renderer/App.tsx, src/electron/main.ts, README.txt, DEV_CHANGES.md, PATCH_NOTES.md, USER_UPDATE_SUMMARY.txt.
- Fixed the renderer type usage by importing ReactNode directly instead of relying on a React namespace symbol that was not imported.
- Added Vite resolve aliases so @shared, @renderer, and @electron imports work in the renderer build path as well as in TypeScript.
- Adjusted the Electron main process to fall back to the local Vite dev server URL during development when VITE_DEV_SERVER_URL is not injected.
- Updated the development scripts so npm run dev now watches the Electron build and starts the desktop shell after both the renderer server and rebuilt main bundle are available.
- Updated README.txt to describe the watched dev flow and the alias-based project structure.
- Validation note: the environment still does not expose Node.js/npm on PATH, so I could only perform static diagnostics on the edited files.

## [2026-08-22] - Finterest Change Session #1
- Files added: package.json, tsconfig.json, vite.config.ts, jest.config.ts, eslint.config.js, index.html, .gitignore, src/electron/main.ts, src/electron/preload.ts, src/electron/store.ts, src/renderer/main.tsx, src/renderer/App.tsx, src/renderer/styles.css, src/shared/types.ts, src/shared/budget.ts, src/shared/global.d.ts, src/shared/budget.test.ts, tests/setup.ts, README.txt, PATCH_NOTES.md, USER_UPDATE_SUMMARY.txt, DEV_CHANGES.md.
- Files modified: .github/copilot-instructions.md was read as the governing project instruction file; no code changes were made there.
- Implemented a new Electron + React + TypeScript scaffold for Finterest with separate main, preload, renderer, and shared layers.
- Added shared budget data models and a dedicated calculation module for fixed expenses, variable expenses, total expenses, and remaining income.
- Added a local SQLite-compatible persistence layer using SQL.js that stores data in the Electron user data folder as finterest.sqlite.
- Added IPC endpoints for loading the snapshot, saving income, saving the active month key, editing fixed and variable expenses, and exporting or importing a JSON backup.
- Added a single-screen renderer dashboard with income input, expense entry forms, summary cards, item lists, and backup export/import actions.
- Added Jest coverage for the core budget calculations in src/shared/budget.test.ts.
- Documented the current project structure, setup commands, storage location, and backup workflow in README.txt.
- Validation note: the workspace shell does not currently have Node.js or npm on PATH, so dependency installation and build execution could not be completed here.
- Recommended next step for a developer machine: run npm install, then npm run test, npm run typecheck, and npm run build.
