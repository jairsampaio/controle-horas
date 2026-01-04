import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirmar", cancelText = "Cancelar", type = "danger" }) => {
  if (!isOpen) return null;

  // Ajuste de cores do ícone para Dark Mode (Translúcido)
  const colorClass = type === 'danger' 
    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
    : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
  
  const btnClass = type === 'danger' 
    ? 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700' 
    : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-80 flex items-center justify-center p-4 z-[80] animate-fade-in backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-scale-in border dark:border-gray-700">
        
        <div className="p-6 text-center">
          <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${colorClass}`}>
            <AlertTriangle size={24} />
          </div>
          
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{message}</p>

          <div className="flex gap-3 justify-center">
            <button
              onClick={onClose}
              className="flex-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={() => { onConfirm(); onClose(); }}
              className={`flex-1 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-md ${btnClass}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;