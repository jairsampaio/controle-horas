import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import { addDays, subDays, isSameDay } from 'date-fns'; // <--- IMPORTANTE
import ptBR from 'date-fns/locale/pt-BR';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

import { 
  X, Save, Trash2, User, Calendar as CalendarIcon, 
  Clock, Filter, Plus, ChevronDown, Check, ChevronLeft, ChevronRight
} from 'lucide-react';
import supabase from '../services/supabase';

// --- CONFIGURAÇÃO ---
const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
const DnDCalendar = withDragAndDrop(Calendar);

// --- ESTILOS PREMIUM BLINDADOS ---
const customStyles = `
  /* --- BOTÕES DA TOOLBAR (MODO CLARO) --- */
  .rbc-calendar .rbc-toolbar button {
    color: #374151 !important;
    background-color: #f9fafb !important;
    border: 1px solid #d1d5db !important;
    cursor: pointer !important;
    transition: all 0.2s ease-in-out;
    font-weight: 600 !important;
    padding: 6px 12px !important;
    border-radius: 6px !important;
    margin-right: 4px;
  }
  .rbc-calendar .rbc-toolbar button:hover {
    background-color: #e5e7eb !important;
    color: #111827 !important;
    z-index: 10;
  }
  .rbc-calendar .rbc-toolbar button.rbc-active {
    background-color: #4f46e5 !important;
    border-color: #4f46e5 !important;
    color: white !important;
    box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.3) !important;
  }
  .rbc-calendar .rbc-toolbar button:focus {
    outline: none !important;
    box-shadow: 0 0 0 2px #c7d2fe !important;
  }

  /* --- BOTÕES DA TOOLBAR (MODO DARK) --- */
  .dark .rbc-calendar .rbc-toolbar button {
    color: #e5e7eb !important;
    background-color: #1f2937 !important;
    border: 1px solid #374151 !important;
  }
  .dark .rbc-calendar .rbc-toolbar button:hover {
    background-color: #374151 !important;
    border-color: #6b7280 !important;
  }
  .dark .rbc-calendar .rbc-toolbar button.rbc-active {
    background-color: #4f46e5 !important;
    border-color: #4f46e5 !important;
    color: white !important;
  }
  .dark .rbc-calendar .rbc-toolbar button:focus {
    box-shadow: 0 0 0 2px #312e81 !important;
  }

  /* --- VISUAL GERAL DARK MODE --- */
  .dark .rbc-calendar { background-color: #111827; color: #e5e7eb; }
  .dark .rbc-header { 
    border-bottom: 1px solid #374151; 
    color: #9ca3af; 
    padding: 10px 0;
    text-transform: uppercase;
    font-size: 0.75rem;
  }
  .dark .rbc-off-range-bg { background-color: #111827; opacity: 0.5; }
  .dark .rbc-today { background-color: rgba(79, 70, 229, 0.1); }
  
  .dark .rbc-month-view, .dark .rbc-time-view, .dark .rbc-agenda-view { 
    border: 1px solid #374151; 
    border-radius: 8px;
    background-color: #111827;
  }
  .dark .rbc-day-bg + .rbc-day-bg { border-left: 1px solid #374151; }
  .dark .rbc-month-row + .rbc-month-row { border-top: 1px solid #374151; }
  .dark .rbc-time-content { border-top: 1px solid #374151; }
  .dark .rbc-time-header-content { border-left: 1px solid #374151; }
  .dark .rbc-timeslot-group { border-bottom: 1px solid #374151; }
  .dark .rbc-day-slot .rbc-time-slot { border-top: 1px solid #374151; }
  
  .rbc-event { border-radius: 6px; border: none; padding: 2px 5px; }
  .dark .rbc-event { box-shadow: 0 2px 4px rgba(0,0,0,0.4); }
`;

