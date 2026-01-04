import React, { useState, useEffect } from 'react';
import { X, Save, User, DollarSign } from 'lucide-react';

const ConfigModal = ({ isOpen, onClose, onSave, valorAtual, nomeAtual }) => { 
  const [valor, setValor] = useState('');
  const [nome, setNome] = useState('');

  useEffect(() => {
    if (isOpen) {
      setValor(valorAtual || '');
      setNome(nomeAtual || '');
    }
  }, [isOpen, valorAtual, nomeAtual]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(valor, nome);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-80 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden border dark:border-gray-700">
        
        {/* Header */}
        <div className="bg-indigo-600 dark:bg-indigo-700 p-4 flex justify-between items-center text-white shadow-md">
          <h2 className="text-lg font-bold">Configurações Gerais</h2>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors"><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Campo Nome */}
          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <User size={16} className="text-indigo-600 dark:text-indigo-400" /> Nome do Consultor
            </label>
            <input 
              type="text" 
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white transition-colors placeholder-gray-400 dark:placeholder-gray-600"
              placeholder="Ex: Jair Sampaio"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">Este nome aparecerá no cabeçalho dos relatórios PDF.</p>
          </div>

          {/* Campo Valor Hora */}
          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <DollarSign size={16} className="text-green-600 dark:text-green-400" /> Valor Hora Padrão (R$)
            </label>
            <input 
              type="number" 
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white transition-colors placeholder-gray-400 dark:placeholder-gray-600"
              placeholder="150.00"
            />
          </div>

          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white py-2.5 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform duration-200">
            <Save size={18} /> Salvar Configurações
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConfigModal;