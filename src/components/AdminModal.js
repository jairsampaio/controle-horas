import React, { useState, useEffect } from 'react';
import { X, Shield, Building2, Users, DollarSign, Calendar, AlertTriangle, CheckCircle, Ban, Search, MoreVertical } from 'lucide-react';
import supabase from '../services/supabase';

const AdminModal = ({ isOpen, onClose, userEmail }) => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [actionMenu, setActionMenu] = useState(null); // ID do tenant com menu aberto

  useEffect(() => {
    if (isOpen) carregarERP();
  }, [isOpen]);

  const carregarERP = async () => {
    setLoading(true);
    // Chama a função SQL poderosa que criamos
    const { data, error } = await supabase.rpc('get_erp_metrics');
    if (error) console.error(error);
    else setTenants(data || []);
    setLoading(false);
  };

  // Função Financeira: Renovar Assinatura
  const handleRenovar = async (tenantId) => {
    const hoje = new Date();
    const proximoMes = new Date(hoje.setMonth(hoje.getMonth() + 1));
    
    const { error } = await supabase
      .from('tenants')
      .update({ 
        status_financeiro: 'ativo',
        data_vencimento: proximoMes.toISOString()
      })
      .eq('id', tenantId);

    if (!error) {
      alert('Pagamento confirmado! Acesso renovado por 30 dias.');
      carregarERP();
      setActionMenu(null);
    }
  };

  // Função Financeira: Bloquear Caloteiro
  const handleBloquear = async (tenantId) => {
    if (!window.confirm("Tem certeza? Isso vai impedir o login de todos os usuários desta consultoria.")) return;

    const { error } = await supabase
      .from('tenants')
      .update({ status_financeiro: 'inadimplente' })
      .eq('id', tenantId);

    if (!error) {
      carregarERP();
      setActionMenu(null);
    }
  };

  if (!isOpen) return null;

  // Filtragem local
  const tenantsFiltrados = tenants.filter(t => 
    t.nome_empresa.toLowerCase().includes(filtro.toLowerCase())
  );

  // Cálculos do seu faturamento (Simulado)
  const totalReceitaMensal = tenants
    .filter(t => t.status_financeiro === 'ativo')
    .reduce((acc, curr) => acc + (curr.plano === 'enterprise' ? 299 : 149), 0); // Ex: Basic 149, Enterprise 299

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fade-in">
      <div className="bg-gray-50 dark:bg-gray-900 w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
        
        {/* Header do ERP */}
        <div className="bg-white dark:bg-gray-950 p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-3 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none">
              <Shield className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight">Painel SaaS Master</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gerenciamento de Consultorias e Receita</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full transition-colors text-gray-500">
            <X size={24} />
          </button>
        </div>

        {/* Dashboard de Métricas (KPIs) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-gray-50 dark:bg-gray-900">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase">Consultorias Ativas</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1 flex items-center gap-2">
              <Building2 className="text-blue-500" /> {tenants.filter(t => t.status_financeiro === 'ativo').length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase">Total de Usuários</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1 flex items-center gap-2">
              <Users className="text-purple-500" /> {tenants.reduce((acc, t) => acc + t.total_usuarios, 0)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase">MRR (Mensal Recorrente)</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1 flex items-center gap-2">
              <DollarSign /> R$ {totalReceitaMensal.toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase">Inadimplentes</p>
            <p className="text-2xl font-bold text-red-500 mt-1 flex items-center gap-2">
              <AlertTriangle /> {tenants.filter(t => t.status_financeiro !== 'ativo').length}
            </p>
          </div>
        </div>

        {/* Barra de Ações */}
        <div className="px-6 py-2 flex justify-between items-center bg-white dark:bg-gray-950 border-y border-gray-200 dark:border-gray-800">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar consultoria..." 
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-700 dark:text-gray-200"
            />
          </div>
          {/* Futuro botão de "+ Nova Consultoria" pode ir aqui */}
        </div>

        {/* Tabela de Consultorias */}
        <div className="flex-1 overflow-auto bg-white dark:bg-gray-900">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-950 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4">Empresa (Tenant)</th>
                <th className="px-6 py-4">Plano</th>
                <th className="px-6 py-4 text-center">Usuários / Clientes</th>
                <th className="px-6 py-4">Vencimento</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr><td colSpan="6" className="p-10 text-center text-gray-500">Carregando dados financeiros...</td></tr>
              ) : tenantsFiltrados.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900 dark:text-white text-base">{tenant.nome_empresa}</span>
                      <span className="text-xs text-gray-400 font-mono select-all">ID: {tenant.id}</span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${
                      tenant.plano === 'enterprise' 
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' 
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    }`}>
                      {tenant.plano}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-3 text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1" title="Usuários do Sistema"><Users size={14} /> {tenant.total_usuarios}</div>
                      <span className="text-gray-300">|</span>
                      <div className="flex items-center gap-1" title="Clientes Cadastrados"><Building2 size={14} /> {tenant.total_clientes_cadastrados}</div>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                    {tenant.data_vencimento ? (
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        {new Date(tenant.data_vencimento).toLocaleDateString()}
                      </div>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    {tenant.status_financeiro === 'ativo' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                        <CheckCircle size={12} /> Em dia
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 animate-pulse">
                        <Ban size={12} /> Bloqueado
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-right relative">
                    <button 
                      onClick={() => setActionMenu(actionMenu === tenant.id ? null : tenant.id)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-indigo-600 transition-colors"
                    >
                      <MoreVertical size={18} />
                    </button>

                    {/* Menu de Contexto (Ações Financeiras) */}
                    {actionMenu === tenant.id && (
                      <div className="absolute right-10 top-8 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-20 overflow-hidden animate-scale-in">
                        <button 
                          onClick={() => handleRenovar(tenant.id)}
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 flex items-center gap-2 transition-colors"
                        >
                          <CheckCircle size={16} /> Confirmar Pagto
                        </button>
                        <button 
                          onClick={() => handleBloquear(tenant.id)}
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 flex items-center gap-2 transition-colors border-t border-gray-100 dark:border-gray-700"
                        >
                          <Ban size={16} /> Bloquear Acesso
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default AdminModal;