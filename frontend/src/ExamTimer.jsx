import { useCallback, useEffect, useRef, useState } from 'react';

export const DEFAULT_DURATION_SECONDS = 3 * 60 * 60; // 3 hours
export const DEFAULT_WARNING_SECONDS = 5 * 60;       // last 5 minutes

// ---------------------------------------------------------------------------
// formatTime(totalSeconds) -> "HH:MM:SS" (or "MM:SS" when under an hour)
// ---------------------------------------------------------------------------
export function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const pad = (n) => String(n).padStart(2, '0');
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

// ---------------------------------------------------------------------------
// useCountdown({ durationSeconds, startTime })
//   Drift-free countdown: the deadline is pinned to a wall-clock moment
//   (startTime, or "now" on first render), and the remaining time is
//   recomputed from Date.now() every tick instead of blindly decrementing.
//   Pass the server's attempt start_time so a page refresh does not
//   reset the clock.
//   Returns { remaining, isExpired, reset }.
// ---------------------------------------------------------------------------
export function useCountdown({
  durationSeconds = DEFAULT_DURATION_SECONDS,
  startTime,
} = {}) {
  const durationRef = useRef(durationSeconds);
  durationRef.current = durationSeconds;

  // Pin the deadline once. If startTime changes later (e.g. the attempt
  // starts after the component mounted), re-pin from the new start time.
  const deadlineRef = useRef(null);
  const deadlineFrom = (start, duration) => {
    const startMs = start ? new Date(start).getTime() : Date.now();
    return startMs + duration * 1000;
  };
  if (deadlineRef.current === null) {
    deadlineRef.current = deadlineFrom(startTime, durationSeconds);
  }
  const lastStartRef = useRef(startTime);
  if (startTime !== lastStartRef.current) {
    lastStartRef.current = startTime;
    if (startTime) {
      deadlineRef.current = deadlineFrom(startTime, durationRef.current);
    }
  }

  const secondsLeft = () =>
    Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));

  const [remaining, setRemaining] = useState(secondsLeft);
  const [isExpired, setIsExpired] = useState(() => secondsLeft() <= 0);
  const expiredRef = useRef(isExpired);

  useEffect(() => {
    const tick = () => {
      const left = secondsLeft();
      setRemaining(left);
      if (left <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        setIsExpired(true);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const reset = useCallback(() => {
    deadlineRef.current = deadlineFrom(startTime, durationRef.current);
    expiredRef.current = false;
    setRemaining(durationRef.current);
    setIsExpired(false);
  }, [startTime]);

  return { remaining, isExpired, reset };
}

// ---------------------------------------------------------------------------
// ExamTimer
//   Countdown display for the exam. Turns red (and pulses) once under
//   warningThresholdSeconds remain, and fires onTimeUp exactly once when it
//   hits zero so the parent can auto-submit the attempt.
// ---------------------------------------------------------------------------
export default function ExamTimer({
  durationSeconds = DEFAULT_DURATION_SECONDS,
  startTime,
  warningThresholdSeconds = DEFAULT_WARNING_SECONDS,
  onTimeUp,
  label = 'Time Remaining',
  title,
}) {
  const { remaining, isExpired } = useCountdown({ durationSeconds, startTime });

  // Fire onTimeUp exactly once, even under React StrictMode double effects.
  const firedRef = useRef(false);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  const fireTimeUp = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    if (typeof onTimeUpRef.current === 'function') {
      onTimeUpRef.current();
    }
  }, []);

  useEffect(() => {
    if (isExpired) fireTimeUp();
  }, [isExpired, fireTimeUp]);

  // Mirror the countdown into the tab title (nice for exam takers).
  useEffect(() => {
    if (title) {
      document.title = `${formatTime(remaining)} remaining - ${title}`;
    }
    return () => {
      if (title) document.title = title;
    };
  }, [remaining, title]);

  const isWarning = !isExpired && remaining <= warningThresholdSeconds;

  const statusClass = isExpired
    ? 'exam-timer exam-timer--expired'
    : isWarning
      ? 'exam-timer exam-timer--warning'
      : 'exam-timer';

  return (
    <div
      className={statusClass}
      role="timer"
      aria-live="off"
      aria-atomic="true"
      aria-label={`${label}: ${formatTime(remaining)}`}
    >
      <span className="exam-timer__icon" aria-hidden="true" />
      <span className="exam-timer__label">{label}</span>
      <span className="exam-timer__time">{formatTime(remaining)}</span>
      {isWarning && !isExpired && (
        <span className="exam-timer__hint">
          {remaining <= 60 ? 'Submit now!' : 'Hurry, time is almost up!'}
        </span>
      )}
      {isExpired && <span className="exam-timer__hint">Time is up</span>}
    </div>
  );
}
