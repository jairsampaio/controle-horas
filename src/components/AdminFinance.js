import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  DollarSign, Calendar, CheckCircle, XCircle, AlertCircle, 
  Search, Plus, Wallet, TrendingUp, TrendingDown, Filter, X, 
  Clock, MoreHorizontal, Send, PieChart, BarChart2, ArrowDownRight
} from 'lucide-react';
import supabase from '../services/supabase';
import { formatCurrency } from '../utils/formatters';

const AdminFinance = () => {
  const [faturas, setFaturas] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ recebido: 0, pendente: 0, vencido: 0, projecao: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [filtro, setFiltro] = useState('');
  
  // Estado para nova fatura
  const [novaFatura, setNovaFatura] = useState({
    tenant_id: '',
    valor: '150.00',
    data_vencimento: new Date().toISOString().split('T')[0],
    referencia: '',
    obs: ''
  });

  useEffect(() => {
    carregarFinanceiro();
  }, []);

  const carregarFinanceiro = async () => {
    setLoading(true);
    try {
      // 1. Buscar Faturas
      const { data: dataFaturas, error: erroFaturas } = await supabase
        .from('saas_faturas')
        .select('*, tenants(nome_empresa)')
        .order('data_vencimento', { ascending: false });

      if (erroFaturas) throw erroFaturas;
      setFaturas(dataFaturas);

      // 2. Buscar Empresas Ativas
      const { data: dataTenants } = await supabase
        .from('tenants')
        .select('id, nome_empresa')
        .eq('status_financeiro', 'ativo')
        .order('nome_empresa');
      
      setTenants(dataTenants || []);

      // 3. Calcular Métricas Avançadas
      const hoje = new Date().toISOString().split('T')[0];
      const calculo = dataFaturas.reduce((acc, fatura) => {
        const valor = parseFloat(fatura.valor || 0);
        
        if (fatura.status === 'pago') {
          acc.recebido += valor;
        } else if (fatura.status === 'pendente') {
          if (fatura.data_vencimento < hoje) {
             acc.vencido += valor;
          } else {
             acc.pendente += valor;
          }
        }
        return acc;
      }, { recebido: 0, pendente: 0, vencido: 0 });

      // Projeção: Recebido + Pendente (O que já entrou + O que vai entrar)
      calculo.projecao = calculo.recebido + calculo.pendente;

      setMetrics(calculo);

    } catch (error) {
      console.error("Erro financeiro:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarFatura = async (e) => {
    e.preventDefault();
    if (!novaFatura.tenant_id) return alert('Selecione uma consultoria!');

    try {
      const { error } = await supabase.from('saas_faturas').insert([{ ...novaFatura, status: 'pendente' }]);
      if (error) throw error;
      alert('Cobrança lançada com sucesso!');
      setModalOpen(false);
      setNovaFatura({ ...novaFatura, referencia: '', obs: '' });
      carregarFinanceiro();
    } catch (error) {
      console.error(error);
      alert('Erro ao lançar cobrança.');
    }
  };

  const alterarStatus = async (id, novoStatus) => {
    if (!window.confirm(`Confirmar alteração para: ${novoStatus.toUpperCase()}?`)) return;
    
    const updateData = { status: novoStatus };
    if (novoStatus === 'pago') updateData.data_pagamento = new Date().toISOString();
    if (novoStatus === 'pendente') updateData.data_pagamento = null;

    try {
      const { error } = await supabase.from('saas_faturas').update(updateData).eq('id', id);
      if (error) throw error;
      carregarFinanceiro();
    } catch (error) {
      alert('Erro ao atualizar status.');
    }
  };

  const faturasFiltradas = faturas.filter(f => 
    f.tenants?.nome_empresa?.toLowerCase().includes(filtro.toLowerCase()) ||
    f.referencia?.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600">
               <Wallet size={24} />
            </div>
            Gestão Financeira
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 ml-1">Visão geral do faturamento e inadimplência.</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:scale-105 active:scale-95"
        >
          <Plus size={20} /> Nova Cobrança
        </button>
      </div>

      {/* KPI GRID (ESTILO CARTÃO DE CRÉDITO) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Card 1: Receita Total */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-3xl text-white shadow-xl shadow-indigo-200 dark:shadow-none relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={100} /></div>
           <p className="text-indigo-200 font-medium text-sm uppercase tracking-wider mb-1">Receita Realizada</p>
           <h3 className="text-3xl font-black">{formatCurrency(metrics.recebido)}</h3>
           <div className="mt-4 flex items-center gap-2 text-xs font-medium bg-white/10 w-fit px-2 py-1 rounded-lg backdrop-blur-sm">
              <TrendingUp size={14} /> +12% vs mês anterior
           </div>
        </div>

        {/* Card 2: A Receber */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl"><Clock size={24} /></div>
              <span className="text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-1 rounded-lg">Previsto</span>
           </div>
           <p className="text-gray-400 text-xs font-bold uppercase">A Receber</p>
           <h3 className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{formatCurrency(metrics.pendente)}</h3>
        </div>

        {/* Card 3: Inadimplência */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-red-100 dark:border-red-900/30 shadow-sm relative overflow-hidden">
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl"><AlertCircle size={24} /></div>
              {metrics.vencido > 0 && <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-1 rounded-lg animate-pulse">Atenção</span>}
           </div>
           <p className="text-gray-400 text-xs font-bold uppercase">Vencido</p>
           <h3 className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{formatCurrency(metrics.vencido)}</h3>
        </div>

        {/* Card 4: Projeção */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-2xl"><BarChart2 size={24} /></div>
           </div>
           <p className="text-gray-400 text-xs font-bold uppercase">Projeção Total</p>
           <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{formatCurrency(metrics.projecao)}</h3>
        </div>
      </div>

      {/* ÁREA PRINCIPAL: TABELA E FILTROS */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
        
        {/* Barra de Busca Estilizada */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
           <h3 className="font-bold text-gray-700 dark:text-gray-200 text-lg flex items-center gap-2">
              <PieChart size={20} className="text-indigo-500"/> Histórico de Transações
           </h3>
           <div className="relative w-full md:w-80 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Buscar cliente ou referência..." 
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
              />
           </div>
        </div>

        {/* Tabela Clean */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-bold border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Vencimento</th>
                <th className="px-6 py-4">Referência</th>
                <th className="px-6 py-4 text-right">Valor</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                 <tr><td colSpan="6" className="p-12 text-center text-gray-400">Carregando dados...</td></tr>
              ) : faturasFiltradas.length === 0 ? (
                 <tr><td colSpan="6" className="p-12 text-center text-gray-400">Nenhum registro encontrado.</td></tr>
              ) : faturasFiltradas.map((fatura) => {
                const isAtrasado = fatura.status === 'pendente' && fatura.data_vencimento < new Date().toISOString().split('T')[0];
                
                return (
                  <tr key={fatura.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                    <td className="px-6 py-4">
                       {fatura.status === 'pago' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                             <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Pago
                          </span>
                       ) : fatura.status === 'cancelado' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-500">
                             <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span> Cancelado
                          </span>
                       ) : isAtrasado ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                             <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> Atrasado
                          </span>
                       ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                             <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span> Aberto
                          </span>
                       )}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-800 dark:text-white">
                        {fatura.tenants?.nome_empresa || 'Cliente Removido'}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 font-mono text-xs">
                        {new Date(fatura.data_vencimento).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                        {fatura.referencia || '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-800 dark:text-white font-mono">
                        {formatCurrency(fatura.valor)}
                    </td>
                    <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {fatura.status === 'pendente' && (
                                <>
                                    <button 
                                        onClick={() => alterarStatus(fatura.id, 'pago')}
                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                        title="Marcar como Pago"
                                    >
                                        <CheckCircle size={18} />
                                    </button>
                                    
                                    {/* Botão de Enviar Cobrança (Fake) */}
                                    <button 
                                        onClick={() => alert(`Lembrete de cobrança enviado para ${fatura.tenants?.nome_empresa}!`)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Enviar Lembrete por Email"
                                    >
                                        <Send size={18} />
                                    </button>

                                    <button 
                                        onClick={() => alterarStatus(fatura.id, 'cancelado')}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Cancelar"
                                    >
                                        <XCircle size={18} />
                                    </button>
                                </>
                            )}
                            {fatura.status === 'pago' && (
                                <span className="text-xs text-green-600 font-bold flex items-center gap-1">
                                    <CheckCircle size={14}/> Baixado
                                </span>
                            )}
                        </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NOVA COBRANÇA */}
      {modalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl p-8 border border-gray-100 dark:border-gray-800 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-8">
              <div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">Nova Cobrança</h3>
                  <p className="text-sm text-gray-500">Lançamento manual de fatura</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSalvarFatura} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 ml-1">Cliente</label>
                <div className="relative">
                    <select 
                      value={novaFatura.tenant_id} 
                      onChange={e => setNovaFatura({...novaFatura, tenant_id: e.target.value})}
                      className="w-full appearance-none rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      required
                    >
                      <option value="">Selecione a empresa...</option>
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>{t.nome_empresa}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-3.5 pointer-events-none text-gray-400"><ArrowDownRight size={16}/></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 ml-1">Valor (R$)</label>
                  <input 
                    type="number" step="0.01"
                    value={novaFatura.valor} 
                    onChange={e => setNovaFatura({...novaFatura, valor: e.target.value})}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 ml-1">Vencimento</label>
                  <input 
                    type="date"
                    value={novaFatura.data_vencimento} 
                    onChange={e => setNovaFatura({...novaFatura, data_vencimento: e.target.value})}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 ml-1">Descrição</label>
                <input 
                  type="text"
                  placeholder="Ex: Assinatura Pro - Janeiro"
                  value={novaFatura.referencia} 
                  onChange={e => setNovaFatura({...novaFatura, referencia: e.target.value})}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 flex justify-center items-center gap-2">
                  <CheckCircle size={18} /> Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default AdminFinance;