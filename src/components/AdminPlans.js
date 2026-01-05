import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // <--- IMPORTANTE: Importar o Portal
import { 
  Package, Check, Edit, Trash2, Plus, X, Star, Users
} from 'lucide-react';
import supabase from '../services/supabase';
import { formatCurrency } from '../utils/formatters';

const AdminPlans = () => {
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  // Estado do formulário
  const [formData, setFormData] = useState({
    nome: '',
    valor_mensal: '',
    limite_usuarios: 5,
    descricao: '',
    destaque: false,
    ativo: true
  });

  useEffect(() => {
    carregarPlanos();
  }, []);

  const carregarPlanos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('saas_planos')
      .select('*')
      .order('valor_mensal', { ascending: true });
    
    if (error) console.error(error);
    else setPlanos(data || []);
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        const { error } = await supabase
          .from('saas_planos')
          .update(formData)
          .eq('id', editingPlan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('saas_planos')
          .insert([formData]);
        if (error) throw error;
      }
      
      setModalOpen(false);
      setEditingPlan(null);
      resetForm();
      carregarPlanos();
    } catch (error) {
      alert('Erro ao salvar plano: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza? Isso pode afetar clientes vinculados.')) return;
    const { error } = await supabase.from('saas_planos').delete().eq('id', id);
    if (!error) carregarPlanos();
  };

  const openModal = (plano = null) => {
    if (plano) {
      setEditingPlan(plano);
      setFormData(plano);
    } else {
      setEditingPlan(null);
      resetForm();
    }
    setModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      valor_mensal: '',
      limite_usuarios: 5,
      descricao: '',
      destaque: false,
      ativo: true
    });
  };

  // Componente interno do Modal para usar no Portal
  const ModalContent = () => (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-700 animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()} // Evita fechar se clicar dentro
      >
        
        {/* Cabeçalho Colorido */}
        <div className="bg-indigo-600 p-4 flex justify-between items-center text-white shrink-0">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Package size={20} />
              {editingPlan ? 'Editar Plano' : 'Novo Plano'}
            </h2>
            <p className="text-xs opacity-90">Definição de produto e preço</p>
          </div>
          <button onClick={() => setModalOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
                <input 
                  type="text" 
                  value={formData.nome} 
                  onChange={e => setFormData({...formData, nome: e.target.value})}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 p-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Gold"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor (R$)</label>
                <input 
                  type="number" step="0.01"
                  value={formData.valor_mensal} 
                  onChange={e => setFormData({...formData, valor_mensal: e.target.value})}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 p-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
              <input 
                type="text"
                value={formData.descricao} 
                onChange={e => setFormData({...formData, descricao: e.target.value})}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 p-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ex: Para empresas que buscam..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Limite Usuários</label>
                <input 
                  type="number"
                  value={formData.limite_usuarios} 
                  onChange={e => setFormData({...formData, limite_usuarios: e.target.value})}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 p-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex flex-col justify-end gap-2">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" id="destaque"
                    checked={formData.destaque}
                    onChange={e => setFormData({...formData, destaque: e.target.checked})}
                    className="w-4 h-4 text-indigo-600 rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  />
                  <label htmlFor="destaque" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">Destacar?</label>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" id="ativo"
                    checked={formData.ativo}
                    onChange={e => setFormData({...formData, ativo: e.target.checked})}
                    className="w-4 h-4 text-indigo-600 rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  />
                  <label htmlFor="ativo" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">Ativo?</label>
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                Cancelar
              </button>
              <button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95">
                Salvar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
        
        {/* Header da Página */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              Planos & Preços
            </h1>
            <p className="text-gray-500 dark:text-gray-400">Defina os produtos e limites do seu SaaS.</p>
          </div>
          <button 
            onClick={() => openModal()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
          >
            <Plus size={20} /> Novo Plano
          </button>
        </div>

        {/* Grid de Planos */}
        {loading ? (
          <div className="text-center py-10 text-gray-500">Carregando planos...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {planos.map((plano) => (
              <div 
                key={plano.id} 
                className={`relative bg-white dark:bg-gray-800 rounded-2xl p-6 border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group
                  ${plano.destaque 
                    ? 'border-indigo-500 dark:border-indigo-500 ring-4 ring-indigo-50 dark:ring-indigo-900/20' 
                    : 'border-gray-200 dark:border-gray-700 shadow-sm'
                  }
                  ${!plano.ativo ? 'opacity-60 grayscale' : ''}
                `}
              >
                {plano.destaque && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest py-1 px-3 rounded-full flex items-center gap-1">
                    <Star size={10} fill="white" /> Recomendado
                  </div>
                )}

                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl ${plano.destaque ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                    <Package size={24} />
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openModal(plano)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit size={18} /></button>
                    <button onClick={() => handleDelete(plano.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{plano.nome}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm h-10 line-clamp-2 mb-6">{plano.descricao}</p>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-black text-gray-900 dark:text-white">{formatCurrency(plano.valor_mensal).split(',')[0]}</span>
                  <span className="text-sm font-bold text-gray-500">,{formatCurrency(plano.valor_mensal).split(',')[1]} /mês</span>
                </div>

                <div className="space-y-3 pt-6 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <div className="bg-green-100 dark:bg-green-900/30 text-green-600 p-1 rounded-full"><Users size={12} /></div>
                    Até <strong>{plano.limite_usuarios} usuários</strong>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <div className="bg-green-100 dark:bg-green-900/30 text-green-600 p-1 rounded-full"><Check size={12} /></div>
                    Dashboard Completo
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <div className="bg-green-100 dark:bg-green-900/30 text-green-600 p-1 rounded-full"><Check size={12} /></div>
                    Suporte Prioritário
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AQUI ESTÁ A MÁGICA: PORTAL PARA O BODY */}
      {modalOpen && createPortal(
        <ModalContent />,
        document.body
      )}
    </>
  );
};

export default AdminPlans;