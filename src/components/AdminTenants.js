import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@supabase/supabase-js'; 
import { 
  Search, Plus, Building2, Edit, X, Save, Eye, User, Lock, Mail, 
  Users, Ban, CheckCircle, LayoutGrid, List 
} from 'lucide-react';
import supabase from '../services/supabase';

// Componente de Badge (Visual do status)
const StatusBadge = ({ status }) => {
  const styles = {
    ativa: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    bloqueada: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    cancelada: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
  };
  
  const statusKey = styles[status] ? status : 'cancelada';
  
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${styles[statusKey]}`}>
      {status || 'indefinido'}
    </span>
  );
};

const AdminTenants = ({ onViewDetails }) => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' ou 'table'
  
  // Estados para o Modal
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Estado para controlar Edição vs Criação
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    nome_dono: '',
    email_admin: '', 
    senha_admin: '' 
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    setLoading(true);
    try {
        const { data: consultorias, error } = await supabase
            .from('consultorias') 
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;

        const { data: profiles } = await supabase
            .from('profiles')
            .select('consultoria_id');

        const counts = {};
        if (profiles) {
            profiles.forEach(p => {
                if (p.consultoria_id) {
                    counts[p.consultoria_id] = (counts[p.consultoria_id] || 0) + 1;
                }
            });
        }

        const tenantsWithCounts = (consultorias || []).map(t => ({
            ...t,
            userCount: counts[t.id] || 0
        }));

        setTenants(tenantsWithCounts);

    } catch (error) {
        console.error("Erro ao buscar:", error);
    } finally {
        setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ nome: '', cnpj: '', nome_dono: '', email_admin: '', senha_admin: '' });
    setShowModal(true);
  };

  const handleOpenEdit = async (tenant) => {
    setEditingId(tenant.id);
    
    const newData = {
      nome: tenant.nome,
      cnpj: tenant.cnpj || '',
      nome_dono: 'Carregando...', 
      email_admin: 'Carregando...', 
      senha_admin: '' 
    };
    
    setFormData(newData);
    setShowModal(true);

    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('nome, email')
        .eq('consultoria_id', tenant.id)
        .eq('cargo', 'admin') 
        .limit(1)
        .single();

    if (adminProfile) {
        setFormData(prev => ({
            ...prev,
            nome_dono: adminProfile.nome,
            email_admin: adminProfile.email
        }));
    } else {
        setFormData(prev => ({
            ...prev,
            nome_dono: 'Não encontrado',
            email_admin: '-'
        }));
    }
  };

  const toggleStatus = async (tenant) => {
      const novoStatus = tenant.status === 'ativa' ? 'bloqueada' : 'ativa';
      const actionText = novoStatus === 'ativa' ? 'ATIVAR' : 'BLOQUEAR';

      if (!window.confirm(`Tem certeza que deseja ${actionText} a empresa ${tenant.nome}?`)) return;

      try {
          const { error } = await supabase
              .from('consultorias')
              .update({ status: novoStatus })
              .eq('id', tenant.id);

          if (error) throw error;
          fetchTenants(); 
      } catch (error) {
          console.error(error);
          alert("Erro ao alterar status.");
      }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!formData.nome.trim()) {
        setErrorMsg("O nome da empresa é obrigatório.");
        return;
    }

    setSaving(true);
    try {
      if (editingId) {
        // --- EDIÇÃO ---
        const { error } = await supabase
          .from('consultorias')
          .update({ 
            nome: formData.nome, 
            cnpj: formData.cnpj,
          })
          .eq('id', editingId);

        if (error) throw error;

        if (formData.email_admin && formData.email_admin !== '-' && formData.email_admin !== 'Carregando...') {
            await supabase
                .from('profiles')
                .update({ nome: formData.nome_dono })
                .eq('email', formData.email_admin);
        }

      } else {
        // --- CRIAÇÃO ---
        if (!formData.email_admin || !formData.senha_admin || !formData.nome_dono) {
            throw new Error("Preencha todos os dados do Dono da consultoria.");
        }

        const SUPABASE_URL = 'https://ubwutmslwlefviiabysc.supabase.co'; 
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVid3V0bXNsd2xlZnZpaWFieXNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMjQ4MTgsImV4cCI6MjA4MDgwMDgxOH0.lTlvqtu0hKtYDQXJB55BG9ueZ-MdtbCtBvSNQMII2b8';

        const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
        });

        const { data: authData, error: authError } = await tempClient.auth.signUp({
            email: formData.email_admin.trim(),
            password: formData.senha_admin,
            options: { data: { nome_completo: formData.nome_dono } }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Erro ao criar usuário dono.");

        const novoUserId = authData.user.id;

        const { data: consData, error: consError } = await supabase
            .from('consultorias')
            .insert([{ 
                nome: formData.nome, 
                cnpj: formData.cnpj,
                status: 'ativa',
                plano: 'pro'
            }])
            .select()
            .single();

        if (consError) throw consError;
        const novaConsultoriaId = consData.id;

        const { error: profileError } = await supabase
            .from('profiles')
            .update({ consultoria_id: novaConsultoriaId, cargo: 'admin' })
            .eq('id', novoUserId);

        if (profileError) {
             await supabase.from('profiles').upsert({
                 id: novoUserId,
                 email: formData.email_admin,
                 nome: formData.nome_dono,
                 consultoria_id: novaConsultoriaId,
                 cargo: 'admin'
             });
        }
      }

      setShowModal(false);
      fetchTenants(); 
      alert(editingId ? "Consultoria atualizada!" : "Consultoria e Usuário Admin criados com sucesso!");

    } catch (error) {
      console.error(error);
      let msg = error.message;
      if (msg.includes('already registered')) msg = "Este e-mail já possui cadastro.";
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  const filteredTenants = tenants.filter(t => 
    (t.nome || '').toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <>
      <div className="space-y-6 animate-fade-in relative z-0">
        
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Gestão de Assinantes</h2>
            <p className="text-sm text-gray-500">Crie consultorias e defina seus administradores.</p>
          </div>
          <button 
            onClick={handleOpenCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
          >
            <Plus size={20} /> Nova Consultoria
          </button>
        </div>

        {/* Filtros e Toggle de Visualização */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nome da empresa..." 
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          {/* Toggle View */}
          <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg border border-gray-200 dark:border-gray-600 flex">
            <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                title="Cards"
            >
                <LayoutGrid size={20} />
            </button>
            <button 
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                title="Tabela"
            >
                <List size={20} />
            </button>
          </div>
        </div>

        {/* --- CONTEÚDO CONDICIONAL (GRADE OU TABELA) --- */}
        {loading ? (
             <div className="text-center py-20 text-gray-500">Carregando consultorias...</div>
        ) : (
            <>
                {/* MODO GRADE (CARDS) */}
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTenants.map(tenant => (
                            <div key={tenant.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col justify-between">
                                <div>
                                    <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start">
                                        <div className="flex gap-3">
                                            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                            <Building2 size={20} />
                                            </div>
                                            <div>
                                            <h3 className="font-bold text-gray-800 dark:text-white text-lg leading-tight">{tenant.nome}</h3>
                                            <span className="text-xs text-gray-400 font-mono">ID: {tenant.id.slice(0,8)}...</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-5 space-y-4">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500 dark:text-gray-400">Status</span>
                                            <StatusBadge status={tenant.status || 'ativa'} />
                                        </div>
                                        
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1"><Users size={14}/> Usuários</span>
                                            <span className="font-bold text-gray-800 dark:text-white px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                                                {tenant.userCount || 0}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500 dark:text-gray-400">Plano</span>
                                            <span className="font-medium text-gray-800 dark:text-white px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded capitalize">{tenant.plano || 'Pro'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                                    <button 
                                        onClick={() => onViewDetails && onViewDetails(tenant.id)}
                                        className="flex-1 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-all flex items-center justify-center gap-2"
                                    >
                                        <Eye size={16} /> Ver Detalhes
                                    </button>
                                    
                                    <button 
                                        onClick={() => handleOpenEdit(tenant)}
                                        className="px-3 py-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"
                                        title="Editar Dados"
                                    >
                                        <Edit size={16} />
                                    </button>

                                    <button 
                                        onClick={() => toggleStatus(tenant)}
                                        className={`px-3 py-1.5 rounded transition-colors ${
                                            tenant.status === 'ativa' 
                                            ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' 
                                            : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                                        }`}
                                        title={tenant.status === 'ativa' ? 'Bloquear Acesso' : 'Liberar Acesso'}
                                    >
                                        {tenant.status === 'ativa' ? <Ban size={16} /> : <CheckCircle size={16} />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* MODO TABELA */
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-800">
                                    <tr>
                                        <th className="px-6 py-3">Empresa</th>
                                        <th className="px-6 py-3">CNPJ</th>
                                        <th className="px-6 py-3">Plano</th>
                                        <th className="px-6 py-3 text-center">Usuários</th>
                                        <th className="px-6 py-3 text-center">Status</th>
                                        <th className="px-6 py-3 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {filteredTenants.map(tenant => (
                                        <tr key={tenant.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                        <Building2 size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-800 dark:text-white">{tenant.nome}</div>
                                                        <div className="text-xs text-gray-400 font-mono">ID: {tenant.id.slice(0,8)}...</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                                {tenant.cnpj || '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs capitalize">
                                                    {tenant.plano || 'Pro'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center gap-1 font-bold text-gray-700 dark:text-gray-300">
                                                    <Users size={14} className="text-gray-400"/> {tenant.userCount || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <StatusBadge status={tenant.status || 'ativa'} />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => onViewDetails && onViewDetails(tenant.id)}
                                                        className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                                                        title="Ver Detalhes"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleOpenEdit(tenant)}
                                                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => toggleStatus(tenant)}
                                                        className={`p-1.5 rounded transition-colors ${
                                                            tenant.status === 'ativa' 
                                                            ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' 
                                                            : 'text-green-500 hover:bg-green-50'
                                                        }`}
                                                        title={tenant.status === 'ativa' ? 'Bloquear' : 'Ativar'}
                                                    >
                                                        {tenant.status === 'ativa' ? <Ban size={16} /> : <CheckCircle size={16} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </>
        )}
      </div>

      {/* --- MODAL (CREATE / EDIT) --- */}
      {showModal && createPortal(
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
                <Building2 className="text-indigo-600" /> 
                {editingId ? 'Editar Consultoria' : 'Nova Assinatura'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm rounded-lg border border-red-200 dark:border-red-800">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSalvar} className="space-y-4">
              
              {/* DADOS DA EMPRESA */}
              <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 pb-1">Dados da Empresa</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome Fantasia</label>
                    <input 
                      type="text" 
                      value={formData.nome} 
                      onChange={e => setFormData({...formData, nome: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ex: Consultoria ABC Ltda"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CNPJ (Opcional)</label>
                    <input 
                      type="text" 
                      value={formData.cnpj} 
                      onChange={e => setFormData({...formData, cnpj: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
              </div>

              {/* DADOS DO DONO (VISÍVEL NA CRIAÇÃO E NA EDIÇÃO) */}
              <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 pb-1">
                      {editingId ? 'Responsável Principal (Dono)' : 'Dados do Dono (Admin)'}
                  </h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Responsável</label>
                    <div className="relative">
                        <User size={18} className="absolute left-3 top-2.5 text-gray-400" />
                        <input 
                        type="text" 
                        value={formData.nome_dono} 
                        onChange={e => setFormData({...formData, nome_dono: e.target.value})}
                        className="w-full pl-10 rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
                        placeholder="Ex: Carlos Silva"
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
                        value={formData.email_admin} 
                        onChange={e => setFormData({...formData, email_admin: e.target.value})}
                        className={`w-full pl-10 rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 ${editingId ? 'opacity-60 cursor-not-allowed' : ''}`}
                        placeholder="admin@empresa.com"
                        required
                        disabled={!!editingId} // Email não edita na tela de tenants (segurança)
                        />
                    </div>
                    {editingId && <p className="text-[10px] text-gray-400 mt-1">O e-mail do dono não pode ser alterado por aqui.</p>}
                  </div>

                  {!editingId && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha Inicial</label>
                        <div className="relative">
                            <Lock size={18} className="absolute left-3 top-2.5 text-gray-400" />
                            <input 
                            type="text" 
                            value={formData.senha_admin} 
                            onChange={e => setFormData({...formData, senha_admin: e.target.value})}
                            className="w-full pl-10 rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Ex: Mudar@123"
                            required
                            />
                        </div>
                      </div>
                  )}
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
                  {saving ? 'Processando...' : <><Save size={18} /> {editingId ? 'Salvar Alterações' : 'Criar Tudo'}</>}
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

export default AdminTenants;