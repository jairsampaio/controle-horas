import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom'; // Adicionado Portal para garantir tela cheia
import { 
  X, Save, User, Camera, Upload, Phone, Moon, Sun, Monitor
} from 'lucide-react';

// --- HELPER DE MÁSCARA ---
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
  const [activeTab, setActiveTab] = useState('perfil');
  const fileInputRef = useRef(null);
  
  // --- ESTADOS ---
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  
  // Imagem
  const [fotoPreview, setFotoPreview] = useState(null);
  const [fotoFile, setFotoFile] = useState(null);

  // Tema (Inicialização Inteligente: Lê do LocalStorage ou do CSS atual)
  const [temaEscuro, setTemaEscuro] = useState(() => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('theme') === 'dark' || document.documentElement.classList.contains('dark');
    }
    return false;
  });

  // --- CARREGAR DADOS ---
  useEffect(() => {
    if (isOpen && profileData) {
      setNome(profileData.nome || profileData.nome_completo || '');
      setWhatsapp(maskPhone(profileData.whatsapp || ''));
      setFotoPreview(profileData.avatar_url || null);
      setFotoFile(null);
    }
  }, [isOpen, profileData]);

  // --- APLICAR TEMA ---
  useEffect(() => {
    if (temaEscuro) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark'); // Salva no navegador
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }
  }, [temaEscuro]);

  // --- HANDLERS ---
  const handleWhatsappChange = (e) => {
    setWhatsapp(maskPhone(e.target.value));
  };

  const handlePhotoClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFotoFile(file); 
      const reader = new FileReader();
      reader.onloadend = () => setFotoPreview(reader.result); 
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
        nome,
        whatsapp,
        fotoArquivo: fotoFile 
    });
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'perfil', label: 'Meu Perfil', icon: User },
    { id: 'aparencia', label: 'Aparência', icon: Monitor },
  ];

  // --- USANDO PORTAL (Fix visual) ---
  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fade-in w-screen h-screen">
      {/* MUDANÇAS VISUAIS AQUI:
         1. max-w-3xl (Mais largo)
         2. h-auto (Altura automática, sem scroll forçado)
         3. max-h-[90vh] (Segurança para telas pequenas)
      */}
      <div className="bg-white dark:bg-gray-900 w-full max-w-3xl h-auto max-h-[90vh] rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-gray-100 dark:border-gray-800">
        
        {/* SIDEBAR */}
        <div className="w-full md:w-64 bg-gray-50 dark:bg-gray-950 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 p-6 flex flex-col shrink-0">
          <div className="flex justify-between items-center md:block mb-6">
            <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2">Configurações</h2>
            <button onClick={onClose} className="md:hidden text-gray-400 p-1"><X size={24}/></button>
          </div>
          
          <nav className="flex md:flex-col gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 text-left
                  ${activeTab === tab.id 
                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-900'
                  }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* CONTEÚDO */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
            
            {/* Header Clean */}
            <div className="hidden md:flex h-16 border-b border-gray-100 dark:border-gray-800 items-center justify-between px-8 shrink-0">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                    {tabs.find(t => t.id === activeTab)?.label}
                </h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                    <X size={20} />
                </button>
            </div>

            {/* Corpo (Sem scroll forçado a menos que necessário) */}
            <div className="p-8 overflow-y-auto custom-scrollbar">
                <form id="configForm" onSubmit={handleSubmit} className="space-y-8">
                    
                    {/* --- TAB PERFIL --- */}
                    {activeTab === 'perfil' && (
                        <div className="space-y-8 animate-fade-in">
                            {/* Área da Foto */}
                            <div className="flex flex-col items-center sm:flex-row sm:items-center gap-6">
                                <div 
                                    className="relative group cursor-pointer w-24 h-24 shrink-0"
                                    onClick={handlePhotoClick}
                                >
                                    {fotoPreview ? (
                                        <img src={fotoPreview} alt="Preview" className="w-full h-full rounded-full object-cover border-4 border-indigo-50 dark:border-gray-800 shadow-sm" />
                                    ) : (
                                        <div className="w-full h-full rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500 border-2 border-dashed border-indigo-200 dark:border-indigo-800">
                                            <Camera size={28} />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Upload size={20} className="text-white" />
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                                </div>
                                <div className="text-center sm:text-left flex-1">
                                    <h4 className="text-base font-bold text-gray-900 dark:text-white">Sua Foto de Perfil</h4>
                                    <p className="text-sm text-gray-500 mt-1 mb-3">Clique na imagem para alterar.</p>
                                    <div className="inline-block bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded text-xs text-gray-500">
                                        {userEmail}
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-gray-100 dark:bg-gray-800" />

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Nome Completo</label>
                                    <input 
                                        type="text" 
                                        value={nome}
                                        onChange={(e) => setNome(e.target.value)}
                                        className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium transition-all"
                                        placeholder="Seu nome"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Whatsapp</label>
                                    <div className="relative">
                                      <Phone size={18} className="absolute left-3 top-3.5 text-gray-400"/>
                                      <input 
                                          type="text" 
                                          value={whatsapp}
                                          onChange={handleWhatsappChange}
                                          className="w-full border rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium transition-all"
                                          placeholder="(00) 00000-0000"
                                      />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50 flex gap-3">
                                <div className="shrink-0 text-blue-500 mt-0.5">ℹ️</div>
                                <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                                    Para segurança, dados sensíveis como senha, e-mail e informações bancárias só podem ser alterados pelo administrador.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* --- TAB APARÊNCIA --- */}
                    {activeTab === 'aparencia' && (
                        <div className="space-y-8 animate-fade-in py-4">
                           <div className="grid grid-cols-2 gap-6">
                                <button 
                                    type="button"
                                    onClick={() => setTemaEscuro(false)}
                                    className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-4 transition-all ${!temaEscuro ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-md scale-[1.02]' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                                >
                                    <div className="w-16 h-16 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center mb-2">
                                        <Sun size={32} />
                                    </div>
                                    <span className={`font-bold text-base ${!temaEscuro ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400'}`}>Modo Claro</span>
                                </button>

                                <button 
                                    type="button"
                                    onClick={() => setTemaEscuro(true)}
                                    className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-4 transition-all ${temaEscuro ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-md scale-[1.02]' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                                >
                                    <div className="w-16 h-16 rounded-full bg-gray-800 text-gray-200 flex items-center justify-center mb-2">
                                        <Moon size={32} />
                                    </div>
                                    <span className={`font-bold text-base ${temaEscuro ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400'}`}>Modo Escuro</span>
                                </button>
                           </div>
                           
                           <p className="text-center text-sm text-gray-400">
                                O sistema lembrará sua preferência neste dispositivo.
                           </p>
                        </div>
                    )}

                </form>
            </div>

            {/* Footer Clean */}
            <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3 shrink-0 rounded-br-2xl">
                <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-gray-500 hover:text-gray-700 dark:text-gray-400 font-bold text-sm transition-colors">
                    Cancelar
                </button>
                <button onClick={handleSubmit} className="px-8 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                    <Save size={18} /> Salvar Alterações
                </button>
            </div>

        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfigModal;