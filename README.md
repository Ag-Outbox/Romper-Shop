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
