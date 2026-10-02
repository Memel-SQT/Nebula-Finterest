import fs from 'node:fs/promises';
import path from 'node:path';
import { NebulaLink, type Intent } from '@nebula/link';
import { budgetWidget, debitNotification, debitsDueTomorrow } from '../shared/nebula';
import { isValidMonthKey } from '../shared/budget';
import type { BudgetSnapshot, NebulaState } from '../shared/types';
import { writeFileAtomic } from './fsutil';

/**
 * Nebula Hub integration through Nebula Link (v0.1.37). Everything here is optional: without the
 * Hub, the SDK stays offline without error and Finterest works exactly as before.
 *
 * What is shared, and when:
 * - `finterest.budget.remaining` (private widget): only while a real profile is unlocked, never
 *   for a locked app; the Hub asks the user before showing it.
 * - private notifications for the charges due tomorrow, once per charge and day;
 * - nothing else: no account, no list of expenses, no history.
 *
 * What is received: the Nebula appearance (applied by the renderer if "Follow the Nebula
 * appearance" is on), the Hub's presence (updates handled by the Hub, if the user chose it), the
 * Hub mode placement, and intents (open the app, open a month).
 */
export interface NebulaDeps {
  appVersion: string;
  manifestPath: string;
  settingsPath: string;
  /** The unlocked profile's snapshot, or null when the app is locked (or in guest mode). */
  openSnapshot(): Promise<BudgetSnapshot | null>;
  openProfileId(): string | null;
  send(channel: string, payload: unknown): void;
  focusWindow(): void;
  onDock(payload: unknown): void;
}

export interface NebulaSettings {
  /** The Hub installs the updates instead of the built-in updater (only while the Hub runs). */
  updatesByHub: boolean;
  /** Charges already announced (`<profile>|<notification id>`), the last 100. */
  notified: string[];
}

const DEFAULT_SETTINGS: NebulaSettings = { updatesByHub: false, notified: [] };
const DEBIT_CHECK_MS = 60 * 60 * 1000;

export class NebulaIntegration {
  readonly link: NebulaLink;
  private settings: NebulaSettings = { ...DEFAULT_SETTINGS };
  private hub: { hubVersion: string; managesUpdates: boolean } | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private stopDock: (() => void) | null = null;

  constructor(private readonly deps: NebulaDeps) {
    // NEBULA_LINK_SESSION_FILE points a manual test at a test-mode Hub; never set in a packaged install.
    this.link = NebulaLink.create({ appId: 'nebula.finterest', appVersion: deps.appVersion, manifestPath: deps.manifestPath, sessionFile: process.env.NEBULA_LINK_SESSION_FILE || undefined });
  }

  async start(): Promise<void> {
    await this.loadSettings();
    this.link.on('nebula.appearance.changed', (appearance) => this.deps.send('nebula:appearance', appearance));
    this.link.on('nebula.hub.present', (presence) => {
      const value = presence as { hubVersion?: unknown; managesUpdates?: unknown };
      this.hub = { hubVersion: String(value.hubVersion ?? ''), managesUpdates: value.managesUpdates === true };
      this.deps.send('nebula:state', this.state());
    });
    this.resumeDock();
    this.link.onStatus((status) => {
      if (status === 'offline') {
        this.hub = null;
        // Never stay frameless and placed for a Hub that is gone: back to the normal window.
        this.deps.onDock({ state: 'released' });
      }
      this.deps.send('nebula:state', this.state());
      if (status === 'connected') void this.checkDebits();
    });
    this.link.onIntent((intent) => this.route(intent));
    this.link.provide('finterest.budget.remaining', async () => {
      const snapshot = await this.deps.openSnapshot();
      return snapshot ? budgetWidget(snapshot, new Date()) : null;
    });
    await this.link.connect();
    this.timer = setInterval(() => void this.checkDebits(), DEBIT_CHECK_MS);
    this.timer.unref?.();
  }

  /** Stops listening to the Hub mode (the Hub then forgets the app): "Detach" in the app. */
  pauseDock(): void {
    this.stopDock?.();
    this.stopDock = null;
  }

  resumeDock(): void {
    if (!this.stopDock) this.stopDock = this.link.on('nebula.hub.dock', (payload) => this.deps.onDock(payload));
  }

  dispose(): void {
    if (this.timer) clearInterval(this.timer);
    this.link.dispose();
  }

  /** What the renderer shows in its settings. */
  state(): NebulaState {
    return { connected: this.link.status === 'connected' && this.hub !== null, hubVersion: this.hub?.hubVersion ?? null, updatesByHub: this.settings.updatesByHub };
  }

  /** The built-in updater stands aside only while the Hub is there and the user chose it. */
  hubHandlesUpdates(): boolean {
    return this.settings.updatesByHub && this.hub !== null && this.hub.managesUpdates;
  }

  /** Waits a moment for the Hub's presence at startup (the updater decides right after). */
  async waitForHub(timeoutMs = 3000): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (!this.hub && this.link.status === 'connected' && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return this.hub !== null;
  }

  async setUpdatesByHub(enabled: boolean): Promise<void> {
    this.settings.updatesByHub = enabled === true;
    await this.saveSettings();
    this.deps.send('nebula:state', this.state());
  }

  /** An intent from Link or from `--nebula-intent` on the command line. */
  route(intent: Intent): void {
    this.deps.focusWindow();
    if (intent.path === '/month' && isValidMonthKey(intent.params.date)) {
      this.deps.send('nebula:open-month', intent.params.date);
    }
  }

  routeArgv(argv: readonly string[]): boolean {
    const intent = NebulaLink.intentFromArgv(argv, this.link.manifest);
    if (!intent) return false;
    this.route(intent);
    return true;
  }

  /** Announces tomorrow's charges of the open profile, once each (called on unlock and hourly). */
  async checkDebits(): Promise<void> {
    if (this.link.status !== 'connected') return;
    const snapshot = await this.deps.openSnapshot().catch(() => null);
    const profile = this.deps.openProfileId();
    if (!snapshot || !profile) return;
    for (const debit of debitsDueTomorrow(snapshot, new Date())) {
      const notification = debitNotification(debit);
      const key = `${profile}|${notification.id}`;
      if (this.settings.notified.includes(key)) continue;
      const result = await this.link.notify(notification);
      // Refused or waiting for the user's yes in the Hub: tried again at the next check.
      if (result.ok) {
        this.settings.notified = [...this.settings.notified, key].slice(-100);
        await this.saveSettings();
      }
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      const parsed = JSON.parse(await fs.readFile(this.deps.settingsPath, 'utf8')) as Partial<NebulaSettings>;
      this.settings = {
        updatesByHub: parsed.updatesByHub === true,
        notified: Array.isArray(parsed.notified) ? parsed.notified.filter((value): value is string => typeof value === 'string').slice(-100) : [],
      };
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.deps.settingsPath), { recursive: true });
      await writeFileAtomic(this.deps.settingsPath, JSON.stringify(this.settings, null, 2));
    } catch {
      // A preference that cannot be saved never breaks the app.
    }
  }
}
