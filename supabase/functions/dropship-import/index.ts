/**
 * =============================================================================
 * Edge Function: dropship-import
 * =============================================================================
 * Ponto único de entrada para falar com fornecedores de dropshipping. Roda
 * no servidor (Deno, Supabase Edge Functions) de propósito: as chaves de API
 * de cada fornecedor ficam em secrets do lado do servidor e NUNCA chegam ao
 * navegador do vendedor — só o produto já normalizado volta como resposta.
 *
 * Deploy:
 *   supabase functions deploy dropship-import
 *   supabase secrets set CJ_API_EMAIL=... CJ_API_KEY=...
 *   supabase secrets set PRINTFUL_API_KEY=...
 *   supabase secrets set ALIEXPRESS_APP_KEY=... ALIEXPRESS_APP_SECRET=... ALIEXPRESS_ACCESS_TOKEN=...
 *   (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem automaticamente no ambiente da function)
 *
 * Chamada (do frontend, via supabase-js):
 *   supabase.functions.invoke('dropship-import', {
 *     body: { provider: 'demo', action: 'importProduct', payload: { urlOrId: '123' } }
 *   })
 * =============================================================================
 */
import { getProvider } from './registry.ts';
import type { PlaceOrderInput } from './types.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  provider: string;
  action: 'importProduct' | 'syncStock' | 'syncPrice' | 'placeOrder' | 'getTrackingInfo';
  payload: Record<string, unknown>;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

  // A instância do Supabase já exige um JWT válido (verify_jwt) por padrão —
  // aqui garantimos além disso que quem chama está autenticado como vendedor
  // é responsabilidade da tela que invoca (RequireAuth role="seller" no frontend).
  if (req.headers.get('Authorization') == null) {
    return json({ error: 'Não autenticado.' }, 401);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Corpo da requisição inválido (esperado JSON).' }, 400);
  }

  const { provider: slug, action, payload } = body;
  if (!slug || !action) return json({ error: 'Informe "provider" e "action".' }, 400);

  try {
    const provider = await getProvider(slug);
    switch (action) {
      case 'importProduct':
        return json(await provider.importProduct(String(payload?.urlOrId ?? '')));
      case 'syncStock':
        return json(await provider.syncStock((payload?.externalIds as string[]) ?? []));
      case 'syncPrice':
        return json(await provider.syncPrice((payload?.externalIds as string[]) ?? []));
      case 'placeOrder':
        return json(await provider.placeOrder(payload as unknown as PlaceOrderInput));
      case 'getTrackingInfo':
        return json(await provider.getTrackingInfo(String(payload?.providerOrderId ?? '')));
      default:
        return json({ error: `Ação desconhecida: ${action}` }, 400);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido no conector.';
    return json({ error: message }, 502);
  }
});
