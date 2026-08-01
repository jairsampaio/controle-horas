ddl
"CREATE OR REPLACE FUNCTION public.atualizar_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$function$
;"
"CREATE OR REPLACE FUNCTION public.auto_assign_tenant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Só preenche se o front-end não enviou (ou se for null)
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.get_my_tenant_id();
  END IF;
  RETURN NEW;
END;
$function$
;"
"CREATE OR REPLACE FUNCTION public.auto_preencher_consultoria_solicitante()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Se o consultoria_id vier vazio, busca no perfil do usuário
  IF NEW.consultoria_id IS NULL THEN
    SELECT consultoria_id INTO NEW.consultoria_id
    FROM profiles
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$function$
;"
"CREATE OR REPLACE FUNCTION public.cadastrar_admin_consultoria(email_admin text, id_consultoria uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  novo_id_usuario uuid;
begin
  -- Verifica se o usuário já existe
  if exists (select 1 from auth.users where email = email_admin) then
      raise exception 'Este e-mail já está cadastrado no sistema.';
  end if;

  -- A. Cria o usuário no Auth (Com senha padrão: Mudar@123)
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    email_admin,
    crypt('Mudar@123', gen_salt('bf')), -- Senha Provisória
    now(), -- Confirma o email automaticamente
    '{""provider"":""email"",""providers"":[""email""]}',
    jsonb_build_object('nome', 'Admin Inicial'),
    now(),
    now(),
    ''
  ) returning id into novo_id_usuario;

  -- B. Vincula na tabela Profiles (Com segurança contra conflito do Trigger)
  insert into public.profiles (id, email, consultoria_id, cargo, nome)
  values (novo_id_usuario, email_admin, id_consultoria, 'admin', 'Admin Inicial')
  on conflict (id) do update
  set consultoria_id = excluded.consultoria_id,
      cargo = 'admin';

end;
$function$
;"
"CREATE OR REPLACE FUNCTION public.check_plan_limits()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    limit_users INT;
    current_count INT;
    plano_atual TEXT;
BEGIN
    -- Descobre qual o plano da empresa
    SELECT plano INTO plano_atual FROM public.tenants WHERE id = NEW.tenant_id;
    
    -- Busca o limite na tabela de planos (que criamos no passo anterior)
    SELECT limite_usuarios INTO limit_users 
    FROM public.saas_planos 
    WHERE nome ILIKE plano_atual;

    -- Se não achar plano, define um padrão baixo (segurança)
    IF limit_users IS NULL THEN limit_users := 1; END IF;

    -- Conta quantos usuários JÁ EXISTEM + convites PENDENTES
    SELECT (
        (SELECT COUNT(*) FROM public.profiles WHERE tenant_id = NEW.tenant_id) +
        (SELECT COUNT(*) FROM public.saas_convites WHERE tenant_id = NEW.tenant_id AND status = 'pendente')
    ) INTO current_count;

    -- O 'owner' (dono) já conta como 1, então o trigger deve considerar isso.
    -- Se a contagem atual for igual ou maior que o limite, Bloqueia.
    IF current_count >= limit_users THEN
        RAISE EXCEPTION 'Limite de usuários do plano % atingido (% usuários). Faça upgrade.', plano_atual, limit_users;
    END IF;

    RETURN NEW;
END;
$function$
;"
"CREATE OR REPLACE FUNCTION public.criar_funcionario(email_func text, senha_func text, nome_func text, cargo_func text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
    v_admin_id uuid;
    v_consultoria_id uuid;
    v_new_user_id uuid;
    v_check_email uuid;
