import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import { registerSeller } from './sellers';

/* ---------------------------------------------------------------------------
   AUTENTICAÇÃO — Supabase-ready com fallback mock.
   Se o Supabase estiver configurado, usa o Supabase Auth e lê o papel em
   `profiles.role`. Caso contrário, um mock em localStorage com contas de
   demonstração permite testar comprador/vendedor/admin sem backend.
   A interface (useAuth) é a mesma nos dois modos — as telas não mudam.
--------------------------------------------------------------------------- */

export type Role = 'buyer' | 'seller' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  storeSlug?: string; // vendedor
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isMock: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Auto-cadastro de vendedor (buyer -> seller). Só funciona a partir de 'buyer'. */
  becomeSeller: (storeName: string, storeSlug: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/* ----------------------------- Mock em localStorage ------------------------ */

const SESSION_KEY = 'romper.auth.session';
const USERS_KEY = 'romper.auth.users';

interface MockUser extends AuthUser {
  password: string;
}

const DEMO_USERS: MockUser[] = [
  { id: 'u-buyer', email: 'comprador@romper.shop', password: '123456', fullName: 'Ana Compradora', role: 'buyer' },
  { id: 'u-seller', email: 'vendedor@romper.shop', password: '123456', fullName: 'Bruno da Loja', role: 'seller', storeSlug: 'casa-nova' },
  { id: 'u-admin', email: 'admin@romper.shop', password: '123456', fullName: 'Admin Romper', role: 'admin' },
];

function readUsers(): MockUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    const stored = raw ? (JSON.parse(raw) as MockUser[]) : [];
    // Garante que as contas demo sempre existam.
    const emails = new Set(stored.map((u) => u.email));
    const merged = [...stored];
    for (const d of DEMO_USERS) if (!emails.has(d.email)) merged.push(d);
    return merged;
  } catch {
    return DEMO_USERS;
  }
}

function writeUsers(users: MockUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function stripPassword(u: MockUser): AuthUser {
  const { password: _pw, ...rest } = u;
  return rest;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      // Mock: restaura sessão do localStorage.
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        setUser(raw ? (JSON.parse(raw) as AuthUser) : null);
      } catch {
        setUser(null);
      }
      setLoading(false);
      return;
    }

    // Supabase: sessão atual + assinatura de mudanças.
    let unsub = () => {};
    supabase.auth.getSession().then(async ({ data }) => {
      setUser(data.session ? await toAuthUser(data.session.user.id, data.session.user.email) : null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      setUser(session ? await toAuthUser(session.user.id, session.user.email) : null);
    });
    unsub = () => sub.subscription.unsubscribe();
    return unsub;
  }, []);

  async function toAuthUser(id: string, email?: string): Promise<AuthUser> {
    let role: Role = 'buyer';
    let fullName = email ?? '';
    let storeSlug: string | undefined;
    if (supabase) {
      const { data } = await supabase.from('profiles').select('full_name, role').eq('id', id).maybeSingle();
      if (data) {
        role = (data.role as Role) ?? 'buyer';
        fullName = (data.full_name as string) ?? fullName;
      }
      if (role === 'seller') {
        const { data: s } = await supabase.from('sellers').select('store_slug').eq('owner_id', id).maybeSingle();
        storeSlug = (s?.store_slug as string) ?? undefined;
      }
    }
    return { id, email: email ?? '', fullName, role, storeSlug };
  }

  const setSession = (u: AuthUser | null) => {
    setUser(u);
    if (u) localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    else localStorage.removeItem(SESSION_KEY);
  };

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      return;
    }
    const match = readUsers().find((u) => u.email === email.trim() && u.password === password);
    if (!match) throw new Error('E-mail ou senha inválidos.');
    setSession(stripPassword(match));
  };

  const signUp: AuthContextValue['signUp'] = async (email, password, fullName) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
      if (error) throw new Error(error.message);
      return;
    }
    const users = readUsers();
    if (users.some((u) => u.email === email.trim())) throw new Error('Já existe uma conta com este e-mail.');
    const created: MockUser = { id: `u-${Date.now().toString(36)}`, email: email.trim(), password, fullName: fullName.trim() || 'Nova conta', role: 'buyer' };
    writeUsers([...users, created]);
    setSession(stripPassword(created));
  };

  const signOut: AuthContextValue['signOut'] = async () => {
    if (isSupabaseConfigured && supabase) await supabase.auth.signOut();
    setSession(null);
  };

  const becomeSeller: AuthContextValue['becomeSeller'] = async (storeName, storeSlug) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.rpc('become_seller', { store_name: storeName, store_slug: storeSlug });
      if (error) throw new Error(error.message);
      const { data } = await supabase.auth.getSession();
      if (data.session) setUser(await toAuthUser(data.session.user.id, data.session.user.email));
      return;
    }

    if (!user) throw new Error('Entre na sua conta antes de abrir uma loja.');
    if (user.role !== 'buyer') throw new Error(`Só compradores podem abrir uma loja por aqui (papel atual: ${user.role}).`);

    registerSeller({ slug: storeSlug, name: storeName, ownerId: user.id });

    const users = readUsers().map((u) => (u.id === user.id ? { ...u, role: 'seller' as Role, storeSlug } : u));
    writeUsers(users);
    setSession({ ...user, role: 'seller', storeSlug });
  };

  return (
    <AuthContext.Provider value={{ user, loading, isMock: !isSupabaseConfigured, signIn, signUp, signOut, becomeSeller }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}

export const DEMO_LOGINS = DEMO_USERS.map((u) => ({ email: u.email, password: u.password, role: u.role, fullName: u.fullName }));
