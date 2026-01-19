import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom'; 
import { 
  LayoutDashboard, Briefcase, Users, Settings, LogOut, X, 
  ShieldCheck, Wallet, FileText, Building2, Lightbulb, User, Lock, Save, Target, Calendar
} from 'lucide-react';
import supabase from '../services/supabase';

const Sidebar = ({ activeTab, setActiveTab, isOpen, onClose, onLogout, onOpenConfig, userEmail }) => {
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState(''); 
  
  // Estados do Modal de Perfil
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(false);

  // --- CARREGAR DADOS DO USUÁRIO ---
  useEffect(() => {
    const fetchRoleAndName = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // MANUTENÇÃO: Busca 'role' (cargo correto no banco) e 'nome'
        const { data } = await supabase
          .from('profiles')
          .select('role, nome') 
          .eq('id', user.id)
          .single();
        
        // Se não achar 'role', assume 'colaborador' por segurança
        setUserRole(data?.role || 'colaborador');
        setUserName(data?.nome || '');
        setEditName(data?.nome || ''); 
      }
    };
    fetchRoleAndName();
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
  };

  // --- ATUALIZAR PERFIL ---
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoadingProfile(true);

    try {
      const updates = {};
      
      // 1. Atualizar Senha (Auth)
      if (newPassword) {
        if (newPassword.length < 6) throw new Error("A nova senha deve ter no mínimo 6 caracteres.");
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        updates.passwordUpdated = true;
      }

      // 2. Atualizar Nome (Banco + Auth Metadata)
      if (editName !== userName) {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Atualiza na tabela pública
        const { error: dbError } = await supabase
            .from('profiles')
            .update({ nome: editName })
            .eq('id', user.id);
        if (dbError) throw dbError;

        // Atualiza nos metadados do Auth (opcional, mas bom para consistência)
        await supabase.auth.updateUser({ data: { nome_completo: editName } });
        
        setUserName(editName);
        updates.nameUpdated = true;
      }

      let msg = "Perfil atualizado com sucesso!";
      if (updates.passwordUpdated) msg += " Use a nova senha no próximo login.";
      
      alert(msg);
      setNewPassword(''); 
      setShowProfileModal(false);

    } catch (error) {
      alert("Erro ao atualizar: " + error.message);
    } finally {
      setLoadingProfile(false);
    }
  };

  // --- COMPONENTE INTERNO DE MENU ---
  const MenuButton = ({ id, icon: Icon, label, requiredRole }) => {
    // Lógica de Permissão:
    // 1. Super Admin vê tudo.
    // 2. Se o botão exige role X e o usuário não tem X (e não é super), esconde.
    if (requiredRole && requiredRole !== userRole && userRole !== 'super_admin') return null;
    
    // 3. Se o botão é EXCLUSIVO de super_admin, ninguém mais vê.
    if (requiredRole === 'super_admin' && userRole !== 'super_admin') return null;

    return (
      <button
        onClick={() => {
          setActiveTab(id);
          // Fecha o menu no mobile ao clicar
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
      {/* Overlay Escuro (Mobile) */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={onClose} />
      )}

      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 font-black text-xl text-indigo-600 tracking-tight">
            <Briefcase className="fill-indigo-600 text-white" size={24} />
            <span>Consult<span className="text-gray-800 dark:text-white">Master</span></span>
          </div>
          <button onClick={onClose} className="md:hidden text-gray-400 hover:text-gray-600"><X size={24} /></button>
        </div>

        {/* Menu Principal */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          
          <div className="pb-2 mb-2 border-b border-gray-100 dark:border-gray-800">
            <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Operacional</p>
            
            <MenuButton id="dashboard" icon={LayoutDashboard} label="Dashboard" />
            <MenuButton id="servicos" icon={Briefcase} label="Meus Serviços" />
            <MenuButton id="demandas" icon={Target} label="Gestão de Demandas" />
            
            {/* Menu Canais: Acessível a todos */}
            <MenuButton id="channels" icon={Building2} label="Canais / Parceiros" />

            <MenuButton id="clientes" icon={Users} label="Clientes" />
            
            {/* Menu Equipe: Apenas para Admin/Dono */}
            <MenuButton id="team" icon={Users} label="Minha Equipe" requiredRole="admin" />

            {/* --- AQUI ESTÁ O BOTÃO DA AGENDA QUE FALTA --- */}
            <button 
                onClick={() => { setActiveTab('agenda'); if (window.innerWidth < 768 && onClose) onClose(); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm
                    ${activeTab === 'agenda' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-indigo-600 dark:hover:text-indigo-400'
                    }
                `}
            >
                <Calendar size={20} className={activeTab === 'agenda' ? 'text-white' : ''} />
                <span>Agenda da Equipe</span>
            </button>
          </div>    

          {/* Área Super Admin (SaaS) */}
          {userRole === 'super_admin' && (
            <div className="pt-2 pb-2 mb-2 border-b border-gray-100 dark:border-gray-800">
              <p className="px-4 text-[10px] font-bold text-yellow-600 dark:text-yellow-500 uppercase tracking-wider mb-2">Administração SaaS</p>
              <MenuButton id="admin-tenants" icon={ShieldCheck} label="Gestão de Assinantes" requiredRole="super_admin" />
              <MenuButton id="admin-finance" icon={Wallet} label="Financeiro SaaS" requiredRole="super_admin" />
              <MenuButton id="admin-plans" icon={FileText} label="Planos & Preços" requiredRole="super_admin" />
            </div>
          )}

        </nav>

        {/* Rodapé da Sidebar */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <button onClick={() => { onOpenConfig(); if(window.innerWidth < 768) onClose(); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-lg hover:bg-white dark:hover:bg-gray-800 mb-1">
            <Settings size={18} /> Configurações
          </button>

          <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors rounded-lg hover:bg-white dark:hover:bg-gray-800 mb-1">
            <Lightbulb size={18} /> Alterar Tema
          </button>

          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            {/* Perfil Resumido */}
            <div 
              className="px-4 mb-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg py-2 transition-colors group"
              onClick={() => setShowProfileModal(true)}
              title="Clique para editar seu perfil"
            >
              <p className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {userName || 'Carregando...'}
              </p>
              <div className="flex justify-between items-center">
                <p className="text-[10px] text-gray-500 dark:text-gray-500 truncate max-w-[120px]">{userEmail}</p>
                <span className="text-[10px] uppercase font-bold text-indigo-500">{userRole ? userRole.replace('_', ' ') : '...'}</span>
              </div>
            </div>
            
            <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium">
              <LogOut size={18} /> Sair do Sistema
            </button>
          </div>
        </div>
      </aside>

      {/* MODAL DE PERFIL */}
      {showProfileModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={(e) => e.stopPropagation()}>
           <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-gray-800 animate-scale-in" onClick={(e) => e.stopPropagation()}>
              
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                   <User className="text-indigo-600" /> Meu Perfil
                </h3>
                <button onClick={() => setShowProfileModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                 
                 <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Seu E-mail</label>
                    <div className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300 text-sm border border-gray-200 dark:border-gray-700">
                       {userEmail}
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome de Exibição</label>
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alterar Senha</label>
                    <div className="relative">
                       <Lock size={18} className="absolute left-3 top-2.5 text-gray-400" />
                       <input 
                         type="password" 
                         value={newPassword}
                         onChange={(e) => setNewPassword(e.target.value)}
                         placeholder="Nova senha (mín. 6 caracteres)"
                         className="w-full pl-10 rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                         autoComplete="new-password"
                       />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">Deixe em branco se não quiser alterar a senha.</p>
                 </div>

                 <div className="pt-2">
                    <button 
                      type="submit" 
                      disabled={loadingProfile}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
                    >
                       {loadingProfile ? 'Salvando...' : <><Save size={18} /> Salvar Alterações</>}
                    </button>
                 </div>

              </form>
           </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default Sidebar;