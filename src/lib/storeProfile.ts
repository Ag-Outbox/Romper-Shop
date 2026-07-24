/* Perfil público editável da loja (localStorage por storeSlug) até a coluna
   profile jsonb em `sellers` no Supabase. O que o vendedor escreve aqui
   aparece na página pública /loja/:slug. */

export interface StoreProfile {
  storeSlug: string;
  tagline: string;         // uma linha embaixo do nome
  description: string;     // sobre a loja
  bannerColor: string;     // classe de fundo do cabeçalho público
  shippingDays: number;    // prazo prometido de postagem (dias úteis)
  freeShippingOverCents?: number; // frete grátis acima de X (informativo)
  returnsPolicy: string;   // política de troca/devolução
  updatedAt: string;
}

export const BANNER_COLORS = [
  { id: 'volt', label: 'Verde', cls: 'bg-volt/15' },
  { id: 'ember', label: 'Coral', cls: 'bg-ember/15' },
  { id: 'ink', label: 'Grafite', cls: 'bg-line/40' },
  { id: 'plain', label: 'Neutro', cls: 'bg-surface' },
] as const;

const KEY = 'romper.storeProfiles.v1';

function readAll(): Record<string, StoreProfile> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getStoreProfile(storeSlug: string): StoreProfile | undefined {
  return readAll()[storeSlug];
}

export function saveStoreProfile(profile: Omit<StoreProfile, 'updatedAt'>): StoreProfile {
  const all = readAll();
  const full: StoreProfile = { ...profile, updatedAt: new Date().toISOString() };
  all[profile.storeSlug] = full;
  localStorage.setItem(KEY, JSON.stringify(all));
  return full;
}
