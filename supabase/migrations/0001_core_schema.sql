-- =============================================================================
-- MARKETPLACE MULTI-VENDEDOR — SCHEMA CORE
-- Migration 0001: extensões, enums, perfis, papéis, vendedores, categorias
-- Postgres / Supabase
-- =============================================================================

-- ---------- Extensões ----------
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";      -- busca fuzzy / full-text auxiliar
create extension if not exists "citext";       -- emails case-insensitive

-- =============================================================================
-- ENUMS
-- =============================================================================
create type user_role as enum ('buyer', 'seller', 'admin', 'super_admin');

create type seller_status as enum ('pending', 'active', 'suspended', 'banned');

create type product_status as enum ('draft', 'active', 'paused', 'out_of_stock', 'removed');

create type product_source as enum ('seller', 'dropship');   -- origem do produto

create type order_status as enum (
  'pending_payment',   -- aguardando pagamento online
  'awaiting_cod',      -- COD aguardando entrega
  'paid',
  'processing',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'refunded',
  'disputed'
);

create type payment_method as enum ('card', 'pix', 'mercado_pago', 'stripe', 'cod');

create type payment_status as enum ('pending', 'authorized', 'paid', 'failed', 'refunded', 'chargeback');

create type cod_status as enum (
  'requested',
  'address_validated',
  'confirmed',          -- comprador confirmou (SMS/WhatsApp)
  'out_for_delivery',
  'paid_on_delivery',
  'refused',
  'failed'
);

create type payout_status as enum ('pending', 'processing', 'paid', 'failed');

-- =============================================================================
-- PROFILES  (espelha auth.users do Supabase)
-- =============================================================================
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  email         citext unique,
  phone         text,
  avatar_url    text,
  role          user_role not null default 'buyer',
  -- Reputação do comprador (usada em regras de COD / anti-fraude)
  buyer_score   numeric(5,2) not null default 100.00,
  cod_refusals  int not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Cria profile automaticamente ao registrar em auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- SELLERS  (loja do vendedor — 1:1 com profile de role seller)
-- =============================================================================
create table public.sellers (
  id                uuid primary key default uuid_generate_v4(),
  owner_id          uuid not null unique references public.profiles(id) on delete cascade,
  store_name        text not null,
  store_slug        text not null unique,
  description       text,
  logo_url          text,
  banner_url        text,
  status            seller_status not null default 'pending',
  -- Reputação e financeiro
  rating_avg        numeric(3,2) not null default 0,
  rating_count      int not null default 0,
  total_sales       int not null default 0,
  balance_cents     bigint not null default 0,   -- saldo disponível para saque
  pending_cents     bigint not null default 0,   -- em processamento
  -- Configuração de repasse (Stripe Connect / MP)
  payout_provider   text,                         -- 'stripe' | 'mercado_pago'
  payout_account_id text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_sellers_status on public.sellers(status);

-- =============================================================================
-- CATEGORIES  (hierarquia infinita via self-reference)
-- =============================================================================
create table public.categories (
  id          uuid primary key default uuid_generate_v4(),
  parent_id   uuid references public.categories(id) on delete cascade,
  name        text not null,
  slug        text not null unique,
  icon_url    text,
  position    int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index idx_categories_parent on public.categories(parent_id);