BEGIN
    -- 0. Verifica se o email REALMENTE já existe no Auth (pra não dar erro falso)
    SELECT id INTO v_check_email FROM auth.users WHERE email = email_func;
    IF v_check_email IS NOT NULL THEN
        RETURN json_build_object('status', 'erro', 'msg', 'Este e-mail realmente já existe.');
    END IF;

    -- 1. Identifica quem está pedindo (o Dono logado)
    v_admin_id := auth.uid();
    
    -- 2. Descobre qual a consultoria desse Dono
    SELECT consultoria_id INTO v_consultoria_id
    FROM public.profiles
    WHERE id = v_admin_id;

    IF v_consultoria_id IS NULL THEN
        RETURN json_build_object('status', 'erro', 'msg', 'Erro: Consultoria não encontrada para este usuário.');
    END IF;

    -- 3. Cria o Usuário no Auth (Login)
    v_new_user_id := gen_random_uuid();

    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_new_user_id, 'authenticated', 'authenticated',
        email_func,
        crypt(senha_func, gen_salt('bf')),
        NOW(),
        '{""provider"":""email"",""providers"":[""email""]}',
        json_build_object('nome_completo', nome_func),
        NOW(), NOW()
    );

    -- 4. Cria ou Atualiza o Perfil (A CORREÇÃO ESTÁ AQUI)
    -- Se o gatilho criar primeiro, a gente só atualiza os dados corretos
    INSERT INTO public.profiles (id, email, nome, cargo, consultoria_id)
    VALUES (v_new_user_id, email_func, nome_func, cargo_func, v_consultoria_id)
    ON CONFLICT (id) DO UPDATE 
    SET 
        consultoria_id = v_consultoria_id,
        nome = nome_func,
        cargo = cargo_func,
        email = email_func;

    RETURN json_build_object('status', 'sucesso', 'msg', 'Funcionário criado com sucesso!');

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('status', 'erro', 'msg', SQLERRM);
END;
$function$
;"
"CREATE OR REPLACE FUNCTION public.criar_funcionario(email_func text, senha_func text, nome_func text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
    v_consultoria_id uuid;
    v_user_id uuid;
BEGIN
    -- Pega a consultoria de quem está chamando (O Admin)
    SELECT consultoria_id INTO v_consultoria_id
    FROM public.profiles WHERE id = auth.uid();

    IF v_consultoria_id IS NULL THEN
        RETURN json_build_object('status', 'erro', 'msg', 'Sem permissão.');
    END IF;

    -- Cria o usuário
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_user_id, 'authenticated', 'authenticated',
        email_func,
        crypt(senha_func, gen_salt('bf')),
        NOW(),
        '{""provider"":""email"",""providers"":[""email""]}',
        json_build_object('nome_completo', nome_func),
        NOW(), NOW()
    );

    -- Cria o perfil
    INSERT INTO public.profiles (id, email, nome, cargo, consultoria_id)
    VALUES (v_user_id, email_func, nome_func, 'colaborador', v_consultoria_id);

    RETURN json_build_object('status', 'sucesso');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('status', 'erro', 'msg', SQLERRM);
END;
$function$
;"
"CREATE OR REPLACE FUNCTION public.criar_nova_assinatura(nome_empresa text, email_dono text, senha_dono text, nome_dono text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
    v_consultoria_id uuid;
    v_user_id uuid;
BEGIN
    -- 1. Cria a Consultoria
    INSERT INTO public.consultorias (nome, status, plano, cnpj)
    VALUES (nome_empresa, 'ativa', 'pro', '00000000000')
    RETURNING id INTO v_consultoria_id;

    -- 2. Cria o Usuário Admin (Dono)
    v_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_user_id, 'authenticated', 'authenticated',
        email_dono,
        crypt(senha_dono, gen_salt('bf')),
        NOW(),
        '{""provider"":""email"",""providers"":[""email""]}',
        json_build_object('nome_completo', nome_dono),
        NOW(), NOW()
    );

    -- 3. Cria (ou Atualiza) o Perfil Admin vinculado à Consultoria
    -- A MÁGICA ESTÁ AQUI: ON CONFLICT
    INSERT INTO public.profiles (id, email, nome, cargo, consultoria_id)
    VALUES (v_user_id, email_dono, nome_dono, 'admin', v_consultoria_id)
    ON CONFLICT (id) DO UPDATE 
    SET 
        consultoria_id = EXCLUDED.consultoria_id,
        cargo = 'admin',
        nome = EXCLUDED.nome,
        email = EXCLUDED.email;

    RETURN json_build_object('status', 'sucesso', 'msg', 'Consultoria criada!');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('status', 'erro', 'msg', SQLERRM);
