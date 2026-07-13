-- =============================================================================
-- Migration 0008: cupons de desconto (plataforma e loja)
-- =============================================================================
-- Espelha src/lib/coupons.ts (hoje em localStorage). Dois escopos: 'platform'
-- (admin, sacola inteira) e 'store' (vendedor, só os itens da própria loja).
-- Três tipos: percentual, valor fixo e frete grátis. A validação e o resgate
-- rodam no servidor via validate_coupon()/redeem_coupon() (security definer) —
-- o cliente nunca é fonte de verdade do desconto em produção.
-- =============================================================================

create type coupon_scope as enum ('platform', 'store');
create type coupon_kind as enum ('percent', 'fixed', 'free_shipping');

create table public.coupons (
  id                 uuid primary key default uuid_generate_v4(),
  code               text not null unique check (code = upper(code) and code ~ '^[A-Z0-9]{3,20}$'),
  scope              coupon_scope not null,
  seller_id          uuid references public.sellers(id) on delete cascade,
  kind               coupon_kind not null,
  percent            int check (percent between 1 and 90),
  amount_cents       bigint check (amount_cents > 0),
  min_subtotal_cents bigint not null default 0,
  max_uses           int check (max_uses > 0),
  uses               int not null default 0,
  expires_at         timestamptz,
  active             boolean not null default true,
  created_at         timestamptz not null default now(),

  -- escopo 'store' exige loja; 'platform' proíbe
  constraint coupons_scope_seller check ((scope = 'store') = (seller_id is not null)),
  -- o valor certo para o tipo certo
  constraint coupons_kind_value check (
    (kind = 'percent' and percent is not null and amount_cents is null)
    or (kind = 'fixed' and amount_cents is not null and percent is null)
    or (kind = 'free_shipping' and percent is null and amount_cents is null)
  )
);

create index idx_coupons_code on public.coupons(code) where active;
create index idx_coupons_seller on public.coupons(seller_id);

-- Pedido guarda o código usado (orders.discount_cents já existe desde 0003).
alter table public.orders add column coupon_code text;

alter table public.coupons enable row level security;

-- Vendedor gerencia só os cupons da própria loja.
create policy "coupons: seller owner" on public.coupons for all
  using (
    seller_id is not null
    and exists (select 1 from public.sellers s where s.id = seller_id and s.owner_id = auth.uid())
  );

-- Admin gerencia os da plataforma.
create policy "coupons: admin" on public.coupons for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Compradores NÃO listam cupons (sem select público): só validam um código
-- exato via função security definer, que devolve apenas o necessário. A base
-- de cálculo (p_base_cents) é o subtotal elegível — a sacola inteira para
-- cupom de plataforma, ou só os itens da loja para cupom de loja.
create or replace function public.validate_coupon(p_code text, p_base_cents bigint)
returns table (
  coupon_id uuid,
  kind coupon_kind,
  scope coupon_scope,
  seller_id uuid,
  percent int,
  amount_cents bigint,
  min_subtotal_cents bigint
)
language sql
security definer
set search_path = public
as $$
  select c.id, c.kind, c.scope, c.seller_id, c.percent, c.amount_cents, c.min_subtotal_cents
  from public.coupons c
  where c.code = upper(trim(p_code))
    and c.active
    and (c.expires_at is null or c.expires_at > now())
    and (c.max_uses is null or c.uses < c.max_uses)
    and c.min_subtotal_cents <= p_base_cents;
$$;

-- Resgate atômico no fechamento do pedido (mesma assinatura por código do
-- cliente em coupons.ts). Falha se o cupom deixou de valer entre validar e
-- fechar (corrida no limite de usos).
create or replace function public.redeem_coupon(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.coupons
  set uses = uses + 1
  where code = upper(trim(p_code))
    and active
    and (expires_at is null or expires_at > now())
    and (max_uses is null or uses < max_uses);
  if not found then
    raise exception 'cupom indisponível';
  end if;
end;
$$;

comment on table public.coupons is
  'Cupons de desconto — plataforma (admin) ou loja (vendedor). Validação via validate_coupon(), resgate via redeem_coupon().';
