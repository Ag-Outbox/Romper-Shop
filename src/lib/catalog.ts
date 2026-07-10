import type { Product } from './types';

/* ---------------------------------------------------------------------------
   CATÁLOGO MOCK — substitui o Supabase enquanto os dados reais não estão
   ligados. A forma bate 1:1 com lib/types.ts, então trocar por uma query
   (products + product_images + product_variants) não muda a UI.

   Imagens: placeholders determinísticos do picsum (seed por slug) para o
   ambiente sempre renderizar. Ao ligar o Storage, troque `img()` pela URL real.
--------------------------------------------------------------------------- */

const img = (seed: string, alt: string) => ({
  url: `https://picsum.photos/seed/romper-${seed}/1100/1100`,
  alt,
});

export const CATEGORIES = [
  { name: 'Moda', slug: 'moda' },
  { name: 'Achadinhos', slug: 'achadinhos' },
  { name: 'Casa', slug: 'casa' },
  { name: 'Tech', slug: 'tech' },
  { name: 'Beleza', slug: 'beleza' },
  { name: 'Fitness', slug: 'fitness' },
];

export const PRODUCTS: Product[] = [
  {
    id: 'p-organizador-modular',
    slug: 'organizador-modular',
    title: 'Organizador modular de gaveta',
    description:
      'Divisórias ajustáveis que se encaixam para organizar gavetas, closet e escritório. ' +
      'Plástico ABS resistente, encaixe sem ferramentas e limpeza fácil. Monte do seu jeito: ' +
      'as peças combinam entre si para caber em qualquer espaço.',
    brand: 'Casa Nova',
    categoryName: 'Achadinhos',
    categorySlug: 'achadinhos',
    source: 'dropship',
    priceCents: 2990,
    compareAtCents: 4990,
    currency: 'BRL',
    stock: 137,
    codAvailable: true,
    codMaxCents: 15000,
    ratingAvg: 4.8,
    ratingCount: 1243,
    salesCount: 8600,
    score: 92,
    images: [
      img('organizador-1', 'Organizador modular montado em gaveta'),
      img('organizador-2', 'Divisórias separadas'),
      img('organizador-3', 'Detalhe do encaixe'),
      img('organizador-4', 'Organizador em uso no closet'),
    ],
    optionGroups: [{ name: 'Cor', values: ['Cinza', 'Bege', 'Preto'] }],
    variants: [
      { id: 'v-org-cinza', name: 'Cinza', options: { Cor: 'Cinza' }, stock: 60, imageIndex: 0 },
      { id: 'v-org-bege', name: 'Bege', options: { Cor: 'Bege' }, stock: 52, imageIndex: 3 },
      { id: 'v-org-preto', name: 'Preto', options: { Cor: 'Preto' }, stock: 25, imageIndex: 1 },
    ],
    seller: { name: 'Casa Nova Utilidades', slug: 'casa-nova', ratingAvg: 4.7, ratingCount: 5210 },
  },
  {
    id: 'p-luminaria-por-do-sol',
    slug: 'luminaria-por-do-sol',
    title: 'Luminária pôr do sol projetor',
    description:
      'Projeta um halo quente de pôr do sol na parede — perfeita para fotos, ambientes ' +
      'aconchegantes e vídeos. Ângulo e altura ajustáveis, cabo USB-C incluso. 16 tons ' +
      'de luz do amanhecer ao crepúsculo.',
    brand: 'Lumen',
    categoryName: 'Achadinhos',
    categorySlug: 'achadinhos',
    source: 'dropship',
    priceCents: 3990,
    compareAtCents: 6990,
    currency: 'BRL',
    stock: 74,
    codAvailable: true,
    codMaxCents: 15000,
    ratingAvg: 4.7,
    ratingCount: 892,
    salesCount: 5300,
    score: 87,
    images: [
      img('luminaria-1', 'Luminária projetando pôr do sol na parede'),
      img('luminaria-2', 'Luminária ligada sobre a mesa'),
      img('luminaria-3', 'Detalhe do cabeçote ajustável'),
    ],
    optionGroups: [{ name: 'Cor', values: ['Branco', 'Preto'] }],
    variants: [
      { id: 'v-lum-branco', name: 'Branco', options: { Cor: 'Branco' }, stock: 40, imageIndex: 0 },
      { id: 'v-lum-preto', name: 'Preto', options: { Cor: 'Preto' }, stock: 34, imageIndex: 1 },
    ],
    seller: { name: 'Lumen Store', slug: 'lumen-store', ratingAvg: 4.6, ratingCount: 2130 },
  },
  {
    id: 'p-kit-potes-hermeticos',
    slug: 'kit-potes-hermeticos',
    title: 'Kit potes herméticos para mantimentos',
    description:
      'Mantém grãos, farinhas e cereais frescos por mais tempo. Tampa com trava de silício, ' +
      'vedação total contra umidade e empilháveis. Livre de BPA e à prova de vazamento.',
    brand: 'Fresco',
    categoryName: 'Achadinhos',
    categorySlug: 'achadinhos',
    source: 'seller',
    priceCents: 5990,
    compareAtCents: 8990,
    currency: 'BRL',
    stock: 58,
    codAvailable: true,
    codMaxCents: 15000,
    ratingAvg: 4.9,
    ratingCount: 634,
    salesCount: 3100,
    score: 81,
    images: [
      img('potes-1', 'Kit de potes herméticos na bancada'),
      img('potes-2', 'Potes empilhados'),
      img('potes-3', 'Detalhe da tampa com trava'),
    ],
    optionGroups: [{ name: 'Tamanho', values: ['3 peças', '5 peças', '8 peças'] }],
    variants: [
      { id: 'v-pot-3', name: '3 peças', options: { Tamanho: '3 peças' }, priceCents: 5990, stock: 30 },
      { id: 'v-pot-5', name: '5 peças', options: { Tamanho: '5 peças' }, priceCents: 7990, stock: 20 },
      { id: 'v-pot-8', name: '8 peças', options: { Tamanho: '8 peças' }, priceCents: 10990, stock: 8 },
    ],
    seller: { name: 'Fresco Casa', slug: 'fresco-casa', ratingAvg: 4.9, ratingCount: 1870 },
  },
  {
    id: 'p-fone-bluetooth-tws',
    slug: 'fone-bluetooth-tws',
    title: 'Fone Bluetooth TWS com cancelamento de ruído',
    description:
      'Som nítido com graves encorpados, cancelamento ativo de ruído e até 30h de bateria ' +
      'com o estojo. Bluetooth 5.3, toque inteligente e resistência a suor (IPX5).',
    brand: 'Sonic',
    categoryName: 'Tech',
    categorySlug: 'tech',
    source: 'dropship',
    priceCents: 9990,
    compareAtCents: 15990,
    currency: 'BRL',
    stock: 96,
    codAvailable: false,
    ratingAvg: 4.6,
    ratingCount: 2054,
    salesCount: 11200,
    images: [
      img('fone-1', 'Fone TWS com estojo'),
      img('fone-2', 'Fones fora do estojo'),
      img('fone-3', 'Fone no ouvido'),
    ],
    optionGroups: [{ name: 'Cor', values: ['Preto', 'Branco'] }],
    variants: [
      { id: 'v-fone-preto', name: 'Preto', options: { Cor: 'Preto' }, stock: 60, imageIndex: 0 },
      { id: 'v-fone-branco', name: 'Branco', options: { Cor: 'Branco' }, stock: 36, imageIndex: 1 },
    ],
    seller: { name: 'Sonic Áudio', slug: 'sonic-audio', ratingAvg: 4.5, ratingCount: 8400 },
  },
  {
    id: 'p-jaqueta-corta-vento',
    slug: 'jaqueta-corta-vento',
    title: 'Jaqueta corta-vento impermeável',
    description:
      'Leve, dobrável e à prova d’água — cabe na mochila e te salva da chuva. Costura selada, ' +
      'capuz ajustável e tecido com respirabilidade para treino e dia a dia.',
    brand: 'Trilha',
    categoryName: 'Moda',
    categorySlug: 'moda',
    source: 'seller',
    priceCents: 12990,
    compareAtCents: 19990,
    currency: 'BRL',
    stock: 43,
    codAvailable: true,
    codMaxCents: 20000,
    ratingAvg: 4.7,
    ratingCount: 421,
    salesCount: 1900,
    images: [
      img('jaqueta-1', 'Jaqueta corta-vento preta'),
      img('jaqueta-2', 'Jaqueta dobrada'),
      img('jaqueta-3', 'Detalhe do capuz'),
    ],
    optionGroups: [{ name: 'Tamanho', values: ['P', 'M', 'G', 'GG'] }],
    variants: [
      { id: 'v-jaq-p', name: 'P', options: { Tamanho: 'P' }, stock: 8 },
      { id: 'v-jaq-m', name: 'M', options: { Tamanho: 'M' }, stock: 15 },
      { id: 'v-jaq-g', name: 'G', options: { Tamanho: 'G' }, stock: 14 },
      { id: 'v-jaq-gg', name: 'GG', options: { Tamanho: 'GG' }, stock: 6 },
    ],
    seller: { name: 'Trilha Outdoor', slug: 'trilha-outdoor', ratingAvg: 4.8, ratingCount: 3020 },
  },
  {
    id: 'p-serum-vitamina-c',
    slug: 'serum-vitamina-c',
    title: 'Sérum facial vitamina C 20%',
    description:
      'Ilumina, uniformiza o tom e combate sinais do tempo. Fórmula com vitamina C estabilizada, ' +
      'ácido hialurônico e vitamina E. Textura leve, absorção rápida, para uso diário.',
    brand: 'Glow',
    categoryName: 'Beleza',
    categorySlug: 'beleza',
    source: 'seller',
    priceCents: 4990,
    compareAtCents: 7990,
    currency: 'BRL',
    stock: 120,
    codAvailable: true,
    codMaxCents: 15000,
    ratingAvg: 4.9,
    ratingCount: 1580,
    salesCount: 7400,
    images: [
      img('serum-1', 'Frasco de sérum vitamina C'),
      img('serum-2', 'Conta-gotas com o sérum'),
      img('serum-3', 'Sérum sobre a bancada'),
    ],
    optionGroups: [],
    variants: [],
    seller: { name: 'Glow Skincare', slug: 'glow-skincare', ratingAvg: 4.9, ratingCount: 4200 },
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

/** Produtos relacionados: mesma categoria primeiro, completa com outros. */
export function getRelated(product: Product, limit = 3): Product[] {
  const sameCat = PRODUCTS.filter(
    (p) => p.id !== product.id && p.categorySlug === product.categorySlug,
  );
  const others = PRODUCTS.filter(
    (p) => p.id !== product.id && p.categorySlug !== product.categorySlug,
  );
  return [...sameCat, ...others].slice(0, limit);
}

/** Ranking "em alta" por categoria (usa score do mock; vem de product_scores depois). */
export function getRanking(categorySlug: string, limit = 3): Product[] {
  return PRODUCTS.filter((p) => p.categorySlug === categorySlug && p.score != null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limit);
}
