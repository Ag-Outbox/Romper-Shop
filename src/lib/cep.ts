import type { CartItem } from './types';

/* ---------------------------------------------------------------------------
   CEP + elegibilidade de COD (Cash On Delivery).
   Lookup via ViaCEP (público). Se a rede falhar, o formulário aceita entrada
   manual — nada trava. A regra de elegibilidade combina: todos os itens
   aceitam COD, valor dentro do teto e região atendida (UF).
   No backend, isso passa a considerar também reputação do comprador
   (buyer_score / cod_refusals) — ver supabase/migrations/0003_orders.sql.
--------------------------------------------------------------------------- */

export function maskCep(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function isValidCep(v: string): boolean {
  return v.replace(/\D/g, '').length === 8;
}

export interface CepInfo {
  street?: string;
  district?: string;
  city?: string;
  uf?: string;
}

export async function lookupCep(cep: string): Promise<CepInfo | null> {
  const d = cep.replace(/\D/g, '');
  if (d.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${d}/json/`);
    if (!res.ok) return null;
    const j = (await res.json()) as Record<string, string> & { erro?: boolean };
    if (j.erro) return null;
    return { street: j.logradouro, district: j.bairro, city: j.localidade, uf: j.uf };
  } catch {
    return null; // offline / bloqueado — segue com entrada manual
  }
}

/** UFs atendidas por COD no mock (capitais/regiões com logística de entrega). */
export const COD_UFS = ['SP', 'RJ', 'MG', 'ES', 'PR', 'SC', 'RS', 'BA', 'PE', 'CE', 'DF', 'GO'];

export interface CodCheck {
  ok: boolean;
  reason?: string;
}

export function codEligibility(args: {
  items: CartItem[];
  totalCents: number;
  uf: string;
  capCents?: number;
}): CodCheck {
  if (args.items.length === 0) return { ok: false, reason: 'Sacola vazia.' };
  if (!args.items.every((i) => i.codAvailable))
    return { ok: false, reason: 'Nem todos os itens aceitam pagamento na entrega.' };
  if (args.capCents && args.totalCents > args.capCents)
    return { ok: false, reason: 'Valor do pedido acima do limite para pagamento na entrega.' };
  if (args.uf && !COD_UFS.includes(args.uf.toUpperCase()))
    return { ok: false, reason: 'Pagamento na entrega ainda não disponível para esta região.' };
  return { ok: true };
}

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];
