create or replace function public.resetar_senha_via_dono(user_id_alvo uuid, nova_senha text)
returns json
language plpgsql
security definer
set search_path to 'public', 'auth', 'extensions'
as $$
declare
  v_req_role text;
  v_req_consultoria uuid;
  v_alvo_role text;
  v_alvo_consultoria uuid;
begin
  if auth.uid() is null then
    return json_build_object('status','erro','msg','Usuário não autenticado.');
  end if;

  select role, consultoria_id into v_req_role, v_req_consultoria
  from public.profiles where id = auth.uid();

  if v_req_role is null or v_req_role not in ('admin','dono','super_admin') then
    return json_build_object('status','erro','msg','Sem permissão para esta operação.');
  end if;

  select role, consultoria_id into v_alvo_role, v_alvo_consultoria
  from public.profiles where id = user_id_alvo;

  if v_alvo_role is null then
    return json_build_object('status','erro','msg','Usuário não encontrado.');
  end if;

  if v_req_role <> 'super_admin' then
    if v_alvo_consultoria is distinct from v_req_consultoria then
      return json_build_object('status','erro','msg','Usuário pertence a outra consultoria.');
    end if;
    if v_alvo_role = 'super_admin' then
      return json_build_object('status','erro','msg','Operação não permitida.');
    end if;
  end if;

  if nova_senha is null or length(nova_senha) < 8 then
    return json_build_object('status','erro','msg','A senha deve ter no mínimo 8 caracteres.');
  end if;

  update auth.users
  set encrypted_password = extensions.crypt(nova_senha, extensions.gen_salt('bf')),
      updated_at = now()
  where id = user_id_alvo;

  return json_build_object('status','sucesso');
end;
$$;

revoke execute on function public.resetar_senha_via_dono(uuid, text) from public, anon;
grant execute on function public.resetar_senha_via_dono(uuid, text) to authenticated;