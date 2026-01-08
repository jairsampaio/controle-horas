import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Target, Clock, DollarSign, Plus, X, Save, CheckCircle, 
  User, Briefcase, Award, AlertCircle, Calendar, Edit2, Building2, UserX
} from 'lucide-react';
import supabase from '../services/supabase';

const DemandsBoard = ({ userId, userRole, showToast }) => {
  const [demandas, setDemandas] = useState([]);
  const [candidaturas, setCandidaturas] = useState([]);
  const [clientes, setClientes] = useState([]); // Lista para o select
  const [loading, setLoading] = useState(true);
  
  // Modal de Criação/Edição
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null); // ID da demanda sendo editada
  
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    tipo_pagamento: 'horas',
    estimativa: '',
    cliente_id: '',
    data_expiracao: ''
  });

  useEffect(() => {
    carregarTudo();
  }, []);

  // --- CARREGAMENTO DE DADOS ---
  const carregarTudo = async () => {
    setLoading(true);
    try {
        // 1. Busca perfil para ter certeza da consultoria
        const { data: profile } = await supabase.from('profiles').select('consultoria_id').eq('id', userId).single();
        if (!profile) return;

        // 2. Busca Demandas (com joins para trazer nomes)
        const { data: demandsData, error: demandsError } = await supabase
            .from('demandas')
            .select(`
                *, 
                vencedor:vencedor_id(nome),
                cliente:cliente_id(nome)
            `)
            .eq('consultoria_id', profile.consultoria_id)
            .order('created_at', { ascending: false });

        if (demandsError) throw demandsError;
        setDemandas(demandsData);

        // 3. Busca Clientes (apenas se for admin, para popular o select)
        if (['admin', 'dono', 'super_admin'].includes(userRole)) {
            const { data: clientsData } = await supabase
                .from('clientes')
                .select('id, nome')
                .eq('consultoria_id', profile.consultoria_id)
                .eq('ativo', true)
                .order('nome');
            
            setClientes(clientsData || []);
        }

        // 4. Busca Candidaturas (para saber quem aplicou onde)
        const demandasIds = demandsData.map(d => d.id);
        if (demandasIds.length > 0) {
            const { data: candData } = await supabase
                .from('candidaturas')
                .select(`*, consultor:consultor_id(nome, email)`)
                .in('demanda_id', demandasIds);
            
            setCandidaturas(candData || []);
        } else {
            setCandidaturas([]);
        }

    } catch (error) {
        console.error(error);
        if(showToast) showToast('Erro ao carregar mural.', 'erro');
    } finally {
        setLoading(false);
    }
  };

  // --- MODAIS ---
  const abrirModalCriacao = () => {
      setEditingId(null);
      setFormData({ 
          titulo: '', descricao: '', tipo_pagamento: 'horas', estimativa: '', cliente_id: '', data_expiracao: '' 
      });
      setShowModal(true);
  };

  const abrirModalEdicao = (demanda) => {
      setEditingId(demanda.id);
      setFormData({
          titulo: demanda.titulo,
          descricao: demanda.descricao,
          tipo_pagamento: demanda.tipo_pagamento,
          estimativa: demanda.estimativa,
          cliente_id: demanda.cliente_id || '',
          data_expiracao: demanda.data_expiracao || ''
      });
      setShowModal(true);
  };

  // --- AÇÕES CRUD ---
  const handleSalvar = async (e) => {
    e.preventDefault();
    try {
        const { data: profile } = await supabase.from('profiles').select('consultoria_id').eq('id', userId).single();
        
        // CORREÇÃO: Tratamento de strings vazias para campos opcionais
        const payload = {
            ...formData,
            // Se for string vazia, manda null. Se tiver valor, manda o valor.
            cliente_id: formData.cliente_id === '' ? null : formData.cliente_id, 
            data_expiracao: formData.data_expiracao === '' ? null : formData.data_expiracao,
            
            consultoria_id: profile.consultoria_id,
            ...(editingId ? {} : { criado_por: userId, status: 'aberta' })
        };

        if (editingId) {
            const { error } = await supabase.from('demandas').update(payload).eq('id', editingId);
            if (error) throw error;
            if(showToast) showToast('Demanda atualizada!', 'sucesso');
        } else {
            const { error } = await supabase.from('demandas').insert([payload]);
            if (error) throw error;
            if(showToast) showToast('Demanda publicada no mural!', 'sucesso');
        }
        
        setShowModal(false);
        carregarTudo();

    } catch (error) {
        console.error(error);
        if(showToast) showToast('Erro ao salvar demanda.', 'erro');
    }
  };

  // --- AÇÃO: CANDIDATAR-SE ---
  const handleCandidatar = async (demandaId) => {
    try {
        // Validação simples para evitar duplo clique
        if (jaMeCandidatei(demandaId)) return;

        const { error } = await supabase.from('candidaturas').insert([{
            demanda_id: demandaId,
            consultor_id: userId
        }]);

        if (error) throw error;
        if(showToast) showToast('Candidatura enviada! Boa sorte.', 'sucesso');
        carregarTudo();
    } catch (error) {
        console.error(error);
        if(showToast) showToast('Erro ao se candidatar.', 'erro');
    }
  };

  // --- AÇÃO: APROVAR CONSULTOR (ADMIN) ---
  const handleAprovar = async (demandaId, consultorId) => {
      if(!window.confirm("Confirmar este consultor e encerrar a demanda?")) return;

      try {
          // Atualiza a demanda com o vencedor e fecha ela
          const { error: demError } = await supabase
            .from('demandas')
            .update({ vencedor_id: consultorId, status: 'atribuida' })
            .eq('id', demandaId);
          
          if(demError) throw demError;

          if(showToast) showToast('Consultor aprovado e demanda atribuída!', 'sucesso');
          carregarTudo();

      } catch (error) {
          console.error(error);
          if(showToast) showToast('Erro ao aprovar.', 'erro');
      }
  };

  // --- HELPERS DE UI ---
  const isExpired = (dateString) => {
      if (!dateString) return false;
      const hoje = new Date().toISOString().split('T')[0]; // Comparação simples YYYY-MM-DD
      return dateString < hoje;
  };

  const jaMeCandidatei = (demandaId) => candidaturas.some(c => c.demanda_id === demandaId && c.consultor_id === userId);
  
  const getCandidatosDaDemanda = (demandaId) => candidaturas.filter(c => c.demanda_id === demandaId);

  // Permissões
  const isOwner = ['admin', 'dono', 'super_admin'].includes(userRole);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
        
        {/* Header da Página */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Target className="text-indigo-600" /> Mural de Oportunidades
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {isOwner
                        ? 'Gerencie demandas e distribua tarefas.' 
                        : 'Candidate-se a novas oportunidades.'}
                </p>
            </div>
            {isOwner && (
                <button 
                    onClick={abrirModalCriacao}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
                >
                    <Plus size={20} /> Nova Demanda
                </button>
            )}
        </div>

        {/* Grid de Cards */}
        {loading ? (
            <div className="text-center py-10 text-gray-400">Carregando oportunidades...</div>
        ) : demandas.length === 0 ? (
            <div className="text-center py-10 flex flex-col items-center">
                <Briefcase size={48} className="text-gray-200 mb-4" />
                <p className="text-gray-500">Nenhuma demanda encontrada.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {demandas.map(demanda => {
                    const candidatos = getCandidatosDaDemanda(demanda.id);
                    const souCandidato = jaMeCandidatei(demanda.id);
                    const isFinalizada = demanda.status !== 'aberta';
                    const expirada = isExpired(demanda.data_expiracao);
                    
                    // Lógica visual: "Perdi a vaga" (Estava concorrendo, fechou e não fui eu)
                    const perdiVaga = souCandidato && isFinalizada && demanda.vencedor_id && demanda.vencedor_id !== userId;

                    return (
                        <div key={demanda.id} className={`bg-white dark:bg-gray-800 rounded-2xl border shadow-sm transition-all flex flex-col relative group
                            ${isFinalizada || expirada ? 'border-gray-200 dark:border-gray-700 opacity-90' : 'border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-indigo-200'}
                        `}>
                            {/* Botão de Editar (Apenas Admin e se não finalizada) */}
                            {isOwner && !isFinalizada && (
                                <button 
                                    onClick={() => abrirModalEdicao(demanda)}
                                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 z-10"
                                    title="Editar Demanda"
                                >
                                    <Edit2 size={16} />
                                </button>
                            )}

                            <div className="p-6 flex-1">
                                {/* Badges de Status */}
                                <div className="flex flex-wrap gap-2 mb-3">
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1
                                        ${isFinalizada 
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                                            : expirada 
                                                ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300'
                                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}
                                    `}>
                                        {isFinalizada ? <CheckCircle size={12}/> : expirada ? <AlertCircle size={12}/> : <Target size={12}/>}
                                        {isFinalizada ? 'Concluída' : expirada ? 'Expirada' : 'Em Aberto'}
                                    </span>
                                    
                                    {demanda.data_expiracao && !isFinalizada && (
                                        <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg
                                            ${expirada ? 'text-red-500 bg-red-50' : 'text-gray-500 bg-gray-100 dark:bg-gray-700'}
                                        `}>
                                            <Calendar size={12}/> 
                                            {expirada ? 'Expirou' : new Date(demanda.data_expiracao).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 leading-tight pr-8">
                                    {demanda.titulo}
                                </h3>
                                
                                {demanda.cliente && (
                                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-1">
                                        <Building2 size={12}/> {demanda.cliente.nome}
                                    </p>
                                )}

                                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mb-4">
                                    {demanda.descricao}
                                </p>

                                {/* Estimativa de Valor/Horas */}
                                <div className="flex items-center gap-2">
                                    {demanda.tipo_pagamento === 'horas' ? (
                                        <span className="flex items-center gap-1 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                            <Clock size={14}/> {demanda.estimativa}h Previstas
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                                            <DollarSign size={14}/> R$ {demanda.estimativa}
                                        </span>
                                    )}
                                </div>

                                {/* Área do Vencedor (Se atribuída) */}
                                {isFinalizada && demanda.vencedor && (
                                    <div className={`mt-4 p-3 rounded-xl border flex items-center gap-3
                                        ${demanda.vencedor_id === userId 
                                            ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800' 
                                            : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'}
                                    `}>
                                        <div className={`p-1.5 rounded-full ${demanda.vencedor_id === userId ? 'bg-green-200 dark:bg-green-800' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                            <Award size={16} className={demanda.vencedor_id === userId ? 'text-green-700 dark:text-green-200' : 'text-gray-500'}/>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold opacity-70">
                                                {demanda.vencedor_id === userId ? 'Parabéns! Você venceu.' : 'Responsável'}
                                            </p>
                                            <p className="text-sm font-bold">{demanda.vencedor?.nome}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer do Card */}
                            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
                                
                                {/* AÇÕES DO ADMIN: Ver Candidatos e Aprovar */}
                                {isOwner && !isFinalizada && (
                                    <div className="space-y-3">
                                        <p className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                                            <User size={12}/> Candidatos ({candidatos.length})
                                        </p>
                                        {candidatos.length === 0 ? (
                                            <p className="text-xs text-gray-400 italic">Aguardando interessados...</p>
                                        ) : (
                                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                                {candidatos.map(cand => (
                                                    <div key={cand.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                                                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                                                            {cand.consultor?.nome}
                                                        </span>
                                                        <button 
                                                            onClick={() => handleAprovar(demanda.id, cand.consultor_id)}
                                                            className="text-[10px] bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded transition-colors"
                                                        >
                                                            Aprovar
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* AÇÕES DO CONSULTOR: Candidatar-se */}
                                {!isOwner && !isFinalizada && !expirada && (
                                    <>
                                        {souCandidato ? (
                                            <button disabled className="w-full py-2 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg text-sm font-bold flex justify-center items-center gap-2 cursor-not-allowed">
                                                <CheckCircle size={16}/> Candidatura Enviada
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => handleCandidatar(demanda.id)}
                                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors shadow-md shadow-indigo-200 dark:shadow-none"
                                            >
                                                Quero participar!
                                            </button>
                                        )}
                                    </>
                                )}

                                {/* Feedbacks Finais */}
                                {perdiVaga && (
                                    <div className="text-center text-xs text-red-500 font-bold flex items-center justify-center gap-1">
                                        <UserX size={14}/> Não selecionado desta vez
                                    </div>
                                )}
                                {(expirada && !isFinalizada && !isOwner) && (
                                    <div className="text-center text-xs text-gray-400 font-medium">
                                        Prazo de candidatura encerrado
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        )}

        {/* MODAL CRIAR/EDITAR DEMANDA */}
        {showModal && createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={(e) => e.stopPropagation()}>
                <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-scale-in border border-gray-200 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between mb-6">
                        <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                            {editingId ? <Edit2 className="text-blue-600"/> : <Plus className="text-indigo-600"/>} 
                            {editingId ? 'Editar Demanda' : 'Nova Oportunidade'}
                        </h3>
                        <button onClick={() => setShowModal(false)}><X className="text-gray-400"/></button>
                    </div>
                    <form onSubmit={handleSalvar} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Título da Demanda</label>
                            <input 
                                type="text" 
                                value={formData.titulo} 
                                onChange={e => setFormData({...formData, titulo: e.target.value})} 
                                className="w-full border dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" 
                                placeholder="Ex: Ajuste de Relatório Contábil" 
                                required 
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Cliente (Opcional)</label>
                            <select 
                                value={formData.cliente_id} 
                                onChange={e => setFormData({...formData, cliente_id: e.target.value})} 
                                className="w-full border dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Sem vínculo com cliente</option>
                                {clientes.map(c => (
                                    <option key={c.id} value={c.id}>{c.nome}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Tipo</label>
                                <select 
                                    value={formData.tipo_pagamento} 
                                    onChange={e => setFormData({...formData, tipo_pagamento: e.target.value})} 
                                    className="w-full border dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="horas">Horas</option>
                                    <option value="valor_fixo">Valor Fixo (R$)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">
                                    {formData.tipo_pagamento === 'horas' ? 'Qtd Horas' : 'Valor (R$)'}
                                </label>
                                <input 
                                    type="number" 
                                    step={formData.tipo_pagamento === 'horas' ? "1" : "0.01"}
                                    value={formData.estimativa} 
                                    onChange={e => setFormData({...formData, estimativa: e.target.value})} 
                                    className="w-full border dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" 
                                    placeholder="0" 
                                    required 
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Data Limite (Expiração)</label>
                            <input 
                                type="date" 
                                value={formData.data_expiracao} 
                                onChange={e => setFormData({...formData, data_expiracao: e.target.value})} 
                                className="w-full border dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" 
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Descrição Detalhada</label>
                            <textarea 
                                value={formData.descricao} 
                                onChange={e => setFormData({...formData, descricao: e.target.value})} 
                                className="w-full border dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]" 
                                placeholder="Descreva o que precisa ser feito..." 
                                required 
                            />
                        </div>

                        <div className="pt-2 flex gap-3">
                            <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl font-bold">Cancelar</button>
                            <button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg">
                                {editingId ? 'Salvar Alterações' : 'Publicar'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>, 
            document.body
        )}
    </div>
  );
};

export default DemandsBoard;