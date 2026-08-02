import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

const ErrorState = ({ title = "Erro ao carregar dados", message, onRetry }) => {
  return (
    <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/40 rounded-3xl p-10 flex flex-col items-center text-center gap-3">
      <AlertCircle size={40} className="text-red-500" />

      <h3 className="font-bold text-red-600 dark:text-red-400 text-lg">{title}</h3>

      {message && (
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md">{message}</p>
      )}

      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors"
        >
          <RefreshCw size={16} /> Tentar novamente
        </button>
      )}
    </div>
  );
};

export default ErrorState;
