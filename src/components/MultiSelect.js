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

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Botão Principal */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border rounded px-3 py-2 bg-white cursor-pointer flex justify-between items-center hover:border-indigo-400 transition-colors"
      >
        <span className={`text-sm block truncate ${selected.length === 0 ? 'text-gray-400' : 'text-gray-800 font-medium'}`}>
          {selected.length === 0 
            ? placeholder 
            : `${selected.length} selecionado(s)`}
        </span>
        <div className="flex items-center gap-1">
          {selected.length > 0 && (
            <div 
              onClick={(e) => { e.stopPropagation(); onChange([]); }}
              className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500"
              title="Limpar"
            >
              <X size={14} />
            </div>
          )}
          <ChevronDown size={16} className="text-gray-400" />
        </div>
      </div>

      {/* Dropdown Flutuante */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white border rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto animate-fade-in-up">
          {options.length === 0 ? (
            <div className="p-3 text-xs text-gray-500 text-center">Nenhuma opção disponível</div>
          ) : (
            options.map((option) => {
              const isSelected = selected.includes(option);
              return (
                <div 
                  key={option} 
                  onClick={() => toggleOption(option)}
                  className={`px-3 py-2 text-sm cursor-pointer flex items-center gap-2 hover:bg-indigo-50 transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'}`}
                >
                  <div className={`w-4 h-4 border rounded flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'}`}>
                    {isSelected && <Check size={12} className="text-white" />}
                  </div>
                  {option}
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