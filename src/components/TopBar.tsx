import { Link } from 'react-router-dom';
import { useCart } from '../lib/useCart';

/** Cabeçalho fixo com navegação e contador da sacola. Usado nas páginas
 *  internas (produto, checkout). A Home mantém o hero com nav próprio. */
export default function TopBar() {
  const { count } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/80 backdrop-blur-md">
      <nav className="flex items-center justify-between px-5 md:px-10 h-16">
        <Link to="/" className="font-display text-xl font-semibold tracking-tight">
          Romper<span className="text-volt">.</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm text-fog">
          <Link className="hover:text-mist transition-colors" to="/#categorias">Categorias</Link>
          <Link className="hover:text-mist transition-colors" to="/#algoritmo">Em alta</Link>
          <Link className="hover:text-mist transition-colors" to="/#cod">Pague na entrega</Link>
          <Link className="hover:text-mist transition-colors" to="/#vender">Vender</Link>
        </div>

        <Link
          to="/checkout"
          className="relative rounded-full border border-line px-4 py-2 text-sm hover:border-volt hover:text-volt transition-colors"
        >
          Sacola
          {count > 0 && (
            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-volt px-1.5 min-w-5 h-5 text-xs font-semibold text-ink">
              {count}
            </span>
          )}
        </Link>
      </nav>
    </header>
  );
}
