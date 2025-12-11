import React from 'react';

// Aceita as props que o App.js irá passar
const ServiceModal = ({ isOpen, onClose, onSave, formData, setFormData, clientes, isEditing }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity duration-300 opacity-100">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-95 animate-slide-up">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">
            {isEditing ? 'Editar Serviço' : 'Novo Serviço'}
          </h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({...formData, data: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                <select
                  value={formData.cliente}
                  onChange={(e) => setFormData({...formData, cliente: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Selecione...</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.nome}>{c.nome}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora Inicial</label>
                <input
                  type="time"
                  value={formData.hora_inicial}
                  onChange={(e) => setFormData({...formData, hora_inicial: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora Final</label>
                <input
                  type="time"
                  value={formData.hora_final}
                  onChange={(e) => setFormData({...formData, hora_final: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor/Hora (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.valor_hora}
                  onChange={(e) => setFormData({...formData, valor_hora: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Em aprovação">Em aprovação</option>
                  <option value="Aprovado">Aprovado</option>
                  <option value="NF Emitida">NF Emitida</option>
                  <option value="Pago">Pago</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Solicitante</label>
                <input
                  type="text"
                  value={formData.solicitante}
                  onChange={(e) => setFormData({...formData, solicitante: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número NFS</label>
                <input
                  type="text"
                  value={formData.numero_nfs}
                  onChange={(e) => setFormData({...formData, numero_nfs: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Atividade *</label>
              <textarea
                value={formData.atividade}
                onChange={(e) => setFormData({...formData, atividade: e.target.value})}
                className="w-full border rounded px-3 py-2"
                rows="3"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                className="w-full border rounded px-3 py-2"
                rows="2"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                onClick={onSave} // Usando a prop onSave
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg 
                hover:bg-indigo-700 transition-all duration-200 
                hover:scale-105 active:scale-95"
              >
                {isEditing ? 'Atualizar' : 'Cadastrar'}
              </button>
              <button
                onClick={onClose} // Usando a prop onClose
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

export default ServiceModal;