END;
$function$
;"
"CREATE OR REPLACE FUNCTION public.criar_nova_consultoria(nome_admin text, email_admin text, nome_consultoria text, senha_admin text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_consultoria_id uuid;
    v_user_id uuid;
    v_retorno json;
BEGIN
    -- 1. Criar a Consultoria na tabela nova
    INSERT INTO public.consultorias (nome, status, plano, cnpj)
    VALUES (nome_consultoria, 'ativa', 'free', '00000000000000')
    RETURNING id INTO v_consultoria_id;

    -- 2. Criar o Usuário no Sistema de Autenticação (Auth)
    v_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_user_id,
        'authenticated',
        'authenticated',
        email_admin,
        crypt(senha_admin, gen_salt('bf')), -- Criptografa a senha corretamente
        NOW(), -- Já nasce confirmado
        '{""provider"":""email"",""providers"":[""email""]}',
        json_build_object('nome', nome_admin),
        NOW(), NOW()
    );

    -- 3. Criar o Perfil Vinculado
    INSERT INTO public.profiles (id, email, nome, cargo, consultoria_id)
    VALUES (v_user_id, email_admin, nome_admin, 'admin', v_consultoria_id);

    -- Retorna sucesso
    SELECT json_build_object(
        'status', 'sucesso',
        'consultoria_id', v_consultoria_id,
        'user_id', v_user_id
    ) INTO v_retorno;

    RETURN v_retorno;

EXCEPTION WHEN OTHERS THEN
    -- Se der erro, retorna o motivo para o front-end ver
    RETURN json_build_object('status', 'erro', 'mensagem', SQLERRM);
