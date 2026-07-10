import { supabase, isSupabaseConfigured } from './supabase';
import { getProvider as getLocalProvider } from '../services/dropship/registry';
import { parseManualImport } from './manualImport';
import type { NormalizedProduct } from '../services/dropship/DropshipProvider';

/* ---------------------------------------------------------------------------
   Cliente único de importação dropship, usado pelo painel do vendedor.
   Roteia para 3 caminhos diferentes conforme o fornecedor escolhido:

   1. 'example'  — roda 100% no navegador (services/dropship/ExampleProvider),
                   sem segredos, sem rede. Sempre disponível, mesmo sem Supabase.
   2. 'manual'   — cola JSON exportado de QUALQUER plataforma; normalizado
                   localmente (lib/manualImport). Sempre disponível.
   3. outros     — fornecedores reais (CJ Dropshipping, Printful, AliExpress,
                   ou um conector REST genérico configurado no banco). Só
                   funcionam com Supabase configurado: a chamada de rede real
                   acontece na Edge Function `dropship-import`, que mantém as
                   chaves de API protegidas no servidor.
--------------------------------------------------------------------------- */

export interface DropshipProviderOption {
  slug: string;
  label: string;
  needsSupabase: boolean;
  hint?: string;
}

export const PROVIDER_OPTIONS: DropshipProviderOption[] = [
  { slug: 'example', label: 'Demo (sem credenciais)', needsSupabase: false },
  { slug: 'manual', label: 'Colar dados manualmente (qualquer plataforma)', needsSupabase: false },
  { slug: 'cjdropshipping', label: 'CJ Dropshipping', needsSupabase: true, hint: 'requer secrets CJ_API_EMAIL / CJ_API_KEY' },
  { slug: 'printful', label: 'Printful', needsSupabase: true, hint: 'requer secret PRINTFUL_API_KEY' },
  { slug: 'aliexpress', label: 'AliExpress', needsSupabase: true, hint: 'requer app aprovado no Open Platform' },
];

export function availableProviders(): DropshipProviderOption[] {
  return PROVIDER_OPTIONS.filter((p) => !p.needsSupabase || isSupabaseConfigured);
}

export async function importFromProvider(slug: string, input: string): Promise<NormalizedProduct> {
  if (slug === 'manual') return parseManualImport(input);

  if (slug === 'example') return getLocalProvider('example').importProduct(input);

  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Este fornecedor precisa do Supabase configurado (a chamada real roda na Edge Function).');
  }

  const { data, error } = await supabase.functions.invoke('dropship-import', {
    body: { provider: slug, action: 'importProduct', payload: { urlOrId: input } },
  });
  if (error) throw new Error(error.message ?? 'Falha ao importar do fornecedor.');
  return data as NormalizedProduct;
}
