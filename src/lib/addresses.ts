import type { Address, SavedAddress } from './types';

/* Endereços salvos do comprador (localStorage) até a tabela `addresses` no
   Supabase — mesmo padrão mock-first de orders.ts. */

const KEY = 'romper.addresses.v1';

function readAll(): SavedAddress[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedAddress[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: SavedAddress[]): void {
  localStorage.setItem(KEY, JSON.stringify(list));
}

/** Endereços salvos, padrão primeiro. */
export function listAddresses(): SavedAddress[] {
  return readAll().sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}

/** Salva um endereço novo. O primeiro salvo vira o padrão. */
export function saveAddress(address: Address, label: string): SavedAddress {
  const all = readAll();
  const saved: SavedAddress = {
    ...address,
    id: `ad-${Date.now().toString(36)}`,
    label: label.trim() || `Endereço ${all.length + 1}`,
    isDefault: all.length === 0,
  };
  all.push(saved);
  writeAll(all);
  return saved;
}

export function removeAddress(id: string): void {
  const rest = readAll().filter((a) => a.id !== id);
  // se o padrão foi removido, promove o primeiro restante
  if (rest.length > 0 && !rest.some((a) => a.isDefault)) rest[0].isDefault = true;
  writeAll(rest);
}

export function setDefaultAddress(id: string): void {
  writeAll(readAll().map((a) => ({ ...a, isDefault: a.id === id })));
}
