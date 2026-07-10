import { Link } from 'react-router-dom';

/** Rodapé editorial compartilhado — fecha toda página com o wordmark gigante. */
export default function SiteFooter() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-line">
      <div className="grid gap-10 px-5 py-14 md:grid-cols-[1fr_auto] md:px-10">
        <div>
          <p className="max-w-xl font-display text-3xl font-semibold text-balance md:text-5xl">
            Um lugar. <span className="text-fog">Tudo que você procura.</span>
          </p>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 text-sm text-fog">
            <a href="#" className="hover:text-mist transition-colors">Sobre</a>
            <Link to="/vender" className="hover:text-mist transition-colors">Vender</Link>
            <Link to="/afiliado" className="hover:text-mist transition-colors">Afiliados</Link>
            <a href="#" className="hover:text-mist transition-colors">Ajuda</a>
            <a href="#" className="hover:text-mist transition-colors">Privacidade</a>
          </div>
        </div>
        <div className="text-sm text-fog md:text-right">
          <Link to="/" className="font-display text-lg text-mist">
            Romper<span className="text-volt">.</span>
          </Link>
          <p className="mt-3">© {new Date().getFullYear()} Romper Shop</p>
          <p className="mt-1 font-mono text-xs tracking-widest">ACHE · VENDA · INDIQUE</p>
        </div>
      </div>

      {/* wordmark gigante vazado fechando a página */}
      <div
        aria-hidden
        className="pointer-events-none select-none whitespace-nowrap px-5 pb-4 font-display font-semibold leading-[0.8] text-outline text-[clamp(4rem,17vw,15rem)] md:px-10"
      >
        ROMPER SHOP<span className="text-outline-volt">.</span>
      </div>
    </footer>
  );
}
