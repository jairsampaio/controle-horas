import React, { useState, useEffect, useCallback } from 'react'; // 👈 Adicionei useCallback aqui
import { X, Plus, Trash2, User, Mail, Save } from 'lucide-react';
import supabase from '../services/supabase';

const SolicitantesModal = ({ isOpen, onClose, cliente, userId }) => {
  const [solicitantes, setSolicitantes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');

  // 👇 Função envolvida no useCallback para não dar erro no useEffect
  const carregarSolicitantes = useCallback(async () => {
    if (!cliente) return; // Proteção extra
    
    setLoading(true);
    const { data, error } = await supabase
      .from('solicitantes')
      .select('*')
      .eq('cliente_id', cliente.id)
      .order('nome', { ascending: true });

    if (error) console.error(error);
    else setSolicitantes(data || []);
    setLoading(false);
  }, [cliente]); // Ela recria apenas se o cliente mudar

  // Carrega os solicitantes quando abre o modal ou muda o cliente
  useEffect(() => {
    if (isOpen && cliente) {
      carregarSolicitantes();
    }
  }, [isOpen, cliente, carregarSolicitantes]); // 👈 Agora carregarSolicitantes é uma dependência segura

  const handleAdicionar = async (e) => {
    e.preventDefault();
    if (!novoNome.trim()) return;

    const { error } = await supabase
      .from('solicitantes')
      .insert([{
        nome: novoNome,
        email: novoEmail,
        cliente_id: cliente.id,
        user_id: userId
      }]);

    if (error) {
      alert('Erro ao adicionar solicitante');
    } else {
      setNovoNome('');
      setNovoEmail('');
      carregarSolicitantes();
    }
  };

  const handleDeletar = async (id) => {
    if (!window.confirm('Remover este solicitante?')) return;
    
    const { error } = await supabase
      .from('solicitantes')
      .delete()
      .eq('id', id);

    if (error) alert('Erro ao deletar');
    else carregarSolicitantes();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabeçalho */}
        <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
          <div>
            <h2 className="text-lg font-bold">Gestão de Solicitantes</h2>
            <p className="text-xs opacity-90">Equipe de: {cliente?.nome}</p>
          </div>
          <button onClick={onClose} className="hover:bg-indigo-700 p-1 rounded-full"><X size={20} /></button>
        </div>

        {/* Corpo */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {/* Formulário de Adição */}
          <form onSubmit={handleAdicionar} className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Plus size={16} /> Adicionar Novo
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                placeholder="Nome (ex: João)"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                className="border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <input
                type="email"
                placeholder="Email (opcional)"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                className="border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex justify-center items-center gap-2 transition-colors"
            >
              <Save size={16} /> Salvar Solicitante
            </button>
          </form>

          {/* Lista */}
          <h3 className="text-sm font-bold text-gray-700 mb-3">Cadastrados ({solicitantes.length})</h3>
          
          {loading ? (
            <div className="text-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div></div>
          ) : solicitantes.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-4">Nenhum solicitante cadastrado para este cliente.</p>
          ) : (
            <div className="space-y-2">
              {solicitantes.map(sol => (
                <div key={sol.id} className="flex justify-between items-center bg-white p-3 rounded-lg border hover:shadow-sm transition-shadow">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-800 flex items-center gap-2">
                      <User size={14} className="text-indigo-400" /> {sol.nome}
                    </span>
                    {sol.email && (
                      <span className="text-xs text-gray-500 flex items-center gap-2 mt-0.5 ml-0.5">
                        <Mail size={12} className="text-gray-400" /> {sol.email}
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => handleDeletar(sol.id)} 
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors"
                    title="Remover"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SolicitantesModal;