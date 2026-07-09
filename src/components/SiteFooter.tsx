import { Link } from 'react-router-dom';

/** Rodapé compartilhado entre as páginas. */
export default function SiteFooter() {
  return (
    <footer className="px-5 md:px-10 py-12 border-t border-line flex flex-col md:flex-row justify-between gap-6 text-sm text-fog">
      <Link to="/" className="font-display text-lg text-mist">
        Romper<span className="text-volt">.</span>
      </Link>
      <div className="flex flex-wrap gap-x-8 gap-y-2">
        <a href="#" className="hover:text-mist">Sobre</a>
        <a href="#" className="hover:text-mist">Vender</a>
        <a href="#" className="hover:text-mist">Ajuda</a>
        <a href="#" className="hover:text-mist">Privacidade</a>
      </div>
      <span>© {new Date().getFullYear()} Romper Shop</span>
    </footer>
  );
}
