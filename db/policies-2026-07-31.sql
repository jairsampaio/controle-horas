ddl
"CREATE POLICY ""Gerenciar agenda"" ON public.agenda_eventos AS PERMISSIVE FOR ALL TO public USING (((consultoria_id IN ( SELECT profiles.consultoria_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))) AND ((consultor_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.cargo = ANY (ARRAY['admin'::text, 'dono'::text, 'super_admin'::text]))))))));"
"CREATE POLICY ""Ver agenda"" ON public.agenda_eventos AS PERMISSIVE FOR SELECT TO public USING (((consultoria_id IN ( SELECT profiles.consultoria_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))) AND ((consultor_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.cargo = ANY (ARRAY['admin'::text, 'dono'::text, 'super_admin'::text]))))))));"
"CREATE POLICY ""Criar Canais"" ON public.canais AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));"
"CREATE POLICY ""Gestão de Canais da Consultoria"" ON public.canais AS PERMISSIVE FOR ALL TO public USING ((consultoria_id IN ( SELECT profiles.consultoria_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));"
"CREATE POLICY ""Isolamento Canais"" ON public.canais AS PERMISSIVE FOR ALL TO public USING (((tenant_id = get_my_tenant_id()) OR is_super_admin()));"
"CREATE POLICY ""Isolamento de Canais por Consultoria"" ON public.canais AS PERMISSIVE FOR SELECT TO public USING ((consultoria_id IN ( SELECT profiles.consultoria_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));"
"CREATE POLICY ""Isolamento por Consultoria - Canais"" ON public.canais AS PERMISSIVE FOR ALL TO public USING ((consultoria_id IN ( SELECT profiles.consultoria_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));"
"CREATE POLICY ""Usuários podem atualizar seus canais"" ON public.canais AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));"
"CREATE POLICY ""Usuários podem criar canais"" ON public.canais AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));"
"CREATE POLICY ""Usuários podem deletar seus canais"" ON public.canais AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));"
"CREATE POLICY ""Usuários podem ver seus próprios canais"" ON public.canais AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));"
"CREATE POLICY ""Ver candidaturas da mesma consultoria"" ON public.candidaturas AS PERMISSIVE FOR ALL TO public USING ((consultor_id IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.consultoria_id = ( SELECT profiles_1.consultoria_id
           FROM profiles profiles_1
          WHERE (profiles_1.id = auth.uid()))))));"
