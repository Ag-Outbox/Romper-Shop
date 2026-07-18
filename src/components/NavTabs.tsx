import { NavLink } from 'react-router-dom';

/* Abas principais do site — mesmas em todas as páginas (TopBar e hero da
   Home). Em telas estreitas a fileira rola na horizontal, como nas grandes
   lojas. A aba ativa ganha volt + sublinhado. */

const TABS = [
  { label: 'Início', to: '/', end: true },
  { label: 'Promoções', to: '/promocoes' },
  { label: 'Em alta', to: '/em-alta' },
  { label: 'Ser um afiliado', to: '/afiliado' },
  { label: 'Ser um vendedor', to: '/vender' },
  { label: 'Ajuda', to: '/ajuda' },
];

export default function NavTabs({ className = '' }: { className?: string }) {
  return (
    <nav aria-label="Seções da loja" className={`no-scrollbar overflow-x-auto ${className}`}>
      <ul className="flex items-center gap-1 whitespace-nowrap">
        {TABS.map((t) => (
          <li key={t.to}>
            <NavLink
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `relative inline-block px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'font-semibold text-volt after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-volt'
                    : 'text-fog hover:text-mist'
                }`
              }
            >
              {t.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
