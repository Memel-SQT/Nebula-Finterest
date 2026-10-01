import { useEffect } from 'react';
import type { MotionLevel } from './appearance';
import { playSound, type SoundName } from './sound';
import type { ResolvedTheme } from './theme';

const SOUND_NAMES: SoundName[] = ['tap', 'nav', 'toggle', 'success', 'delete', 'error', 'unlock', 'open'];

/** Surfaces that catch the moving highlight in the liquid glass themes. */
const GLASS_SURFACES = '.summary-card, .balance-panel, .snapshot-panel, .field-group, .list-card, .settings-panel, .advanced-panel, .calendar-panel, .profile-panel, .account-card, .sidebar';

/**
 * Interface-wide feedback, attached once at the document level instead of in every component:
 * - a click sound on every button, chosen by its `data-sound` attribute (`none` to opt out,
 *   used where the action plays its own success/delete sound once it completes);
 * - a ripple from the click point (full motion only);
 * - in the glass themes, a soft light that follows the pointer across the hovered surface.
 */
export function useInterfaceEffects(motion: MotionLevel, theme: ResolvedTheme): void {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const button = (event.target as Element | null)?.closest?.('button');
      if (!button || button.disabled) {
        return;
      }
      const requested = button.dataset.sound;
      if (requested !== 'none') {
        playSound(SOUND_NAMES.includes(requested as SoundName) ? (requested as SoundName) : 'tap');
      }
      if (motion === 'full' && !button.classList.contains('account-tile') && event.detail > 0) {
        spawnRipple(button, event);
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [motion]);

  useEffect(() => {
    if (!theme.startsWith('glass-') || motion !== 'full') {
      return;
    }
    let frame = 0;
    let lastEvent: PointerEvent | null = null;
    const apply = () => {
      frame = 0;
      const event = lastEvent;
      const surface = (event?.target as Element | null)?.closest?.(GLASS_SURFACES) as HTMLElement | null;
      if (!event || !surface) {
        return;
      }
      const bounds = surface.getBoundingClientRect();
      surface.style.setProperty('--mx', `${event.clientX - bounds.left}px`);
      surface.style.setProperty('--my', `${event.clientY - bounds.top}px`);
    };
    const onMove = (event: PointerEvent) => {
      lastEvent = event;
      if (!frame) {
        frame = window.requestAnimationFrame(apply);
      }
    };
    document.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onMove);
      window.cancelAnimationFrame(frame);
    };
  }, [theme, motion]);
}

function spawnRipple(button: HTMLElement, event: MouseEvent): void {
  const bounds = button.getBoundingClientRect();
  const size = Math.max(bounds.width, bounds.height) * 2.2;
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${event.clientX - bounds.left - size / 2}px`;
  ripple.style.top = `${event.clientY - bounds.top - size / 2}px`;
  button.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  // Safety net if the animation never runs (element detached, animations disabled).
  window.setTimeout(() => ripple.remove(), 900);
}
