import React, { useState, useEffect, useRef } from 'react';
import { Edit2, Trash2, Calendar, ArrowUp, ArrowDown, Building2, Filter, Check, X, Search } from 'lucide-react'; 
import { formatCurrency, formatHours } from '../utils/formatters';
import supabase from '../services/supabase';

const ServicesTable = ({ servicos, onStatusChange, onEdit, onDelete, onSort, sortConfig }) => {
  
  // --- ESTADOS ---
  const [consultores, setConsultores] = useState([]);
  const [filtrosConsultores, setFiltrosConsultores] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Novo estado para a busca textual
  const [searchTerm, setSearchTerm] = useState('');

  // Ref para detectar clique fora
  const dropdownRef = useRef(null);

  // --- EFEITO: FECHAR AO CLICAR FORA ---
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setSearchTerm('');
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  // --- EFEITO: CARREGAR DADOS DO ADMIN ---
  useEffect(() => {
    const carregarDadosAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, consultoria_id')
        .eq('id', user.id)
        .single();

      const cargosDeChefia = ['admin', 'dono', 'super_admin', 'admin_consultoria'];

      if (profile && cargosDeChefia.includes(profile.role)) {
        setIsAdmin(true);
        const { data: listaConsultores } = await supabase
          .from('profiles')
          .select('id, nome_completo, email')
          .eq('consultoria_id', profile.consultoria_id)
          .eq('ativo', true)
          .order('nome_completo');
          
        setConsultores(listaConsultores || []);
      }
    };
    carregarDadosAdmin();
  }, []);

  // --- LÓGICA DE FILTRAGEM ---
  
  // 1. Filtra os serviços baseado nos IDs selecionados
  const servicosFiltrados = filtrosConsultores.length > 0
    ? servicos.filter(s => filtrosConsultores.includes(s.consultor_id))
    : servicos;

  // 2. Filtra a LISTA de consultores baseado no que foi digitado na busca
  const consultoresVisiveis = consultores.filter(c => 
     (c.nome_completo || c.email).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleConsultor = (id) => {
    setFiltrosConsultores(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const limparFiltros = (e) => {
    e.stopPropagation(); // Impede que abra/feche o menu ao clicar no X
    setFiltrosConsultores([]);
  };

  // --- AUXILIARES ---
  const formatData = (dataStr) => {
    return new Date(dataStr + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const getAvatarColor = (name) => {
    const colors = [
        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', 
        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', 
        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', 
        'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', 
        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', 
        'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
    ];
    const index = (name || '?').charCodeAt(0) % colors.length;
    return colors[index];
  };

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <div className="w-4" />; 
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const getCanalNome = (servico) => {
      if (servico.canais && servico.canais.nome) return servico.canais.nome;
      if (servico.canal_id) return 'Parceiro'; 
      return '-'; 
  };

  if (servicos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-full mb-4 animate-pulse">
          <Calendar size={40} className="text-indigo-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Nenhum serviço encontrado</h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm mt-2">
          Sua lista está limpa ou os filtros não retornaram resultados.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* --- ÁREA DE FILTRO (VISÍVEL APENAS PARA ADMIN) --- */}
      {isAdmin && (
        <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
            <Filter size={20} />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
              Filtrar por Consultor
            </label>
            
            {/* CONTAINER DO DROPDOWN COM REF */}
            <div className="relative" ref={dropdownRef}>
              
              {/* BOTÃO PRINCIPAL */}
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full md:w-72 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2.5 text-left flex justify-between items-center group"
              >
                <span className="truncate pr-2">
                  {filtrosConsultores.length === 0 
                    ? "Todos os Consultores" 
                    : `${filtrosConsultores.length} selecionado(s)`}
                </span>
                
                {/* LÓGICA DO ÍCONE: SE TIVER SELEÇÃO MOSTRA X, SENÃO MOSTRA SETA */}
                {filtrosConsultores.length > 0 ? (
                  <div 
                    onClick={limparFiltros}
                    className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-red-500 transition-colors"
                    title="Limpar seleção"
                  >
                    <X size={14} />
                  </div>
                ) : (
                  <ArrowDown size={14} className={`transition-transform text-gray-500 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                )}
              </button>

              {/* CONTEÚDO DO DROPDOWN */}
              {isDropdownOpen && (
                <div className="absolute z-20 w-full md:w-72 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  
                  {/* CAMPO DE BUSCA */}
                  <div className="p-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar consultor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* LISTA DE OPÇÕES */}
                  <div className="max-h-60 overflow-y-auto custom-scrollbar">
                    {consultoresVisiveis.length === 0 ? (
                       <div className="p-4 text-center text-xs text-gray-400">
                         Nenhum consultor encontrado.
                       </div>
                    ) : (
                      consultoresVisiveis.map((consultor) => {
                        const isSelected = filtrosConsultores.includes(consultor.id);
                        return (
                          <div 
                            key={consultor.id} 
                            onClick={() => toggleConsultor(consultor.id)}
                            className={`flex items-center p-3 cursor-pointer transition-colors border-l-4 ${
                              isSelected 
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500' 
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-transparent'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center mr-3 flex-shrink-0 ${
                              isSelected 
                                ? 'bg-indigo-600 border-indigo-600 text-white' 
                                : 'border-gray-300 dark:border-gray-600'
                            }`}>
                              {isSelected && <Check size={12} strokeWidth={3} />} 
                            </div>
                            <div className="flex flex-col truncate">
                              <span className={`text-sm truncate ${isSelected ? 'font-semibold text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-200'}`}>
                                {consultor.nome_completo || consultor.email}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  
                  {/* RODAPÉ DO DROPDOWN (INFO) */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-2 text-xs text-center text-gray-400 border-t border-gray-100 dark:border-gray-700">
                    {filtrosConsultores.length} selecionado(s)
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* MENSAGEM DE RESUMO AO LADO (DESKTOP) */}
          {filtrosConsultores.length > 0 && (
             <div className="hidden md:block text-sm text-indigo-600 dark:text-indigo-400 font-medium animate-pulse">
               Exibindo resultados filtrados
             </div>
          )}
        </div>
      )}

      {/* --- VERSÃO MOBILE (CARDS) --- */}
      <div className="md:hidden space-y-4">
        {servicosFiltrados.map(servico => (
          <div key={servico.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3 relative overflow-hidden">
            
            {getCanalNome(servico) !== '-' && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 dark:bg-indigo-400"></div>
            )}

            <div className="flex justify-between items-start pl-2">
              <div className="flex flex-col">
                 <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    {getCanalNome(servico) !== '-' && <Building2 size={10} />}
                    {getCanalNome(servico)}
                 </span>
                 <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-medium text-sm mt-1">
                    <Calendar size={16} />
                    {formatData(servico.data)}
                 </div>
              </div>

              <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                  servico.status === 'Pago' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                  servico.status === 'NF Emitida' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                  servico.status === 'Aprovado' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                  servico.status === 'Em aprovação' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                  'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}>
                  {servico.status}
              </span>
            </div>

            <div className="space-y-1 pl-2">
              <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-white text-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${getAvatarColor(servico.cliente)}`}>
                  {(servico.cliente || '?').charAt(0)}
                </div>
                {servico.cliente}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 pl-10 flex flex-col">
                <span className="font-medium text-gray-700 dark:text-gray-300">{servico.atividade}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">Solicitante: {servico.solicitante}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-50 dark:border-gray-700 flex justify-between items-center pl-2">
               <div className="font-bold text-gray-900 dark:text-white text-lg">
                  {formatCurrency(servico.valor_total)}
               </div>
               <div className="flex gap-2">
                 <button onClick={() => onEdit(servico)} className="p-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><Edit2 size={16}/></button>
                 <button onClick={() => onDelete(servico.id)} className="p-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg"><Trash2 size={16}/></button>
               </div>
            </div>
          </div>
        ))}
        
        {filtrosConsultores.length > 0 && servicosFiltrados.length === 0 && (
            <div className="text-center py-8 text-gray-500">
                Nenhum serviço encontrado para este consultor.
            </div>
        )}
      </div>

      {/* --- VERSÃO DESKTOP (TABELA) --- */}
      <div className="hidden md:block rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th 
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group select-none w-32"
                  onClick={() => onSort('data')}
                >
                  <div className="flex items-center gap-1">
                    Data <SortIcon column="data" />
                  </div>
                </th>
                
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-40">
                    Canal
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cliente / Solicitante
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[200px]">
                    Atividade
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Valor / Horas
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ações
                </th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {servicosFiltrados.map(servico => (
                <tr key={servico.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-150">
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400 dark:text-gray-500"/>
                        {formatData(servico.data)}
                      </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                          {getCanalNome(servico) !== '-' ? (
                              <>
                                  <Building2 size={14} className="text-indigo-400" />
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[150px] truncate" title={getCanalNome(servico)}>
                                    {getCanalNome(servico)}
                                  </span>
                              </>
                          ) : (
                              <span className="text-xs text-gray-400 dark:text-gray-500 italic">Direto</span>
                          )}
                      </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${getAvatarColor(servico.cliente)}`}>
                        {(servico.cliente || '?').charAt(0)}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{servico.cliente}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{servico.solicitante || '-'}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={servico.atividade}>
                      {servico.atividade}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(servico.valor_total)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatHours(servico.qtd_horas)}</div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={servico.status}
                        onChange={(e) => onStatusChange(servico.id, e.target.value)}
                        className={`text-xs font-semibold px-3 py-1 rounded-full border-0 cursor-pointer transition-colors focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-gray-800 ${
                          servico.status === 'Pago' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50' :
                          servico.status === 'NF Emitida' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50' :
                          servico.status === 'Aprovado' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50' :
                          servico.status === 'Em aprovação' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        <option value="Pendente">Pendente</option>
                        <option value="Em aprovação">Em aprovação</option>
                        <option value="Aprovado">Aprovado</option>
                        <option value="NF Emitida">NF Emitida</option>
                        <option value="Pago">Pago</option>
                      </select>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={() => onEdit(servico)}
                        className="text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => onDelete(servico.id)}
                        className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {/* Mensagem na tabela se o filtro estiver vazio */}
              {filtrosConsultores.length > 0 && servicosFiltrados.length === 0 && (
                 <tr>
                   <td colSpan="7" className="text-center py-8 text-gray-500">
                     Nenhum serviço encontrado para este consultor.
                   </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default ServicesTable;