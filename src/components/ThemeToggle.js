import React, { useEffect, useState } from 'react';
import { Lightbulb } from 'lucide-react';

const ThemeToggle = () => {
  // Estado inicial verifica o localStorage ou a preferência do sistema
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        return savedTheme;
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    // A mágica do Tailwind: adiciona ou remove a classe 'dark' no HTML
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
      
      {/* Efeito de brilho extra "Neon" quando ativo */}
      {theme === 'dark' && (
        <span className="absolute inset-0 rounded-xl bg-yellow-400 opacity-20 blur-md animate-pulse"></span>
      )}
    </button>
  );
};

export default ThemeToggle;