// src/components/ServicesTable.js
import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

const ServicesTable = ({ servicos, onStatusChange, onEdit, onDelete }) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Atividade</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horas</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {servicos.map(servico => (
              <tr key={servico.id} className="hover:bg-blue-50 transition-all duration-200 hover:shadow-sm">
                <td className="px-4 py-3 text-sm">
                  {new Date(servico.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3 text-sm font-medium">{servico.cliente}</td>
                <td className="px-4 py-3 text-sm">{servico.atividade}</td>
                <td className="px-4 py-3 text-sm">{parseFloat(servico.qtd_horas).toFixed(2)}h</td>
                <td className="px-4 py-3 text-sm">R$ {parseFloat(servico.valor_total).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <select
                    value={servico.status}
                    onChange={(e) => onStatusChange(servico.id, e.target.value)}
                    className={`px-2 py-1 text-xs rounded-full border-0 cursor-pointer ${
                      servico.status === 'Pago' ? 'bg-green-100 text-green-800' :
                      servico.status === 'NF Emitida' ? 'bg-blue-100 text-blue-800' :
                      servico.status === 'Aprovado' ? 'bg-yellow-100 text-yellow-800' :
                      servico.status === 'Em aprovação' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Em aprovação">Em aprovação</option>
                    <option value="Aprovado">Aprovado</option>
                    <option value="NF Emitida">NF Emitida</option>
                    <option value="Pago">Pago</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(servico)}
                      className="text-blue-600 hover:text-blue-800 transition-transform hover:scale-125"
                      title="Editar serviço"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(servico.id)}
                      className="text-red-600 hover:text-red-800 transition-transform hover:scale-125"
                      title="Excluir serviço"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ServicesTable;