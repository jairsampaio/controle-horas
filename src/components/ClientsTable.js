// src/components/ClientsTable.js
import React from 'react';
import { Edit2, Trash2, Mail, Phone, User } from 'lucide-react';

const ClientsTable = ({ clientes, onEdit, onDelete }) => {
  return (
    <>
      {/* --- VERSÃO MOBILE (CARDS) --- */}
      <div className="md:hidden space-y-4">
        {clientes.length === 0 && (
          <p className="text-center text-gray-500 py-4">Nenhum cliente cadastrado.</p>
        )}
        
        {clientes.map(cliente => (
          <div key={cliente.id} className="bg-white p-4 rounded-lg shadow border border-gray-100 flex flex-col gap-3">
            
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2 font-bold text-gray-800 text-lg">
                <User size={18} className="text-indigo-500" />
                {cliente.nome}
              </div>
              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                  cliente.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {cliente.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Mail size={14} />
                {cliente.email || <span className="text-gray-400 italic">Sem e-mail</span>}
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} />
                {cliente.telefone || <span className="text-gray-400 italic">Sem telefone</span>}
              </div>
            </div>

            <div className="pt-2 border-t flex justify-end gap-3 mt-1">
               <button
                  onClick={() => onEdit(cliente)}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium active:bg-blue-100"
                >
                  <Edit2 size={14} /> Editar
                </button>
                <button
                  onClick={() => onDelete(cliente.id)}
                  className="flex items-center gap-1 px-3 py-1 bg-red-50 text-red-600 rounded-lg text-sm font-medium active:bg-red-100"
                >
                  <Trash2 size={14} /> Excluir
                </button>
            </div>
          </div>
        ))}
      </div>

      {/* --- VERSÃO DESKTOP (TABELA) --- */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
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
    </>
  );
};

export default ClientsTable;