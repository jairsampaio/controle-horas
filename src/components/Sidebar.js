import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, Briefcase, Users, Settings, LogOut, X, 
  ShieldCheck, Wallet, FileText, Building2, Lightbulb
} from 'lucide-react';
import supabase from '../services/supabase';

const Sidebar = ({ activeTab, setActiveTab, isOpen, onClose, onLogout, onOpenConfig, onOpenChannels, userEmail }) => {
  const [userRole, setUserRole] = useState(null);

  // Busca a role (cargo) do usuário ao carregar o Sidebar
  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setUserRole(data?.role);
      }
    };
    fetchRole();
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
  };

  const MenuButton = ({ id, icon: Icon, label, requiredRole }) => {
    // Se o botão requer role e o usuário não tem a role certa, não renderiza nada
    if (requiredRole && requiredRole !== userRole && userRole !== 'super_admin') return null;
    
    // Proteção extra para os menus do Super Admin (Jair)
    if (requiredRole === 'super_admin' && userRole !== 'super_admin') return null;

    return (
      <button
        onClick={() => {
          setActiveTab(id);
          if (window.innerWidth < 768) onClose();
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm
          ${activeTab === id 
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none' 
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-indigo-600 dark:hover:text-indigo-400'
          }
        `}
      >
        <Icon size={20} className={activeTab === id ? 'text-white' : (requiredRole === 'super_admin' ? 'text-yellow-600 dark:text-yellow-500' : '')} />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={onClose} />
      )}

      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 font-black text-xl text-indigo-600 tracking-tight">
            <Briefcase className="fill-indigo-600 text-white" size={24} />
            <span>Consult<span className="text-gray-800 dark:text-white">Master</span></span>
          </div>
          <button onClick={onClose} className="md:hidden text-gray-400 hover:text-gray-600"><X size={24} /></button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          
          <div className="pb-2 mb-2 border-b border-gray-100 dark:border-gray-800">
            <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Operacional</p>
            
            <MenuButton id="dashboard" icon={LayoutDashboard} label="Dashboard" />
            <MenuButton id="servicos" icon={Briefcase} label="Meus Serviços" />
            
            <button onClick={() => { onOpenChannels(); if (window.innerWidth < 768) onClose(); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-indigo-600 dark:hover:text-indigo-400">
              <Building2 size={20} />
              <span>Canais / Parceiros</span>
            </button>

            <MenuButton id="clientes" icon={Users} label="Clientes" />
            
            {/* Somente Admin e Super Admin veem o menu de Equipe */}
            <MenuButton id="team" icon={Users} label="Minha Equipe" requiredRole="admin" />
          </div>

          {/* Área Administrativa do SaaS (Só para VOCÊ, Super Admin) */}
          {userRole === 'super_admin' && (
            <div className="pt-2 pb-2 mb-2 border-b border-gray-100 dark:border-gray-800">
              <p className="px-4 text-[10px] font-bold text-yellow-600 dark:text-yellow-500 uppercase tracking-wider mb-2">Administração SaaS</p>
              <MenuButton id="admin-tenants" icon={ShieldCheck} label="Gestão de Assinantes" requiredRole="super_admin" />
              <MenuButton id="admin-finance" icon={Wallet} label="Financeiro SaaS" requiredRole="super_admin" />
              <MenuButton id="admin-plans" icon={FileText} label="Planos & Preços" requiredRole="super_admin" />
            </div>
          )}

        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <button onClick={() => { onOpenConfig(); if(window.innerWidth < 768) onClose(); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-lg hover:bg-white dark:hover:bg-gray-800 mb-1">
            <Settings size={18} /> Configurações
          </button>

          <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors rounded-lg hover:bg-white dark:hover:bg-gray-800 mb-1">
            <Lightbulb size={18} /> Alterar Tema
          </button>

          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="px-4 mb-2">
              <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{userEmail}</p>
              <div className="flex justify-between items-center">
                <p className="text-[10px] text-gray-500 dark:text-gray-500">Logado</p>
                <span className="text-[10px] uppercase font-bold text-indigo-500">{userRole || '...'}</span>
              </div>
            </div>
            <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium">
              <LogOut size={18} /> Sair do Sistema
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;