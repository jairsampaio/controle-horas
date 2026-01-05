import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // <--- IMPORTANTE: Importar o Portal
import { Search, Plus, Filter, Building2, Calendar, Ban, CheckCircle, MoreHorizontal, Edit, X, Save } from 'lucide-react';
import supabase from '../services/supabase';

// Componente de Badge
const StatusBadge = ({ status }) => {
  const styles = {
    ativo: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    inadimplente: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    cancelado: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${styles[status] || styles.cancelado}`}>
      {status}
    </span>
  );
};

const AdminTenants = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  
  // Estados para o Modal de Nova Consultoria
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome_empresa: '',
    plano: 'basic'
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_erp_metrics');
    if (error) console.error(error);
    else setTenants(data || []);
    setLoading(false);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!formData.nome_empresa.trim()) return alert("Digite o nome da empresa.");

    setSaving(true);
    try {
      // Cria a nova consultoria na tabela tenants
      const { error } = await supabase.from('tenants').insert([
        {
          nome_empresa: formData.nome_empresa,
          plano: formData.plano,
          status_financeiro: 'ativo',
          // O trigger do banco vai preencher created_at e id automaticamente
        }
      ]);

      if (error) throw error;

      alert("Consultoria cadastrada com sucesso!");
      setShowModal(false);
      setFormData({ nome_empresa: '', plano: 'basic' }); // Limpa o form
      fetchTenants(); // Recarrega a lista
    } catch (error) {
      console.error(error);
      alert("Erro ao criar consultoria: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredTenants = tenants.filter(t => 
    t.nome_empresa.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in relative z-0">
        
        {/* Cabeçalho da Página */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Gestão de Assinantes</h1>
            <p className="text-gray-500 dark:text-gray-400">Gerencie as consultorias que utilizam seu SaaS.</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
          >
            <Plus size={20} /> Nova Consultoria
          </button>
        </div>

        {/* Filtros e Busca */}
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
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Filter size={18} /> Filtros
          </button>
        </div>

        {/* Grid de Cards (Estilo ERP Moderno) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
             <div className="col-span-full text-center py-20 text-gray-500">Carregando carteira de clientes...</div>
          ) : filteredTenants.map(tenant => (
            <div key={tenant.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 group">
              
              {/* Header do Card */}
              <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start">
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-white text-lg leading-tight">{tenant.nome_empresa}</h3>
                    <span className="text-xs text-gray-400 font-mono">ID: {tenant.id.slice(0,8)}...</span>
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="text-gray-400 hover:text-indigo-600 p-1"><MoreHorizontal size={20} /></button>
                </div>
              </div>

              {/* Corpo do Card */}
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Status Financeiro</span>
                  <StatusBadge status={tenant.status_financeiro} />
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Plano Atual</span>
                  <span className="font-medium text-gray-800 dark:text-white px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded capitalize">{tenant.plano}</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Vencimento</span>
                  <div className="flex items-center gap-1 text-gray-700 dark:text-gray-200 font-medium">
                    <Calendar size={14} className="text-gray-400" />
                    {tenant.data_vencimento ? new Date(tenant.data_vencimento).toLocaleDateString() : 'N/A'}
                  </div>
                </div>

                {/* Estatísticas Rápidas */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded-lg text-center">
                     <span className="block text-xl font-bold text-gray-800 dark:text-white">{tenant.total_usuarios}</span>
                     <span className="text-[10px] uppercase text-gray-500 tracking-wider">Usuários</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded-lg text-center">
                     <span className="block text-xl font-bold text-gray-800 dark:text-white">{tenant.total_clientes_cadastrados}</span>
                     <span className="text-[10px] uppercase text-gray-500 tracking-wider">Clientes</span>
                  </div>
                </div>
              </div>

              {/* Footer / Ações Rápidas */}
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                <button className="flex-1 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 rounded shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-all">
                  Ver Detalhes
                </button>
                <button className="px-3 py-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors">
                  <Edit size={16} />
                </button>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* --- MODAL DE NOVA CONSULTORIA COM PORTAL --- */}
      {showModal && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div 
            className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-gray-800 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Building2 className="text-indigo-600" /> Nova Consultoria
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSalvar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Empresa</label>
                <input 
                  type="text" 
                  value={formData.nome_empresa} 
                  onChange={e => setFormData({...formData, nome_empresa: e.target.value})}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Consultoria ABC Ltda"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plano Inicial</label>
                <select 
                  value={formData.plano}
                  onChange={e => setFormData({...formData, plano: e.target.value})}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-100 dark:border-yellow-900/30 text-xs text-yellow-800 dark:text-yellow-200">
                <strong>Nota:</strong> Após criar a empresa, você precisará criar um usuário administrador e vinculá-lo a este ID de Tenant manualmente ou via convite (Funcionalidade futura).
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
                  {saving ? 'Criando...' : <><Save size={18} /> Criar Empresa</>}
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