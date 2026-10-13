import React, { useEffect, useRef, useState } from 'react';

interface TimerProps {
  initialSeconds: number;
  onTimeUp: () => void;
  isActive: boolean;
}

export const Timer: React.FC<TimerProps> = ({ initialSeconds, onTimeUp, isActive }) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const onTimeUpRef = useRef(onTimeUp);
  const firedRef = useRef(false);

  // Always call the latest handler without restarting the countdown on every render
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  // Count down once per second while active
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  // Fire time-up exactly once, when the clock reaches zero
  useEffect(() => {
    if (seconds === 0 && isActive && !firedRef.current) {
      firedRef.current = true;
      onTimeUpRef.current();
    }
  }, [seconds, isActive]);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isWarning = seconds < 30;

  return (
    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: isWarning ? '#e74c3c' : '#3498db' }}>
      ⏱️ {minutes}:{secs.toString().padStart(2, '0')}
    </div>
  );
};
