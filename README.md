# Marketplace Multi-Vendedor — Fundação (Fase 1)

Base gerada e **validada** para o marketplace estilo Shopee: dropshipping afiliado
+ marketplace aberto + Cash On Delivery. Stack: React/Vite/TS + Supabase +
Vercel + Coolify.

## O que está pronto e verificado

| Item | Status |
|------|--------|
| Schema Supabase completo (5 migrations, 120 statements) | ✅ validado no parser oficial do Postgres (libpg-query) |
| Row Level Security em todas as tabelas sensíveis | ✅ 59 políticas |
| Contrato de dropshipping (Adapter) + conector de exemplo + registry | ✅ compila em `tsc --strict` |
| Stub documentado do algoritmo de recomendação | ✅ estrutura pronta, lógica NÃO implementada (como pedido) |

## Decisões de arquitetura aplicadas

- **Checkout multi-vendedor:** `orders` (pai, o que o comprador vê) →
  `sub_orders` (1 por vendedor, gerenciado independentemente) → `order_items`.
  Padrão Shopee/Amazon. Suporta split de repasse e comissão por sub-pedido.
- **COD por produto:** flag `cod_available` + `cod_max_cents` no produto, e
  regras de elegibilidade (CEP, reputação do comprador via `buyer_score` /
  `cod_refusals`). Fluxo completo e paralelo na tabela `cod_orders`.
- **Preços em centavos** (`bigint`) em todo o sistema — sem float.
- **Dropshipping:** abstração `DropshipProvider` (importProduct, syncStock,
  syncPrice, placeOrder, getTrackingInfo). Novo fornecedor = nova classe, sem
  tocar no resto. Chamadas reais devem rodar em Edge Functions/worker (secrets
  fora do frontend).

## Estrutura

```
supabase/migrations/
  0001_core_schema.sql     enums, profiles, sellers, categories
  0002_products.sql        products, variants, images, dropship_providers, full-text search
  0003_orders.sql          carts, orders, sub_orders, order_items, payments, cod_orders, payouts
  0004_reviews_scores.sql  reviews, favorites, chat, product_scores (recomendação)
  0005_rls.sql             políticas RLS + funções helper (is_admin, my_seller_id)
src/services/
  recommendationEngine.ts  STUB documentado (não implementado)
  dropship/
    DropshipProvider.ts    interface do adapter
    registry.ts            resolve provider por slug
    providers/
      ExampleProvider.ts   conector mockado (molde p/ reais)
```

## Próximos passos (no seu Claude Code, com credenciais reais)

1. `supabase init` no repo e aplicar as migrations: `supabase db push`.
2. Scaffold Vite: `npm create vite@latest . -- --template react-ts` + Tailwind +
   Framer Motion + GSAP.
3. Home page padrão Awwwards (scroll storytelling, grid editorial, dark mode).
4. Auth + 3 dashboards (comprador / vendedor / admin).
5. Checkout com abas **Pagamento Online** e **COD**.
6. Edge Functions para as chamadas dropship reais (CJ, DSers, Spocket).
7. Cron no Coolify chamando `syncStock/syncPrice` e, futuramente,
   `recomputeCategory` do motor de recomendação.

> Nota: o schema foi validado sinteticamente com o parser real do Postgres nesta
> sandbox, mas não foi aplicado a um banco vivo aqui (rede restrita). Rode
> `supabase db push` no seu ambiente para materializar.

## Frontend — o que já está construído

Fluxo de compra completo + contas e dashboards, em React/Vite/TS + Tailwind:

```
Home ─▶ Busca ─▶ Categoria ─▶ Produto ─▶ Sacola ─▶ Entrega ─▶ Pagamento (Online/COD) ─▶ Pedido
                                                      dashboards: /conta · /vendedor · /admin
```

### Auth e papéis (Supabase-ready)

`src/lib/auth.tsx` usa o Supabase Auth quando configurado (papel lido em
`profiles.role`) e cai num **mock em localStorage** caso contrário. Rotas
protegidas por `RequireAuth`. No modo mock, a tela `/entrar` oferece login de
1 clique com contas de demonstração:

| Papel | E-mail | Senha |
|-------|--------|-------|
| Comprador | `comprador@romper.shop` | `123456` |
| Vendedor  | `vendedor@romper.shop`  | `123456` |
| Admin     | `admin@romper.shop`     | `123456` |

- **Rotas** (`src/main.tsx`): `/`, `/categoria/:slug`, `/produto/:slug`,
  `/checkout`, `/pedido/:id`.
- **Camada de dados** (`src/lib/api.ts`): uma API única para o app. Se o Supabase
  estiver configurado, faz as queries reais; senão, cai no catálogo mock
  (`src/lib/catalog.ts`). Os componentes não sabem a origem dos dados.
- **Carrinho e pedidos** no cliente (`useCart`, `lib/orders`) via localStorage,
  já modelados como `orders → sub_orders` (split por vendedor). Preços em centavos.
- **COD** respeitado por produto e com regra de elegibilidade por região
  (`src/lib/cep.ts`, com autopreenchimento de CEP via ViaCEP).

## Ligar ao Supabase (quando tiver credenciais)

Enquanto não houver `.env`, tudo roda no mock — sem erro. Para usar dados reais:

```bash
cp .env.example .env          # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
supabase db push              # aplica as migrations
psql "$DATABASE_URL" -f supabase/seed.sql   # (ou `supabase db reset`) popula o catálogo
npm run dev
```

O `src/lib/supabase.ts` detecta as variáveis automaticamente: preencheu o `.env`,
o app passa a ler `categories`, `products`, `product_images` e `product_variants`
— sem tocar em nenhum componente. O `supabase/seed.sql` espelha o catálogo mock.

## Importar produtos de fornecedores dropship (painel do vendedor)

O botão **"Importar dropship"** em `/vendedor` chama `src/lib/dropship.ts`, que
escolhe um de três caminhos conforme o fornecedor selecionado:

| Fornecedor | Onde roda | Status |
|---|---|---|
| **Demo** | Navegador (`src/services/dropship/ExampleProvider.ts`) | ✅ Funciona sempre, sem credenciais — bom para testar o fluxo. |
| **Colar JSON manualmente** | Navegador (`src/lib/manualImport.ts`) | ✅ Funciona para **qualquer** plataforma, sem API — cole os dados exportados do fornecedor. |
| **CJ Dropshipping / Printful / AliExpress** | Supabase Edge Function (`supabase/functions/dropship-import/`) | 🟡 Implementados contra a documentação pública de cada API. **Não testados ao vivo** (sem rede/credenciais nesta sandbox) — confira nomes de campo e endpoints atuais antes de produção. AliExpress exige app aprovado no Open Platform. |
| **Qualquer outro fornecedor REST** (Zendrop, Spocket, DSers...) | Supabase Edge Function, via `GenericRestProvider` | ⚙️ Configurável sem código: aponte `baseUrl` + mapeamento de campos em `dropship_providers.config`. Essas plataformas têm API de parceiro sob aprovação — por isso um conector configurável em vez de endpoints adivinhados. |

Os conectores reais **nunca rodam no frontend** — as chaves de API ficam em
secrets da Edge Function (`supabase secrets set ...`), nunca no bundle do
navegador. Veja `supabase/functions/dropship-import/README.md` para o passo a
passo de deploy e configuração de cada fornecedor.
