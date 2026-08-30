import './splash.css';

export default function SplashScreen() {
  return (
    <div className="splash-screen">
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
          Let's go beyond rote learning.
        </p>
      </div>

      {/* Bottom loading line */}
      <div className="splash-progress">
        <div className="splash-progress__bar"></div>
      </div>
    </div>
  );
}