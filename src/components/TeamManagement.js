import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@supabase/supabase-js'; // Importação necessária
import { 
  Users, UserPlus, Mail, Shield, CheckCircle, X, Lock, User
} from 'lucide-react';
import supabase from '../services/supabase';

const TeamManagement = ({ showToast }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('consultoria_id, cargo') 
        .eq('id', user.id)
        .single();

      if (!userProfile?.consultoria_id) return;

      setCurrentUserRole(userProfile.cargo);

      const { data: membersData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('consultoria_id', userProfile.consultoria_id)
        .order('nome', { ascending: true });

      if (error) throw error;
      setMembers(membersData || []);
    } catch (error) {
      console.error('Erro:', error);
      if (showToast) showToast("Erro ao carregar equipe.", 'erro');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // --- ESTRATÉGIA DE CRIAÇÃO SEGURA (FRONTEND) ---
  const handleCreateMember = async (e) => {
    e.preventDefault();
    setInviteLoading(true);

    try {
      if (senha.length < 6) throw new Error("A senha deve ter no mínimo 6 caracteres.");

      // 1. Cria um cliente temporário para não deslogar o admin atual
      // Isso usa as mesmas credenciais do seu arquivo de config
      const tempClient = createClient(supabase.supabaseUrl, supabase.supabaseKey, {
        auth: {
          persistSession: false, // OBRIGATÓRIO: Não salva sessão no navegador
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });

      // 2. Cria o usuário usando a API oficial (Garante que a senha funcione)
      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: email.trim(),
        password: senha,
        options: {
          data: { nome_completo: nome } // Metadados úteis
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar usuário.");

      // 3. Chama o Banco APENAS para vincular à Consultoria correta
      const { data: rpcData, error: rpcError } = await supabase.rpc('vincular_funcionario_criado', {
        email_func: email.trim(),
        nome_func: nome,
        cargo_func: 'colaborador'
      });

      if (rpcError) throw rpcError;
      if (rpcData.status === 'erro') throw new Error(rpcData.msg);

      if (showToast) showToast(`Funcionário criado e vinculado com sucesso!`, 'sucesso');
      
      setModalOpen(false);
      setNome(''); setEmail(''); setSenha('');
      loadData();

    } catch (error) {
      console.error(error);
      let msg = error.message;
      if (msg.includes('already registered')) msg = "Este e-mail já possui cadastro.";
      if (showToast) showToast(msg, 'erro');
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in relative z-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Users className="text-indigo-600" /> Minha Equipe
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Gerencie os consultores da sua empresa.</p>
          </div>
          {(currentUserRole === 'admin' || currentUserRole === 'super_admin') && (
            <button onClick={() => setModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-md transition-all text-sm">
              <UserPlus size={18} /> Novo Membro
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2 text-sm">
              <CheckCircle size={16} className="text-green-500" /> Membros da Empresa ({members.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-800">
                <tr><th className="px-6 py-3">Nome</th><th className="px-6 py-3">Email</th><th className="px-6 py-3">Cargo</th><th className="px-6 py-3 text-center">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (<tr><td colSpan="4" className="p-6 text-center text-gray-500">Carregando...</td></tr>) : 
                 members.length === 0 ? (<tr><td colSpan="4" className="p-6 text-center text-gray-500">Nenhum membro.</td></tr>) : 
                 members.map(member => (
                  <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                         <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">{member.nome ? member.nome.charAt(0).toUpperCase() : '?'}</div>
                         {member.nome || 'Sem Nome'}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{member.email}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${member.cargo === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{member.cargo || 'Colaborador'}</span></td>
                    <td className="px-6 py-4 text-center"><span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-full">ATIVO</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-gray-800 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2"><UserPlus className="text-indigo-600" /> Cadastrar Funcionário</h3>
              <button onClick={() => setModalOpen(false)}><X size={24} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleCreateMember} className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200 flex gap-2">
                <Shield size={16} className="shrink-0" /><p>O usuário será criado imediatamente. Entregue a senha provisória.</p>
              </div>
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Nome</label><div className="relative"><User size={18} className="absolute left-3 top-2.5 text-gray-400" /><input type="text" value={nome} onChange={e => setNome(e.target.value)} className="w-full pl-10 rounded-lg border dark:bg-gray-800 dark:text-white p-2.5" placeholder="Nome" required /></div></div>
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Email</label><div className="relative"><Mail size={18} className="absolute left-3 top-2.5 text-gray-400" /><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-10 rounded-lg border dark:bg-gray-800 dark:text-white p-2.5" placeholder="Email" required /></div></div>
              <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Senha</label><div className="relative"><Lock size={18} className="absolute left-3 top-2.5 text-gray-400" /><input type="text" value={senha} onChange={e => setSenha(e.target.value)} className="w-full pl-10 rounded-lg border dark:bg-gray-800 dark:text-white p-2.5 font-mono" placeholder="Senha (min 6)" required minLength={6} /></div></div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg font-bold">Cancelar</button>
                <button type="submit" disabled={inviteLoading} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-bold">{inviteLoading ? 'Criando...' : 'Criar Membro'}</button>
              </div>
            </form>
          </div>
        </div>, document.body
      )}
    </>
  );
};
export default TeamManagement;