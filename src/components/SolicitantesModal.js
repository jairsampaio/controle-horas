import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, User, Mail, Save, Shield, Edit2, RotateCcw, GitFork, Phone, Eye, EyeOff } from 'lucide-react'; 
import supabase from '../services/supabase';
import ConfirmModal from './ConfirmModal';

const SolicitantesModal = ({ isOpen, onClose, cliente, userId, showToast }) => {
  const [solicitantes, setSolicitantes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mostrarInativos, setMostrarInativos] = useState(false);
  
  // Estados do Formulário
  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novoTelefone, setNovoTelefone] = useState('');
  const [isCoordenador, setIsCoordenador] = useState(false);
  const [coordenadorId, setCoordenadorId] = useState('');
  const [editingId, setEditingId] = useState(null);

  // Modal Confirmação
  const [showConfirm, setShowConfirm] = useState(false);
  const [solicitanteAlvo, setSolicitanteAlvo] = useState(null);

  const maskPhone = (value) => {
    return value
      .replace(/\D/g, "")
      .replace(/^(\d{2})(\d)/g, "($1) $2")
      .replace(/(\d)(\d{4})$/, "$1-$2")
      .slice(0, 15);
  };

  const carregarSolicitantes = useCallback(async () => {
    if (!cliente) return;
    setLoading(true);
    
    let query = supabase
      .from('solicitantes')
      .select('*')
      .eq('cliente_id', cliente.id)
      .order('nome', { ascending: true });

    if (!mostrarInativos) {
        query = query.eq('ativo', true);
    }

    const { data, error } = await query;

    if (!error) setSolicitantes(data || []);
    setLoading(false);
  }, [cliente, mostrarInativos]);

  const resetForm = () => {
    setNovoNome(''); 
    setNovoEmail(''); 
    setNovoTelefone(''); 
    setIsCoordenador(false); 
    setCoordenadorId(''); 
    setEditingId(null);
  };

  useEffect(() => {
    if (isOpen && cliente) { carregarSolicitantes(); resetForm(); }
  }, [isOpen, cliente, carregarSolicitantes]);

  const handleEditar = (sol) => {
    setEditingId(sol.id); 
    setNovoNome(sol.nome); 
    setNovoEmail(sol.email || ''); 
    setNovoTelefone(sol.telefone || ''); 
    setIsCoordenador(sol.is_coordenador); 
    setCoordenadorId(sol.coordenador_id || '');
    document.querySelector('.form-area')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!novoNome.trim()) return;
    
    const payload = { 
        nome: novoNome, 
        email: novoEmail, 
        telefone: novoTelefone, 
        is_coordenador: isCoordenador,
        cliente_id: cliente.id, 
        user_id: userId, 
        ativo: true, 
        coordenador_id: isCoordenador ? null : (coordenadorId || null) 
    };
    
    let error;
    if (editingId) { 
        const { error: uErr } = await supabase.from('solicitantes').update(payload).eq('id', editingId); error = uErr; 
    } else { 
        const { error: iErr } = await supabase.from('solicitantes').insert([payload]); error = iErr; 
    }

    if (error) {
      if (showToast) showToast('Erro: ' + error.message, 'erro');
    } else { 
      if (showToast) showToast(editingId ? 'Atualizado!' : 'Cadastrado!', 'sucesso');
      resetForm(); 
      carregarSolicitantes(); 
    }
  };

  const solicitarInativacao = (sol) => {
    const temSubordinadosAtivos = solicitantes.some(s => s.coordenador_id === sol.id && s.ativo === true);
    
    if (temSubordinadosAtivos) {
      if (showToast) showToast(`Impossível inativar. ${sol.nome} é gestor de colaboradores ativos.`, 'erro');
      return;
    }
    setSolicitanteAlvo(sol);
    setShowConfirm(true);
  };

  const confirmarInativacao = async () => {
    if (!solicitanteAlvo) return;
    const { error } = await supabase.from('solicitantes').update({ ativo: false }).eq('id', solicitanteAlvo.id);
    
    if (!error) { 
      if (showToast) showToast('Colaborador inativado.', 'sucesso');
      if (editingId === solicitanteAlvo.id) resetForm(); 
      carregarSolicitantes(); 
    }
    setSolicitanteAlvo(null);
  };

  const handleReativar = async (sol) => {
    const { error } = await supabase.from('solicitantes').update({ ativo: true }).eq('id', sol.id);
    if (!error) {
        if (showToast) showToast('Colaborador reativado!', 'sucesso');
        carregarSolicitantes();
    }
  };

  if (!isOpen) return null;
  
  const listaCoordenadores = solicitantes.filter(s => s.is_coordenador && s.id !== editingId && s.ativo === true);
  const headerColor = editingId ? 'bg-orange-500' : 'bg-indigo-600';

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
          
          <div className={`p-4 flex justify-between items-center text-white transition-colors duration-300 ${headerColor}`}>
            <div><h2 className="text-lg font-bold">{editingId ? 'Editando' : 'Gestão de Equipe'}</h2><p className="text-xs opacity-90 truncate max-w-[200px]">{cliente?.nome}</p></div>
            <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full"><X size={20} /></button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            
            <form onSubmit={handleSalvar} className={`form-area p-4 rounded-lg mb-6 border transition-colors space-y-3 ${editingId ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
              <h3 className={`text-sm font-bold flex items-center gap-2 ${editingId ? 'text-orange-700' : 'text-gray-700'}`}>{editingId ? <Edit2 size={16} /> : <Plus size={16} />} {editingId ? 'Editar' : 'Cadastrar'}</h3>
              
              <div className="flex items-center gap-2 mb-2">
                  <input type="checkbox" id="checkCoord" checked={isCoordenador} onChange={e => setIsCoordenador(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                  <label htmlFor="checkCoord" className="text-sm text-gray-700 font-medium cursor-pointer flex items-center gap-1">
                      Perfil de Gestão / Aprovador? <Shield size={14} className="text-indigo-500"/>
                  </label>
              </div>
              
              <div className="space-y-3">
                  <input type="text" placeholder="Nome Completo" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" required />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 flex items-center gap-1"><Mail size={10}/> Email</label>
                          <input type="email" placeholder="email@empresa.com" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 flex items-center gap-1"><Phone size={10}/> Celular/Whatsapp</label>
                          <input type="text" placeholder="(11) 99999-9999" value={novoTelefone} onChange={(e) => setNovoTelefone(maskPhone(e.target.value))} className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                  </div>
              </div>
              
              {!isCoordenador && (
                  <div className="animate-fade-in-up mt-2">
                      <label className="text-xs font-bold text-gray-500 ml-1 flex items-center gap-1"><GitFork size={12} /> Reporta-se a</label>
                      <select value={coordenadorId} onChange={e => setCoordenadorId(e.target.value)} className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                          <option value="">-- Sem vínculo --</option>
                          {listaCoordenadores.map(coord => (<option key={coord.id} value={coord.id}>{coord.nome}</option>))}
                      </select>
                  </div>
              )}

              <div className="flex gap-2 pt-2">
                {editingId && (<button type="button" onClick={resetForm} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded text-sm font-medium hover:bg-gray-300 flex justify-center items-center gap-2"><RotateCcw size={16} /> Cancelar</button>)}
                <button type="submit" className={`flex-1 text-white py-2 rounded text-sm font-medium flex justify-center items-center gap-2 transition-colors ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}><Save size={16} /> Salvar</button>
              </div>
            </form>

            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    Equipe
                    <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">{solicitantes.filter(s => s.ativo !== false).length} ativos</span>
                </h3>
                <button 
                    onClick={() => setMostrarInativos(!mostrarInativos)}
                    className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${mostrarInativos ? 'bg-orange-100 text-orange-700' : 'text-gray-400 hover:bg-gray-100'}`}
                    title={mostrarInativos ? "Ocultar Inativos" : "Ver Inativos"}
                >
                    {mostrarInativos ? <EyeOff size={14}/> : <Eye size={14}/>}
                    {mostrarInativos ? "Ocultar Inativos" : "Ver Inativos"}
                </button>
            </div>

            <div className="space-y-2">
              {solicitantes.length === 0 && <p className="text-center text-gray-400 text-sm py-4">Nenhum colaborador encontrado.</p>}
              
              {solicitantes.map(sol => {
                const nomeChefe = solicitantes.find(s => s.id === sol.coordenador_id)?.nome;
                const isEditingItem = sol.id === editingId;
                const isInactive = sol.ativo === false;
                
                return (
                  <div key={sol.id} className={`flex justify-between items-center p-3 rounded-lg border transition-all ${isEditingItem ? 'border-orange-400 bg-orange-50 shadow-md ring-1 ring-orange-200' : isInactive ? 'bg-gray-100 border-gray-200 opacity-75' : 'hover:shadow-sm bg-white'}`}>
                    
                    <div className="flex flex-col flex-1 min-w-0 mr-2">
                      <span className={`font-bold flex items-center gap-2 truncate ${isInactive ? 'text-gray-500 decoration-gray-400 line-through' : 'text-gray-800'}`}>
                        {sol.is_coordenador ? <Shield size={14} className={isInactive ? "text-gray-400" : "text-indigo-600"} /> : <User size={14} className="text-gray-400" />}
                        <span className="truncate">{sol.nome}</span>
                        {sol.is_coordenador && !isInactive && <span className="text-[10px] bg-indigo-200 text-indigo-800 px-1.5 rounded uppercase font-bold flex-shrink-0">Gestor</span>}
                        {isInactive && <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 rounded uppercase font-bold flex-shrink-0 no-underline">Inativo</span>}
                      </span>
                      
                      <div className="flex flex-col gap-0.5 mt-0.5 ml-0.5 min-w-0">
                        <div className="flex flex-wrap gap-3">
                          {sol.email && <span className="text-xs text-gray-500 flex items-center gap-1 truncate"><Mail size={10} className="text-gray-400"/> {sol.email}</span>}
                          {sol.telefone && <span className="text-xs text-gray-500 flex items-center gap-1 truncate"><Phone size={10} className="text-gray-400"/> {sol.telefone}</span>}
                        </div>
                        {!sol.is_coordenador && nomeChefe && <span className="text-xs text-gray-400 flex items-center gap-1 truncate">↳ Reporta a: <strong className="truncate">{nomeChefe}</strong></span>}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => handleEditar(sol)} className="text-blue-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors" title="Editar"><Edit2 size={16} /></button>
                      
                      {/* 🔴 AQUI ESTÁ A MUDANÇA: Trash2 para inativar */}
                      {!isInactive ? (
                          <button onClick={() => solicitarInativacao(sol)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors" title="Inativar">
                              <Trash2 size={16} /> {/* Ícone alterado conforme pedido */}
                          </button>
                      ) : (
                          <button onClick={() => handleReativar(sol)} className="text-orange-400 hover:text-orange-600 hover:bg-orange-50 p-2 rounded-full transition-colors" title="Reativar"><RotateCcw size={16} /></button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmarInativacao}
        title="Inativar Colaborador?"
        message={`Deseja realmente inativar "${solicitanteAlvo?.nome}"? Ele não poderá ser selecionado em novos serviços.`}
        confirmText="Sim, inativar"
        cancelText="Cancelar"
        type="danger"
      />
    </>
  );
};

export default SolicitantesModal;