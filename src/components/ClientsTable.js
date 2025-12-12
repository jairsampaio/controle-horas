// src/components/ClientsTable.js
import React from 'react';
import { Edit2, Trash2, Mail, Phone, User } from 'lucide-react';

const ClientsTable = ({ clientes, onEdit, onDelete }) => {
  
  // Função para gerar cor de avatar baseada na letra
  const getAvatarColor = (name) => {
    const colors = ['bg-red-100 text-red-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-yellow-100 text-yellow-700', 'bg-indigo-100 text-indigo-700'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // --- EMPTY STATE ---
  if (clientes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="bg-indigo-50 p-4 rounded-full mb-4">
          <User size={40} className="text-indigo-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-800">Sua lista de clientes está vazia</h3>
        <p className="text-gray-500 max-w-sm mt-2">
          Cadastre seus clientes para gerenciar os serviços prestados a eles.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* --- VERSÃO MOBILE (CARDS) --- */}
      <div className="md:hidden space-y-4">
        {clientes.map(cliente => (
          <div key={cliente.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
            
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3 font-bold text-gray-800 text-lg">
                {/* Avatar no Mobile também */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm ${getAvatarColor(cliente.nome)}`}>
                  {cliente.nome.charAt(0)}
                </div>
                {cliente.nome}
              </div>
              <span className={`px-2 py-1 text-xs rounded-full font-bold uppercase tracking-wider ${
                  cliente.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {cliente.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            <div className="space-y-2 text-sm text-gray-600 pl-14"> {/* Indentação para alinhar com o nome */}
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-gray-400" />
                {cliente.email || <span className="text-gray-300 italic">Sem e-mail</span>}
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-gray-400" />
                {cliente.telefone || <span className="text-gray-300 italic">Sem telefone</span>}
              </div>
            </div>

            <div className="pt-3 mt-2 border-t border-gray-50 flex justify-end gap-2">
               <button onClick={() => onEdit(cliente)} className="p-2 text-blue-600 bg-blue-50 rounded-lg active:scale-95 transition-transform"><Edit2 size={18}/></button>
               <button onClick={() => onDelete(cliente.id)} className="p-2 text-red-600 bg-red-50 rounded-lg active:scale-95 transition-transform"><Trash2 size={18}/></button>
            </div>
          </div>
        ))}
      </div>

      {/* --- VERSÃO DESKTOP MODERNIZADA --- */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente / Email</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Telefone</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clientes.map(cliente => (
              <tr key={cliente.id} className="group hover:bg-indigo-50 transition-colors duration-150">
                
                {/* 1. Nome + Avatar + Email */}
                <td className="px-6 py-4 whitespace-nowrap">
                   <div className="flex items-center">
                    <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center font-bold ${getAvatarColor(cliente.nome)}`}>
                      {cliente.nome.charAt(0)}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-bold text-gray-900">{cliente.nome}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Mail size={12} /> {cliente.email || 'Sem e-mail'}
                      </div>
                    </div>
                  </div>
                </td>

                {/* 2. Telefone */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                     <Phone size={16} className="text-gray-400" />
                     {cliente.telefone || '-'}
                  </div>
                </td>

                {/* 3. Status Badge */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                    cliente.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {cliente.ativo ? 'ATIVO' : 'INATIVO'}
                  </span>
                </td>

                {/* 4. Ações Fantasmas */}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={() => onEdit(cliente)}
                      className="text-gray-400 hover:text-indigo-600 transition-colors p-1 hover:bg-indigo-50 rounded"
                      title="Editar"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => onDelete(cliente.id)}
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

export default ClientsTable;