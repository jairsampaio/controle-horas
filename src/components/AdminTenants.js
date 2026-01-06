import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@supabase/supabase-js'; // <--- IMPORTANTE
import { Search, Plus, Building2, Edit, X, Save, Eye, User, Lock, Mail } from 'lucide-react';
import supabase from '../services/supabase';

// Componente de Badge (Visual do status)
const StatusBadge = ({ status }) => {
  const styles = {
    ativa: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    inadimplente: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    cancelada: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${styles[status] || styles.cancelada}`}>
      {status || 'indefinido'}
    </span>
  );
};

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
    // Campos exclusivos para criação (Dono)
    nome_dono: '',
    email_admin: '', 
    senha_admin: '' 
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    setLoading(true);
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
    setFormData({ nome: '', cnpj: '', nome_dono: '', email_admin: '', senha_admin: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (tenant) => {
    setEditingId(tenant.id);
    setFormData({
      nome: tenant.nome,
      cnpj: tenant.cnpj || '',
      nome_dono: '', // Não edita dono aqui
      email_admin: '', 
      senha_admin: ''
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
      if (editingId) {
        // --- MODO EDIÇÃO (Simples Update) ---
        const { error } = await supabase
          .from('consultorias')
          .update({ 
            nome: formData.nome, 
            cnpj: formData.cnpj,
          })
          .eq('id', editingId);

        if (error) throw error;

      } else {
        // --- MODO CRIAÇÃO (Fluxo Corrigido via React) ---
        
        // 1. Validações
        if (!formData.email_admin || !formData.senha_admin || !formData.nome_dono) {
            throw new Error("Preencha todos os dados do Dono da consultoria.");
        }

        // ==============================================================================
        // ⚠️ ATENÇÃO: SUBSTITUA ABAIXO PELA SUA URL E KEY (Igual fez no TeamManagement)
        // ==============================================================================
        const SUPABASE_URL = 'https://ubwutmslwlefviiabysc.supabase.co'; 
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVid3V0bXNsd2xlZnZpaWFieXNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMjQ4MTgsImV4cCI6MjA4MDgwMDgxOH0.lTlvqtu0hKtYDQXJB55BG9ueZ-MdtbCtBvSNQMII2b8';
        // ==============================================================================

        // Cliente Temporário para criar o usuário sem deslogar o Admin
        const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
        });

        // 2. Cria o Usuário DONO (Agora a senha vai ser gerada corretamente!)
        const { data: authData, error: authError } = await tempClient.auth.signUp({
            email: formData.email_admin.trim(),
            password: formData.senha_admin,
            options: {
                data: { nome_completo: formData.nome_dono }
            }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Erro ao criar usuário dono.");

        const novoUserId = authData.user.id;

        // 3. Cria a Consultoria na tabela
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

        // 4. Vincula o Usuário criado à Consultoria e define como ADMIN
        // O trigger de criação de usuário já criou o perfil, agora só atualizamos
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ 
                consultoria_id: novaConsultoriaId,
                cargo: 'admin' // Define como Dono/Admin
            })
            .eq('id', novoUserId);

        if (profileError) {
             // Tenta update manual caso o trigger tenha falhado ou demorado
             console.error("Erro ao vincular perfil, tentando insert manual de segurança...", profileError);
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
                    <span className="text-gray-500 dark:text-gray-400">Status</span>
                    <StatusBadge status={tenant.status || 'ativa'} />
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Plano</span>
                    <span className="font-medium text-gray-800 dark:text-white px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded capitalize">{tenant.plano || 'Pro'}</span>
                  </div>
                </div>
              </div>

              {/* BOTÕES DE AÇÃO */}
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

              {/* DADOS DO DONO (SÓ APARECE NO MODO CRIAÇÃO) */}
              {!editingId && (
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 pb-1">Dados do Dono (Admin)</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Responsável</label>
                    <div className="relative">
                        <User size={18} className="absolute left-3 top-2.5 text-gray-400" />
                        <input 
                        type="text" 
                        value={formData.nome_dono} 
                        onChange={e => setFormData({...formData, nome_dono: e.target.value})}
                        className="w-full pl-10 rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
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
                        className="w-full pl-10 rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="admin@empresa.com"
                        required
                        />
                    </div>
                  </div>

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
                </div>
              )}

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