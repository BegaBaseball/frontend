import { useEffect, useRef, useState } from 'react';

interface RollingNumberProps {
  value: number;
}

type RollDirection = 'up' | 'down';

export default function RollingNumber({ value }: RollingNumberProps) {
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [direction, setDirection] = useState<RollDirection>('up');
  const lastValueRef = useRef(value);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === lastValueRef.current) return;

    setDirection(value > lastValueRef.current ? 'up' : 'down');
    setPreviousValue(lastValueRef.current);
    lastValueRef.current = value;

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setPreviousValue(null);
    }, 300);
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const incomingClass = direction === 'up' ? 'animate-roll-in-up' : 'animate-roll-in-down';
  const outgoingClass = direction === 'up' ? 'animate-roll-out-up' : 'animate-roll-out-down';

  return (
    <div className="relative h-5 min-w-[16px] overflow-hidden text-[13px] font-medium leading-5">
      {previousValue !== null && (
        <span className={`absolute left-0 right-0 ${outgoingClass}`}>
          {previousValue}
        </span>
      )}
      <span className={`block ${previousValue !== null ? incomingClass : ''}`}>{value}</span>
    </div>
  );
}
