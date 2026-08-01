-- ============================================
-- APLICADO EM 2026-08-01
-- Substitui 9 policies sobrepostas de canais.
-- Antes: 3 policies ALL liberavam a consultoria inteira e
-- anulavam (por OR) as 4 restritas por user_id.
-- Leitura: toda a consultoria. Escrita: admin/dono/gp/super_admin.
-- ============================================

drop policy if exists "Criar Canais" on public.canais;
drop policy if exists "Gestão de Canais da Consultoria" on public.canais;
drop policy if exists "Isolamento Canais" on public.canais;
drop policy if exists "Isolamento de Canais por Consultoria" on public.canais;
drop policy if exists "Isolamento por Consultoria - Canais" on public.canais;
drop policy if exists "Usuários podem atualizar seus canais" on public.canais;
drop policy if exists "Usuários podem criar canais" on public.canais;
drop policy if exists "Usuários podem deletar seus canais" on public.canais;
drop policy if exists "Usuários podem ver seus próprios canais" on public.canais;

create policy "canais_select" on public.canais
for select to authenticated using (
  consultoria_id = public.minha_consultoria_id()
  or public.is_super_admin()
);

create policy "canais_insert" on public.canais
for insert to authenticated
with check (
  consultoria_id = public.minha_consultoria_id()
  and public.meu_role() in ('gp','admin','dono','super_admin')
);

create policy "canais_update" on public.canais
for update to authenticated
using (
  consultoria_id = public.minha_consultoria_id()
  and public.meu_role() in ('gp','admin','dono','super_admin')
)
with check (consultoria_id = public.minha_consultoria_id());


-- ============================================
-- ROLLBACK — não executar sem necessidade
-- ============================================

-- drop policy if exists "canais_select" on public.canais;
-- drop policy if exists "canais_insert" on public.canais;
-- drop policy if exists "canais_update" on public.canais;
--
-- create policy "Criar Canais" on public.canais
--   for insert to public with check (auth.uid() = user_id);
-- create policy "Gestão de Canais da Consultoria" on public.canais
--   for all to public using (consultoria_id in (select consultoria_id from profiles where id = auth.uid()));
-- create policy "Isolamento Canais" on public.canais
--   for all to public using ((tenant_id = get_my_tenant_id()) or is_super_admin());
-- create policy "Isolamento de Canais por Consultoria" on public.canais
--   for select to public using (consultoria_id in (select consultoria_id from profiles where id = auth.uid()));
-- create policy "Isolamento por Consultoria - Canais" on public.canais
--   for all to public using (consultoria_id in (select consultoria_id from profiles where id = auth.uid()));
-- create policy "Usuários podem atualizar seus canais" on public.canais
--   for update to public using (auth.uid() = user_id);
-- create policy "Usuários podem criar canais" on public.canais
--   for insert to public with check (auth.uid() = user_id);
-- create policy "Usuários podem deletar seus canais" on public.canais
--   for delete to public using (auth.uid() = user_id);
-- create policy "Usuários podem ver seus próprios canais" on public.canais
--   for select to public using (auth.uid() = user_id);