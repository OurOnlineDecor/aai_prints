import { useState, useEffect, useRef } from 'react';
import './RouteProgressBar.css';

/**
 * Ultra-Luxury Golden Laser Top Progress Bar
 * Provides instant visceral feedback on page switches like top luxury brand platforms.
 */
export default function RouteProgressBar({ targetKey }) {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef(null);
  const finishTimerRef = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Avoid triggering animation on initial mount
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Clear previous timers
    if (timerRef.current) clearTimeout(timerRef.current);
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current);

    setIsVisible(true);
    setProgress(28);

    timerRef.current = setTimeout(() => {
      setProgress(76);
      timerRef.current = setTimeout(() => {
        setProgress(100);
        finishTimerRef.current = setTimeout(() => {
          setIsVisible(false);
          setProgress(0);
        }, 220);
      }, 120);
    }, 90);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    };
  }, [targetKey]);

  if (!isVisible && progress === 0) return null;

  return (
    <div
      className={`route-progress-bar-container ${!isVisible ? 'fade-out' : ''}`}
      aria-hidden="true"
    >
      <div
        className="route-progress-bar-fill"
        style={{
          width: `${progress}%`,
        }}
      >
        <div className="route-progress-glow" />
      </div>
    </div>
  );
}
