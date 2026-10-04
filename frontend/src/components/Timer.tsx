import React, { useEffect, useState } from 'react';

interface TimerProps {
  initialSeconds: number;
  onTimeUp: () => void;
  isActive: boolean;
}

export const Timer: React.FC<TimerProps> = ({ initialSeconds, onTimeUp, isActive }) => {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (!isActive) return;

    if (seconds === 0) {
      onTimeUp();
      return;
    }

    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [seconds, isActive, onTimeUp]);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isWarning = seconds < 30;

  return (
    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: isWarning ? '#e74c3c' : '#3498db' }}>
      ⏱️ {minutes}:{secs.toString().padStart(2, '0')}
    </div>
  );
};
