import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Edit2, RotateCcw, Building2, Eye, EyeOff, Search, AlertCircle } from 'lucide-react';
import supabase from '../services/supabase';
import ConfirmModal from './ConfirmModal';
import ChannelModal from './ChannelModal';

const ChannelsManagement = ({
  userId,
  showToast,

  // Mesmo padrão de ServicesTable/ClientsTable:
  // pode criar, editar, inativar/reativar canal.
  // Admin, Dono, GP e Super Admin recebem true.
  isAdmin,
}) => {
  const [canais, setCanais] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [busca, setBusca] = useState('');

  // Estado para armazenar o ID da consultoria
  const [consultoriaId, setConsultoriaId] = useState(null);

  // Estados do Formulário / Modal
  const [showModal, setShowModal] = useState(false);
  const [editingCanal, setEditingCanal] = useState(null);
  const [formData, setFormData] = useState({ nome: '', ativo: true });

  // Estados para o Modal de Confirmação
  const [showConfirm, setShowConfirm] = useState(false);
  const [canalAlvo, setCanalAlvo] = useState(null);

  // --- 1. BUSCAR A CONSULTORIA DO USUÁRIO ---
  useEffect(() => {
    const fetchConsultoria = async () => {
      if (!userId) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('consultoria_id')
        .eq('id', userId)
        .single();
      
      if (data && !error) {
        setConsultoriaId(data.consultoria_id);
      }
    };
    fetchConsultoria();
  }, [userId]);

  // --- 2. CARREGAR CANAIS (Pela Consultoria) ---
  const carregarCanais = useCallback(async () => {
    // Só carrega se já tivermos o ID da consultoria para garantir filtro correto
    if (!consultoriaId) return; 

    setLoading(true);
    try {
        let query = supabase
          .from('canais')
          .select('*')
          .eq('consultoria_id', consultoriaId) 
          .order('nome', { ascending: true });

        if (!mostrarInativos) {
            query = query.eq('ativo', true);
        }

        const { data, error } = await query;

        if (error) throw error;
        setCanais(data || []);
        
    } catch (error) {
        console.error('Erro ao carregar canais:', error);
        if (showToast) showToast('Erro ao carregar lista.', 'erro');
    } finally {
        setLoading(false);
    }
  }, [mostrarInativos, consultoriaId, showToast]);

  useEffect(() => {
    carregarCanais();
  }, [carregarCanais]);

  const resetForm = () => {
    setFormData({ nome: '', ativo: true });
    setEditingCanal(null);
  };

  const handleEditar = (canal) => {
    setEditingCanal(canal);
    setFormData({ nome: canal.nome, ativo: canal.ativo });
    setShowModal(true);
  };

  // --- 3. SALVAR (Incluindo consultoria_id) ---
  const handleSalvar = async () => {
    if (!formData.nome.trim()) return;

    // Validação de segurança: Nunca salvar sem vincular à consultoria
    if (!userId || !consultoriaId) {
        if(showToast) showToast('Erro crítico: Consultoria não identificada.', 'erro');
        return;
    }

    const payload = {
      nome: formData.nome,
      ativo: formData.ativo,
      user_id: userId, // Log de quem criou/editou
      consultoria_id: consultoriaId // Vínculo obrigatório
    };

    let error;

    if (editingCanal) {
      const { error: updateError } = await supabase.from('canais').update(payload).eq('id', editingCanal.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('canais').insert([payload]);
      error = insertError;
    }

    if (error) {
      console.error(error);
      if(showToast) showToast('Erro ao salvar: ' + error.message, 'erro');
    } else {
      if(showToast) showToast(editingCanal ? 'Canal atualizado!' : 'Canal criado!', 'sucesso');
      setShowModal(false);
      resetForm();
      carregarCanais();
    }
  };

  // --- INATIVAÇÃO ---
  const solicitarInativacao = (canal) => {
    setCanalAlvo(canal);
    setShowConfirm(true);
  };

  const confirmarInativacao = async () => {
    if (!canalAlvo) return;

    const { error } = await supabase
        .from('canais')
        .update({ ativo: false })
        .eq('id', canalAlvo.id);

    if (!error) {
        if(showToast) showToast('Canal inativado.', 'sucesso');
        if (editingCanal?.id === canalAlvo.id) resetForm();
        carregarCanais();
    } else {
        if(showToast) showToast('Erro ao inativar.', 'erro');
    }
    setCanalAlvo(null);
    setShowConfirm(false);
  };

  const handleReativar = async (id) => {
      const { error } = await supabase.from('canais').update({ ativo: true }).eq('id', id);
      if (!error) {
          if(showToast) showToast('Canal reativado!', 'sucesso');
          carregarCanais();
      }
  };

  // Filtro de busca local
  const canaisFiltrados = canais.filter(c => 
    c.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in relative z-0 pb-10">
      
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Building2 className="text-indigo-600" /> Canais & Parceiros
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Gerencie as origens dos seus serviços (Indicações, Parcerias, etc).</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-3 md:px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center gap-2"
            title="Cadastrar Novo"
          >
            <Plus size={18} />
            <span>Cadastrar</span>
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col min-h-[400px]">

          {/* Barra de Filtro */}
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center gap-4">
                      <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input 
                              type="text" 
                              placeholder="Buscar canais..." 
                              value={busca}
                              onChange={e => setBusca(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                      </div>
                      <button 
                          onClick={() => setMostrarInativos(!mostrarInativos)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border
                              ${mostrarInativos 
                                  ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800' 
                                  : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50'}`}
                      >
                          {mostrarInativos ? <EyeOff size={16}/> : <Eye size={16}/>}
                          <span className="hidden sm:inline">{mostrarInativos ? 'Ocultar Inativos' : 'Ver Inativos'}</span>
                      </button>
                  </div>

                  {/* Lista Renderizada */}
                  <div className="flex-1 p-2 space-y-2">
                      {loading ? (
                          <div className="text-center py-10 text-gray-400 animate-pulse">Carregando canais...</div>
                      ) : canaisFiltrados.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                              <AlertCircle size={32} className="mb-2 opacity-50" />
                              <p>Nenhum canal encontrado.</p>
                          </div>
                      ) : (
                          canaisFiltrados.map(canal => {
                              const isEditing = canal.id === editingCanal?.id;
                              const isInactive = !canal.ativo;

                              return (
                                  <div key={canal.id} className={`group flex justify-between items-center p-4 rounded-xl border transition-all duration-200
                                      ${isEditing 
                                          ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 ring-1 ring-orange-200' 
                                          : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-200 dark:hover:border-indigo-900 hover:shadow-md'}
                                      ${isInactive && !isEditing ? 'opacity-60 bg-gray-50' : ''}
                                  `}>
                                      <div className="flex items-center gap-3">
                                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center 
                                              ${isInactive ? 'bg-gray-200 text-gray-400' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
                                              <Building2 size={20} />
                                          </div>
                                          <div>
                                              <h4 className={`font-bold text-sm ${isInactive ? 'text-gray-500 line-through' : 'text-gray-800 dark:text-white'}`}>
                                                  {canal.nome}
                                              </h4>
                                              {isInactive && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase">Inativo</span>}
                                          </div>
                                      </div>

                                      {isAdmin && (
                                        <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEditar(canal)}
                                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 size={18} />
                                            </button>

                                            {isInactive ? (
                                                <button
                                                    onClick={() => handleReativar(canal.id)}
                                                    className="p-2 text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                                    title="Reativar"
                                                >
                                                    <RotateCcw size={18} />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => solicitarInativacao(canal)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Inativar"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                      )}
                                  </div>
                              );
                          })
                      )}
                  </div>
      </div>

      {showConfirm && createPortal(
        <ConfirmModal
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={confirmarInativacao}
          title="Inativar Canal?"
          message={`Deseja realmente inativar "${canalAlvo?.nome}"? Ele não aparecerá mais como opção em novos serviços.`}
          confirmText="Sim, inativar"
          cancelText="Cancelar"
          type="danger"
        />,
        document.body
      )}

      {showModal && createPortal(
        <ChannelModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSave={handleSalvar}
          formData={formData}
          setFormData={setFormData}
          isEditing={!!editingCanal}
        />,
        document.body
      )}
    </div>
  );
};

export default ChannelsManagement;