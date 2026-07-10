-- =============================================================================
-- Migration 0007: payouts também para afiliados
-- =============================================================================
-- `payouts` (migration 0003) só previa seller_id. Afiliados também acumulam
-- saldo (affiliates.balance_cents, migration 0006) e precisam sacar. Em vez
-- de duplicar a tabela, torna seller_id opcional e adiciona affiliate_id —
-- exatamente 1 dos dois deve estar preenchido por registro.
-- =============================================================================

alter table public.payouts alter column seller_id drop not null;
alter table public.payouts add column affiliate_id uuid references public.affiliates(id) on delete cascade;

alter table public.payouts add constraint payouts_owner_check
  check ((seller_id is not null) <> (affiliate_id is not null));

create index idx_payouts_affiliate on public.payouts(affiliate_id);

-- RLS: afiliado só vê/cria os próprios saques (política de seller já existia em 0005).
create policy "payouts: affiliate owner" on public.payouts for all
  using (
    affiliate_id is not null
    and exists (select 1 from public.affiliates a where a.id = affiliate_id and a.profile_id = auth.uid())
  );

comment on table public.payouts is
  'Saques de vendedores OU afiliados — exatamente um de seller_id/affiliate_id preenchido (payouts_owner_check).';
