import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Volta ao topo a cada troca de rota (SPA não faz isso sozinha). */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
