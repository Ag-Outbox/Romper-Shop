import { NavLink } from 'react-router-dom';
import { useCart } from '../lib/useCart';
import { useAuth, type Role } from '../lib/auth';
import { pendingActionCount } from '../lib/notifications';

const ACCOUNT_PATH: Record<Role, string> = { buyer: '/conta', seller: '/vendedor', admin: '/admin' };

/* Ícones inline (stroke, 22x22) — sem dependência externa, mesmo traço em todos. */
function IconHome() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9a1 1 0 0 0 1 1H9v-6h6v6h2.5a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4" />
    </svg>
  );
}
function IconBag() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8h12l1 12.5a1 1 0 0 1-1 1.5H6a1 1 0 0 1-1-1.5L6 8Z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.6" /><path d="M4.5 20c1.4-3.6 4.3-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
    </svg>
  );
}

/** Navegação inferior fixa, só no mobile — Início/Busca/Sacola/Conta,
 *  cobrindo o acesso que o TopBar esconde abaixo do breakpoint `sm`. */
export default function MobileTabBar() {
  const { count } = useCart();
  const { user } = useAuth();
  const pending = pendingActionCount(user);
  const accountPath = user ? ACCOUNT_PATH[user.role] : '/entrar';

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
      isActive ? 'text-volt' : 'text-fog'
    }`;

  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/90 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navegação principal"
    >
      <div className="flex">
        <NavLink to="/" end className={tabClass}>
          <IconHome />
          <span className="text-[10px] font-mono tracking-wide">Início</span>
        </NavLink>
        <NavLink to="/busca" className={tabClass}>
          <IconSearch />
          <span className="text-[10px] font-mono tracking-wide">Busca</span>
        </NavLink>
        <NavLink to="/checkout" className={tabClass}>
          <span className="relative">
            <IconBag />
            {count > 0 && (
              <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-volt px-1 text-[9px] font-semibold text-ink">
                {count}
              </span>
            )}
          </span>
          <span className="text-[10px] font-mono tracking-wide">Sacola</span>
        </NavLink>
        <NavLink to={accountPath} className={tabClass}>
          <span className="relative">
            <IconUser />
            {pending > 0 && (
              <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-ember px-1 text-[9px] font-semibold text-ink">
                {pending}
              </span>
            )}
          </span>
          <span className="text-[10px] font-mono tracking-wide">Conta</span>
        </NavLink>
      </div>
    </nav>
  );
}
