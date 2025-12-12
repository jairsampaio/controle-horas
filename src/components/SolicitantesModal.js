import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, User, Mail, Save, Shield, Edit2, RotateCcw } from 'lucide-react'; // 👈 Adicionei Edit2 e RotateCcw
import supabase from '../services/supabase';

const SolicitantesModal = ({ isOpen, onClose, cliente, userId }) => {
  const [solicitantes, setSolicitantes] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Estados do Formulário
  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [isCoordenador, setIsCoordenador] = useState(false);
  const [coordenadorId, setCoordenadorId] = useState('');
  
  // 🆕 Estado para controlar EDICÃO
  const [editingId, setEditingId] = useState(null);

  const carregarSolicitantes = useCallback(async () => {
    if (!cliente) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('solicitantes')
      .select('*')
      .eq('cliente_id', cliente.id)
      .order('nome', { ascending: true });

    if (error) console.error(error);
    else setSolicitantes(data || []);
    setLoading(false);
  }, [cliente]);

  // Reseta o formulário ao abrir ou cancelar
  const resetForm = () => {
    setNovoNome('');
    setNovoEmail('');
    setIsCoordenador(false);
    setCoordenadorId('');
    setEditingId(null); // Sai do modo edição
  };

  useEffect(() => {
    if (isOpen && cliente) {
      carregarSolicitantes();
      resetForm();
    }
  }, [isOpen, cliente, carregarSolicitantes]);

  // Função para preencher o formulário com os dados do item clicado
  const handleEditar = (sol) => {
    setEditingId(sol.id);
    setNovoNome(sol.nome);
    setNovoEmail(sol.email || '');
    setIsCoordenador(sol.is_coordenador);
    // Se tiver chefe, seta o ID. Se não, vazio.
    setCoordenadorId(sol.coordenador_id || '');
    
    // Rola para o topo do form (UX)
    document.querySelector('.form-area')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!novoNome.trim()) return;

    const payload = {
      nome: novoNome,
      email: novoEmail,
      is_coordenador: isCoordenador,
      cliente_id: cliente.id,
      user_id: userId,
      // Se for coordenador, zera o chefe. Se for subordinado, usa o ID do select.
      coordenador_id: isCoordenador ? null : (coordenadorId || null) 
    };

    let error;

    if (editingId) {
      // --- MODO EDIÇÃO (UPDATE) ---
      const { error: updateError } = await supabase
        .from('solicitantes')
        .update(payload)
        .eq('id', editingId);
      error = updateError;
    } else {
      // --- MODO CRIAÇÃO (INSERT) ---
      const { error: insertError } = await supabase
        .from('solicitantes')
        .insert([payload]);
      error = insertError;
    }

    if (error) {
      alert('Erro ao salvar: ' + error.message);
    } else {
      resetForm();
      carregarSolicitantes();
    }
  };

  const handleDeletar = async (id) => {
    if (!window.confirm('Tem certeza? Se essa pessoa for chefe de alguém, o vínculo será quebrado.')) return;
    
    const { error } = await supabase.from('solicitantes').delete().eq('id', id);
    if (error) alert('Erro ao deletar: ' + error.message);
    else {
      // Se deletou quem estava sendo editado, limpa o form
      if (editingId === id) resetForm();
      carregarSolicitantes();
    }
  };

  if (!isOpen) return null;

  // Filtra lista de chefes para o Select (exclui a própria pessoa se estiver editando para não ser chefe de si mesma)
  const listaCoordenadores = solicitantes.filter(s => s.is_coordenador && s.id !== editingId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabeçalho */}
        <div className={`p-4 flex justify-between items-center text-white transition-colors ${editingId ? 'bg-orange-500' : 'bg-indigo-600'}`}>
          <div>
            <h2 className="text-lg font-bold">
              {editingId ? 'Editando Pessoa' : 'Gestão de Equipe'}
            </h2>
            <p className="text-xs opacity-90">Cliente: {cliente?.nome}</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full"><X size={20} /></button>
        </div>

        {/* Corpo */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {/* Formulário (form-area usada para scroll) */}
          <form onSubmit={handleSalvar} className={`form-area p-4 rounded-lg mb-6 border transition-colors space-y-3 ${editingId ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
            <h3 className={`text-sm font-bold flex items-center gap-2 ${editingId ? 'text-orange-700' : 'text-gray-700'}`}>
              {editingId ? <Edit2 size={16} /> : <Plus size={16} />} 
              {editingId ? 'Editar Dados' : 'Cadastrar Pessoa'}
            </h3>
            
            <div className="flex items-center gap-2 mb-2">
              <input 
                type="checkbox" 
                id="checkCoord" 
                checked={isCoordenador} 
                onChange={e => setIsCoordenador(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <label htmlFor="checkCoord" className="text-sm text-gray-700 font-medium select-none cursor-pointer flex items-center gap-1">
                Essa pessoa é Coordenador(a)? <Shield size={14} className="text-indigo-500"/>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Nome"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                className="border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                className="border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* SELEÇÃO DE CHEFE */}
            {!isCoordenador && (
              <div className="animate-fade-in-up">
                <label className="text-xs font-bold text-gray-500 ml-1">Quem é o chefe?</label>
                <select
                  value={coordenadorId}
                  onChange={e => setCoordenadorId(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">-- Sem vínculo (Responde direto à empresa) --</option>
                  {listaCoordenadores.map(coord => (
                    <option key={coord.id} value={coord.id}>
                      {coord.nome} ({coord.email || 'Sem email'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2 pt-2">
               {/* Botão CANCELAR (só aparece editando) */}
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
                className={`flex-1 text-white py-2 rounded-lg text-sm font-medium flex justify-center items-center gap-2 transition-colors ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                <Save size={16} /> {editingId ? 'Salvar Alterações' : 'Cadastrar'}
              </button>
            </div>
          </form>

          {/* Lista Visual */}
          <h3 className="text-sm font-bold text-gray-700 mb-3">Equipe ({solicitantes.length})</h3>
          
          <div className="space-y-2">
            {solicitantes.map(sol => {
              const nomeChefe = solicitantes.find(s => s.id === sol.coordenador_id)?.nome;
              // Destaca o item sendo editado
              const isEditingItem = sol.id === editingId;

              return (
                <div key={sol.id} className={`flex justify-between items-center p-3 rounded-lg border transition-all 
                  ${isEditingItem ? 'border-orange-400 bg-orange-50 shadow-md ring-1 ring-orange-200' : 'hover:shadow-sm'} 
                  ${sol.is_coordenador && !isEditingItem ? 'bg-indigo-50 border-indigo-100' : ''}
                  ${!sol.is_coordenador && !isEditingItem ? 'bg-white' : ''}
                `}>
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-800 flex items-center gap-2">
                      {sol.is_coordenador ? <Shield size={14} className="text-indigo-600" /> : <User size={14} className="text-gray-400" />}
                      {sol.nome}
                      {sol.is_coordenador && <span className="text-[10px] bg-indigo-200 text-indigo-800 px-1.5 rounded uppercase font-bold">Coord.</span>}
                    </span>
                    
                    <div className="flex flex-col gap-0.5 mt-0.5 ml-0.5">
                      {sol.email && (
                        <span className="text-xs text-gray-500 flex items-center gap-2">
                          <Mail size={12} className="text-gray-400" /> {sol.email}
                        </span>
                      )}
                      {!sol.is_coordenador && nomeChefe && (
                         <span className="text-xs text-gray-400 flex items-center gap-1">
                           ↳ Responde a: <strong>{nomeChefe}</strong>
                         </span>
                      )}
                    </div>
                  </div>
                  
                  {/* BOTOES DE AÇÃO */}
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleEditar(sol)} 
                      className="text-blue-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>

                    <button 
                      onClick={() => handleDeletar(sol.id)} 
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
        </div>
      </div>
    </div>
  );
};

export default SolicitantesModal;