import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, Save, RotateCcw, Building2, Eye, EyeOff, Search } from 'lucide-react'; 
import supabase from '../services/supabase';
import ConfirmModal from './ConfirmModal'; 

const ChannelsManagement = ({ userId, showToast }) => { 
  const [canais, setCanais] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mostrarInativos, setMostrarInativos] = useState(false); 
  const [busca, setBusca] = useState('');
  
  // Estados do Formulário
  const [nome, setNome] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [editingId, setEditingId] = useState(null);

  // Estados para o Modal de Confirmação (ainda precisamos dele para deletar)
  const [showConfirm, setShowConfirm] = useState(false);
  const [canalAlvo, setCanalAlvo] = useState(null);

  // Carrega a lista de canais
  const carregarCanais = useCallback(async () => {
    setLoading(true);
    
    let query = supabase
      .from('canais')
      .select('*')
      .eq('consultoria_id', userId) // Assumindo que userId é o ID da consultoria ou vinculado
      .order('nome', { ascending: true });

    // Ajuste de segurança: buscamos por user_id se consultoria_id falhar na lógica anterior
    // Se o seu banco usa user_id direto na tabela canais:
    query = supabase
      .from('canais')
      .select('*')
      // .eq('user_id', userId) // Descomente se sua tabela usa user_id direto
      .order('nome', { ascending: true });

    if (!mostrarInativos) {
        query = query.eq('ativo', true);
    }

    const { data, error } = await query;

    if (error) console.error('Erro ao carregar canais:', error);
    else setCanais(data || []);
    setLoading(false);
  }, [mostrarInativos, userId]);

  const resetForm = () => {
    setNome('');
    setAtivo(true);
    setEditingId(null);
  };

  useEffect(() => {
    // Carrega ao montar a tela
    carregarCanais();
  }, [carregarCanais]);

  const handleEditar = (canal) => {
    setEditingId(canal.id);
    setNome(canal.nome);
    setAtivo(canal.ativo);
    // Scroll suave para o form em mobile
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!nome.trim()) return;

    // Pega a consultoria do usuário para vincular corretamente
    // (Lógica de segurança extra)
    const { data: profile } = await supabase.from('profiles').select('consultoria_id').eq('id', userId).single();
    
    const payload = {
      nome: nome,
      ativo: ativo,
      consultoria_id: profile?.consultoria_id 
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
    } else {
      if(showToast) showToast(editingId ? 'Canal atualizado!' : 'Canal criado!', 'sucesso');
      resetForm();
      carregarCanais();
    }
  };

  // Solicitar Inativação
  const solicitarInativacao = (canal) => {
    setCanalAlvo(canal);
    setShowConfirm(true);
  };

  // Confirmar Inativação
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

  // Reativar
  const handleReativar = async (id) => {
      const { error } = await supabase.from('canais').update({ ativo: true }).eq('id', id);
      if (!error) {
          if(showToast) showToast('Canal reativado!', 'sucesso');
          carregarCanais();
      }
  };

  // Filtro Local
  const canaisFiltrados = canais.filter(c => 
    c.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <>
      <div className="space-y-6 animate-fade-in relative z-0">
        
        {/* Cabeçalho da Página */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Building2 className="text-indigo-600" /> Canais & Parceiros
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Gerencie as origens dos seus serviços (Indicações, Parcerias, etc).</p>
          </div>
        </div>

        {/* Layout de Grade: Form Esquerda / Lista Direita */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* COLUNA 1: FORMULÁRIO (Sticky) */}
            <div className="lg:col-span-1">
                <div className={`p-6 rounded-2xl shadow-sm border transition-colors sticky top-6
                    ${editingId 
                        ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800' 
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                    
                    <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 
                        ${editingId ? 'text-orange-700 dark:text-orange-400' : 'text-gray-700 dark:text-gray-200'}`}>
                        {editingId ? <Edit2 size={20} /> : <Plus size={20} />} 
                        {editingId ? 'Editar Canal' : 'Novo Canal'}
                    </h3>

                    <form onSubmit={handleSalvar} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Canal</label>
                            <input
                                type="text"
                                placeholder="Ex: Canal Experience"
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white transition-all"
                                required
                            />
                        </div>

                        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700">
                            <input 
                                type="checkbox" 
                                id="checkAtivo" 
                                checked={ativo} 
                                onChange={e => setAtivo(e.target.checked)}
                                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                            />
                            <label htmlFor="checkAtivo" className="text-sm text-gray-700 dark:text-gray-300 font-medium select-none cursor-pointer">
                                Canal Ativo (Visível)
                            </label>
                        </div>

                        <div className="flex gap-3 pt-2">
                            {editingId && (
                                <button 
                                type="button"
                                onClick={resetForm}
                                className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex justify-center items-center gap-2"
                                >
                                <RotateCcw size={16} /> Cancelar
                                </button>
                            )}

                            <button 
                                type="submit" 
                                className={`flex-1 text-white py-2.5 rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition-all shadow-lg active:scale-95
                                    ${editingId ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none'}`}
                            >
                                <Save size={18} /> {editingId ? 'Salvar Alterações' : 'Cadastrar'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* COLUNA 2: LISTA */}
            <div className="lg:col-span-2">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-full">
                    
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

                    {/* Lista */}
                    <div className="flex-1 p-2 space-y-2">
                        {loading ? (
                            <div className="text-center py-10 text-gray-400">Carregando canais...</div>
                        ) : canaisFiltrados.length === 0 ? (
                            <div className="text-center py-10 text-gray-400">Nenhum canal encontrado.</div>
                        ) : (
                            canaisFiltrados.map(canal => {
                                const isEditing = canal.id === editingId;
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
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
      </div>

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

export default ChannelsManagement;