-- =============================================================================
-- Migration 0002: produtos, variações, dropshipping, imagens
-- =============================================================================

-- =============================================================================
-- DROPSHIP PROVIDERS  (plataformas às quais você se afilia)
-- =============================================================================
create table public.dropship_providers (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,              -- 'AliExpress/DSers', 'CJ Dropshipping', ...
  slug          text not null unique,       -- usado pelo Adapter no código
  api_base_url  text,
  supports_mcp  boolean not null default false,
  is_active     boolean not null default true,
  -- Config por-provider fica em Edge Function secrets, nunca aqui
  config        jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

-- =============================================================================
-- PRODUCTS
-- =============================================================================
create table public.products (
  id              uuid primary key default uuid_generate_v4(),
  seller_id       uuid references public.sellers(id) on delete cascade,   -- null se for produto do admin/dropship puro
  category_id     uuid not null references public.categories(id),
  source          product_source not null default 'seller',
  status          product_status not null default 'draft',

  title           text not null,
  slug            text not null unique,
  description     text,
  brand           text,

  -- Preço base (variações podem sobrescrever). Em centavos p/ evitar float.
  price_cents     bigint not null,
  compare_at_cents bigint,                    -- preço "de" (riscado)
  currency        char(3) not null default 'BRL',

  stock           int not null default 0,
  sku             text,

  -- COD por produto
  cod_available   boolean not null default false,
  cod_max_cents   bigint,                     -- limite de valor p/ aceitar COD

  -- Campos de origem dropship (null se source = 'seller')
  provider_id     uuid references public.dropship_providers(id),
  external_id     text,                       -- ID do produto na plataforma origem
  markup_percent  numeric(6,2),               -- markup aplicado pelo afiliado
  cost_cents      bigint,                     -- custo no fornecedor (p/ calcular margem)

  -- Busca / ranking
  rating_avg      numeric(3,2) not null default 0,
  rating_count    int not null default 0,
  view_count      bigint not null default 0,
  sales_count     bigint not null default 0,
  search_vector   tsvector,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint dropship_needs_provider
    check (source <> 'dropship' or provider_id is not null)
);

create index idx_products_category on public.products(category_id);
create index idx_products_seller   on public.products(seller_id);
create index idx_products_status   on public.products(status);
create index idx_products_source   on public.products(source);
create index idx_products_search   on public.products using gin(search_vector);
create index idx_products_trgm     on public.products using gin(title gin_trgm_ops);

-- Atualiza tsvector automaticamente (título + descrição + marca)
create or replace function public.products_search_update()
returns trigger language plpgsql as $$
begin
  new.search_vector :=
    setweight(to_tsvector('portuguese', coalesce(new.title,'')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(new.brand,'')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(new.description,'')), 'C');
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_products_search
  before insert or update on public.products
  for each row execute function public.products_search_update();

-- =============================================================================
-- PRODUCT IMAGES
-- =============================================================================
create table public.product_images (
  id          uuid primary key default uuid_generate_v4(),
  product_id  uuid not null references public.products(id) on delete cascade,
  url         text not null,
  alt         text,
  position    int not null default 0
);

create index idx_product_images_product on public.product_images(product_id);

-- =============================================================================
-- PRODUCT VARIANTS  (cor / tamanho / etc.)
-- =============================================================================
create table public.product_variants (
  id            uuid primary key default uuid_generate_v4(),
  product_id    uuid not null references public.products(id) on delete cascade,
  name          text not null,               -- ex: "Azul / M"
  options       jsonb not null default '{}',  -- {"cor":"Azul","tamanho":"M"}
  price_cents   bigint,                        -- sobrescreve price do produto se != null
  stock         int not null default 0,
  sku           text,
  external_id   text,                          -- variação correspondente no fornecedor
  image_url     text
);

create index idx_variants_product on public.product_variants(product_id);
