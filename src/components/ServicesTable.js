// src/components/ServicesTable.js
import React from 'react';
import { Edit2, Trash2, Calendar, User, Clock, DollarSign, Activity } from 'lucide-react';

const ServicesTable = ({ servicos, onStatusChange, onEdit, onDelete }) => {
  
  const formatData = (dataStr) => {
    return new Date(dataStr + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  // Função para gerar cor de avatar baseada na letra (Frufru visual legal)
  const getAvatarColor = (name) => {
    const colors = ['bg-red-100 text-red-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-yellow-100 text-yellow-700', 'bg-indigo-100 text-indigo-700'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
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
          Sua lista está limpa. Que tal cadastrar o primeiro serviço do dia?
        </p>
      </div>
    );
  }

  return (
    <>
      {/* --- VERSÃO MOBILE (CARDS) - Mantive igual pois já estava ótimo --- */}
      <div className="md:hidden space-y-4">
        {servicos.map(servico => (
          <div key={servico.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
             {/* ... (Seu código mobile atual continua aqui) ... */}
             {/* Vou repetir o bloco mobile resumido para garantir que funcione se copiar tudo */}
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
              <div className="flex items-center gap-2 text-gray-500 text-sm pl-10">
                <Activity size={14} />
                {servico.atividade}
              </div>
            </div>
            <div className="pt-3 border-t border-gray-50 flex justify-between items-center">
               <div className="font-bold text-gray-900">
                  R$ {parseFloat(servico.valor_total).toFixed(2)}
               </div>
               <div className="flex gap-2">
                 <button onClick={() => onEdit(servico)} className="p-2 text-blue-600 bg-blue-50 rounded-lg"><Edit2 size={16}/></button>
                 <button onClick={() => onDelete(servico.id)} className="p-2 text-red-600 bg-red-50 rounded-lg"><Trash2 size={16}/></button>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- VERSÃO DESKTOP MODERNIZADA --- */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente / Data</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Atividade</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor / Horas</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {servicos.map(servico => (
              <tr key={servico.id} className="group hover:bg-indigo-50 transition-colors duration-150">
                
                {/* 1. Coluna Combinada: Avatar + Nome + Data */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center font-bold ${getAvatarColor(servico.cliente)}`}>
                      {servico.cliente.charAt(0)}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-bold text-gray-900">{servico.cliente}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Calendar size={12} /> {formatData(servico.data)}
                      </div>
                    </div>
                  </div>
                </td>

                {/* 2. Coluna Atividade (Texto cinza mais suave) */}
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-600 max-w-xs truncate" title={servico.atividade}>
                    {servico.atividade}
                  </div>
                </td>

                {/* 3. Coluna Financeira (Valor em destaque, horas discreto) */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-gray-900">R$ {parseFloat(servico.valor_total).toFixed(2)}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{parseFloat(servico.qtd_horas).toFixed(2)} horas</div>
                </td>

                {/* 4. Coluna Status (Badge Moderno) */}
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

                {/* 5. Coluna Ações (Só aparecem com cor no hover da linha) */}
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