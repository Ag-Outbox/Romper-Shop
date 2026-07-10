/**
 * Resolve um DropshipProvider pelo slug. Os conectores dedicados (com nome
 * de fornecedor real) são hardcoded aqui; qualquer outro slug é resolvido
 * como GenericRestProvider, lendo a config de `dropship_providers.config`
 * no banco (ver providers/generic-rest.ts para o formato esperado).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { DropshipProvider } from './types.ts';
import { CJDropshippingProvider } from './providers/cjdropshipping.ts';
import { PrintfulProvider } from './providers/printful.ts';
import { AliExpressProvider } from './providers/aliexpress.ts';
import { DemoProvider } from './providers/demo.ts';
import { GenericRestProvider, type GenericRestConfig } from './providers/generic-rest.ts';

const DEDICATED: Record<string, () => DropshipProvider> = {
  cjdropshipping: () => new CJDropshippingProvider(),
  printful: () => new PrintfulProvider(),
  aliexpress: () => new AliExpressProvider(),
  demo: () => new DemoProvider(),
};

export async function getProvider(slug: string): Promise<DropshipProvider> {
  const dedicated = DEDICATED[slug];
  if (dedicated) return dedicated();

  // Slug não hardcoded: procura config de conector genérico no banco.
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    throw new Error(`Fornecedor "${slug}" não é um conector dedicado e as credenciais de banco não estão configuradas para resolver um conector genérico.`);
  }
  const admin = createClient(supabaseUrl, serviceKey);
  const { data, error } = await admin
    .from('dropship_providers')
    .select('config')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  if (!data?.config?.baseUrl) {
    throw new Error(`Fornecedor "${slug}" não encontrado ou sem config de conector genérico (baseUrl) em dropship_providers.`);
  }
  return new GenericRestProvider(slug, data.config as GenericRestConfig);
}

export function listDedicatedProviders(): string[] {
  return Object.keys(DEDICATED);
}
