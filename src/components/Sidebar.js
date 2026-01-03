import React, { useState } from 'react';
import { LayoutDashboard, Briefcase, Users, Settings, LogOut, Building2, X, Shield } from 'lucide-react'; // 👈 Shield importado

const Sidebar = ({ activeTab, setActiveTab, isOpen, onClose, onLogout, onOpenConfig, onOpenChannels, userEmail, onOpenAdmin }) => { // 👈 Props Admin recebidas
  
  // --- LÓGICA DE SWIPE (ARRASTAR) ---
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    if (isLeftSwipe) {
      onClose();
    }
  };
  
  const swipeHandlers = { onTouchStart, onTouchMove, onTouchEnd };
  // ----------------------------------

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'servicos', label: 'Serviços', icon: Briefcase },
    { id: 'clientes', label: 'Clientes', icon: Users },
  ];

  const handleNavigation = (id) => {
    setActiveTab(id);
    if (window.innerWidth < 768) { 
      onClose();
    }
  };

  // ⚠️ IMPORTANTE: Coloque aqui o e-mail que terá acesso mestre
  const ADMIN_EMAIL = 'contatosampaiojair@gmail.com'; 

  return (
    <>
      {/* OVERLAY ESCURO (Swipeable) */}
      <div 
        className={`
          fixed inset-0 z-40 md:hidden bg-black/50 backdrop-blur-sm transition-opacity duration-300
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
        {...swipeHandlers}
      />

      {/* SIDEBAR (Swipeable + Cubic Bezier) */}
      <aside 
        {...swipeHandlers}
        className={`
          fixed top-0 left-0 z-50 h-screen w-72 bg-white border-r border-gray-200 shadow-2xl 
          transform transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:shadow-none md:w-64 md:transform-none
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-20 px-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-indigo-200 shadow-lg">
              CH
            </div>
            <div>
              <span className="text-xl font-bold text-gray-800 block leading-tight">Controle</span>
              <span className="text-xs font-semibold text-indigo-500 uppercase tracking-widest">Horas</span>
            </div>
          </div>
          <button onClick={onClose} className="md:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Navegação */}
        <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-140px)] scrollbar-hide">
          <p className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Principal</p>
          
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-300 group
                ${activeTab === item.id 
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
              `}
            >
              <item.icon 
                size={22} 
                className={`transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`}
                strokeWidth={activeTab === item.id ? 2.5 : 2} 
              />
              {item.label}
            </button>
          ))}

          <div className="pt-4 mt-4 border-t border-gray-100">
            <p className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Gestão</p>
            
            <button
              onClick={() => { onOpenChannels(); onClose(); }}
              className="w-full flex items-center gap-4 px-4 py-3.5 text-sm font-medium text-gray-500 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all group"
            >
              <Building2 size={22} className="group-hover:text-indigo-500 transition-colors" />
              Canais / Parceiros
            </button>

            <button
              onClick={() => { onOpenConfig(); onClose(); }}
              className="w-full flex items-center gap-4 px-4 py-3.5 text-sm font-medium text-gray-500 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all group"
            >
              <Settings size={22} className="group-hover:text-indigo-500 transition-colors" />
              Configurações
            </button>

            {/* 🔴 BOTÃO SECRETO DE ADMIN (Só aparece para você) */}
            {userEmail === ADMIN_EMAIL && (
              <button
                onClick={() => { onOpenAdmin(); onClose(); }}
                className="w-full flex items-center gap-4 px-4 py-3.5 text-sm font-bold text-gray-900 bg-yellow-400 hover:bg-yellow-500 rounded-xl transition-all shadow-md mt-6"
              >
                <Shield size={22} className="text-black" />
                CENTRAL ADMIN
              </button>
            )}
          </div>
        </nav>

        {/* Footer Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-gray-50/50 backdrop-blur-sm">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;