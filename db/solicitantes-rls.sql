-- ============================================
-- APLICADO EM 2026-08-01
-- Substitui 6 policies sobrepostas de solicitantes.
-- Antes: "Ver Solicitantes da Consultoria" (ALL) e "Isolamento
-- Solicitantes" liberavam amplamente, anulando por OR as 4
-- policies restritas a user_id.
-- Leitura: toda a consultoria. Escrita: admin/dono/gp/super_admin.
-- Atenção: handleEnviarEmail depende da leitura desta tabela.
-- ============================================

drop policy if exists "Isolamento Solicitantes" on public.solicitantes;
drop policy if exists "Usuários criam seus solicitantes" on public.solicitantes;
drop policy if exists "Usuários deletam seus solicitantes" on public.solicitantes;
drop policy if exists "Usuários editam seus solicitantes" on public.solicitantes;
drop policy if exists "Usuários veem seus próprios solicitantes" on public.solicitantes;
drop policy if exists "Ver Solicitantes da Consultoria" on public.solicitantes;

create policy "solicitantes_select" on public.solicitantes
for select to authenticated using (
  consultoria_id = public.minha_consultoria_id()
  or public.is_super_admin()
);

create policy "solicitantes_insert" on public.solicitantes
for insert to authenticated
with check (
  consultoria_id = public.minha_consultoria_id()
  and public.meu_role() in ('gp','admin','dono','super_admin')
);

create policy "solicitantes_update" on public.solicitantes
for update to authenticated
using (
  consultoria_id = public.minha_consultoria_id()
  and public.meu_role() in ('gp','admin','dono','super_admin')
)
with check (consultoria_id = public.minha_consultoria_id());


-- ============================================
-- ROLLBACK — não executar sem necessidade
-- ============================================

-- drop policy if exists "solicitantes_select" on public.solicitantes;
-- drop policy if exists "solicitantes_insert" on public.solicitantes;
-- drop policy if exists "solicitantes_update" on public.solicitantes;
--
-- create policy "Isolamento Solicitantes" on public.solicitantes
--   for all to public using ((tenant_id = get_my_tenant_id()) or is_super_admin());
-- create policy "Usuários criam seus solicitantes" on public.solicitantes
--   for insert to public with check (auth.uid() = user_id);
-- create policy "Usuários deletam seus solicitantes" on public.solicitantes
--   for delete to public using (auth.uid() = user_id);
-- create policy "Usuários editam seus solicitantes" on public.solicitantes
--   for update to public using (auth.uid() = user_id);
-- create policy "Usuários veem seus próprios solicitantes" on public.solicitantes
--   for select to public using (auth.uid() = user_id);
-- create policy "Ver Solicitantes da Consultoria" on public.solicitantes
--   for all to public using (consultoria_id in (select consultoria_id from profiles where id = auth.uid()));