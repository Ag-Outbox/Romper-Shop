import { storeBadges } from '../lib/badges';

/* Fileira de selos de confiança da loja — usada na loja pública e no produto. */

export default function StoreBadges({ seller, size = 'sm' }: {
  seller: { slug: string; ratingAvg: number; ratingCount: number };
  size?: 'sm' | 'xs';
}) {
  const badges = storeBadges(seller);
  if (badges.length === 0) return null;
  const cls = size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b) => (
        <span
          key={b.id}
          title={b.hint}
          className={`inline-flex items-center gap-1 rounded-full font-mono ${cls} ${
            b.id === 'official' ? 'bg-volt/15 text-volt' : b.id === 'fast' ? 'bg-ember/15 text-ember' : 'border border-line text-fog'
          }`}
        >
          <span aria-hidden>{b.icon}</span> {b.label}
        </span>
      ))}
    </div>
  );
}
