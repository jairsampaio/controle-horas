import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Settings,
  LogOut,
  X,
  ShieldCheck,
  Wallet,
  FileText,
  Building2,
  Lightbulb,
  User,
  Lock,
  Eye,
  EyeOff,
  Save,
  Target,
  Calendar,
  BarChart3,
} from "lucide-react";

import supabase from "../services/supabase";

const Sidebar = ({
  activeTab,
  setActiveTab,
  isOpen,
  onClose,
  onLogout,
  onOpenConfig,
  userEmail,
  userProfile,
  showToast,
}) => {
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState("");

  // Modal de Perfil
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // =========================================================
  // PERMISSÕES
  // =========================================================
  const isAdmin = ["admin", "dono", "super_admin"].includes(userRole);

  const isGP = userRole === "gp";

  const canManageOperation = isAdmin || isGP;

  const isSuperAdmin = userRole === "super_admin";

  // =========================================================
  // RESOLVER ROLE EFETIVA
  // =========================================================
  const resolverRoleEfetiva = (profile) => {
    if (!profile) {
      return "consultor";
    }

    if (profile.role === "super_admin") {
      return "super_admin";
    }

    if (["admin", "dono", "gp"].includes(profile.role)) {
      return profile.role;
    }

    if (["admin", "dono", "super_admin", "gp"].includes(profile.cargo)) {
      return profile.cargo;
    }

    return profile.role || profile.cargo || "consultor";
  };

  // =========================================================
  // CARREGAR DADOS DO USUÁRIO
  // =========================================================
  useEffect(() => {
    const aplicarProfile = (profile) => {
      if (!profile) return;

      const roleEfetiva = resolverRoleEfetiva(profile);

      setUserRole(roleEfetiva);

      setUserName(profile.nome || profile.nome_completo || "");

      setEditName(profile.nome || profile.nome_completo || "");
    };

    if (userProfile) {
      aplicarProfile(userProfile);

      return;
    }

    const fetchRoleAndName = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("role, cargo, nome, nome_completo")
        .eq("id", user.id)
        .single();

      if (data) {
        aplicarProfile(data);
      }
    };

    fetchRoleAndName();
  }, [userProfile]);

  // =========================================================
  // TABS PERMITIDAS
  // =========================================================
  const allowedTabs = useMemo(() => {
    const tabs = [
      "dashboard",
      "servicos",
      "demandas",
      "channels",
      "clientes",
      "agenda",
    ];

    if (isAdmin) {
      tabs.push("reports", "team");
    }

    if (isSuperAdmin) {
      tabs.push("admin-tenants", "admin-finance", "admin-plans");
    }

    return tabs;
  }, [isAdmin, isSuperAdmin]);

  // =========================================================
  // BLOQUEIA TAB NÃO AUTORIZADA NO MENU
  // =========================================================
  useEffect(() => {
    if (!userRole) {
      return;
    }

    if (!allowedTabs.includes(activeTab)) {
      setActiveTab("dashboard");
    }
  }, [userRole, activeTab, allowedTabs, setActiveTab]);

  // =========================================================
  // TEMA
  // =========================================================
  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
  };

  // =========================================================
  // ATUALIZAR PERFIL
  // =========================================================
  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    setLoadingProfile(true);

    try {
      const updates = {};

      // SENHA
      if (newPassword) {
        if (newPassword.length < 6) {
          throw new Error("A nova senha deve ter no mínimo 6 caracteres.");
        }

        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (error) {
          throw error;
        }

        updates.passwordUpdated = true;
      }

      // NOME
      if (editName !== userName) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("Usuário não autenticado.");
        }

        const { error: dbError } = await supabase
          .from("profiles")
          .update({
            nome: editName,
          })
          .eq("id", user.id);

        if (dbError) {
          throw dbError;
        }

        await supabase.auth.updateUser({
          data: {
            nome_completo: editName,
          },
        });

        setUserName(editName);

        updates.nameUpdated = true;
      }

      let msg = "Perfil atualizado com sucesso!";

      if (updates.passwordUpdated) {
        msg += " Use a nova senha no próximo login.";
      }

      if (showToast) showToast(msg, "sucesso");

      setNewPassword("");

      setShowProfileModal(false);
    } catch (error) {
      if (showToast) showToast("Erro ao atualizar: " + error.message, "erro");
    } finally {
      setLoadingProfile(false);
    }
  };

  // =========================================================
  // MENU BUTTON
  // =========================================================
  const MenuButton = ({ id, icon: Icon, label, allowedRoles }) => {
    if (allowedRoles && !allowedRoles.includes(userRole)) {
      return null;
    }

    return (
      <button
        onClick={() => {
          setActiveTab(id);

          if (window.innerWidth < 768 && onClose) {
            onClose();
          }
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm ${
          activeTab === id
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none"
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-indigo-600 dark:hover:text-indigo-400"
        }`}
      >
        <Icon
          size={20}
          className={
            activeTab === id
              ? "text-white"
              : allowedRoles?.includes("super_admin") &&
                allowedRoles.length === 1
              ? "text-yellow-600 dark:text-yellow-500"
              : ""
          }
        />

        <span>{label}</span>
      </button>
    );
  };

  return (
    <>
      {/* OVERLAY MOBILE */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* LOGO */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 font-black text-xl text-indigo-600 tracking-tight">
            <Briefcase className="fill-indigo-600 text-white" size={24} />

            <span>
              Consult
              <span className="text-gray-800 dark:text-white">Flow</span>
            </span>
          </div>

          <button
            onClick={onClose}
            className="md:hidden text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* MENU */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          {/* OPERACIONAL */}
          <div className="pb-2 mb-2 border-b border-gray-100 dark:border-gray-800">
            <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Operacional
            </p>

            <MenuButton
              id="dashboard"
              icon={LayoutDashboard}
              label="Dashboard"
            />

            <MenuButton
              id="servicos"
              icon={Briefcase}
              label={
                canManageOperation ? "Serviços da Equipe" : "Meus Serviços"
              }
            />

            <MenuButton
              id="demandas"
              icon={Target}
              label="Gestão de Demandas"
            />

            <MenuButton id="agenda" icon={Calendar} label="Agenda da Equipe" />

            <MenuButton
              id="reports"
              icon={BarChart3}
              label="Relatórios"
              allowedRoles={["admin", "dono", "super_admin"]}
            />
          </div>

          {/* CADASTROS */}
          <div className="pb-2 mb-2 border-b border-gray-100 dark:border-gray-800">
            <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Cadastros
            </p>

            <MenuButton id="clientes" icon={Users} label="Clientes" />

            <MenuButton
              id="channels"
              icon={Building2}
              label="Canais / Parceiros"
            />

            <MenuButton
              id="team"
              icon={Users}
              label="Minha Equipe"
              allowedRoles={["admin", "dono", "super_admin"]}
            />
          </div>

          {/* ADMINISTRAÇÃO SAAS */}
          {isSuperAdmin && (
            <div className="pt-2 pb-2 mb-2 border-b border-gray-100 dark:border-gray-800">
              <p className="px-4 text-[10px] font-bold text-yellow-600 dark:text-yellow-500 uppercase tracking-wider mb-2">
                Administração SaaS
              </p>

              <MenuButton
                id="admin-tenants"
                icon={ShieldCheck}
                label="Gestão de Assinantes"
                allowedRoles={["super_admin"]}
              />

              <MenuButton
                id="admin-finance"
                icon={Wallet}
                label="Financeiro SaaS"
                allowedRoles={["super_admin"]}
              />

              <MenuButton
                id="admin-plans"
                icon={FileText}
                label="Planos & Preços"
                allowedRoles={["super_admin"]}
              />
            </div>
          )}
        </nav>

        {/* RODAPÉ */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={() => {
              onOpenConfig();

              if (window.innerWidth < 768 && onClose) {
                onClose();
              }
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-lg hover:bg-white dark:hover:bg-gray-800 mb-1"
          >
            <Settings size={18} />
            Configurações
          </button>

          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors rounded-lg hover:bg-white dark:hover:bg-gray-800 mb-1"
          >
            <Lightbulb size={18} />
            Alterar Tema
          </button>

          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            {/* PERFIL */}
            <div
              className="px-4 mb-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg py-2 transition-colors group"
              onClick={() => setShowProfileModal(true)}
              title="Clique para editar seu perfil"
            >
              <p className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {userName || "Carregando..."}
              </p>

              <div className="flex justify-between items-center">
                <p className="text-[10px] text-gray-500 dark:text-gray-500 truncate max-w-[120px]">
                  {userEmail}
                </p>

                <span className="text-[10px] uppercase font-bold text-indigo-500">
                  {userRole ? userRole.replace("_", " ") : "..."}
                </span>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium"
            >
              <LogOut size={18} />
              Sair do Sistema
            </button>
          </div>
        </div>
      </aside>

      {/* MODAL PERFIL */}
      {showProfileModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-gray-800 animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <User className="text-indigo-600" />
                  Meu Perfil
                </h3>

                <button
                  onClick={() => setShowProfileModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {/* EMAIL */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Seu E-mail
                  </label>

                  <div className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300 text-sm border border-gray-200 dark:border-gray-700">
                    {userEmail}
                  </div>
                </div>

                {/* NOME */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome de Exibição
                  </label>

                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* SENHA */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Alterar Senha
                  </label>

                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-3 top-2.5 text-gray-400"
                    />

                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nova senha (mín. 6 caracteres)"
                      className="w-full pl-10 pr-10 rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  <p className="text-[10px] text-gray-500 mt-1">
                    Deixe em branco se não quiser alterar a senha.
                  </p>
                </div>

                {/* SALVAR */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loadingProfile}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
                  >
                    {loadingProfile ? (
                      "Salvando..."
                    ) : (
                      <>
                        <Save size={18} />
                        Salvar Alterações
                      </>
                    )}
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
