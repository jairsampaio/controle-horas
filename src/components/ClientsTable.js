// src/components/ClientsTable.js
import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

const ClientsTable = ({ clientes, onEdit, onDelete }) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {clientes.map(cliente => (
            <tr key={cliente.id} className="hover:bg-blue-50 transition-all duration-200 hover:shadow-sm">
              <td className="px-6 py-4">
                <p className="font-medium text-gray-900">{cliente.nome}</p>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">{cliente.email || '-'}</td>
              <td className="px-6 py-4 text-sm text-gray-600">{cliente.telefone || '-'}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  cliente.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {cliente.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(cliente)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Editar cliente"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => onDelete(cliente.id)}
                    className="text-red-600 hover:text-red-800"
                    title="Excluir cliente"
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
  );
};

export default ClientsTable;