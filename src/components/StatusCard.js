// src/components/StatusCard.js
import React from 'react';

const StatusCard = ({ status, count, valor, color, icon: Icon }) => {
  return (
    <div className={`p-4 rounded-xl border transition-all duration-300 hover:shadow-md hover:-translate-y-1 ${color}`}>
      
      <div className="flex justify-between items-start">
        {/* Lado Esquerdo: Título e Ícone juntos */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 opacity-80">
            <Icon size={20} strokeWidth={2.5} />
            <span className="text-xs font-bold uppercase tracking-wider">
              {status}
            </span>
          </div>
          
          {/* Valor Principal */}
          <div className="mt-3">
             <h3 className="text-3xl font-bold">{count}</h3>
          </div>
        </div>

        {/* Lado Direito: Valor Financeiro (menor) */}
        <div className="text-right flex flex-col justify-end h-full pt-6">
           <p className="text-sm font-semibold opacity-90">
            R$ {valor.toFixed(2).replace('.', ',')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatusCard;