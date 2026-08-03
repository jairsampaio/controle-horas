-- ============================================
-- APLICADO EM 2026-08-02
-- Remove 5 funções sem uso (nenhuma chamada em src/, api/
-- ou backend-email/). Todas SECURITY DEFINER escrevendo
-- direto em auth.users com senha em texto plano.
-- criar_funcionario tinha 2 sobrecargas.
-- Substituídas pelo fluxo atual: supabase.auth.signUp()
-- no front + RPC vincular_funcionario_criado.
--
-- ROLLBACK: as definições completas estão em
-- db/functions-2026-07-31.sql. Para reverter, copie de lá
-- o CREATE OR REPLACE FUNCTION correspondente e execute.
-- ============================================

drop function if exists public.criar_funcionario(text, text, text);
drop function if exists public.criar_funcionario(text, text, text, text);
drop function if exists public.criar_nova_consultoria(text, text, text, text);
drop function if exists public.criar_nova_assinatura(text, text, text, text);
drop function if exists public.cadastrar_admin_consultoria(text, uuid);


-- ============================================
-- APLICADO EM 2026-08-02 (segunda rodada)
-- Remove get_saas_finance_metrics, órfã: nunca foi chamada
-- pelo front — AdminFinance consultava saas_faturas direto
-- via .from(), não pela RPC.
-- A aba Financeiro SaaS foi removida do app nesta mesma data
-- (a tela quebrava: join por consultoria_id numa tabela que
-- usa tenant_id, resquício do modelo tenants abandonado).
--
-- A tabela saas_faturas foi mantida — vazia, restrita a
-- super_admin pela RLS, disponível se a cobrança for
-- formalizada no futuro.
--
-- ROLLBACK: definição completa em db/functions-2026-07-31.sql
-- ============================================

drop function if exists public.get_saas_finance_metrics();