"CREATE POLICY ""Isolamento Clientes"" ON public.clientes AS PERMISSIVE FOR ALL TO public USING (((tenant_id = get_my_tenant_id()) OR is_super_admin()));"
"CREATE POLICY ""Isolamento por Consultoria - Clientes"" ON public.clientes AS PERMISSIVE FOR ALL TO public USING ((consultoria_id IN ( SELECT profiles.consultoria_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));"
"CREATE POLICY ""Ver clientes da mesma consultoria"" ON public.clientes AS PERMISSIVE FOR ALL TO public USING ((consultoria_id IN ( SELECT profiles.consultoria_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));"
CREATE POLICY allow_authenticated_read ON public.clientes AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY allow_owner_delete ON public.clientes AS PERMISSIVE FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY allow_owner_insert ON public.clientes AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY allow_owner_update ON public.clientes AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
"CREATE POLICY ""Isolamento Configs"" ON public.configuracoes AS PERMISSIVE FOR ALL TO public USING (((tenant_id = get_my_tenant_id()) OR is_super_admin()));"
"CREATE POLICY ""Users can insert own config"" ON public.configuracoes AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));"
"CREATE POLICY ""Users can update own config"" ON public.configuracoes AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));"
"CREATE POLICY ""Users can view own config"" ON public.configuracoes AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));"
"CREATE POLICY ""Acesso Basico Consultorias"" ON public.consultorias AS PERMISSIVE FOR ALL TO public USING ((auth.role() = 'authenticated'::text));"
"CREATE POLICY ""Ver demandas da mesma consultoria"" ON public.demandas AS PERMISSIVE FOR ALL TO public USING ((consultoria_id IN ( SELECT profiles.consultoria_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));"
"CREATE POLICY ""Apenas Chefes alteram financeiro"" ON public.demandas_financeiro AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.consultoria_id = demandas_financeiro.consultoria_id) AND (profiles.role = ANY (ARRAY['admin'::text, 'dono'::text, 'super_admin'::text]))))));"
"CREATE POLICY ""Apenas Chefes veem financeiro"" ON public.demandas_financeiro AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.consultoria_id = demandas_financeiro.consultoria_id) AND (profiles.role = ANY (ARRAY['admin'::text, 'dono'::text, 'super_admin'::text]))))));"
"CREATE POLICY ""Acesso por Consultoria"" ON public.movimentacoes_financeiras AS PERMISSIVE FOR ALL TO public USING ((consultoria_id IN ( SELECT profiles.consultoria_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));"
"CREATE POLICY ""Admins Total Financeiro"" ON public.movimentacoes_financeiras AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'dono'::text, 'super_admin'::text]))))));"
"CREATE POLICY ""Admins total financeiro"" ON public.movimentacoes_financeiras AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'dono'::text, 'super_admin'::text]))))));"
"CREATE POLICY ""Deletar Movimentacoes"" ON public.movimentacoes_financeiras AS PERMISSIVE FOR DELETE TO public USING ((consultoria_id IN ( SELECT profiles.consultoria_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));"
"CREATE POLICY ""Inserir Movimentacoes"" ON public.movimentacoes_financeiras AS PERMISSIVE FOR INSERT TO public WITH CHECK ((consultoria_id IN ( SELECT profiles.consultoria_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));"
"CREATE POLICY ""Ver Movimentacoes"" ON public.movimentacoes_financeiras AS PERMISSIVE FOR SELECT TO public USING ((consultoria_id IN ( SELECT profiles.consultoria_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));"
"CREATE POLICY ""Acesso Basico Profile"" ON public.profiles AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = id));"
"CREATE POLICY ""Admins podem atualizar membros da sua consultoria"" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING (pode_gerenciar_profile(consultoria_id)) WITH CHECK (pode_gerenciar_profile(consultoria_id));"
"CREATE POLICY ""Perfis visiveis para todos autenticados"" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (true);"
"CREATE POLICY ""Permitir leitura de perfis"" ON public.profiles AS PERMISSIVE FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));"
"CREATE POLICY ""Usuário cria seu próprio perfil"" ON public.profiles AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = id));"
"CREATE POLICY ""Usuário edita seu próprio perfil"" ON public.profiles AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = id));"
"CREATE POLICY ""Apenas Admins criam convites"" ON public.saas_convites AS PERMISSIVE FOR INSERT TO public WITH CHECK ((( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'super_admin'::text])));"
"CREATE POLICY ""Apenas Admins deletam convites"" ON public.saas_convites AS PERMISSIVE FOR DELETE TO public USING (((( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'super_admin'::text])) AND (tenant_id = ( SELECT profiles.tenant_id
   FROM profiles
  WHERE (profiles.id = auth.uid())))));"
