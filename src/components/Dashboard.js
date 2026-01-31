import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  DollarSign, Clock, TrendingUp, Activity, Briefcase, X,
  Hourglass, Timer, CheckCircle, FileCheck 
} from 'lucide-react';
import StatusCard from './StatusCard'; 
import MultiSelect from './MultiSelect'; // <--- IMPORTANDO O COMPONENTE PREMIUM
import { formatCurrency, formatHoursInt } from '../utils/formatters';

// Cores do Gráfico de Pizza
const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const Dashboard = ({ servicos = [], clientes = [] }) => {
  
  // --- 1. ESTADOS DOS FILTROS ---
  const [periodo, setPeriodo] = useState('mes_atual'); 
  
  // AGORA SÃO ARRAYS PARA O MULTISELECT
  const [filtroClientes, setFiltroClientes] = useState([]);
  const [filtroConsultores, setFiltroConsultores] = useState([]);

  // --- CONFIGURAÇÃO VISUAL DOS STATUS ---
  const statusConfig = {
    'Pendente': { 
        color: 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600', 
        icon: Hourglass, 
        label: 'Pendente' 
    },
    'Em aprovação': { 
        color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800', 
        icon: Timer, 
        label: 'Em Aprovação' 
    },
    'Aprovado': { 
        color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800', 
        icon: CheckCircle, 
        label: 'Aprovado' 
    }, 
    'NF Emitida': { 
        color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800', 
        icon: FileCheck, 
        label: 'NF Emitida' 
    },
    'Pago': { 
        color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800', 
        icon: DollarSign, 
        label: 'Pago' 
    }
  };

  // --- 2. HELPERS DE DATA ---
  const getDateRange = (tipo) => {
    const hoje = new Date();
    const inicio = new Date();
    const fim = new Date();

    if (tipo === 'mes_atual') {
      inicio.setDate(1);
    } else if (tipo === 'mes_anterior') {
      inicio.setMonth(inicio.getMonth() - 1);
      inicio.setDate(1);
      fim.setDate(0); 
    } else if (tipo === 'ano_atual') {
      inicio.setMonth(0, 1);
    } else {
      return null; 
    }
    
    inicio.setHours(0,0,0,0);
    fim.setHours(23,59,59,999);
    return { inicio, fim };
  };

  // --- 3. MOTOR DE DADOS ---
  const dadosFiltrados = useMemo(() => {
    const range = getDateRange(periodo);
    
    return servicos.filter(s => {
      const dataServico = new Date(s.data + 'T00:00:00');
      
      // Filtro de Data
      if (range && (dataServico < range.inicio || dataServico > range.fim)) return false;
      
      // Filtro de Clientes (Multi)
      if (filtroClientes.length > 0 && !filtroClientes.includes(s.cliente)) return false;

      // Filtro de Consultores (Multi)
      if (filtroConsultores.length > 0) {
          const nomeConsultor = s.profiles?.nome || 'N/A';
          if (!filtroConsultores.includes(nomeConsultor)) return false;
      }

      return true;
    });
  }, [servicos, periodo, filtroClientes, filtroConsultores]);

  // --- 4. CÁLCULO DE KPIs ---
  const kpis = useMemo(() => {
    const totalValor = dadosFiltrados.reduce((acc, s) => acc + Number(s.valor_total || 0), 0);
    const totalHoras = dadosFiltrados.reduce((acc, s) => acc + Number(s.qtd_horas || 0), 0);
    const totalServicos = dadosFiltrados.length;
    const ticketMedio = totalHoras > 0 ? totalValor / totalHoras : 0;

    return { totalValor, totalHoras, totalServicos, ticketMedio };
  }, [dadosFiltrados]);

  // --- 5. CÁLCULO DOS CARDS DE STATUS ---
  const statusMetrics = useMemo(() => {
      const metrics = {
        'Pendente': { count: 0, valor: 0 },
        'Em aprovação': { count: 0, valor: 0 },
        'Aprovado': { count: 0, valor: 0 },
        'NF Emitida': { count: 0, valor: 0 },
        'Pago': { count: 0, valor: 0 }
      };

      dadosFiltrados.forEach(s => {
          const st = s.status || 'Pendente';
          if (metrics[st]) {
              metrics[st].count += 1;
              metrics[st].valor += Number(s.valor_total || 0);
          }
      });

      return metrics;
  }, [dadosFiltrados]);

  // --- 6. DADOS PARA GRÁFICOS ---
  const chartDataEvolucao = useMemo(() => {
    const agrupaPor = periodo.includes('ano') ? 'mes' : 'dia';
    const dados = {};

    dadosFiltrados.forEach(s => {
      const data = new Date(s.data + 'T00:00:00');
      const key = agrupaPor === 'mes' 
        ? data.toLocaleDateString('pt-BR', { month: 'short' }) 
        : data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      
      if (!dados[key]) dados[key] = { name: key, valor: 0 };
      dados[key].valor += Number(s.valor_total || 0);
    });

    return Object.values(dados);
  }, [dadosFiltrados, periodo]);

  const chartDataClientes = useMemo(() => {
    const map = {};
    dadosFiltrados.forEach(s => {
      const cliente = s.cliente || 'Outros';
      if (!map[cliente]) map[cliente] = { name: cliente, valor: 0 };
      map[cliente].valor += Number(s.valor_total || 0);
    });
    return Object.values(map).sort((a, b) => b.valor - a.valor).slice(0, 5);
  }, [dadosFiltrados]);

  const chartDataStatus = useMemo(() => {
    const map = {};
    dadosFiltrados.forEach(s => {
      const st = s.status || 'Pendente';
      if (!map[st]) map[st] = { name: st, value: 0 };
      map[st].value += 1;
    });
    return Object.values(map);
  }, [dadosFiltrados]);

  // Preparação das listas para os MultiSelects
  const opcoesConsultores = useMemo(() => {
      const nomes = servicos.map(s => s.profiles?.nome).filter(Boolean);
      return [...new Set(nomes)].sort();
  }, [servicos]);

  const opcoesClientes = useMemo(() => {
      return clientes.map(c => c.nome).sort();
  }, [clientes]);

  return (
    <div className="space-y-6 pb-10 animate-fade-in-up">
      
      {/* HEADER & FILTROS */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col xl:flex-row justify-between items-center gap-4">
        <div className="w-full xl:w-auto">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Activity className="text-indigo-600" /> Cockpit Financeiro
            </h2>
            <p className="text-xs text-gray-500">Visão estratégica em tempo real</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
            {/* Seletor de Período */}
            <div className="bg-gray-100 dark:bg-gray-900 p-1 rounded-lg flex items-center shrink-0">
                <button onClick={() => setPeriodo('mes_atual')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${periodo === 'mes_atual' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500'}`}>Mês Atual</button>
                <button onClick={() => setPeriodo('mes_anterior')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${periodo === 'mes_anterior' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500'}`}>Mês Anterior</button>
                <button onClick={() => setPeriodo('ano_atual')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${periodo === 'ano_atual' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500'}`}>Ano</button>
                <button onClick={() => setPeriodo('tudo')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${periodo === 'tudo' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500'}`}>Tudo</button>
            </div>

            {/* FILTROS MULTISELECT */}
            <div className="w-full sm:w-64">
                <MultiSelect 
                    options={opcoesClientes} 
                    selected={filtroClientes} 
                    onChange={setFiltroClientes} 
                    placeholder="Filtrar Clientes..." 
                />
            </div>

            <div className="w-full sm:w-64">
                <MultiSelect 
                    options={opcoesConsultores} 
                    selected={filtroConsultores} 
                    onChange={setFiltroConsultores} 
                    placeholder="Filtrar Consultores..." 
                />
            </div>
            
            {/* Botão Limpar Filtros */}
            {(filtroClientes.length > 0 || filtroConsultores.length > 0) && (
                <button 
                    onClick={() => { setFiltroClientes([]); setFiltroConsultores([]); }} 
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shrink-0" 
                    title="Limpar Filtros"
                >
                    <X size={18} />
                </button>
            )}
        </div>
      </div>

      {/* 1. KPI CARDS (Macro) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Faturamento" value={formatCurrency(kpis.totalValor)} icon={DollarSign} color="text-green-600" bg="bg-green-50 dark:bg-green-900/20" borderColor="border-green-200 dark:border-green-900/50" />
        <KpiCard title="Total de Horas" value={formatHoursInt(kpis.totalHoras)} subValue="Horas trabalhadas" icon={Clock} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/20" borderColor="border-blue-200 dark:border-blue-900/50" />
        <KpiCard title="Ticket Médio / Hora" value={formatCurrency(kpis.ticketMedio)} subValue="Eficiência financeira" icon={TrendingUp} color="text-purple-600" bg="bg-purple-50 dark:bg-purple-900/20" borderColor="border-purple-200 dark:border-purple-900/50" />
        <KpiCard title="Total Serviços" value={kpis.totalServicos} subValue="Entregas realizadas" icon={Briefcase} color="text-amber-600" bg="bg-amber-50 dark:bg-amber-900/20" borderColor="border-amber-200 dark:border-amber-900/50" />
      </div>

      {/* 2. FUNIL DE STATUS */}
      <div>
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">Funil de Aprovação</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {Object.entries(statusMetrics).map(([status, dados]) => {
                const config = statusConfig[status] || statusConfig['Pendente'];
                return (
                    <StatusCard 
                        key={status} 
                        status={status} 
                        count={dados.count} 
                        valor={dados.valor} 
                        color={config.color} 
                        icon={config.icon} 
                    />
                );
            })}
          </div>
      </div>

      {/* 3. GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ÁREA */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-96">
            <h3 className="font-bold text-gray-800 dark:text-white mb-4">Evolução de Faturamento</h3>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartDataEvolucao}>
                    <defs>
                        <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} tickFormatter={(v) => `R$${v/1000}k`} />
                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff' }} formatter={(value) => [formatCurrency(value), "Faturamento"]} />
                    <Area type="monotone" dataKey="valor" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorValor)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>

        {/* PIZZA */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-96 flex flex-col">
            <h3 className="font-bold text-gray-800 dark:text-white mb-2">Distribuição (%)</h3>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={chartDataStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {chartDataStatus.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

      {/* BARRAS */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="font-bold text-gray-800 dark:text-white mb-6">Top 5 Clientes (Receita)</h3>
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDataClientes} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{fill: '#4B5563', fontSize: 12, fontWeight: 600}} />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }} formatter={(value) => [formatCurrency(value), "Receita"]} />
                    <Bar dataKey="valor" fill="#10B981" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

// Componente Interno para Cards
const KpiCard = ({ title, value, subValue, icon: Icon, color, bg, borderColor }) => (
    <div className={`p-5 rounded-2xl border ${borderColor} ${bg} flex flex-col justify-between transition-transform hover:scale-[1.02]`}>
        <div className="flex justify-between items-start mb-2">
            <div>
                <p className="text-xs font-bold uppercase tracking-wider opacity-60 text-gray-600 dark:text-gray-300">{title}</p>
                <h4 className={`text-2xl font-black mt-1 ${color.replace('text-', 'text-gray-800 dark:text-white')}`}>{value}</h4>
            </div>
            <div className={`p-2 rounded-lg bg-white/50 dark:bg-black/20 ${color}`}>
                <Icon size={20} />
            </div>
        </div>
        {subValue && <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{subValue}</p>}
    </div>
);

export default Dashboard;