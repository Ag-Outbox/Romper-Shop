import { useEffect, useState } from 'react';

function parts(msLeft: number): string {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

/** Contador regressivo HH:MM:SS até um epoch ms. */
export default function Countdown({ endsAt, className = '' }: { endsAt: number; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className={`font-mono tabular-nums ${className}`} aria-live="off">
      {parts(endsAt - now)}
    </span>
  );
}
