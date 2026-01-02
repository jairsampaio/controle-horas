import React from 'react';
import { LayoutDashboard, Briefcase, Users, Settings, LogOut, Building2, X } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, isOpen, onClose, onLogout, onOpenConfig, onOpenChannels }) => {
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'servicos', label: 'Serviços', icon: Briefcase },
    { id: 'clientes', label: 'Clientes', icon: Users },
  ];

  const handleNavigation = (id) => {
    setActiveTab(id);
    if (window.innerWidth < 768) { // Fecha o menu no mobile ao clicar
      onClose();
    }
  };

  return (
    <>
      {/* Overlay Escuro para Mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden glass"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`
          fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r border-gray-200 shadow-lg transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:shadow-none
        `}
      >
        {/* Logo / Header do Menu */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
              CH
            </div>
            <span className="text-lg font-bold text-gray-800">ControleHoras</span>
          </div>
          <button onClick={onClose} className="md:hidden text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {/* Links de Navegação */}
        <nav className="p-4 space-y-2">
          <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Menu Principal</p>
          
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200
                ${activeTab === item.id 
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
              `}
            >
              <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              {item.label}
            </button>
          ))}

          <div className="pt-4 mt-4 border-t border-gray-100">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Administração</p>
            
            <button
              onClick={() => { onOpenChannels(); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all"
            >
              <Building2 size={20} />
              Canais / Parceiros
            </button>

            <button
              onClick={() => { onOpenConfig(); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all"
            >
              <Settings size={20} />
              Configurações
            </button>
          </div>
        </nav>

        {/* Footer do Menu (Logout) */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            Sair do Sistema
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;