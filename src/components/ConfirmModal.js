import React from 'react';
import { AlertTriangle } from 'lucide-react';

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirmar", 
  cancelText = "Cancelar", 
  type = "danger" // Opções: 'danger' (Vermelho) ou 'info' (Azul)
}) => {
  if (!isOpen) return null;

  // MANUTENÇÃO: Definição centralizada de temas de cor
  const styles = {
    danger: {
      iconBg: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
      btn: 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700'
    },
    info: {
      iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      btn: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700'
    }
  };

  const currentStyle = styles[type] || styles.danger;

  return (
    // Z-Index 9999 garante que este alerta fique sobre qualquer outro modal aberto
    <div 
      className="fixed inset-0 bg-black/50 dark:bg-black/80 flex items-center justify-center p-4 z-[9999] animate-fade-in backdrop-blur-sm"
      onClick={onClose} // Permite fechar clicando fora
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-scale-in border border-gray-100 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()} // Impede que o clique dentro feche o modal
      >
        
        <div className="p-6 text-center">
          <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${currentStyle.iconBg}`}>
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
              className={`flex-1 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-md ${currentStyle.btn}`}
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