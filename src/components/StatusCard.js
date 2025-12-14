import React from 'react';
import { formatCurrency } from '../utils/formatters';

const StatusCard = ({ status, count, valor, color, icon: Icon }) => {
  return (
    <div className={`p-4 rounded-xl border transition-all duration-300 hover:shadow-md hover:-translate-y-1 ${color}`}>
      
      {/* Cabeçalho: Ícone e Nome */}
      <div className="flex items-center gap-2 mb-3 opacity-80">
        <Icon size={20} strokeWidth={2.5} />
        <span className="text-xs font-bold uppercase tracking-wider">
          {status}
        </span>
      </div>
      
      {/* Valor Financeiro (Formatado com vírgula e milhar) */}
      <div>
         <h3 className="text-2xl font-bold tracking-tight">
           {formatCurrency(valor)}
         </h3>
         
         <p className="text-sm font-medium opacity-70 mt-1">
           {count} {count === 1 ? 'serviço' : 'serviços'}
         </p>
      </div>

    </div>
  );
};

export default StatusCard;