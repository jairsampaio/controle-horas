import React from 'react';
import { Edit2, Trash2, Calendar, ArrowUp, ArrowDown, Building2 } from 'lucide-react'; 
import { formatCurrency, formatHours } from '../utils/formatters';

const ServicesTable = ({ servicos, onStatusChange, onEdit, onDelete, onSort, sortConfig }) => {
  
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

  // --- EMPTY STATE ---
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
      {/* --- VERSÃO MOBILE (CARDS) --- */}
      <div className="md:hidden space-y-4">
        {servicos.map(servico => (
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
              {servicos.map(servico => (
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
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default ServicesTable;