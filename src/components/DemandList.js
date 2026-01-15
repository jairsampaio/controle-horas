import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Calendar, Clock, User, AlertCircle, CheckCircle, 
  Briefcase, ChevronRight 
} from 'lucide-react';
import supabase from '../services/supabase';
import DemandModal from './DemandModal';

const DemandList = ({ userRole, userId, consultoriaId, showToast }) => {
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState(null);
  
  // Se for admin, começa vendo "todas". Se for consultor, o filtro é ignorado na query
  const [filter, setFilter] = useState('todas'); 

  const isAdmin = ['admin', 'dono', 'super_admin'].includes(userRole);

  // --- CARREGAR DEMANDAS ---
  const fetchDemands = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('demandas')
        .select(`
          *,
          clientes (nome),
          profiles:vencedor_id (nome)
        `)
        .eq('consultoria_id', consultoriaId)
        .order('created_at', { ascending: false });

      // --- TRAVA DE SEGURANÇA DO CONSULTOR ---
      if (!isAdmin) {
        // Consultor SÓ VÊ o que é dele. Ponto final.
        query = query.eq('vencedor_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDemands(data || []);
    } catch (error) {
      console.error('Erro ao buscar demandas:', error);
    } finally {
      setLoading(false);
    }
  }, [consultoriaId, isAdmin, userId]);

  useEffect(() => {
    fetchDemands();
  }, [fetchDemands]);

  // --- HANDLERS ---
  const handleNewDemand = () => {
    setSelectedDemand(null);
    setIsModalOpen(true);
  };

  const handleEditDemand = (demand) => {
    setSelectedDemand(demand);
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    fetchDemands();
    if (showToast) showToast('Salvo com sucesso!', 'sucesso');
  };

  // --- FILTRAGEM VISUAL (APENAS PARA ADMIN) ---
  const filteredDemands = demands.filter(d => {
    // Se não for admin, a query já filtrou, então mostra tudo que veio
    if (!isAdmin) return true; 

    if (filter === 'minhas') return d.vencedor_id === userId;
    // Opcional: filtro de status se quiser
    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Concluída': return 'bg-green-100 text-green-700 border-green-200';
      case 'Em Andamento': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Congelada': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  return (
    <div className="w-full space-y-6 animate-fade-in p-2">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Briefcase className="text-indigo-600" /> Gestão de Demandas
          </h2>
          <p className="text-sm text-gray-500">
            {isAdmin ? 'Controle total de projetos' : 'Meus projetos e alocações'}
          </p>
        </div>

        <div className="flex gap-3 items-center w-full md:w-auto">
          {/* Filtros SÓ aparecem para ADMIN */}
          {isAdmin && (
            <div className="flex bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
              <button onClick={() => setFilter('todas')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filter === 'todas' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600' : 'text-gray-500'}`}>Todas</button>
              <button onClick={() => setFilter('minhas')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filter === 'minhas' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600' : 'text-gray-500'}`}>Minhas</button>
            </div>
          )}

          {isAdmin && (
            <button 
              onClick={handleNewDemand}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none transition-all"
            >
              <Plus size={18} /> Nova Demanda
            </button>
          )}
        </div>
      </div>

      {/* LISTA */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Carregando demandas...</div>
      ) : filteredDemands.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
          <Briefcase size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">Nenhuma demanda encontrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDemands.map((demand) => (
            <div 
              key={demand.id} 
              onClick={() => handleEditDemand(demand)}
              className="group bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${getStatusColor(demand.status).split(' ')[0].replace('bg-', 'bg-')}`}></div>

              <div className="flex justify-between items-start mb-3 pl-2">
                <div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${getStatusColor(demand.status)}`}>
                    {demand.status}
                  </span>
                  <h3 className="font-bold text-gray-800 dark:text-white mt-2 group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {demand.titulo}
                  </h3>
                  <p className="text-xs text-gray-500 font-bold uppercase">{demand.clientes?.nome || 'Sem Cliente'}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded-lg text-gray-400 group-hover:text-indigo-600 transition-colors">
                  <ChevronRight size={16} />
                </div>
              </div>

              <div className="pl-2 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <User size={14} className="text-indigo-400"/>
                    <span className="truncate">{demand.profiles?.nome || 'Sem dono'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-indigo-400"/>
                    <span>{demand.data_expiracao ? new Date(demand.data_expiracao).toLocaleDateString() : 'Sem prazo'}</span>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 flex items-center justify-between border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
                    <Clock size={14} className="text-orange-500"/>
                    Estimativa:
                  </div>
                  <span className="text-xs font-black text-gray-800 dark:text-white bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600">
                    {demand.estimativa}h
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <DemandModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        demandToEdit={selectedDemand}
        userRole={userRole}
        userId={userId}
        consultoriaId={consultoriaId}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default DemandList;