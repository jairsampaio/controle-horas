import React, { useEffect, useState } from 'react';
import { Lightbulb } from 'lucide-react';

const ThemeToggle = () => {
  // Inicializa o estado verificando Storage ou Preferência do SO.
  // Usa uma função de callback para rodar essa verificação apenas uma vez (Lazy Initialization).
  const [theme, setTheme] = useState(() => {
    // Verificação de segurança para evitar erros em Server-Side Rendering (Next.js)
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        return savedTheme;
      }
      // Se não houver salvo, respeita a preferência do sistema operacional
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light'; // Fallback padrão
  });

  // Sincroniza a classe CSS 'dark' no HTML e salva no LocalStorage sempre que o tema muda
  useEffect(() => {
    const root = window.document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <button
      onClick={toggleTheme}
      aria-label="Alternar tema entre claro e escuro"
      className={`
        relative p-2 rounded-xl transition-all duration-300 ease-in-out group
        ${theme === 'dark' 
          ? 'bg-yellow-400/20 text-yellow-400 hover:bg-yellow-400/30 shadow-[0_0_15px_rgba(250,204,21,0.3)]' 
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'}
      `}
      title={theme === 'dark' ? "Apagar Luz (Modo Claro)" : "Acender Luz (Modo Escuro)"}
    >
      <Lightbulb 
        size={22} 
        className={`transition-transform duration-500 ${theme === 'dark' ? 'fill-yellow-400 scale-110' : 'scale-100'}`} 
      />
      
      {/* Efeito visual de brilho (Glow) ativo apenas no modo Dark */}
      {theme === 'dark' && (
        <span className="absolute inset-0 rounded-xl bg-yellow-400 opacity-20 blur-md animate-pulse"></span>
      )}
    </button>
  );
};

export default ThemeToggle;