import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { 
  X, Save, Briefcase, User, Calendar, Clock, 
  DollarSign, Lock, FileText, Link as LinkIcon, Copy, Check,
  Activity, Trash2, Plus, Edit2, CheckCircle2
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
  const [deleteMode, setDeleteMode] = useState(null); 
  const [deleteMessage, setDeleteMessage] = useState('');

  // --- PROGRESSO ---
  const [progresso, setProgresso] = useState({ consumido: 0, total: 0, percentual: 0 });

  // --- NOVOS STATES PARA O EXTRATO FINANCEIRO ---
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [, setLoadingMov] = useState(false);
  
  // Estado do Modal de Lançamento (Novo ou Edição)
  const [financeiroModal, setFinanceiroModal] = useState({
      aberto: false,
      id: null, // Se tiver ID, é edição
      tipo: 'receita', // receita ou despesa
      valor: '',
      data: '',
      descricao: '',
      status: 'pendente' // pendente, pago
  });

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
    valor_hora_venda: '',   
    modelo_cobranca: 'hora',
    valor_interno_hora: '', 
    observacoes_internas: ''
  });

  // --- LÓGICA FINANCEIRA ---

  const carregarMovimentacoes = async () => {
      if (!formData.id) return;
      setLoadingMov(true);
      const { data, error } = await supabase
          .from('movimentacoes_financeiras')
          .select('*')
          .eq('demanda_id', formData.id)
          .order('data_vencimento', { ascending: true });
      
      if (!error && data) setMovimentacoes(data);
      setLoadingMov(false);
  };

  useEffect(() => {
      if (activeTab === 'financeiro' && formData.id) {
          carregarMovimentacoes();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, formData.id]);

  // Cálculo Automático de Venda Total
  useEffect(() => {
    if (activeTab === 'financeiro') {
        const qtd = parseFloat(formData.horas_vendidas) || 0;
        const vlrUnit = parseCurrency(formData.valor_hora_venda);
        
        if (qtd > 0 && vlrUnit > 0) {
            const total = qtd * vlrUnit;
            setFormData(prev => ({ 
                ...prev, 
                valor_cobrado: maskCurrency(total.toFixed(2)) 
            }));
        }
    }
  }, [formData.horas_vendidas, formData.valor_hora_venda, activeTab]);

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

  // Carregamento Inicial
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

  useEffect(() => {
    if (!isOpen) return;
    
    if (demandToEdit) {
      loadDemandDetails(demandToEdit);
      calcularProgresso(demandToEdit.id, demandToEdit.estimativa);
    } else {
      setFormData({
        id: null, codigo: '', titulo: '', descricao: '', status: 'Pendente', produto: 'ERP',
        estimativa: '', vencedor_id: '', cliente_id: '', link_arquivos: '',
        valor_cobrado: '', horas_vendidas: '', valor_hora_venda: '', valor_interno_hora: '', 
        observacoes_internas: '', modelo_cobranca: 'hora'
      });
      setProgresso({ consumido: 0, total: 0, percentual: 0 });
      setActiveTab('geral');
      setMovimentacoes([]);
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
            let vlrHoraVenda = '';
            if (finData.horas_vendidas > 0 && finData.valor_cobrado > 0) {
                vlrHoraVenda = maskCurrency((finData.valor_cobrado / finData.horas_vendidas).toFixed(2));
            }

            initialData = { 
                ...initialData, 
                ...finData,
                valor_cobrado: finData.valor_cobrado ? maskCurrency(finData.valor_cobrado.toFixed(2)) : '',
                valor_interno_hora: finData.valor_interno_hora ? maskCurrency(finData.valor_interno_hora.toFixed(2)) : '',
                valor_hora_venda: vlrHoraVenda 
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

  const handleRequestDelete = async () => {
      if (!formData.id) return;
      setLoading(true);
      const { count, error } = await supabase
          .from('servicos_prestados')
          .select('*', { count: 'exact', head: true })
          .eq('demanda_id', formData.id);
      setLoading(false);
      if (error) { alert('Erro ao verificar vínculos.'); return; }

      if (count > 0) {
          setDeleteMode('soft');
          setDeleteMessage(`Esta demanda possui ${count} apontamentos. Será INATIVADA.`);
      } else {
          setDeleteMode('hard');
          setDeleteMessage('Sem apontamentos. Será EXCLUÍDA permanentemente.');
      }
      setShowConfirmModal(true);
  };

  const handleConfirmAction = async () => {
      setLoading(true);
      try {
          if (deleteMode === 'soft') {
              const { error } = await supabase.from('demandas').update({ status: 'Cancelada' }).eq('id', formData.id);
              if (error) throw error;
          } else {
              await supabase.from('demandas_financeiro').delete().eq('demanda_id', formData.id);
              const { error } = await supabase.from('demandas').delete().eq('id', formData.id);
              if (error) throw error;
          }
          onSuccess(); onClose();
      } catch (err) { alert('Erro: ' + err.message); } 
      finally { setLoading(false); setShowConfirmModal(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!formData.titulo.trim() || !formData.cliente_id) { alert("Preencha Título e Cliente."); return; }

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
      onSuccess(); onClose();
    } catch (error) { alert('Erro ao salvar: ' + error.message); } 
    finally { setLoading(false); }
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

  // --- GESTÃO FINANCEIRA: SALDOS & OPERAÇÕES ---

  const calcularSaldosExtrato = () => {
      const totalReceitaPrevista = parseCurrency(formData.valor_cobrado);
      
      const custoHora = parseCurrency(formData.valor_interno_hora);
      const horasCusto = parseFloat(formData.estimativa) || 0;
      const totalDespesaPrevista = custoHora * horasCusto;

      const receitaGerada = movimentacoes.filter(m => m.tipo === 'receita').reduce((acc, curr) => acc + Number(curr.valor), 0);
      const despesaGerada = movimentacoes.filter(m => m.tipo === 'despesa').reduce((acc, curr) => acc + Number(curr.valor), 0);

      return {
          receita: { total: totalReceitaPrevista, gerado: receitaGerada, saldo: totalReceitaPrevista - receitaGerada },
          despesa: { total: totalDespesaPrevista, gerado: despesaGerada, saldo: totalDespesaPrevista - despesaGerada }
      };
  };

  const saldos = calcularSaldosExtrato();

  // Abrir Modal (Novo ou Edição)
  const abrirModalFinanceiro = (tipo, itemExistente = null) => {
      if (itemExistente) {
          // MODO EDIÇÃO
          setFinanceiroModal({
              aberto: true,
              id: itemExistente.id,
              tipo: itemExistente.tipo,
              valor: maskCurrency(itemExistente.valor.toFixed(2)),
              data: itemExistente.data_vencimento,
              descricao: itemExistente.descricao,
              status: itemExistente.status || 'pendente'
          });
      } else {
          // MODO NOVO
          const saldoRestante = tipo === 'receita' ? saldos.receita.saldo : saldos.despesa.saldo;
          const sugestaoValor = saldoRestante > 0 ? maskCurrency(saldoRestante.toFixed(2)) : '';
          
          setFinanceiroModal({
              aberto: true,
              id: null,
              tipo: tipo,
              valor: sugestaoValor,
              data: new Date().toISOString().split('T')[0],
              descricao: saldoRestante > 0 ? 'Parcela Final' : 'Adiantamento',
              status: 'pendente'
          });
      }
  };

  const salvarMovimentacao = async () => {
      if (!financeiroModal.valor || !financeiroModal.data || !financeiroModal.descricao) {
          alert("Preencha todos os campos obrigatórios."); return;
      }

      setLoadingMov(true);
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!consultoriaId) throw new Error("ID da Consultoria não identificado.");

          const payload = {
              demanda_id: formData.id,
              consultoria_id: consultoriaId,
              tipo: financeiroModal.tipo,
              descricao: financeiroModal.descricao,
              valor: parseCurrency(financeiroModal.valor),
              data_vencimento: financeiroModal.data,
              status: financeiroModal.status,
              criadopor_id: user.id
          };

          if (financeiroModal.id) {
              // UPDATE
              const { error } = await supabase.from('movimentacoes_financeiras').update(payload).eq('id', financeiroModal.id);
              if (error) throw error;
          } else {
              // INSERT
              const { error } = await supabase.from('movimentacoes_financeiras').insert([payload]);
              if (error) throw error;
          }

          setFinanceiroModal({ ...financeiroModal, aberto: false });
          await carregarMovimentacoes();
          
      } catch (error) {
          alert("Erro ao gravar: " + error.message);
      } finally {
          setLoadingMov(false);
      }
  };

  const excluirMovimentacao = async () => {
      if (!financeiroModal.id) return;
      if (!window.confirm("Tem certeza que deseja excluir este lançamento?")) return;
      
      setLoadingMov(true);
      await supabase.from('movimentacoes_financeiras').delete().eq('id', financeiroModal.id);
      setFinanceiroModal({ ...financeiroModal, aberto: false });
      await carregarMovimentacoes();
      setLoadingMov(false);
  };

  const margem = calcularMargem();
  let progressColor = 'bg-indigo-500';
  if (progresso.percentual > 80) progressColor = 'bg-yellow-500';
  if (progresso.percentual > 100) progressColor = 'bg-red-500';

  if (!isOpen) return null;

  const modalThemeClass = financeiroModal.tipo === 'receita' ? 'bg-emerald-600' : 'bg-red-600';

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
                
                {/* 1. SEÇÃO DE CÁLCULO DE MARGEM (DRE Planejado) */}
                <div className={`mb-6 p-4 rounded-xl border ${margem.percentual > 30 ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'}`}>
                   <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-700 dark:text-white flex items-center gap-2"><Activity size={18}/> DRE da Demanda (Planejado)</h3>
                        <span className={`px-3 py-1 rounded text-sm font-bold ${margem.percentual > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>Lucro: {margem.valor}</span>
                   </div>
                   
                   {/* Inputs Originais (Venda e Custo) */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-80 hover:opacity-100 transition-opacity">
                        {/* COLUNA VENDA */}
                        <div className="border-r border-gray-200 dark:border-gray-700 pr-4">
                            <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <DollarSign size={14}/> Receita Prevista
                            </h4>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Qtd Horas</label>
                                    <input 
                                        type="number" 
                                        value={formData.horas_vendidas} 
                                        onChange={e => setFormData({...formData, horas_vendidas: e.target.value})} 
                                        className="w-full border-b border-gray-300 dark:border-gray-600 bg-transparent py-1 font-medium outline-none focus:border-emerald-500 text-sm" 
                                        placeholder="0" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Valor Hora</label>
                                    <input 
                                        type="text" 
                                        value={formData.valor_hora_venda} 
                                        onChange={(e) => handleCurrencyChange(e, 'valor_hora_venda')} 
                                        className="w-full border-b border-gray-300 dark:border-gray-600 bg-transparent py-1 font-medium outline-none focus:border-emerald-500 text-sm" 
                                        placeholder="R$ 0,00" 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1">Total Venda</label>
                                <input type="text" value={formData.valor_cobrado} readOnly className="w-full bg-transparent font-bold text-lg text-emerald-600 border-b border-emerald-200 outline-none" placeholder="R$ 0,00" />
                            </div>
                        </div>

                        {/* COLUNA CUSTO */}
                        <div className="pl-2">
                             <h4 className="text-xs font-bold text-red-500 dark:text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <User size={14}/> Custo Previsto
                             </h4>
                             <div className="mb-3">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Custo Hora (Consultor)</label>
                                <input 
                                    type="text" 
                                    value={formData.valor_interno_hora} 
                                    onChange={(e) => handleCurrencyChange(e, 'valor_interno_hora')} 
                                    className="w-full border-b border-gray-300 dark:border-gray-600 bg-transparent py-1 font-medium outline-none focus:border-red-500 text-sm" 
                                    placeholder="R$ 0,00" 
                                />
                             </div>
                             <div>
                                 <label className="block text-[10px] font-bold text-red-500 uppercase mb-1">Custo Estimado ({formData.estimativa}h)</label>
                                 <input type="text" value={margem.custoTotal} readOnly className="w-full bg-transparent font-bold text-lg text-red-500 border-b border-red-200 outline-none" placeholder="R$ 0,00" />
                             </div>
                        </div>
                   </div>
                </div>

                <hr className="my-6 border-gray-100 dark:border-gray-700" />

                {/* 2. EXTRATO FINANCEIRO */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* COLUNA RECEITA (CLIENTE) */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-end border-b pb-2 border-gray-200 dark:border-gray-700">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Contas a Receber</p>
                                <p className="text-xl font-bold text-emerald-600">{maskCurrency(saldos.receita.saldo.toFixed(2))}</p>
                                <p className="text-[10px] text-gray-400">Saldo restante a cobrar</p>
                            </div>
                            <button type="button" onClick={() => abrirModalFinanceiro('receita')} className="text-xs bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 font-bold transition-colors flex items-center gap-1 shadow-sm">
                                <Plus size={14}/> Nova Cobrança
                            </button>
                        </div>
                        
                        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                            {movimentacoes.filter(m => m.tipo === 'receita').length === 0 && <p className="text-xs text-gray-400 italic text-center py-4">Nenhuma cobrança gerada.</p>}
                            {movimentacoes.filter(m => m.tipo === 'receita').map(mov => (
                                <div key={mov.id} onClick={() => abrirModalFinanceiro('receita', mov)} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm hover:border-emerald-200 dark:hover:border-emerald-900 transition-colors cursor-pointer group relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{mov.descricao}</p>
                                        {mov.status === 'pago' ? <CheckCircle2 size={14} className="text-emerald-500"/> : <span className="w-2 h-2 rounded-full bg-gray-300"></span>}
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <p className="text-[10px] text-gray-400 flex items-center gap-1"><Calendar size={10}/> {new Date(mov.data_vencimento).toLocaleDateString('pt-BR')}</p>
                                        <span className={`text-sm font-bold ${mov.status === 'pago' ? 'text-gray-400 line-through' : 'text-emerald-600'}`}>R$ {mov.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                    </div>
                                    {/* Hover Effect */}
                                    <div className="absolute inset-0 bg-emerald-50 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* COLUNA DESPESA (CONSULTOR) */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-end border-b pb-2 border-gray-200 dark:border-gray-700">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Contas a Pagar</p>
                                <p className="text-xl font-bold text-red-500">{maskCurrency(saldos.despesa.saldo.toFixed(2))}</p>
                                <p className="text-[10px] text-gray-400">Saldo restante a pagar</p>
                            </div>
                            <button type="button" onClick={() => abrirModalFinanceiro('despesa')} className="text-xs bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 font-bold transition-colors flex items-center gap-1 shadow-sm">
                                <Plus size={14}/> Novo Pagamento
                            </button>
                        </div>

                        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                            {movimentacoes.filter(m => m.tipo === 'despesa').length === 0 && <p className="text-xs text-gray-400 italic text-center py-4">Nenhum pagamento gerado.</p>}
                            {movimentacoes.filter(m => m.tipo === 'despesa').map(mov => (
                                <div key={mov.id} onClick={() => abrirModalFinanceiro('despesa', mov)} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm hover:border-red-200 dark:hover:border-red-900 transition-colors cursor-pointer group relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{mov.descricao}</p>
                                        {mov.status === 'pago' ? <CheckCircle2 size={14} className="text-green-500"/> : <span className="w-2 h-2 rounded-full bg-gray-300"></span>}
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <p className="text-[10px] text-gray-400 flex items-center gap-1"><Calendar size={10}/> {new Date(mov.data_vencimento).toLocaleDateString('pt-BR')}</p>
                                        <span className={`text-sm font-bold ${mov.status === 'pago' ? 'text-gray-400 line-through' : 'text-red-500'}`}>R$ {mov.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                    </div>
                                    {/* Hover Effect */}
                                    <div className="absolute inset-0 bg-red-50 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"></div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* --- MODALZINHO PREMIUM DE LANÇAMENTO --- */}
                {financeiroModal.aberto && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setFinanceiroModal({...financeiroModal, aberto: false})}></div>
                        <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl shadow-2xl relative z-10 overflow-hidden animate-scale-in border border-gray-100 dark:border-gray-800">
                            
                            <div className={`${modalThemeClass} p-4 text-white flex justify-between items-center`}>
                                <h3 className="font-bold flex items-center gap-2">
                                    {financeiroModal.id ? <Edit2 size={18}/> : <Plus size={18}/>}
                                    {financeiroModal.id ? 'Editar Parcela' : (financeiroModal.tipo === 'receita' ? 'Nova Cobrança' : 'Novo Pagamento')}
                                </h3>
                                <button onClick={() => setFinanceiroModal({...financeiroModal, aberto: false})} className="hover:bg-white/20 p-1 rounded-full"><X size={18}/></button>
                            </div>

                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição</label>
                                    <input type="text" value={financeiroModal.descricao} onChange={e => setFinanceiroModal({...financeiroModal, descricao: e.target.value})} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-indigo-500 font-medium" placeholder="Ex: Parcela 1/2" />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor (R$)</label>
                                        <input type="text" value={financeiroModal.valor} onChange={(e) => { const v = maskCurrency(e.target.value); setFinanceiroModal({...financeiroModal, valor: v}) }} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vencimento</label>
                                        <input type="date" value={financeiroModal.data} onChange={e => setFinanceiroModal({...financeiroModal, data: e.target.value})} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button type="button" onClick={() => setFinanceiroModal({...financeiroModal, status: 'pendente'})} className={`py-2 text-xs font-bold rounded-lg border ${financeiroModal.status === 'pendente' ? 'bg-gray-100 border-gray-400 text-gray-700' : 'bg-white border-gray-200 text-gray-400'}`}>
                                            Pendente
                                        </button>
                                        <button type="button" onClick={() => setFinanceiroModal({...financeiroModal, status: 'pago'})} className={`py-2 text-xs font-bold rounded-lg border flex items-center justify-center gap-1 ${financeiroModal.status === 'pago' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-200 text-gray-400'}`}>
                                            <CheckCircle2 size={12}/> Pago / Recebido
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700 mt-4">
                                    {financeiroModal.id && (
                                        <button type="button" onClick={excluirMovimentacao} className="px-3 py-2.5 bg-white border border-red-200 text-red-500 rounded-xl hover:bg-red-50 transition-colors"><Trash2 size={18}/></button>
                                    )}
                                    <button type="button" onClick={salvarMovimentacao} className={`flex-1 py-2.5 text-white rounded-xl font-bold shadow-lg transition-transform active:scale-95 ${modalThemeClass} hover:opacity-90`}>
                                        {financeiroModal.id ? 'Salvar Alterações' : 'Confirmar Lançamento'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

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