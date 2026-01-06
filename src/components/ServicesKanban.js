import React, { useState, useEffect } from 'react';
import { 
  Calendar, DollarSign, User, Clock, CheckCircle, 
  MoreHorizontal, Loader2, FileCheck, AlertCircle
} from 'lucide-react';

const ServicesKanban = ({ servicos = [], onEditService, onStatusChange }) => {
  const [draggedServiceId, setDraggedServiceId] = useState(null);
  const [localServices, setLocalServices] = useState([]);

  // Atualiza o estado local sempre que a lista de serviços mudar (filtros do App.js)
  useEffect(() => {
    setLocalServices(servicos);
  }, [servicos]);

  // Mapeamento EXATO dos seus Status do Banco de Dados
  const columns = [
    { id: 'Pendente', title: 'Pendente', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock },
    { id: 'Em aprovação', title: 'Em Aprovação', color: 'bg-orange-50 text-orange-700 border-orange-200', icon: Loader2 },
    { id: 'Aprovado', title: 'Aprovado', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: CheckCircle },
    { id: 'NF Emitida', title: 'NF Emitida', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: FileCheck },
    { id: 'Pago', title: 'Pago', color: 'bg-green-50 text-green-700 border-green-200', icon: DollarSign },
  ];

  // --- LÓGICA DE DRAG & DROP ---
  const handleDragStart = (e, serviceId) => {
    setDraggedServiceId(serviceId);
    e.dataTransfer.effectAllowed = 'move';
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedServiceId(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); 
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    if (!draggedServiceId) return;

    // 1. Atualização Visual Imediata (Otimista)
    const updatedServices = localServices.map(s => 
      s.id === draggedServiceId ? { ...s, status: targetStatus } : s
    );
    setLocalServices(updatedServices);

    // 2. Avisa o App.js para salvar no banco
    if (onStatusChange) {
        onStatusChange(draggedServiceId, targetStatus);
    }
  };

  // Formatadores
  const formatMoney = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString + 'T00:00:00'); // Garante fuso
    const hoje = new Date();
    // Verifica se está atrasado (passou da data e não está pago)
    const isLate = date < new Date(hoje.setHours(0,0,0,0));
    
    return (
      <span className={`text-xs font-bold flex items-center gap-1 ${isLate ? 'text-red-600' : 'text-gray-500'}`}>
        <Calendar size={12} />
        {date.toLocaleDateString('pt-BR')}
        {isLate && <AlertCircle size={10} className="text-red-500"/>}
      </span>
    );
  };

  return (
    <div className="flex h-full overflow-x-auto gap-4 pb-4 items-start animate-fade-in custom-scrollbar">
      
      {columns.map(col => {
        // Filtra os serviços para esta coluna
        const colServices = localServices.filter(s => (s.status || 'Pendente') === col.id);
        const Icon = col.icon;

        return (
          <div 
            key={col.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
            className="flex-shrink-0 w-72 flex flex-col h-full max-h-[600px]"
          >
            {/* Header da Coluna */}
            <div className={`p-3 rounded-t-xl border-b-2 flex justify-between items-center ${col.color} bg-white dark:bg-gray-800 bg-opacity-80 backdrop-blur-sm sticky top-0 z-10`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                <Icon size={16} />
                {col.title}
              </div>
              <span className="bg-white dark:bg-gray-700 bg-opacity-50 px-2 py-0.5 rounded-full text-xs font-bold shadow-sm">
                  {colServices.length}
              </span>
            </div>

            {/* Área de Drop (Corpo da Coluna) */}
            <div className="bg-gray-100/50 dark:bg-gray-900/50 p-2 rounded-b-xl flex-1 overflow-y-auto custom-scrollbar border-x border-b border-gray-100 dark:border-gray-800 min-h-[100px]">
              
              {colServices.map(service => (
                <div
                  key={service.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, service.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onEditService && onEditService(service)}
                  className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:-translate-y-1 transition-all group relative"
                >
                  {/* Etiqueta do Canal */}
                  {service.canais?.nome && (
                      <span className="absolute top-3 right-3 text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 rounded uppercase tracking-wide">
                          {service.canais.nome}
                      </span>
                  )}

                  {/* Topo do Card */}
                  <div className="mb-2 pr-4">
                    <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm leading-tight line-clamp-2" title={service.atividade}>
                      {service.atividade || 'Atividade sem título'}
                    </h4>
                  </div>

                  {/* Cliente */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-500">
                       <User size={10}/>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]" title={service.cliente}>
                      {service.cliente || 'Cliente não ident.'}
                    </span>
                  </div>

                  {/* Footer do Card */}
                  <div className="flex justify-between items-center border-t border-gray-50 dark:border-gray-700 pt-2 mt-2">
                    {formatDate(service.data)}
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      {formatMoney(service.valor_total)}
                    </span>
                  </div>
                </div>
              ))}

              {colServices.length === 0 && (
                <div className="text-center py-10 opacity-30 flex flex-col items-center">
                  <div className="w-12 h-12 border-2 border-dashed border-gray-400 rounded-full flex items-center justify-center mb-2">
                      <Icon size={20} className="text-gray-400"/>
                  </div>
                  <span className="text-xs font-medium text-gray-500">Vazio</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ServicesKanban;