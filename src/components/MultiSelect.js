import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';

const MultiSelect = ({ options = [], selected = [], onChange, placeholder = "Selecione..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Fecha o dropdown se clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm(''); // Limpa a busca ao fechar
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Foca no input de busca sempre que abrir o menu
  useEffect(() => {
    if (isOpen && inputRef.current) {
        // Pequeno delay para garantir que a renderização ocorreu
        setTimeout(() => {
            inputRef.current.focus();
        }, 50);
    }
  }, [isOpen]);

  // Filtra as opções baseado no texto digitado
  const filteredOptions = options.filter(option => 
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter(item => item !== value)); // Remove
    } else {
      onChange([...selected, value]); // Adiciona
    }
  };

  const handleClear = (e) => {
    e && e.stopPropagation(); 
    onChange([]); 
  };

  // Selecionar todos que aparecem na busca atual
  const handleSelectAllFiltered = () => {
    const newSelected = [...new Set([...selected, ...filteredOptions])];
    onChange(newSelected);
  };

  // Remover da seleção apenas os que aparecem na busca atual
  const handleClearFiltered = () => {
    const newSelected = selected.filter(item => !filteredOptions.includes(item));
    onChange(newSelected);
  };

  // Texto do botão principal
  const getButtonText = () => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) return selected[0]; 
    return `${selected.length} selecionados`;
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      
      {/* --- BOTÃO PRINCIPAL (TRIGGER) --- */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full border rounded-lg px-3 py-2 cursor-pointer flex justify-between items-center transition-all h-[42px]
        bg-white dark:bg-gray-900 
        ${isOpen ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-400'}`}
      >
        <span className={`text-sm block truncate pr-2 ${selected.length === 0 ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200 font-medium'}`}>
          {getButtonText()}
        </span>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          {selected.length > 0 && (
            <div 
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              title="Limpar seleção"
            >
              <X size={14} />
            </div>
          )}
          <ChevronDown size={16} className={`text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* --- DROPDOWN FLUTUANTE --- */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 border rounded-lg shadow-xl z-[999] overflow-hidden animate-fade-in-up
        bg-white dark:bg-gray-800 
        border-gray-200 dark:border-gray-700">
          
          {/* CAMPO DE BUSCA + BOTÕES RÁPIDOS (Sticky no topo) */}
          <div className="p-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10">
            <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                <input
                    ref={inputRef}
                    type="text"
                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400 text-gray-700 dark:text-white"
                    placeholder="Filtrar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onClick={(e) => e.stopPropagation()} // Impede fechar ao clicar no input
                />
            </div>
            
            {/* Botões de Ação Rápida */}
            <div className="flex gap-2 mt-2 px-1">
                <button 
                    onClick={(e) => { e.stopPropagation(); handleSelectAllFiltered(); }}
                    className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-2 py-1 rounded transition-colors"
                >
                    Todos
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); handleClearFiltered(); }}
                    className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                >
                    Nenhum
                </button>
            </div>
          </div>

          {/* LISTA DE OPÇÕES (Com Scroll) */}
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-500 dark:text-gray-400">
                Nenhum resultado encontrado.
              </div>
            ) : (
              filteredOptions.map((option) => {
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
                    <div className={`w-4 h-4 border rounded flex items-center justify-center transition-colors flex-shrink-0
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

          {/* RODAPÉ INFORMATIVO */}
          <div className="bg-gray-50 dark:bg-gray-900/80 p-1.5 text-[10px] text-center text-gray-400 border-t border-gray-100 dark:border-gray-700">
            Exibindo {filteredOptions.length} de {options.length} opção(ões)
          </div>

        </div>
      )}
    </div>
  );
};

export default MultiSelect;