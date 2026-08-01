-- ============================================
-- APLICADO EM 2026-08-01
-- Substitui a política única "Acesso Basico Consultorias",
-- que liberava ALL para qualquer usuário autenticado.
-- ============================================

drop policy if exists "Acesso Basico Consultorias" on public.consultorias;

create policy "consultorias_select"
on public.consultorias for select to authenticated
using (
  id in (select consultoria_id from public.profiles where id = auth.uid())
  or public.is_super_admin()
);

create policy "consultorias_insert"
on public.consultorias for insert to authenticated
with check (public.is_super_admin());

create policy "consultorias_update"
on public.consultorias for update to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());


-- ============================================
-- ROLLBACK — não executar sem necessidade
-- Descomente e rode apenas se algo quebrar.
-- ============================================

-- drop policy if exists "consultorias_select" on public.consultorias;
-- drop policy if exists "consultorias_insert" on public.consultorias;
-- drop policy if exists "consultorias_update" on public.consultorias;
-- create policy "Acesso Basico Consultorias" on public.consultorias
--   for all to public using (auth.role() = 'authenticated');