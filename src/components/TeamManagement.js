import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@supabase/supabase-js'; 
import { 
  Users, UserPlus, Mail, Shield, CheckCircle, X, Lock, User, Edit, Ban, Key, Save, AlertTriangle, MoreHorizontal
} from 'lucide-react';
import supabase from '../services/supabase';

const TeamManagement = ({ showToast }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para o Cargo do usuário logado (Admin/Super Admin)
  const [currentUserRole, setCurrentUserRole] = useState(null);

  // --- MODAL CRIAR ---
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [newMember, setNewMember] = useState({ nome: '', email: '', senha: '' });

  // --- MODAL EDITAR ---
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  // --- MODAL RESET SENHA ---
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [memberToReset, setMemberToReset] = useState(null);

  // Função Principal de Carregamento
  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('consultoria_id, cargo') 
        .eq('id', user.id)
        .single();

      if (profileError || !userProfile?.consultoria_id) return;

      setCurrentUserRole(userProfile.cargo);

      // Busca membros da mesma consultoria
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

  // --- 1. CRIAR MEMBRO ---
  const handleCreateMember = async (e) => {
    e.preventDefault();
    setInviteLoading(true);

    try {
      if (newMember.senha.length < 6) throw new Error("A senha deve ter no mínimo 6 caracteres.");

      const SUPABASE_URL = 'https://ubwutmslwlefviiabysc.supabase.co'; 
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVid3V0bXNsd2xlZnZpaWFieXNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMjQ4MTgsImV4cCI6MjA4MDgwMDgxOH0.lTlvqtu0hKtYDQXJB55BG9ueZ-MdtbCtBvSNQMII2b8';

      const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });

      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: newMember.email.trim(),
        password: newMember.senha,
        options: { data: { nome_completo: newMember.nome } }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar usuário.");

      const { data: rpcData, error: rpcError } = await supabase.rpc('vincular_funcionario_criado', {
        email_func: newMember.email.trim(),
        nome_func: newMember.nome,
        cargo_func: 'colaborador' 
      });

      if (rpcError) throw rpcError;
      if (rpcData && rpcData.status === 'erro') throw new Error(rpcData.msg);

      if (showToast) showToast(`Funcionário criado com sucesso!`, 'sucesso');
      setCreateModalOpen(false);
      setNewMember({ nome: '', email: '', senha: '' });
      loadData();

    } catch (error) {
      console.error(error);
      let msg = error.message;
      if (msg.includes('already registered')) msg = "Este e-mail já está cadastrado.";
      if (showToast) showToast(msg, 'erro');
    } finally {
      setInviteLoading(false);
    }
  };

  // --- 2. EDITAR MEMBRO ---
  const openEditModal = (member) => {
    setEditingMember({ ...member });
    setEditModalOpen(true);
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ 
                nome: editingMember.nome,
                cargo: editingMember.cargo 
            })
            .eq('id', editingMember.id);

        if (error) throw error;
        
        if (showToast) showToast("Dados atualizados com sucesso!", 'sucesso');
        setEditModalOpen(false);
        loadData();
    } catch (error) {
        console.error(error);
        if (showToast) showToast("Erro ao atualizar membro.", 'erro');
    } finally {
        setEditLoading(false);
    }
  };

  // --- 3. BLOQUEAR / DESBLOQUEAR ---
  const toggleStatus = async (member) => {
      const novoStatus = member.ativo === false ? true : false;
      const textoAcao = novoStatus ? "desbloqueado" : "bloqueado";

      if (!window.confirm(`Tem certeza que deseja ${novoStatus ? 'ATIVAR' : 'BLOQUEAR'} o acesso de ${member.nome}?`)) return;

      try {
        const { error } = await supabase
            .from('profiles')
            .update({ ativo: novoStatus })
            .eq('id', member.id);

        if (error) throw error;
        
        if (showToast) showToast(`Usuário ${textoAcao} com sucesso.`, 'sucesso');
        loadData();
      } catch (error) {
          console.error(error);
          if (showToast) showToast("Erro ao alterar status.", 'erro');
      }
  };

  // --- 4. RESETAR SENHA ---
  const openResetModal = (member) => {
      setMemberToReset(member);
      setResetPassword('');
      setResetModalOpen(true);
  };

  const handleResetPassword = async (e) => {
      e.preventDefault();
      setResetLoading(true);
      try {
          if (resetPassword.length < 6) throw new Error("A nova senha deve ter no mínimo 6 caracteres.");

          const { data, error } = await supabase.rpc('resetar_senha_via_dono', {
              user_id_alvo: memberToReset.id,
              nova_senha: resetPassword
          });

          if (error) throw error;
          if (data && data.status === 'erro') throw new Error(data.msg);

          if (showToast) showToast("Senha alterada com sucesso!", 'sucesso');
          setResetModalOpen(false);
      } catch (error) {
          console.error(error);
          let msg = error.message;
          if (msg.includes('function not found')) msg = "Erro: Função de reset não configurada no banco.";
          if (showToast) showToast(msg, 'erro');
      } finally {
          setResetLoading(false);
      }
  };

  // --- HELPER DE RENDERIZAÇÃO DE AÇÕES (REUSO) ---
  const renderActions = (member) => (
    <div className="flex gap-2 justify-end md:justify-center">
        {/* Reset Senha */}
        <button 
            onClick={() => openResetModal(member)}
            title="Redefinir Senha"
            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        >
            <Key size={18} />
        </button>
        
        {/* Editar */}
        <button 
            onClick={() => openEditModal(member)}
            title="Editar Dados"
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
            <Edit size={18} />
        </button>

        {/* Bloquear/Ativar */}
        <button 
            onClick={() => toggleStatus(member)}
            title={member.ativo !== false ? "Bloquear Acesso" : "Desbloquear Acesso"}
            className={`p-2 rounded-lg transition-colors ${
                member.ativo !== false 
                ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' 
                : 'text-red-500 hover:text-green-600 hover:bg-green-50'
            }`}
        >
            {member.ativo !== false ? <Ban size={18} /> : <CheckCircle size={18} />}
        </button>
    </div>
  );

  return (
    <>
      <div className="space-y-6 animate-fade-in relative z-0 pb-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Users className="text-indigo-600" /> Minha Equipe
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Gerencie acessos e permissões.</p>
          </div>
          
          {(currentUserRole === 'admin' || currentUserRole === 'super_admin') && (
            <button 
              onClick={() => setCreateModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 text-sm"
            >
              <UserPlus size={18} /> Novo Membro
            </button>
          )}
        </div>

        {/* --- CONTEÚDO RESPONSIVO --- */}
        {loading ? (
             <div className="text-center py-20 text-gray-500">Carregando equipe...</div>
        ) : members.length === 0 ? (
             <div className="text-center py-20 text-gray-500">Nenhum membro encontrado.</div>
        ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                
                {/* 1. VISÃO DESKTOP: TABELA (hidden md:block) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-800">
                            <tr>
                                <th className="px-6 py-4">Membro</th>
                                <th className="px-6 py-4">Cargo</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {members.map(member => (
                                <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold text-xs">
                                                {member.nome ? member.nome.charAt(0).toUpperCase() : '?'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900 dark:text-white">{member.nome || 'Sem Nome'}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{member.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase 
                                            ${member.cargo === 'super_admin' ? 'bg-yellow-100 text-yellow-700' : 
                                            member.cargo === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 
                                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                            {member.cargo || 'Colaborador'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {member.ativo !== false ? (
                                            <span className="text-green-600 bg-green-50 dark:bg-green-900/20 px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1">
                                                <CheckCircle size={12}/> ATIVO
                                            </span>
                                        ) : (
                                            <span className="text-red-600 bg-red-50 dark:bg-red-900/20 px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1">
                                                <Ban size={12}/> BLOQUEADO
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        {renderActions(member)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 2. VISÃO MOBILE: CARDS (md:hidden) */}
                <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                    {members.map(member => (
                        <div key={member.id} className="p-5 flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                        {member.nome ? member.nome.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">{member.nome || 'Sem Nome'}</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase 
                                        ${member.cargo === 'super_admin' ? 'bg-yellow-100 text-yellow-700' : 
                                        member.cargo === 'admin' ? 'bg-purple-100 text-purple-700' : 
                                        'bg-blue-100 text-blue-700'}`}>
                                        {member.cargo || 'Colab'}
                                    </span>
                                    {member.ativo === false && (
                                        <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 rounded">Bloqueado</span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="pt-2 border-t border-gray-50 dark:border-gray-800/50">
                                {renderActions(member)}
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        )}
      </div>

      {/* --- MODAL DE CRIAÇÃO --- */}
      {createModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-scale-in border border-gray-200 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between mb-6">
                <h3 className="font-bold text-lg text-gray-800 dark:text-white">Cadastrar</h3>
                <button onClick={() => setCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
            </div>
            <form onSubmit={handleCreateMember} className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-blue-800 dark:text-blue-300 text-xs flex gap-2 border border-blue-100 dark:border-blue-900/50">
                  <Shield size={16} className="shrink-0"/>
                  <p>O novo usuário receberá acesso imediato ao sistema com a senha definida abaixo.</p>
              </div>
              <input type="text" value={newMember.nome} onChange={e => setNewMember({...newMember, nome: e.target.value})} className="w-full border dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Nome Completo" required />
              <input type="email" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} className="w-full border dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Email Corporativo" required />
              <input type="text" value={newMember.senha} onChange={e => setNewMember({...newMember, senha: e.target.value})} className="w-full border dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Senha Inicial (min 6)" required minLength={6} />
              
              <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setCreateModalOpen(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl font-bold">Cancelar</button>
                  <button type="submit" disabled={inviteLoading} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50">
                      {inviteLoading ? 'Criando...' : 'Criar Membro'}
                  </button>
              </div>
            </form>
          </div>
        </div>, document.body
      )}

      {/* --- MODAL DE EDIÇÃO --- */}
      {editModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-scale-in border border-gray-200 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between mb-6">
                <h3 className="font-bold text-lg flex items-center gap-2 text-gray-800 dark:text-white"><Edit size={20} className="text-blue-600"/> Editar Membro</h3>
                <button onClick={() => setEditModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
            </div>
            <form onSubmit={handleUpdateMember} className="space-y-4">
              <div>
                  <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Nome Completo</label>
                  <input type="text" value={editingMember?.nome || ''} onChange={e => setEditingMember({...editingMember, nome: e.target.value})} className="w-full border dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                  <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Cargo</label>
                  <select value={editingMember?.cargo || 'colaborador'} onChange={e => setEditingMember({...editingMember, cargo: e.target.value})} className="w-full border dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="colaborador">Colaborador</option>
                    <option value="admin">Admin (Gestor)</option>
                  </select>
              </div>
              <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setEditModalOpen(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl font-bold">Cancelar</button>
                  <button type="submit" disabled={editLoading} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">
                      {editLoading ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
              </div>
            </form>
          </div>
        </div>, document.body
      )}

      {/* --- MODAL DE RESET DE SENHA --- */}
      {resetModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-red-100 dark:border-red-900/30 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between mb-6">
                <h3 className="font-bold text-lg flex items-center gap-2 text-red-600"><Key size={20}/> Redefinir Senha</h3>
                <button onClick={() => setResetModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl text-red-800 dark:text-red-300 text-xs flex gap-3 border border-red-100 dark:border-red-900/50">
                  <AlertTriangle size={20} className="shrink-0"/>
                  <p>Você está alterando a senha de <strong>{memberToReset?.nome}</strong> manualmente. Informe a nova senha abaixo.</p>
              </div>
              <div>
                  <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Nova Senha</label>
                  <input 
                    type="text" 
                    value={resetPassword} 
                    onChange={e => setResetPassword(e.target.value)} 
                    className="w-full border dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500 font-mono" 
                    placeholder="Mínimo 6 caracteres" 
                    required 
                    minLength={6}
                    autoComplete="new-password"
                  />
              </div>
              <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setResetModalOpen(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl font-bold">Cancelar</button>
                  <button type="submit" disabled={resetLoading} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold transition-colors">
                      {resetLoading ? 'Alterando...' : 'Confirmar Nova Senha'}
                  </button>
              </div>
            </form>
          </div>
        </div>, document.body
      )}

    </>
  );
};

export default TeamManagement;