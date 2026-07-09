-- =============================================================================
-- Migration 0005: ROW LEVEL SECURITY
-- Segurança em nível de linha — isolamento por papel. NÃO-NEGOCIÁVEL.
-- =============================================================================

-- Helper: papel do usuário atual
create or replace function public.current_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role in ('admin','super_admin'));
$$;

-- Helper: seller_id da loja do usuário atual
create or replace function public.my_seller_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.sellers where owner_id = auth.uid();
$$;

-- =============================================================================
-- Ativar RLS
-- =============================================================================
alter table public.profiles          enable row level security;
alter table public.sellers           enable row level security;
alter table public.products          enable row level security;
alter table public.product_images    enable row level security;
alter table public.product_variants  enable row level security;
alter table public.categories        enable row level security;
alter table public.carts             enable row level security;
alter table public.cart_items        enable row level security;
alter table public.addresses         enable row level security;
alter table public.orders            enable row level security;
alter table public.sub_orders        enable row level security;
alter table public.order_items       enable row level security;
alter table public.payments          enable row level security;
alter table public.cod_orders        enable row level security;
alter table public.payouts           enable row level security;
alter table public.reviews           enable row level security;
alter table public.favorites         enable row level security;
alter table public.conversations     enable row level security;
alter table public.messages          enable row level security;
alter table public.product_scores    enable row level security;
alter table public.dropship_providers enable row level security;

-- =============================================================================
-- PROFILES
-- =============================================================================
create policy "profiles: self read"   on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles: self update" on public.profiles for update using (id = auth.uid());

-- =============================================================================
-- SELLERS
-- =============================================================================
create policy "sellers: public read active" on public.sellers for select
  using (status = 'active' or owner_id = auth.uid() or public.is_admin());
create policy "sellers: owner insert" on public.sellers for insert
  with check (owner_id = auth.uid());
create policy "sellers: owner update" on public.sellers for update
  using (owner_id = auth.uid() or public.is_admin());

-- =============================================================================
-- CATEGORIES  (leitura pública, escrita só admin)
-- =============================================================================
create policy "categories: public read" on public.categories for select using (true);
create policy "categories: admin write" on public.categories for all
  using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- PRODUCTS
-- =============================================================================
create policy "products: public read active" on public.products for select
  using (status = 'active' or seller_id = public.my_seller_id() or public.is_admin());
create policy "products: seller insert" on public.products for insert
  with check (seller_id = public.my_seller_id() or public.is_admin());
create policy "products: seller update" on public.products for update
  using (seller_id = public.my_seller_id() or public.is_admin());
create policy "products: seller delete" on public.products for delete
  using (seller_id = public.my_seller_id() or public.is_admin());

-- Imagens e variações seguem o produto
create policy "images: public read" on public.product_images for select using (true);
create policy "images: owner write" on public.product_images for all
  using (exists (select 1 from public.products p
                 where p.id = product_id
                 and (p.seller_id = public.my_seller_id() or public.is_admin())));

create policy "variants: public read" on public.product_variants for select using (true);
create policy "variants: owner write" on public.product_variants for all
  using (exists (select 1 from public.products p
                 where p.id = product_id
                 and (p.seller_id = public.my_seller_id() or public.is_admin())));

-- =============================================================================
-- CARTS  (dono do carrinho)
-- =============================================================================
create policy "carts: owner" on public.carts for all
  using (buyer_id = auth.uid());
create policy "cart_items: owner" on public.cart_items for all
  using (exists (select 1 from public.carts c where c.id = cart_id and c.buyer_id = auth.uid()));

-- =============================================================================
-- ADDRESSES
-- =============================================================================
create policy "addresses: owner" on public.addresses for all
  using (profile_id = auth.uid());

-- =============================================================================
-- ORDERS  (comprador vê os seus; vendedor vê os que contêm seus sub_orders)
-- =============================================================================
create policy "orders: buyer read" on public.orders for select
  using (buyer_id = auth.uid() or public.is_admin()
         or exists (select 1 from public.sub_orders so
                    where so.order_id = orders.id and so.seller_id = public.my_seller_id()));
create policy "orders: buyer insert" on public.orders for insert
  with check (buyer_id = auth.uid());

-- SUB_ORDERS
create policy "sub_orders: visibility" on public.sub_orders for select
  using (seller_id = public.my_seller_id() or public.is_admin()
         or exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid()));
create policy "sub_orders: seller update" on public.sub_orders for update
  using (seller_id = public.my_seller_id() or public.is_admin());

-- ORDER_ITEMS
create policy "order_items: visibility" on public.order_items for select
  using (exists (select 1 from public.sub_orders so
                 join public.orders o on o.id = so.order_id
                 where so.id = sub_order_id
                 and (o.buyer_id = auth.uid() or so.seller_id = public.my_seller_id() or public.is_admin())));

-- =============================================================================
-- PAYMENTS / COD  (comprador dono ou admin)
-- =============================================================================
create policy "payments: visibility" on public.payments for select
  using (exists (select 1 from public.orders o where o.id = order_id
                 and (o.buyer_id = auth.uid() or public.is_admin())));

create policy "cod: visibility" on public.cod_orders for select
  using (exists (select 1 from public.orders o where o.id = order_id
                 and (o.buyer_id = auth.uid() or public.is_admin())));

-- =============================================================================
-- PAYOUTS  (vendedor dono)
-- =============================================================================
create policy "payouts: owner" on public.payouts for all
  using (seller_id = public.my_seller_id() or public.is_admin());

-- =============================================================================
-- REVIEWS  (leitura pública; escrita pelo comprador verificado)
-- =============================================================================
create policy "reviews: public read" on public.reviews for select using (true);
create policy "reviews: buyer write" on public.reviews for insert
  with check (buyer_id = auth.uid());
create policy "reviews: buyer update" on public.reviews for update
  using (buyer_id = auth.uid());

-- =============================================================================
-- FAVORITES
-- =============================================================================
create policy "favorites: owner" on public.favorites for all
  using (buyer_id = auth.uid());

-- =============================================================================
-- CHAT
-- =============================================================================
create policy "conversations: participants" on public.conversations for all
  using (buyer_id = auth.uid()
         or seller_id = public.my_seller_id()
         or public.is_admin());
create policy "messages: participants" on public.messages for all
  using (exists (select 1 from public.conversations c
                 where c.id = conversation_id
                 and (c.buyer_id = auth.uid() or c.seller_id = public.my_seller_id())));

-- =============================================================================
-- PRODUCT SCORES  (leitura pública p/ ranqueamento; escrita só service_role/admin)
-- =============================================================================
create policy "scores: public read" on public.product_scores for select using (true);
create policy "scores: admin write" on public.product_scores for all
  using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- DROPSHIP PROVIDERS  (leitura só admin — dados de integração)
-- =============================================================================
create policy "providers: admin only" on public.dropship_providers for all
  using (public.is_admin()) with check (public.is_admin());
