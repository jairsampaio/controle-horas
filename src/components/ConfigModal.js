// src/components/ConfigModal.js
import React, { useState, useEffect } from 'react';

const ConfigModal = ({ isOpen, onClose, onSave, valorAtual }) => {
  const [valor, setValor] = useState('');

  // Sempre que o modal abre ou o valor atual muda, atualiza o input local
  useEffect(() => {
    if (isOpen) {
      setValor(valorAtual);
    }
  }, [isOpen, valorAtual]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 animate-slide-up">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Configurações</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor da Hora Padrão (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none transition"
              placeholder="Ex: 150.00"
            />
            <p className="text-xs text-gray-500 mt-1">
              Este valor será usado automaticamente em novos serviços.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => onSave(valor)}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              Salvar
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;