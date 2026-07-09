/* Formatação de dinheiro e afins. Preços trafegam em CENTAVOS (bigint no banco)
   para nunca usar float — a formatação para exibição acontece só aqui. */

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/** Percentual de desconto (inteiro) ou null quando não há preço "de" válido. */
export function discountPercent(priceCents: number, compareAtCents?: number): number | null {
  if (!compareAtCents || compareAtCents <= priceCents) return null;
  return Math.round((1 - priceCents / compareAtCents) * 100);
}

/** Formata contagens grandes: 12400 -> "12,4k". */
export function compactCount(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return `${k.toFixed(k < 10 ? 1 : 0).replace('.', ',')}k`;
}
