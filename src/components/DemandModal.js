import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { 
  X, Save, Briefcase, User, Calendar, Clock, 
  DollarSign, Lock, FileText, Link as LinkIcon, TrendingUp, AlertCircle, Copy, Check,
  Activity, Trash2, AlertTriangle
} from 'lucide-react';
import supabase from '../services/supabase';
import ConfirmModal from './ConfirmModal';

// --- HELPER: Máscara R$ ---
const maskCurrency = (value) => {
  if (!value) return "";
  let v = String(value).replace(/\D/g, "");
  v = (Number(v) / 100).toFixed(2) + "";
  v = v.replace(".", ",");
  v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
  return `R$ ${v}`;
};

// --- HELPER: Parser Seguro ---
const parseCurrency = (value) => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  const clean = String(value).replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
  return parseFloat(clean) || 0;
};

const DemandModal = ({ 
  isOpen, 
  onClose, 
  demandToEdit = null, 
  userRole, 
  userId, 
  consultoriaId, 
  onSuccess 
}) => {
  const isAdmin = ['admin', 'dono', 'super_admin'].includes(userRole);
  const isReadOnly = !isAdmin;

  const [activeTab, setActiveTab] = useState('geral');
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [consultants, setConsultants] = useState([]);
  const [copied, setCopied] = useState(false);

  // --- DELETE STATES ---
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteMode, setDeleteMode] = useState(null); // 'hard' (apagar) ou 'soft' (inativar)
  const [deleteMessage, setDeleteMessage] = useState('');

  // --- PROGRESSO ---
  const [progresso, setProgresso] = useState({ consumido: 0, total: 0, percentual: 0 });

  const [formData, setFormData] = useState({
    id: null,
    codigo: '', 
    titulo: '',
    descricao: '',
    cliente_id: '',
    produto: 'ERP',
    vencedor_id: '',
    estimativa: '',
    status: 'Pendente',
    data_expiracao: '',
    link_arquivos: '',
    valor_cobrado: '', 
    horas_vendidas: '',
    modelo_cobranca: 'hora',
    valor_interno_hora: '',
    observacoes_internas: ''
  });

  const handleCurrencyChange = (e, field) => {
    setFormData(prev => ({ ...prev, [field]: maskCurrency(e.target.value) }));
  };

  const handleCopyLink = () => {
    if (formData.link_arquivos) {
        navigator.clipboard.writeText(formData.link_arquivos);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };

  // Carrega Listas Básicas
  useEffect(() => {
    if (!isOpen || !consultoriaId) return;
    const fetchAuxData = async () => {
      const { data: clientsData } = await supabase.from('clientes').select('id, nome').eq('consultoria_id', consultoriaId).order('nome');
      if (clientsData) setClients(clientsData);
      
      const { data: teamData } = await supabase.from('profiles').select('id, nome, email, valor_hora').eq('consultoria_id', consultoriaId).order('nome');
      if (teamData) setConsultants(teamData);
    };
    fetchAuxData();
  }, [consultoriaId, isOpen]);

  // Carrega Dados da Demanda + Cálculo de Progresso
  useEffect(() => {
    if (!isOpen) return;
    
    if (demandToEdit) {
      loadDemandDetails(demandToEdit);
      calcularProgresso(demandToEdit.id, demandToEdit.estimativa);
    } else {
      setFormData({
        id: null, codigo: '', titulo: '', descricao: '', status: 'Pendente', produto: 'ERP',
        estimativa: '', vencedor_id: '', cliente_id: '', link_arquivos: '',
        valor_cobrado: '', horas_vendidas: '', valor_interno_hora: '', observacoes_internas: '', modelo_cobranca: 'hora'
      });
      setProgresso({ consumido: 0, total: 0, percentual: 0 });
      setActiveTab('geral');
    }
    setDeleteMode(null);
    setShowConfirmModal(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demandToEdit, isOpen]);

  const calcularProgresso = async (demandaId, estimativaTotal) => {
      if (!demandaId) return;
      const { data: servicos, error } = await supabase.from('servicos_prestados').select('horas').eq('demanda_id', demandaId);

      if (!error && servicos) {
          const totalConsumido = servicos.reduce((acc, curr) => acc + (Number(curr.horas) || 0), 0);
          const totalEstimado = Number(estimativaTotal) || 0;
          let percentual = 0;
          if (totalEstimado > 0) percentual = (totalConsumido / totalEstimado) * 100;
          else if (totalConsumido > 0) percentual = 100;

          setProgresso({ consumido: totalConsumido, total: totalEstimado, percentual: percentual });
      }
  };

  const loadDemandDetails = async (demand) => {
    setLoading(true);
    try {
      let initialData = { ...demand };
      if (isAdmin) {
        const { data: finData } = await supabase.from('demandas_financeiro').select('*').eq('demanda_id', demand.id).single();
        if (finData) {
            initialData = { 
                ...initialData, 
                ...finData,
                valor_cobrado: finData.valor_cobrado ? maskCurrency(finData.valor_cobrado.toFixed(2)) : '',
                valor_interno_hora: finData.valor_interno_hora ? maskCurrency(finData.valor_interno_hora.toFixed(2)) : ''
            };
        }
      }
      setFormData(prev => ({ ...prev, ...initialData }));
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const handleConsultantChange = (e) => {
    const selectedId = e.target.value;
    const selectedConsultant = consultants.find(c => c.id === selectedId);
    setFormData(prev => ({
      ...prev,
      vencedor_id: selectedId,
      valor_interno_hora: (isAdmin && selectedConsultant?.valor_hora) 
        ? maskCurrency(selectedConsultant.valor_hora.toFixed(2)) 
        : prev.valor_interno_hora
    }));
  };

  // --- LÓGICA DE DELETE (ERP STYLE) ---
  const handleRequestDelete = async () => {
      if (!formData.id) return;
      setLoading(true);

      // 1. Verifica vínculos
      const { count, error } = await supabase
          .from('servicos_prestados')
          .select('*', { count: 'exact', head: true }) // Conta quantos registros existem
          .eq('demanda_id', formData.id);

      setLoading(false);

      if (error) {
          alert('Erro ao verificar vínculos.');
          return;
      }

      if (count > 0) {
          // TEM VÍNCULO: INATIVA
          setDeleteMode('soft');
          setDeleteMessage(`Esta demanda possui ${count} apontamentos de horas vinculados. Para manter o histórico, ela será INATIVADA (Status: Cancelada) em vez de excluída.`);
      } else {
          // NÃO TEM VÍNCULO: DELETE REAL
          setDeleteMode('hard');
          setDeleteMessage('Esta demanda não possui apontamentos. Ela será excluída permanentemente do sistema.');
      }
      
      setShowConfirmModal(true);
  };

  const handleConfirmAction = async () => {
      setLoading(true);
      try {
          if (deleteMode === 'soft') {
              // INATIVAR
              const { error } = await supabase
                  .from('demandas')
                  .update({ status: 'Cancelada' })
                  .eq('id', formData.id);
              if (error) throw error;
          } else {
              // EXCLUIR TUDO (Hard Delete)
              // Remove financeiro primeiro (se não tiver cascade no banco)
              await supabase.from('demandas_financeiro').delete().eq('demanda_id', formData.id);
              // Remove demanda
              const { error } = await supabase.from('demandas').delete().eq('id', formData.id);
              if (error) throw error;
          }
          onSuccess();
          onClose();
      } catch (err) {
          alert('Erro ao processar ação: ' + err.message);
      } finally {
          setLoading(false);
          setShowConfirmModal(false);
      }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;

    if (!formData.titulo || !formData.titulo.trim()) { alert("Informe o Título."); setActiveTab('geral'); return; }
    if (!formData.cliente_id) { alert("Selecione um Cliente."); setActiveTab('geral'); return; }

    setLoading(true);

    try {
      const payloadPublico = {
        titulo: formData.titulo,
        descricao: formData.descricao,
        cliente_id: formData.cliente_id,
        produto: formData.produto,
        vencedor_id: formData.vencedor_id || null,
        estimativa: formData.estimativa ? parseFloat(formData.estimativa) : 0,
        status: formData.status,
        data_expiracao: formData.data_expiracao || null,
        link_arquivos: formData.link_arquivos,
        consultoria_id: consultoriaId,
        criado_por: demandToEdit ? formData.criado_por : userId
      };

      let demandaId = formData.id;

      if (demandaId) {
        const { error } = await supabase.from('demandas').update(payloadPublico).eq('id', demandaId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('demandas').insert([payloadPublico]).select().single();
        if (error) throw error;
        demandaId = data.id;
      }

      if (isAdmin) {
        const payloadFinanceiro = {
          demanda_id: demandaId,
          consultoria_id: consultoriaId,
          valor_cobrado: parseCurrency(formData.valor_cobrado),
          horas_vendidas: formData.horas_vendidas ? parseFloat(formData.horas_vendidas) : 0,
          modelo_cobranca: formData.modelo_cobranca,
          valor_interno_hora: parseCurrency(formData.valor_interno_hora),
          observacoes_internas: formData.observacoes_internas
        };
        const { error: finError } = await supabase.from('demandas_financeiro').upsert(payloadFinanceiro, { onConflict: 'demanda_id' });
        if (finError) throw finError;
      }

      onSuccess();
      onClose();
    } catch (error) { 
        alert('Erro ao salvar: ' + (error.message || "Verifique os dados")); 
    } finally { 
        setLoading(false); 
    }
  };

  const calcularMargem = () => {
    const receita = parseCurrency(formData.valor_cobrado);
    const custoHora = parseCurrency(formData.valor_interno_hora);
    const horasCusto = parseFloat(formData.estimativa) || 0;
    const custoTotal = custoHora * horasCusto;
    
    if (receita === 0) return { valor: "R$ 0,00", percentual: 0, custoTotal: "R$ 0,00" };

    const lucro = receita - custoTotal;
    const margem = (lucro / receita) * 100;

    return { 
        valor: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lucro), 
        percentual: margem, 
        custoTotal: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(custoTotal)
    };
  };

  const margem = calcularMargem();

  let progressColor = 'bg-indigo-500';
  if (progresso.percentual > 80) progressColor = 'bg-yellow-500';
  if (progresso.percentual > 100) progressColor = 'bg-red-500';

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in w-screen h-screen">
      <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-800 relative">
        
        {/* HEADER */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800 shrink-0 bg-gray-50/50 dark:bg-gray-900/50">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Briefcase className="text-indigo-600" />
              {isReadOnly ? 'Detalhes da Demanda' : (formData.id ? 'Gerenciar Demanda' : 'Nova Demanda')}
              {formData.codigo && <span className="text-sm font-mono bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-md">#{formData.codigo}</span>}
            </h2>
            <p className="text-sm text-gray-500">{isReadOnly ? 'Visualização modo consultor' : 'Gestão Financeira & Operacional'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full">
            <X size={24} />
          </button>
        </div>

        {/* PROGRESSO */}
        {formData.id && (progresso.total > 0 || progresso.consumido > 0) && (
            <div className="bg-indigo-50 dark:bg-gray-800/50 px-6 py-4 border-b border-indigo-100 dark:border-gray-700">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                        <Activity size={16} className="text-indigo-500"/>
                        Progresso Real
                    </div>
                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                        {progresso.consumido.toFixed(1)}h / {progresso.total}h
                    </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden shadow-inner">
                    <div className={`h-3 rounded-full ${progressColor} transition-all duration-700 ease-out relative`} style={{ width: `${Math.min(progresso.percentual, 100)}%` }}>
                        <div className="absolute top-0 left-0 bottom-0 right-0 bg-gradient-to-r from-transparent to-white/20"></div>
                    </div>
                </div>
                
                <div className="flex justify-between mt-3 text-xs">
                    <div className="text-center w-1/3 border-r border-gray-200 dark:border-gray-700">
                        <p className="text-gray-400 uppercase font-bold text-[10px]">Consumido</p>
                        <p className="font-bold text-gray-700 dark:text-white">{progresso.consumido.toFixed(1)}h</p>
                    </div>
                    <div className="text-center w-1/3 border-r border-gray-200 dark:border-gray-700">
                        <p className="text-gray-400 uppercase font-bold text-[10px]">Saldo</p>
                        <p className={`font-bold ${(progresso.total - progresso.consumido) < 0 ? 'text-red-500' : 'text-green-600'}`}>
                            {(progresso.total - progresso.consumido).toFixed(1)}h
                        </p>
                    </div>
                    <div className="text-center w-1/3">
                        <p className="text-gray-400 uppercase font-bold text-[10px]">Utilização</p>
                        <p className={`font-bold ${progresso.percentual > 100 ? 'text-red-500' : 'text-indigo-600'}`}>
                            {progresso.percentual.toFixed(0)}%
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* TABS */}
        {isAdmin && (
          <div className="flex border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 shrink-0">
            <button onClick={() => setActiveTab('geral')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'geral' ? 'bg-white dark:bg-gray-900 text-indigo-600 border-t-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
              <FileText size={16} /> Operacional
            </button>
            <button onClick={() => setActiveTab('financeiro')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'financeiro' ? 'bg-white dark:bg-gray-900 text-emerald-600 border-t-2 border-emerald-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
              <Lock size={14} className="mb-0.5" /> Financeiro
            </button>
          </div>
        )}

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <form id="demandForm" onSubmit={handleSave} className="space-y-6" noValidate>
            
            {/* ABA GERAL */}
            <div className={activeTab === 'geral' ? 'block' : 'hidden'}>
              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Título da Demanda *</label>
                  <input type="text" value={formData.titulo} onChange={e => setFormData({...formData, titulo: e.target.value})} className="w-full border rounded-lg p-3 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white font-medium disabled:opacity-60 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: Relatório Fiscal" disabled={isReadOnly} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Cliente *</label>
                    <select value={formData.cliente_id} onChange={e => setFormData({...formData, cliente_id: e.target.value})} className="w-full border rounded-lg p-3 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-60 focus:ring-2 focus:ring-indigo-500 outline-none" disabled={isReadOnly}>
                      <option value="">Selecione...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Produto</label>
                    <select value={formData.produto} onChange={e => setFormData({...formData, produto: e.target.value})} className="w-full border rounded-lg p-3 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-60 focus:ring-2 focus:ring-indigo-500 outline-none" disabled={isReadOnly}>
                      <option value="ERP">ERP Senior</option>
                      <option value="HCM">HCM (RH)</option>
                      <option value="WMS">WMS / Logística</option>
                      <option value="OUTROS">Outros</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 flex items-center gap-1"><User size={12}/> Responsável</label>
                    <select value={formData.vencedor_id} onChange={handleConsultantChange} className="w-full border rounded-lg p-3 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-60 focus:ring-2 focus:ring-indigo-500 outline-none" disabled={isReadOnly}>
                      <option value="">Nenhum (Em aberto)</option>
                      {consultants.map(c => <option key={c.id} value={c.id}>{c.nome || c.email}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Status</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className={`w-full border rounded-lg p-3 font-bold disabled:opacity-80 dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none ${formData.status === 'Concluída' ? 'text-green-600 bg-green-50' : formData.status === 'Em Andamento' ? 'text-blue-600 bg-blue-50' : formData.status === 'Cancelada' ? 'text-red-500 bg-red-50' : 'text-gray-700'}`} disabled={isReadOnly}>
                      <option value="Pendente">Pendente</option>
                      <option value="Em Andamento">Em Andamento</option>
                      <option value="Congelada">Congelada</option>
                      <option value="Concluída">Concluída</option>
                      <option value="Cancelada">Cancelada</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 flex items-center gap-1"><Clock size={12}/> Estimativa (Repasse)</label>
                    <div className="relative">
                        <input type="number" value={formData.estimativa} onChange={e => setFormData({...formData, estimativa: e.target.value})} className="w-full border rounded-lg p-3 pr-8 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-60 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0" disabled={isReadOnly} />
                        <span className="absolute right-3 top-3.5 text-xs text-gray-400 font-bold">h</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 flex items-center gap-1"><Calendar size={12}/> Prazo</label>
                    <input type="date" value={formData.data_expiracao} onChange={e => setFormData({...formData, data_expiracao: e.target.value})} className="w-full border rounded-lg p-3 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-60 focus:ring-2 focus:ring-indigo-500 outline-none" disabled={isReadOnly} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 flex items-center gap-1"><LinkIcon size={12}/> Link Arquivos (Drive/Docs)</label>
                  <div className="flex gap-2">
                    <input type="url" value={formData.link_arquivos} onChange={e => setFormData({...formData, link_arquivos: e.target.value})} placeholder="https://..." className="flex-1 border rounded-lg p-3 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-blue-400 font-medium disabled:opacity-60 focus:ring-2 focus:ring-indigo-500 outline-none" disabled={isReadOnly} />
                    
                    {formData.link_arquivos && (
                        <button type="button" onClick={handleCopyLink} className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors border border-gray-200 dark:border-gray-700" title="Copiar Link">
                            {copied ? <Check size={20} className="text-green-500"/> : <Copy size={20}/>}
                        </button>
                    )}
                  </div>
                  {isReadOnly && formData.link_arquivos && (
                    <a href={formData.link_arquivos} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 underline mt-1 block pl-1">Abrir link no navegador</a>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Descrição Técnica</label>
                  <textarea rows={4} value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} className="w-full border rounded-lg p-3 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm disabled:opacity-60 focus:ring-2 focus:ring-indigo-500 outline-none" disabled={isReadOnly} />
                </div>
              </div>
            </div>

            {/* ABA FINANCEIRA */}
            {isAdmin && (
              <div className={activeTab === 'financeiro' ? 'block animate-fade-in' : 'hidden'}>
                
                <div className={`mb-6 p-4 rounded-xl border ${margem.percentual > 30 ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${margem.percentual > 30 ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Margem Estimada</p>
                            <h3 className={`text-2xl font-black ${margem.percentual > 30 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-white'}`}>{margem.percentual.toFixed(1)}%</h3>
                        </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Lucro Bruto</p>
                      <p className="text-lg font-bold text-gray-800 dark:text-white">{margem.valor}</p>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-2 flex items-center gap-1">
                    <AlertCircle size={10}/> Cálculo: Venda ({formData.valor_cobrado || 'R$ 0,00'}) - Custo Estimado ({margem.custoTotal})
                  </div>
                </div>

                <div className="mb-6">
                    <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <DollarSign size={14}/> Venda (Cliente)
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Valor Cobrado Total</label>
                            <div className="relative">
                                <input type="text" value={formData.valor_cobrado} onChange={(e) => handleCurrencyChange(e, 'valor_cobrado')} className="w-full border-2 border-emerald-100 dark:border-emerald-900 rounded-lg p-3 bg-white dark:bg-gray-800 dark:text-white font-bold outline-none focus:border-emerald-500" placeholder="R$ 0,00" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Horas Vendidas</label>
                            <div className="relative">
                                <input type="number" value={formData.horas_vendidas} onChange={e => setFormData({...formData, horas_vendidas: e.target.value})} className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-3 pr-8 bg-white dark:bg-gray-800 dark:text-white font-medium outline-none focus:ring-1 focus:ring-emerald-500" placeholder="40" />
                                <span className="absolute right-3 top-3.5 text-xs text-gray-400 font-bold">h</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-6">
                    <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <User size={14}/> Custo (Consultor)
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Custo Hora</label>
                            <div className="relative">
                                <input type="text" value={formData.valor_interno_hora} onChange={(e) => handleCurrencyChange(e, 'valor_interno_hora')} className="w-full border border-red-100 dark:border-red-900/30 rounded-lg p-3 bg-white dark:bg-gray-800 dark:text-white outline-none focus:border-red-400" placeholder="R$ 0,00" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Horas Repassadas</label>
                            <div className="relative">
                                <input type="number" disabled value={formData.estimativa} className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-3 pr-8 bg-white dark:bg-gray-800 dark:text-white font-medium cursor-not-allowed" />
                                <span className="absolute right-3 top-3.5 text-xs text-gray-400 font-bold">h</span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">*Editável na aba Geral</p>
                        </div>
                    </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1"><Lock size={12}/> Obs. Internas (Sigiloso)</label>
                  <textarea rows={3} value={formData.observacoes_internas} onChange={e => setFormData({...formData, observacoes_internas: e.target.value})} className="w-full border border-yellow-200 dark:border-yellow-900/30 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg p-3 text-sm dark:text-gray-200 focus:ring-1 focus:ring-yellow-400 outline-none" placeholder="Detalhes da negociação..." />
                </div>
              </div>
            )}
          </form>
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-between gap-3 bg-gray-50 dark:bg-gray-900 rounded-b-2xl shrink-0">
          {/* BOTÃO EXCLUIR (SÓ NA EDIÇÃO E ADMIN) */}
          {isAdmin && formData.id && (
              <button 
                  type="button" 
                  onClick={handleRequestDelete} 
                  className="px-4 py-3 bg-white dark:bg-gray-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-gray-200 dark:border-gray-700 font-bold rounded-xl transition-colors flex items-center gap-2"
              >
                  <Trash2 size={20} /> <span className="hidden sm:inline">Excluir</span>
              </button>
          )}

          <div className="flex gap-3 ml-auto w-full md:w-auto">
              <button onClick={onClose} className="px-6 py-3 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-colors">
                {isReadOnly ? 'Fechar' : 'Cancelar'}
              </button>
              
              {!isReadOnly && (
                <button onClick={() => document.getElementById('demandForm').requestSubmit()} disabled={loading} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg transition-all flex justify-center items-center gap-2 hover:scale-105 active:scale-95">
                  {loading ? 'Salvando...' : <><Save size={20} /> Salvar</>}
                </button>
              )}
          </div>
        </div>

      </div>
    </div>

    {/* CONFIRM MODAL DE DELETE */}
    <ConfirmModal 
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmAction}
        title={deleteMode === 'soft' ? 'Inativar Demanda?' : 'Excluir Demanda?'}
        message={deleteMessage}
        confirmText={deleteMode === 'soft' ? 'Sim, Inativar' : 'Sim, Excluir'}
        cancelText="Cancelar"
        type="danger"
    />
    </>,
    document.body
  );
};

export default DemandModal;