import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, User, Mail, Save, Shield, Edit2, RotateCcw } from 'lucide-react';
import supabase from '../services/supabase';

const SolicitantesModal = ({ isOpen, onClose, cliente, userId }) => {
  const [solicitantes, setSolicitantes] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [isCoordenador, setIsCoordenador] = useState(false);
  const [coordenadorId, setCoordenadorId] = useState('');
  const [editingId, setEditingId] = useState(null);

  const carregarSolicitantes = useCallback(async () => {
    if (!cliente) return;
    setLoading(true);
    const { data, error } = await supabase.from('solicitantes').select('*').eq('cliente_id', cliente.id).order('nome', { ascending: true });
    if (!error) setSolicitantes(data || []);
    setLoading(false);
  }, [cliente]);

  const resetForm = () => {
    setNovoNome(''); setNovoEmail(''); setIsCoordenador(false); setCoordenadorId(''); setEditingId(null);
  };

  useEffect(() => {
    if (isOpen && cliente) { carregarSolicitantes(); resetForm(); }
  }, [isOpen, cliente, carregarSolicitantes]);

  const handleEditar = (sol) => {
    setEditingId(sol.id); setNovoNome(sol.nome); setNovoEmail(sol.email || ''); setIsCoordenador(sol.is_coordenador); setCoordenadorId(sol.coordenador_id || '');
    document.querySelector('.form-area')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!novoNome.trim()) return;
    const payload = { nome: novoNome, email: novoEmail, is_coordenador: isCoordenador, cliente_id: cliente.id, user_id: userId, coordenador_id: isCoordenador ? null : (coordenadorId || null) };
    
    let error;
    if (editingId) { const { error: uErr } = await supabase.from('solicitantes').update(payload).eq('id', editingId); error = uErr; }
    else { const { error: iErr } = await supabase.from('solicitantes').insert([payload]); error = iErr; }

    if (error) alert('Erro: ' + error.message);
    else { resetForm(); carregarSolicitantes(); }
  };

  const handleDeletar = async (id) => {
    if (!window.confirm('Tem certeza?')) return;
    const { error } = await supabase.from('solicitantes').delete().eq('id', id);
    if (!error) { if (editingId === id) resetForm(); carregarSolicitantes(); }
  };

  if (!isOpen) return null;
  const listaCoordenadores = solicitantes.filter(s => s.is_coordenador && s.id !== editingId);
  const headerColor = editingId ? 'bg-orange-500' : 'bg-indigo-600';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className={`p-4 flex justify-between items-center text-white transition-colors duration-300 ${headerColor}`}>
          <div><h2 className="text-lg font-bold">{editingId ? 'Editando' : 'Gestão de Equipe'}</h2><p className="text-xs opacity-90 truncate max-w-[200px]">{cliente?.nome}</p></div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form onSubmit={handleSalvar} className={`form-area p-4 rounded-lg mb-6 border transition-colors space-y-3 ${editingId ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
            <h3 className={`text-sm font-bold flex items-center gap-2 ${editingId ? 'text-orange-700' : 'text-gray-700'}`}>{editingId ? <Edit2 size={16} /> : <Plus size={16} />} {editingId ? 'Editar' : 'Cadastrar'}</h3>
            
            <div className="flex items-center gap-2 mb-2"><input type="checkbox" id="checkCoord" checked={isCoordenador} onChange={e => setIsCoordenador(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" /><label htmlFor="checkCoord" className="text-sm text-gray-700 font-medium cursor-pointer flex items-center gap-1">É Coordenador? <Shield size={14} className="text-indigo-500"/></label></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><input type="text" placeholder="Nome" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} className="border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" required /><input type="email" placeholder="Email" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} className="border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" /></div>
            {!isCoordenador && (<div className="animate-fade-in-up"><label className="text-xs font-bold text-gray-500 ml-1">Quem é o chefe?</label><select value={coordenadorId} onChange={e => setCoordenadorId(e.target.value)} className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"><option value="">-- Sem vínculo --</option>{listaCoordenadores.map(coord => (<option key={coord.id} value={coord.id}>{coord.nome}</option>))}</select></div>)}

            <div className="flex gap-2 pt-2">
               {editingId && (<button type="button" onClick={resetForm} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded text-sm font-medium hover:bg-gray-300 flex justify-center items-center gap-2"><RotateCcw size={16} /> Cancelar</button>)}
              <button type="submit" className={`flex-1 text-white py-2 rounded text-sm font-medium flex justify-center items-center gap-2 transition-colors ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}><Save size={16} /> Salvar</button>
            </div>
          </form>

          <h3 className="text-sm font-bold text-gray-700 mb-3">Equipe ({solicitantes.length})</h3>
          <div className="space-y-2">
            {solicitantes.map(sol => {
              const nomeChefe = solicitantes.find(s => s.id === sol.coordenador_id)?.nome;
              const isEditingItem = sol.id === editingId;
              
              // 👇 AQUI ESTÁ A CORREÇÃO DE LAYOUT
              return (
                <div key={sol.id} className={`flex justify-between items-center p-3 rounded-lg border transition-all ${isEditingItem ? 'border-orange-400 bg-orange-50 shadow-md ring-1 ring-orange-200' : 'hover:shadow-sm bg-white'}`}>
                  
                  {/* Lado Esquerdo (Texto): flex-1 (ocupa o que der) e min-w-0 (permite truncar) */}
                  <div className="flex flex-col flex-1 min-w-0 mr-2">
                    <span className="font-bold text-gray-800 flex items-center gap-2 truncate">
                      {sol.is_coordenador ? <Shield size={14} className="text-indigo-600 flex-shrink-0" /> : <User size={14} className="text-gray-400 flex-shrink-0" />}
                      <span className="truncate">{sol.nome}</span>
                      {sol.is_coordenador && <span className="text-[10px] bg-indigo-200 text-indigo-800 px-1.5 rounded uppercase font-bold flex-shrink-0">Coord.</span>}
                    </span>
                    
                    <div className="flex flex-col gap-0.5 mt-0.5 ml-0.5 min-w-0">
                      {sol.email && <span className="text-xs text-gray-500 flex items-center gap-2 truncate"><Mail size={12} className="text-gray-400 flex-shrink-0" /> <span className="truncate">{sol.email}</span></span>}
                      {!sol.is_coordenador && nomeChefe && <span className="text-xs text-gray-400 flex items-center gap-1 truncate">↳ Responde a: <strong className="truncate">{nomeChefe}</strong></span>}
                    </div>
                  </div>
                  
                  {/* Lado Direito (Botões): flex-shrink-0 (não encolhe nunca) */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => handleEditar(sol)} className="text-blue-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => handleDeletar(sol.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors"><Trash2 size={16} /></button>
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