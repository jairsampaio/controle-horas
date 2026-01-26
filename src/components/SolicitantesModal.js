import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, Plus, Trash2, User, Mail, Save, Shield, Edit2, 
  RotateCcw, GitFork, Phone, Eye, EyeOff, Search, UserCheck 
} from 'lucide-react'; 
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
  const [searchTerm, setSearchTerm] = useState(''); // NOVO: Busca local
  
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

  // Ref para foco automático e scroll
  const formRef = useRef(null);
  const nomeInputRef = useRef(null);

  // --- CARREGAR DADOS ---
  const carregarSolicitantes = useCallback(async () => {
    if (!cliente) return;
    setLoading(true);
    
    // Busca todos (ativos e inativos) para ter a árvore hierárquica correta
    let query = supabase
      .from('solicitantes')
      .select('*')
      .eq('cliente_id', cliente.id)
      .order('nome', { ascending: true });

    const { data, error } = await query;

    if (!error) setSolicitantes(data || []);
    setLoading(false);
  }, [cliente]);

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
        setSearchTerm('');
    }
  }, [isOpen, cliente, carregarSolicitantes]);

  // --- FILTRO DE EXIBIÇÃO ---
  const filteredSolicitantes = solicitantes.filter(s => {
    const matchesSearch = s.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = mostrarInativos ? true : s.ativo;
    return matchesSearch && matchesStatus;
  });

  // --- AÇÕES CRUD ---

  const handleEditar = (sol) => {
    setEditingId(sol.id); 
    setNovoNome(sol.nome); 
    setNovoEmail(sol.email || ''); 
    setNovoTelefone(sol.telefone || ''); 
    setIsCoordenador(sol.is_coordenador); 
    setCoordenadorId(sol.coordenador_id || '');
    
    // Scroll suave para o formulário
    if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Foca no input após o scroll
        setTimeout(() => nomeInputRef.current?.focus(), 300);
    }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!novoNome.trim()) {
        if(showToast) showToast('O nome é obrigatório.', 'aviso');
        return;
    }
    
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
      if (showToast) showToast(editingId ? 'Dados atualizados!' : 'Solicitante cadastrado!', 'sucesso');
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
      if (showToast) showToast('Solicitante inativado.', 'sucesso');
      if (editingId === solicitanteAlvo.id) resetForm(); 
      carregarSolicitantes(); 
    }
    setSolicitanteAlvo(null);
    setShowConfirm(false);
  };

  const handleReativar = async (sol) => {
    const { error } = await supabase.from('solicitantes').update({ ativo: true }).eq('id', sol.id);
    if (!error) {
        if (showToast) showToast('Solicitante reativado!', 'sucesso');
        carregarSolicitantes();
    }
  };

  if (!isOpen) return null;
  
  // Filtra lista de possíveis chefes (exclui o próprio usuário editado e inativos)
  const listaCoordenadores = solicitantes.filter(s => s.is_coordenador && s.id !== editingId && s.ativo === true);
  const headerColor = editingId ? 'bg-orange-600' : 'bg-indigo-600';

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-700">
          
          {/* Header */}
          <div className={`p-5 flex justify-between items-center text-white transition-colors duration-300 ${headerColor}`}>
            <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                    {editingId ? <Edit2 size={20}/> : <UserCheck size={20}/>}
                    {editingId ? 'Editando Solicitante' : 'Gestão de Solicitantes'}
                </h2>
                <p className="text-xs opacity-90 truncate max-w-[250px] flex items-center gap-1 mt-1">
                    <User size={12}/> Cliente: <strong>{cliente?.nome}</strong>
                </p>
            </div>
            <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X size={20} /></button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            
            {/* Formulário */}
            <div ref={formRef}>
                <form onSubmit={handleSalvar} className={`p-5 rounded-xl mb-6 border transition-colors space-y-4 shadow-sm
                    ${editingId 
                        ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' 
                        : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'}`}>
                
                <div className="flex justify-between items-start">
                    <h3 className={`text-sm font-bold flex items-center gap-2 uppercase tracking-wide
                        ${editingId ? 'text-orange-700 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'}`}>
                        {editingId ? 'Dados do Solicitante' : 'Novo Cadastro'}
                    </h3>
                    
                    <div className="flex items-center gap-2">
                        <label htmlFor="checkCoord" className="text-xs font-bold text-gray-600 dark:text-gray-300 cursor-pointer select-none">Gestor/Aprovador?</label>
                        <input 
                            type="checkbox" 
                            id="checkCoord" 
                            checked={isCoordenador} 
                            onChange={e => setIsCoordenador(e.target.checked)} 
                            className="w-4 h-4 text-indigo-600 rounded cursor-pointer accent-indigo-600" 
                        />
                    </div>
                </div>
                
                <div className="space-y-3">
                    {/* Linha 1: Nome */}
                    <div className="relative">
                        <User size={16} className="absolute left-3 top-3 text-gray-400" />
                        <input 
                            ref={nomeInputRef}
                            type="text" 
                            placeholder="Nome Completo *" 
                            value={novoNome} 
                            onChange={(e) => setNovoNome(e.target.value)} 
                            className="w-full border rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400" 
                            required 
                        />
                    </div>
                    
                    {/* Linha 2: Email e Telefone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="relative">
                            <Mail size={16} className="absolute left-3 top-3 text-gray-400" />
                            <input 
                                type="email" 
                                placeholder="Email" 
                                value={novoEmail} 
                                onChange={(e) => setNovoEmail(e.target.value)} 
                                className="w-full border rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400" 
                            />
                        </div>
                        <div className="relative">
                            <Phone size={16} className="absolute left-3 top-3 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Whatsapp" 
                                value={novoTelefone} 
                                onChange={(e) => setNovoTelefone(maskPhone(e.target.value))} 
                                className="w-full border rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400" 
                            />
                        </div>
                    </div>
                </div>
                
                {/* Linha 3: Hierarquia */}
                {!isCoordenador && (
                    <div className="animate-fade-in-up pt-1">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1 flex items-center gap-1 mb-1"><GitFork size={12} /> Responde a (Gestor)</label>
                        <div className="relative">
                            <select 
                                value={coordenadorId} 
                                onChange={e => setCoordenadorId(e.target.value)} 
                                className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white cursor-pointer appearance-none"
                            >
                                <option value="">-- Sem vínculo hierárquico --</option>
                                {listaCoordenadores.map(coord => (<option key={coord.id} value={coord.id}>{coord.nome}</option>))}
                            </select>
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
                            className="flex-1 bg-white border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-50 flex justify-center items-center gap-2 transition-colors"
                        >
                            <RotateCcw size={16} /> Cancelar
                        </button>
                    )}
                    <button 
                        type="submit" 
                        className={`flex-1 text-white py-2.5 rounded-lg text-sm font-bold flex justify-center items-center gap-2 transition-all shadow-md active:scale-95 ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                    >
                        <Save size={18} /> {editingId ? 'Salvar' : 'Cadastrar'}
                    </button>
                </div>
                </form>
            </div>

            {/* Lista e Filtros */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 dark:border-gray-700 pb-3">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        Lista de Solicitantes
                        <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full font-mono">
                            {filteredSolicitantes.length}
                        </span>
                    </h3>
                    
                    <div className="flex gap-2 w-full sm:w-auto">
                        {/* Busca */}
                        <div className="relative flex-1 sm:w-40">
                            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400"/>
                            <input 
                                type="text" 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Buscar..." 
                                className="w-full pl-8 pr-2 py-1.5 text-xs border rounded-lg bg-gray-50 dark:bg-gray-900 outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Toggle Inativos */}
                        <button 
                            onClick={() => setMostrarInativos(!mostrarInativos)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1
                                ${mostrarInativos 
                                    ? 'bg-orange-50 border-orange-200 text-orange-600' 
                                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                        >
                            {mostrarInativos ? <EyeOff size={14}/> : <Eye size={14}/>}
                            {mostrarInativos ? 'Ocultar Inat.' : 'Ver Inat.'}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    {loading && <p className="text-center text-gray-400 text-sm py-4 animate-pulse">Carregando...</p>}
                    
                    {!loading && filteredSolicitantes.length === 0 && (
                        <div className="text-center py-8 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-lg">
                            <User size={32} className="mx-auto text-gray-300 mb-2"/>
                            <p className="text-sm text-gray-400">Nenhum solicitante encontrado.</p>
                        </div>
                    )}
                    
                    {filteredSolicitantes.map(sol => {
                        const nomeChefe = solicitantes.find(s => s.id === sol.coordenador_id)?.nome;
                        const isEditingItem = sol.id === editingId;
                        const isInactive = sol.ativo === false;
                        
                        return (
                            <div key={sol.id} className={`flex justify-between items-center p-3 rounded-lg border transition-all group
                                ${isEditingItem 
                                    ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 shadow-md' 
                                    : isInactive 
                                        ? 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 opacity-60 grayscale' 
                                        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-indigo-200 hover:shadow-sm'}
                            `}>
                                
                                <div className="flex flex-col flex-1 min-w-0 mr-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className={`p-1.5 rounded-full ${sol.is_coordenador ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                                            {sol.is_coordenador ? <Shield size={14} /> : <User size={14} />}
                                        </div>
                                        
                                        <span className={`font-bold truncate text-sm ${isInactive ? 'line-through' : 'text-gray-800 dark:text-white'}`}>
                                            {sol.nome}
                                        </span>

                                        {sol.is_coordenador && !isInactive && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded uppercase font-bold">Gestor</span>}
                                        {isInactive && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded uppercase font-bold">Inativo</span>}
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 pl-9">
                                        {sol.email && <span className="text-xs text-gray-500 flex items-center gap-1 truncate"><Mail size={10}/> {sol.email}</span>}
                                        {sol.telefone && <span className="text-xs text-gray-500 flex items-center gap-1 truncate"><Phone size={10}/> {sol.telefone}</span>}
                                        {!sol.is_coordenador && nomeChefe && <span className="text-xs text-gray-400 flex items-center gap-1 truncate">↳ Gestor: <strong>{nomeChefe}</strong></span>}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => handleEditar(sol)} 
                                        className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors" 
                                        title="Editar"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    
                                    {!isInactive ? (
                                        <button 
                                            onClick={() => solicitarInativacao(sol)} 
                                            className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors" 
                                            title="Inativar"
                                        >
                                            <Trash2 size={16} /> 
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleReativar(sol)} 
                                            className="text-gray-400 hover:text-green-600 hover:bg-green-50 p-2 rounded-lg transition-colors" 
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
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmarInativacao}
        title="Inativar Solicitante?"
        message={`Deseja realmente inativar "${solicitanteAlvo?.nome}"? Ele não poderá ser selecionado em novas demandas.`}
        confirmText="Sim, inativar"
        cancelText="Cancelar"
        type="danger"
      />
    </>
  );
};

export default SolicitantesModal;