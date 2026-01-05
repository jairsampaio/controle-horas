import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, Building2, Calendar, Edit, X, Save, Eye } from 'lucide-react';
import supabase from '../services/supabase';

// Componente de Badge (Visual do status)
const StatusBadge = ({ status }) => {
  const styles = {
    ativo: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    inadimplente: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    cancelado: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${styles[status] || styles.cancelado}`}>
      {status || 'indefinido'}
    </span>
  );
};

// RECEBENDO A PROPS "onViewDetails" DO APP.JS
const AdminTenants = ({ onViewDetails }) => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  
  // Estados para o Modal
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Estado para controlar Edição vs Criação
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    email_admin: '', 
    plano: 'basic'
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    setLoading(true);
    // Busca na tabela 'consultorias'
    const { data, error } = await supabase
      .from('consultorias') 
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) console.error("Erro ao buscar:", error);
    else setTenants(data || []);
    setLoading(false);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ nome: '', cnpj: '', email_admin: '', plano: 'basic' });
    setShowModal(true);
  };

  const handleOpenEdit = (tenant) => {
    setEditingId(tenant.id);
    setFormData({
      nome: tenant.nome,
      cnpj: tenant.cnpj || '',
      email_admin: '', 
      plano: tenant.plano || 'basic'
    });
    setShowModal(true);
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
      let consultoriaId = editingId;

      if (editingId) {
        // --- MODO EDIÇÃO ---
        const { error } = await supabase
          .from('consultorias')
          .update({ 
            nome: formData.nome, 
            cnpj: formData.cnpj,
          })
          .eq('id', editingId);

        if (error) throw error;

      } else {
        // --- MODO CRIAÇÃO ---
        const { data: novaConsultoria, error: erroCreate } = await supabase
          .from('consultorias')
          .insert([{ 
            nome: formData.nome, 
            cnpj: formData.cnpj 
          }])
          .select()
          .single();

        if (erroCreate) throw erroCreate;
        consultoriaId = novaConsultoria.id;

        // Tenta convidar Admin
        // 2. Criar Usuário Admin via Banco de Dados (RPC)
        if (formData.email_admin) {
           const { error: rpcError } = await supabase.rpc('cadastrar_admin_consultoria', {
             email_admin: formData.email_admin,
             id_consultoria: consultoriaId // Atenção: o nome aqui tem que bater com o da função SQL
           });
           
           if (rpcError) {
             console.error("Erro RPC:", rpcError);
             alert(`Consultoria criada, mas erro ao criar usuário: ${rpcError.message}`);
           } else {
             alert(`Sucesso! Consultoria criada.\n\nUsuário: ${formData.email_admin}\nSenha Provisória: Mudar@123`);
           }
        }
      }

      setShowModal(false);
      fetchTenants(); 
    } catch (error) {
      console.error(error);
      setErrorMsg("Erro: " + (error.message || "Erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  // Filtro local
  const filteredTenants = tenants.filter(t => 
    (t.nome || '').toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <>
      <div className="space-y-6 animate-fade-in relative z-0">
        
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Empresas Cadastradas</h2>
          </div>
          <button 
            onClick={handleOpenCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
          >
            <Plus size={20} /> Nova Consultoria
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nome da empresa..." 
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Grid de Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
             <div className="col-span-full text-center py-20 text-gray-500">Carregando consultorias...</div>
          ) : filteredTenants.map(tenant => (
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
                    <span className="text-gray-500 dark:text-gray-400">Status Financeiro</span>
                    <StatusBadge status={tenant.status || 'ativo'} />
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Plano Atual</span>
                    <span className="font-medium text-gray-800 dark:text-white px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded capitalize">Basic</span>
                  </div>

                   <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Vencimento</span>
                    <div className="flex items-center gap-1 text-gray-700 dark:text-gray-200 font-medium">
                      <Calendar size={14} className="text-gray-400" />
                      N/A
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTÕES DE AÇÃO - CORRIGIDOS */}
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                {/* AQUI ESTAVA O ERRO: Agora usamos a prop onViewDetails */}
                <button 
                  onClick={() => onViewDetails && onViewDetails(tenant.id)}
                  className="flex-1 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-all flex items-center justify-center gap-2"
                >
                  <Eye size={16} /> Ver Detalhes
                </button>
                
                <button 
                  onClick={() => handleOpenEdit(tenant)}
                  className="px-3 py-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"
                  title="Editar"
                >
                  <Edit size={16} />
                </button>
              </div>

            </div>
          ))}
        </div>
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
                {editingId ? 'Editar Consultoria' : 'Nova Consultoria'}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Empresa</label>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CNPJ</label>
                <input 
                  type="text" 
                  value={formData.cnpj} 
                  onChange={e => setFormData({...formData, cnpj: e.target.value})}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="00.000.000/0000-00"
                />
              </div>

              {/* Só exibe campo de email se estiver criando (não editando) */}
              {!editingId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail do Admin (Convite)</label>
                  <input 
                    type="email" 
                    value={formData.email_admin} 
                    onChange={e => setFormData({...formData, email_admin: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="admin@empresa.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">Envia um e-mail de convite vinculando a esta empresa.</p>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
                  {saving ? 'Salvando...' : <><Save size={18} /> {editingId ? 'Salvar Alterações' : 'Criar Empresa'}</>}
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