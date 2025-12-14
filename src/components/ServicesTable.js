import React from 'react';
import { Edit2, Trash2, Calendar, ArrowUp, ArrowDown } from 'lucide-react';
import { formatCurrency, formatHours } from '../utils/formatters';

const ServicesTable = ({ servicos, onStatusChange, onEdit, onDelete, onSort, sortConfig }) => {
  
  const formatData = (dataStr) => {
    return new Date(dataStr + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const getAvatarColor = (name) => {
    const colors = ['bg-red-100 text-red-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-yellow-100 text-yellow-700', 'bg-indigo-100 text-indigo-700'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Ícone de ordenação dinâmica
  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <div className="w-4" />; // Espaço vazio para alinhar
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  // --- EMPTY STATE ---
  if (servicos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="bg-indigo-50 p-4 rounded-full mb-4 animate-pulse">
          <Calendar size={40} className="text-indigo-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-800">Nenhum serviço encontrado</h3>
        <p className="text-gray-500 max-w-sm mt-2">
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
          <div key={servico.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2 text-gray-600 font-medium text-sm">
                <Calendar size={16} />
                {formatData(servico.data)}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                  servico.status === 'Pago' ? 'bg-green-100 text-green-700' :
                  servico.status === 'NF Emitida' ? 'bg-blue-100 text-blue-700' :
                  servico.status === 'Aprovado' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {servico.status}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-gray-800 text-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${getAvatarColor(servico.cliente)}`}>
                  {servico.cliente.charAt(0)}
                </div>
                {servico.cliente}
              </div>
              <div className="text-sm text-gray-500 pl-10">
                {servico.atividade}
              </div>
            </div>
            <div className="pt-3 border-t border-gray-50 flex justify-between items-center">
               <div className="font-bold text-gray-900 text-lg">
                  {formatCurrency(servico.valor_total)} {/* 👈 AQUI: Ponto virou vírgula */}
               </div>
               <div className="flex gap-2">
                 <button onClick={() => onEdit(servico)} className="p-2 text-blue-600 bg-blue-50 rounded-lg"><Edit2 size={16}/></button>
                 <button onClick={() => onDelete(servico.id)} className="p-2 text-red-600 bg-red-50 rounded-lg"><Trash2 size={16}/></button>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- VERSÃO DESKTOP --- */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {/* 1. Cabeçalho Ordenável */}
              <th 
                className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 hover:text-indigo-600 transition-colors group select-none"
                onClick={() => onSort('data')}
              >
                <div className="flex items-center gap-1">
                  Data <SortIcon column="data" />
                </div>
              </th>
              
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente / Solicitante</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Atividade</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor / Horas</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {servicos.map(servico => (
              <tr key={servico.id} className="group hover:bg-gray-50 transition-colors duration-150">
                
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                   <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-gray-400"/>
                      {formatData(servico.data)}
                   </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${getAvatarColor(servico.cliente)}`}>
                      {servico.cliente.charAt(0)}
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-bold text-gray-900">{servico.cliente}</div>
                      <div className="text-xs text-gray-500">{servico.solicitante || '-'}</div>
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4">
                  <div className="text-sm text-gray-600 max-w-xs truncate" title={servico.atividade}>
                    {servico.atividade}
                  </div>
                </td>

                {/* 3. Coluna Financeira Formatada */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-gray-900">{formatCurrency(servico.valor_total)}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{formatHours(servico.qtd_horas)}</div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                   <select
                      value={servico.status}
                      onChange={(e) => onStatusChange(servico.id, e.target.value)}
                      className={`text-xs font-semibold px-3 py-1 rounded-full border-0 cursor-pointer transition-colors focus:ring-2 focus:ring-offset-1 ${
                        servico.status === 'Pago' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                        servico.status === 'NF Emitida' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                        servico.status === 'Aprovado' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' :
                        servico.status === 'Em aprovação' ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' :
                        'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                      className="text-gray-400 hover:text-indigo-600 transition-colors p-1 hover:bg-indigo-50 rounded"
                      title="Editar"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => onDelete(servico.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors p-1 hover:bg-red-50 rounded"
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
    </>
  );
};

export default ServicesTable;