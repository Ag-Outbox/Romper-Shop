/* Catálogo administrado da plataforma (dropship direto, sem vendedor no meio),
   persistido em localStorage até a tabela `admin_catalog` — antes ficava só
   em memória e sumia ao recarregar. */

export interface AdminCatalogRow {
  id: string;
  title: string;
  category: string;
  priceCents: number;
  costCents: number;
  markupPercent: number;
  providerSlug: string;
  stock: number;
  status: 'active' | 'draft';
  createdAt: string;
}

const KEY = 'romper.adminCatalog.v1';

function readAll(): AdminCatalogRow[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AdminCatalogRow[]) : [];
  } catch {
    return [];
  }
}

function writeAll(rows: AdminCatalogRow[]): void {
  localStorage.setItem(KEY, JSON.stringify(rows));
}

export function listAdminCatalog(): AdminCatalogRow[] {
  return readAll();
}

export function addAdminCatalogRow(row: Omit<AdminCatalogRow, 'id' | 'createdAt'>): AdminCatalogRow[] {
  const rows = readAll();
  const full: AdminCatalogRow = {
    ...row,
    id: `admin-imp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    createdAt: new Date().toISOString(),
  };
  const next = [full, ...rows];
  writeAll(next);
  return next;
}

export function toggleAdminRowStatus(id: string): AdminCatalogRow[] {
  const rows = readAll();
  const r = rows.find((x) => x.id === id);
  if (r) r.status = r.status === 'active' ? 'draft' : 'active';
  writeAll(rows);
  return rows;
}

export function removeAdminRow(id: string): AdminCatalogRow[] {
  const next = readAll().filter((x) => x.id !== id);
  writeAll(next);
  return next;
}
