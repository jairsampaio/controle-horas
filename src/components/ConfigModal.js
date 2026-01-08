import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Save, User, DollarSign, Settings, Bell, 
  Layout, Mail, Camera, Upload, Phone, Landmark
} from 'lucide-react';

// --- HELPERS (Reutilizados para consistência) ---
const maskPhone = (value) => {
  if (!value) return "";
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .replace(/(-\d{4})\d+?$/, "$1");
};

const ConfigModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  profileData, 
  userEmail 
}) => { 
  const [activeTab, setActiveTab] = useState('geral');
  const fileInputRef = useRef(null);
  
  // --- ESTADOS DO FORMULÁRIO ---
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  
  // Financeiro
  const [valor, setValor] = useState(0); // Float para o banco
  const [valorDisplay, setValorDisplay] = useState(''); // String R$ para a tela
  const [banco, setBanco] = useState('');
  const [agencia, setAgencia] = useState('');
  const [conta, setConta] = useState('');
  const [chavePix, setChavePix] = useState('');

  // Imagem
  const [fotoPreview, setFotoPreview] = useState(null); // Preview visual
  const [fotoFile, setFotoFile] = useState(null); // Arquivo real para upload

  // Configurações do App
  const [notificacoesEmail, setNotificacoesEmail] = useState(true);
  const [temaEscuro, setTemaEscuro] = useState(
    document.documentElement.classList.contains('dark')
  );

  // --- EFEITO: CARREGAR DADOS AO ABRIR ---
  useEffect(() => {
    if (isOpen && profileData) {
      // 1. Dados Pessoais
      setNome(profileData.nome || profileData.nome_completo || '');
      setWhatsapp(maskPhone(profileData.whatsapp || ''));
      
      // 2. Foto (Se tiver URL salva no banco, mostra)
      setFotoPreview(profileData.avatar_url || null);
      setFotoFile(null); // Reseta o arquivo novo

      // 3. Financeiro
      const val = profileData.valor_hora || 0;
      setValor(val);
      setValorDisplay(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val));
      
      // 4. Dados Bancários
      setBanco(profileData.banco || '');
      setAgencia(profileData.agencia || '');
      setConta(profileData.conta || '');
      setChavePix(profileData.chave_pix || '');
    }
  }, [isOpen, profileData]);

  // --- LÓGICA DE TEMA ESCURO ---
  useEffect(() => {
    if (temaEscuro) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
  }, [temaEscuro]);

  // --- HANDLERS ---
  const handleValorChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    const numberValue = Number(value) / 100;
    setValor(numberValue);
    setValorDisplay(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numberValue));
  };

  const handleWhatsappChange = (e) => {
    setWhatsapp(maskPhone(e.target.value));
  };

  // --- LÓGICA DA FOTO ---
  const handlePhotoClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // MANUTENÇÃO: Armazena o arquivo real para enviar ao Supabase Storage no onSave
      setFotoFile(file); 
      
      // Gera preview local imediato
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result); 
      };
      reader.readAsDataURL(file);
    }
  };

  // --- SALVAR ---
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Prepara o objeto para o App.js processar
    const dadosParaSalvar = {
        nome,
        whatsapp,
        valor_hora: valor,
        banco,
        agencia,
        conta,
        chave_pix: chavePix,
        // IMPORTANTE: Envia o arquivo se existir, senão envia null
        fotoArquivo: fotoFile 
    };

    onSave(dadosParaSalvar);
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'geral', label: 'Perfil', icon: User },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'sistema', label: 'Sistema', icon: Layout },
    { id: 'notificacoes', label: 'Avisos', icon: Bell },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 md:p-4 z-[9999] animate-fade-in">
      <div className="bg-white dark:bg-gray-900 w-full md:max-w-2xl h-full md:h-[650px] md:rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-gray-100 dark:border-gray-800">
        
        {/* SIDEBAR DE NAVEGAÇÃO */}
        <div className="w-full md:w-1/3 bg-gray-50 dark:bg-gray-950 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 p-4 flex flex-col justify-between shrink-0">
          <div>
            <div className="flex justify-between items-center md:block mb-4">
                <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2">Ajustes</h2>
                <button onClick={onClose} className="md:hidden text-gray-400 p-1"><X size={24}/></button>
            </div>
            
            <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 hide-scrollbar">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-shrink-0 md:w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap
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
          
          <div className="hidden md:block px-2">
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
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 overflow-hidden">
            
            {/* Header Desktop */}
            <div className="hidden md:flex h-16 border-b border-gray-100 dark:border-gray-800 items-center justify-between px-6 shrink-0">
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
                    
                    {/* TAB: GERAL (Perfil) */}
                    {activeTab === 'geral' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Avatar Upload */}
                            <div className="flex items-center gap-4">
                                <div 
                                    className="relative group cursor-pointer w-20 h-20 shrink-0"
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
                                    <p className="text-xs text-gray-500 max-w-[200px] mb-2">Toque na imagem para alterar.</p>
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
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Whatsapp</label>
                                    <div className="relative">
                                      <Phone size={16} className="absolute left-3 top-3 text-gray-400"/>
                                      <input 
                                          type="text" 
                                          value={whatsapp}
                                          onChange={handleWhatsappChange}
                                          className="w-full border rounded-lg pl-10 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white transition-all"
                                          placeholder="(00) 00000-0000"
                                      />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: FINANCEIRO */}
                    {activeTab === 'financeiro' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800">
                                <h4 className="text-green-800 dark:text-green-300 font-bold text-sm mb-1">Dados de Pagamento</h4>
                                <p className="text-xs text-green-700 dark:text-green-400">
                                    Essas informações são usadas para gerar seus recibos e cálculos.
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

                            <div className="space-y-3 pt-2">
                                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                  <Landmark size={14}/> Dados Bancários
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" value={banco} onChange={e => setBanco(e.target.value)} className="w-full border rounded-lg p-2.5 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm" placeholder="Banco (Ex: Nubank)" />
                                    <input type="text" value={agencia} onChange={e => setAgencia(e.target.value)} className="w-full border rounded-lg p-2.5 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm" placeholder="Agência" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" value={conta} onChange={e => setConta(e.target.value)} className="w-full border rounded-lg p-2.5 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm" placeholder="Conta Corrente" />
                                    <input type="text" value={chavePix} onChange={e => setChavePix(e.target.value)} className="w-full border rounded-lg p-2.5 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm" placeholder="Chave PIX" />
                                </div>
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
            <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3 shrink-0">
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