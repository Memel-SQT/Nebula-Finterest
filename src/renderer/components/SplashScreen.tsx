import { useEffect, useState } from 'react';
import { translate, type Language } from '../i18n';

// Long enough for the full sequence (halo -> orbit -> bars -> star -> wordmark)
// to finish before the fade-out; see the .splash-* delays in styles.css.
const SPLASH_DURATION_MS = 2400;
const SPLASH_DURATION_REDUCED_MS = 250;
const SPLASH_FADE_MS = 380;

export function SplashScreen({ language, onFinish }: { language: Language; onFinish: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? SPLASH_DURATION_REDUCED_MS : SPLASH_DURATION_MS;
    const leaveTimer = window.setTimeout(() => setLeaving(true), duration);
    const finishTimer = window.setTimeout(onFinish, duration + (reduced ? 0 : SPLASH_FADE_MS));
    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <main className={`splash-screen ${leaving ? 'splash-leaving' : ''}`}>
      <svg className="splash-mark" viewBox="0 0 128 128" role="img" aria-labelledby="splash-title">
        <title id="splash-title">{translate(language, 'app.name')}</title>
        <defs>
          <linearGradient id="splash-gradient" x1="16" y1="16" x2="112" y2="112" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4C6EF5" />
            <stop offset="1" stopColor="#A855F7" />
          </linearGradient>
          <radialGradient id="splash-halo" cx="0.5" cy="0.32" r="0.78">
            <stop stopColor="#8B5CF6" stopOpacity="0.42" />
            <stop offset="1" stopColor="#8B5CF6" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect className="splash-mark-plate" width="128" height="128" rx="30" fill="#12121F" />
        <rect className="splash-mark-halo" width="128" height="128" rx="30" fill="url(#splash-halo)" />
        <ellipse
          className="splash-mark-orbit"
          cx="64"
          cy="64"
          rx="47"
          ry="21"
          transform="rotate(-30 64 64)"
          fill="none"
          stroke="url(#splash-gradient)"
          strokeWidth="6"
          opacity="0.55"
        />
        <path className="splash-mark-bar splash-mark-bar-1" d="M40 92V72" fill="none" stroke="url(#splash-gradient)" strokeLinecap="round" strokeWidth="12" />
        <path className="splash-mark-bar splash-mark-bar-2" d="M64 92V56" fill="none" stroke="url(#splash-gradient)" strokeLinecap="round" strokeWidth="12" />
        <path className="splash-mark-bar splash-mark-bar-3" d="M88 92V40" fill="none" stroke="url(#splash-gradient)" strokeLinecap="round" strokeWidth="12" />
        <circle className="splash-mark-star" cx="88" cy="22" r="6.5" fill="#A855F7" />
      </svg>
      <div className="splash-text">
        <strong>{translate(language, 'app.name')}</strong>
        <span>{translate(language, 'app.tagline')}</span>
      </div>
      <div className="splash-progress" aria-hidden="true"><i /></div>
    </main>
  );
}
