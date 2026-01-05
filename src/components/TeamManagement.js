import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // <--- 1. IMPORTAÇÃO DO PORTAL
import { 
  Users, UserPlus, Mail, Trash2, Shield, CheckCircle, Clock, X 
} from 'lucide-react';
import supabase from '../services/supabase';
import ConfirmModal from './ConfirmModal';

const TeamManagement = ({ showToast }) => {
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados dos Modais
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [inviteToCancel, setInviteToCancel] = useState(null);
  
  const [inviteLoading, setInviteLoading] = useState(false);

  // Form do Convite
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('consultor');

  // Pega o ID do Tenant do usuário logado
  const getMyTenantId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();
      
    return data?.tenant_id;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const tenantId = await getMyTenantId();
      if (!tenantId) return;

      const { data: membersData } = await supabase.from('profiles').select('*').eq('tenant_id', tenantId);
      const { data: invitesData } = await supabase.from('saas_convites').select('*').eq('tenant_id', tenantId).eq('status', 'pendente');

      setMembers(membersData || []);
      setInvites(invitesData || []);
    } catch (error) {
      console.error('Erro ao carregar equipe:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteLoading(true);
    try {
      const tenantId = await getMyTenantId();
      if (!tenantId) throw new Error("Empresa não identificada.");

      const { error } = await supabase.from('saas_convites').insert([{
        tenant_id: tenantId,
        email: email.trim().toLowerCase(),
        role: role,
        status: 'pendente'
      }]);

      if (error) throw error;

      if (showToast) showToast(`Convite enviado para ${email}!`, 'sucesso');
      
      setModalOpen(false);
      setEmail('');
      loadData();
    } catch (error) {
      if (showToast) showToast(error.message || "Erro ao enviar convite.", 'erro');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRequestCancel = (id) => {
    setInviteToCancel(id);
    setConfirmModalOpen(true);
  };

  const confirmCancellation = async () => {
    if (!inviteToCancel) return;
    
    const { error } = await supabase.from('saas_convites').delete().eq('id', inviteToCancel);
    
    if (!error) {
        if (showToast) showToast('Convite cancelado com sucesso.', 'sucesso');
        loadData();
    } else {
        if (showToast) showToast('Erro ao cancelar convite.', 'erro');
    }
    setConfirmModalOpen(false);
    setInviteToCancel(null);
  };

  return (
    <>
      {/* CONTEÚDO DA PÁGINA (Fica dentro do fluxo normal) */}
      <div className="space-y-6 animate-fade-in relative z-0">
        
        {/* Header da Seção */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Users className="text-indigo-600" /> Minha Equipe
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Gerencie acessos e convites.</p>
          </div>
          <button 
            onClick={() => setModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-md transition-all text-sm"
          >
            <UserPlus size={18} /> Convidar
          </button>
        </div>

        {/* LISTA DE MEMBROS ATIVOS */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2 text-sm">
              <CheckCircle size={16} className="text-green-500" /> Membros Ativos ({members.length})
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-3">Nome</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Função</th>
                  <th className="px-6 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                   <tr><td colSpan="4" className="p-6 text-center text-gray-500">Carregando...</td></tr>
                ) : members.map(member => (
                  <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{member.nome_completo || '-'}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{member.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${member.role === 'super_admin' || member.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button title="Remover (Em breve)" className="text-gray-300 cursor-not-allowed"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* LISTA DE CONVITES PENDENTES */}
        {invites.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-orange-50 dark:bg-orange-900/20">
              <h3 className="font-bold text-orange-700 dark:text-orange-200 flex items-center gap-2 text-sm">
                <Clock size={16} /> Convites Pendentes ({invites.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="px-6 py-3">Email Convidado</th>
                    <th className="px-6 py-3">Função</th>
                    <th className="px-6 py-3">Data Convite</th>
                    <th className="px-6 py-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {invites.map(invite => (
                    <tr key={invite.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Mail size={14} className="text-gray-400" /> {invite.email}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded text-xs font-bold uppercase bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          {invite.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">
                        {new Date(invite.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => handleRequestCancel(invite.id)}
                          className="text-red-400 hover:text-red-600 p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Cancelar Convite"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* --- MODAIS COM A SOLUÇÃO "BALA DE PRATA" (PORTAL + BODY) --- */}

      {/* 1. Modal de Confirmação */}
      {confirmModalOpen && createPortal(
        <ConfirmModal
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          onConfirm={confirmCancellation}
          title="Cancelar Convite?"
          message="Tem certeza que deseja revogar este convite? O usuário não poderá mais usar este e-mail para ingressar na equipe."
          confirmText="Sim, revogar"
          cancelText="Voltar"
          type="danger"
        />,
        document.body
      )}

      {/* 2. Modal de Novo Convite */}
      {modalOpen && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          style={{ backdropFilter: 'blur(5px)' }} // Força o blur caso o Tailwind falhe
        >
          <div 
            className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-gray-800 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Mail className="text-indigo-600" /> Convidar Membro
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200 flex gap-2">
                <Shield size={16} className="shrink-0" />
                <p>O usuário receberá acesso aos dados desta consultoria ao criar conta com este e-mail.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="nome@empresa.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nível de Acesso</label>
                <select 
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="consultor">Consultor (Operacional)</option>
                  <option value="admin">Administrador (Gestão)</option>
                </select>
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
                  {inviteLoading ? 'Enviando...' : 'Enviar Convite'}
                </button>
              </div>
            </form>

          </div>
        </div>,
        document.body // <--- AQUI É O PULO DO GATO: Renderiza no body
      )}
    </>
  );
};

export default TeamManagement;