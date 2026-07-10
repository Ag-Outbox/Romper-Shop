/**
 * Registro central de conectores dropship — SÓ PARA USO NO FRONTEND EM MODO
 * DEMO (sem segredos, sem chamada de rede real). Os conectores REAIS (CJ
 * Dropshipping, Printful, AliExpress, e um conector REST genérico para
 * qualquer outra plataforma) vivem em `supabase/functions/dropship-import/`,
 * que roda em Deno no servidor — nunca no navegador, porque precisam de
 * chaves de API que não podem vazar para o cliente. Veja `src/lib/dropship.ts`
 * para o cliente que decide entre chamar a Edge Function (produção) ou este
 * registry local (demo, sem Supabase configurado).
 */
import { DropshipProvider } from './DropshipProvider';
import { ExampleProvider } from './providers/ExampleProvider';

const providers = new Map<string, DropshipProvider>();

function register(p: DropshipProvider) {
  providers.set(p.slug, p);
}

// --- Conectores registrados (frontend, modo demo) ---
register(new ExampleProvider());

export function getProvider(slug: string): DropshipProvider {
  const p = providers.get(slug);
  if (!p) throw new Error(`Dropship provider não registrado: ${slug}`);
  return p;
}

export function listProviders(): string[] {
  return [...providers.keys()];
}
