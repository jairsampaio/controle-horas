import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@supabase/supabase-js'; 
import { 
  Users, UserPlus, Shield, CheckCircle, X, Edit, Ban, Key, 
  Phone, DollarSign, Lock, LayoutGrid, List, Mail, User, 
  Briefcase, Hash, CreditCard, Building, Landmark, AlertTriangle, Search
} from 'lucide-react';
import supabase from '../services/supabase';

// --- HELPERS ---
const maskPhone = (value) => {
  if (!value) return "";
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .replace(/(-\d{4})\d+?$/, "$1");
};

const maskCurrency = (value) => {
  if (!value) return "";
  let v = value.replace(/\D/g, "");
  v = (v / 100).toFixed(2) + "";
  v = v.replace(".", ",");
  v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
  return v;
};

const parseCurrency = (value) => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  const cleanValue = parseFloat(value.replace(/\./g, '').replace(',', '.'));
  return isNaN(cleanValue) ? 0 : cleanValue;
};

const TeamManagement = ({ showToast }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  
  // View & Filter States
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('teamViewMode') || 'grid');
  const [searchTerm, setSearchTerm] = useState(''); // NOVO: Estado da busca

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  // Loadings
  const [inviteLoading, setInviteLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Data States
  const [editingMember, setEditingMember] = useState(null);
  const [memberToReset, setMemberToReset] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  
  const [newMember, setNewMember] = useState({ 
    nome: '', email: '', senha: '', 
    whatsapp: '', valor_hora: '', 
    banco: '', agencia: '', conta: '', chave_pix: '',
    role: 'consultor'
  });

  useEffect(() => {
    localStorage.setItem('teamViewMode', viewMode);
  }, [viewMode]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('consultoria_id, role') 
        .eq('id', user.id)
        .single();

      if (!userProfile?.consultoria_id) return;
      setCurrentUserRole(userProfile.role);

      const { data: membersData } = await supabase
        .from('profiles')
        .select('*')
        .eq('consultoria_id', userProfile.consultoria_id)
        .order('nome', { ascending: true });

      setMembers(membersData || []);
    } catch (error) {
      console.error('Erro ao carregar equipe:', error);
      if (showToast) showToast("Erro ao carregar dados.", 'erro');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // --- FILTRAGEM ---
  const filteredMembers = members.filter(member => {
    const searchLower = searchTerm.toLowerCase();
    const nome = member.nome ? member.nome.toLowerCase() : '';
    const email = member.email ? member.email.toLowerCase() : '';
    return nome.includes(searchLower) || email.includes(searchLower);
  });

  // --- HANDLERS ---
  const handlePhoneChange = (e, setter, state) => {
    setter({ ...state, whatsapp: maskPhone(e.target.value) });
  };

  const handleCurrencyChange = (e, setter, state) => {
    setter({ ...state, valor_hora: maskCurrency(e.target.value) });
  };

  const openResetModal = (member) => {
    setMemberToReset(member);
    setResetPassword('');
    setResetModalOpen(true);
  };

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
      if (!authData.user) throw new Error("Erro ao criar usuário no Auth.");

      const { data: rpcData, error: rpcError } = await supabase.rpc('vincular_funcionario_criado', {
        email_func: newMember.email.trim(),
        nome_func: newMember.nome,
        cargo_func: newMember.role 
      });

      if (rpcError) throw rpcError;
      if (rpcData && rpcData.status === 'erro') throw new Error(rpcData.msg);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          whatsapp: newMember.whatsapp,
          valor_hora: parseCurrency(newMember.valor_hora),
          banco: newMember.banco,
          agencia: newMember.agencia,
          conta: newMember.conta,
          chave_pix: newMember.chave_pix
        })
        .eq('email', newMember.email.trim());

      if (updateError) throw updateError;

      if (showToast) showToast(`Membro criado com sucesso!`, 'sucesso');
      setCreateModalOpen(false);
      setNewMember({ nome: '', email: '', senha: '', whatsapp: '', valor_hora: '', banco: '', agencia: '', conta: '', chave_pix: '', role: 'consultor' });
      loadData();

    } catch (error) {
      console.error(error);
      let msg = error.message;
      if (msg.includes('already registered')) msg = "E-mail já cadastrado.";
      if (showToast) showToast(msg, 'erro');
    } finally {
      setInviteLoading(false);
    }
  };

  const openEditModal = (member) => {
    const valorFormatado = member.valor_hora 
      ? member.valor_hora.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.")
      : '';

    setEditingMember({ ...member, valor_hora: valorFormatado });
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
                role: editingMember.role,
                whatsapp: editingMember.whatsapp,
                valor_hora: parseCurrency(editingMember.valor_hora),
                banco: editingMember.banco,
                agencia: editingMember.agencia,
                conta: editingMember.conta,
                chave_pix: editingMember.chave_pix
            })
            .eq('id', editingMember.id);

        if (error) throw error;
        if (showToast) showToast("Dados atualizados!", 'sucesso');
        setEditModalOpen(false);
        loadData();
    } catch (error) {
        console.error(error);
        if (showToast) showToast("Erro ao atualizar.", 'erro');
    } finally {
        setEditLoading(false);
    }
  };

  const toggleStatus = async (member) => {
      const novoStatus = !member.ativo;
      if (!window.confirm(`Deseja ${novoStatus ? 'ATIVAR' : 'BLOQUEAR'} ${member.nome}?`)) return;

      try {
        await supabase.from('profiles').update({ ativo: novoStatus }).eq('id', member.id);
        if (showToast) showToast(`Status alterado.`, 'sucesso');
        loadData();
      } catch (error) { console.error(error); }
  };

  const handleResetPassword = async (e) => {
      e.preventDefault();
      setResetLoading(true);
      try {
          if (resetPassword.length < 6) throw new Error("Mínimo 6 caracteres.");
          const { data, error } = await supabase.rpc('resetar_senha_via_dono', {
              user_id_alvo: memberToReset.id,
              nova_senha: resetPassword
          });
          if (error) throw error;
          if (data?.status === 'erro') throw new Error(data.msg);
          if (showToast) showToast("Senha alterada!", 'sucesso');
          setResetModalOpen(false);
      } catch (error) {
          if (showToast) showToast(error.message, 'erro');
      } finally {
          setResetLoading(false);
      }
  };

  // --- RENDER HELPERS ---
  const renderRoleBadge = (role) => {
    const styles = {
        super_admin: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        admin: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
        consultor: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    };
    const label = role === 'super_admin' ? 'Super Admin' : role === 'admin' ? 'Gestor' : 'Consultor';
    return <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${styles[role] || styles.consultor}`}>{label}</span>;
  };

  const ActionButtons = ({ member }) => (
    <div className="flex gap-1 justify-end items-center">
       <button onClick={(e) => { e.stopPropagation(); openResetModal(member); }} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Senha"><Key size={16}/></button>
       <button onClick={(e) => { e.stopPropagation(); openEditModal(member); }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Editar"><Edit size={16}/></button>
       <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
       <button onClick={(e) => { e.stopPropagation(); toggleStatus(member); }} className={`p-2 rounded-lg transition-colors ${member.ativo ? 'text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700' : 'text-red-500 hover:text-green-600 hover:bg-gray-100'}`} title="Status">
           {member.ativo ? <Ban size={16}/> : <CheckCircle size={16}/>}
       </button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10 p-2">
      
      {/* HEADER & FILTERS */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="w-full lg:w-auto">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Users className="text-indigo-600" /> Gestão de Equipe
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Controle de acessos e dados financeiros.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            {/* SEARCH BAR (NOVO) */}
            <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar nome ou e-mail..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full border dark:border-gray-600 rounded-xl pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="hidden md:flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg shrink-0">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}><LayoutGrid size={18} /></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}><List size={18} /></button>
                </div>

                {['admin', 'super_admin', 'dono'].includes(currentUserRole) && (
                <button 
                    onClick={() => setCreateModalOpen(true)}
                    className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 text-sm whitespace-nowrap"
                >
                    <UserPlus size={18} /> <span>Novo Membro</span>
                </button>
                )}
            </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Carregando equipe...</div>
      ) : filteredMembers.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
            <Users className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500 font-medium">Nenhum membro encontrado com "{searchTerm}".</p>
        </div>
      ) : (
        <>
            {/* --- GRID VIEW --- */}
            <div className={`${viewMode === 'list' ? 'md:hidden' : 'grid'} grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`}>
                {filteredMembers.map(member => (
                    <div key={member.id} onClick={() => openEditModal(member)} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all relative overflow-hidden group cursor-pointer">
                        <div className={`absolute top-0 left-0 w-1 h-full ${member.ativo ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div className="flex justify-between items-start mb-4 pl-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 ${member.ativo ? 'border-gray-100 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300' : 'border-red-100 bg-red-50 text-red-400'}`}>
                                    {member.nome ? member.nome.charAt(0).toUpperCase() : '?'}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white truncate max-w-[140px] leading-tight">{member.nome}</h3>
                                    <p className="text-xs text-gray-500 truncate max-w-[140px]">{member.email}</p>
                                </div>
                            </div>
                            {renderRoleBadge(member.role)}
                        </div>
                        <div className="pl-3 space-y-2 mb-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500">Contato</span>
                                <span className="font-medium text-gray-700 dark:text-gray-300">{member.whatsapp || '-'}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500">Valor Hora</span>
                                <span className="font-bold text-gray-900 dark:text-white">
                                    {member.valor_hora > 0 ? `R$ ${member.valor_hora.toFixed(2)}` : '-'}
                                </span>
                            </div>
                        </div>
                        <div className="pl-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                            <ActionButtons member={member} />
                        </div>
                    </div>
                ))}
            </div>

            {/* --- LIST VIEW (PREMIUM TABLE) --- */}
            {viewMode === 'list' && (
                <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider text-xs border-b border-gray-200 dark:border-gray-800">
                            <tr>
                                <th className="px-6 py-4">Membro</th>
                                <th className="px-6 py-4">Cargo</th>
                                <th className="px-6 py-4 text-center">Status</th> 
                                <th className="px-6 py-4">Valor Hora</th>
                                <th className="px-6 py-4">WhatsApp</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredMembers.map(member => (
                                <tr key={member.id} onClick={() => openEditModal(member)} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border ${member.ativo ? 'bg-indigo-50 border-indigo-100 text-indigo-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300' : 'bg-red-50 border-red-100 text-red-500'}`}>
                                                {member.nome ? member.nome.charAt(0).toUpperCase() : '?'}
                                            </div>
                                            <div>
                                                <div className={`font-bold text-gray-900 dark:text-white ${!member.ativo && 'text-gray-400'}`}>{member.nome}</div>
                                                <div className="text-xs text-gray-500">{member.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">{renderRoleBadge(member.role)}</td>
                                    <td className="px-6 py-4 text-center">
                                        {member.ativo ? 
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> Ativo
                                            </span>
                                            : 
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> Bloqueado
                                            </span>
                                        }
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`font-semibold ${member.valor_hora > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                                            {member.valor_hora > 0 ? `R$ ${member.valor_hora.toFixed(2)}` : '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 font-medium">{member.whatsapp || '-'}</td>
                                    <td className="px-6 py-4">
                                        <ActionButtons member={member} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
      )}

      {/* --- MODAL DE CRIAÇÃO / EDIÇÃO --- */}
      {(createModalOpen || editModalOpen) && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in w-screen h-screen">
          <div className="bg-white dark:bg-gray-900 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-800">
            
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                <div>
                    <h3 className="font-bold text-xl text-gray-800 dark:text-white flex items-center gap-2">
                        {createModalOpen ? <UserPlus className="text-indigo-600"/> : <Edit className="text-blue-600"/>}
                        {createModalOpen ? 'Cadastrar Membro' : 'Editar Dados'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Preencha as informações contratuais e de acesso.</p>
                </div>
                <button onClick={() => { setCreateModalOpen(false); setEditModalOpen(false); }} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20}/></button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                <form id="memberForm" onSubmit={createModalOpen ? handleCreateMember : handleUpdateMember} className="space-y-8">
                    
                    {/* SEÇÃO IDENTIDADE */}
                    <div>
                        <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <User size={14}/> Identidade & Acesso
                        </h4>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="relative">
                                    <User size={18} className="absolute left-3 top-3.5 text-gray-400" />
                                    <input type="text" value={createModalOpen ? newMember.nome : editingMember?.nome} onChange={e => {
                                        const val = e.target.value;
                                        createModalOpen ? setNewMember({...newMember, nome: val}) : setEditingMember({...editingMember, nome: val});
                                    }} className="w-full border dark:border-gray-700 rounded-xl pl-10 pr-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Nome Completo" required />
                                </div>
                                <div className="relative">
                                    <Mail size={18} className="absolute left-3 top-3.5 text-gray-400" />
                                    <input type="email" disabled={!createModalOpen} value={createModalOpen ? newMember.email : editingMember?.email} onChange={e => {
                                        const val = e.target.value;
                                        createModalOpen ? setNewMember({...newMember, email: val}) : setEditingMember({...editingMember, email: val});
                                    }} className="w-full border dark:border-gray-700 rounded-xl pl-10 pr-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60" placeholder="E-mail Corporativo" required />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="relative">
                                    <Briefcase size={18} className="absolute left-3 top-3.5 text-gray-400" />
                                    <select value={createModalOpen ? newMember.role : editingMember?.role} onChange={e => {
                                        const val = e.target.value;
                                        createModalOpen ? setNewMember({...newMember, role: val}) : setEditingMember({...editingMember, role: val});
                                    }} className="w-full border dark:border-gray-700 rounded-xl pl-10 pr-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 appearance-none font-medium cursor-pointer">
                                        <option value="consultor">Consultor</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                </div>
                                {createModalOpen && (
                                    <div className="relative">
                                        <Lock size={18} className="absolute left-3 top-3.5 text-gray-400" />
                                        <input type="text" value={newMember.senha} onChange={e => setNewMember({...newMember, senha: e.target.value})} className="w-full border dark:border-gray-700 rounded-xl pl-10 pr-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Senha Inicial (min 6)" required minLength={6} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 dark:bg-gray-800 my-4" />

                    {/* SEÇÃO FINANCEIRO */}
                    <div>
                        <h4 className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <DollarSign size={14}/> Financeiro & Contrato
                        </h4>
                        <div className="grid md:grid-cols-2 gap-6 mb-4">
                             <div className="relative">
                                <Phone size={18} className="absolute left-3 top-3.5 text-gray-400" />
                                <input type="text" value={createModalOpen ? newMember.whatsapp : editingMember?.whatsapp} onChange={e => createModalOpen ? handlePhoneChange(e, setNewMember, newMember) : handlePhoneChange(e, setEditingMember, editingMember)} className="w-full border dark:border-gray-700 rounded-xl pl-10 pr-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-green-500" placeholder="WhatsApp" />
                            </div>
                            <div className="relative">
                                <DollarSign size={18} className="absolute left-3 top-3.5 text-green-600" />
                                <input type="text" value={createModalOpen ? newMember.valor_hora : editingMember?.valor_hora} onChange={e => createModalOpen ? handleCurrencyChange(e, setNewMember, newMember) : handleCurrencyChange(e, setEditingMember, editingMember)} className="w-full border border-green-200 dark:border-green-900/50 rounded-xl pl-10 pr-4 py-3 bg-green-50/30 dark:bg-green-900/10 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-green-500 font-bold" placeholder="Valor Hora (R$)" />
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-xl border border-gray-200 dark:border-gray-700/50">
                            <h5 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-1"><Landmark size={12}/> Dados Bancários</h5>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="col-span-2 md:col-span-1 relative">
                                    <Building size={14} className="absolute left-2.5 top-3 text-gray-400"/>
                                    <input type="text" value={createModalOpen ? newMember.banco : editingMember?.banco} onChange={e => { const val = e.target.value; createModalOpen ? setNewMember({...newMember, banco: val}) : setEditingMember({...editingMember, banco: val}); }} className="w-full border dark:border-gray-700 rounded-lg pl-8 pr-2 py-2 text-sm bg-white dark:bg-gray-800 outline-none focus:ring-1 focus:ring-indigo-500" placeholder="Ex: Nubank" />
                                </div>
                                <div className="col-span-2 md:col-span-1 relative">
                                    <Hash size={14} className="absolute left-2.5 top-3 text-gray-400"/>
                                    <input type="text" value={createModalOpen ? newMember.agencia : editingMember?.agencia} onChange={e => { const val = e.target.value; createModalOpen ? setNewMember({...newMember, agencia: val}) : setEditingMember({...editingMember, agencia: val}); }} className="w-full border dark:border-gray-700 rounded-lg pl-8 pr-2 py-2 text-sm bg-white dark:bg-gray-800 outline-none focus:ring-1 focus:ring-indigo-500" placeholder="0000" />
                                </div>
                                <div className="col-span-2 md:col-span-1 relative">
                                    <CreditCard size={14} className="absolute left-2.5 top-3 text-gray-400"/>
                                    <input type="text" value={createModalOpen ? newMember.conta : editingMember?.conta} onChange={e => { const val = e.target.value; createModalOpen ? setNewMember({...newMember, conta: val}) : setEditingMember({...editingMember, conta: val}); }} className="w-full border dark:border-gray-700 rounded-lg pl-8 pr-2 py-2 text-sm bg-white dark:bg-gray-800 outline-none focus:ring-1 focus:ring-indigo-500" placeholder="00000-0" />
                                </div>
                                <div className="col-span-2 md:col-span-1 relative">
                                    <Key size={14} className="absolute left-2.5 top-3 text-gray-400"/>
                                    <input type="text" value={createModalOpen ? newMember.chave_pix : editingMember?.chave_pix} onChange={e => { const val = e.target.value; createModalOpen ? setNewMember({...newMember, chave_pix: val}) : setEditingMember({...editingMember, chave_pix: val}); }} className="w-full border dark:border-gray-700 rounded-lg pl-8 pr-2 py-2 text-sm bg-white dark:bg-gray-800 outline-none focus:ring-1 focus:ring-indigo-500" placeholder="Chave" />
                                </div>
                            </div>
                        </div>
                    </div>

                </form>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3 rounded-b-2xl">
                <button onClick={() => { setCreateModalOpen(false); setEditModalOpen(false); }} className="px-6 py-2.5 rounded-xl text-gray-500 font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">Cancelar</button>
                <button onClick={() => document.getElementById('memberForm').requestSubmit()} disabled={inviteLoading || editLoading} className="px-8 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
                    {createModalOpen ? (inviteLoading ? 'Criando...' : 'Confirmar Cadastro') : (editLoading ? 'Salvando...' : 'Salvar Alterações')}
                </button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* --- RESET MODAL --- */}
      {resetModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in w-screen h-screen">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-red-100 dark:border-red-900/30">
             <div className="flex justify-between mb-4">
                <h3 className="font-bold text-lg text-red-600 flex items-center gap-2"><Lock size={20}/> Nova Senha</h3>
                <button onClick={() => setResetModalOpen(false)}><X className="text-gray-400 hover:text-gray-600"/></button>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl flex gap-3 border border-red-100 dark:border-red-900/50">
                    <AlertTriangle className="text-red-500 shrink-0" size={20} />
                    <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">Você está alterando manualmente a senha de <strong>{memberToReset?.nome}</strong>. Informe a nova senha abaixo e comunique o usuário.</p>
                </div>
                <div className="relative">
                    <Key className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    <input type="text" value={resetPassword} onChange={e => setResetPassword(e.target.value)} className="w-full border dark:border-gray-700 rounded-xl pl-10 pr-4 py-3 bg-white dark:bg-gray-800 dark:text-white font-mono text-center text-lg tracking-widest outline-none focus:ring-2 focus:ring-red-500" placeholder="Nova Senha" required minLength={6} />
                </div>
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setResetModalOpen(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl">Cancelar</button>
                    <button type="submit" disabled={resetLoading} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-200 dark:shadow-none transition-all">{resetLoading ? 'Alterando...' : 'Confirmar'}</button>
                </div>
            </form>
          </div>
        </div>, document.body
      )}

    </div>
  );
};

export default TeamManagement;