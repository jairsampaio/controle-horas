import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import ptBR from 'date-fns/locale/pt-BR';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'; // Estilo do Drag & Drop

import { 
  X, Save, Trash2, User, Calendar as CalendarIcon, 
  Clock, Filter, Plus, GripVertical
} from 'lucide-react';
import supabase from '../services/supabase';

// --- CONFIGURAÇÃO ---
const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
const DnDCalendar = withDragAndDrop(Calendar); // Versão com Drag & Drop

const TeamCalendar = ({ userId, userRole, showToast }) => {
  const [events, setEvents] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterConsultant, setFilterConsultant] = useState('todos');

  // Estado do Formulário (Separando Data e Hora para UX melhor)
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

  // --- CARREGAMENTO ---
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
      if (isAdmin && filterConsultant !== 'todos') query = query.eq('consultor_id', filterConsultant);
      else if (!isAdmin) query = query.eq('consultor_id', userId);

      const { data, error } = await query;
      if (error) throw error;

      const formattedEvents = (data || []).map(evt => ({
        ...evt,
        title: evt.titulo, // O calendário espera 'title'
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

  // --- AÇÕES DO CALENDÁRIO ---
  
  // 1. Clicar em horário vazio
  const handleSelectSlot = ({ start, end }) => {
    setFormData({
      id: null,
      titulo: '',
      descricao: '',
      data_inicio: format(start, 'yyyy-MM-dd'),
      hora_inicio: format(start, 'HH:mm'),
      data_fim: format(end, 'yyyy-MM-dd'),
      hora_fim: format(end, 'HH:mm'),
      tipo: 'execucao',
      consultor_id: isAdmin && filterConsultant !== 'todos' ? filterConsultant : userId
    });
    setModalOpen(true);
  };

  // 2. Clicar em evento existente
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

  // 3. Arrastar e Soltar (Mudar horário rápido)
  const handleEventDrop = async ({ event, start, end }) => {
    try {
      const { error } = await supabase.from('agenda_eventos').update({
        inicio: start.toISOString(),
        fim: end.toISOString()
      }).eq('id', event.id);

      if (error) throw error;
      
      // Atualiza localmente para parecer instantâneo
      setEvents(prev => prev.map(ev => ev.id === event.id ? { ...ev, start, end } : ev));
      if (showToast) showToast('Horário atualizado!', 'sucesso');
    } catch (error) {
      console.error(error);
      if (showToast) showToast('Erro ao mover evento.', 'erro');
    }
  };

  // --- SALVAR ---
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const { data: profile } = await supabase.from('profiles').select('consultoria_id').eq('id', userId).single();
      
      // Reconstrói as datas completas
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
      if (showToast) showToast('Agendamento salvo!', 'sucesso');
    } catch (error) {
      console.error(error);
      if (showToast) showToast('Erro ao salvar.', 'erro');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Excluir este item?')) return;
    try {
      await supabase.from('agenda_eventos').delete().eq('id', formData.id);
      setModalOpen(false);
      fetchEvents();
      if (showToast) showToast('Excluído.', 'sucesso');
    } catch (error) { console.error(error); }
  };

  const eventStyleGetter = (event) => {
    const colors = { 
      execucao: '#3b82f6', reuniao: '#8b5cf6', bloqueio: '#ef4444', pessoal: '#10b981' 
    };
    return {
      style: {
        backgroundColor: colors[event.tipo] || '#3b82f6',
        borderRadius: '6px', opacity: 0.9, color: 'white', border: '0px', fontSize: '0.85rem'
      }
    };
  };

  return (
    <div className="h-full flex flex-col space-y-4 animate-fade-in p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <CalendarIcon className="text-indigo-600" /> Agenda da Equipe
          </h2>
          <p className="text-sm text-gray-500">Arraste para mover • Clique para editar</p>
        </div>
        
        <div className="flex gap-3">
            {isAdmin && (
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-2 rounded-lg border border-gray-200 dark:border-gray-600">
                <Filter size={16} className="text-gray-500" />
                <select value={filterConsultant} onChange={(e) => setFilterConsultant(e.target.value)} className="bg-transparent text-sm font-bold outline-none text-indigo-600 dark:text-indigo-400">
                <option value="todos">Todos</option>
                {team.map(m => <option key={m.id} value={m.id}>{m.nome || m.email}</option>)}
                </select>
            </div>
            )}
            <button onClick={() => handleSelectSlot({ start: new Date(), end: new Date() })} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2">
                <Plus size={18} /> Novo
            </button>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 min-h-[650px]">
        <DnDCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '75vh' }}
          culture='pt-BR'
          selectable
          resizable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          onEventDrop={handleEventDrop}
          eventPropGetter={eventStyleGetter}
          messages={{ next: "Próximo", previous: "Anterior", today: "Hoje", month: "Mês", week: "Semana", day: "Dia" }}
          className="text-gray-700 dark:text-gray-300 font-sans text-sm"
        />
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-gray-800 animate-scale-in">
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
        </div>
      )}
    </div>
  );
};

export default TeamCalendar;