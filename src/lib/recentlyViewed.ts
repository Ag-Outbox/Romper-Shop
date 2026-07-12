/* Produtos vistos recentemente (localStorage) — vira coluna/tabela por perfil
   quando o Supabase entrar. Só guarda ids; a UI resolve via fetchProductById. */

const KEY = 'romper.recent.v1';
const MAX = 12;

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/** Registra uma visita — o mais recente sempre vai pra frente da lista. */
export function recordView(productId: string): void {
  const list = [productId, ...read().filter((id) => id !== productId)].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function listRecentIds(excludeId?: string): string[] {
  return read().filter((id) => id !== excludeId);
}
