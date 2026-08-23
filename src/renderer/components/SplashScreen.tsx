import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { translate, type Language } from '../i18n';

const SPLASH_DURATION_MS = 1900;
const SPLASH_DURATION_REDUCED_MS = 250;

export function SplashScreen({ language, onFinish }: { language: Language; onFinish: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? SPLASH_DURATION_REDUCED_MS : SPLASH_DURATION_MS;
    const leaveTimer = window.setTimeout(() => setLeaving(true), duration);
    const finishTimer = window.setTimeout(onFinish, duration + (reduced ? 0 : 320));
    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <main className={`splash-screen ${leaving ? 'splash-leaving' : ''}`}>
      <svg className="splash-mark" viewBox="0 0 128 128" role="img" aria-labelledby="splash-title">
        <title id="splash-title">Finterest</title>
        <defs>
          <linearGradient id="splash-gradient" x1="20" y1="20" x2="108" y2="108" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2ac98c" />
            <stop offset="1" stopColor="#1b8f5f" />
          </linearGradient>
        </defs>
        <rect className="splash-mark-bg" width="128" height="128" rx="28" fill="#080b0d" />
        <path className="splash-mark-stroke splash-mark-stroke-1" style={{ '--dash': 120 } as CSSProperties} d="M38 92V36h50" fill="none" stroke="url(#splash-gradient)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="11" />
        <path className="splash-mark-stroke splash-mark-stroke-2" style={{ '--dash': 45 } as CSSProperties} d="M38 62h33" fill="none" stroke="url(#splash-gradient)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="11" />
        <circle className="splash-mark-dot" cx="93" cy="92" r="7" fill="#cda75a" />
      </svg>
      <div className="splash-text">
        <strong>{translate(language, 'app.name')}</strong>
        <span>{translate(language, 'app.tagline')}</span>
      </div>
    </main>
  );
}
