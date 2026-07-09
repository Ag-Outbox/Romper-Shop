import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../lib/useCart';
import { useAuth, type Role } from '../lib/auth';

const ACCOUNT_PATH: Record<Role, string> = { buyer: '/conta', seller: '/vendedor', admin: '/admin' };

/** Cabeçalho fixo com busca, conta e contador da sacola. Usado nas páginas
 *  internas (categoria, busca, produto, checkout). A Home mantém o hero próprio. */
export default function TopBar() {
  const { count } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [term, setTerm] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = term.trim();
    if (v) navigate(`/busca?q=${encodeURIComponent(v)}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/80 backdrop-blur-md">
      <nav className="flex items-center gap-4 md:gap-6 px-5 md:px-10 h-16">
        <Link to="/" className="font-display text-xl font-semibold tracking-tight shrink-0">
          Romper<span className="text-volt">.</span>
        </Link>

        <form
          onSubmit={submit}
          className="flex flex-1 items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 max-w-xl focus-within:border-volt transition-colors"
        >
          <span className="text-fog text-sm">⌕</span>
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar produtos…"
            aria-label="Buscar produtos"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-fog"
          />
        </form>

        <Link
          to={user ? ACCOUNT_PATH[user.role] : '/entrar'}
          className="hidden sm:block shrink-0 rounded-full border border-line px-4 py-2 text-sm hover:border-volt hover:text-volt transition-colors"
        >
          {user ? user.fullName.split(' ')[0] : 'Entrar'}
        </Link>

        <Link
          to="/checkout"
          className="relative shrink-0 rounded-full border border-line px-4 py-2 text-sm hover:border-volt hover:text-volt transition-colors"
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
