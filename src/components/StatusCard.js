import React from 'react';
import { formatCurrency } from '../utils/formatters';

const StatusCard = ({ status, count, valor, color, icon: Icon }) => {
  
  // Mapeamento para forçar cores bonitas no Dark Mode (Fundo translúcido + Texto claro)
  const darkClasses = {
    'Pendente': 'dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300',
    'Em aprovação': 'dark:bg-orange-900/20 dark:border-orange-900/50 dark:text-orange-200',
    'Aprovado': 'dark:bg-yellow-900/20 dark:border-yellow-900/50 dark:text-yellow-200',
    'NF Emitida': 'dark:bg-blue-900/20 dark:border-blue-900/50 dark:text-blue-200',
    'Pago': 'dark:bg-green-900/20 dark:border-green-900/50 dark:text-green-200'
  };

  // Seleciona a cor dark baseada no status (ou usa cinza padrão se não achar)
  const activeDarkClass = darkClasses[status] || 'dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300';

  return (
    <div className={`
        p-4 rounded-xl border transition-all duration-300 
        hover:shadow-md hover:-translate-y-1 
        ${color} /* Mantém as cores do modo claro vindas do pai */
        ${activeDarkClass} /* Aplica as cores do modo escuro */
    `}>
      
      {/* Cabeçalho: Ícone e Nome */}
      <div className="flex items-center gap-2 mb-3 opacity-80 dark:opacity-100">
        <Icon size={20} strokeWidth={2.5} />
        <span className="text-xs font-bold uppercase tracking-wider">
          {status}
        </span>
      </div>
      
      {/* Valor Financeiro */}
      <div>
         {/* dark:text-white para garantir leitura no fundo escuro */}
         <h3 className="text-2xl font-bold tracking-tight dark:text-white">
           {formatCurrency(valor)}
         </h3>
         
         <p className="text-sm font-medium opacity-70 mt-1 dark:text-gray-400">
           {count} {count === 1 ? 'serviço' : 'serviços'}
         </p>
      </div>

    </div>
  );
};

export default StatusCard;