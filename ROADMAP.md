# ROADMAP — Romper Shop rumo à paridade Shopee/Magazine Luiza

> Plano vivo. Marque itens conforme forem implementados. Cada item tem
> esforço estimado (S/M/L) e dependências externas, quando houver.

## 0. Inventário do que já existe

**Funciona hoje (mock/demo):** jornada de compra completa (busca, categoria,
produto, variações, sacola, checkout Online/COD, confirmação), avaliações
verificadas, favoritos, loja pública, 3 painéis (comprador/vendedor/admin),
auto-cadastro de vendedor com aprovação do admin, programa de afiliados com
atribuição de 30 dias e comissão confirmada na entrega, saques com fila do
admin, importação dropship (CJ/Printful/AliExpress/genérico/manual),
comissão da plataforma por origem, design elevado (grão, tipografia
gráfica, fallback de imagem desenhado).

**Só no schema (banco pronto, sem UI):** chat comprador↔vendedor
(`conversations`/`messages`), múltiplos endereços (`addresses`), rastreio
(`tracking_code`/`carrier`), confirmação COD por SMS
(`cod_orders.confirmation_code`), reputação anti-fraude
(`buyer_score`/`cod_refusals`), motor de recomendação (`product_scores` +
stub em `recommendationEngine.ts`).

**Não existe ainda:** tudo listado abaixo.

---

## 1. Descoberta e Catálogo

- [x] **A1** Filtros na categoria/busca (preço, nota mínima, COD, desconto) — M
- [x] **A2** Paginação / carregar mais — S
- [x] **A3** Ofertas relâmpago com contador regressivo — M
- [x] **A4** Cupons (loja e plataforma) — M/L
- [x] **A5** Vistos recentemente — S
- [x] **A6** Perguntas & Respostas no produto — M
- [x] **A7** Avaliações 2.0 (útil, resposta do vendedor) — M *(falta foto: precisa de Storage)*
- [x] **A8** Selos de confiança (Loja Oficial, Envio Rápido, Bem avaliada) — S
- [ ] **A9** Notificar queda de preço / voltou ao estoque — M
- [ ] **A10** Motor de recomendação real (implementar o stub) — L *(precisa Supabase + cron)*

## 2. Compra e Pagamento

- [ ] **B1** Pix real — L *(precisa gateway, ex. Mercado Pago)*
- [ ] **B2** Cartão parcelado — L *(idem)*
- [x] **B3** Frete por regras (região da UF + perfil da loja) — M *(cotação real Correios na Fase 2)*
- [x] **B4** Múltiplos endereços salvos — M
- [x] **B5** Rastreamento com timeline — M
- [x] **B6** Cancelamento/devolução (RMA) — L *(reembolso real precisa do gateway, Fase 2)*
- [ ] **B7** Confirmação COD por SMS/WhatsApp — M *(precisa Supabase + provedor SMS)*
- [ ] **B8** Carteira/Cashback — M

## 3. Relacionamento e Comunicação

- [x] **C1** Chat comprador↔vendedor — L *(mock; tempo real vem com Supabase Realtime na Fase 2)*
- [x] **C2** Central de notificações in-app — M
- [ ] **C3** E-mails transacionais — M *(precisa Supabase + provedor de e-mail)*

## 4. Mobile-first

- [x] **D1** Bottom navigation mobile — S
- [x] **D2** Auditoria responsiva completa (390px) — M
- [ ] **D3** PWA instalável — S

## 5. Foco — Admin importar fácil

- [x] Importação em massa (lista de URLs/CSV) com fila de status — L
- [x] Regras de precificação automática por fornecedor/categoria — M
- [ ] Mapeamento automático de categoria — S
- [ ] Sincronização agendada de preço/estoque — L *(precisa Supabase + cron)*
- [ ] Repasse automático de pedido ao fornecedor — L *(precisa Supabase)*
- [ ] Editor pós-import (reescrever título/descrição/imagens) — M

## 6. Foco — Afiliados sem atrito

- [x] Landing pública de recrutamento (`/seja-afiliado`) — M
- [x] Kit de divulgação (QR code, compartilhar, texto pronto) — S
- [x] Funil no painel (cliques → pedidos → conversão) — M
- [ ] Comissão configurável pelo admin (global/categoria/afiliado) — M
- [ ] Link de loja (além de produto e home) — S
- [ ] Onboarding em 1 clique no cadastro — S

## 7. Foco — Vendedores sem atrito

- [x] Onboarding guiado com checklist de progresso — M
- [ ] Editor de produto completo (múltiplas imagens, variações) — L *(upload real precisa Storage)*
- [x] Perfil da loja editável (tagline, banner, políticas) — M *(logo/banner com imagem real precisa de Storage)*
- [ ] Frete da loja (grátis acima de X, prazo prometido) — M
- [ ] Relatórios com gráficos (vendas, funil, top produtos) — M
- [ ] Reputação com critérios visíveis (gera selos do A8) — M
- [ ] Responder avaliações e perguntas — S
- [ ] Cupons da própria loja — M

## 8. Infraestrutura

- [ ] **E1** Ligar o Supabase (auth, dados, storage, functions) — *pré-requisito de vários itens acima*
- [ ] **E2** Migração de dados locais no login (merge carrinho/favoritos/pedidos) — M
- [ ] **E3** Suite de testes formal (Playwright em `tests/` + CI) — M
- [ ] **E4** SEO (OG por produto, sitemap, schema.org/Product) — M
- [ ] **E5** Deploy (Vercel) — S
- [ ] **E6** Analytics de eventos (view/add_to_cart/purchase) — M

---

## Roadmap sequenciado

### Fase 1 — "Loja completa no mock" (nada externo necessário)
1. Filtros + paginação (A1, A2)
2. Bottom nav mobile + auditoria responsiva (D1, D2)
3. Cupons (A4)
4. Multi-endereços + timeline de rastreio (B4, B5)
5. Flash sale + vistos recentemente (A3, A5)
6. Q&A + avaliações 2.0 sem foto (A6, A7 parcial)
7. Central de notificações (C2)
8. Chat mock (C1)
9. Importação em massa + regras de preço do admin
10. Landing de afiliado + kit + funil
11. Onboarding/editor/relatórios do vendedor
12. RMA/devolução (B6)
13. Frete por regras (B3)
14. Selos + reputação (A8)
15. Testes formais + SEO (E3, E4)

### Fase 2 — "Ligar na tomada" (precisa de credenciais do usuário)
Supabase (E1, E2) → Upload de imagens → Pagamento Pix/cartão via Mercado
Pago (B1, B2) → E-mail (C3) → Chat Realtime → Dropship real com sync
agendado e repasse de pedido → COD com confirmação SMS (B7) → Deploy (E5)

### Fase 3 — "Inteligência"
Motor de recomendação real (A10) → anti-fraude COD com `buyer_score` →
cashback (B8) → analytics (E6) → PWA (D3)

## Checklist do que só o usuário pode providenciar (Fase 2)

- [ ] Projeto Supabase (URL + anon key + service role)
- [ ] Conta Mercado Pago (ou Stripe) com credenciais de API
- [ ] Contas nos fornecedores dropship que for usar, com API keys
- [ ] Provedor de e-mail (Resend) e de SMS/WhatsApp (Zenvia/Twilio) — opcionais
- [ ] Conta Vercel para o deploy
