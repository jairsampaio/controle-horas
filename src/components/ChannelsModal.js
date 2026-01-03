import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, Edit2, Save, RotateCcw, Building2, Eye, EyeOff, Ban } from 'lucide-react'; // 👈 Novos ícones
import supabase from '../services/supabase';
import ConfirmModal from './ConfirmModal'; // 👈 Importando o Modal de Confirmação

const ChannelsModal = ({ isOpen, onClose, userId, showToast }) => { // 👈 Recebendo showToast se disponível
  const [canais, setCanais] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mostrarInativos, setMostrarInativos] = useState(false); // 👈 Toggle do Olho
  
  // Estados do Formulário
  const [nome, setNome] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [editingId, setEditingId] = useState(null);

  // Estados para o Modal de Confirmação
  const [showConfirm, setShowConfirm] = useState(false);
  const [canalAlvo, setCanalAlvo] = useState(null);

  // Carrega a lista de canais
  const carregarCanais = useCallback(async () => {
    setLoading(true);
    
    let query = supabase
      .from('canais')
      .select('*')
      .order('nome', { ascending: true });

    // Se o olho estiver fechado, traz apenas os ativos
    if (!mostrarInativos) {
        query = query.eq('ativo', true);
    }

    const { data, error } = await query;

    if (error) console.error('Erro ao carregar canais:', error);
    else setCanais(data || []);
    setLoading(false);
  }, [mostrarInativos]);

  const resetForm = () => {
    setNome('');
    setAtivo(true);
    setEditingId(null);
  };

  useEffect(() => {
    if (isOpen) {
      carregarCanais();
      resetForm();
    }
  }, [isOpen, carregarCanais]);

  const handleEditar = (canal) => {
    setEditingId(canal.id);
    setNome(canal.nome);
    setAtivo(canal.ativo);
    document.querySelector('.form-area-canal')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!nome.trim()) return;

    const payload = {
      nome: nome,
      ativo: ativo,
      user_id: userId
    };

    let error;

    if (editingId) {
      const { error: updateError } = await supabase.from('canais').update(payload).eq('id', editingId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('canais').insert([payload]);
      error = insertError;
    }

    if (error) {
      if(showToast) showToast('Erro ao salvar: ' + error.message, 'erro');
      else alert('Erro: ' + error.message);
    } else {
      if(showToast) showToast(editingId ? 'Canal atualizado!' : 'Canal criado!', 'sucesso');
      resetForm();
      carregarCanais();
    }
  };

  // 1. Solicitar Inativação
  const solicitarInativacao = (canal) => {
    setCanalAlvo(canal);
    setShowConfirm(true);
  };

  // 2. Confirmar Inativação (Soft Delete)
  const confirmarInativacao = async () => {
    if (!canalAlvo) return;

    const { error } = await supabase
        .from('canais')
        .update({ ativo: false })
        .eq('id', canalAlvo.id);

    if (!error) {
        if(showToast) showToast('Canal inativado.', 'sucesso');
        if (editingId === canalAlvo.id) resetForm();
        carregarCanais();
    } else {
        if(showToast) showToast('Erro ao inativar.', 'erro');
    }
    setCanalAlvo(null);
  };

  // 3. Reativar
  const handleReativar = async (id) => {
      const { error } = await supabase.from('canais').update({ ativo: true }).eq('id', id);
      if (!error) {
          if(showToast) showToast('Canal reativado!', 'sucesso');
          carregarCanais();
      }
  };

  if (!isOpen) return null;

  const headerColor = editingId ? 'bg-orange-500' : 'bg-indigo-600';
  const buttonColor = editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-indigo-600 hover:bg-indigo-700';

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
          
          {/* Cabeçalho */}
          <div className={`p-4 flex justify-between items-center text-white transition-colors duration-300 ${headerColor}`}>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Building2 size={20} />
                {editingId ? 'Editando Canal' : 'Gestão de Canais'}
              </h2>
              <p className="text-xs opacity-90">Parceiros e Intermediários</p>
            </div>
            <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors"><X size={20} /></button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            
            {/* Formulário */}
            <form onSubmit={handleSalvar} className={`form-area-canal p-4 rounded-lg mb-6 border transition-colors space-y-3 ${editingId ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
              <h3 className={`text-sm font-bold flex items-center gap-2 ${editingId ? 'text-orange-700' : 'text-gray-700'}`}>
                {editingId ? <Edit2 size={16} /> : <Plus size={16} />} 
                {editingId ? 'Editar Dados' : 'Novo Canal / Parceiro'}
              </h3>
              
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Nome da Consultoria / Canal"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                  required
                />
                
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="checkAtivo" 
                    checked={ativo} 
                    onChange={e => setAtivo(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="checkAtivo" className="text-sm text-gray-700 font-medium select-none cursor-pointer flex items-center gap-1">
                    Canal Ativo?
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                 {editingId && (
                  <button 
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 flex justify-center items-center gap-2"
                  >
                    <RotateCcw size={16} /> Cancelar
                  </button>
                 )}

                <button 
                  type="submit" 
                  className={`flex-1 text-white py-2 rounded-lg text-sm font-medium flex justify-center items-center gap-2 transition-colors ${buttonColor}`}
                >
                  <Save size={16} /> <span className="font-bold">Salvar</span>
                </button>
              </div>
            </form>

            {/* Cabeçalho da Lista + Toggle Olho */}
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    Canais ({canais.length})
                </h3>
                <button 
                    onClick={() => setMostrarInativos(!mostrarInativos)}
                    className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${mostrarInativos ? 'bg-orange-100 text-orange-700' : 'text-gray-400 hover:bg-gray-100'}`}
                    title={mostrarInativos ? "Ocultar Inativos" : "Ver Inativos"}
                >
                    {mostrarInativos ? <EyeOff size={14}/> : <Eye size={14}/>}
                    {mostrarInativos ? "Ocultar" : "Ver Inativos"}
                </button>
            </div>
            
            {loading ? (
               <div className="text-center py-4 text-gray-500 text-sm">Carregando...</div>
            ) : (
              <div className="space-y-2">
                {canais.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Nenhum canal encontrado.</p>}
                
                {canais.map(canal => {
                  const isEditingItem = canal.id === editingId;
                  const isInactive = !canal.ativo;

                  return (
                    <div key={canal.id} className={`flex justify-between items-center p-3 rounded-lg border transition-all 
                      ${isEditingItem ? 'border-orange-400 bg-orange-50 shadow-md ring-1 ring-orange-200' : 'hover:shadow-sm bg-white'} 
                      ${isInactive && !isEditingItem ? 'bg-gray-100 border-gray-200 opacity-75' : ''}
                    `}>
                      <div className="flex flex-col flex-1 min-w-0 mr-2">
                        <span className={`font-bold flex items-center gap-2 truncate ${isInactive ? 'text-gray-500 decoration-gray-400 line-through' : 'text-gray-800'}`}>
                          <Building2 size={16} className={isInactive ? "text-gray-400" : "text-indigo-500"} />
                          <span className="truncate">{canal.nome}</span>
                          {isInactive && <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 rounded font-bold no-underline">Inativo</span>}
                        </span>
                      </div>
                      
                      {/* Botões de Ação */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button 
                          onClick={() => handleEditar(canal)} 
                          className="text-blue-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>

                        {/* Botão Dinâmico: Inativar vs Restaurar */}
                        {!isInactive ? (
                            <button 
                              onClick={() => solicitarInativacao(canal)} 
                              className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors"
                              title="Inativar"
                            >
                              <Trash2 size={16} />
                            </button>
                        ) : (
                            <button 
                              onClick={() => handleReativar(canal.id)} 
                              className="text-orange-400 hover:text-orange-600 hover:bg-orange-50 p-2 rounded-full transition-colors"
                              title="Restaurar"
                            >
                              <RotateCcw size={16} />
                            </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Confirmação */}
      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmarInativacao}
        title="Inativar Canal?"
        message={`Deseja realmente inativar "${canalAlvo?.nome}"? Ele não aparecerá mais como opção em novos serviços.`}
        confirmText="Sim, inativar"
        cancelText="Cancelar"
        type="danger"
      />
    </>
  );
};

export default ChannelsModal;