import type { ReactNode } from 'react';

/** Cartão de indicador (KPI) para os dashboards. */
export default function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="min-w-0 rounded-xl2 border border-line card-grad p-5">
      <p className="font-mono text-xs text-fog tracking-widest">{label}</p>
      <p className="mt-2 font-display text-2xl lg:text-3xl tabular-nums break-words">{value}</p>
      {hint && <p className="mt-1 text-xs text-fog">{hint}</p>}
    </div>
  );
}
