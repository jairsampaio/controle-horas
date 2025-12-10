// src/components/StatusCard.js
import React from 'react';

const StatusCard = ({ status, count, valor, color, icon }) => {
  return (
    <div 
      className={`flex flex-col justify-between p-4 rounded-lg border shadow-sm transition-transform hover:scale-105 ${color}`}
    >
      <div className="flex justify-between items-start">
        <div className="text-3xl">{icon}</div>
        <p className="text-2xl font-bold font-mono">{count}</p>
      </div>

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wide opacity-90">
          {status}
        </p>
        <p className="text-sm font-medium opacity-80 mt-1 border-t border-black/10 pt-2">
          R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      </div>
    </div>
  );
};

export default StatusCard;