-- ============================================
-- APLICADO EM 2026-08-02
-- Substitui 6 policies sobrepostas de movimentacoes_financeiras.
-- Antes: "Admins Total Financeiro" e "Admins total financeiro"
-- (duplicadas, diferindo só na capitalização) checavam o papel
-- sem correlacionar consultoria_id — um admin de uma consultoria
-- lia e escrevia o financeiro de outra.
-- Acesso restrito a admin/dono/super_admin da própria consultoria.
-- ============================================

drop policy if exists "Acesso por Consultoria" on public.movimentacoes_financeiras;
drop policy if exists "Admins Total Financeiro" on public.movimentacoes_financeiras;
drop policy if exists "Admins total financeiro" on public.movimentacoes_financeiras;
drop policy if exists "Deletar Movimentacoes" on public.movimentacoes_financeiras;
drop policy if exists "Inserir Movimentacoes" on public.movimentacoes_financeiras;
drop policy if exists "Ver Movimentacoes" on public.movimentacoes_financeiras;

create policy "movfin_select" on public.movimentacoes_financeiras
for select to authenticated using (
  (consultoria_id = public.minha_consultoria_id()
   and public.meu_role() in ('admin','dono','super_admin'))
  or public.is_super_admin()
);

create policy "movfin_insert" on public.movimentacoes_financeiras
for insert to authenticated
with check (
  consultoria_id = public.minha_consultoria_id()
  and public.meu_role() in ('admin','dono','super_admin')
);

create policy "movfin_update" on public.movimentacoes_financeiras
for update to authenticated
using (
  consultoria_id = public.minha_consultoria_id()
  and public.meu_role() in ('admin','dono','super_admin')
)
with check (consultoria_id = public.minha_consultoria_id());

create policy "movfin_delete" on public.movimentacoes_financeiras
for delete to authenticated
using (
  consultoria_id = public.minha_consultoria_id()
  and public.meu_role() in ('admin','dono','super_admin')
);


-- ============================================
-- ROLLBACK — não executar sem necessidade
-- ============================================

-- drop policy if exists "movfin_select" on public.movimentacoes_financeiras;
-- drop policy if exists "movfin_insert" on public.movimentacoes_financeiras;
-- drop policy if exists "movfin_update" on public.movimentacoes_financeiras;
-- drop policy if exists "movfin_delete" on public.movimentacoes_financeiras;
--
-- create policy "Acesso por Consultoria" on public.movimentacoes_financeiras
--   for all to public using (consultoria_id in (select consultoria_id from profiles where id = auth.uid()));
-- create policy "Admins Total Financeiro" on public.movimentacoes_financeiras
--   for all to public using (exists (select 1 from profiles where id = auth.uid() and role = any (array['admin','dono','super_admin'])));
-- create policy "Admins total financeiro" on public.movimentacoes_financeiras
--   for all to public using (exists (select 1 from profiles where id = auth.uid() and role = any (array['admin','dono','super_admin'])));
-- create policy "Deletar Movimentacoes" on public.movimentacoes_financeiras
--   for delete to public using (consultoria_id in (select consultoria_id from profiles where id = auth.uid()));
-- create policy "Inserir Movimentacoes" on public.movimentacoes_financeiras
--   for insert to public with check (consultoria_id in (select consultoria_id from profiles where id = auth.uid()));
-- create policy "Ver Movimentacoes" on public.movimentacoes_financeiras
--   for select to public using (consultoria_id in (select consultoria_id from profiles where id = auth.uid()));