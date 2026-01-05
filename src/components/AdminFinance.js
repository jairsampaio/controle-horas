import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // <--- IMPORTANTE: O Portal
import { 
  DollarSign, Calendar, CheckCircle, XCircle, AlertCircle, 
  Search, Plus, Wallet, ArrowUpRight, ArrowDownRight, Filter, X, Clock
} from 'lucide-react';
import supabase from '../services/supabase';
import { formatCurrency } from '../utils/formatters';

const AdminFinance = () => {
  const [faturas, setFaturas] = useState([]);
  const [tenants, setTenants] = useState([]); // Lista de empresas para o select
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ recebido: 0, pendente: 0, vencido: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [filtro, setFiltro] = useState('');

  // Estado do formulário de nova fatura
  const [novaFatura, setNovaFatura] = useState({
    tenant_id: '',
    valor: '150.00',
    data_vencimento: new Date().toISOString().split('T')[0],
    referencia: '', // Ex: Mensalidade Janeiro
    obs: ''
  });

  useEffect(() => {
    carregarFinanceiro();
  }, []);

  const carregarFinanceiro = async () => {
    setLoading(true);
    try {
      // 1. Buscar Faturas (com nome da empresa)
      const { data: dataFaturas, error: erroFaturas } = await supabase
        .from('saas_faturas')
        .select('*, tenants(nome_empresa)')
        .order('data_vencimento', { ascending: false });

      if (erroFaturas) throw erroFaturas;
      setFaturas(dataFaturas);

      // 2. Buscar Empresas (para o select de nova cobrança)
      const { data: dataTenants } = await supabase
        .from('tenants')
        .select('id, nome_empresa')
        .eq('status_financeiro', 'ativo') // Só cobra de quem está ativo
        .order('nome_empresa');
      
      setTenants(dataTenants || []);

      // 3. Calcular Métricas
      const hoje = new Date().toISOString().split('T')[0];
      const calculo = dataFaturas.reduce((acc, fatura) => {
        const valor = parseFloat(fatura.valor);
        if (fatura.status === 'pago') {
          acc.recebido += valor;
        } else if (fatura.status === 'pendente') {
          if (fatura.data_vencimento < hoje) acc.vencido += valor;
          else acc.pendente += valor;
        }
        return acc;
      }, { recebido: 0, pendente: 0, vencido: 0 });

      setMetrics(calculo);

    } catch (error) {
      console.error("Erro ao carregar financeiro:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarFatura = async (e) => {
    e.preventDefault();
    if (!novaFatura.tenant_id) return alert('Selecione uma consultoria!');

    try {
      const { error } = await supabase.from('saas_faturas').insert([
        { 
          ...novaFatura, 
          status: 'pendente' 
        }
      ]);

      if (error) throw error;

      alert('Cobrança lançada com sucesso!');
      setModalOpen(false);
      setNovaFatura({ ...novaFatura, referencia: '', obs: '' }); // Limpa campos
      carregarFinanceiro();
    } catch (error) {
      console.error(error);
      alert('Erro ao lançar cobrança.');
    }
  };

  const alterarStatus = async (id, novoStatus) => {
    if (!window.confirm(`Deseja alterar o status para "${novoStatus}"?`)) return;
    
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
    f.tenants?.nome_empresa.toLowerCase().includes(filtro.toLowerCase()) ||
    f.referencia?.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in relative z-0">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              Financeiro SaaS
            </h1>
            <p className="text-gray-500 dark:text-gray-400">Controle de mensalidades e recebimentos.</p>
          </div>
          <button 
            onClick={() => setModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
          >
            <Plus size={20} /> Nova Cobrança
          </button>
        </div>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Total Recebido</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(metrics.recebido)}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
              <ArrowDownRight size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">A Receber (Pendente)</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(metrics.pendente)}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Vencido / Atrasado</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(metrics.vencido)}</p>
            </div>
          </div>
        </div>

        {/* Filtros e Tabela */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          
          {/* Barra de Ferramentas */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por empresa ou referência..." 
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium">
              <Filter size={16} /> Filtros
            </button>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-950 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-4">Vencimento</th>
                  <th className="px-6 py-4">Empresa / Consultoria</th>
                  <th className="px-6 py-4">Referência</th>
                  <th className="px-6 py-4 text-right">Valor</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <tr><td colSpan="6" className="p-10 text-center text-gray-500">Carregando faturas...</td></tr>
                ) : faturasFiltradas.length === 0 ? (
                  <tr><td colSpan="6" className="p-10 text-center text-gray-500">Nenhuma fatura encontrada.</td></tr>
                ) : faturasFiltradas.map((fatura) => {
                  const isAtrasado = fatura.status === 'pendente' && fatura.data_vencimento < new Date().toISOString().split('T')[0];
                  return (
                    <tr key={fatura.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className={isAtrasado ? 'text-red-500' : 'text-gray-400'} />
                          <span className={isAtrasado ? 'text-red-600 font-bold' : ''}>
                            {new Date(fatura.data_vencimento).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-800 dark:text-white">
                        {fatura.tenants?.nome_empresa}
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                        {fatura.referencia || '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-800 dark:text-white">
                        {formatCurrency(fatura.valor)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {fatura.status === 'pago' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                            <CheckCircle size={12} /> PAGO
                          </span>
                        ) : fatura.status === 'cancelado' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700">
                            <XCircle size={12} /> CANCELADO
                          </span>
                        ) : isAtrasado ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 animate-pulse">
                            <AlertCircle size={12} /> VENCIDO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800">
                            <Clock size={12} /> PENDENTE
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 flex justify-center gap-2">
                        {fatura.status === 'pendente' && (
                          <>
                            <button 
                              onClick={() => alterarStatus(fatura.id, 'pago')}
                              title="Confirmar Pagamento"
                              className="p-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                            >
                              <CheckCircle size={18} />
                            </button>
                            <button 
                              onClick={() => alterarStatus(fatura.id, 'cancelado')}
                              title="Cancelar Fatura"
                              className="p-1.5 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <XCircle size={18} />
                            </button>
                          </>
                        )}
                        {fatura.status === 'pago' && (
                           <button 
                             onClick={() => alterarStatus(fatura.id, 'pendente')}
                             title="Desfazer Pagamento"
                             className="p-1.5 text-gray-400 hover:text-yellow-500 transition-colors"
                           >
                             <ArrowUpRight size={18} />
                           </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL COM PORTAL - FICA NO BODY */}
        {modalOpen && createPortal(
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          >
            <div 
              className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-gray-800 animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <DollarSign className="text-indigo-600" /> Nova Cobrança
                </h3>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSalvarFatura} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Empresa / Consultoria</label>
                  <select 
                    value={novaFatura.tenant_id} 
                    onChange={e => setNovaFatura({...novaFatura, tenant_id: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  >
                    <option value="">Selecione...</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.nome_empresa}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor (R$)</label>
                    <input 
                      type="number" step="0.01"
                      value={novaFatura.valor} 
                      onChange={e => setNovaFatura({...novaFatura, valor: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vencimento</label>
                    <input 
                      type="date"
                      value={novaFatura.data_vencimento} 
                      onChange={e => setNovaFatura({...novaFatura, data_vencimento: e.target.value})}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Referência / Descrição</label>
                  <input 
                    type="text"
                    placeholder="Ex: Mensalidade Janeiro/2026"
                    value={novaFatura.referencia} 
                    onChange={e => setNovaFatura({...novaFatura, referencia: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95">
                    Confirmar
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      </div>
    </>
  );
};

export default AdminFinance;