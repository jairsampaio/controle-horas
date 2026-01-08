import React from 'react';
import { formatCurrency } from '../utils/formatters';

// MANUTENÇÃO: Mapeamento de estilos para o Modo Escuro (Dark Mode).
// Se adicionar um novo status no banco, adicione a cor correspondente aqui.
// As chaves devem bater exatamente com o texto da coluna 'status' na tabela 'servicos_prestados'.
const STATUS_DARK_CLASSES = {
  'Pendente': 'dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300',
  'Em aprovação': 'dark:bg-orange-900/20 dark:border-orange-900/50 dark:text-orange-200',
  'Aprovado': 'dark:bg-yellow-900/20 dark:border-yellow-900/50 dark:text-yellow-200',
  'NF Emitida': 'dark:bg-blue-900/20 dark:border-blue-900/50 dark:text-blue-200',
  'Pago': 'dark:bg-green-900/20 dark:border-green-900/50 dark:text-green-200'
};

const StatusCard = ({ status, count, valor, color, icon: Icon }) => {
  
  // Define a classe de cor. Se o status não existir no mapa acima, usa cinza como padrão (fallback).
  const activeDarkClass = STATUS_DARK_CLASSES[status] || 'dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300';

  return (
    <div className={`
        p-4 rounded-xl border transition-all duration-300 
        hover:shadow-md hover:-translate-y-1 
        ${color} /* Cores do Modo Claro (recebidas via props do componente pai) */
        ${activeDarkClass} /* Cores do Modo Escuro (calculadas aqui) */
    `}>
      
      {/* Cabeçalho: Ícone e Nome do Status */}
      <div className="flex items-center gap-2 mb-3 opacity-80 dark:opacity-100">
        {/* O ícone é recebido como componente (Lucide React) */}
        <Icon size={20} strokeWidth={2.5} />
        <span className="text-xs font-bold uppercase tracking-wider">
          {status}
        </span>
      </div>
      
      {/* Corpo: Valores Agregados */}
      <div>
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