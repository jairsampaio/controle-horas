import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Target, Clock, DollarSign, Plus, X, Save, CheckCircle, 
  User, Briefcase, Award, AlertCircle 
} from 'lucide-react';
import supabase from '../services/supabase';
import { formatCurrency } from '../utils/formatters'; // Supondo que exista, senão use Intl direto

const DemandsBoard = ({ userId, userRole, showToast }) => {
  const [demandas, setDemandas] = useState([]);
  const [candidaturas, setCandidaturas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal de Criação
  const [showModal, setShowModal] = useState(false);
  const [novaDemanda, setNovaDemanda] = useState({
    titulo: '',
    descricao: '',
    tipo_pagamento: 'horas', // ou 'valor_fixo'
    estimativa: ''
  });

  useEffect(() => {
    carregarTudo();
  }, []);

  const carregarTudo = async () => {
    setLoading(true);
    try {
        // 1. Pega Consultoria ID
        const { data: profile } = await supabase.from('profiles').select('consultoria_id').eq('id', userId).single();
        if (!profile) return;

        // 2. Busca Demandas (com dados do vencedor se houver)
        const { data: demandsData, error: demandsError } = await supabase
            .from('demandas')
            .select(`*, vencedor:vencedor_id(nome)`)
            .eq('consultoria_id', profile.consultoria_id)
            .order('created_at', { ascending: false });

        if (demandsError) throw demandsError;
        setDemandas(demandsData);

        // 3. Busca Minhas Candidaturas (para saber se já apliquei) ou Todas (se for admin)
        let queryCand = supabase.from('candidaturas').select(`*, consultor:consultor_id(nome, email)`);
        
        // Se for admin, quero ver todas as candidaturas dessas demandas. 
        // Se for colaborador, preciso saber onde EU me candidatei para bloquear o botão.
        // Simplificação: Trazemos tudo dessa consultoria (filtrar no front ou query complexa)
        // Para MVP, vamos trazer todas as candidaturas relacionadas às demandas carregadas
        const demandasIds = demandsData.map(d => d.id);
        if (demandasIds.length > 0) {
            queryCand = queryCand.in('demanda_id', demandasIds);
            const { data: candData } = await queryCand;
            setCandidaturas(candData || []);
        } else {
            setCandidaturas([]);
        }

    } catch (error) {
        console.error(error);
        if(showToast) showToast('Erro ao carregar demandas.', 'erro');
    } finally {
        setLoading(false);
    }
  };

  const handleCriarDemanda = async (e) => {
    e.preventDefault();
    try {
        const { data: profile } = await supabase.from('profiles').select('consultoria_id').eq('id', userId).single();
        
        const { error } = await supabase.from('demandas').insert([{
            ...novaDemanda,
            consultoria_id: profile.consultoria_id,
            criado_por: userId,
            status: 'aberta'
        }]);

        if (error) throw error;
        
        if(showToast) showToast('Demanda publicada no mural!', 'sucesso');
        setShowModal(false);
        setNovaDemanda({ titulo: '', descricao: '', tipo_pagamento: 'horas', estimativa: '' });
        carregarTudo();

    } catch (error) {
        console.error(error);
        if(showToast) showToast('Erro ao criar demanda.', 'erro');
    }
  };

  const handleCandidatar = async (demandaId) => {
    try {
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

  const handleAprovar = async (demandaId, consultorId) => {
      if(!window.confirm("Confirmar este consultor para a demanda?")) return;

      try {
          // 1. Atualiza a demanda com o vencedor e fecha
          const { error: demError } = await supabase
            .from('demandas')
            .update({ vencedor_id: consultorId, status: 'atribuida' })
            .eq('id', demandaId);
          
          if(demError) throw demError;

          // 2. (Opcional) Atualiza status das candidaturas para histórico
          // ...

          if(showToast) showToast('Consultor aprovado e demanda atribuída!', 'sucesso');
          carregarTudo();

      } catch (error) {
          console.error(error);
          if(showToast) showToast('Erro ao aprovar.', 'erro');
      }
  };

  // Helpers de UI
  const jaMeCandidatei = (demandaId) => {
      return candidaturas.some(c => c.demanda_id === demandaId && c.consultor_id === userId);
  };

  const getCandidatosDaDemanda = (demandaId) => {
      return candidaturas.filter(c => c.demanda_id === demandaId);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Target className="text-indigo-600" /> Mural de Oportunidades
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {userRole === 'admin' || userRole === 'super_admin' 
                        ? 'Publique demandas e encontre o consultor ideal.' 
                        : 'Encontre novas demandas e aumente sua receita.'}
                </p>
            </div>
            {(userRole === 'admin' || userRole === 'super_admin') && (
                <button 
                    onClick={() => setShowModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
                >
                    <Plus size={20} /> Nova Demanda
                </button>
            )}
        </div>

        {/* Grid de Demandas */}
        {loading ? (
            <div className="text-center py-10 text-gray-400">Carregando oportunidades...</div>
        ) : demandas.length === 0 ? (
            <div className="text-center py-10 flex flex-col items-center">
                <Briefcase size={48} className="text-gray-200 mb-4" />
                <p className="text-gray-500">Nenhuma demanda aberta no momento.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {demandas.map(demanda => {
                    const candidatos = getCandidatosDaDemanda(demanda.id);
                    const souCandidato = jaMeCandidatei(demanda.id);
                    const isOwner = (userRole === 'admin' || userRole === 'super_admin');
                    const isFinalizada = demanda.status !== 'aberta';

                    return (
                        <div key={demanda.id} className={`bg-white dark:bg-gray-800 rounded-2xl border shadow-sm transition-all flex flex-col
                            ${isFinalizada ? 'border-green-200 dark:border-green-900 opacity-75' : 'border-gray-200 dark:border-gray-700 hover:shadow-md'}
                        `}>
                            
                            <div className="p-6 flex-1">
                                {/* Badge de Status */}
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide
                                        ${demanda.status === 'aberta' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}
                                    `}>
                                        {demanda.status === 'aberta' ? 'Em Aberto' : 'Atribuída'}
                                    </span>
                                    {demanda.tipo_pagamento === 'horas' ? (
                                        <span className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
                                            <Clock size={14}/> {demanda.estimativa}h
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg">
                                            <DollarSign size={14}/> R$ {demanda.estimativa}
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 leading-tight">
                                    {demanda.titulo}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3">
                                    {demanda.descricao}
                                </p>

                                {/* Área do Vencedor (Se atribuída) */}
                                {isFinalizada && demanda.vencedor && (
                                    <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800 flex items-center gap-3">
                                        <div className="bg-green-200 dark:bg-green-800 p-1.5 rounded-full">
                                            <Award size={16} className="text-green-700 dark:text-green-200"/>
                                        </div>
                                        <div>
                                            <p className="text-xs text-green-800 dark:text-green-300 font-bold">Responsável</p>
                                            <p className="text-xs text-green-700 dark:text-green-400">{demanda.vencedor?.nome}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer do Card */}
                            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
                                
                                {/* VISÃO DO ADMIN: Lista de Candidatos */}
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

                                {/* VISÃO DO CONSULTOR: Botão de Candidatura */}
                                {!isOwner && !isFinalizada && (
                                    <>
                                        {souCandidato ? (
                                            <button disabled className="w-full py-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg text-sm font-bold flex justify-center items-center gap-2 cursor-not-allowed">
                                                <CheckCircle size={16}/> Candidatura Enviada
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => handleCandidatar(demanda.id)}
                                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors shadow-md shadow-indigo-200 dark:shadow-none"
                                            >
                                                Quero pegar essa demanda!
                                            </button>
                                        )}
                                    </>
                                )}

                                {/* Se finalizada, mostra apenas aviso */}
                                {isFinalizada && !isOwner && (
                                    <div className="text-center text-xs text-gray-400 font-medium">
                                        Demanda encerrada
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        )}

        {/* MODAL NOVA DEMANDA */}
        {showModal && createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={(e) => e.stopPropagation()}>
                <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-scale-in border border-gray-200 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between mb-6">
                        <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                            <Plus className="text-indigo-600"/> Nova Oportunidade
                        </h3>
                        <button onClick={() => setShowModal(false)}><X className="text-gray-400"/></button>
                    </div>
                    <form onSubmit={handleCriarDemanda} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Título da Demanda</label>
                            <input 
                                type="text" 
                                value={novaDemanda.titulo} 
                                onChange={e => setNovaDemanda({...novaDemanda, titulo: e.target.value})} 
                                className="w-full border dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" 
                                placeholder="Ex: Ajuste de Relatório Contábil" 
                                required 
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Tipo</label>
                                <select 
                                    value={novaDemanda.tipo_pagamento} 
                                    onChange={e => setNovaDemanda({...novaDemanda, tipo_pagamento: e.target.value})} 
                                    className="w-full border dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="horas">Horas</option>
                                    <option value="valor_fixo">Valor Fixo (R$)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">
                                    {novaDemanda.tipo_pagamento === 'horas' ? 'Qtd Horas' : 'Valor (R$)'}
                                </label>
                                <input 
                                    type="number" 
                                    step={novaDemanda.tipo_pagamento === 'horas' ? "1" : "0.01"}
                                    value={novaDemanda.estimativa} 
                                    onChange={e => setNovaDemanda({...novaDemanda, estimativa: e.target.value})} 
                                    className="w-full border dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" 
                                    placeholder="0" 
                                    required 
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Descrição Detalhada</label>
                            <textarea 
                                value={novaDemanda.descricao} 
                                onChange={e => setNovaDemanda({...novaDemanda, descricao: e.target.value})} 
                                className="w-full border dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]" 
                                placeholder="Descreva o que precisa ser feito..." 
                                required 
                            />
                        </div>

                        <div className="pt-2 flex gap-3">
                            <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl font-bold">Cancelar</button>
                            <button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg">
                                Publicar
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