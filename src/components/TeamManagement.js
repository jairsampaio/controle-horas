import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@supabase/supabase-js'; 
import { 
  Users, UserPlus, Mail, Shield, CheckCircle, X, Lock, User
} from 'lucide-react';
import supabase from '../services/supabase';

const TeamManagement = ({ showToast }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para o Cargo do usuário logado (Admin/Super Admin)
  const [currentUserRole, setCurrentUserRole] = useState(null);

  // Estados dos Modais
  const [modalOpen, setModalOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);

  // --- NOVO FORMULÁRIO (Para criação direta) ---
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState(''); 

  // Função Principal de Carregamento
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Identificar quem está logado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // 2. Buscar o perfil do usuário logado (Consultoria e Cargo)
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('consultoria_id, cargo') 
        .eq('id', user.id)
        .single();

      if (profileError || !userProfile?.consultoria_id) {
        console.error("Erro ao buscar perfil:", profileError);
        return;
      }

      // IMPORTANTE: Define o cargo para mostrar/esconder o botão
      setCurrentUserRole(userProfile.cargo);

      // 3. Buscar membros da mesma consultoria
      const { data: membersData, error: membersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('consultoria_id', userProfile.consultoria_id)
        .order('nome', { ascending: true });

      if (membersError) throw membersError;

      setMembers(membersData || []);
      
    } catch (error) {
      console.error('Erro ao carregar equipe:', error);
      if (showToast) showToast("Erro ao carregar dados da equipe.", 'erro');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- NOVA ESTRATÉGIA: FRONTEND CRIA O USUÁRIO (Senha Segura) ---
  const handleCreateMember = async (e) => {
    e.preventDefault();
    setInviteLoading(true);

    try {
      if (senha.length < 6) {
        throw new Error("A senha provisória deve ter no mínimo 6 caracteres.");
      }

      // ==============================================================================
      // ⚠️ ATENÇÃO: SUBSTITUA ABAIXO PELA SUA URL E KEY DO SUPABASE
      // (Isso é necessário porque criar uma nova instância exige esses dados explícitos)
      // ==============================================================================
      const SUPABASE_URL = 'https://ubwutmslwlefviiabysc.supabase.co'; // <--- COLE SUA URL AQUI
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVid3V0bXNsd2xlZnZpaWFieXNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMjQ4MTgsImV4cCI6MjA4MDgwMDgxOH0.lTlvqtu0hKtYDQXJB55BG9ueZ-MdtbCtBvSNQMII2b8';     // <--- COLE SUA ANON KEY AQUI
      // ==============================================================================

      // Validação simples pra você não esquecer
      if (SUPABASE_URL.includes('SEU_PROJETO')) {
         throw new Error("ERRO DE CONFIGURAÇÃO: Você precisa colocar a URL e a KEY nas linhas 71 e 72 do código TeamManagement.js");
      }

      // 1. Cria um cliente temporário ISOLADO (Não desloga você)
      const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false, // OBRIGATÓRIO: Não salva sessão no navegador
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });

      // 2. Cria o usuário usando a API oficial (Garante hash de senha correto)
      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: email.trim(),
        password: senha,
        options: {
          data: { nome_completo: nome } // Salva o nome nos metadados
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar usuário no sistema de autenticação.");

      // 3. Chama o Banco APENAS para vincular à Consultoria correta
      const { data: rpcData, error: rpcError } = await supabase.rpc('vincular_funcionario_criado', {
        email_func: email.trim(),
        nome_func: nome,
        cargo_func: 'colaborador' 
      });

      if (rpcError) throw rpcError;
      if (rpcData && rpcData.status === 'erro') {
        throw new Error(rpcData.msg);
      }

      if (showToast) showToast(`Funcionário ${nome} criado e vinculado com sucesso!`, 'sucesso');
      
      // Limpa e fecha
      setModalOpen(false);
      setNome('');
      setEmail('');
      setSenha('');
      
      // Recarrega a lista
      loadData();

    } catch (error) {
      console.error(error);
      let msg = error.message;
      if (msg.includes('already registered') || msg.includes('violates unique constraint')) {
        msg = "Este e-mail já está cadastrado no sistema.";
      }
      if (showToast) showToast(msg, 'erro');
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in relative z-0">
        
        {/* Header da Seção */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Users className="text-indigo-600" /> Minha Equipe
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Gerencie os consultores da sua empresa.</p>
          </div>
          
          {/* BOTÃO DE NOVO MEMBRO - Só aparece para Admin ou Super Admin */}
          {(currentUserRole === 'admin' || currentUserRole === 'super_admin') && (
            <button 
              onClick={() => setModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-md transition-all text-sm"
            >
              <UserPlus size={18} /> Novo Membro
            </button>
          )}
        </div>

        {/* LISTA DE MEMBROS ATIVOS */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2 text-sm">
              <CheckCircle size={16} className="text-green-500" /> Membros da Empresa ({members.length})
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-3">Nome</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Cargo</th>
                  <th className="px-6 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                   <tr><td colSpan="4" className="p-6 text-center text-gray-500">Carregando equipe...</td></tr>
                ) : members.length === 0 ? (
                   <tr><td colSpan="4" className="p-6 text-center text-gray-500">Nenhum membro encontrado.</td></tr>
                ) : members.map(member => (
                  <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                         <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                           {member.nome ? member.nome.charAt(0).toUpperCase() : '?'}
                         </div>
                         {member.nome || 'Sem Nome'}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{member.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase 
                        ${member.cargo === 'super_admin' ? 'bg-yellow-100 text-yellow-700' : 
                          member.cargo === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 
                          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                        {member.cargo || 'Colaborador'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-full">ATIVO</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* --- MODAL DE CRIAÇÃO DIRETA --- */}
      {modalOpen && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          style={{ backdropFilter: 'blur(5px)' }}
        >
          <div 
            className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-gray-800 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <UserPlus className="text-indigo-600" /> Cadastrar Funcionário
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200 flex gap-2">
                <Shield size={16} className="shrink-0" />
                <p>O usuário será criado imediatamente e vinculado à sua consultoria. Entregue a senha provisória para ele.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome Completo</label>
                <div className="relative">
                    <User size={18} className="absolute left-3 top-2.5 text-gray-400" />
                    <input 
                    type="text" 
                    value={nome} 
                    onChange={e => setNome(e.target.value)}
                    className="w-full pl-10 rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ex: Ana Silva"
                    required
                    />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail de Acesso</label>
                <div className="relative">
                    <Mail size={18} className="absolute left-3 top-2.5 text-gray-400" />
                    <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="ana@empresa.com"
                    required
                    />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha Provisória</label>
                <div className="relative">
                    <Lock size={18} className="absolute left-3 top-2.5 text-gray-400" />
                    <input 
                    type="text" 
                    value={senha} 
                    onChange={e => setSenha(e.target.value)}
                    className="w-full pl-10 rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={inviteLoading}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {inviteLoading ? 'Criando...' : 'Criar Membro'}
                </button>
              </div>
            </form>

          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default TeamManagement;