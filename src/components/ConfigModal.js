import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Save, User, DollarSign, Settings, Bell, Shield, 
  CreditCard, Layout, Mail, Camera, Check, Upload
} from 'lucide-react';

const ConfigModal = ({ isOpen, onClose, onSave, valorAtual, nomeAtual, userEmail }) => { 
  const [activeTab, setActiveTab] = useState('geral');
  const fileInputRef = useRef(null);
  
  // --- ESTADOS ---
  const [valor, setValor] = useState(''); // Armazena número puro
  const [valorDisplay, setValorDisplay] = useState(''); // Armazena string formatada (R$)
  const [nome, setNome] = useState('');
  const [fotoPreview, setFotoPreview] = useState(null);
  
  const [cargo, setCargo] = useState('Consultor Especialista');
  const [notificacoesEmail, setNotificacoesEmail] = useState(true);
  
  // Detecta se o sistema já está em dark mode ao abrir
  const [temaEscuro, setTemaEscuro] = useState(
    document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    if (isOpen) {
      // Configura Nome
      setNome(nomeAtual || '');
      
      // Configura Valor com Máscara
      const val = valorAtual || 0;
      setValor(val);
      setValorDisplay(formatCurrency(val));
    }
  }, [isOpen, valorAtual, nomeAtual]);

  // --- LÓGICA DE TEMA ESCURO ---
  useEffect(() => {
    if (temaEscuro) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
  }, [temaEscuro]);

  // --- MÁSCARA DE MOEDA ---
  const formatCurrency = (value) => {
    const number = Number(value);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number);
  };

  const handleValorChange = (e) => {
    // Remove tudo que não é dígito
    let value = e.target.value.replace(/\D/g, '');
    // Converte para decimal (divide por 100)
    const numberValue = Number(value) / 100;
    
    setValor(numberValue); // Salva o número puro (ex: 150.50)
    setValorDisplay(formatCurrency(numberValue)); // Mostra formatado (ex: R$ 150,50)
  };

  // --- UPLOAD DE FOTO (PREVIEW) ---
  const handlePhotoClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Envia o valor numérico puro e o nome
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
          
          {/* Card do Usuário (Dinâmico) */}
          <div className="px-2">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                <div className="flex items-center gap-3 mb-2">
                    {fotoPreview ? (
                        <img src={fotoPreview} alt="Perfil" className="w-8 h-8 rounded-full object-cover border border-indigo-200" />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                            {nome ? nome.charAt(0).toUpperCase() : 'U'}
                        </div>
                    )}
                    <div className="overflow-hidden">
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{nome || 'Usuário'}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{userEmail || 'Conta Ativa'}</p>
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
                            {/* Avatar Upload Real */}
                            <div className="flex items-center gap-4">
                                <div 
                                    className="relative group cursor-pointer w-20 h-20"
                                    onClick={handlePhotoClick}
                                >
                                    {fotoPreview ? (
                                        <img src={fotoPreview} alt="Preview" className="w-full h-full rounded-full object-cover border-2 border-indigo-100 dark:border-gray-700" />
                                    ) : (
                                        <div className="w-full h-full rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 group-hover:border-indigo-500 transition-colors">
                                            <Camera size={24} className="text-gray-400 group-hover:text-indigo-500" />
                                        </div>
                                    )}
                                    
                                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Upload size={20} className="text-white" />
                                    </div>
                                    
                                    {/* Input File Invisível */}
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={handleFileChange} 
                                        accept="image/*" 
                                        className="hidden" 
                                    />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Sua Foto</h4>
                                    <p className="text-xs text-gray-500 max-w-[200px] mb-2">Toque na imagem para alterar. Será exibida nos relatórios.</p>
                                    <button type="button" onClick={handlePhotoClick} className="text-xs font-bold text-indigo-600 hover:underline">Escolher arquivo...</button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Nome de Exibição</label>
                                    <input 
                                        type="text" 
                                        value={nome}
                                        onChange={(e) => setNome(e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white transition-all"
                                        placeholder="Seu nome completo"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Cargo / Título</label>
                                    <input 
                                        type="text" 
                                        value={cargo}
                                        onChange={(e) => setCargo(e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white transition-all"
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
                                    Defina seu valor hora base para cálculos automáticos.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Valor Hora Padrão</label>
                                <input 
                                    type="text" 
                                    value={valorDisplay}
                                    onChange={handleValorChange}
                                    className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold text-xl"
                                    placeholder="R$ 0,00"
                                />
                            </div>
                        </div>
                    )}

                    {/* TAB: SISTEMA (Funcional) */}
                    {activeTab === 'sistema' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors cursor-pointer" onClick={() => setTemaEscuro(!temaEscuro)}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${temaEscuro ? 'bg-gray-800 text-white' : 'bg-yellow-100 text-yellow-600'}`}>
                                        <Layout size={20}/>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">Modo Escuro / Claro</h4>
                                        <p className="text-xs text-gray-500">Altera a aparência de todo o sistema</p>
                                    </div>
                                </div>
                                {/* Toggle Visual e Funcional */}
                                <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${temaEscuro ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${temaEscuro ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: NOTIFICAÇÕES */}
                    {activeTab === 'notificacoes' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                                        <Mail size={20}/>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">Cópia de Relatórios</h4>
                                        <p className="text-xs text-gray-500">Receber e-mail ao gerar PDFs (apenas informativo)</p>
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