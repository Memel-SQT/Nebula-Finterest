import type { Language, TranslationKey } from './i18n';
import { translate } from './i18n';

export interface SubscriptionCategory {
  labelKey: TranslationKey;
  icon: string;
}

export const subscriptionCategories: SubscriptionCategory[] = [
  { labelKey: 'category.housing', icon: '⌂' },
  { labelKey: 'category.phoneInternet', icon: '▤' },
  { labelKey: 'category.streaming', icon: '▶' },
  { labelKey: 'category.transport', icon: '⇄' },
  { labelKey: 'category.insurance', icon: '▣' },
  { labelKey: 'category.wellbeing', icon: '✚' },
  { labelKey: 'category.other', icon: '•' },
];

export function formatMoney(value: number, language: Language): string {
  return value.toLocaleString(language === 'en' ? 'en-US' : 'fr-FR', { style: 'currency', currency: 'EUR' });
}

/** Categories are stored as the display label the user picked, so matching only works within the language it was entered in — falls back to the default glyph otherwise. */
export function categoryIcon(category: string, language: Language): string {
  const match = subscriptionCategories.find(
    (item) => translate(language, item.labelKey) === category || translate('fr', item.labelKey) === category || translate('en', item.labelKey) === category,
  );
  return match?.icon ?? '•';
}
