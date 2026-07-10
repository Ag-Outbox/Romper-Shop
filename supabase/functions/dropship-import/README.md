# Edge Function: dropship-import

Ponto único para importar produtos de fornecedores de dropshipping. Roda no
servidor (Deno / Supabase Edge Functions) — as chaves de API de cada
fornecedor ficam em secrets do lado do servidor e nunca chegam ao navegador.

## Status de cada conector (seja honesto ao configurar)

| Conector | Arquivo | Status |
|---|---|---|
| Demo | `providers/demo.ts` | ✅ Funciona sem nenhuma credencial — use para testar o deploy e o fluxo. |
| CJ Dropshipping | `providers/cjdropshipping.ts` | 🟡 Implementado contra a API pública documentada (developers.cjdropshipping.com). **Não testado ao vivo** nesta sandbox (sem rede/credenciais). Confira nomes de campo da resposta antes de produção — a CJ já mudou contrato entre versões. |
| Printful | `providers/printful.ts` | 🟡 Implementado contra a API pública documentada (developers.printful.com), auth simples (Bearer). **Não testado ao vivo.** Fulfillment sob demanda — sem estoque tradicional. |
| AliExpress | `providers/aliexpress.ts` | 🟡 Mecanismo de assinatura (HMAC-SHA256) é o oficial e está correto. A API de Dropshipping (`aliexpress.ds.*`) exige **aprovação de app** no Open Platform — não é self-service imediato. Nomes de campo da resposta são best-effort. |
| Zendrop / Spocket / DSers / outros | `providers/generic-rest.ts` | ⚙️ Essas plataformas têm API de parceiro com acesso restrito/sob aprovação e formato que muda por conta. Em vez de arriscar um conector que parece funcionar mas não bate com a sua conta, use o **conector REST genérico**: configure `baseUrl` + caminho + mapeamento de campos em `dropship_providers.config` (veja o cabeçalho de `generic-rest.ts`). Serve para qualquer fornecedor com API REST, não só esses três. |
| Importação manual (colar JSON) | `src/lib/manualImport.ts` (frontend) | ✅ Funciona para **qualquer** plataforma — sem API, sem Edge Function. Cole os dados exportados do fornecedor (JSON) e o produto é normalizado localmente. Mais lento (não é "1 clique"), mas nunca depende de aprovação de API. |

## Deploy

```bash
supabase functions deploy dropship-import
```

## Secrets (por conector que você for usar)

```bash
# CJ Dropshipping
supabase secrets set CJ_API_EMAIL=seu-email@... CJ_API_KEY=sua-chave

# Printful
supabase secrets set PRINTFUL_API_KEY=sua-chave PRINTFUL_STORE_ID=opcional

# AliExpress (requer app aprovado no Open Platform com permissão Dropshipping)
supabase secrets set ALIEXPRESS_APP_KEY=... ALIEXPRESS_APP_SECRET=... ALIEXPRESS_ACCESS_TOKEN=...

# Conector genérico (ex.: Zendrop) — o NOME do secret é o que você referenciar
# em dropship_providers.config.authValueEnv
supabase secrets set ZENDROP_API_KEY=sua-chave
```

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já existem automaticamente no
ambiente de toda Edge Function — não precisa configurá-los.

## Registrar um fornecedor genérico

```sql
insert into dropship_providers (name, slug, api_base_url, config) values (
  'Zendrop', 'zendrop', 'https://api.zendrop.com',
  '{
     "productPath": "/v1/products/{id}",
     "authHeader": "Authorization",
     "authValueEnv": "ZENDROP_API_KEY",
     "authValuePrefix": "Bearer ",
     "fieldMap": {
       "title": "product.title",
       "images": "product.images",
       "costCents": "product.price",
       "variants": "product.variants"
     }
   }'::jsonb
);
```

## Chamar a partir do frontend

```ts
const { data, error } = await supabase.functions.invoke('dropship-import', {
  body: { provider: 'demo', action: 'importProduct', payload: { urlOrId: '123' } },
});
```

Isso já está implementado em `src/lib/dropship.ts`.
