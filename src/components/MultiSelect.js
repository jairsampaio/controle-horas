import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

const MultiSelect = ({ options, selected, onChange, placeholder = "Selecione..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Fecha ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter(item => item !== value)); // Remove
    } else {
      onChange([...selected, value]); // Adiciona
    }
  };

  // Lógica para mostrar o texto do botão de forma inteligente
  const getButtonText = () => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) return selected[0]; // Mostra o nome se for só 1
    return `${selected.length} selecionados`; // Mostra contagem se forem vários
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Botão Principal */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full border rounded-lg px-3 py-2 cursor-pointer flex justify-between items-center transition-all h-[42px]
        bg-white dark:bg-gray-900 
        ${isOpen ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-400'}`}
      >
        <span className={`text-sm block truncate ${selected.length === 0 ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200 font-medium'}`}>
          {getButtonText()}
        </span>
        
        <div className="flex items-center gap-1">
          {selected.length > 0 && (
            <div 
              onClick={(e) => { e.stopPropagation(); onChange([]); }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              title="Limpar filtros"
            >
              <X size={14} />
            </div>
          )}
          <ChevronDown size={16} className={`text-gray-400 dark:text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown Flutuante */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 border rounded-lg shadow-xl z-[60] max-h-60 overflow-y-auto animate-fade-in-up
        bg-white dark:bg-gray-800 
        border-gray-200 dark:border-gray-700">
          {options.length === 0 ? (
            <div className="p-3 text-xs text-gray-500 dark:text-gray-400 text-center">Nenhuma opção disponível</div>
          ) : (
            options.map((option) => {
              const isSelected = selected.includes(option);
              return (
                <div 
                  key={option} 
                  onClick={() => toggleOption(option)}
                  className={`px-3 py-2 text-sm cursor-pointer flex items-center gap-2 transition-colors border-b border-gray-50 dark:border-gray-700/50 last:border-0
                  ${isSelected 
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  <div className={`w-4 h-4 border rounded flex items-center justify-center transition-colors
                    ${isSelected 
                      ? 'bg-indigo-600 border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500' 
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900'}`}>
                    {isSelected && <Check size={12} className="text-white" />}
                  </div>
                  <span className="truncate">{option}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelect;