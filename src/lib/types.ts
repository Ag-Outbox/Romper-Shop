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

/** Endereço salvo pelo comprador para reutilizar no checkout. */
export interface SavedAddress extends Address {
  id: string;
  label: string;      // "Casa", "Trabalho"…
  isDefault: boolean;
}

export type OrderPaymentMethod = 'pix' | 'card' | 'cod';

/** Status do sub-pedido (1 por vendedor), espelha order_status do schema. */
export type SubOrderStatus = 'paid' | 'processing' | 'awaiting_cod' | 'shipped' | 'delivered';

/** Um evento na linha do tempo de rastreio do sub-pedido. */
export interface StatusEvent {
  status: SubOrderStatus;
  at: string; // ISO
}

export interface OrderSubOrder {
  sellerSlug: string;
  sellerName: string;
  items: CartItem[];
  subtotalCents: number;
  status: SubOrderStatus;
  /** Histórico de status (rastreio). Pedidos antigos podem não ter. */
  history?: StatusEvent[];
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
  couponCode?: string;
  discountCents?: number;
  totalCents: number;
  statusLabel: string;
}

/* ---- Cupons (plataforma ou loja) ---- */

export type CouponKind = 'percent' | 'fixed' | 'free_shipping';

export interface Coupon {
  id: string;
  code: string;               // sempre maiúsculo, único
  kind: CouponKind;
  percent?: number;           // kind=percent (1–90)
  amountCents?: number;       // kind=fixed
  scope: 'platform' | 'store';
  storeSlug?: string;         // scope=store: desconta só os itens dessa loja
  minSubtotalCents?: number;
  expiresAt?: string;         // ISO; ausente = sem validade
  maxUses?: number;           // ausente = ilimitado
  uses: number;
  active: boolean;
  createdAt: string;
}

/* ---- Notificações in-app (central de notificações) ---- */

/** Papel-alvo da notificação — casa com Role do auth (buyer/seller/admin). */
export type NotificationAudienceRole = 'buyer' | 'seller' | 'admin';

export type NotificationKind = 'order' | 'question' | 'review' | 'store' | 'payout';

export interface AppNotification {
  id: string;
  audienceRole: NotificationAudienceRole;
  storeSlug?: string;         // quando audienceRole = 'seller'
  kind: NotificationKind;
  title: string;
  body?: string;
  href?: string;              // rota para onde o clique leva
  read: boolean;
  createdAt: string;
}

/* ---- Avaliações (só com compra verificada, 1 por comprador/produto) ---- */

export interface SellerReply {
  body: string;
  at: string;
}

export interface Review {
  id: string;
  productId: string;
  buyerId: string;
  buyerName: string;
  rating: number; // 1-5
  title?: string;
  body?: string;
  isVerified: boolean;
  createdAt: string;
  /** Votos de "útil" (agregado). */
  helpfulCount?: number;
  /** Resposta pública do vendedor. */
  sellerReply?: SellerReply;
}

/* ---- Perguntas & Respostas no produto ---- */

export interface Question {
  id: string;
  productId: string;
  authorName: string;
  body: string;
  createdAt: string;
  answer?: SellerReply;
}

/* ---- Afiliados (aditivo — não substitui o role do usuário) ---- */

export interface Affiliate {
  id: string;
  profileId: string;
  code: string;
  commissionPercent: number;
  status: 'active' | 'suspended';
  clicks: number;
  balanceCents: number;  // comissão confirmada (sub-pedido entregue)
  pendingCents: number;  // comissão de pedidos ainda não entregues
  createdAt: string;
}

export interface AffiliateCommission {
  id: string;
  affiliateId: string;
  orderId: string;
  sellerSlug: string;
  sellerName: string;
  amountCents: number;
  status: 'pending' | 'confirmed';
  createdAt: string;
}

/* ---- Vendedor auto-cadastrado (loja criada via /vender) ---- */

export interface SellerAccount {
  slug: string;
  name: string;
  ownerId: string;
  status: 'pending' | 'active';
  createdAt: string;
}

/* ---- Saques (vendedor OU afiliado — exatamente um dos dois) ---- */

export interface Payout {
  id: string;
  ownerType: 'seller' | 'affiliate';
  ownerId: string; // storeSlug (vendedor) ou affiliateId (afiliado)
  amountCents: number;
  status: 'pending' | 'paid';
  requestedAt: string;
}
