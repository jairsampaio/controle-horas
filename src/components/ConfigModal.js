import React, { useState, useEffect } from 'react';
import { 
  X, Save, User, DollarSign, Settings, Bell, Shield, 
  CreditCard, Layout, Mail, Camera, Check 
} from 'lucide-react';

const ConfigModal = ({ isOpen, onClose, onSave, valorAtual, nomeAtual }) => { 
  const [activeTab, setActiveTab] = useState('geral');
  
  // Estados Reais (Vão pro Banco)
  const [valor, setValor] = useState('');
  const [nome, setNome] = useState('');
  
  // Estados "Visuais" (Para dar o tchan, futuros features)
  const [cargo, setCargo] = useState('Consultor Especialista');
  const [notificacoesEmail, setNotificacoesEmail] = useState(true);
  const [temaEscuro, setTemaEscuro] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setValor(valorAtual || '');
      setNome(nomeAtual || '');
    }
  }, [isOpen, valorAtual, nomeAtual]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Aqui passamos também o cargo se você quiser salvar no futuro
    onSave(valor, nome);
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'geral', label: 'Perfil & Marca', icon: User },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'sistema', label: 'Preferências', icon: Layout },
    { id: 'notificacoes', label: 'Notificações', icon: Bell },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fade-in">
      <div className="bg-white dark:bg-gray-900 w-full max-w-2xl h-[600px] rounded-2xl shadow-2xl flex overflow-hidden border border-gray-100 dark:border-gray-800">
        
        {/* SIDEBAR DE NAVEGAÇÃO */}
        <div className="w-1/3 bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 p-4 flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 px-2">Ajustes</h2>
            <nav className="space-y-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                    ${activeTab === tab.id 
                      ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                >
                  <tab.icon size={18} />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="px-2">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                        {nome ? nome.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[100px]">{nome || 'Usuário'}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">Plano Pro</p>
                    </div>
                </div>
            </div>
          </div>
        </div>

        {/* ÁREA DE CONTEÚDO */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
            
            {/* Header Mobile/Desktop */}
            <div className="h-16 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-6">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                    {tabs.find(t => t.id === activeTab)?.label}
                </h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Conteúdo Scrollável */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <form id="configForm" onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* TAB: GERAL */}
                    {activeTab === 'geral' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Avatar Fake Upload */}
                            <div className="flex items-center gap-4">
                                <div className="relative group cursor-pointer">
                                    <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-500 transition-colors">
                                        <User size={32} className="text-gray-400" />
                                    </div>
                                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera size={20} className="text-white" />
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Sua Foto</h4>
                                    <p className="text-xs text-gray-500 max-w-[200px]">Isso será exibido no seu perfil e nos relatórios.</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Nome de Exibição</label>
                                    <input 
                                        type="text" 
                                        value={nome}
                                        onChange={(e) => setNome(e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Seu nome completo"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Cargo / Título</label>
                                    <input 
                                        type="text" 
                                        value={cargo}
                                        onChange={(e) => setCargo(e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Ex: Consultor Sênior"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: FINANCEIRO */}
                    {activeTab === 'financeiro' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800">
                                <h4 className="text-green-800 dark:text-green-300 font-bold text-sm mb-1">Cálculo de Receita</h4>
                                <p className="text-xs text-green-700 dark:text-green-400">
                                    Defina seu valor hora base. Isso é usado para pré-preencher novos serviços e calcular estimativas de projeto.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Valor Hora Padrão</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 font-bold">R$</span>
                                    </div>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={valor}
                                        onChange={(e) => setValor(e.target.value)}
                                        className="w-full pl-10 border rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-mono text-lg"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: SISTEMA (VISUAL) */}
                    {activeTab === 'sistema' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors cursor-pointer" onClick={() => setTemaEscuro(!temaEscuro)}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${temaEscuro ? 'bg-gray-800 text-white' : 'bg-yellow-100 text-yellow-600'}`}>
                                        <Layout size={20}/>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">Modo Escuro (Simulação)</h4>
                                        <p className="text-xs text-gray-500">Alternar entre tema claro e escuro</p>
                                    </div>
                                </div>
                                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${temaEscuro ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${temaEscuro ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: NOTIFICAÇÕES (VISUAL) */}
                    {activeTab === 'notificacoes' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                                        <Mail size={20}/>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">Relatórios por E-mail</h4>
                                        <p className="text-xs text-gray-500">Receber cópia ao enviar relatórios</p>
                                    </div>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setNotificacoesEmail(!notificacoesEmail)}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors ${notificacoesEmail ? 'bg-green-500' : 'bg-gray-300'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${notificacoesEmail ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                </button>
                            </div>
                        </div>
                    )}

                </form>
            </div>

            {/* Footer Fixo */}
            <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3">
                <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white font-bold text-sm transition-colors">
                    Cancelar
                </button>
                <button onClick={handleSubmit} className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
                    <Save size={18} /> Salvar Alterações
                </button>
            </div>

        </div>
      </div>
    </div>
  );
};

export default ConfigModal;