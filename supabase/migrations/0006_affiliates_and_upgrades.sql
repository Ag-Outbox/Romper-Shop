-- =============================================================================
-- Migration 0006: programa de afiliados + auto-upgrade para vendedor
-- =============================================================================
-- Duas capacidades novas, aditivas (não alteram nada do schema anterior):
--
-- 1) AFILIADOS — qualquer perfil (comprador, vendedor...) pode virar afiliado
--    sem trocar de "role": ganha um código de referência, compartilha links
--    de produto (?ref=codigo) e recebe comissão quando uma compra referenciada
--    é ENTREGUE (mesmo evento que já existia no fluxo de sub_orders).
--
-- 2) become_seller() — função seguríssima para o auto-cadastro de vendedor:
--    o cliente NUNCA escreve em profiles.role diretamente (evitaria abrir
--    brecha para qualquer usuário virar 'admin' via update direto). A função
--    roda como security definer, só aceita a transição buyer -> seller, e
--    cria a loja (sellers) no mesmo passo.
-- =============================================================================

-- =============================================================================
-- AFFILIATES
-- =============================================================================
create table public.affiliates (
  id                 uuid primary key default uuid_generate_v4(),
  profile_id         uuid not null unique references public.profiles(id) on delete cascade,
  code               text not null unique,
  commission_percent numeric(5,2) not null default 10.00,
  status             text not null default 'active' check (status in ('active','suspended')),
  clicks             bigint not null default 0,
  balance_cents      bigint not null default 0,   -- comissão confirmada, disponível p/ saque
  pending_cents      bigint not null default 0,   -- comissão de pedidos ainda não entregues
  created_at         timestamptz not null default now()
);

create index idx_affiliates_code on public.affiliates(code);

-- =============================================================================
-- AFFILIATE_COMMISSIONS  (1 registro por sub_order referenciado — ledger)
-- =============================================================================
create table public.affiliate_commissions (
  id            uuid primary key default uuid_generate_v4(),
  affiliate_id  uuid not null references public.affiliates(id) on delete cascade,
  order_id      uuid not null references public.orders(id) on delete cascade,
  sub_order_id  uuid not null references public.sub_orders(id) on delete cascade,
  amount_cents  bigint not null,
  status        text not null default 'pending' check (status in ('pending','confirmed','paid')),
  created_at    timestamptz not null default now(),
  unique (sub_order_id)   -- 1 comissão por sub-pedido (evita duplicar em reprocessamento)
);

create index idx_affiliate_commissions_affiliate on public.affiliate_commissions(affiliate_id);

-- Atribuição: qual afiliado indicou este pedido (nullable — a maioria não terá).
alter table public.orders add column affiliate_id uuid references public.affiliates(id);

-- =============================================================================
-- RLS — novas tabelas
-- =============================================================================
alter table public.affiliates             enable row level security;
alter table public.affiliate_commissions  enable row level security;

create policy "affiliates: owner read/write" on public.affiliates for all
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

create policy "affiliate_commissions: owner read" on public.affiliate_commissions for select
  using (
    public.is_admin()
    or exists (select 1 from public.affiliates a where a.id = affiliate_id and a.profile_id = auth.uid())
  );

-- =============================================================================
-- become_seller() — auto-cadastro de vendedor, sem o cliente tocar em role
-- =============================================================================
create or replace function public.become_seller(store_name text, store_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_seller_id uuid;
  caller_role user_role;
begin
  select role into caller_role from public.profiles where id = auth.uid();

  if caller_role is null then
    raise exception 'Perfil não encontrado.';
  end if;

  if caller_role <> 'buyer' then
    raise exception 'Só compradores podem abrir uma loja por aqui (papel atual: %).', caller_role;
  end if;

  insert into public.sellers (owner_id, store_name, store_slug, status)
  values (auth.uid(), store_name, store_slug, 'pending')
  returning id into new_seller_id;

  update public.profiles set role = 'seller', updated_at = now() where id = auth.uid();

  return new_seller_id;
end;
$$;

-- =============================================================================
-- become_affiliate() — auto-cadastro de afiliado (aditivo, não muda role)
-- =============================================================================
create or replace function public.become_affiliate(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_affiliate_id uuid;
begin
  insert into public.affiliates (profile_id, code)
  values (auth.uid(), code)
  on conflict (profile_id) do update set code = affiliates.code  -- idempotente: já existia, não muda nada
  returning id into new_affiliate_id;

  return new_affiliate_id;
end;
$$;

comment on table public.affiliates is
  'Programa de afiliados: qualquer perfil pode indicar produtos via link (?ref=code) e ganhar comissão. Aditivo — não substitui o role do usuário.';
comment on function public.become_seller(text, text) is
  'Único caminho seguro para virar vendedor: valida role atual (só buyer->seller) e cria a loja no mesmo passo. Nunca deixe o cliente fazer update direto em profiles.role.';
