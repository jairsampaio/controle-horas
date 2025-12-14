import React from 'react';
import { X, Save, User, Mail, Phone, RotateCcw } from 'lucide-react';

const ClientModal = ({ isOpen, onClose, onSave, formData, setFormData, isEditing }) => {
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave();
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Cores dinâmicas
  const headerColor = isEditing ? 'bg-orange-500' : 'bg-indigo-600';
  const buttonColor = isEditing ? 'bg-orange-500 hover:bg-orange-600' : 'bg-indigo-600 hover:bg-indigo-700';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
        
        {/* Cabeçalho Laranja/Azul */}
        <div className={`${headerColor} p-5 flex justify-between items-center text-white transition-colors duration-300`}>
          <div>
            <h2 className="text-xl font-bold">{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</h2>
            <p className="text-sm opacity-90">{isEditing ? 'Alterando cadastro' : 'Adicionando à carteira'}</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <User size={14} /> Nome da Empresa/Pessoa
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => handleChange('nome', e.target.value)}
              className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ex: Empresa XYZ"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <Mail size={14} /> E-mail (Coordenador)
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="financeiro@empresa.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <Phone size={14} /> Telefone
            </label>
            <input
              type="tel"
              value={formData.telefone}
              onChange={(e) => handleChange('telefone', e.target.value)}
              className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="(11) 99999-9999"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="ativo"
              checked={formData.ativo}
              onChange={(e) => handleChange('ativo', e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
            />
            <label htmlFor="ativo" className="text-sm text-gray-700 font-medium select-none cursor-pointer">
              Cliente Ativo?
            </label>
          </div>

          {/* Botões Menores */}
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-2 rounded text-sm font-medium hover:bg-gray-200 transition-colors flex justify-center items-center gap-2"
            >
              <RotateCcw size={16} /> Cancelar
            </button>
            <button
              type="submit"
              className={`flex-1 text-white py-2 rounded text-sm font-medium transition-colors flex justify-center items-center gap-2 ${buttonColor}`}
            >
              <Save size={16} /> {isEditing ? 'Salvar Alterações' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientModal;