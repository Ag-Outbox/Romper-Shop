import type { SellerAccount } from './types';
import { pushNotification } from './notificationsStore';

/* ---------------------------------------------------------------------------
   Registro de vendedores auto-cadastrados (via /vender), em localStorage.
   Os vendedores "de fábrica" do catálogo mock (Casa Nova, Lumen Store...)
   vivem embutidos em cada produto (lib/catalog.ts) — este módulo cobre as
   lojas novas, criadas pela própria pessoa, que ainda não têm produto
   nenhum (por isso fetchStore precisa consultar os dois). No Supabase, isso
   é só uma linha em `sellers` — sem tabela separada.
--------------------------------------------------------------------------- */

const KEY = 'romper.sellers.v1';
const DIACRITICS = /[̀-ͯ]/g;

function readAll(): SellerAccount[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SellerAccount[]) : [];
  } catch {
    return [];
  }
}

function writeAll(sellers: SellerAccount[]): void {
  localStorage.setItem(KEY, JSON.stringify(sellers));
}

export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function isSlugTaken(slug: string): boolean {
  return readAll().some((s) => s.slug === slug);
}

export function getSellerAccount(slug: string): SellerAccount | undefined {
  return readAll().find((s) => s.slug === slug);
}

export function registerSeller(input: { slug: string; name: string; ownerId: string }): SellerAccount {
  if (isSlugTaken(input.slug)) throw new Error('Já existe uma loja com este endereço. Escolha outro nome.');
  const account: SellerAccount = { ...input, status: 'pending', createdAt: new Date().toISOString() };
  writeAll([...readAll(), account]);

  // Fila do admin: nova loja aguardando aprovação.
  pushNotification({
    audienceRole: 'admin',
    kind: 'store',
    title: 'Nova loja aguardando aprovação',
    body: input.name,
    href: '/admin',
  });
  return account;
}

export function listPendingSellers(): SellerAccount[] {
  return readAll().filter((s) => s.status === 'pending');
}

export function approveSeller(slug: string): void {
  const all = readAll().map((s) => (s.slug === slug ? { ...s, status: 'active' as const } : s));
  writeAll(all);

  // Avisa o dono da loja que ela foi aprovada.
  pushNotification({
    audienceRole: 'seller',
    storeSlug: slug,
    kind: 'store',
    title: 'Sua loja foi aprovada!',
    body: 'Já pode publicar produtos e vender.',
    href: '/vendedor',
  });
}

