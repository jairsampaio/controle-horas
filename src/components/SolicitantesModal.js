import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Plus, Trash2, User, Mail, Save, Shield, Edit2, RotateCcw, GitFork, Phone, Eye, EyeOff } from 'lucide-react'; 
import supabase from '../services/supabase';
import ConfirmModal from './ConfirmModal';

// HELPER: Máscara de telefone (br)
const maskPhone = (value) => {
  if (!value) return "";
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/g, "($1) $2")
    .replace(/(\d)(\d{4})$/, "$1-$2")
    .slice(0, 15);
};

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

  // Ref para foco automático
  const nomeInputRef = useRef(null);

  // --- CARREGAR DADOS ---
  const carregarSolicitantes = useCallback(async () => {
    if (!cliente) return;
    setLoading(true);
    
    // Busca solicitantes vinculados a este cliente específico
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

  // Reset do formulário
  const resetForm = () => {
    setNovoNome(''); 
    setNovoEmail(''); 
    setNovoTelefone(''); 
    setIsCoordenador(false); 
    setCoordenadorId(''); 
    setEditingId(null);
  };

  // Efeito ao abrir o modal
  useEffect(() => {
    if (isOpen && cliente) { 
        carregarSolicitantes(); 
        resetForm(); 
        // Pequeno delay para garantir que o DOM renderizou antes de focar
        setTimeout(() => nomeInputRef.current?.focus(), 100);
    }
  }, [isOpen, cliente, carregarSolicitantes]);

  // --- AÇÕES CRUD ---

  const handleEditar = (sol) => {
    setEditingId(sol.id); 
    setNovoNome(sol.nome); 
    setNovoEmail(sol.email || ''); 
    setNovoTelefone(sol.telefone || ''); 
    setIsCoordenador(sol.is_coordenador); 
    setCoordenadorId(sol.coordenador_id || '');
    
    // Scroll suave para o formulário no topo
    document.querySelector('.form-area')?.scrollIntoView({ behavior: 'smooth' });
    nomeInputRef.current?.focus();
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!novoNome.trim()) return;
    
    // Monta o objeto conforme colunas do banco
    const payload = { 
        nome: novoNome, 
        email: novoEmail, 
        telefone: novoTelefone, 
        is_coordenador: isCoordenador,
        cliente_id: cliente.id, 
        user_id: userId, // Log de quem alterou
        ativo: true, 
        // Se for coordenador, não pode ter chefe (regra de negócio simplificada)
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

  // --- INATIVAÇÃO ---

  const solicitarInativacao = (sol) => {
    // Validação de Integridade: Não pode apagar chefe se tiver subordinados ativos
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
    // Soft Delete: Apenas marca como inativo
    const { error } = await supabase.from('solicitantes').update({ ativo: false }).eq('id', solicitanteAlvo.id);
    
    if (!error) { 
      if (showToast) showToast('Colaborador inativado.', 'sucesso');
      if (editingId === solicitanteAlvo.id) resetForm(); 
      carregarSolicitantes(); 
    }
    setSolicitanteAlvo(null);
    setShowConfirm(false);
  };

  const handleReativar = async (sol) => {
    const { error } = await supabase.from('solicitantes').update({ ativo: true }).eq('id', sol.id);
    if (!error) {
        if (showToast) showToast('Colaborador reativado!', 'sucesso');
        carregarSolicitantes();
    }
  };

  if (!isOpen) return null;
  
  // Filtra lista de possíveis chefes (exclui o próprio usuário editado e inativos)
  const listaCoordenadores = solicitantes.filter(s => s.is_coordenador && s.id !== editingId && s.ativo === true);
  const headerColor = editingId ? 'bg-orange-500' : 'bg-indigo-600';

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-80 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border dark:border-gray-700">
          
          {/* Header */}
          <div className={`p-4 flex justify-between items-center text-white transition-colors duration-300 ${headerColor}`}>
            <div>
                <h2 className="text-lg font-bold">{editingId ? 'Editando Colaborador' : 'Gestão de Equipe'}</h2>
                <p className="text-xs opacity-90 truncate max-w-[200px] flex items-center gap-1">
                    <User size={12}/> {cliente?.nome}
                </p>
            </div>
            <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors"><X size={20} /></button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            
            {/* Formulário */}
            <form onSubmit={handleSalvar} className={`form-area p-4 rounded-lg mb-6 border transition-colors space-y-3 
                ${editingId 
                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' 
                    : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'}`}>
              
              <h3 className={`text-sm font-bold flex items-center gap-2 
                ${editingId ? 'text-orange-700 dark:text-orange-400' : 'text-gray-700 dark:text-gray-300'}`}>
                {editingId ? <Edit2 size={16} /> : <Plus size={16} />} 
                {editingId ? 'Editar Dados' : 'Novo Cadastro'}
              </h3>
              
              <div className="flex items-center gap-2 mb-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-fit">
                  <input 
                    type="checkbox" 
                    id="checkCoord" 
                    checked={isCoordenador} 
                    onChange={e => setIsCoordenador(e.target.checked)} 
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-indigo-500" 
                  />
                  <label htmlFor="checkCoord" className="text-sm text-gray-700 dark:text-gray-300 font-medium cursor-pointer flex items-center gap-1 select-none">
                      Perfil de Gestão / Aprovador? <Shield size={14} className="text-indigo-500 dark:text-indigo-400"/>
                  </label>
              </div>
              
              <div className="space-y-3">
                  <input 
                    ref={nomeInputRef}
                    type="text" 
                    placeholder="Nome Completo" 
                    value={novoNome} 
                    onChange={(e) => setNovoNome(e.target.value)} 
                    className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400" 
                    required 
                  />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1"><Mail size={10}/> Email</label>
                          <input 
                            type="email" 
                            placeholder="email@empresa.com" 
                            value={novoEmail} 
                            onChange={(e) => setNovoEmail(e.target.value)} 
                            className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400" 
                          />
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1"><Phone size={10}/> Celular/Whatsapp</label>
                          <input 
                            type="text" 
                            placeholder="(11) 99999-9999" 
                            value={novoTelefone} 
                            onChange={(e) => setNovoTelefone(maskPhone(e.target.value))} 
                            className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400" 
                          />
                      </div>
                  </div>
              </div>
              
              {!isCoordenador && (
                  <div className="animate-fade-in-up mt-2">
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1 flex items-center gap-1 mb-1"><GitFork size={12} /> Reporta-se a (Gestor)</label>
                      <div className="relative">
                        <select 
                            value={coordenadorId} 
                            onChange={e => setCoordenadorId(e.target.value)} 
                            className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white cursor-pointer appearance-none"
                        >
                            <option value="">-- Sem vínculo hierárquico --</option>
                            {listaCoordenadores.map(coord => (<option key={coord.id} value={coord.id}>{coord.nome}</option>))}
                        </select>
                        {/* Ícone seta customizada para select */}
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                      </div>
                  </div>
              )}

              <div className="flex gap-2 pt-2">
                {editingId && (
                    <button 
                        type="button" 
                        onClick={resetForm} 
                        className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 flex justify-center items-center gap-2 transition-colors"
                    >
                        <RotateCcw size={16} /> Cancelar
                    </button>
                )}
                <button 
                    type="submit" 
                    className={`flex-1 text-white py-2 rounded text-sm font-medium flex justify-center items-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-95 ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                    <Save size={16} /> {editingId ? 'Salvar Alterações' : 'Adicionar à Equipe'}
                </button>
              </div>
            </form>

            {/* Listagem */}
            <div className="flex justify-between items-center mb-3 border-b border-gray-100 dark:border-gray-700 pb-2">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    Membros da Equipe
                    <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs px-2 py-0.5 rounded-full font-mono">{solicitantes.filter(s => s.ativo !== false).length}</span>
                </h3>
                <button 
                    onClick={() => setMostrarInativos(!mostrarInativos)}
                    className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors 
                        ${mostrarInativos 
                            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' 
                            : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    title={mostrarInativos ? "Ocultar Inativos" : "Ver Inativos"}
                >
                    {mostrarInativos ? <EyeOff size={14}/> : <Eye size={14}/>}
                    {mostrarInativos ? "Ocultar Inativos" : "Ver Inativos"}
                </button>
            </div>

            <div className="space-y-2">
              {loading && <p className="text-center text-gray-400 text-sm py-4 animate-pulse">Carregando lista...</p>}
              
              {!loading && solicitantes.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-lg">
                    <User size={32} className="mb-2 opacity-20"/>
                    <p className="text-sm">Nenhum colaborador cadastrado.</p>
                </div>
              )}
              
              {solicitantes.map(sol => {
                const nomeChefe = solicitantes.find(s => s.id === sol.coordenador_id)?.nome;
                const isEditingItem = sol.id === editingId;
                const isInactive = sol.ativo === false;
                
                return (
                  <div key={sol.id} className={`flex justify-between items-center p-3 rounded-lg border transition-all 
                    ${isEditingItem 
                        ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 shadow-md ring-1 ring-orange-200 dark:ring-orange-800' 
                        : isInactive 
                            ? 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800 opacity-60 grayscale' 
                            : 'hover:shadow-sm bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}
                  `}>
                    
                    <div className="flex flex-col flex-1 min-w-0 mr-2">
                      <div className="flex items-center gap-2 mb-1">
                        {sol.is_coordenador 
                            ? <Shield size={16} className={isInactive ? "text-gray-400" : "text-indigo-600 dark:text-indigo-400"} /> 
                            : <User size={16} className="text-gray-400 dark:text-gray-500" />}
                        
                        <span className={`font-bold truncate text-sm ${isInactive ? 'line-through' : 'text-gray-800 dark:text-white'}`}>
                            {sol.nome}
                        </span>

                        {sol.is_coordenador && !isInactive && <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 px-1.5 py-0.5 rounded uppercase font-bold flex-shrink-0">Gestor</span>}
                        {isInactive && <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded uppercase font-bold flex-shrink-0 no-underline">Inativo</span>}
                      </div>
                      
                      <div className="flex flex-col gap-1 min-w-0 pl-6">
                        <div className="flex flex-wrap gap-3">
                          {sol.email && <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate"><Mail size={10}/> {sol.email}</span>}
                          {sol.telefone && <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate"><Phone size={10}/> {sol.telefone}</span>}
                        </div>
                        {!sol.is_coordenador && nomeChefe && <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 truncate">↳ Reporta a: <strong className="truncate dark:text-gray-300 font-medium">{nomeChefe}</strong></span>}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button 
                        onClick={() => handleEditar(sol)} 
                        className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 p-2 rounded-full transition-colors" 
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      
                      {!isInactive ? (
                          <button 
                            onClick={() => solicitarInativacao(sol)} 
                            className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-full transition-colors" 
                            title="Inativar"
                          >
                              <Trash2 size={16} /> 
                          </button>
                      ) : (
                          <button 
                            onClick={() => handleReativar(sol)} 
                            className="text-orange-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 p-2 rounded-full transition-colors" 
                            title="Reativar"
                          >
                            <RotateCcw size={16} />
                          </button>
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