-- ============================================
-- APLICADO EM 2026-08-01
-- Substitui 7 policies sobrepostas de clientes.
-- Antes: 3 policies ALL liberavam a consultoria inteira,
-- e 4 allow_owner_* por user_id eram anuladas por elas (OR).
-- Leitura: toda a consultoria. Escrita: admin/dono/gp/super_admin.
-- ============================================

drop policy if exists "Isolamento Clientes" on public.clientes;
drop policy if exists "Isolamento por Consultoria - Clientes" on public.clientes;
drop policy if exists "Ver clientes da mesma consultoria" on public.clientes;
drop policy if exists "allow_authenticated_read" on public.clientes;
drop policy if exists "allow_owner_delete" on public.clientes;
drop policy if exists "allow_owner_insert" on public.clientes;
drop policy if exists "allow_owner_update" on public.clientes;

create policy "clientes_select" on public.clientes
for select to authenticated using (
  consultoria_id = public.minha_consultoria_id()
  or public.is_super_admin()
);

create policy "clientes_insert" on public.clientes
for insert to authenticated
with check (
  consultoria_id = public.minha_consultoria_id()
  and public.meu_role() in ('gp','admin','dono','super_admin')
);

create policy "clientes_update" on public.clientes
for update to authenticated
using (
  consultoria_id = public.minha_consultoria_id()
  and public.meu_role() in ('gp','admin','dono','super_admin')
)
with check (consultoria_id = public.minha_consultoria_id());


-- ============================================
-- ROLLBACK — não executar sem necessidade
-- ============================================

-- drop policy if exists "clientes_select" on public.clientes;
-- drop policy if exists "clientes_insert" on public.clientes;
-- drop policy if exists "clientes_update" on public.clientes;
--
-- create policy "Isolamento Clientes" on public.clientes
--   for all to public using ((tenant_id = get_my_tenant_id()) or is_super_admin());
-- create policy "Isolamento por Consultoria - Clientes" on public.clientes
--   for all to public using (consultoria_id in (select consultoria_id from profiles where id = auth.uid()));
-- create policy "Ver clientes da mesma consultoria" on public.clientes
--   for all to public using (consultoria_id in (select consultoria_id from profiles where id = auth.uid()));
-- create policy "allow_authenticated_read" on public.clientes
--   for select to authenticated using (auth.uid() = user_id);
-- create policy "allow_owner_delete" on public.clientes
--   for delete to authenticated using (auth.uid() = user_id);
-- create policy "allow_owner_insert" on public.clientes
--   for insert to authenticated with check (auth.uid() = user_id);
-- create policy "allow_owner_update" on public.clientes
--   for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);