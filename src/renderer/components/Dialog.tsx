// Ported from Nebula Hub 2ebf5f6 (src/renderer/components/ConfirmDialog.tsx), with the labels passed in
// (Finterest's i18n is not a hook) and no catalog-specific bodies.
import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/**
 * Modal confirmation: says what will happen before anything does. Keyboard first: focus goes to
 * the safe choice (cancel), stays inside the dialog, and Escape cancels. Clicking the dimmed
 * backdrop cancels too.
 */
export function Dialog({ title, icon = 'alert', tone = 'accent', confirmLabel, cancelLabel, onConfirm, onCancel, children }: {
  title: string;
  icon?: IconName;
  tone?: 'warning' | 'danger' | 'accent';
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancel.current?.focus();
    return () => previous?.focus?.();
  }, []);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key !== 'Tab' || !dialog.current) return;
    const focusable = [...dialog.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <div ref={dialog} className={`dialog tone-${tone}`} role="alertdialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={onKeyDown}>
        <div className="dialog-head">
          <span className="dialog-icon" aria-hidden="true"><Icon name={icon} size={20} /></span>
          <h2 id={titleId}>{title}</h2>
        </div>
        <div className="dialog-body">{children}</div>
        <div className="dialog-actions">
          <button ref={cancel} type="button" className="ghost" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className={tone === 'danger' ? 'danger-fill' : ''} data-sound="none" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
