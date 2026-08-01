-- ============================================
-- APLICADO EM 2026-08-01
-- Restringe leitura de profiles à própria consultoria.
-- Antes: SELECT liberado a qualquer autenticado (using true),
-- expondo valor_hora e dados bancários de todas as consultorias.
--
-- A função abaixo é SECURITY DEFINER para evitar recursão:
-- consultar profiles dentro de uma política sobre profiles
-- reentra na RLS e trava a aplicação.
-- ============================================

create or replace function public.minha_consultoria_id()
returns uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select consultoria_id from public.profiles where id = auth.uid();
$$;

revoke execute on function public.minha_consultoria_id() from public, anon;
grant execute on function public.minha_consultoria_id() to authenticated;

drop policy if exists "Perfis visiveis para todos autenticados" on public.profiles;
drop policy if exists "Permitir leitura de perfis" on public.profiles;

create policy "profiles_select"
on public.profiles for select to authenticated
using (
  id = auth.uid()
  or consultoria_id = public.minha_consultoria_id()
  or public.is_super_admin()
);


-- ============================================
-- ROLLBACK — não executar sem necessidade
-- ============================================

-- drop policy if exists "profiles_select" on public.profiles;
-- create policy "Perfis visiveis para todos autenticados" on public.profiles
--   for select to authenticated using (true);