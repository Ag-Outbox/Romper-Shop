import { useEffect } from 'react';

/* Título e meta description por página (SPA). Chame no topo de cada página;
   valores undefined caem no padrão do site. */

const BASE = 'Romper Shop';
const DEFAULT_TITLE = `${BASE} — Achadinhos, moda e muito mais`;
const DEFAULT_DESC =
  'Marketplace multi-categoria: moda, achadinhos e milhares de produtos. ' +
  'Vendedores independentes e dropshipping, com pagamento na entrega.';

export function usePageMeta(title?: string, description?: string): void {
  useEffect(() => {
    document.title = title ? `${title} — ${BASE}` : DEFAULT_TITLE;

    let el = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!el) {
      el = document.createElement('meta');
      el.name = 'description';
      document.head.appendChild(el);
    }
    el.content = description ?? DEFAULT_DESC;
  }, [title, description]);
}
