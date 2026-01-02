import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, Edit2, Save, RotateCcw, Building2, CheckCircle, XCircle } from 'lucide-react';
import supabase from '../services/supabase';

const ChannelsModal = ({ isOpen, onClose, userId }) => {
  const [canais, setCanais] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Estados do Formulário
  const [nome, setNome] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [editingId, setEditingId] = useState(null);

  // Carrega a lista de canais
  const carregarCanais = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('canais')
      .select('*')
      .order('nome', { ascending: true });

    if (error) console.error('Erro ao carregar canais:', error);
    else setCanais(data || []);
    setLoading(false);
  }, []);

  // Reseta o formulário
  const resetForm = () => {
    setNome('');
    setAtivo(true);
    setEditingId(null);
  };

  // Carrega ao abrir
  useEffect(() => {
    if (isOpen) {
      carregarCanais();
      resetForm();
    }
  }, [isOpen, carregarCanais]);

  // Prepara para editar
  const handleEditar = (canal) => {
    setEditingId(canal.id);
    setNome(canal.nome);
    setAtivo(canal.ativo);
    // Scroll para o topo para ver o form
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
      // UPDATE
      const { error: updateError } = await supabase
        .from('canais')
        .update(payload)
        .eq('id', editingId);
      error = updateError;
    } else {
      // INSERT
      const { error: insertError } = await supabase
        .from('canais')
        .insert([payload]);
      error = insertError;
    }

    if (error) {
      alert('Erro ao salvar: ' + error.message);
    } else {
      resetForm();
      carregarCanais();
    }
  };

  const handleDeletar = async (id) => {
    // Validação extra: verificar se tem serviços vinculados antes de deletar seria ideal no futuro
    if (!window.confirm('Tem certeza? Se houver serviços vinculados a este canal, pode gerar inconsistência.')) return;
    
    const { error } = await supabase.from('canais').delete().eq('id', id);
    if (error) alert('Erro ao deletar: ' + error.message);
    else {
      if (editingId === id) resetForm();
      carregarCanais();
    }
  };

  if (!isOpen) return null;

  // Cores dinâmicas
  const headerColor = editingId ? 'bg-orange-500' : 'bg-indigo-600';
  const buttonColor = editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-indigo-600 hover:bg-indigo-700';

  return (
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

        {/* Corpo */}
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
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
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

          {/* Lista de Canais */}
          <h3 className="text-sm font-bold text-gray-700 mb-3">Canais Cadastrados ({canais.length})</h3>
          
          {loading ? (
             <div className="text-center py-4 text-gray-500 text-sm">Carregando...</div>
          ) : (
            <div className="space-y-2">
              {canais.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Nenhum canal cadastrado.</p>}
              
              {canais.map(canal => {
                const isEditingItem = canal.id === editingId;

                return (
                  <div key={canal.id} className={`flex justify-between items-center p-3 rounded-lg border transition-all 
                    ${isEditingItem ? 'border-orange-400 bg-orange-50 shadow-md ring-1 ring-orange-200' : 'hover:shadow-sm bg-white'} 
                    ${!canal.ativo && !isEditingItem ? 'opacity-60 bg-gray-50' : ''}
                  `}>
                    <div className="flex flex-col flex-1 min-w-0 mr-2">
                      <span className="font-bold text-gray-800 flex items-center gap-2 truncate">
                        <Building2 size={16} className={canal.ativo ? "text-indigo-500" : "text-gray-400"} />
                        <span className="truncate">{canal.nome}</span>
                        {!canal.ativo && <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 rounded font-bold">Inativo</span>}
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

                      <button 
                        onClick={() => handleDeletar(canal.id)} 
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors"
                        title="Remover"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChannelsModal;