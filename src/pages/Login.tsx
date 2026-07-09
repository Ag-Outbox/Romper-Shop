import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import TopBar from '../components/TopBar';
import SiteFooter from '../components/SiteFooter';
import { useAuth, DEMO_LOGINS, type Role } from '../lib/auth';

/* ---------------------------------------------------------------------------
   ROMPER SHOP — Entrar / Criar conta (/entrar)
   Um formulário para os dois modos (login/cadastro). No modo mock, mostra
   contas de demonstração para entrar com 1 clique como comprador/vendedor/admin.
--------------------------------------------------------------------------- */

const DEST: Record<Role, string> = { buyer: '/conta', seller: '/vendedor', admin: '/admin' };
const inputCls = 'rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-mist outline-none placeholder:text-fog/60 focus:border-volt transition-colors';

export default function Login() {
  const { signIn, signUp, isMock } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = () => navigate(from ?? '/conta', { replace: true });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signin') await signIn(email, password);
      else await signUp(email, password, fullName);
      go();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível concluir.');
    } finally {
      setBusy(false);
    }
  };

  const demoLogin = async (demoEmail: string, demoPassword: string, role: Role) => {
    setError(null);
    setBusy(true);
    try {
      await signIn(demoEmail, demoPassword);
      navigate(from ?? DEST[role], { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no login de demonstração.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar />
      <main className="px-5 md:px-10 py-16 flex justify-center">
        <div className="w-full max-w-md">
          <p className="font-mono text-xs text-volt tracking-widest mb-3">CONTA</p>
          <h1 className="font-display text-4xl md:text-5xl font-semibold">
            {mode === 'signin' ? 'Entrar' : 'Criar conta'}
          </h1>

          <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
            {mode === 'signup' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-fog">Nome completo</span>
                <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" />
              </label>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-fog">E-mail</span>
              <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" required />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-fog">Senha</span>
              <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" required />
            </label>

            {error && <p className="text-sm text-ember">{error}</p>}

            <button type="submit" disabled={busy}
              className="rounded-full bg-volt px-7 py-3 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors disabled:opacity-60">
              {busy ? 'Aguarde…' : mode === 'signin' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          <button
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
            className="mt-5 text-sm text-fog hover:text-volt transition-colors"
          >
            {mode === 'signin' ? 'Não tem conta? Criar agora' : 'Já tem conta? Entrar'}
          </button>

          {isMock && (
            <div className="mt-10 rounded-xl2 border border-line bg-surface p-5">
              <p className="font-mono text-xs text-fog tracking-widest mb-1">MODO DEMONSTRAÇÃO</p>
              <p className="text-sm text-fog mb-4">Sem Supabase configurado — entre com uma conta de teste:</p>
              <div className="flex flex-col gap-2">
                {DEMO_LOGINS.map((d) => (
                  <button
                    key={d.email}
                    onClick={() => demoLogin(d.email, d.password, d.role)}
                    disabled={busy}
                    className="flex items-center justify-between rounded-lg border border-line px-4 py-2.5 text-sm hover:border-volt transition-colors disabled:opacity-60"
                  >
                    <span className="text-mist">Entrar como <b className="capitalize">{d.role}</b></span>
                    <span className="font-mono text-xs text-fog">{d.email}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Link to="/" className="mt-8 block text-center text-sm text-fog hover:text-volt transition-colors">voltar à loja</Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