END;
$function$
;"
"CREATE OR REPLACE FUNCTION public.get_admin_stats()
 RETURNS TABLE(email character varying, last_sign_in_at timestamp with time zone, total_clientes bigint, total_servicos bigint, total_horas numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- 🔒 TRAVA DE SEGURANÇA: Só o Jair pode rodar isso
  IF auth.jwt() ->> 'email' <> 'contatosampaiojair@gmail.com' THEN
    RAISE EXCEPTION 'Acesso negado. Sai pra lá, curioso!';
  END IF;

  RETURN QUERY
  SELECT 
    au.email::varchar,
    au.last_sign_in_at,
    (SELECT count(*) FROM public.clientes c WHERE c.user_id = au.id) as total_clientes,
    (SELECT count(*) FROM public.servicos_prestados s WHERE s.user_id = au.id) as total_servicos,
    (SELECT COALESCE(sum(s.qtd_horas), 0) FROM public.servicos_prestados s WHERE s.user_id = au.id) as total_horas
  FROM auth.users au
  ORDER BY au.last_sign_in_at DESC;
END;
$function$
;"
"CREATE OR REPLACE FUNCTION public.get_erp_metrics()
 RETURNS TABLE(id uuid, nome_empresa text, plano text, status_financeiro text, data_vencimento date, total_usuarios bigint, total_clientes_cadastrados bigint, ultimo_acesso timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Segurança: Só você pode rodar isso
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Acesso negado: Apenas o CEO pode ver métricas financeiras.';
  END IF;

  RETURN QUERY
  SELECT 
    t.id,
    t.nome_empresa,
    t.plano,
    t.status_financeiro,
    t.data_vencimento,
    (SELECT count(*) FROM public.profiles p WHERE p.tenant_id = t.id) as total_usuarios,
    (SELECT count(*) FROM public.clientes c WHERE c.tenant_id = t.id) as total_clientes_cadastrados,
    (SELECT max(last_sign_in_at) FROM auth.users u JOIN public.profiles p ON u.id = p.id WHERE p.tenant_id = t.id) as ultimo_acesso
  FROM public.tenants t
  ORDER BY t.created_at DESC;
END;
$function$
;"
"CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN (
    SELECT tenant_id 
    FROM public.profiles 
    WHERE id = auth.uid() 
    LIMIT 1
  );
END;
$function$
;"
"CREATE OR REPLACE FUNCTION public.get_saas_finance_metrics()
 RETURNS TABLE(total_recebido numeric, total_pendente numeric, total_vencido numeric, faturas_mes_atual bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Segurança: Só Super Admin pode ver
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  RETURN QUERY
  SELECT 
    -- Soma do que já foi pago (status = 'pago')
    COALESCE(SUM(valor) FILTER (WHERE status = 'pago'), 0) as total_recebido,
    
    -- Soma do que está pendente (futuro)
    COALESCE(SUM(valor) FILTER (WHERE status = 'pendente' AND data_vencimento >= CURRENT_DATE), 0) as total_pendente,
    
    -- Soma do que está atrasado (pendente e data passada)
    COALESCE(SUM(valor) FILTER (WHERE status = 'pendente' AND data_vencimento < CURRENT_DATE), 0) as total_vencido,

    -- Quantidade de faturas geradas neste mês
    COUNT(*) FILTER (WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)) as faturas_mes_atual
  FROM public.saas_faturas;
END;
$function$
;"
"CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_consultoria_id uuid;
    v_nome_empresa text;
    v_nome_usuario text;
BEGIN
    -- Busca os dados extras que vieram do Front-end
    v_nome_empresa := new.raw_user_meta_data->>'nome_empresa';
    v_nome_usuario := new.raw_user_meta_data->>'nome_completo';

    -- CENÁRIO A: É UM NOVO DONO DE EMPRESA (Veio com nome da empresa no cadastro)
    IF v_nome_empresa IS NOT NULL AND v_nome_empresa <> '' THEN
        -- 1. Cria a Consultoria
        INSERT INTO public.consultorias (nome, status, plano, cnpj)
        VALUES (v_nome_empresa, 'ativa', 'free', '00000000000000')
        RETURNING id INTO v_consultoria_id;

        -- 2. Cria o Perfil de Admin vinculado
        INSERT INTO public.profiles (id, email, nome, cargo, consultoria_id)
        VALUES (new.id, new.email, v_nome_usuario, 'admin', v_consultoria_id);
    
    -- CENÁRIO B: É UM FUNCIONÁRIO (Não veio nome de empresa, o Admin criou ele)
    -- Nesse caso, a gente espera que o invite já tenha definido o consultoria_id
    -- Mas por segurança, criamos o perfil básico pra não dar erro
    ELSE
        INSERT INTO public.profiles (id, email, nome, cargo)
        VALUES (new.id, new.email, COALESCE(v_nome_usuario, 'Novo Usuário'), 'colaborador')
        ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN new;
END;
$function$
;"
"CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  );
END;
$function$
;"
"CREATE OR REPLACE FUNCTION public.pode_gerenciar_profile(p_consultoria_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (
                p.role = 'super_admin'
                OR (
                    p.role IN ('admin', 'dono')
                    AND p.consultoria_id = p_consultoria_id
                )
              )
    );
$function$
;"
"CREATE OR REPLACE FUNCTION public.proteger_campos_sensiveis_profiles()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
    v_usuario_id uuid;
    v_usuario_role text;
    v_usuario_consultoria_id uuid;
BEGIN
    v_usuario_id := auth.uid();

    -- Operações administrativas internas, SQL Editor e service_role
    IF v_usuario_id IS NULL OR auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Identifica quem está fazendo a alteração
    SELECT
        role,
        consultoria_id
    INTO
        v_usuario_role,
        v_usuario_consultoria_id
    FROM public.profiles
    WHERE id = v_usuario_id;

    IF v_usuario_role IS NULL THEN
        RAISE EXCEPTION 'Perfil do usuário autenticado não encontrado.';
    END IF;


    -- ============================================================
    -- SUPER ADMIN
    -- ============================================================
    IF v_usuario_role = 'super_admin' THEN
        RETURN NEW;
    END IF;


    -- ============================================================
    -- ADMIN / DONO
    -- ============================================================
    IF v_usuario_role IN ('admin', 'dono') THEN

        -- Perfil já vinculado: só pode gerenciar a própria consultoria
        IF OLD.consultoria_id IS NOT NULL
           AND OLD.consultoria_id IS DISTINCT FROM v_usuario_consultoria_id THEN
            RAISE EXCEPTION 'Você não pode alterar usuários de outra consultoria.';
        END IF;

        -- Perfil ainda sem consultoria:
        -- permite o fluxo seguro de vinculação da RPC
        IF OLD.consultoria_id IS NULL THEN
            IF NEW.consultoria_id IS DISTINCT FROM v_usuario_consultoria_id THEN
                RAISE EXCEPTION 'O usuário só pode ser vinculado à sua própria consultoria.';
            END IF;
        ELSE
            -- Depois de vinculado, admin não pode trocar a consultoria
            IF NEW.consultoria_id IS DISTINCT FROM OLD.consultoria_id THEN
                RAISE EXCEPTION 'Não é permitido mover usuários entre consultorias.';
            END IF;
        END IF;

        -- Admin não pode alterar tenant
        IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
            RAISE EXCEPTION 'Não é permitido alterar o tenant do usuário.';
        END IF;

        -- Admin não pode alterar ID ou e-mail do perfil
        IF NEW.id IS DISTINCT FROM OLD.id THEN
            RAISE EXCEPTION 'Não é permitido alterar o ID do usuário.';
        END IF;

        IF NEW.email IS DISTINCT FROM OLD.email THEN
            RAISE EXCEPTION 'Não é permitido alterar o e-mail por esta operação.';
        END IF;

        -- Perfis que um admin pode atribuir
        IF NEW.role IS DISTINCT FROM OLD.role
           AND NEW.role NOT IN ('consultor', 'gp', 'admin') THEN
            RAISE EXCEPTION 'Perfil inválido ou não permitido.';
        END IF;

        -- Bloqueio explícito de elevação para super_admin
        IF NEW.role = 'super_admin'
           AND OLD.role IS DISTINCT FROM 'super_admin' THEN
            RAISE EXCEPTION 'Somente um Super Admin pode criar outro Super Admin.';
        END IF;

        -- Cargo não pode ser usado para burlar as permissões
        IF NEW.cargo IS DISTINCT FROM OLD.cargo
           AND NEW.cargo NOT IN ('colaborador', 'consultor', 'gp', 'admin') THEN
            RAISE EXCEPTION 'Cargo inválido ou não permitido.';
        END IF;

        RETURN NEW;
    END IF;


    -- ============================================================
    -- GP / CONSULTOR / OUTROS USUÁRIOS
    -- ============================================================

    -- Só pode alterar o próprio perfil
    IF OLD.id IS DISTINCT FROM v_usuario_id THEN
        RAISE EXCEPTION 'Você só pode alterar o seu próprio perfil.';
    END IF;

    -- Bloqueia campos sensíveis
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Você não pode alterar o seu próprio perfil de acesso.';
    END IF;

    IF NEW.cargo IS DISTINCT FROM OLD.cargo THEN
        RAISE EXCEPTION 'Você não pode alterar o seu próprio cargo.';
    END IF;

    IF NEW.consultoria_id IS DISTINCT FROM OLD.consultoria_id THEN
        RAISE EXCEPTION 'Você não pode alterar sua consultoria.';
    END IF;

    IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
        RAISE EXCEPTION 'Você não pode alterar seu tenant.';
    END IF;

    IF NEW.ativo IS DISTINCT FROM OLD.ativo THEN
        RAISE EXCEPTION 'Você não pode alterar seu próprio status.';
    END IF;

    IF NEW.email IS DISTINCT FROM OLD.email THEN
        RAISE EXCEPTION 'Você não pode alterar seu e-mail por esta operação.';
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'Você não pode alterar seu ID.';
    END IF;

    RETURN NEW;
END;
$function$
;"
"CREATE OR REPLACE FUNCTION public.resetar_senha_via_dono(user_id_alvo uuid, nova_senha text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  -- Atualiza a senha na tabela de autenticação do Supabase
  update auth.users
  set encrypted_password = crypt(nova_senha, gen_salt('bf'))
  where id = user_id_alvo;

  return json_build_object('status', 'sucesso');
exception when others then
  return json_build_object('status', 'erro', 'msg', SQLERRM);
