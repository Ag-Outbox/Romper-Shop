-- =============================================================================
-- Migration 0004: avaliações, favoritos, chat, e product_scores
-- (tabela do algoritmo de recomendação — ESPECIFICADA, não implementada)
-- =============================================================================

-- =============================================================================
-- REVIEWS  (só com compra verificada)
-- =============================================================================
create table public.reviews (
  id            uuid primary key default uuid_generate_v4(),
  product_id    uuid not null references public.products(id) on delete cascade,
  buyer_id      uuid not null references public.profiles(id) on delete cascade,
  order_item_id uuid references public.order_items(id),   -- prova de compra
  rating        int not null check (rating between 1 and 5),
  title         text,
  body          text,
  images        jsonb not null default '[]',
  is_verified   boolean not null default false,
  helpful_count int not null default 0,
  created_at    timestamptz not null default now(),
  unique (product_id, buyer_id)   -- 1 review por comprador por produto
);

create index idx_reviews_product on public.reviews(product_id);

-- Recalcula rating_avg / rating_count do produto ao inserir/atualizar/apagar review
create or replace function public.recalc_product_rating()
returns trigger language plpgsql as $$
declare
  pid uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products p set
    rating_avg   = coalesce((select avg(rating)::numeric(3,2) from public.reviews where product_id = pid), 0),
    rating_count = (select count(*) from public.reviews where product_id = pid)
  where p.id = pid;
  return null;
end;
$$;

create trigger trg_reviews_recalc
  after insert or update or delete on public.reviews
  for each row execute function public.recalc_product_rating();

-- =============================================================================
-- FAVORITES
-- =============================================================================
create table public.favorites (
  buyer_id    uuid not null references public.profiles(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (buyer_id, product_id)
);

-- =============================================================================
-- CHAT  (comprador <-> vendedor, via Supabase Realtime)
-- =============================================================================
create table public.conversations (
  id          uuid primary key default uuid_generate_v4(),
  buyer_id    uuid not null references public.profiles(id) on delete cascade,
  seller_id   uuid not null references public.sellers(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (buyer_id, seller_id)
);

create table public.messages (
  id               uuid primary key default uuid_generate_v4(),
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  sender_id        uuid not null references public.profiles(id),
  body             text not null,
  read_at          timestamptz,
  created_at       timestamptz not null default now()
);

create index idx_messages_conversation on public.messages(conversation_id);

-- =============================================================================
-- PRODUCT SCORES  — ALGORITMO DE RECOMENDAÇÃO (SÓ A ESTRUTURA)
-- -----------------------------------------------------------------------------
-- Esta tabela guarda as FEATURES e o SCORE final por produto/categoria.
-- O cálculo NÃO está implementado — ver src/services/recommendationEngine.ts
-- que contém o stub documentado. Um worker/cron no Coolify preencherá isto.
-- =============================================================================
create table public.product_scores (
  product_id          uuid primary key references public.products(id) on delete cascade,
  category_id         uuid references public.categories(id),

  -- ---- FEATURES (sinais de entrada) ----
  conversion_rate     numeric(6,4) default 0,   -- compras / views
  sales_velocity      numeric(10,4) default 0,  -- vendas recentes (com decaimento)
  rating_bayesian     numeric(6,4) default 0,   -- média bayesiana das reviews
  review_volume       int default 0,
  return_rate         numeric(6,4) default 0,   -- penaliza
  seller_reputation   numeric(6,4) default 0,
  engagement          numeric(10,4) default 0,  -- favoritos + cliques
  recency_factor      numeric(6,4) default 0,

  -- ---- SAÍDA ----
  final_score         numeric(12,6) default 0,  -- score de ranqueamento
  rank_in_category    int,                        -- posição dentro da categoria

  computed_at         timestamptz not null default now()
);

create index idx_scores_category_rank on public.product_scores(category_id, rank_in_category);
create index idx_scores_final on public.product_scores(final_score desc);

comment on table public.product_scores is
  'Recommendation engine output. Features + final_score. Computation is a documented stub (recommendationEngine.ts) — NOT yet implemented. Recalculated by a Coolify cron worker.';
