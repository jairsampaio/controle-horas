drop policy if exists "Atualizar servicos" on public.servicos_prestados;
drop policy if exists "Controle de Acesso Servicos" on public.servicos_prestados;
drop policy if exists "Deletar Servicos" on public.servicos_prestados;
drop policy if exists "Editar Servicos" on public.servicos_prestados;
drop policy if exists "Editar serviços da mesma consultoria" on public.servicos_prestados;
drop policy if exists "Edição restrita" on public.servicos_prestados;
drop policy if exists "Exclusão restrita" on public.servicos_prestados;
drop policy if exists "Inserir Servicos" on public.servicos_prestados;
drop policy if exists "Inserir servicos" on public.servicos_prestados;
drop policy if exists "Isolamento Serviços" on public.servicos_prestados;
drop policy if exists "Isolamento por Consultoria - Servicos" on public.servicos_prestados;
drop policy if exists "Regra de Visibilidade de Serviços" on public.servicos_prestados;
drop policy if exists "Todos podem apontar horas" on public.servicos_prestados;
drop policy if exists "Ver serviços da mesma consultoria" on public.servicos_prestados;
drop policy if exists "allow_authenticated_read" on public.servicos_prestados;
drop policy if exists "allow_owner_delete" on public.servicos_prestados;
drop policy if exists "allow_owner_insert" on public.servicos_prestados;
drop policy if exists "allow_owner_update" on public.servicos_prestados;

create or replace function public.meu_role()
returns text language sql stable security definer
set search_path to 'public'
as $$ select role from public.profiles where id = auth.uid() $$;

revoke execute on function public.meu_role() from public, anon;
grant execute on function public.meu_role() to authenticated;

create policy "servicos_select" on public.servicos_prestados
for select to authenticated using (
  user_id = auth.uid()
  or (consultoria_id = public.minha_consultoria_id()
      and public.meu_role() in ('gp','admin','dono','super_admin'))
  or public.is_super_admin()
);

create policy "servicos_insert" on public.servicos_prestados
for insert to authenticated
with check (user_id = auth.uid() and consultoria_id = public.minha_consultoria_id());

create policy "servicos_update" on public.servicos_prestados
for update to authenticated using (
  user_id = auth.uid()
  or (consultoria_id = public.minha_consultoria_id()
      and public.meu_role() in ('gp','admin','dono','super_admin'))
) with check (consultoria_id = public.minha_consultoria_id());

create policy "servicos_delete" on public.servicos_prestados
for delete to authenticated using (
  user_id = auth.uid()
  or (consultoria_id = public.minha_consultoria_id()
      and public.meu_role() in ('gp','admin','dono','super_admin'))
);

-- ============================================
-- APLICADO EM 2026-08-01
-- Substitui 18 policies sobrepostas por 4 coerentes.
-- Antes: policies PERMISSIVE se somavam com OR, permitindo
-- que admin de uma consultoria lesse e editasse dados de outra.
--
-- ROLLBACK: as 18 policies originais estão em
-- db/policies-2026-07-31.sql (seção servicos_prestados).
-- Para reverter: dropar as 4 abaixo e recriar as originais de lá.
-- ============================================