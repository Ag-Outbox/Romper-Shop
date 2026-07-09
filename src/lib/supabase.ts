import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/* ---------------------------------------------------------------------------
   Client do Supabase — criado só quando as variáveis de ambiente existem.
   Enquanto o .env não estiver preenchido, `supabase` é null e a camada de
   dados (lib/api) cai automaticamente no catálogo mock. Para ligar de verdade,
   basta criar um .env com:
     VITE_SUPABASE_URL=...
     VITE_SUPABASE_ANON_KEY=...
   e aplicar as migrations + seed (ver README).
--------------------------------------------------------------------------- */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function looksReal(v?: string): v is string {
  return !!v && v.length > 0 && !v.startsWith('your-');
}

export const isSupabaseConfigured = looksReal(url) && looksReal(anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null;
