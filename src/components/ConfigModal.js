import React, { useState, useEffect } from 'react';
import { X, Save, User, DollarSign } from 'lucide-react';

const ConfigModal = ({ isOpen, onClose, onSave, valorAtual, nomeAtual }) => { // 👈 Recebe nomeAtual
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
    // Passa os dois valores para a função de salvar
    onSave(valor, nome);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
          <h2 className="text-lg font-bold">Configurações Gerais</h2>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full"><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Campo Nome */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <User size={16} className="text-indigo-600" /> Nome do Consultor
            </label>
            <input 
              type="text" 
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ex: Jair Sampaio"
            />
            <p className="text-xs text-gray-500">Este nome aparecerá no cabeçalho dos relatórios PDF.</p>
          </div>

          {/* Campo Valor Hora */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <DollarSign size={16} className="text-green-600" /> Valor Hora Padrão (R$)
            </label>
            <input 
              type="number" 
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="150.00"
            />
          </div>

          <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
            <Save size={18} /> Salvar Configurações
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConfigModal;