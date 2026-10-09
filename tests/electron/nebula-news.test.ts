/**
 * @jest-environment node
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// A fake Nebula Link: only `query` and `status` matter here. `validateSchema` stays the real one,
// so the WidgetV1 check runs exactly as in the app.
const mockLink = {
  status: 'connected' as 'connected' | 'offline',
  manifest: null,
  query: jest.fn(),
  on: jest.fn(() => () => undefined),
  onStatus: jest.fn(() => () => undefined),
  onIntent: jest.fn(() => () => undefined),
  provide: jest.fn(() => () => undefined),
  connect: jest.fn(async () => 'connected'),
  notify: jest.fn(async () => ({ ok: true, value: { accepted: true } })),
  dispose: jest.fn(),
};
jest.mock('@nebula/link', () => ({
  NebulaLink: { create: () => mockLink, intentFromArgv: () => null },
  validateSchema: jest.requireActual('@nebula/link').validateSchema,
}));

import { NebulaIntegration, NEWS_FINANCE_CAPABILITY, NEWS_REFRESH_MS, NEWS_RETRY_MS, NEWS_TAB_REFRESH_MS } from '../../src/electron/nebula';

const WIDGET = {
  title: 'Finance du jour',
  caption: 'Éducation financière',
  items: [{ label: 'Comprendre le taux d’usure', value: 'Le Monde' }],
  deepLink: 'nebula://news/theme/finance',
  updatedAt: '2026-10-03T08:00:00.000Z',
};

let dir = '';
let profile: string | null = 'profile-1';
/** Open session: 'profile', 'guest' or null (locked app). */
let session: 'profile' | 'guest' | null = 'profile';
let visible = true;

function integration(): NebulaIntegration {
  return new NebulaIntegration({
    appVersion: '0.1.39',
    manifestPath: path.join(dir, 'nebula.app.json'),
    settingsPath: path.join(dir, 'nebula-hub.json'),
    openSnapshot: async () => null,
    openProfileId: () => profile,
    sessionOpen: () => session !== null,
    send: () => undefined,
    focusWindow: () => undefined,
    onDock: () => undefined,
    windowVisible: () => visible,
  });
}

describe('Nebula News "Learn" card (news.finance.today)', () => {
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'finterest-news-'));
    profile = 'profile-1';
    session = 'profile';
    visible = true;
    mockLink.status = 'connected';
    mockLink.query.mockReset();
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('asks News without any parameter and returns the checked widget', async () => {
    mockLink.query.mockResolvedValue({ ok: true, value: WIDGET });
    const nebula = integration();
    expect(await nebula.financeNews()).toEqual(WIDGET);
    expect(mockLink.query).toHaveBeenCalledTimes(1);
    // Exactly one argument: nothing from the profile goes out.
    expect(mockLink.query.mock.calls[0]).toEqual([NEWS_FINANCE_CAPABILITY]);
  });

  it('returns null, without asking, when the Hub is absent', async () => {
    mockLink.status = 'offline';
    expect(await integration().financeNews()).toBeNull();
    expect(mockLink.query).not.toHaveBeenCalled();
  });

  it.each([
    ['News absent', { ok: false, error: 'provider-offline' }],
    ['timeout', { ok: false, error: 'timeout' }],
    ['consent refused', { ok: false, error: 'consent-denied' }],
    ['empty theme (null)', { ok: true, value: null }],
    ['not a WidgetV1', { ok: true, value: { title: 42 } }],
    ['a link outside News', { ok: true, value: { ...WIDGET, deepLink: 'https://example.com' } }],
  ])('returns null when %s', async (_label, result) => {
    mockLink.query.mockResolvedValue(result);
    expect(await integration().financeNews()).toBeNull();
  });

  it('returns null when the SDK throws', async () => {
    mockLink.query.mockRejectedValue(new Error('boom'));
    expect(await integration().financeNews()).toBeNull();
  });

  it('never asks while the app is locked or the window is hidden', async () => {
    mockLink.query.mockResolvedValue({ ok: true, value: WIDGET });
    profile = null;
    session = null;
    expect(await integration().financeNews()).toBeNull();
    session = 'profile';
    profile = 'profile-1';
    visible = false;
    expect(await integration().financeNews()).toBeNull();
    expect(mockLink.query).not.toHaveBeenCalled();
  });

  it('never asks when the setting is off', async () => {
    mockLink.query.mockResolvedValue({ ok: true, value: WIDGET });
    const nebula = integration();
    await nebula.setNewsFinance(false);
    expect(await nebula.financeNews()).toBeNull();
    expect(mockLink.query).not.toHaveBeenCalled();
    expect(nebula.state().newsFinance).toBe(false);
  });

  it('asks at most every 15 minutes, and again after the profile is locked', async () => {
    mockLink.query.mockResolvedValue({ ok: true, value: WIDGET });
    const nebula = integration();
    const start = 1_000_000;
    await nebula.financeNews(start);
    await nebula.financeNews(start + 60_000);
    await Promise.all([nebula.financeNews(start + 120_000), nebula.financeNews(start + 120_000)]);
    expect(mockLink.query).toHaveBeenCalledTimes(1);
    await nebula.financeNews(start + NEWS_REFRESH_MS);
    expect(mockLink.query).toHaveBeenCalledTimes(2);
    nebula.clearNews();
    await nebula.financeNews(start + NEWS_REFRESH_MS + 1);
    expect(mockLink.query).toHaveBeenCalledTimes(3);
  });

  it('shows the articles in a guest session too (the request carries nothing of the session)', async () => {
    mockLink.query.mockResolvedValue({ ok: true, value: WIDGET });
    profile = null;
    session = 'guest';
    expect(await integration().financeNews()).toEqual(WIDGET);
    expect(mockLink.query.mock.calls[0]).toEqual([NEWS_FINANCE_CAPABILITY]);
  });

  it('asks again 30 s after News did not answer (absent or still starting), so the card appears on its own', async () => {
    mockLink.query.mockResolvedValueOnce({ ok: false, error: 'provider-offline' });
    const nebula = integration();
    const start = 1_000_000;
    expect(await nebula.financeNews(start)).toBeNull();
    expect(await nebula.financeNews(start + NEWS_RETRY_MS - 1)).toBeNull();
    expect(mockLink.query).toHaveBeenCalledTimes(1);
    mockLink.query.mockResolvedValue({ ok: true, value: WIDGET });
    expect(await nebula.financeNews(start + NEWS_RETRY_MS)).toEqual(WIDGET);
    expect(mockLink.query).toHaveBeenCalledTimes(2);
    // An answer is kept for 15 minutes.
    await nebula.financeNews(start + NEWS_RETRY_MS + 60_000);
    expect(mockLink.query).toHaveBeenCalledTimes(2);
  });

  it('keeps an answer without articles for 15 minutes (News answered)', async () => {
    mockLink.query.mockResolvedValue({ ok: true, value: null });
    const nebula = integration();
    await nebula.financeNews(1_000_000);
    await nebula.financeNews(1_000_000 + NEWS_RETRY_MS);
    expect(mockLink.query).toHaveBeenCalledTimes(1);
  });

  it('asks as soon as the window is visible again (a hidden window is never remembered)', async () => {
    mockLink.query.mockResolvedValue({ ok: true, value: WIDGET });
    const nebula = integration();
    visible = false;
    expect(await nebula.financeNews(1_000_000)).toBeNull();
    visible = true;
    expect(await nebula.financeNews(1_000_001)).toEqual(WIDGET);
    expect(mockLink.query).toHaveBeenCalledTimes(1);
  });

  it('keeps the setting on for settings files written before v0.1.39', async () => {
    await fs.writeFile(path.join(dir, 'nebula-hub.json'), JSON.stringify({ updatesByHub: true, notified: ['a|b'] }));
    await fs.copyFile(path.join(__dirname, '../../nebula.app.json'), path.join(dir, 'nebula.app.json'));
    const nebula = integration();
    await nebula.start();
    expect(nebula.state()).toMatchObject({ updatesByHub: true, newsFinance: true });
    nebula.dispose();
  });
});

describe('"Nebula News" tab (news.finance.articles)', () => {
  const ARTICLES = { title: 'Finance', updatedAt: '2026-10-09T08:00:00.000Z', items: [{ title: 'Livret A : ce qui change', source: 'La finance pour tous', publishedAt: '2026-10-09T06:00:00.000Z', deepLink: 'nebula://news/article?id=clx0abc123def456' }] };

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'finterest-news-'));
    profile = 'profile-1';
    session = 'profile';
    visible = true;
    mockLink.status = 'connected';
    mockLink.query.mockReset();
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('asks News without any parameter, also in a guest session, and returns the checked list', async () => {
    mockLink.query.mockResolvedValue({ ok: true, value: ARTICLES });
    profile = null;
    session = 'guest';
    expect(await integration().financeArticles()).toEqual({ state: 'ready', articles: ARTICLES });
    expect(mockLink.query.mock.calls[0]).toEqual(['news.finance.articles']);
  });

  it('asks again 30 s after no answer, then keeps an answer 5 minutes', async () => {
    mockLink.query.mockResolvedValueOnce({ ok: false, error: 'provider-offline' });
    const nebula = integration();
    const start = 1_000_000;
    expect(await nebula.financeArticles(start)).toEqual({ state: 'unavailable' });
    await nebula.financeArticles(start + NEWS_RETRY_MS - 1);
    expect(mockLink.query).toHaveBeenCalledTimes(1);
    mockLink.query.mockResolvedValue({ ok: true, value: ARTICLES });
    expect((await nebula.financeArticles(start + NEWS_RETRY_MS)).state).toBe('ready');
    await nebula.financeArticles(start + NEWS_RETRY_MS + NEWS_TAB_REFRESH_MS - 1);
    expect(mockLink.query).toHaveBeenCalledTimes(2);
  });

  it('is empty when News has nothing or sends something invalid, off with the setting off, unavailable when locked or hidden', async () => {
    mockLink.query.mockResolvedValue({ ok: true, value: null });
    expect(await integration().financeArticles()).toEqual({ state: 'empty' });
    mockLink.query.mockResolvedValue({ ok: true, value: { ...ARTICLES, items: [{ ...ARTICLES.items[0], deepLink: 'https://example.com' }] } });
    expect(await integration().financeArticles()).toEqual({ state: 'empty' });
    const off = integration();
    await off.setNewsFinance(false);
    expect(await off.financeArticles()).toEqual({ state: 'off' });
    session = null;
    expect(await integration().financeArticles()).toEqual({ state: 'unavailable' });
    session = 'profile';
    visible = false;
    mockLink.query.mockClear();
    expect(await integration().financeArticles()).toEqual({ state: 'unavailable' });
    expect(mockLink.query).not.toHaveBeenCalled();
  });
});
