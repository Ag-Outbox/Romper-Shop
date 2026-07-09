-- =============================================================================
-- SEED — catálogo inicial da Romper Shop (espelha o mock em src/lib/catalog.ts)
-- Rode depois das migrations:  supabase db reset   (aplica migrations + seed)
-- ou:  psql "$DATABASE_URL" -f supabase/seed.sql
--
-- Observação: os produtos entram como source 'seller' com seller_id NULL
-- (itens do catálogo administrado), evitando depender de auth.users no seed.
-- Lojas reais de vendedores são criadas via cadastro (auth) — ver migration 0001.
-- =============================================================================

-- ---------- Categorias ----------
insert into public.categories (id, name, slug, position) values
  ('22222222-2222-2222-2222-222222222201', 'Moda',       'moda',       1),
  ('22222222-2222-2222-2222-222222222202', 'Achadinhos', 'achadinhos', 2),
  ('22222222-2222-2222-2222-222222222203', 'Casa',       'casa',       3),
  ('22222222-2222-2222-2222-222222222204', 'Tech',       'tech',       4),
  ('22222222-2222-2222-2222-222222222205', 'Beleza',     'beleza',     5),
  ('22222222-2222-2222-2222-222222222206', 'Fitness',    'fitness',    6)
on conflict (slug) do nothing;

-- ---------- Produtos ----------
insert into public.products
  (id, category_id, source, status, title, slug, description, brand,
   price_cents, compare_at_cents, stock, cod_available, cod_max_cents,
   rating_avg, rating_count, sales_count)
values
  ('11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222202', 'seller', 'active',
   'Organizador modular de gaveta', 'organizador-modular',
   'Divisórias ajustáveis que se encaixam para organizar gavetas, closet e escritório. Plástico ABS resistente, encaixe sem ferramentas e limpeza fácil.',
   'Casa Nova', 2990, 4990, 137, true, 15000, 4.8, 1243, 8600),

  ('11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222202', 'seller', 'active',
   'Luminária pôr do sol projetor', 'luminaria-por-do-sol',
   'Projeta um halo quente de pôr do sol na parede — perfeita para fotos e ambientes aconchegantes. Ângulo ajustável, cabo USB-C incluso.',
   'Lumen', 3990, 6990, 74, true, 15000, 4.7, 892, 5300),

  ('11111111-1111-1111-1111-111111111103', '22222222-2222-2222-2222-222222222202', 'seller', 'active',
   'Kit potes herméticos para mantimentos', 'kit-potes-hermeticos',
   'Mantém grãos, farinhas e cereais frescos por mais tempo. Tampa com trava, vedação total contra umidade e empilháveis. Livre de BPA.',
   'Fresco', 5990, 8990, 58, true, 15000, 4.9, 634, 3100),

  ('11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222204', 'seller', 'active',
   'Fone Bluetooth TWS com cancelamento de ruído', 'fone-bluetooth-tws',
   'Som nítido com graves encorpados, cancelamento ativo de ruído e até 30h de bateria com o estojo. Bluetooth 5.3 e resistência a suor (IPX5).',
   'Sonic', 9990, 15990, 96, false, null, 4.6, 2054, 11200),

  ('11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-222222222201', 'seller', 'active',
   'Jaqueta corta-vento impermeável', 'jaqueta-corta-vento',
   'Leve, dobrável e à prova d''água — cabe na mochila e te salva da chuva. Costura selada, capuz ajustável e tecido respirável.',
   'Trilha', 12990, 19990, 43, true, 20000, 4.7, 421, 1900),

  ('11111111-1111-1111-1111-111111111106', '22222222-2222-2222-2222-222222222205', 'seller', 'active',
   'Sérum facial vitamina C 20%', 'serum-vitamina-c',
   'Ilumina, uniformiza o tom e combate sinais do tempo. Vitamina C estabilizada, ácido hialurônico e vitamina E. Textura leve, absorção rápida.',
   'Glow', 4990, 7990, 120, true, 15000, 4.9, 1580, 7400)
on conflict (slug) do nothing;

-- ---------- Imagens (picsum, mesmas seeds do mock) ----------
insert into public.product_images (product_id, url, alt, position) values
  ('11111111-1111-1111-1111-111111111101', 'https://picsum.photos/seed/romper-organizador-1/1100/1100', 'Organizador modular montado', 0),
  ('11111111-1111-1111-1111-111111111101', 'https://picsum.photos/seed/romper-organizador-2/1100/1100', 'Divisórias separadas', 1),
  ('11111111-1111-1111-1111-111111111102', 'https://picsum.photos/seed/romper-luminaria-1/1100/1100', 'Luminária projetando pôr do sol', 0),
  ('11111111-1111-1111-1111-111111111102', 'https://picsum.photos/seed/romper-luminaria-2/1100/1100', 'Luminária sobre a mesa', 1),
  ('11111111-1111-1111-1111-111111111103', 'https://picsum.photos/seed/romper-potes-1/1100/1100', 'Kit de potes herméticos', 0),
  ('11111111-1111-1111-1111-111111111103', 'https://picsum.photos/seed/romper-potes-2/1100/1100', 'Potes empilhados', 1),
  ('11111111-1111-1111-1111-111111111104', 'https://picsum.photos/seed/romper-fone-1/1100/1100', 'Fone TWS com estojo', 0),
  ('11111111-1111-1111-1111-111111111104', 'https://picsum.photos/seed/romper-fone-2/1100/1100', 'Fones fora do estojo', 1),
  ('11111111-1111-1111-1111-111111111105', 'https://picsum.photos/seed/romper-jaqueta-1/1100/1100', 'Jaqueta corta-vento', 0),
  ('11111111-1111-1111-1111-111111111105', 'https://picsum.photos/seed/romper-jaqueta-2/1100/1100', 'Jaqueta dobrada', 1),
  ('11111111-1111-1111-1111-111111111106', 'https://picsum.photos/seed/romper-serum-1/1100/1100', 'Frasco de sérum vitamina C', 0),
  ('11111111-1111-1111-1111-111111111106', 'https://picsum.photos/seed/romper-serum-2/1100/1100', 'Conta-gotas com o sérum', 1);

-- ---------- Variações ----------
insert into public.product_variants (product_id, name, options, price_cents, stock) values
  ('11111111-1111-1111-1111-111111111101', 'Cinza', '{"Cor":"Cinza"}', null, 60),
  ('11111111-1111-1111-1111-111111111101', 'Bege',  '{"Cor":"Bege"}',  null, 52),
  ('11111111-1111-1111-1111-111111111101', 'Preto', '{"Cor":"Preto"}', null, 25),
  ('11111111-1111-1111-1111-111111111102', 'Branco', '{"Cor":"Branco"}', null, 40),
  ('11111111-1111-1111-1111-111111111102', 'Preto',  '{"Cor":"Preto"}',  null, 34),
  ('11111111-1111-1111-1111-111111111103', '3 peças', '{"Tamanho":"3 peças"}',  5990, 30),
  ('11111111-1111-1111-1111-111111111103', '5 peças', '{"Tamanho":"5 peças"}',  7990, 20),
  ('11111111-1111-1111-1111-111111111103', '8 peças', '{"Tamanho":"8 peças"}', 10990,  8),
  ('11111111-1111-1111-1111-111111111104', 'Preto',  '{"Cor":"Preto"}',  null, 60),
  ('11111111-1111-1111-1111-111111111104', 'Branco', '{"Cor":"Branco"}', null, 36),
  ('11111111-1111-1111-1111-111111111105', 'P',  '{"Tamanho":"P"}',   null,  8),
  ('11111111-1111-1111-1111-111111111105', 'M',  '{"Tamanho":"M"}',   null, 15),
  ('11111111-1111-1111-1111-111111111105', 'G',  '{"Tamanho":"G"}',   null, 14),
  ('11111111-1111-1111-1111-111111111105', 'GG', '{"Tamanho":"GG"}',  null,  6);
