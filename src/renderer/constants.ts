import type { Language, TranslationKey } from './i18n';
import { translate } from './i18n';
import type { IconName } from './components/Icon';

export interface SubscriptionCategory {
  labelKey: TranslationKey;
  icon: IconName;
}

export const subscriptionCategories: SubscriptionCategory[] = [
  { labelKey: 'category.housing', icon: 'home' },
  { labelKey: 'category.phoneInternet', icon: 'wifi' },
  { labelKey: 'category.streaming', icon: 'play' },
  { labelKey: 'category.transport', icon: 'car' },
  { labelKey: 'category.insurance', icon: 'shield' },
  { labelKey: 'category.wellbeing', icon: 'heart' },
  { labelKey: 'category.other', icon: 'tag' },
];

/** English labels written by the starter data (store.ts `ensureSeedData`) and by early versions. */
const LEGACY_CATEGORY_ICONS: Record<string, IconName> = {
  housing: 'home',
  utilities: 'wifi',
  food: 'bag',
  groceries: 'bag',
  health: 'heart',
};

export function formatMoney(value: number, language: Language): string {
  return value.toLocaleString(language === 'en' ? 'en-US' : 'fr-FR', { style: 'currency', currency: 'EUR' });
}

/** Categories are stored as the display label the user picked, so they are matched against both languages; anything else gets the generic tag. */
export function categoryIcon(category: string, language: Language): IconName {
  const match = subscriptionCategories.find(
    (item) => translate(language, item.labelKey) === category || translate('fr', item.labelKey) === category || translate('en', item.labelKey) === category,
  );
  return match?.icon ?? LEGACY_CATEGORY_ICONS[category.trim().toLowerCase()] ?? 'tag';
}
