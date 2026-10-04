import type { BudgetSnapshot } from '@shared/types';
import type { Language } from '../i18n';
import { translate } from '../i18n';

/**
 * "Charge to a budget" picker for a purchase (v0.1.41): no budget, a budget, or one of its
 * sub-envelopes, grouped into everyday budgets and large projects. Hidden when there is no budget.
 */
export function BudgetSelect({ snapshot, value, language, onChange, id }: {
  snapshot: BudgetSnapshot;
  value: string;
  language: Language;
  onChange: (budgetId: string) => void;
  id?: string;
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const budgets = snapshot.budgets ?? [];
  if (budgets.length === 0) return null;
  const roots = budgets.filter((budget) => !budget.parentId);
  const group = (scale: 'regular' | 'project') => roots.filter((budget) => budget.scale === scale).flatMap((root) => [
    <option key={root.id} value={root.id}>{root.name}{root.countsInMonth ? '' : ` (${t('budgets.forecast')})`}</option>,
    ...budgets.filter((child) => child.parentId === root.id).map((child) => <option key={child.id} value={child.id}>{`${root.name} › ${child.name}`}</option>),
  ]);
  const regular = group('regular');
  const projects = group('project');
  return (
    <label>
      {t('budgets.chargeTo')}
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{t('budgets.none')}</option>
        {regular.length ? <optgroup label={t('nav.budgets')}>{regular}</optgroup> : null}
        {projects.length ? <optgroup label={t('nav.projects')}>{projects}</optgroup> : null}
      </select>
    </label>
  );
}
