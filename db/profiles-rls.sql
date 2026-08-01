drop policy if exists "Perfis visiveis para todos autenticados" on public.profiles;
drop policy if exists "Permitir leitura de perfis" on public.profiles;

create policy "profiles_select"
on public.profiles for select to authenticated
using (
  id = auth.uid()
  or consultoria_id in (select p.consultoria_id from public.profiles p where p.id = auth.uid())
  or public.is_super_admin()
);

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
-- ROLLBACK — não executar sem necessidade
-- drop policy if exists "profiles_select" on public.profiles;
-- create policy "Perfis visiveis para todos autenticados" on public.profiles
--   for select to authenticated using (true);