end;
$function$
;"
"CREATE OR REPLACE FUNCTION public.set_dados_servico()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Se não veio consultor_id, pega do usuário logado
  IF NEW.consultor_id IS NULL THEN
    NEW.consultor_id := auth.uid();
  END IF;
  
  -- Se não veio consultoria_id, busca no perfil do usuário
  IF NEW.consultoria_id IS NULL THEN
    SELECT consultoria_id INTO NEW.consultoria_id
    FROM profiles
    WHERE id = auth.uid();
  END IF;

  RETURN NEW;
END;
$function$
;"
"CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;"
"CREATE OR REPLACE FUNCTION public.vincular_funcionario_criado(email_func text, nome_func text, cargo_func text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
    v_admin_id uuid;
    v_admin_role text;
    v_consultoria_id uuid;

    v_new_user_id uuid;
    v_existing_consultoria_id uuid;
BEGIN
    -- 1. Identifica quem está executando a função
    v_admin_id := auth.uid();

    IF v_admin_id IS NULL THEN
        RETURN json_build_object(
            'status', 'erro',
            'msg', 'Usuário não autenticado.'
        );
    END IF;

    -- 2. Busca o perfil e a consultoria de quem está executando
    SELECT
        p.role,
        p.consultoria_id
    INTO
        v_admin_role,
        v_consultoria_id
    FROM public.profiles p
    WHERE p.id = v_admin_id;

    IF v_consultoria_id IS NULL THEN
        RETURN json_build_object(
            'status', 'erro',
            'msg', 'Consultoria do usuário não encontrada.'
        );
    END IF;

    -- 3. Somente perfis administrativos podem criar membros
    IF v_admin_role NOT IN ('admin', 'dono', 'super_admin') THEN
        RETURN json_build_object(
            'status', 'erro',
            'msg', 'Você não possui permissão para criar membros.'
        );
    END IF;

    -- 4. Limita os perfis que podem ser criados por esta função
    IF cargo_func NOT IN ('consultor', 'gp', 'admin') THEN
        RETURN json_build_object(
            'status', 'erro',
            'msg', 'Perfil de usuário inválido.'
        );
    END IF;

    -- 5. Localiza o usuário recém-criado no Supabase Auth
    SELECT u.id
    INTO v_new_user_id
    FROM auth.users u
    WHERE lower(u.email) = lower(trim(email_func));

    IF v_new_user_id IS NULL THEN
        RETURN json_build_object(
            'status', 'erro',
            'msg', 'Usuário não encontrado no Auth.'
        );
    END IF;

    -- 6. Verifica se o usuário já está vinculado a alguma consultoria
    SELECT p.consultoria_id
    INTO v_existing_consultoria_id
    FROM public.profiles p
    WHERE p.id = v_new_user_id;

    IF v_existing_consultoria_id IS NOT NULL THEN

        IF v_existing_consultoria_id = v_consultoria_id THEN
            RETURN json_build_object(
                'status', 'erro',
                'msg', 'Este usuário já está vinculado à consultoria.'
            );
        ELSE
            RETURN json_build_object(
                'status', 'erro',
                'msg', 'Este usuário já pertence a outra consultoria.'
            );
        END IF;

    END IF;

    -- 7. Atualiza o perfil básico criado pelo trigger
    UPDATE public.profiles
    SET
        consultoria_id = v_consultoria_id,
        nome = nome_func,
        cargo = cargo_func,
        role = cargo_func
    WHERE id = v_new_user_id;

    -- 8. Fallback caso o trigger não tenha criado o perfil
    IF NOT FOUND THEN
        INSERT INTO public.profiles (
            id,
            email,
            nome,
            cargo,
            role,
            consultoria_id
        )
        VALUES (
            v_new_user_id,
            email_func,
            nome_func,
            cargo_func,
            cargo_func,
            v_consultoria_id
        );
    END IF;

    RETURN json_build_object(
        'status', 'sucesso',
        'msg', 'Vínculo realizado com sucesso!'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'status', 'erro',
            'msg', SQLERRM
        );
END;
$function$
;"