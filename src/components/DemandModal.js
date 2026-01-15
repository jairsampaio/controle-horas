import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { 
  X, Save, Briefcase, User, Calendar, Clock, 
  DollarSign, Lock, FileText, Link as LinkIcon
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
    id: null,
    titulo: '',
    descricao: '',
    cliente_id: '',
    produto: 'ERP',
    vencedor_id: '',
    estimativa: '',
    status: 'Pendente',
    data_expiracao: '',
    link_arquivos: '', // NOVO CAMPO
    
    // Financeiro
    valor_cobrado: '',
    modelo_cobranca: 'hora',
    valor_interno_hora: '',
    observacoes_internas: ''
  });

  // Load Lists
  useEffect(() => {
    if (!isOpen || !consultoriaId) return;
    const fetchAuxData = async () => {
      const { data: clientsData } = await supabase.from('clientes').select('id, nome').eq('consultoria_id', consultoriaId).order('nome');
      if (clientsData) setClients(clientsData);
      const { data: teamData } = await supabase.from('profiles').select('id, nome, email').eq('consultoria_id', consultoriaId).order('nome');
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
      setFormData(prev => ({
        ...prev,
        id: null, titulo: '', descricao: '', status: 'Pendente', produto: 'ERP',
        estimativa: '', vencedor_id: '', cliente_id: '', link_arquivos: '',
        valor_cobrado: '', valor_interno_hora: '', observacoes_internas: ''
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

  const handleSave = async (e) => {
    e.preventDefault();
    if (isReadOnly) return; // Segurança extra
    setLoading(true);

    try {
      const payloadPublico = {
        titulo: formData.titulo,
        descricao: formData.descricao,
        cliente_id: formData.cliente_id,
        produto: formData.produto,
        vencedor_id: formData.vencedor_id || null,
        estimativa: formData.estimativa || 0,
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
    const horas = parseFloat(formData.estimativa) || 0;
    
    // Cálculo: Custo Total = Custo Hora * Horas Estimadas
    const custoTotal = custoHora * horas;
    
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
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Briefcase className="text-indigo-600" />
              {isReadOnly ? 'Detalhes da Demanda' : (formData.id ? 'Gerenciar Demanda' : 'Nova Demanda')}
            </h2>
            <p className="text-sm text-gray-500">{isReadOnly ? 'Visualização modo consultor' : 'Gestão Master'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* TABS (Só mostra se for Admin) */}
        {isAdmin && (
          <div className="flex border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 shrink-0">
            <button onClick={() => setActiveTab('geral')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'geral' ? 'bg-white dark:bg-gray-900 text-indigo-600 border-t-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
              <FileText size={16} /> Dados Gerais
            </button>
            <button onClick={() => setActiveTab('financeiro')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'financeiro' ? 'bg-white dark:bg-gray-900 text-emerald-600 border-t-2 border-emerald-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
              <Lock size={14} className="mb-0.5" /> Gestão & Valores
            </button>
          </div>
        )}

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <form id="demandForm" onSubmit={handleSave} className="space-y-6">
            
            {/* ABA GERAL */}
            <div className={activeTab === 'geral' ? 'block' : 'hidden'}>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Título</label>
                  <input type="text" required disabled={isReadOnly} value={formData.titulo} onChange={e => setFormData({...formData, titulo: e.target.value})} className="w-full border rounded-lg p-3 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white font-medium disabled:opacity-60" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Cliente</label>
                    <select required disabled={isReadOnly} value={formData.cliente_id} onChange={e => setFormData({...formData, cliente_id: e.target.value})} className="w-full border rounded-lg p-3 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-60">
                      <option value="">Selecione...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Produto</label>
                    <select disabled={isReadOnly} value={formData.produto} onChange={e => setFormData({...formData, produto: e.target.value})} className="w-full border rounded-lg p-3 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-60">
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
                    <select disabled={isReadOnly} value={formData.vencedor_id} onChange={e => setFormData({...formData, vencedor_id: e.target.value})} className="w-full border rounded-lg p-3 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-60">
                      <option value="">Nenhum</option>
                      {consultants.map(c => <option key={c.id} value={c.id}>{c.nome || c.email}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Status</label>
                    <select disabled={isReadOnly} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className={`w-full border rounded-lg p-3 font-bold disabled:opacity-80 dark:bg-gray-800 dark:border-gray-700 ${formData.status === 'Concluída' ? 'text-green-600 bg-green-50' : formData.status === 'Em Andamento' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}>
                      <option value="Pendente">Pendente</option>
                      <option value="Em Andamento">Em Andamento</option>
                      <option value="Congelada">Congelada</option>
                      <option value="Concluída">Concluída</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 flex items-center gap-1"><Clock size={12}/> Estimativa (Horas)</label>
                    <input type="number" disabled={isReadOnly} value={formData.estimativa} onChange={e => setFormData({...formData, estimativa: e.target.value})} className="w-full border rounded-lg p-3 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-60" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 flex items-center gap-1"><Calendar size={12}/> Prazo</label>
                    <input type="date" disabled={isReadOnly} value={formData.data_expiracao} onChange={e => setFormData({...formData, data_expiracao: e.target.value})} className="w-full border rounded-lg p-3 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-60" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 flex items-center gap-1"><LinkIcon size={12}/> Link Arquivos (Drive/Docs)</label>
                  <input type="url" disabled={isReadOnly} value={formData.link_arquivos} onChange={e => setFormData({...formData, link_arquivos: e.target.value})} placeholder="https://..." className="w-full border rounded-lg p-3 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-blue-400 font-medium disabled:opacity-60" />
                  {isReadOnly && formData.link_arquivos && (
                    <a href={formData.link_arquivos} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 underline mt-1 block">Abrir link</a>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Descrição</label>
                  <textarea rows={4} disabled={isReadOnly} value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} className="w-full border rounded-lg p-3 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm disabled:opacity-60" />
                </div>
              </div>
            </div>

            {/* ABA FINANCEIRA (SÓ ADMIN) */}
            {isAdmin && (
              <div className={activeTab === 'financeiro' ? 'block animate-fade-in' : 'hidden'}>
                
                <div className={`mb-6 p-4 rounded-xl border ${margem.percentual > 30 ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <p className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Margem</p>
                      <h3 className={`text-2xl font-black ${margem.percentual > 30 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-white'}`}>{margem.percentual.toFixed(1)}%</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Lucro Bruto</p>
                      <p className="text-lg font-bold text-gray-800 dark:text-white">{formatCurrency(margem.valor)}</p>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-2">
                    Cálculo: Receita ({formatCurrency(formData.valor_cobrado)}) - Custo Total ({formatCurrency(margem.custoTotal)})
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1"><DollarSign size={12}/> Valor Cobrado</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-400 font-bold">R$</span>
                      <input type="number" value={formData.valor_cobrado} onChange={e => setFormData({...formData, valor_cobrado: e.target.value})} className="w-full border-2 border-emerald-100 dark:border-emerald-900 rounded-lg p-3 pl-10 bg-white dark:bg-gray-800 dark:text-white font-bold" placeholder="0.00" />
                    </div>
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Modelo</label>
                     <select value={formData.modelo_cobranca} onChange={e => setFormData({...formData, modelo_cobranca: e.target.value})} className="w-full border rounded-lg p-3 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                        <option value="hora">Por Hora</option>
                        <option value="pacote_fechado">Pacote Fechado</option>
                        <option value="mensal">Mensal</option>
                      </select>
                  </div>
                </div>

                <div className="mb-4">
                    <label className="block text-xs font-bold text-red-400 uppercase mb-1"><User size={12}/> Custo Consultor (Por Hora)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-400 font-bold">R$</span>
                      <input type="number" value={formData.valor_interno_hora} onChange={e => setFormData({...formData, valor_interno_hora: e.target.value})} className="w-full border border-red-100 dark:border-red-900/30 rounded-lg p-3 pl-10 bg-white dark:bg-gray-800 dark:text-white" placeholder="Ex: 50.00" />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Multiplicado pelas {formData.estimativa || 0} horas estimadas.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1"><Lock size={12}/> Obs. Internas</label>
                  <textarea rows={3} value={formData.observacoes_internas} onChange={e => setFormData({...formData, observacoes_internas: e.target.value})} className="w-full border border-yellow-200 dark:border-yellow-900/30 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg p-3 text-sm dark:text-gray-200" />
                </div>
              </div>
            )}
          </form>
        </div>

        {/* FOOTER - SÓ MOSTRA SALVAR SE FOR ADMIN */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex gap-3 bg-gray-50 dark:bg-gray-900 rounded-b-2xl shrink-0">
          <button onClick={onClose} className="flex-1 py-3 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-colors">
            {isReadOnly ? 'Fechar' : 'Cancelar'}
          </button>
          
          {!isReadOnly && (
            <button onClick={() => document.getElementById('demandForm').requestSubmit()} disabled={loading} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg transition-all flex justify-center items-center gap-2">
              {loading ? 'Salvando...' : <><Save size={20} /> Salvar</>}
            </button>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
};

export default DemandModal;