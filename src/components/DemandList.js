import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Plus, Calendar, Clock, User, 
  Briefcase, ChevronRight, Search, 
  LayoutGrid, List as ListIcon, Filter, X,
  ChevronDown, Check, Building2 // <--- Adicionei o Building2
} from 'lucide-react';
import supabase from '../services/supabase';
import DemandModal from './DemandModal';

// --- COMPONENTE MULTI-SELECT PERSONALIZADO (UX PREMIUM) ---
const MultiSelect = ({ label, options, selectedValues, onChange, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Fecha ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm(''); // Limpa busca ao fechar
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (id) => {
    const newSelection = selectedValues.includes(id)
      ? selectedValues.filter(item => item !== id) // Remove
      : [...selectedValues, id]; // Adiciona
    onChange(newSelection);
  };

  const filteredOptions = options.filter(opt => 
    opt.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Texto do Botão (Feedback Visual)
  const getButtonText = () => {
    // Pluralização inteligente
    const plural = label.endsWith('l') ? 'is' : (label.endsWith('r') ? 'es' : 's');
    const labelAdjusted = label.endsWith('l') ? label.slice(0, -1) : label; // Canal -> Cana
    
    if (selectedValues.length === 0) return `Todos ${labelAdjusted}${plural}`;
    
    if (selectedValues.length === 1) {
      const item = options.find(o => o.id === selectedValues[0]);
      return item ? item.nome : `1 ${label}`;
    }
    return `${selectedValues.length} ${labelAdjusted}${plural} selecionados`;
  };

  return (
    <div className="relative min-w-[200px]" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm border rounded-lg transition-all outline-none focus:ring-2 focus:ring-indigo-500 ${selectedValues.length > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-300' : 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300'}`}
      >
        <div className="flex items-center gap-2 truncate">
          {Icon && <Icon size={16} className={selectedValues.length > 0 ? 'text-indigo-500' : 'text-gray-400'} />}
          <span className="truncate font-medium">{getButtonText()}</span>
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
          {/* Busca interna no dropdown */}
          <div className="p-2 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input 
                type="text" 
                placeholder={`Buscar ${label}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-indigo-500 text-gray-700 dark:text-gray-200"
                autoFocus
              />
            </div>
          </div>
          
          <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => {
                const isSelected = selectedValues.includes(option.id);
                return (
                  <div 
                    key={option.id} 
                    onClick={() => toggleOption(option.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                  >
                    <span>{option.nome}</span>
                    {isSelected && <Check size={14} className="text-indigo-600" />}
                  </div>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-gray-400">Nenhum resultado.</div>
            )}
          </div>
          
          {selectedValues.length > 0 && (
            <div className="p-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-center">
              <button onClick={() => onChange([])} className="text-xs font-bold text-red-500 hover:text-red-600">
                Limpar seleção
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DemandList = ({ userRole, userId, consultoriaId, showToast }) => {
  // --- ESTADOS DE DADOS ---
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- ESTADOS DE CONTROLE VISUAL E FILTROS ---
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('demand_view_mode') || 'cards');
  const [searchTerm, setSearchTerm] = useState('');
  
  // AGORA SÃO ARRAYS PARA MULTI-SELECT
  const [selectedClientIds, setSelectedClientIds] = useState([]);
  const [selectedConsultantIds, setSelectedConsultantIds] = useState([]);
  const [selectedChannelIds, setSelectedChannelIds] = useState([]); // <--- Novo State Canal
  
  // Filtro rápido (Minhas/Todas)
  const [quickFilter, setQuickFilter] = useState('todas'); 

  // --- ESTADOS DO MODAL ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState(null);

  const isAdmin = ['admin', 'dono', 'super_admin'].includes(userRole);

  // --- PERSISTÊNCIA ---
  useEffect(() => {
    localStorage.setItem('demand_view_mode', viewMode);
  }, [viewMode]);

  // --- CARREGAR DEMANDAS ---
  const fetchDemands = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('demandas')
        .select(`
          *,
          clientes (id, nome),
          canais (id, nome), 
          profiles:vencedor_id (id, nome)
        `) // <--- Adicionei 'canais' aqui
        .eq('consultoria_id', consultoriaId)
        .order('created_at', { ascending: false });

      if (!isAdmin) {
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

  // --- LISTAS ÚNICAS PARA OS FILTROS ---
  
  // --- LISTAS ÚNICAS PARA OS FILTROS ---
  
  // Lista de Canais (COM OPÇÃO 'SEM CANAL')
  const uniqueChannels = useMemo(() => {
    // 1. Pega os canais reais
    const channels = demands.map(d => d.canais).filter(Boolean);
    const unique = [...new Map(channels.map(item => [item['id'], item])).values()]
      .sort((a, b) => a.nome.localeCompare(b.nome));

    // 2. Verifica se existe alguma demanda sem canal (null)
    const hasNoChannel = demands.some(d => !d.canal_id);

    // 3. Se tiver, adiciona a opção manual no início da lista
    if (hasNoChannel) {
        unique.unshift({ id: 'sem-canal', nome: '(Sem Canal definido)' });
    }

    return unique;
  }, [demands]);

  const uniqueClients = useMemo(() => {
    const clients = demands.map(d => d.clientes).filter(Boolean);
    return [...new Map(clients.map(item => [item['id'], item])).values()]
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [demands]);

  const uniqueConsultants = useMemo(() => {
    const consultants = demands.map(d => d.profiles).filter(Boolean);
    return [...new Map(consultants.map(item => [item['id'], item])).values()]
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [demands]);

// --- LÓGICA DE FILTRAGEM (CORRIGIDA PARA NULL) ---
  const filteredDemands = useMemo(() => {
    return demands.filter(d => {
      // 1. Busca Texto
      const matchesSearch = 
        d.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || 
        d.clientes?.nome?.toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Filtro de Canais (Multi + Lógica de Null)
      let matchesChannel = true;
      if (selectedChannelIds.length > 0) {
          const wantsNoChannel = selectedChannelIds.includes('sem-canal');
          const wantsSpecificChannel = selectedChannelIds.some(id => id !== 'sem-canal' && d.canal_id === id);
          
          // Lógica: 
          // OU o usuário quer ver os sem canal E o item não tem canal
          // OU o item bate com um dos canais específicos selecionados
          matchesChannel = (wantsNoChannel && !d.canal_id) || wantsSpecificChannel;
      }

      // 3. Filtro de Clientes (Multi)
      const matchesClient = selectedClientIds.length > 0 
        ? selectedClientIds.includes(d.cliente_id) 
        : true;

      // 4. Filtro de Consultores (Multi)
      const matchesConsultant = selectedConsultantIds.length > 0 
        ? selectedConsultantIds.includes(d.vencedor_id) 
        : true;

      // 5. Filtro Rápido
      let matchesQuick = true;
      if (isAdmin && selectedConsultantIds.length === 0) {
        if (quickFilter === 'minhas') matchesQuick = d.vencedor_id === userId;
      }

      return matchesSearch && matchesChannel && matchesClient && matchesConsultant && matchesQuick;
    });
  }, [demands, searchTerm, selectedChannelIds, selectedClientIds, selectedConsultantIds, quickFilter, isAdmin, userId]);

  // --- HANDLERS ---
  const handleNewDemand = () => { setSelectedDemand(null); setIsModalOpen(true); };
  const handleEditDemand = (demand) => { setSelectedDemand(demand); setIsModalOpen(true); };
  const handleModalSuccess = () => { fetchDemands(); if (showToast) showToast('Salvo com sucesso!', 'sucesso'); };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedChannelIds([]);
    setSelectedClientIds([]);
    setSelectedConsultantIds([]);
    setQuickFilter('todas');
  };

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
      
      {/* --- HEADER E CONTROLES --- */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Briefcase className="text-indigo-600" /> Gestão de Demandas
            </h2>
            <p className="text-sm text-gray-500">
              {isAdmin ? 'Controle total de projetos' : 'Meus projetos e alocações'}
            </p>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
             {isAdmin && (
                <div className="flex bg-gray-100 dark:bg-gray-900 rounded-lg p-1 h-10">
                  <button onClick={() => setQuickFilter('todas')} className={`px-3 text-xs font-bold rounded-md transition-all ${quickFilter === 'todas' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600' : 'text-gray-500'}`}>Todas</button>
                  <button onClick={() => setQuickFilter('minhas')} className={`px-3 text-xs font-bold rounded-md transition-all ${quickFilter === 'minhas' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600' : 'text-gray-500'}`}>Minhas</button>
                </div>
              )}

            {isAdmin && (
              <button 
                onClick={handleNewDemand}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none transition-all w-full md:w-auto justify-center"
              >
                <Plus size={18} /> <span className="hidden sm:inline">Nova Demanda</span>
              </button>
            )}
          </div>
        </div>

        {/* Linha Inferior: Filtros Multi-Select e View Toggle */}
        <div className="flex flex-col xl:flex-row gap-3 items-start xl:items-center border-t border-gray-100 dark:border-gray-700 pt-4">
          
          <div className="relative w-full xl:max-w-xs shrink-0">
            <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar demanda ou cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-[42px]"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full">
            {/* 1. CANAL (PRIMEIRO) */}
            <MultiSelect 
              label="Canal" 
              icon={Building2}
              options={uniqueChannels} 
              selectedValues={selectedChannelIds} 
              onChange={setSelectedChannelIds} 
            />

            {/* 2. CLIENTE */}
            <MultiSelect 
              label="Cliente" 
              icon={Briefcase}
              options={uniqueClients} 
              selectedValues={selectedClientIds} 
              onChange={setSelectedClientIds} 
            />

            {/* 3. CONSULTOR */}
            <MultiSelect 
              label="Consultor" 
              icon={User}
              options={uniqueConsultants} 
              selectedValues={selectedConsultantIds} 
              onChange={setSelectedConsultantIds} 
            />

            {(searchTerm || selectedChannelIds.length > 0 || selectedClientIds.length > 0 || selectedConsultantIds.length > 0) && (
              <button onClick={clearFilters} className="text-gray-500 hover:text-red-500 p-2 ml-auto sm:ml-0" title="Limpar filtros">
                <X size={18} />
              </button>
            )}
          </div>

          <div className="flex bg-gray-100 dark:bg-gray-900 rounded-lg p-1 shrink-0 ml-auto self-end xl:self-center">
            <button 
              onClick={() => setViewMode('cards')} 
              className={`p-2 rounded-md transition-all ${viewMode === 'cards' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="Visualização em Cards"
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')} 
              className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="Visualização em Lista"
            >
              <ListIcon size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* --- CONTEÚDO PRINCIPAL --- */}
      {loading ? (
        <div className="text-center py-20 text-gray-400 animate-pulse">Carregando demandas...</div>
      ) : filteredDemands.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
          <Filter size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">Nenhuma demanda encontrada com os filtros atuais.</p>
          <button onClick={clearFilters} className="text-indigo-600 text-sm font-bold mt-2 hover:underline">Limpar Filtros</button>
        </div>
      ) : (
        <>
          {/* MODO CARDS */}
          {viewMode === 'cards' && (
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
                      <h3 className="font-bold text-gray-800 dark:text-white mt-2 group-hover:text-indigo-600 transition-colors line-clamp-1" title={demand.titulo}>
                        {demand.titulo}
                      </h3>
                      {/* MOSTRANDO O CANAL NO CARD TAMBÉM SE EXISTIR */}
                      <p className="text-xs text-gray-500 font-bold uppercase">
                        {demand.clientes?.nome || 'Sem Cliente'}
                        {demand.canais?.nome && <span className="text-gray-400 font-normal ml-1">• {demand.canais.nome}</span>}
                      </p>
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

          {/* MODO LISTA */}
          {viewMode === 'list' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-bold uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Demanda / Cliente / Canal</th>
                      <th className="px-4 py-3">Responsável</th>
                      <th className="px-4 py-3">Prazo</th>
                      <th className="px-4 py-3 text-center">Horas</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredDemands.map((demand) => (
                      <tr 
                        key={demand.id} 
                        onClick={() => handleEditDemand(demand)}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors group"
                      >
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md border ${getStatusColor(demand.status)}`}>
                            {demand.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-gray-800 dark:text-white group-hover:text-indigo-600">{demand.titulo}</div>
                          <div className="text-xs text-gray-500">
                            {demand.clientes?.nome || 'Sem Cliente'}
                            {demand.canais?.nome && <span className="text-gray-400 ml-1">• {demand.canais.nome}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                          {demand.profiles?.nome || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                          {demand.data_expiracao ? new Date(demand.data_expiracao).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-gray-700 dark:text-gray-300">
                          {demand.estimativa}h
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ChevronRight size={16} className="text-gray-300 group-hover:text-indigo-600" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL */}
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