import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getStoreProfile, saveStoreProfile, BANNER_COLORS } from '../lib/storeProfile';

/* Painel do vendedor: edição do perfil público da loja (/loja/:slug). */

const inputCls =
  'rounded-lg border border-line bg-ink px-3 py-2 text-sm text-mist outline-none placeholder:text-fog/60 focus:border-volt transition-colors';

export default function SellerProfileEditor({ storeSlug }: { storeSlug: string }) {
  const existing = getStoreProfile(storeSlug);
  const [open, setOpen] = useState(false);
  const [tagline, setTagline] = useState(existing?.tagline ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [bannerColor, setBannerColor] = useState(existing?.bannerColor ?? 'volt');
  const [shippingDays, setShippingDays] = useState(String(existing?.shippingDays ?? 2));
  const [freeOver, setFreeOver] = useState(existing?.freeShippingOverCents ? String(existing.freeShippingOverCents / 100) : '');
  const [returnsPolicy, setReturnsPolicy] = useState(existing?.returnsPolicy ?? 'Troca grátis em até 7 dias após o recebimento.');
  const [saved, setSaved] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoreProfile({
      storeSlug,
      tagline: tagline.trim(),
      description: description.trim(),
      bannerColor,
      shippingDays: Math.max(1, parseInt(shippingDays, 10) || 2),
      freeShippingOverCents: freeOver ? Math.round(parseFloat(freeOver.replace(',', '.')) * 100) : undefined,
      returnsPolicy: returnsPolicy.trim(),
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl font-semibold">Perfil da loja</h2>
        <button onClick={() => setOpen((s) => !s)} className="rounded-full border border-line px-5 py-2 text-sm hover:border-volt hover:text-volt transition-colors">
          {open ? 'Fechar' : existing ? 'Editar' : 'Personalizar'}
        </button>
        <Link to={`/loja/${storeSlug}`} className="text-sm text-fog hover:text-volt transition-colors">
          ver página pública →
        </Link>
        {saved && <span className="font-mono text-xs text-volt">Perfil salvo!</span>}
      </div>
      <p className="mt-1 text-sm text-fog">O que você escreve aqui aparece na sua página pública.</p>

      {open && (
        <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-3 rounded-xl2 border border-line bg-surface p-5 sm:grid-cols-2">
          <label className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs text-fog">Frase da loja (tagline)</span>
            <input className={inputCls} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Utilidades que resolvem sua casa" maxLength={80} />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs text-fog">Sobre a loja</span>
            <textarea className={`${inputCls} resize-none`} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Conte a história e o diferencial da sua loja…" maxLength={400} />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs text-fog">Cor do cabeçalho</span>
            <div className="flex gap-2">
              {BANNER_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setBannerColor(c.id)}
                  aria-label={c.label}
                  aria-pressed={bannerColor === c.id}
                  className={`h-9 w-9 rounded-full border-2 ${c.cls} ${bannerColor === c.id ? 'border-volt' : 'border-line'}`}
                />
              ))}
            </div>
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs text-fog">Postagem em (dias úteis)</span>
            <input className={inputCls} value={shippingDays} onChange={(e) => setShippingDays(e.target.value)} inputMode="numeric" placeholder="2" />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs text-fog">Frete grátis acima de (R$, opcional)</span>
            <input className={inputCls} value={freeOver} onChange={(e) => setFreeOver(e.target.value)} inputMode="decimal" placeholder="199,00" />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs text-fog">Política de troca</span>
            <input className={inputCls} value={returnsPolicy} onChange={(e) => setReturnsPolicy(e.target.value)} maxLength={140} />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-full bg-volt px-6 py-2.5 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors">
              Salvar perfil
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
