// src/components/ClientModal.js
import React from 'react';

const ClientModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  formData, 
  setFormData, 
  isEditing 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity duration-300 opacity-100">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full transform transition-all duration-300 scale-95 animate-slide-up">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">
            {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                className="w-full border rounded px-3 py-2"
                placeholder="Nome do cliente"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full border rounded px-3 py-2"
                placeholder="email@exemplo.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input
                type="text"
                value={formData.telefone}
                onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                className="w-full border rounded px-3 py-2"
                placeholder="(11) 99999-9999"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ativo"
                checked={formData.ativo}
                onChange={(e) => setFormData({...formData, ativo: e.target.checked})}
                className="rounded"
              />
              <label htmlFor="ativo" className="text-sm font-medium text-gray-700">Cliente ativo</label>
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                onClick={onSave}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg 
                          hover:bg-indigo-700 transition-all duration-200 
                          hover:scale-105 active:scale-95"
              >
                {isEditing ? 'Atualizar' : 'Cadastrar'}
              </button>

              <button
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg 
                          hover:bg-gray-300 transition-all duration-200 
                          hover:scale-105 active:scale-95"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientModal;