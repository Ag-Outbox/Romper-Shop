/* Stub de localStorage para os testes de lógica pura rodarem em Node —
   os módulos mock-first só precisam de get/set/remove. */

const store = new Map<string, string>();

globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => { store.clear(); },
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() { return store.size; },
} as Storage;
