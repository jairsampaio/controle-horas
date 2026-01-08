import React from 'react';
import { X, Save, User, Phone, RotateCcw, Building } from 'lucide-react';

// --- HELPER: Máscara de Telefone ---
const maskPhone = (value) => {
  if (!value) return "";
  return value
    .replace(/\D/g, "") // Remove não dígitos
    .replace(/^(\d{2})(\d)/g, "($1) $2") // (11) 9...
    .replace(/(\d)(\d{4})$/, "$1-$2") // ...-1234
    .slice(0, 15); // Limite de caracteres
};

const ClientModal = ({ isOpen, onClose, onSave, formData, setFormData, isEditing }) => {
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(); // Chama a função do pai para persistir no Supabase
  };

  const handleChange = (field, value) => {
    const finalValue = field === 'telefone' ? maskPhone(value) : value;
    setFormData(prev => ({ ...prev, [field]: finalValue }));
  };

  const headerColor = isEditing ? 'bg-orange-500' : 'bg-indigo-600';
  const buttonColor = isEditing ? 'bg-orange-500 hover:bg-orange-600' : 'bg-indigo-600 hover:bg-indigo-700';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-80 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up border dark:border-gray-700">
        
        {/* Cabeçalho */}
        <div className={`${headerColor} p-5 flex justify-between items-center text-white transition-colors duration-300 shadow-md`}>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
                <Building size={20} />
                {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>
            <p className="text-sm opacity-90">{isEditing ? 'Alterando dados da empresa' : 'Cadastrando nova empresa'}</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Nome da Empresa */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <User size={14} /> Nome da Empresa
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => handleChange('nome', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 transition-colors"
              placeholder="Ex: Empresa XYZ Ltda"
              required
              autoFocus
            />
          </div>

          {/* Telefone Geral */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Phone size={14} /> Telefone Geral
            </label>
            <input
              type="tel"
              value={formData.telefone}
              onChange={(e) => handleChange('telefone', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 transition-colors"
              placeholder="(11) 99999-9999"
            />
          </div>

          {/* Status Ativo/Inativo */}
          <div className="flex items-center gap-2 pt-2 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
            <input
              type="checkbox"
              id="ativo"
              checked={formData.ativo}
              onChange={(e) => handleChange('ativo', e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
            />
            <label htmlFor="ativo" className="text-sm text-gray-700 dark:text-gray-300 font-medium select-none cursor-pointer flex-1">
              Cliente Ativo?
            </label>
          </div>

          {/* Dica de UX */}
          {!isEditing && (
              <div className="text-xs text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex items-start gap-2 border border-blue-100 dark:border-blue-900/30">
                  <span className="font-bold">Nota:</span> 
                  Após salvar a empresa, você poderá cadastrar os Solicitantes (pessoas de contato) na tela principal.
              </div>
          )}

          {/* Footer de Ações */}
          <div className="pt-4 flex gap-3 border-t border-gray-100 dark:border-gray-700 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex justify-center items-center gap-2"
            >
              <RotateCcw size={16} /> Cancelar
            </button>
            <button
              type="submit"
              className={`flex-1 text-white py-2 rounded-lg text-sm font-medium transition-colors flex justify-center items-center gap-2 shadow-md ${buttonColor}`}
            >
              <Save size={16} /> <span className="font-bold">Salvar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientModal;