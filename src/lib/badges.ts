import { getStoreProfile } from './storeProfile';

/* Selos de confiança da loja (A8) — DERIVADOS de dados reais, nada de selo
   à mão: Oficial = reputação consolidada (muitas avaliações), Envio Rápido =
   compromisso de postagem no perfil, Top = nota alta com volume mínimo.
   No Supabase, "Oficial" vira flag concedida pelo admin. */

export interface StoreBadge {
  id: 'official' | 'fast' | 'top';
  label: string;
  icon: string;
  hint: string;
}

export function storeBadges(seller: { slug: string; ratingAvg: number; ratingCount: number }): StoreBadge[] {
  const out: StoreBadge[] = [];
  if (seller.ratingCount >= 2000) {
    out.push({ id: 'official', label: 'Loja Oficial', icon: '✔', hint: 'Reputação consolidada na plataforma' });
  }
  const profile = getStoreProfile(seller.slug);
  if ((profile?.shippingDays ?? 99) <= 2) {
    out.push({ id: 'fast', label: 'Envio Rápido', icon: '⚡', hint: `Posta em até ${profile!.shippingDays} ${profile!.shippingDays === 1 ? 'dia útil' : 'dias úteis'}` });
  }
  if (seller.ratingAvg >= 4.7 && seller.ratingCount >= 100) {
    out.push({ id: 'top', label: 'Bem avaliada', icon: '★', hint: `Nota ${seller.ratingAvg.toFixed(1)} pelos compradores` });
  }
  return out;
}
