import React, { useState, useEffect } from 'react';
import { 
  X, Building2, Users, DollarSign, Calendar, 
  Activity, CheckCircle, Ban, Mail, Phone, MapPin, 
  Shield, Key, Lock, AlertTriangle 
} from 'lucide-react';
import supabase from '../services/supabase';

const AdminModal = ({ isOpen, onClose, tenantId }) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, team, finance
  
  // Dados da Consultoria
  const [tenant, setTenant] = useState(null);
  const [team, setTeam] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalClients: 0,
    totalServices: 0,
    revenueEstimate: 0
  });

  // Estado para Reset de Senha (dentro do modal de detalhes)
  const [resetLoading, setResetLoading] = useState(null);

  useEffect(() => {
    if (isOpen && tenantId) {
      fetchTenantDetails();
    }
  }, [isOpen, tenantId]);

  const fetchTenantDetails = async () => {
    setLoading(true);
    try {
      // 1. Busca Dados da Consultoria
      const { data: tenantData, error: tenantError } = await supabase
        .from('consultorias')
        .select('*')
        .eq('id', tenantId)
        .single();
      
      if (tenantError) throw tenantError;
      setTenant(tenantData);

      // 2. Busca Equipe
      const { data: teamData } = await supabase
        .from('profiles')
        .select('*')
        .eq('consultoria_id', tenantId)
        .order('cargo', { ascending: true }); // Tenta ordenar (admin vem antes alfabeticamente se for 'admin' vs 'colaborador')

      setTeam(teamData || []);

      // 3. Busca Métricas (Contagens)
      
      // Contagem de Clientes
      const { count: clientCount } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('consultoria_id', tenantId);

      // Serviços (Para estimar receita e atividade)
      // CORREÇÃO: Nome da tabela é 'servicos_prestados', não 'servicos'
      const { data: services } = await supabase
        .from('servicos_prestados')
        .select('valor_total') // Campo correto é valor_total
        .eq('consultoria_id', tenantId);

      const totalRevenue = (services || []).reduce((acc, curr) => acc + (Number(curr.valor_total) || 0), 0);

      setStats({
        totalUsers: teamData?.length || 0,
        totalClients: clientCount || 0,
        totalServices: services?.length || 0,
        revenueEstimate: totalRevenue
      });

    } catch (error) {
      console.error("Erro ao carregar detalhes:", error);
    } finally {
      setLoading(false);
    }
  };

  // Função para Resetar Senha (Super Admin Power)
  // NOTA: Isso requer que a trigger ou função RPC 'resetar_senha_via_dono' suporte super_admin
  // ou uso de Service Role no backend.
  const handleResetPassword = async (userId, userName) => {
    const novaSenha = prompt(`Digite a nova senha para ${userName}:`);
    if (!novaSenha || novaSenha.length < 6) return alert("Senha inválida (mín 6 caracteres).");

    setResetLoading(userId);
    try {
        // Tenta usar a RPC que já criamos para o Dono, pois ela deve permitir mudar senha
        // Se o seu usuário logado for Super Admin, ele deve passar na política da RPC
        const { data, error } = await supabase.rpc('resetar_senha_via_dono', {
            user_id_alvo: userId,
            nova_senha: novaSenha
        });

        if (error) throw error;
        if (data && data.status === 'erro') throw new Error(data.msg);

        alert("Senha alterada com sucesso!");
    } catch (error) {
        console.error(error);
        alert("Erro ao alterar senha: " + error.message);
    } finally {
        setResetLoading(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fade-in">
      <div className="bg-white dark:bg-gray-900 w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 animate-scale-in">
        
        {loading || !tenant ? (
            <div className="flex-1 flex items-center justify-center flex-col gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <p className="text-gray-500">Carregando raio-x da empresa...</p>
            </div>
        ) : (
            <>
                {/* --- HEADER (IDENTIDADE) --- */}
                <div className="bg-white dark:bg-gray-950 p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-start">
                    <div className="flex gap-5">
                        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Building2 size={32} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{tenant.nome}</h2>
                                {tenant.status === 'ativa' ? (
                                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold uppercase border border-green-200">Ativa</span>
                                ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold uppercase border border-red-200 flex items-center gap-1"><Ban size={10}/> Bloqueada</span>
                                )}
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1"><MapPin size={14}/> {tenant.cnpj || 'CNPJ não informado'}</span>
                                <span className="flex items-center gap-1"><Calendar size={14}/> Cliente desde {new Date(tenant.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>

                {/* --- NAVIGATION TABS --- */}
                <div className="flex border-b border-gray-200 dark:border-gray-800 px-6 bg-gray-50 dark:bg-gray-900/50">
                    <button 
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Activity size={16}/> Visão Geral
                    </button>
                    <button 
                        onClick={() => setActiveTab('team')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'team' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Users size={16}/> Equipe & Acessos
                    </button>
                    <button 
                        onClick={() => setActiveTab('finance')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'finance' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <DollarSign size={16}/> Financeiro
                    </button>
                </div>

                {/* --- CONTENT AREA --- */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900 custom-scrollbar">
                    
                    {/* TAB: VISÃO GERAL */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* KPI CARDS */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Usuários Ativos</p>
                                    <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{stats.totalUsers}</p>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Base de Clientes</p>
                                    <p className="text-2xl font-bold text-blue-600 mt-1">{stats.totalClients}</p>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Serviços Totais</p>
                                    <p className="text-2xl font-bold text-purple-600 mt-1">{stats.totalServices}</p>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Faturamento (Est.)</p>
                                    <p className="text-2xl font-bold text-green-600 mt-1">R$ {stats.revenueEstimate.toLocaleString('pt-BR')}</p>
                                </div>
                            </div>

                            {/* "FAKE" ACTIVITY CHART (Visual CSS) */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                <h3 className="font-bold text-gray-800 dark:text-white mb-4">Atividade Recente (Volume de Serviços)</h3>
                                <div className="flex items-end justify-between h-32 gap-2">
                                    {[40, 65, 30, 85, 50, 95, 40, 60, 75, 50, 80, 65].map((h, i) => (
                                        <div key={i} className="w-full bg-indigo-50 dark:bg-indigo-900/20 rounded-t-sm relative group">
                                            <div 
                                                style={{ height: `${h}%` }} 
                                                className="absolute bottom-0 w-full bg-indigo-500 rounded-t-sm transition-all duration-500 group-hover:bg-indigo-400"
                                            ></div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between mt-2 text-xs text-gray-400 uppercase">
                                    <span>Jan</span><span>Dez</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: EQUIPE */}
                    {activeTab === 'team' && (
                          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-950 text-gray-500 dark:text-gray-400">
                                    <tr>
                                        <th className="px-6 py-3">Nome</th>
                                        <th className="px-6 py-3">Email</th>
                                        <th className="px-6 py-3">Cargo</th>
                                        <th className="px-6 py-3 text-right">Ações (Super Admin)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {team.map(member => (
                                        <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold">
                                                    {member.nome ? member.nome.charAt(0) : '?'}
                                                </div>
                                                {member.nome}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500">{member.email}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${member.cargo === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {member.cargo}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => handleResetPassword(member.id, member.nome)}
                                                    className="text-indigo-600 hover:text-indigo-800 font-medium text-xs flex items-center gap-1 justify-end ml-auto hover:underline"
                                                >
                                                    {resetLoading === member.id ? 'Alterando...' : <><Key size={14}/> Resetar Senha</>}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                          </div>
                    )}

                    {/* TAB: FINANCEIRO */}
                    {activeTab === 'finance' && (
                        <div className="flex flex-col items-center justify-center h-full text-center py-10">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 mb-4">
                                <DollarSign size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Assinatura Ativa</h3>
                            <p className="text-gray-500 mb-6 max-w-md">
                                Esta consultoria está no plano <strong>{tenant.plano}</strong>.
                                O módulo de cobrança automática via Gateway ainda não está configurado.
                            </p>
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 max-w-lg w-full text-left flex gap-3">
                                <AlertTriangle className="text-yellow-600 shrink-0" />
                                <div>
                                    <h4 className="font-bold text-yellow-800 dark:text-yellow-500 text-sm">Próximos Passos</h4>
                                    <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                                        Para gerenciar faturas e boletos reais, você precisará integrar com ASAAS, Stripe ou Mercado Pago.
                                        Por enquanto, o controle é manual via status da empresa.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default AdminModal;