import { useCallback, useEffect, useRef, useState } from 'react';
import './splash.css';

// The reveal + progress line take ~4.2s of CSS keyframes (see splash.css).
// After that we add .splash-screen--exit; the fade-out duration below must
// stay in sync with the splashExit animation in splash.css.
const INTRO_MS = 4200;
const EXIT_MS = 750;

export default function SplashScreen({ onDone }) {
  const [leaving, setLeaving] = useState(false);
  const finishedRef = useRef(false);
  const onDoneRef = useRef(onDone);

  onDoneRef.current = onDone;

  // hand control back to the app exactly once
  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (typeof onDoneRef.current === 'function') onDoneRef.current();
  }, []);

  // play the intro, then start the fade-out
  useEffect(() => {
    const hold = window.setTimeout(() => setLeaving(true), INTRO_MS);
    return () => window.clearTimeout(hold);
  }, []);

  // safety net: if animationend never lands (hidden tab, print, etc.) the
  // splash must still get out of the way
  useEffect(() => {
    if (!leaving) return undefined;
    const fallback = window.setTimeout(finish, EXIT_MS + 400);
    return () => window.clearTimeout(fallback);
  }, [leaving, finish]);

  // a click, a tap or any key skips straight to the fade-out
  useEffect(() => {
    const skip = () => setLeaving(true);
    window.addEventListener('pointerdown', skip);
    window.addEventListener('touchstart', skip, { passive: true });
    window.addEventListener('keydown', skip);
    window.addEventListener('wheel', skip, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('touchstart', skip);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('wheel', skip);
    };
  }, []);

  return (
    <div
      className={`splash-screen${leaving ? ' splash-screen--exit' : ''}`}
      role="presentation"
      onAnimationEnd={(event) => {
        if (leaving && event.target === event.currentTarget) finish();
      }}
    >
      {/* Cinematic light streaks */}
      <div className="splash-light splash-light--one"></div>
      <div className="splash-light splash-light--two"></div>
      <div className="splash-light splash-light--three"></div>

      {/* Subtle background glow */}
      <div className="splash-glow"></div>

      <div className="splash-content">
        {/* Original AceIT Up symbol */}
        <div className="splash-symbol">
          <span>A</span>
        </div>

        {/* Brand name */}
        <h1 className="splash-title">
          <span>Ace</span><span>IT</span><span> Up</span>
        </h1>

        {/* Tagline */}
        <p className="splash-tagline">
          Let&apos;s go beyond rote learning.
        </p>
      </div>

      {/* Bottom loading line */}
      <div className="splash-progress">
        <div className="splash-progress__bar"></div>
      </div>
    </div>
  );
}
