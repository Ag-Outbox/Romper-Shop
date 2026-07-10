import { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import TopBar from '../components/TopBar';
import SiteFooter from '../components/SiteFooter';
import Reveal from '../components/Reveal';
import { useAuth } from '../lib/auth';
import { usePageMeta } from '../lib/usePageMeta';
import { slugify, isSlugTaken } from '../lib/sellers';

/* ---------------------------------------------------------------------------
   ROMPER SHOP — Torne-se vendedor (/vender)
   Auto-cadastro: qualquer comprador vira vendedor na hora (loja fica
   'pending' até revisão do admin, mas o dono já acessa o próprio painel —
   mesma regra de visibilidade usada em produtos/lojas: dono sempre vê o seu).
--------------------------------------------------------------------------- */

const inputCls = 'rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-mist outline-none placeholder:text-fog/60 focus:border-volt transition-colors';

export default function BecomeSeller() {
  usePageMeta('Abrir minha loja');
  const { user, becomeSeller } = useAuth();
  const navigate = useNavigate();

  const [storeName, setStoreName] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user?.role === 'seller') return <Navigate to="/vendedor" replace />;

  const onNameChange = (v: string) => {
    setStoreName(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!storeName.trim() || !slug.trim()) {
      setError('Preencha o nome da loja.');
      return;
    }
    if (isSlugTaken(slug)) {
      setError('Já existe uma loja com este endereço. Escolha outro nome.');
      return;
    }
    setBusy(true);
    try {
      await becomeSeller(storeName.trim(), slug.trim());
      navigate('/vendedor');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível abrir a loja.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar />
      <main className="px-5 md:px-10 py-16 flex justify-center">
        <div className="w-full max-w-lg">
          <Reveal>
            <p className="font-mono text-xs text-volt tracking-widest mb-3">VENDER NA ROMPER SHOP</p>
            <h1 className="font-display text-4xl md:text-5xl font-semibold text-balance">Abra sua loja em 1 minuto</h1>
            <p className="mt-4 text-fog">
              Cadastre produtos próprios ou importe de fornecedores dropship. Sem mensalidade —
              a Romper Shop fica com uma comissão só quando você vende.
            </p>
          </Reveal>

          {user?.role === 'admin' ? (
            <div className="mt-8 rounded-xl2 border border-line bg-surface p-6 text-center text-fog">
              Contas admin não abrem loja própria por aqui.
            </div>
          ) : (
            <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-fog">Nome da loja</span>
                <input className={inputCls} value={storeName} onChange={(e) => onNameChange(e.target.value)} placeholder="Ex.: Casa Nova Utilidades" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-fog">Endereço da loja</span>
                <div className="flex items-center gap-1 rounded-lg border border-line bg-ink px-3 py-2.5 focus-within:border-volt transition-colors">
                  <span className="text-sm text-fog">/loja/</span>
                  <input
                    className="flex-1 bg-transparent text-sm text-mist outline-none"
                    value={slug}
                    onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }}
                    placeholder="casa-nova-utilidades"
                  />
                </div>
              </label>

              {error && <p className="text-sm text-ember">{error}</p>}

              <button type="submit" disabled={busy}
                className="mt-2 rounded-full bg-volt px-7 py-3 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors disabled:opacity-60">
                {busy ? 'Abrindo…' : 'Abrir minha loja'}
              </button>
            </form>
          )}

          <Link to="/afiliado" className="mt-8 block text-center text-sm text-fog hover:text-volt transition-colors">
            Prefere indicar produtos sem gerenciar loja? Vire afiliado →
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
