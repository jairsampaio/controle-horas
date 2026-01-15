import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { 
  X, Save, Briefcase, User, Calendar, Clock, 
  DollarSign, Lock, FileText, Link as LinkIcon, TrendingUp, AlertCircle
} from 'lucide-react';
import supabase from '../services/supabase';

const DemandModal = ({ 
  isOpen, 
  onClose, 
  demandToEdit = null, 
  userRole, 
  userId, 
  consultoriaId, 
  onSuccess 
}) => {
  // --- 1. CONFIGURAÇÕES ---
  const isAdmin = ['admin', 'dono', 'super_admin'].includes(userRole);
  
  // Se não for admin, o modal é apenas LEITURA (exceto se for criação, mas consultor não cria)
  const isReadOnly = !isAdmin;

  const [activeTab, setActiveTab] = useState('geral');
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [consultants, setConsultants] = useState([]);

  // Formatter para Moeda (Visual)
  const formatCurrency = (value) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const [formData, setFormData] = useState({
    // Tabela demandas (Público/Operacional)
    id: null,
    titulo: '',
    descricao: '',
    cliente_id: '',
    produto: 'ERP',
    vencedor_id: '', // Consultor Responsável
    estimativa: '', // Horas DE REPASSE (Teto para o consultor)
    status: 'Pendente',
    data_expiracao: '',
    link_arquivos: '',
    
    // Tabela demandas_financeiro (Cofre/Admin)
    valor_cobrado: '', // Valor Total em R$
    horas_vendidas: '', // Horas VENDIDAS ao cliente
    modelo_cobranca: 'hora',
    valor_interno_hora: '', // Custo do consultor selecionado
    observacoes_internas: ''
  });

  // Load Lists (Agora buscando valor_hora do consultor)
  useEffect(() => {
    if (!isOpen || !consultoriaId) return;
    const fetchAuxData = async () => {
      // Clientes
      const { data: clientsData } = await supabase.from('clientes').select('id, nome').eq('consultoria_id', consultoriaId).order('nome');
      if (clientsData) setClients(clientsData);
      
      // Consultores (Trazendo valor_hora para o auto-fill)
      const { data: teamData } = await supabase.from('profiles').select('id, nome, email, valor_hora').eq('consultoria_id', consultoriaId).order('nome');
      if (teamData) setConsultants(teamData);
    };
    fetchAuxData();
  }, [consultoriaId, isOpen]);

  // Load Data
  useEffect(() => {
    if (!isOpen) return;
    if (demandToEdit) {
      loadDemandDetails(demandToEdit);
    } else {
      // Reset
      setFormData(prev => ({
        ...prev,
        id: null, titulo: '', descricao: '', status: 'Pendente', produto: 'ERP',
        estimativa: '', vencedor_id: '', cliente_id: '', link_arquivos: '',
        valor_cobrado: '', horas_vendidas: '', valor_interno_hora: '', observacoes_internas: ''
      }));
      setActiveTab('geral');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demandToEdit, isOpen]);

  const loadDemandDetails = async (demand) => {
    setLoading(true);
    try {
      let initialData = { ...demand };
      if (isAdmin) {
        const { data: finData } = await supabase.from('demandas_financeiro').select('*').eq('demanda_id', demand.id).single();
        if (finData) initialData = { ...initialData, ...finData };
      }
      setFormData(prev => ({ ...prev, ...initialData }));
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  // --- HANDLER INTELIGENTE DE CONSULTOR ---
  const handleConsultantChange = (e) => {
    const selectedId = e.target.value;
    
    // Busca o consultor na lista carregada para pegar o custo dele
    const selectedConsultant = consultants.find(c => c.id === selectedId);
    
    setFormData(prev => ({
      ...prev,
      vencedor_id: selectedId,
      // Se for Admin e selecionou alguém, preenche o custo automaticamente
      valor_interno_hora: (isAdmin && selectedConsultant?.valor_hora) ? selectedConsultant.valor_hora : prev.valor_interno_hora
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    setLoading(true);

    try {
      const payloadPublico = {
        titulo: formData.titulo,
        descricao: formData.descricao,
        cliente_id: formData.cliente_id,
        produto: formData.produto,
        vencedor_id: formData.vencedor_id || null,
        estimativa: formData.estimativa || 0, // Horas Repassadas
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
          valor_cobrado: formData.valor_cobrado || 0,
          horas_vendidas: formData.horas_vendidas || 0, // Novo campo
          modelo_cobranca: formData.modelo_cobranca,
          valor_interno_hora: formData.valor_interno_hora || 0,
          observacoes_internas: formData.observacoes_internas
        };
        const { error: finError } = await supabase.from('demandas_financeiro').upsert(payloadFinanceiro, { onConflict: 'demanda_id' });
        if (finError) throw finError;
      }

      onSuccess();
      onClose();
    } catch (error) { alert('Erro: ' + error.message); } 
    finally { setLoading(false); }
  };

  const calcularMargem = () => {
    const receita = parseFloat(formData.valor_cobrado) || 0;
    const custoHora = parseFloat(formData.valor_interno_hora) || 0;
    
    // CUSTO REAL = Custo Hora Consultor * Horas Repassadas (Estimativa)
    // Nota: O consultor ganha sobre as horas que ele tem permissão para trabalhar (estimativa) ou trabalha de fato.
    // Aqui usamos a estimativa como base de cálculo de custo previsto.
    const horasRepasse = parseFloat(formData.estimativa) || 0;
    const custoTotal = custoHora * horasRepasse;
    
    if (receita === 0) return { valor: 0, percentual: 0, custoTotal };

    const lucro = receita - custoTotal;
    const margem = (lucro / receita) * 100;

    return { valor: lucro, percentual: margem, custoTotal };
  };

  const margem = calcularMargem();

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in w-screen h-screen">
      <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-800 relative">
        
        {/* HEADER */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800 shrink-0 bg-gray-50/50 dark:bg-gray-900/50">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Briefcase className="text-indigo-600" />
              {isReadOnly ? 'Detalhes da Demanda' : (formData.id ? 'Gerenciar Demanda' : 'Nova Demanda')}
            </h2>
            <p className="text-sm text-gray-500">{isReadOnly ? 'Visualização modo consultor' : 'Gestão Financeira & Operacional'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full">
            <X size={24} />
          </button>
        </div>

        {/* TABS (Só mostra se for Admin) */}
        {isAdmin && (
          <div className="flex border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 shrink-0">
            <button onClick={() => setActiveTab('geral')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'geral' ? 'bg-white dark:bg-gray-900 text-indigo-600 border-t-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
              <FileText size={16} /> Operacional (Repasse)
            </button>
            <button onClick={() => setActiveTab('financeiro')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'financeiro' ? 'bg-white dark:bg-gray-900 text-emerald-600 border-t-2 border-emerald-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
              <Lock size={14} className="mb-0.5" /> Cofre (Venda)
            </button>
          </div>
        )}

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <form id="demandForm" onSubmit={handleSave} className="space-y-6">
            
            {/* ABA GERAL */}
            <div className={activeTab === 'geral' ? 'block' : 'hidden'}>
              <div className="space-y-4">
                {/* Título */}
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Título da Demanda</label>
                  <input type="text" required disabled={isReadOnly} value={formData.titulo} onChange={e => setFormData({...formData, titulo: e.target.value})} className="w-full border rounded-lg p-3 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white font-medium disabled:opacity-60 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: Relatório Fiscal" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Cliente</label>
                    <select required disabled={isReadOnly} value={formData.cliente_id} onChange={e => setFormData({...formData, cliente_id: e.target.value})} className="w-full border rounded-lg p-3 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-60 focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="">Selecione...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Produto</label>
                    <select disabled={isReadOnly} value={formData.produto} onChange={e => setFormData({...formData, produto: e.target.value})} className="w-full border rounded-lg p-3 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-60 focus:ring-2 focus:ring-indigo-500 outline-none">
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
                    {/* AQUI ESTÁ A MÁGICA DO AUTO-FILL */}
                    <select disabled={isReadOnly} value={formData.vencedor_id} onChange={handleConsultantChange} className="w-full border rounded-lg p-3 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-60 focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="">Nenhum (Em aberto)</option>
                      {consultants.map(c => <option key={c.id} value={c.id}>{c.nome || c.email}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Status</label>
                    <select disabled={isReadOnly} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className={`w-full border rounded-lg p-3 font-bold disabled:opacity-80 dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none ${formData.status === 'Concluída' ? 'text-green-600 bg-green-50' : formData.status === 'Em Andamento' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}>
                      <option value="Pendente">Pendente</option>
                      <option value="Em Andamento">Em Andamento</option>
                      <option value="Congelada">Congelada</option>
                      <option value="Concluída">Concluída</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 flex items-center gap-1"><Clock size={12}/> Estimativa (Repasse)</label>
                    <div className="relative">
                        <input type="number" disabled={isReadOnly} value={formData.estimativa} onChange={e => setFormData({...formData, estimativa: e.target.value})} className="w-full border rounded-lg p-3 pr-8 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-60 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0" />
                        <span className="absolute right-3 top-3.5 text-xs text-gray-400 font-bold">h</span>
                    </div>
                    {isAdmin && (
                        <p className="text-[10px] text-gray-400 mt-1">Horas disponíveis para o consultor.</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 flex items-center gap-1"><Calendar size={12}/> Prazo</label>
                    <input type="date" disabled={isReadOnly} value={formData.data_expiracao} onChange={e => setFormData({...formData, data_expiracao: e.target.value})} className="w-full border rounded-lg p-3 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-60 focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 flex items-center gap-1"><LinkIcon size={12}/> Link Arquivos (Drive/Docs)</label>
                  <input type="url" disabled={isReadOnly} value={formData.link_arquivos} onChange={e => setFormData({...formData, link_arquivos: e.target.value})} placeholder="https://..." className="w-full border rounded-lg p-3 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-blue-400 font-medium disabled:opacity-60 focus:ring-2 focus:ring-indigo-500 outline-none" />
                  {isReadOnly && formData.link_arquivos && (
                    <a href={formData.link_arquivos} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 underline mt-1 block">Abrir link</a>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Descrição Técnica</label>
                  <textarea rows={4} disabled={isReadOnly} value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} className="w-full border rounded-lg p-3 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm disabled:opacity-60 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
            </div>

            {/* ABA FINANCEIRA (SÓ ADMIN) */}
            {isAdmin && (
              <div className={activeTab === 'financeiro' ? 'block animate-fade-in' : 'hidden'}>
                
                {/* CARD DE MARGEM */}
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
                      <p className="text-lg font-bold text-gray-800 dark:text-white">{formatCurrency(margem.valor)}</p>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-2 flex items-center gap-1">
                    <AlertCircle size={10}/> Cálculo: Venda ({formatCurrency(formData.valor_cobrado)}) - Custo Estimado ({formatCurrency(margem.custoTotal)})
                  </div>
                </div>

                {/* BLOCO DA VENDA (CLIENTE) */}
                <div className="mb-6">
                    <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <DollarSign size={14}/> Venda (Cliente)
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Valor Cobrado Total</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-gray-400 font-bold">R$</span>
                                <input type="number" value={formData.valor_cobrado} onChange={e => setFormData({...formData, valor_cobrado: e.target.value})} className="w-full border-2 border-emerald-100 dark:border-emerald-900 rounded-lg p-3 pl-10 bg-white dark:bg-gray-800 dark:text-white font-bold outline-none focus:border-emerald-500" placeholder="0.00" />
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

                {/* BLOCO DO CUSTO (CONSULTOR) */}
                <div className="mb-6">
                    <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <User size={14}/> Custo (Consultor)
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Custo Hora</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-gray-400 font-bold">R$</span>
                                <input type="number" value={formData.valor_interno_hora} onChange={e => setFormData({...formData, valor_interno_hora: e.target.value})} className="w-full border border-red-100 dark:border-red-900/30 rounded-lg p-3 pl-10 bg-white dark:bg-gray-800 dark:text-white outline-none focus:border-red-400" placeholder="0.00" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Horas Repassadas</label>
                            <div className="relative">
                                <input type="number" disabled value={formData.estimativa} className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-3 pr-8 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-medium cursor-not-allowed" />
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
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex gap-3 bg-gray-50 dark:bg-gray-900 rounded-b-2xl shrink-0">
          <button onClick={onClose} className="flex-1 py-3 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-colors">
            {isReadOnly ? 'Fechar' : 'Cancelar'}
          </button>
          
          {!isReadOnly && (
            <button onClick={() => document.getElementById('demandForm').requestSubmit()} disabled={loading} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg transition-all flex justify-center items-center gap-2 hover:scale-105 active:scale-95">
              {loading ? 'Salvando...' : <><Save size={20} /> Salvar Demanda</>}
            </button>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
};

export default DemandModal;