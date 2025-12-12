// src/components/StatusCard.js
import React from 'react';

const StatusCard = ({ status, count, valor, color, icon: Icon }) => {
  // O segredo está ali em cima: "icon: Icon". 
  // Isso transforma a prop 'icon' em um Componente React chamado 'Icon'.

  return (
    <div className={`p-4 rounded-lg border shadow-sm transition-all hover:shadow-md ${color}`}>
      <div className="flex justify-between items-start mb-2">
        {/* Agora renderizamos o ícone como um componente, não como texto */}
        <div className="p-2 bg-white bg-opacity-60 rounded-lg">
          <Icon size={24} strokeWidth={2} /> 
        </div>
        <span className="text-xs font-bold uppercase tracking-wider opacity-80 px-2 py-1 bg-white bg-opacity-40 rounded">
          {status}
        </span>
      </div>
      
      <div className="mt-2">
        <h3 className="text-2xl font-bold">{count}</h3>
        <p className="text-sm font-medium opacity-90">
          R$ {valor.toFixed(2).replace('.', ',')}
        </p>
      </div>
    </div>
  );
};

export default StatusCard;