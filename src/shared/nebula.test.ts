import { createEmptySnapshot } from './budget';
import { budgetWidget, debitNotification, debitsDueTomorrow, dockedWindowSteps, isNewsDeepLink, parseNewsWidget } from './nebula';

function snapshot() {
  const value = createEmptySnapshot();
  value.settings.income = 2000;
  value.fixedExpenses = [
    { id: 'rent', name: 'Loyer', amount: 800, category: 'Logement', dayOfMonth: 5, active: true, kind: 'directDebit' },
    { id: 'gym', name: 'Salle', amount: 30, category: 'Sport', dayOfMonth: 5, active: false, kind: 'subscription' },
    { id: 'phone', name: 'Téléphone', amount: 19.99, category: 'Abonnements', dayOfMonth: 31, active: true, kind: 'subscription' },
  ];
  value.variableExpenses = [{ id: 'v1', name: 'Courses', amount: 120.5, category: 'Alimentation', date: '2026-10-02', monthKey: '2026-10' }];
  return value;
}

describe('Nebula Hub widget', () => {
  it('shows what is left this month, in French, with a link to the month', () => {
    const widget = budgetWidget(snapshot(), new Date(2026, 9, 2, 10, 0));
    expect(widget).toMatchObject({ title: 'Reste à vivre', unit: '€', caption: 'Budget de octobre 2026', deepLink: 'nebula://finterest/month?date=2026-10' });
    // 2000 - 800 - 19.99 - 120.50 = 1059.51 (a narrow no-break space may separate thousands).
    expect(widget.value?.replace(/\s/g, ' ')).toBe('1 059,51');
    expect(widget.title.length).toBeLessThanOrEqual(80);
  });
});

describe('charges due tomorrow', () => {
  it('lists the active charges of tomorrow only', () => {
    expect(debitsDueTomorrow(snapshot(), new Date(2026, 9, 4, 20, 0))).toEqual([{ id: 'rent', name: 'Loyer', amount: 800, date: '2026-10-05' }]);
    expect(debitsDueTomorrow(snapshot(), new Date(2026, 9, 5, 9, 0))).toEqual([]);
  });

  it('moves a charge of the 31st to the last day of a shorter month, and crosses month ends', () => {
    // November has 30 days: the 31st falls on the 30th.
    expect(debitsDueTomorrow(snapshot(), new Date(2026, 10, 29)).map((debit) => debit.id)).toEqual(['phone']);
    // 31 Oct → tomorrow is 1 Nov.
    expect(debitsDueTomorrow(snapshot(), new Date(2026, 9, 31)).map((debit) => debit.date)).toEqual([]);
  });

  it('builds a private notification, unique per charge and day', () => {
    const notification = debitNotification({ id: 'rent', name: 'Loyer', amount: 800, date: '2026-10-05' });
    expect(notification).toEqual({ id: 'debit-rent-2026-10-05', title: 'Prélèvement prévu demain', body: 'Loyer : 800,00 €', sensitivity: 'private', deepLink: 'nebula://finterest/month?date=2026-10', category: 'debit' });
  });
});

describe('Nebula News finance widget (news.finance.today)', () => {
  const valid = {
    title: 'Finance du jour',
    caption: 'Éducation financière',
    items: [
      { label: 'Comprendre le taux d’usure', value: 'Le Monde' },
      { label: 'Épargne de précaution : combien ?', value: 'Les Échos' },
      { label: 'Livret A : ce qui change', value: 'Capital' },
    ],
    deepLink: 'nebula://news/theme/finance',
    updatedAt: '2026-10-03T08:00:00.000Z',
  };

  it('keeps a valid payload as plain texts', () => {
    expect(parseNewsWidget(valid)).toEqual(valid);
  });

  it('keeps only the first three articles', () => {
    const five = { ...valid, items: [...valid.items, { label: 'Quatre', value: 'A' }, { label: 'Cinq', value: 'B' }] };
    expect(parseNewsWidget(five)?.items).toHaveLength(3);
  });

  it('drops the whole card on anything unexpected', () => {
    expect(parseNewsWidget(null)).toBeNull();
    expect(parseNewsWidget('text')).toBeNull();
    expect(parseNewsWidget({ ...valid, title: '' })).toBeNull();
    expect(parseNewsWidget({ ...valid, title: 'x'.repeat(81) })).toBeNull();
    expect(parseNewsWidget({ ...valid, caption: '<b>gras</b>' })).toBeNull();
    expect(parseNewsWidget({ ...valid, items: [{ label: '<img src=x onerror=alert(1)>', value: 'A' }] })).toBeNull();
    expect(parseNewsWidget({ ...valid, items: [{ label: 'Titre\u0007', value: 'A' }] })).toBeNull();
    expect(parseNewsWidget({ ...valid, items: [{ label: 'Sans source' }] })).toBeNull();
    expect(parseNewsWidget({ ...valid, items: [] })).toBeNull();
    expect(parseNewsWidget({ ...valid, items: Array.from({ length: 6 }, () => valid.items[0]) })).toBeNull();
    expect(parseNewsWidget({ ...valid, updatedAt: 'hier' })).toBeNull();
    expect(parseNewsWidget({ ...valid, deepLink: undefined })).toBeNull();
  });

  it('accepts only links into Nebula News', () => {
    expect(isNewsDeepLink('nebula://news/theme/finance')).toBe(true);
    expect(isNewsDeepLink('nebula://news/briefing?date=2026-10-03')).toBe(true);
    expect(isNewsDeepLink('nebula://finterest/month?date=2026-10')).toBe(false);
    expect(isNewsDeepLink('https://example.com/news')).toBe(false);
    expect(isNewsDeepLink('nebula://news/theme/finance"><script>')).toBe(false);
    expect(isNewsDeepLink(`nebula://news/${'a'.repeat(61)}`)).toBe(false);
    expect(isNewsDeepLink(42)).toBe(false);
  });
});

describe('Hub mode: showing and raising the docked window (Nebula Hub ADR-032)', () => {
  it('shows and raises a hidden window, raises a visible one only when the Hub asks', () => {
    expect(dockedWindowSteps(false, false)).toEqual({ show: true, raise: true });
    expect(dockedWindowSteps(false, true)).toEqual({ show: true, raise: true });
    expect(dockedWindowSteps(true, true)).toEqual({ show: false, raise: true });
    expect(dockedWindowSteps(true, false)).toEqual({ show: false, raise: false });
  });
});
