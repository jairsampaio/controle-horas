import React from 'react';
import { Lock, LogOut, ShieldAlert, MessageCircle, Building2, UserX } from 'lucide-react';

const AccessDenied = ({ type, onLogout }) => {
  
  // Configuração de textos baseados no tipo de bloqueio
  const config = {
    consultoria_bloqueada: {
      title: "Acesso Temporariamente Suspenso",
      message: "A conta da sua empresa encontra-se bloqueada administrativamente.",
      submessage: "Isso geralmente ocorre por pendências financeiras ou revisão contratual. Para restabelecer o acesso imediato, entre em contato com nosso suporte.",
      icon: Building2,
      actionText: "Falar com Suporte",
      actionColor: "bg-green-600 hover:bg-green-700",
      actionIcon: MessageCircle
    },
    usuario_bloqueado: {
      title: "Acesso Revogado",
      message: "Sua conta de usuário foi desativada pelo administrador.",
      submessage: "Se você acredita que isso é um erro ou precisa recuperar seu acesso, entre em contato diretamente com o gestor da sua equipe.",
      icon: UserX,
      actionText: null, // Sem botão de ação extra para usuário comum
    }
  };

  const currentConfig = config[type] || config.usuario_bloqueado;
  const Icon = currentConfig.icon;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4 animate-fade-in">
      
      {/* Card Principal */}
      <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 text-center">
        
        {/* Topo com Ícone e Gradiente */}
        <div className="bg-red-50 dark:bg-red-900/20 p-10 flex justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-red-500/5 blur-3xl rounded-full transform scale-150"></div>
            <div className="relative z-10 bg-white dark:bg-gray-800 p-6 rounded-full shadow-lg border border-red-100 dark:border-red-900/50">
                <Icon size={48} className="text-red-500 dark:text-red-400" />
            </div>
        </div>

        {/* Conteúdo */}
        <div className="p-8 space-y-4">
            <h1 className="text-2xl font-black text-gray-800 dark:text-white">
                {currentConfig.title}
            </h1>
            
            <div className="space-y-2">
                <p className="text-gray-900 dark:text-gray-200 font-medium">
                    {currentConfig.message}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    {currentConfig.submessage}
                </p>
            </div>

            {/* Área de Botões */}
            <div className="pt-6 flex flex-col gap-3">
                
                {/* Botão de Ação Principal (ex: Suporte) - Só aparece se configurado */}
                {currentConfig.actionText && (
                    <button 
                        onClick={() => window.open('https://wa.me/5500000000000', '_blank')} // Link do seu WhatsApp aqui
                        className={`w-full py-3.5 rounded-xl text-white font-bold shadow-lg shadow-green-200 dark:shadow-none transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 ${currentConfig.actionColor}`}
                    >
                        <currentConfig.actionIcon size={20} />
                        {currentConfig.actionText}
                    </button>
                )}

                {/* Botão de Logout */}
                <button 
                    onClick={onLogout}
                    className="w-full py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                >
                    <LogOut size={18} />
                    Sair e Voltar ao Login
                </button>
            </div>
        </div>

        {/* Rodapé Seguro */}
        <div className="bg-gray-50 dark:bg-black/20 p-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 uppercase tracking-widest font-bold">
                <ShieldAlert size={14} /> Acesso Seguro ConsultMaster
            </div>
        </div>

      </div>
    </div>
  );
};

export default AccessDenied;