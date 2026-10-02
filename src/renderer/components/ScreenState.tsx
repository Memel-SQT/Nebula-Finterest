// Ported from Nebula Hub 2ebf5f6 (src/renderer/components/ScreenState.tsx): the empty state. Finterest
// has no network, so no offline state; errors use the `.state-banner.error-banner` in App.tsx.
import { Icon, type IconName } from './Icon';

/** `compact` drops the surface when the empty state already sits inside a panel. */
export function EmptyState({ icon, title, body, compact = false }: { icon: IconName; title: string; body: string; compact?: boolean }) {
  const Heading = compact ? 'h3' : 'h2';
  return (
    <div className={compact ? 'empty-state compact' : 'empty-state'}>
      <span className="empty-state-icon"><Icon name={icon} size={26} /></span>
      <Heading>{title}</Heading>
      <p>{body}</p>
    </div>
  );
}
