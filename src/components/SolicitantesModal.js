import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, User, Mail, Save, Shield, ShieldAlert } from 'lucide-react';
import supabase from '../services/supabase';

const SolicitantesModal = ({ isOpen, onClose, cliente, userId }) => {
  const [solicitantes, setSolicitantes] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Estados do Formulário
  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [isCoordenador, setIsCoordenador] = useState(false);
  const [coordenadorId, setCoordenadorId] = useState(''); // ID do chefe selecionado

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

  useEffect(() => {
    if (isOpen && cliente) {
      carregarSolicitantes();
      // Reseta form ao abrir
      setNovoNome('');
      setNovoEmail('');
      setIsCoordenador(false);
      setCoordenadorId('');
    }
  }, [isOpen, cliente, carregarSolicitantes]);

  const handleAdicionar = async (e) => {
    e.preventDefault();
    if (!novoNome.trim()) return;

    // Se não for coordenador, e não tiver chefe selecionado, avisar (opcional, pode deixar solto se quiser)
    // if (!isCoordenador && !coordenadorId) { alert("Selecione um coordenador!"); return; }

    const payload = {
      nome: novoNome,
      email: novoEmail,
      is_coordenador: isCoordenador,
      cliente_id: cliente.id,
      user_id: userId,
      // Se for coordenador, não tem chefe. Se for solicitante, salva o ID do chefe.
      coordenador_id: isCoordenador ? null : (coordenadorId || null) 
    };

    const { error } = await supabase.from('solicitantes').insert([payload]);

    if (error) {
      alert('Erro ao adicionar: ' + error.message);
    } else {
      setNovoNome('');
      setNovoEmail('');
      setIsCoordenador(false);
      setCoordenadorId('');
      carregarSolicitantes();
    }
  };

  const handleDeletar = async (id) => {
    if (!window.confirm('Remover esta pessoa?')) return;
    const { error } = await supabase.from('solicitantes').delete().eq('id', id);
    if (error) alert('Erro ao deletar (verifique se ele não é chefe de alguém!)');
    else carregarSolicitantes();
  };

  if (!isOpen) return null;

  // Filtra quem já é coordenador para popular o Select
  const listaCoordenadores = solicitantes.filter(s => s.is_coordenador);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabeçalho */}
        <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
          <div>
            <h2 className="text-lg font-bold">Gestão de Equipe</h2>
            <p className="text-xs opacity-90">Cliente: {cliente?.nome}</p>
          </div>
          <button onClick={onClose} className="hover:bg-indigo-700 p-1 rounded-full"><X size={20} /></button>
        </div>

        {/* Corpo */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {/* Formulário */}
          <form onSubmit={handleAdicionar} className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200 space-y-3">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Plus size={16} /> Cadastrar Pessoa
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

            {/* SELEÇÃO DE CHEFE (Aparece só se NÃO for coordenador) */}
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
                {listaCoordenadores.length === 0 && (
                   <p className="text-xs text-orange-500 mt-1">* Nenhum coordenador cadastrado ainda.</p>
                )}
              </div>
            )}

            <button 
              type="submit" 
              className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex justify-center items-center gap-2 transition-colors"
            >
              <Save size={16} /> Salvar
            </button>
          </form>

          {/* Lista Visual */}
          <h3 className="text-sm font-bold text-gray-700 mb-3">Equipe ({solicitantes.length})</h3>
          
          <div className="space-y-2">
            {solicitantes.map(sol => {
              // Acha o nome do chefe dele para exibir
              const nomeChefe = solicitantes.find(s => s.id === sol.coordenador_id)?.nome;

              return (
                <div key={sol.id} className={`flex justify-between items-center p-3 rounded-lg border hover:shadow-sm transition-shadow ${sol.is_coordenador ? 'bg-indigo-50 border-indigo-100' : 'bg-white'}`}>
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
                      {/* Mostra de quem ele é subordinado */}
                      {!sol.is_coordenador && nomeChefe && (
                         <span className="text-xs text-gray-400 flex items-center gap-1">
                           ↳ Responde a: <strong>{nomeChefe}</strong>
                         </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => handleDeletar(sol.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full"><Trash2 size={16} /></button>
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