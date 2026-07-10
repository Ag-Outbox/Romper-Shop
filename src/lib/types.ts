/* ---------------------------------------------------------------------------
   Tipos de domínio do frontend. Espelham o schema em supabase/migrations,
   porém em camelCase e só com o que a UI precisa. Enquanto o Supabase não
   está ligado, o catálogo em lib/catalog.ts fornece dados mock com esta forma.
--------------------------------------------------------------------------- */

export type ProductSource = 'seller' | 'dropship';

export interface ProductImage {
  url: string;
  alt: string;
}

/** Grupo de opção de variação, ex.: { name: 'Cor', values: ['Preto','Verde'] } */
export interface ProductOptionGroup {
  name: string;
  values: string[];
}

export interface ProductVariant {
  id: string;
  name: string;                       // "Cinza", "5 peças", ...
  options: Record<string, string>;    // { Cor: 'Cinza' }
  priceCents?: number;                // sobrescreve o preço base quando presente
  stock: number;
  imageIndex?: number;                // índice na galeria para trocar ao selecionar
}

export interface Seller {
  name: string;
  slug: string;
  ratingAvg: number;
  ratingCount: number;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  brand?: string;
  categoryName: string;
  categorySlug: string;
  source: ProductSource;

  priceCents: number;
  compareAtCents?: number;
  currency: string;                   // 'BRL'
  stock: number;

  codAvailable: boolean;
  codMaxCents?: number;

  ratingAvg: number;
  ratingCount: number;
  salesCount: number;
  score?: number;                     // ranking do teaser "em alta"

  images: ProductImage[];
  optionGroups: ProductOptionGroup[];
  variants: ProductVariant[];
  seller: Seller;
}

export interface CartItem {
  productId: string;
  slug: string;
  title: string;
  image: string;
  unitCents: number;
  qty: number;
  variantId?: string;
  variantName?: string;
  codAvailable: boolean;
  sellerSlug: string;
  sellerName: string;
}

/* ---- Checkout / pedidos ---- */

export interface Address {
  recipient: string;
  phone: string;
  cep: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  uf: string;
}

export type OrderPaymentMethod = 'pix' | 'card' | 'cod';

/** Status do sub-pedido (1 por vendedor), espelha order_status do schema. */
export type SubOrderStatus = 'paid' | 'processing' | 'awaiting_cod' | 'shipped' | 'delivered';

export interface OrderSubOrder {
  sellerSlug: string;
  sellerName: string;
  items: CartItem[];
  subtotalCents: number;
  status: SubOrderStatus;
}

export interface Order {
  id: string;
  createdAt: string;
  address: Address;
  paymentMethod: OrderPaymentMethod;
  isCod: boolean;
  subOrders: OrderSubOrder[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  statusLabel: string;
}
