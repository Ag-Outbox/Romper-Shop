-- =============================================================================
-- Migration 0003: carrinho, pedidos multi-vendedor, pagamentos, COD, repasses
--
-- MODELO MULTI-VENDEDOR (padrão Shopee/Amazon):
--   orders        = pedido "pai" que o COMPRADOR vê (1 checkout)
--   sub_orders    = 1 por VENDEDOR, gerenciado independentemente (envio/status/repasse)
--   order_items   = itens, sempre vinculados a um sub_order
-- =============================================================================

-- =============================================================================
-- CARTS
-- =============================================================================
create table public.carts (
  id          uuid primary key default uuid_generate_v4(),
  buyer_id    uuid references public.profiles(id) on delete cascade,  -- null = carrinho anônimo
  session_id  text,                                                    -- p/ merge no login
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.cart_items (
  id           uuid primary key default uuid_generate_v4(),
  cart_id      uuid not null references public.carts(id) on delete cascade,
  product_id   uuid not null references public.products(id) on delete cascade,
  variant_id   uuid references public.product_variants(id) on delete set null,
  quantity     int not null default 1 check (quantity > 0),
  unit_cents   bigint not null,           -- snapshot do preço ao adicionar
  created_at   timestamptz not null default now(),
  unique (cart_id, product_id, variant_id)
);

-- =============================================================================
-- ADDRESSES
-- =============================================================================
create table public.addresses (
  id           uuid primary key default uuid_generate_v4(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  recipient    text not null,
  phone        text not null,
  zip          text not null,             -- CEP (usado na elegibilidade COD)
  street       text not null,
  number       text,
  complement   text,
  district     text,
  city         text not null,
  state        char(2) not null,
  is_default   boolean not null default false,
  created_at   timestamptz not null default now()
);

-- =============================================================================
-- ORDERS  (pai)
-- =============================================================================
create table public.orders (
  id              uuid primary key default uuid_generate_v4(),
  buyer_id        uuid not null references public.profiles(id),
  address_id      uuid not null references public.addresses(id),
  status          order_status not null default 'pending_payment',
  payment_method  payment_method not null,

  subtotal_cents  bigint not null default 0,
  shipping_cents  bigint not null default 0,
  discount_cents  bigint not null default 0,
  total_cents     bigint not null default 0,
  currency        char(3) not null default 'BRL',

  is_cod          boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_orders_buyer on public.orders(buyer_id);
create index idx_orders_status on public.orders(status);

-- =============================================================================
-- SUB_ORDERS  (1 por vendedor dentro do pedido pai)
-- =============================================================================
create table public.sub_orders (
  id                uuid primary key default uuid_generate_v4(),
  order_id          uuid not null references public.orders(id) on delete cascade,
  seller_id         uuid references public.sellers(id),    -- null = itens dropship do admin
  status            order_status not null default 'pending_payment',

  subtotal_cents    bigint not null default 0,
  shipping_cents    bigint not null default 0,
  commission_cents  bigint not null default 0,   -- comissão da plataforma
  seller_net_cents  bigint not null default 0,   -- repasse ao vendedor

  -- Rastreio / fulfillment
  tracking_code     text,
  carrier           text,
  shipped_at        timestamptz,
  delivered_at      timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_sub_orders_order  on public.sub_orders(order_id);
create index idx_sub_orders_seller on public.sub_orders(seller_id);

-- =============================================================================
-- ORDER ITEMS  (snapshot imutável do produto no momento da compra)
-- =============================================================================
create table public.order_items (
  id            uuid primary key default uuid_generate_v4(),
  sub_order_id  uuid not null references public.sub_orders(id) on delete cascade,
  product_id    uuid references public.products(id),
  variant_id    uuid references public.product_variants(id),
  -- snapshots
  title         text not null,
  image_url     text,
  unit_cents    bigint not null,
  quantity      int not null check (quantity > 0),
  line_cents    bigint not null,
  -- para dropship: dados p/ repassar o pedido ao fornecedor
  source        product_source not null default 'seller',
  provider_id   uuid references public.dropship_providers(id),
  external_id   text
);

create index idx_order_items_sub on public.order_items(sub_order_id);

-- =============================================================================
-- PAYMENTS
-- =============================================================================
create table public.payments (
  id                uuid primary key default uuid_generate_v4(),
  order_id          uuid not null references public.orders(id) on delete cascade,
  method            payment_method not null,
  status            payment_status not null default 'pending',
  amount_cents      bigint not null,
  provider          text,                    -- 'stripe' | 'mercado_pago' | 'pix' | 'cod'
  provider_ref      text,                    -- id da transação externa
  raw               jsonb,                   -- payload do webhook
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_payments_order on public.payments(order_id);

-- =============================================================================
-- COD ORDERS  (fluxo de pagamento na entrega — sistema paralelo completo)
-- =============================================================================
create table public.cod_orders (
  id                  uuid primary key default uuid_generate_v4(),
  order_id            uuid not null unique references public.orders(id) on delete cascade,
  status              cod_status not null default 'requested',
  -- verificação anti-fraude
  address_verified    boolean not null default false,
  contact_confirmed   boolean not null default false,   -- confirmou via SMS/WhatsApp
  confirmation_code   text,
  confirmation_sent_at timestamptz,
  -- coleta na entrega
  amount_to_collect_cents bigint not null,
  collected_cents     bigint,
  collected_at        timestamptz,
  refusal_reason      text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- =============================================================================
-- PAYOUTS  (saques dos vendedores)
-- =============================================================================
create table public.payouts (
  id            uuid primary key default uuid_generate_v4(),
  seller_id     uuid not null references public.sellers(id) on delete cascade,
  amount_cents  bigint not null,
  status        payout_status not null default 'pending',
  provider      text,
  provider_ref  text,
  requested_at  timestamptz not null default now(),
  processed_at  timestamptz
);

create index idx_payouts_seller on public.payouts(seller_id);
