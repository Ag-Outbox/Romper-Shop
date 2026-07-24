import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import DashboardShell from '../components/DashboardShell';
import Stat from '../components/Stat';
import Reveal from '../components/Reveal';
import { useAuth } from '../lib/auth';
import { usePageMeta } from '../lib/usePageMeta';
import { becomeAffiliate, getAffiliateByProfile, listCommissions, withdrawAffiliateBalance } from '../lib/affiliates';
import { listPayouts, requestAffiliatePayout } from '../lib/payouts';
import { formatBRL } from '../lib/format';

/* ---------------------------------------------------------------------------
   ROMPER SHOP — Programa de afiliados (/afiliado)
   Aditivo: qualquer pessoa logada (comprador, vendedor...) pode virar
   afiliada sem trocar de papel. Gera um código único, compartilha o link da
   home ou de um produto específico (?ref=codigo) e ganha comissão quando a
   compra referenciada é entregue.
--------------------------------------------------------------------------- */

export default function Affiliate() {
  usePageMeta('Programa de afiliados');
  const { user } = useAuth();
  const [affiliate, setAffiliate] = useState(() => (user ? getAffiliateByProfile(user.id) : undefined));
  const [copied, setCopied] = useState(false);
  const [payouts, setPayouts] = useState(() => (affiliate ? listPayouts('affiliate', affiliate.id) : []));
  const [payoutNote, setPayoutNote] = useState<string | null>(null);

  const join = () => {
    if (!user) return;
    setAffiliate(becomeAffiliate(user.id, user.fullName));
  };

  const withdraw = () => {
    if (!affiliate || affiliate.balanceCents <= 0) return;
    requestAffiliatePayout(affiliate.id, affiliate.balanceCents);
    withdrawAffiliateBalance(affiliate.id, affiliate.balanceCents);
    const refreshed = getAffiliateByProfile(user!.id);
    setAffiliate(refreshed);
    setPayouts(listPayouts('affiliate', affiliate.id));
    setPayoutNote(`Saque de ${formatBRL(affiliate.balanceCents)} solicitado.`);
    window.setTimeout(() => setPayoutNote(null), 3000);
  };

  const link = affiliate ? `${window.location.origin}/?ref=${affiliate.code}` : '';
  const shareText = affiliate
    ? `Achei essa loja e achei que você ia curtir 👀 tem de tudo e dá pra pagar na entrega: ${link}`
    : '';

  const [qrDataUrl, setQrDataUrl] = useState('');
  useEffect(() => {
    if (!link) return;
    QRCode.toDataURL(link, { margin: 1, width: 220, color: { dark: '#1A1A1A', light: '#FFFFFF' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [link]);

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const [textCopied, setTextCopied] = useState(false);
  const copyText = async () => {
    await navigator.clipboard.writeText(shareText);
    setTextCopied(true);
    window.setTimeout(() => setTextCopied(false), 2000);
  };

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Romper Shop', text: shareText, url: link }); } catch { /* cancelado */ }
    } else {
      await copyText();
    }
  };

  if (!affiliate) {
    return (
      <>
        <DashboardShell title="Programa de afiliados" subtitle="Indique produtos e ganhe comissão, sem gerenciar loja">
          <div className="max-w-xl rounded-xl2 border border-line bg-surface p-8">
            <p className="font-mono text-xs text-volt tracking-widest mb-3">COMO FUNCIONA</p>
            <ul className="space-y-3 text-sm text-fog">
              <li>1. Você ganha um link único (da home ou de qualquer produto).</li>
              <li>2. Compartilha com quem quiser — redes sociais, WhatsApp, onde for.</li>
              <li>3. Quem compra pelo seu link em até 30 dias gera comissão pra você.</li>
              <li>4. A comissão é confirmada quando o pedido é entregue.</li>
            </ul>
            <button onClick={join} className="mt-6 rounded-full bg-volt px-7 py-3 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors">
              Quero ser afiliado
            </button>
          </div>
        </DashboardShell>
      </>
    );
  }

  const commissions = listCommissions(affiliate.id);

  return (
    <DashboardShell title="Programa de afiliados" subtitle={`Código ${affiliate.code} · comissão de ${affiliate.commissionPercent}% por venda`}>
      <Reveal>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="CLIQUES" value={affiliate.clicks} />
          <Stat label="COMISSÃO PENDENTE" value={formatBRL(affiliate.pendingCents)} hint="pedidos ainda não entregues" />
          <Stat label="COMISSÃO CONFIRMADA" value={formatBRL(affiliate.balanceCents)} hint="disponível para saque" />
          <Stat label="COMISSÃO" value={`${affiliate.commissionPercent}%`} hint="sobre o subtotal indicado" />
        </div>
      </Reveal>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={withdraw}
          disabled={affiliate.balanceCents <= 0}
          className="rounded-full border border-line px-5 py-2 text-sm hover:border-volt hover:text-volt transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Sacar comissão confirmada
        </button>
        {payoutNote && <span className="font-mono text-xs text-volt">{payoutNote}</span>}
      </div>

      {payouts.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          {payouts.slice(0, 3).map((p) => (
            <div key={p.id} className="flex items-center justify-between text-xs text-fog">
              <span>Saque solicitado em {new Date(p.requestedAt).toLocaleDateString('pt-BR')}</span>
              <span className="font-mono tabular-nums">{formatBRL(p.amountCents)} · {p.status === 'paid' ? 'pago' : 'pendente'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Kit de divulgação */}
      <section className="mt-10 grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="rounded-xl2 border border-line bg-surface p-6">
          <p className="font-mono text-xs text-fog tracking-widest mb-3">SEU LINK DE INDICAÇÃO</p>
          <div className="flex min-w-0 flex-col sm:flex-row gap-3">
            <input readOnly value={link} className="min-w-0 flex-1 rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-mist" />
            <button onClick={copy} className="shrink-0 rounded-full bg-volt px-6 py-2.5 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors">
              {copied ? 'Copiado!' : 'Copiar link'}
            </button>
          </div>

          <p className="mt-6 font-mono text-xs text-fog tracking-widest mb-3">TEXTO PRONTO PRA COMPARTILHAR</p>
          <p className="rounded-lg border border-line bg-ink/5 p-4 text-sm text-fog leading-relaxed">{shareText}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button onClick={share} className="rounded-full bg-volt px-6 py-2.5 text-sm font-semibold text-ink hover:bg-volt-dim transition-colors">
              Compartilhar
            </button>
            <button onClick={copyText} className="rounded-full border border-line px-6 py-2.5 text-sm hover:border-volt hover:text-volt transition-colors">
              {textCopied ? 'Texto copiado!' : 'Copiar texto'}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-line px-6 py-2.5 text-sm hover:border-volt hover:text-volt transition-colors"
            >
              WhatsApp
            </a>
          </div>
          <p className="mt-3 text-xs text-fog">
            Também dá pra indicar um produto específico: abra a página do produto e use o botão
            "Copiar link de afiliado" lá.
          </p>
        </div>

        {qrDataUrl && (
          <div className="rounded-xl2 border border-line bg-surface p-6 text-center">
            <p className="font-mono text-xs text-fog tracking-widest mb-3">QR CODE</p>
            <img src={qrDataUrl} alt={`QR code do seu link de afiliado (${affiliate.code})`} className="mx-auto rounded-lg border border-line" width={180} height={180} />
            <a
              href={qrDataUrl}
              download={`romper-afiliado-${affiliate.code}.png`}
              className="mt-3 inline-block text-xs text-fog hover:text-volt transition-colors"
            >
              baixar PNG ↓
            </a>
          </div>
        )}
      </section>

      {/* Funil */}
      <section className="mt-8 rounded-xl2 border border-line bg-surface p-6">
        <p className="font-mono text-xs text-fog tracking-widest mb-4">SEU FUNIL</p>
        {(() => {
          const orders = new Set(commissions.map((c) => c.orderId)).size;
          const conv = affiliate.clicks > 0 ? (orders / affiliate.clicks) * 100 : 0;
          const earned = affiliate.pendingCents + affiliate.balanceCents;
          const steps = [
            { label: 'Cliques no link', value: affiliate.clicks.toLocaleString('pt-BR'), pct: 100 },
            { label: 'Pedidos indicados', value: orders.toLocaleString('pt-BR'), pct: affiliate.clicks > 0 ? Math.max(4, conv) : 0 },
            { label: 'Comissão gerada', value: formatBRL(earned), pct: earned > 0 ? Math.max(4, conv) : 0 },
          ];
          return (
            <>
              <div className="flex flex-col gap-3">
                {steps.map((s) => (
                  <div key={s.label} className="flex items-center gap-4">
                    <span className="w-36 shrink-0 text-sm text-fog">{s.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded bg-line">
                      <div className="h-full rounded bg-volt transition-all" style={{ width: `${s.pct}%` }} />
                    </div>
                    <span className="w-24 shrink-0 text-right font-display tabular-nums">{s.value}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-fog">
                Conversão: <b className="text-mist">{conv.toFixed(1)}%</b> dos cliques viraram pedido.
                {affiliate.clicks === 0 && ' Compartilhe seu link para começar a medir.'}
              </p>
            </>
          );
        })()}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl font-semibold mb-5">Comissões</h2>
        {commissions.length === 0 ? (
          <div className="rounded-xl2 border border-line bg-surface p-8 text-center text-fog text-sm">
            Nenhuma comissão ainda. Compartilhe seu link para começar a indicar produtos.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {commissions.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl2 border border-line bg-surface p-4">
                <div>
                  <Link to={`/pedido/${c.orderId}`} className="font-mono text-sm text-mist hover:text-volt transition-colors">{c.orderId}</Link>
                  <p className="text-xs text-fog">{c.sellerName} · {new Date(c.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 font-mono text-xs ${c.status === 'confirmed' ? 'bg-volt/15 text-volt' : 'border border-line text-fog'}`}>
                    {c.status === 'confirmed' ? 'confirmada' : 'pendente'}
                  </span>
                  <span className="font-display text-lg tabular-nums">{formatBRL(c.amountCents)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
