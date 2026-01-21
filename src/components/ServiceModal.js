import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { 
  X, Save, Clock, User, FileText, Calendar, 
  Activity, RotateCcw, Building2, AlertCircle, Info, Trash2, 
  Briefcase, Check, Search, FileDigit, DollarSign, AlertTriangle 
} from 'lucide-react'; 
import supabase from '../services/supabase';
import ConfirmModal from './ConfirmModal'; 

// --- HELPER DE CÁLCULO DE HORAS (INPUT) ---
const calcularDiferencaHoras = (inicio, fim) => {
    if (!inicio || !fim) return 0;
    try {
        const [h1, m1] = inicio.split(':').map(Number);
        const [h2, m2] = fim.split(':').map(Number);
        
        if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;

        const minutosInicio = h1 * 60 + m1;
        const minutosFim = h2 * 60 + m2;
        
        let diffMinutos = minutosFim - minutosInicio;
        if (diffMinutos < 0) diffMinutos += 24 * 60; // Virada de noite
        
        return diffMinutos / 60;
    } catch (e) { return 0; }
};

const ServiceModal = ({ isOpen, onClose, onSave, onDelete, formData, setFormData, clientes, isEditing }) => {
  const [loading, setLoading] = useState(false);
  
  // Listas
  const [listaSolicitantes, setListaSolicitantes] = useState([]);
  const [loadingSolicitantes, setLoadingSolicitantes] = useState(false);
  const [listaCanais, setListaCanais] = useState([]);
  const [listaDemandas, setListaDemandas] = useState([]); 

  // Controle de Demanda
  const [vincularDemanda, setVincularDemanda] = useState(true);
  const [buscaDemanda, setBuscaDemanda] = useState('');
  const [mostrarListaDemandas, setMostrarListaDemandas] = useState(false);
  
  // *** SALDO ***
  const [saldoDemanda, setSaldoDemanda] = useState({ total: 0, usadasAntigas: 0, carregando: false }); 

  // Visuais
  const [valorVisual, setValorVisual] = useState('');
  const [erroValidacao, setErroValidacao] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Lote
  const [modoLancamento, setModoLancamento] = useState('detalhado'); 
  const [horasTotais, setHorasTotais] = useState('');
  const [previsaoDistribuicao, setPrevisaoDistribuicao] = useState(null); 

  const lastClientRef = useRef(null);
  const dropdownRef = useRef(null);

  // --- 1. INICIALIZAÇÃO ---
  useEffect(() => {
    if (isOpen) {
      // Formata Valor
      if (isEditing && formData.valor_hora) {
        setValorVisual(formData.valor_hora.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      } else if (!isEditing) {
        // Função interna para evitar dependência externa
        const fetchUserRate = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if(user) {
                const { data } = await supabase.from('profiles').select('valor_hora').eq('id', user.id).single();
                if(data && data.valor_hora) {
                    const val = data.valor_hora;
                    setValorVisual(val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                    setFormData(prev => ({ ...prev, valor_hora: val }));
                }
            }
        };
        fetchUserRate();
      } else {
        setValorVisual('');
      }
      
      setErroValidacao(''); 
      setPrevisaoDistribuicao(null);
      setHorasTotais('');
      setSaldoDemanda({ total: 0, usadasAntigas: 0, carregando: false });
      setShowConfirmModal(false);
      lastClientRef.current = null; 
      setModoLancamento('detalhado');

      if (formData.demanda_id) {
          setVincularDemanda(true);
      } else {
          setVincularDemanda(false); 
          setBuscaDemanda('');
      }

      if (formData.canal_id === "") setFormData(prev => ({ ...prev, canal_id: null }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isEditing]);

  // --- 2. CARREGAR LISTAS ---
  useEffect(() => {
    const carregarDadosAuxiliares = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('consultoria_id').eq('id', user.id).single();

      if (profile && profile.consultoria_id) {
        // Canais
        const { data: canais } = await supabase.from('canais').select('*').eq('consultoria_id', profile.consultoria_id).eq('ativo', true).order('nome');
        if (canais) setListaCanais(canais);

        // Demandas (CORREÇÃO AQUI: Removemos trava de concluída para garantir visibilidade)
        const { data: demandas, error } = await supabase
            .from('demandas')
            .select('id, codigo, titulo, cliente_id, status') 
            .eq('consultoria_id', profile.consultoria_id) // Filtra pela empresa
            .neq('status', 'Cancelada') // Esconde apenas canceladas
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error("Erro ao buscar demandas:", error);
        }

        if (demandas) {
            setListaDemandas(demandas);
            if (formData.demanda_id) {
                const d = demandas.find(item => item.id === formData.demanda_id);
                if (d) setBuscaDemanda(`#${d.codigo} - ${d.titulo}`);
            }
        }
      }
    };
    if (isOpen) carregarDadosAuxiliares();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // --- 3. MONITOR DE DEMANDA ---
  useEffect(() => {
      const buscarDadosReaisNoBanco = async () => {
          if (!formData.demanda_id || !vincularDemanda) {
              setSaldoDemanda({ total: 0, usadasAntigas: 0, carregando: false });
              return;
          }

          setSaldoDemanda(prev => ({ ...prev, carregando: true }));

          try {
              // A) BUSCA A ESTIMATIVA DA DEMANDA
              const { data: demandaData, error: errDem } = await supabase
                  .from('demandas')
                  .select('estimativa')
                  .eq('id', formData.demanda_id)
                  .maybeSingle(); 

              if (errDem) throw errDem;
              const totalEstimado = parseFloat(demandaData?.estimativa) || 0;

              // B) BUSCA O CONSUMIDO
              let query = supabase
                  .from('servicos_prestados')
                  .select('horas, hora_inicial, hora_final')
                  .eq('demanda_id', formData.demanda_id);
              
              if (isEditing && formData.id) {
                  query = query.neq('id', formData.id);
              }

              const { data: servicosData, error: errServ } = await query;
              if (errServ) throw errServ;

              // SOMA INTELIGENTE
              const totalConsumido = servicosData.reduce((acc, item) => {
                  let h = parseFloat(item.horas);
                  if (!h || h === 0) {
                      h = calcularDiferencaHoras(item.hora_inicial, item.hora_final);
                  }
                  return acc + (h || 0);
              }, 0);

              setSaldoDemanda({
                  total: totalEstimado,
                  usadasAntigas: totalConsumido,
                  carregando: false
              });

          } catch (error) {
              console.error("Erro no cálculo de saldo:", error);
              setSaldoDemanda({ total: 0, usadasAntigas: 0, carregando: false });
          }
      };

      buscarDadosReaisNoBanco();
  }, [formData.demanda_id, vincularDemanda, isEditing, formData.id]); 

  // --- 4. CARREGAR SOLICITANTES ---
  useEffect(() => {
    if (!isOpen) return;
    if (formData.cliente === lastClientRef.current && listaSolicitantes.length > 0) return;
    lastClientRef.current = formData.cliente;

    const carregarSolicitantes = async () => {
      if (!formData.cliente) { setListaSolicitantes([]); return; }
      const clienteObj = clientes.find(c => c.nome === formData.cliente);
      if (!clienteObj) return;

      setLoadingSolicitantes(true);
      const { data } = await supabase.from('solicitantes').select('nome').eq('cliente_id', clienteObj.id).eq('ativo', true).order('nome', { ascending: true });
      if (data) setListaSolicitantes(data);
      setLoadingSolicitantes(false);
    };
    carregarSolicitantes();
  }, [formData.cliente, isOpen, clientes, listaSolicitantes.length]); 

  // Dropdown close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setMostrarListaDemandas(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // --- HANDLERS ---
  const handleValorChange = (e) => {
    const v = e.target.value.replace(/\D/g, "");
    if (v === "") { setValorVisual(""); setFormData(prev => ({ ...prev, valor_hora: 0 })); return; }
    const float = parseFloat(v) / 100;
    setValorVisual(float.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setFormData(prev => ({ ...prev, valor_hora: float }));
  };

  const handleChange = (field, value) => {
    let val = value;
    if (field === 'canal_id' && value === '') val = null;
    setFormData(prev => ({ ...prev, [field]: val }));
    if (['solicitante', 'cliente', 'demanda_id'].includes(field)) setErroValidacao(''); 
  };

  const selecionarDemanda = (demanda) => {
      setFormData(prev => ({ ...prev, demanda_id: demanda.id }));
      setBuscaDemanda(`#${demanda.codigo} - ${demanda.titulo}`);
      setMostrarListaDemandas(false);
      
      const clienteObj = clientes.find(c => c.id === demanda.cliente_id);
      if (clienteObj) {
          setFormData(prev => ({ ...prev, demanda_id: demanda.id, cliente: clienteObj.nome, solicitante: '' }));
      }
      setErroValidacao('');
  };

  const limparSelecaoDemanda = () => {
      setFormData(prev => ({ ...prev, demanda_id: null }));
      setBuscaDemanda('');
      setSaldoDemanda({ total: 0, usadasAntigas: 0, carregando: false });
      setMostrarListaDemandas(true); 
  };

  const toggleVincularDemanda = () => {
      if (vincularDemanda) limparSelecaoDemanda();
      setVincularDemanda(!vincularDemanda);
  };

  const handleHorasTotaisChange = (e) => {
      const val = e.target.value;
      setHorasTotais(val);
      setPrevisaoDistribuicao(null);
      if (!val || isNaN(val)) return;
      
      const total = parseFloat(val);
      if (total <= 24) {
          const [hI, mI] = "09:00".split(':').map(Number);
          const hAdd = Math.floor(total);
          const mAdd = Math.round((total % 1) * 60);
          let hF = hI + hAdd;
          let mF = mI + mAdd;
          if (mF >= 60) { hF++; mF -= 60; }
          if (hF >= 24) hF = 23;
          setFormData(prev => ({ ...prev, hora_inicial: "09:00", hora_final: `${String(hF).padStart(2, '0')}:${String(mF).padStart(2, '0')}` }));
      } else {
          setPrevisaoDistribuicao(`Serão gerados ${Math.ceil(total / 8)} lançamentos.`);
      }
  };

  // --- CÁLCULO VISUAL ---
  const getProgressData = () => {
      if (!vincularDemanda) return null;
      let horasDigitando = 0;
      if (modoLancamento === 'rapido') {
          horasDigitando = parseFloat(horasTotais) || 0;
      } else {
          horasDigitando = calcularDiferencaHoras(formData.hora_inicial, formData.hora_final);
      }

      const consumidoTotal = saldoDemanda.usadasAntigas + horasDigitando;
      const teto = saldoDemanda.total || 0;
      const restante = teto - consumidoTotal;
      
      let percentual = 0;
      if (teto > 0) percentual = (consumidoTotal / teto) * 100;
      else if (consumidoTotal > 0) percentual = 100;

      let color = 'bg-green-500';
      if (percentual > 80) color = 'bg-yellow-500';
      if (percentual > 100) color = 'bg-red-500';

      return { consumidoTotal, percentual, color, teto, horasDigitando, restante, carregando: saldoDemanda.carregando };
  };

  const pg = getProgressData();

  const salvarEmLote = async () => {
      try {
          const { data: { user } } = await supabase.auth.getUser();
          const { data: profile } = await supabase.from('profiles').select('consultoria_id').eq('id', user.id).single();
          let rest = parseFloat(horasTotais);
          let dt = new Date(formData.data + 'T12:00:00');
          const batch = [];

          while (rest > 0) {
              if (dt.getDay() !== 0 && dt.getDay() !== 6) {
                  const hHoje = Math.min(rest, 8);
                  const hF = 9 + Math.floor(hHoje);
                  const mF = Math.round((hHoje % 1) * 60);
                  const srv = {
                      data: dt.toISOString().split('T')[0],
                      hora_inicial: '09:00',
                      hora_final: `${String(hF).padStart(2, '0')}:${String(mF).padStart(2, '0')}`,
                      valor_hora: formData.valor_hora,
                      horas: hHoje,
                      canal_id: formData.canal_id || null,
                      cliente: formData.cliente || null,
                      demanda_id: formData.demanda_id || null,
                      os_op_dpc: formData.os_op_dpc || null,
                      atividade: formData.atividade,
                      solicitante: formData.solicitante,
                      numero_nfs: formData.numero_nfs,
                      status: formData.status,
                      observacoes: formData.observacoes,
                      user_id: user.id,
                      consultoria_id: profile.consultoria_id
                  };
                  batch.push(srv);
                  rest -= hHoje;
              }
              dt.setDate(dt.getDate() + 1);
          }
          const { error } = await supabase.from('servicos_prestados').insert(batch);
          if (error) throw error;
          return true;
      } catch (err) { setErroValidacao("Erro lote: " + err.message); return false; }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErroValidacao('');
    if (vincularDemanda && !formData.demanda_id) { setErroValidacao('Selecione uma Demanda.'); return; }
    if (!formData.cliente) { setErroValidacao('Cliente inválido.'); return; }
    if (!formData.solicitante) { setErroValidacao('Informe o Solicitante.'); return; }

    setLoading(true);
    let horasSalvar = 0;
    if (modoLancamento === 'detalhado') {
        horasSalvar = calcularDiferencaHoras(formData.hora_inicial, formData.hora_final);
    } else {
        horasSalvar = parseFloat(horasTotais) || 0;
    }

    if (modoLancamento === 'rapido' && horasSalvar > 24) {
        if (await salvarEmLote()) { onClose(); window.location.reload(); }
        setLoading(false);
        return;
    }
    
    setFormData(prev => ({ ...prev, horas: horasSalvar }));
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('consultoria_id').eq('id', user.id).single();
        
        const payload = {
            ...formData,
            horas: horasSalvar,
            canal_id: formData.canal_id || null,
            cliente: formData.cliente,
            user_id: user.id,
            consultoria_id: profile.consultoria_id
        };

        if (isEditing) {
            const { error } = await supabase.from('servicos_prestados').update(payload).eq('id', formData.id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('servicos_prestados').insert([payload]);
            if (error) throw error;
        }
        
        onClose();
        window.location.reload(); 
    } catch (err) {
        console.error(err);
        setErroValidacao("Erro ao salvar: " + err.message);
    }
    setLoading(false);
  };

  const handleRequestDelete = () => setShowConfirmModal(true);
  const handleConfirmDelete = async () => { if (onDelete && formData.id) { await onDelete(formData.id); setShowConfirmModal(false); onClose(); } };

  const headerColor = isEditing ? 'bg-orange-500' : 'bg-indigo-600';
  const buttonColor = isEditing ? 'bg-orange-600 hover:bg-orange-700' : 'bg-indigo-600 hover:bg-indigo-700';

  return ReactDOM.createPortal(
    <>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fade-in w-screen h-screen">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-800">
            
            <div className={`${headerColor} p-6 flex justify-between items-center text-white shadow-lg shrink-0`}>
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        {isEditing ? <RotateCcw size={24}/> : <Clock size={24}/>}
                        {isEditing ? 'Editar Lançamento' : 'Apontar Horas'}
                    </h2>
                    <p className="text-blue-100 text-sm mt-1 opacity-90">{isEditing ? 'Ajustar registro existente' : 'Registre sua atividade'}</p>
                </div>
                <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X size={24} /></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            <form onSubmit={handleSubmit} className="space-y-6">
                
                {erroValidacao && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100 dark:border-red-900/50">
                        <AlertCircle size={16} /> {erroValidacao}
                    </div>
                )}
                
                {!isEditing && (
                    <div className="flex justify-center">
                        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl inline-flex shadow-inner">
                            <button type="button" onClick={() => setModoLancamento('detalhado')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${modoLancamento === 'detalhado' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}><Clock size={14}/> Detalhado</button>
                            <button type="button" onClick={() => setModoLancamento('rapido')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${modoLancamento === 'rapido' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}><RotateCcw size={14}/> Rápido (Lote)</button>
                        </div>
                    </div>
                )}

                <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700 space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1"><Briefcase size={12}/> Demanda (Projeto)</label>
                        <div className="flex items-center gap-2 cursor-pointer" onClick={toggleVincularDemanda}>
                            <span className={`text-xs font-bold ${vincularDemanda ? 'text-indigo-600' : 'text-gray-400'}`}>{vincularDemanda ? 'Vinculado' : 'Sem vínculo'}</span>
                            <div className={`w-10 h-5 rounded-full p-1 transition-colors ${vincularDemanda ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform ${vincularDemanda ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </div>
                        </div>
                    </div>

                    {vincularDemanda && (
                        <div className="relative" ref={dropdownRef}>
                            <div className="relative">
                                <input type="text" value={buscaDemanda} onChange={(e) => { setBuscaDemanda(e.target.value); setMostrarListaDemandas(true); }} onFocus={(e) => { e.target.select(); setMostrarListaDemandas(true); }} placeholder="Digite para buscar a demanda..." className="w-full border rounded-xl pl-10 pr-10 py-3 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium" />
                                <Search size={18} className="absolute left-3 top-3.5 text-gray-400" />
                                {formData.demanda_id && <Check size={18} className="absolute right-3 top-3.5 text-green-500" />}
                                {buscaDemanda && !formData.demanda_id && <button type="button" onClick={limparSelecaoDemanda} className="absolute right-3 top-3.5 text-gray-400 hover:text-red-500"><X size={16}/></button>}
                                {formData.demanda_id && <button type="button" onClick={limparSelecaoDemanda} className="absolute right-10 top-3.5 text-gray-400 hover:text-red-500 mr-1"><X size={16}/></button>}
                            </div>
                            {mostrarListaDemandas && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar animate-fade-in">
                                    {listaDemandas.filter(d => d.titulo.toLowerCase().includes(buscaDemanda.toLowerCase()) || String(d.codigo).includes(buscaDemanda)).length > 0 ? (
                                        listaDemandas.filter(d => d.titulo.toLowerCase().includes(buscaDemanda.toLowerCase()) || String(d.codigo).includes(buscaDemanda)).map(d => (
                                            <div key={d.id} onClick={() => selecionarDemanda(d)} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                                                <div className="text-sm font-bold text-gray-800 dark:text-white">#{d.codigo} - {d.titulo}</div>
                                            </div>
                                        ))
                                    ) : (<div className="p-3 text-sm text-gray-500 text-center">Nenhuma demanda encontrada.</div>)}
                                </div>
                            )}
                        </div>
                    )}

                    {vincularDemanda && pg && (
                        <div className="mt-2 animate-fade-in bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                            {pg.carregando ? <div className="text-xs text-gray-400 text-center py-1">Calculando saldo...</div> : (
                                <>
                                    <div className="flex justify-between items-end text-xs mb-2 text-gray-600 dark:text-gray-400">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase text-gray-400 font-bold">Consumido</span>
                                            <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{pg.consumidoTotal.toFixed(1)}h</span>
                                        </div>
                                        
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] uppercase text-indigo-500 font-bold">Total Previsto</span>
                                            <span className="font-black text-sm text-indigo-600 dark:text-indigo-400">{pg.teto.toFixed(1)}h</span>
                                        </div>

                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] uppercase text-gray-400 font-bold">Restante</span>
                                            <span className={`font-bold text-sm ${pg.restante < 0 ? 'text-red-500' : 'text-green-600'}`}>{pg.restante.toFixed(1)}h</span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden shadow-inner">
                                        <div className={`h-3 rounded-full ${pg.color} transition-all duration-500 relative`} style={{ width: `${Math.min(pg.percentual, 100)}%` }}></div>
                                    </div>
                                    {pg.percentual > 100 && <div className="flex items-center gap-1 text-[10px] text-red-500 mt-2 font-bold justify-center"><AlertTriangle size={12}/> Atenção: Orçamento da demanda excedido!</div>}
                                    {pg.horasDigitando > 0 && <p className="text-[10px] text-center mt-1 text-gray-400">Incluindo +{pg.horasDigitando.toFixed(1)}h deste apontamento</p>}
                                </>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5 flex items-center gap-1"><User size={12}/> Cliente</label>
                            <div className="relative">
                                {vincularDemanda ? (
                                    <input type="text" value={formData.cliente || ''} readOnly className="w-full border rounded-xl pl-4 pr-3 py-3 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed font-medium outline-none" placeholder="Selecione a demanda" />
                                ) : (
                                    <select value={formData.cliente || ''} onChange={(e) => { setFormData(prev => ({ ...prev, cliente: e.target.value, solicitante: '' })); }} className="w-full border rounded-xl px-3 py-3 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500">
                                        <option value="">Selecione...</option>
                                        {clientes.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                                    </select>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5 flex items-center gap-1"><User size={12}/> Solicitante <span className="text-red-500">*</span></label>
                            <select value={formData.solicitante} onChange={(e) => handleChange('solicitante', e.target.value)} className={`w-full border rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${!formData.cliente ? 'bg-gray-100 dark:bg-gray-800 text-gray-400' : 'bg-white dark:bg-gray-900 dark:text-white'}`} disabled={!formData.cliente || loadingSolicitantes} required>
                                {!formData.cliente ? <option value="">...</option> : loadingSolicitantes ? <option value="">Carregando...</option> : listaSolicitantes.length === 0 ? <option value="">Sem solicitantes</option> : <><option value="">Quem pediu?</option>{listaSolicitantes.map((sol, i) => (<option key={i} value={sol.nome}>{sol.nome}</option>))}</>}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1"><Calendar size={12} /> Data</label>
                        <input type="date" value={formData.data} onChange={(e) => handleChange('data', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white" required />
                    </div>
                    {modoLancamento === 'detalhado' ? (
                        <>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1"><Clock size={12} /> Início</label>
                                <input type="time" value={formData.hora_inicial} onChange={(e) => handleChange('hora_inicial', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white" required />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1"><Clock size={12} /> Fim</label>
                                <input type="time" value={formData.hora_final} onChange={(e) => handleChange('hora_final', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white" required />
                            </div>
                        </>
                    ) : (
                        <div className="col-span-2 space-y-1">
                            <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1"><Clock size={12} /> Qtd. Horas Totais</label>
                            <input type="number" step="0.5" min="0" value={horasTotais} onChange={handleHorasTotaisChange} className="w-full border-2 border-indigo-100 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-bold" placeholder="Ex: 8" required />
                        </div>
                    )}
                </div>

                {previsaoDistribuicao && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 flex gap-3 items-start">
                        <Info className="text-blue-600 mt-0.5 shrink-0" size={18} />
                        <p className="text-sm text-blue-700 dark:text-blue-300">{previsaoDistribuicao}</p>
                    </div>
                )}

                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1"><Activity size={12} /> Atividade</label>
                        <input type="text" value={formData.atividade} onChange={(e) => handleChange('atividade', e.target.value)} className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white" required placeholder="O que foi feito?" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1"><Building2 size={12} /> Canal (Opc)</label>
                            <select value={formData.canal_id || ''} onChange={(e) => handleChange('canal_id', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                                <option value="">-- Direto --</option>
                                {listaCanais.map(canal => (<option key={canal.id} value={canal.id}>{canal.nome}</option>))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1"><FileText size={12} /> N.F. (Opcional)</label>
                            <input type="text" value={formData.numero_nfs} onChange={(e) => handleChange('numero_nfs', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white" placeholder="Número" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1"><FileDigit size={12} /> OS/OP/DPC</label>
                            <input type="text" value={formData.os_op_dpc} onChange={(e) => handleChange('os_op_dpc', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white" placeholder="Interno" />
                        </div>
                    </div>
                    {!vincularDemanda && (
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1"><DollarSign size={12} /> Valor Hora (R$)</label>
                            <input type="text" value={valorVisual} onChange={handleValorChange} className="w-full border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white" required />
                        </div>
                    )}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Observações</label>
                        <textarea rows="2" value={formData.observacoes} onChange={(e) => handleChange('observacoes', e.target.value)} className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm" placeholder="Detalhes técnicos..."></textarea>
                    </div>
                </div>

                <div className="pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-between gap-2">
                {isEditing && (
                    <button type="button" onClick={handleRequestDelete} className="px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-bold flex items-center gap-2"><Trash2 size={18}/> <span className="hidden sm:inline">Excluir</span></button>
                )}
                <div className="flex gap-3 ml-auto">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-bold flex items-center gap-2">Cancelar</button>
                    <button type="submit" disabled={loading} className={`px-6 py-2.5 text-sm text-white rounded-xl shadow-lg transition-all transform active:scale-95 flex items-center gap-2 font-bold ${buttonColor}`}>{loading ? 'Salvando...' : <><Save size={18} /> Salvar</>}</button>
                </div>
                </div>
            </form>
            </div>
        </div>
        </div>
        <ConfirmModal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} onConfirm={handleConfirmDelete} title="Excluir Serviço?" message="Essa ação afetará o saldo total de horas e não pode ser desfeita." confirmText="Sim, excluir" cancelText="Cancelar" type="danger" />
    </>
    ,
    document.body
  );
};

export default ServiceModal;