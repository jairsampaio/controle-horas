import React from 'react';
import { Edit2, Trash2, Phone, Users, RotateCcw, CheckCircle, Ban } from 'lucide-react';

const ClientsTable = ({ clientes, onEdit, onDeleteClick, onManageTeam, onReactivate }) => { 
  
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

  if (clientes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-full mb-4">
          <Users size={40} className="text-indigo-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Nenhum cliente listado</h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm mt-2">
          Ajuste os filtros ou cadastre um novo cliente.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* --- VERSÃO MOBILE (Cards Compactos) --- */}
      <div className="md:hidden space-y-4">
        {clientes.map(cliente => (
          <div key={cliente.id} className={`p-4 rounded-xl shadow-sm border flex flex-col gap-3 transition-colors ${cliente.ativo === false ? 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3 font-bold text-gray-800 dark:text-white text-lg">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm ${cliente.ativo === false ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400' : getAvatarColor(cliente.nome)}`}>
                  {cliente.nome.charAt(0)}
                </div>
                <span className={cliente.ativo === false ? 'text-gray-500 dark:text-gray-500 decoration-gray-400 line-through' : ''}>
                    {cliente.nome}
                </span>
              </div>
              
              {/* Badge Status Mobile */}
              {cliente.ativo === false && (
                <span className="px-2 py-1 text-xs rounded-full font-bold uppercase tracking-wider bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Ban size={10} /> Inativo
                </span>
              )}
            </div>
            
            {cliente.telefone && (
                <div className="text-sm text-gray-600 dark:text-gray-400 pl-14 flex items-center gap-2">
                    <Phone size={14} className="text-gray-400 dark:text-gray-500" /> {cliente.telefone}
                </div>
            )}

            <div className="pt-3 mt-2 border-t border-gray-200/50 dark:border-gray-700/50 flex justify-end gap-3">
               
               <button 
                 onClick={() => onManageTeam(cliente)} 
                 className="p-2 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg active:scale-95 transition-transform" 
                 title="Gerenciar Equipe"
               >
                 <Users size={20}/>
               </button>

               <button 
                 onClick={() => onEdit(cliente)} 
                 className="p-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg active:scale-95 transition-transform" 
                 title="Editar"
               >
                 <Edit2 size={20}/>
               </button>
               
               {cliente.ativo !== false ? (
                   <button 
                     onClick={() => onDeleteClick(cliente)} 
                     className="p-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg active:scale-95 transition-transform" 
                     title="Inativar"
                   >
                     <Trash2 size={20}/>
                   </button>
               ) : (
                   <button 
                     onClick={() => onReactivate(cliente.id)} 
                     className="p-2 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded-lg active:scale-95 transition-transform" 
                     title="Restaurar"
                   >
                     <RotateCcw size={20}/>
                   </button>
               )}
            </div>
          </div>
        ))}
      </div>

      {/* --- VERSÃO DESKTOP --- */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Empresa</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Telefone</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {clientes.map(cliente => (
              <tr key={cliente.id} className={`group transition-colors duration-150 ${cliente.ativo === false ? 'bg-gray-50 dark:bg-gray-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}>
                
                <td className="px-6 py-4 whitespace-nowrap">
                   <div className="flex items-center">
                    <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${cliente.ativo === false ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400' : getAvatarColor(cliente.nome)}`}>
                      {cliente.nome.charAt(0)}
                    </div>
                    <div className="ml-4">
                      <div className={`text-sm font-bold ${cliente.ativo === false ? 'text-gray-500 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                          {cliente.nome}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                      {cliente.telefone ? (<><Phone size={16} className="text-gray-400 dark:text-gray-500" />{cliente.telefone}</>) : (<span className="text-gray-300 dark:text-gray-600">-</span>)}
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  {cliente.ativo !== false ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                        <CheckCircle size={12} /> Ativo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                        <Ban size={12} /> Inativo
                    </span>
                  )}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    
                    <button onClick={() => onManageTeam(cliente)} className="text-gray-400 hover:text-indigo-600 dark:text-gray-500 dark:hover:text-indigo-400 p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded" title="Equipe">
                      <Users size={18} />
                    </button>
                    
                    <button onClick={() => onEdit(cliente)} className="text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded" title="Editar">
                      <Edit2 size={18} />
                    </button>
                    
                    {cliente.ativo !== false ? (
                        <button onClick={() => onDeleteClick(cliente)} className="text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title="Inativar">
                          <Trash2 size={18} />
                        </button>
                    ) : (
                        <button onClick={() => onReactivate(cliente.id)} className="text-orange-400 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 p-1.5 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded" title="Restaurar Cliente">
                          <RotateCcw size={18} />
                        </button>
                    )}
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