// --- COMPONENTE MULTISELECT ---
const ConsultantMultiSelect = ({ options, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (id) => {
    let newSelected = [...selected];
    if (id === 'todos') {
        if (!selected.includes('todos')) onChange(['todos']);
        return;
    }
    if (newSelected.includes('todos')) newSelected = [];
    if (newSelected.includes(id)) newSelected = newSelected.filter(item => item !== id);
    else newSelected.push(id);
    if (newSelected.length === 0) newSelected = ['todos'];
    onChange(newSelected);
  };

  const getLabel = () => {
    if (selected.includes('todos')) return 'Todos';
    if (selected.length === 1) {
        const found = options.find(o => o.id === selected[0]);
        return found ? (found.nome || found.email).split(' ')[0] : '1 Sel.';
    }
    return `${selected.length} Sel.`;
  };

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-bold text-gray-700 dark:text-gray-300 hover:border-indigo-500 transition-colors shadow-sm min-w-[140px] md:min-w-[200px] justify-between"
      >
        <div className="flex items-center gap-2">
            <Filter size={16} className="text-indigo-600" />
            <span className="truncate max-w-[100px] md:max-w-[140px]">{getLabel()}</span>
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-[9999] overflow-hidden animate-fade-in">
            <div className="p-1 max-h-60 overflow-y-auto custom-scrollbar">
                <button
                    onClick={() => toggleOption('todos')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selected.includes('todos') ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600'}`}>
                        {selected.includes('todos') && <Check size={14} className="text-white" />}
                    </div>
                    <span className="text-gray-700 dark:text-gray-200 font-medium">Toda a Equipe</span>
                </button>
                <div className="h-px bg-gray-100 dark:bg-gray-800 my-1 mx-2" />
                {options.map(opt => {
                    const isSelected = selected.includes(opt.id);
                    return (
                        <button
                            key={opt.id}
                            onClick={() => toggleOption(opt.id)}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left group"
                        >
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600 group-hover:border-indigo-400'}`}>
                                {isSelected && <Check size={14} className="text-white" />}
                            </div>
                            <span className={`truncate ${isSelected ? 'text-indigo-700 dark:text-indigo-400 font-bold' : 'text-gray-600 dark:text-gray-400'}`}>
                                {opt.nome || opt.email}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
      )}
    </div>
  );
};

// --- COMPONENTE PRINCIPAL (TeamCalendar) ---
const TeamCalendar = ({ userId, userRole, showToast }) => {
  const [events, setEvents] = useState([]);
  const [team, setTeam] = useState([]);
  const [, setLoading] = useState(true); 
  const [modalOpen, setModalOpen] = useState(false);
  const [filterConsultant, setFilterConsultant] = useState(['todos']);
  
  // Controle de Data (Crucial para o Mobile)
  const [viewDate, setViewDate] = useState(new Date());

  const [formData, setFormData] = useState({
    id: null,
    titulo: '',
    descricao: '',
    data_inicio: '',
    hora_inicio: '',
    data_fim: '',
    hora_fim: '',
    tipo: 'execucao',
    consultor_id: userId
  });

  const isAdmin = ['admin', 'dono', 'super_admin'].includes(userRole);

  const fetchTeam = useCallback(async () => {
    if (!isAdmin) return;
    const { data: profile } = await supabase.from('profiles').select('consultoria_id').eq('id', userId).single();
    if (!profile) return;
    const { data } = await supabase.from('profiles').select('id, nome, email').eq('consultoria_id', profile.consultoria_id).order('nome');
    setTeam(data || []);
  }, [isAdmin, userId]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('agenda_eventos').select('*');

      if (isAdmin) {
          if (!filterConsultant.includes('todos')) {
              query = query.in('consultor_id', filterConsultant);
          }
      } else {
          query = query.eq('consultor_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const formattedEvents = (data || []).map(evt => ({
        ...evt,
        title: evt.titulo,
        start: new Date(evt.inicio),
        end: new Date(evt.fim),
        resourceId: evt.consultor_id
      }));
      setEvents(formattedEvents);
    } catch (error) {
      console.error(error);
      if (showToast) showToast('Erro ao carregar agenda', 'erro');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, filterConsultant, userId, showToast]);

  useEffect(() => { fetchTeam(); fetchEvents(); }, [fetchTeam, fetchEvents]);

  const handleSelectSlot = ({ start, end }) => {
    let preSelectedConsultant = userId;
    if (isAdmin && filterConsultant.length === 1 && filterConsultant[0] !== 'todos') {
        preSelectedConsultant = filterConsultant[0];
    }

    const now = new Date();
    const safeStart = start || now;
    const safeEnd = end || now;

    setFormData({
      id: null,
      titulo: '',
      descricao: '',
      data_inicio: format(safeStart, 'yyyy-MM-dd'),
      hora_inicio: start ? format(safeStart, 'HH:mm') : '09:00',
      data_fim: format(safeEnd, 'yyyy-MM-dd'),
      hora_fim: end ? format(safeEnd, 'HH:mm') : '10:00',
      tipo: 'execucao',
      consultor_id: preSelectedConsultant
    });
    setModalOpen(true);
  };

  const handleSelectEvent = (event) => {
    setFormData({
      id: event.id,
      titulo: event.titulo,
      descricao: event.descricao || '',
      data_inicio: format(event.start, 'yyyy-MM-dd'),
      hora_inicio: format(event.start, 'HH:mm'),
      data_fim: format(event.end, 'yyyy-MM-dd'),
      hora_fim: format(event.end, 'HH:mm'),
      tipo: event.tipo,
      consultor_id: event.consultor_id
    });
    setModalOpen(true);
  };

  const handleEventDrop = async ({ event, start, end }) => {
    try {
      const { error } = await supabase.from('agenda_eventos').update({
        inicio: start.toISOString(),
        fim: end.toISOString()
      }).eq('id', event.id);

      if (error) throw error;
      setEvents(prev => prev.map(ev => ev.id === event.id ? { ...ev, start, end } : ev));
      if (showToast) showToast('Horário atualizado!', 'sucesso');
    } catch (error) {
      console.error(error);
      if (showToast) showToast('Erro ao mover.', 'erro');
    }
  };

  const handleEventResize = ({ event, start, end }) => {
      handleEventDrop({ event, start, end });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const { data: profile } = await supabase.from('profiles').select('consultoria_id').eq('id', userId).single();
      const inicioISO = new Date(`${formData.data_inicio}T${formData.hora_inicio}`).toISOString();
      const fimISO = new Date(`${formData.data_fim}T${formData.hora_fim}`).toISOString();

      const payload = {
        consultoria_id: profile.consultoria_id,
        consultor_id: formData.consultor_id,
        titulo: formData.titulo,
        descricao: formData.descricao,
        inicio: inicioISO,
        fim: fimISO,
        tipo: formData.tipo,
        criado_por: userId
      };

      if (formData.id) {
        await supabase.from('agenda_eventos').update(payload).eq('id', formData.id);
      } else {
        await supabase.from('agenda_eventos').insert([payload]);
      }

      setModalOpen(false);
      fetchEvents();
      if (showToast) showToast('Salvo com sucesso!', 'sucesso');
    } catch (error) {
      console.error(error);
      if (showToast) showToast('Erro ao salvar.', 'erro');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Excluir?')) return;
    try {
      await supabase.from('agenda_eventos').delete().eq('id', formData.id);
      setModalOpen(false);
      fetchEvents();
      if (showToast) showToast('Excluído.', 'sucesso');
    } catch (error) { console.error(error); }
  };

  const eventStyleGetter = (event) => {
    const colors = { execucao: '#3b82f6', reuniao: '#8b5cf6', bloqueio: '#ef4444', pessoal: '#10b981' };
    return {
      style: {
        backgroundColor: colors[event.tipo] || '#3b82f6',
        borderRadius: '6px', opacity: 0.9, color: 'white', border: '0px', fontSize: '0.85rem'
      }
    };
  };

  // --- FILTRO DE EVENTOS DO DIA (MOBILE) ---
  const eventsOnDay = events.filter(evt => 
    isSameDay(evt.start, viewDate)
  ).sort((a, b) => a.start - b.start);

  // --- CORES PARA OS CARDS MOBILE ---
  const typeColors = {
    execucao: 'border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20',
    reuniao: 'border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-900/20',
    bloqueio: 'border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20',
    pessoal: 'border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20'
  };

  // --- MODAL COM PORTAL (SOLUÇÃO DEFINITIVA) ---
  const renderModal = () => {
    if (!modalOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in w-screen h-screen">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-gray-800 animate-scale-in relative">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                {formData.id ? <Clock className="text-indigo-600"/> : <Plus className="text-indigo-600"/>}
                {formData.id ? 'Editar Evento' : 'Novo Evento'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título</label>
                <input type="text" value={formData.titulo} onChange={e => setFormData({...formData, titulo: e.target.value})} className="w-full border rounded-lg p-2.5 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white font-medium" placeholder="Reunião, Entrega..." required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dia Início</label>
                    <input type="date" value={formData.data_inicio} onChange={e => setFormData({...formData, data_inicio: e.target.value})} className="w-full border rounded-lg p-2 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm" required />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hora Início</label>
                    <input type="time" value={formData.hora_inicio} onChange={e => setFormData({...formData, hora_inicio: e.target.value})} className="w-full border rounded-lg p-2 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dia Fim</label>
                    <input type="date" value={formData.data_fim} onChange={e => setFormData({...formData, data_fim: e.target.value})} className="w-full border rounded-lg p-2 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm" required />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hora Fim</label>
                    <input type="time" value={formData.hora_fim} onChange={e => setFormData({...formData, hora_fim: e.target.value})} className="w-full border rounded-lg p-2 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm" required />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo</label>
                <div className="grid grid-cols-4 gap-2">
                    {['execucao', 'reuniao', 'bloqueio', 'pessoal'].map(type => (
                        <button type="button" key={type} onClick={() => setFormData({...formData, tipo: type})} className={`p-2 rounded-lg text-xs font-bold capitalize transition-colors border ${formData.tipo === type ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200 text-gray-500'}`}>
                            {type}
                        </button>
                    ))}
                </div>
              </div>

              {isAdmin && (
                <div>
                  <label className="block text-xs font-bold text-indigo-600 uppercase mb-1 flex items-center gap-1"><User size={12}/> Responsável</label>
                  <select value={formData.consultor_id} onChange={e => setFormData({...formData, consultor_id: e.target.value})} className="w-full border-2 border-indigo-100 rounded-lg p-2.5 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white font-bold text-sm">
                    <option value={userId}>Eu mesmo</option>
                    {team.filter(m => m.id !== userId).map(m => <option key={m.id} value={m.id}>{m.nome || m.email}</option>)}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                {formData.id && <button type="button" onClick={handleDelete} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"><Trash2 size={20}/></button>}
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex justify-center items-center gap-2"><Save size={20}/> Salvar</button>
              </div>
            </form>
          </div>
        </div>,
        document.body // Alvo do Portal
    );
  };

  return (
    <div className="h-full flex flex-col space-y-4 animate-fade-in p-4 md:p-6">
      <style>{customStyles}</style>

      {/* --- HEADER RESPONSIVO --- */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="w-full md:w-auto">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <CalendarIcon className="text-indigo-600" /> 
            <span className="hidden md:inline">Agenda da Equipe</span>
            
            {/* CONTROLES DE DATA SÓ NO MOBILE */}
            <div className="flex md:hidden items-center gap-2 ml-auto">
                <button onClick={() => setViewDate(subDays(viewDate, 1))} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronLeft size={20}/></button>
                <span className="text-sm font-bold text-indigo-600">{format(viewDate, 'dd/MM/yyyy')}</span>
                <button onClick={() => setViewDate(addDays(viewDate, 1))} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronRight size={20}/></button>
            </div>
          </h2>
          <p className="text-sm text-gray-500 hidden md:block">Arraste para mover • Clique para editar</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto justify-end">
            {isAdmin && (
                <ConsultantMultiSelect 
                    options={team} 
                    selected={filterConsultant} 
                    onChange={setFilterConsultant} 
                />
            )}
            <button onClick={() => handleSelectSlot({ start: null, end: null })} className="bg-indigo-600 text-white px-3 md:px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2 h-[38px]">
                <Plus size={18} /> <span className="hidden md:inline">Novo</span>
            </button>
        </div>
      </div>

      {/* --- VISÃO MOBILE (AGENDA LISTA) --- */}
      <div className="md:hidden flex-1 overflow-y-auto">
        {eventsOnDay.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <CalendarIcon size={48} className="mb-2 opacity-20"/>
                <p>Agenda livre neste dia.</p>
            </div>
        ) : (
            <div className="space-y-3">
                {eventsOnDay.map(evt => (
                    <div 
                        key={evt.id} 
                        onClick={() => handleSelectEvent(evt)}
                        className={`p-4 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 ${typeColors[evt.tipo] || typeColors.execucao}`}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-gray-800 dark:text-white">{evt.title}</h4>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                    <Clock size={12}/>
                                    {format(evt.start, 'HH:mm')} - {format(evt.end, 'HH:mm')}
                                </div>
                            </div>
                            <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                {evt.tipo}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* --- VISÃO DESKTOP (CALENDÁRIO GRANDE) --- */}
      <div className="hidden md:block flex-1 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 min-h-[650px]">
        <DnDCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '75vh' }}
          culture='pt-BR'
          selectable
          resizable
          views={['month', 'week', 'day', 'agenda']}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          eventPropGetter={eventStyleGetter}
          messages={{ next: "Próximo", previous: "Anterior", today: "Hoje", month: "Mês", week: "Semana", day: "Dia", agenda: "Agenda" }}
          className="text-gray-700 dark:text-gray-300 font-sans text-sm"
          // Sincroniza navegação do calendário grande com o state viewDate
          date={viewDate}
          onNavigate={date => setViewDate(date)}
        />
      </div>

      {renderModal()}
    </div>
  );
};

export default TeamCalendar;