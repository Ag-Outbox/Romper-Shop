import { Link } from 'react-router-dom';
import SmartImage from './SmartImage';
import { formatBRL, discountPercent } from '../lib/format';
import { useFavorites } from '../lib/useFavorites';
import type { Product } from '../lib/types';

/** Card de produto para grids (categoria, relacionados, busca). */
export default function ProductCard({ product }: { product: Product }) {
  const off = discountPercent(product.priceCents, product.compareAtCents);
  const { isFavorite, toggle } = useFavorites();
  const favorited = isFavorite(product.id);

  return (
    <Link
      to={`/produto/${product.slug}`}
      className="group flex flex-col rounded-xl2 border border-line card-grad overflow-hidden transition-all duration-300 ease-smooth hover:border-volt hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="relative aspect-square overflow-hidden bg-ink">
        <SmartImage
          src={product.images[0]?.url}
          alt={product.images[0]?.alt ?? product.title}
          label={product.title}
          className="absolute inset-0"
          imgClassName="transition-transform duration-700 ease-smooth group-hover:scale-105"
        />
        {product.codAvailable && (
          <span className="absolute left-3 top-3 rounded-full bg-ink/80 px-2.5 py-1 font-mono text-[10px] text-volt backdrop-blur">
            ◎ COD
          </span>
        )}
        {off && (
          <span className="absolute right-3 top-3 rounded-full bg-ember px-2 py-1 font-mono text-[10px] font-semibold text-ink">
            -{off}%
          </span>
        )}
        <button
          onClick={(e) => { e.preventDefault(); toggle(product.id); }}
          aria-label={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          aria-pressed={favorited}
          className={`absolute bottom-3 right-3 grid h-8 w-8 place-items-center rounded-full backdrop-blur transition-colors ${
            favorited ? 'bg-volt text-ink' : 'bg-ink/70 text-mist hover:text-volt'
          }`}
        >
          <span aria-hidden>{favorited ? '♥' : '♡'}</span>
        </button>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-sm text-mist line-clamp-2 group-hover:text-volt transition-colors">{product.title}</p>
        <div className="mt-auto pt-3">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-lg tabular-nums">{formatBRL(product.priceCents)}</span>
            {product.compareAtCents && product.compareAtCents > product.priceCents && (
              <span className="text-xs text-fog line-through tabular-nums">{formatBRL(product.compareAtCents)}</span>
            )}
          </div>
          <p className="mt-1 font-mono text-xs text-fog">
            ★ {product.ratingAvg.toFixed(1)} · {product.salesCount.toLocaleString('pt-BR')} vendidos
          </p>
        </div>
      </div>
    </Link>
  );
}