"CREATE POLICY ""Membros veem convites da empresa"" ON public.saas_convites AS PERMISSIVE FOR SELECT TO public USING ((tenant_id = ( SELECT profiles.tenant_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));"
"CREATE POLICY ""Super Admin Gerencia Faturas"" ON public.saas_faturas AS PERMISSIVE FOR ALL TO public USING (is_super_admin());"
"CREATE POLICY ""Admin Gerencia Planos"" ON public.saas_planos AS PERMISSIVE FOR ALL TO public USING (is_super_admin());"
"CREATE POLICY ""Leitura Pública de Planos"" ON public.saas_planos AS PERMISSIVE FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));"
"CREATE POLICY ""Atualizar servicos"" ON public.servicos_prestados AS PERMISSIVE FOR UPDATE TO public USING (((consultor_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role = 'admin'::text) OR (profiles.role = 'dono'::text)) AND (profiles.consultoria_id = servicos_prestados.consultoria_id))))));"
"CREATE POLICY ""Controle de Acesso Servicos"" ON public.servicos_prestados AS PERMISSIVE FOR SELECT TO public USING (((consultor_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'dono'::text, 'super_admin'::text, 'gestor'::text])) AND (profiles.consultoria_id = servicos_prestados.consultoria_id))))));"
"CREATE POLICY ""Deletar Servicos"" ON public.servicos_prestados AS PERMISSIVE FOR DELETE TO public USING (((consultor_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'dono'::text, 'super_admin'::text, 'gestor'::text])) AND (profiles.consultoria_id = servicos_prestados.consultoria_id))))));"
"CREATE POLICY ""Editar Servicos"" ON public.servicos_prestados AS PERMISSIVE FOR UPDATE TO public USING (((consultor_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'dono'::text, 'super_admin'::text, 'gestor'::text])) AND (profiles.consultoria_id = servicos_prestados.consultoria_id))))));"
"CREATE POLICY ""Editar serviços da mesma consultoria"" ON public.servicos_prestados AS PERMISSIVE FOR UPDATE TO public USING ((consultoria_id IN ( SELECT profiles.consultoria_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));"
"CREATE POLICY ""Edição restrita"" ON public.servicos_prestados AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'dono'::text])))))));"
"CREATE POLICY ""Exclusão restrita"" ON public.servicos_prestados AS PERMISSIVE FOR DELETE TO public USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'dono'::text])))))));"
"CREATE POLICY ""Inserir Servicos"" ON public.servicos_prestados AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = consultor_id));"
"CREATE POLICY ""Inserir servicos"" ON public.servicos_prestados AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = consultor_id));"
"CREATE POLICY ""Isolamento Serviços"" ON public.servicos_prestados AS PERMISSIVE FOR ALL TO public USING (((tenant_id = get_my_tenant_id()) OR is_super_admin()));"
"CREATE POLICY ""Isolamento por Consultoria - Servicos"" ON public.servicos_prestados AS PERMISSIVE FOR ALL TO public USING ((consultoria_id IN ( SELECT profiles.consultoria_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));"
"CREATE POLICY ""Regra de Visibilidade de Serviços"" ON public.servicos_prestados AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'dono'::text, 'super_admin'::text])))))));"
"CREATE POLICY ""Todos podem apontar horas"" ON public.servicos_prestados AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));"
"CREATE POLICY ""Ver serviços da mesma consultoria"" ON public.servicos_prestados AS PERMISSIVE FOR ALL TO public USING ((consultoria_id IN ( SELECT profiles.consultoria_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));"
CREATE POLICY allow_authenticated_read ON public.servicos_prestados AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY allow_owner_delete ON public.servicos_prestados AS PERMISSIVE FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY allow_owner_insert ON public.servicos_prestados AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY allow_owner_update ON public.servicos_prestados AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
"CREATE POLICY ""Isolamento Solicitantes"" ON public.solicitantes AS PERMISSIVE FOR ALL TO public USING (((tenant_id = get_my_tenant_id()) OR is_super_admin()));"
"CREATE POLICY ""Usuários criam seus solicitantes"" ON public.solicitantes AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));"
"CREATE POLICY ""Usuários deletam seus solicitantes"" ON public.solicitantes AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));"
"CREATE POLICY ""Usuários editam seus solicitantes"" ON public.solicitantes AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));"
"CREATE POLICY ""Usuários veem seus próprios solicitantes"" ON public.solicitantes AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));"
"CREATE POLICY ""Ver Solicitantes da Consultoria"" ON public.solicitantes AS PERMISSIVE FOR ALL TO public USING ((consultoria_id IN ( SELECT profiles.consultoria_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));"
"CREATE POLICY ""Super Admins criam tenants"" ON public.tenants AS PERMISSIVE FOR INSERT TO public WITH CHECK ((( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'super_admin'::text));"
"CREATE POLICY ""Super Admins gerenciam tenants"" ON public.tenants AS PERMISSIVE FOR ALL TO public USING ((( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'super_admin'::text));"
"CREATE POLICY ""Ver meu tenant"" ON public.tenants AS PERMISSIVE FOR SELECT TO public USING (((id = get_my_tenant_id()) OR is_super_admin()));"