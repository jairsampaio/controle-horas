import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import {
  DollarSign,
  Clock,
  TrendingUp,
  Activity,
  Briefcase,
  X,
  Hourglass,
  Timer,
  CheckCircle,
  FileCheck,
} from "lucide-react";

import StatusCard from "./StatusCard";
import MultiSelect from "./MultiSelect";

import { formatCurrency, formatHoursInt } from "../utils/formatters";

const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

const Dashboard = ({
  servicos = [],
  clientes = [],
  userRole,
  canViewFinancial = true,
}) => {
  const isAdmin = ["admin", "dono", "super_admin", "gestor"].includes(userRole);

  const isGP = userRole === "gp";

  const canManageOperation = isAdmin || isGP;

  // =========================================================
  // FILTROS
  // =========================================================
  const [periodo, setPeriodo] = useState("mes_atual");

  const [filtroClientes, setFiltroClientes] = useState([]);

  const [filtroConsultores, setFiltroConsultores] = useState([]);

  // =========================================================
  // STATUS
  // =========================================================
  const statusConfig = {
    Pendente: {
      color:
        "bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600",
      icon: Hourglass,
      label: "Pendente",
    },

    "Em aprovação": {
      color:
        "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800",
      icon: Timer,
      label: "Em Aprovação",
    },

    Aprovado: {
      color:
        "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
      icon: CheckCircle,
      label: "Aprovado",
    },

    "NF Emitida": {
      color:
        "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      icon: FileCheck,
      label: "NF Emitida",
    },

    Pago: {
      color:
        "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800",
      icon: CheckCircle,
      label: "Pago",
    },
  };

  // =========================================================
  // PERÍODO
  // =========================================================
  const getDateRange = (tipo) => {
    const inicio = new Date();

    const fim = new Date();

    if (tipo === "mes_atual") {
      inicio.setDate(1);
    } else if (tipo === "mes_anterior") {
      inicio.setMonth(inicio.getMonth() - 1);

      inicio.setDate(1);

      fim.setDate(0);
    } else if (tipo === "ano_atual") {
      inicio.setMonth(0, 1);
    } else {
      return null;
    }

    inicio.setHours(0, 0, 0, 0);

    fim.setHours(23, 59, 59, 999);

    return {
      inicio,
      fim,
    };
  };

  // =========================================================
  // DADOS FILTRADOS
  // =========================================================
  const dadosFiltrados = useMemo(() => {
    const range = getDateRange(periodo);

    return servicos.filter((servico) => {
      const dataServico = new Date(servico.data + "T00:00:00");

      if (range && (dataServico < range.inicio || dataServico > range.fim)) {
        return false;
      }

      if (
        filtroClientes.length > 0 &&
        !filtroClientes.includes(servico.cliente)
      ) {
        return false;
      }

      if (canManageOperation && filtroConsultores.length > 0) {
        const nomeConsultor = servico.profiles?.nome || "N/A";

        if (!filtroConsultores.includes(nomeConsultor)) {
          return false;
        }
      }

      return true;
    });
  }, [
    servicos,
    periodo,
    filtroClientes,
    filtroConsultores,
    canManageOperation,
  ]);

  // =========================================================
  // KPIs
  // =========================================================
  const kpis = useMemo(() => {
    const totalHoras = dadosFiltrados.reduce(
      (acc, servico) => acc + Number(servico.qtd_horas || servico.horas || 0),
      0
    );

    const totalServicos = dadosFiltrados.length;

    let totalValor = 0;
    let ticketMedio = 0;

    if (canViewFinancial) {
      totalValor = dadosFiltrados.reduce(
        (acc, servico) => acc + Number(servico.valor_total || 0),
        0
      );

      ticketMedio = totalHoras > 0 ? totalValor / totalHoras : 0;
    }

    return {
      totalValor,
      totalHoras,
      totalServicos,
      ticketMedio,
    };
  }, [dadosFiltrados, canViewFinancial]);

  // =========================================================
  // STATUS
  // =========================================================
  const statusMetrics = useMemo(() => {
    const metrics = {
      Pendente: {
        count: 0,
        valor: 0,
      },

      "Em aprovação": {
        count: 0,
        valor: 0,
      },

      Aprovado: {
        count: 0,
        valor: 0,
      },

      "NF Emitida": {
        count: 0,
        valor: 0,
      },

      Pago: {
        count: 0,
        valor: 0,
      },
    };

    dadosFiltrados.forEach((servico) => {
      const status = servico.status || "Pendente";

      if (metrics[status]) {
        metrics[status].count += 1;

        if (canViewFinancial) {
          metrics[status].valor += Number(servico.valor_total || 0);
        }
      }
    });

    return metrics;
  }, [dadosFiltrados, canViewFinancial]);

  // =========================================================
  // GRÁFICO FINANCEIRO - EVOLUÇÃO
  // =========================================================
  const chartDataEvolucaoFinanceira = useMemo(() => {
    if (!canViewFinancial) {
      return [];
    }

    const agrupaPor = periodo.includes("ano") ? "mes" : "dia";

    const dados = {};

    dadosFiltrados.forEach((servico) => {
      const data = new Date(servico.data + "T00:00:00");

      const key =
        agrupaPor === "mes"
          ? data.toLocaleDateString("pt-BR", {
              month: "short",
            })
          : data.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
            });

      if (!dados[key]) {
        dados[key] = {
          name: key,
          valor: 0,
        };
      }

      dados[key].valor += Number(servico.valor_total || 0);
    });

    return Object.values(dados);
  }, [dadosFiltrados, periodo, canViewFinancial]);

  // =========================================================
  // GRÁFICO OPERACIONAL - EVOLUÇÃO DE HORAS
  // =========================================================
  const chartDataEvolucaoOperacional = useMemo(() => {
    if (canViewFinancial) {
      return [];
    }

    const agrupaPor = periodo.includes("ano") ? "mes" : "dia";

    const dados = {};

    dadosFiltrados.forEach((servico) => {
      const data = new Date(servico.data + "T00:00:00");

      const key =
        agrupaPor === "mes"
          ? data.toLocaleDateString("pt-BR", {
              month: "short",
            })
          : data.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
            });

      if (!dados[key]) {
        dados[key] = {
          name: key,
          horas: 0,
        };
      }

      dados[key].horas += Number(servico.qtd_horas || servico.horas || 0);
    });

    return Object.values(dados);
  }, [dadosFiltrados, periodo, canViewFinancial]);

  // =========================================================
  // TOP CLIENTES - FINANCEIRO
  // =========================================================
  const chartDataClientesFinanceiro = useMemo(() => {
    if (!canViewFinancial) {
      return [];
    }

    const map = {};

    dadosFiltrados.forEach((servico) => {
      const cliente = servico.cliente || "Outros";

      if (!map[cliente]) {
        map[cliente] = {
          name: cliente,
          valor: 0,
        };
      }

      map[cliente].valor += Number(servico.valor_total || 0);
    });

    return Object.values(map)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }, [dadosFiltrados, canViewFinancial]);

  // =========================================================
  // TOP CLIENTES - OPERACIONAL
  // =========================================================
  const chartDataClientesOperacional = useMemo(() => {
    if (canViewFinancial) {
      return [];
    }

    const map = {};

    dadosFiltrados.forEach((servico) => {
      const cliente = servico.cliente || "Outros";

      if (!map[cliente]) {
        map[cliente] = {
          name: cliente,
          horas: 0,
        };
      }

      map[cliente].horas += Number(servico.qtd_horas || servico.horas || 0);
    });

    return Object.values(map)
      .sort((a, b) => b.horas - a.horas)
      .slice(0, 5);
  }, [dadosFiltrados, canViewFinancial]);

  // =========================================================
  // DISTRIBUIÇÃO POR STATUS - FINANCEIRO
  // =========================================================
  const chartDataStatusFinanceiro = useMemo(() => {
    if (!canViewFinancial) {
      return [];
    }

    const map = {};

    dadosFiltrados.forEach((servico) => {
      const status = servico.status || "Pendente";

      if (!map[status]) {
        map[status] = {
          name: status,
          value: 0,
        };
      }

      map[status].value += Number(servico.valor_total || 0);
    });

    return Object.values(map);
  }, [dadosFiltrados, canViewFinancial]);

  // =========================================================
  // DISTRIBUIÇÃO POR STATUS - OPERACIONAL
  // =========================================================
  const chartDataStatusOperacional = useMemo(() => {
    if (canViewFinancial) {
      return [];
    }

    const map = {};

    dadosFiltrados.forEach((servico) => {
      const status = servico.status || "Pendente";

      if (!map[status]) {
        map[status] = {
          name: status,
          value: 0,
        };
      }

      map[status].value += 1;
    });

    return Object.values(map);
  }, [dadosFiltrados, canViewFinancial]);

  // =========================================================
  // OPÇÕES DE FILTRO
  // =========================================================
  const opcoesConsultores = useMemo(() => {
    const nomes = servicos
      .map((servico) => servico.profiles?.nome)
      .filter(Boolean);

    return [...new Set(nomes)].sort();
  }, [servicos]);

  const opcoesClientes = useMemo(() => {
    const nomes = clientes.map((cliente) => cliente.nome).filter(Boolean);

    return [...new Set(nomes)].sort();
  }, [clientes]);

  return (
    <div className="space-y-6 pb-10 animate-fade-in-up">
      {/* =================================================== */}
      {/* HEADER E FILTROS */}
      {/* =================================================== */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col xl:flex-row justify-between items-center gap-4">
        <div className="w-full xl:w-auto">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Activity className="text-indigo-600" />

            {canViewFinancial ? "Cockpit Financeiro" : "Cockpit Operacional"}
          </h2>

          <p className="text-xs text-gray-500">
            {canManageOperation
              ? "Visão Geral da Consultoria"
              : "Meus Indicadores de Performance"}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          {/* PERÍODO */}
          <div className="bg-gray-100 dark:bg-gray-900 p-1 rounded-lg flex items-center shrink-0">
            <button
              onClick={() => setPeriodo("mes_atual")}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                periodo === "mes_atual"
                  ? "bg-white dark:bg-gray-700 shadow text-indigo-600 dark:text-indigo-400"
                  : "text-gray-500"
              }`}
            >
              Mês Atual
            </button>

            <button
              onClick={() => setPeriodo("mes_anterior")}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                periodo === "mes_anterior"
                  ? "bg-white dark:bg-gray-700 shadow text-indigo-600 dark:text-indigo-400"
                  : "text-gray-500"
              }`}
            >
              Mês Anterior
            </button>

            <button
              onClick={() => setPeriodo("ano_atual")}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                periodo === "ano_atual"
                  ? "bg-white dark:bg-gray-700 shadow text-indigo-600 dark:text-indigo-400"
                  : "text-gray-500"
              }`}
            >
              Ano
            </button>

            <button
              onClick={() => setPeriodo("tudo")}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                periodo === "tudo"
                  ? "bg-white dark:bg-gray-700 shadow text-indigo-600 dark:text-indigo-400"
                  : "text-gray-500"
              }`}
            >
              Tudo
            </button>
          </div>

          {/* CLIENTES */}
          <div className="w-full sm:w-64">
            <MultiSelect
              options={opcoesClientes}
              selected={filtroClientes}
              onChange={setFiltroClientes}
              placeholder="Filtrar Clientes..."
            />
          </div>

          {/* CONSULTORES - ADMIN E GP */}
          {canManageOperation && (
            <div className="w-full sm:w-64">
              <MultiSelect
                options={opcoesConsultores}
                selected={filtroConsultores}
                onChange={setFiltroConsultores}
                placeholder="Filtrar Consultores..."
              />
            </div>
          )}

          {(filtroClientes.length > 0 ||
            (canManageOperation && filtroConsultores.length > 0)) && (
            <button
              onClick={() => {
                setFiltroClientes([]);
                setFiltroConsultores([]);
              }}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shrink-0"
              title="Limpar Filtros"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* =================================================== */}
      {/* KPIs */}
      {/* =================================================== */}
      <div
        className={`grid grid-cols-1 md:grid-cols-2 ${
          canViewFinancial
            ? isAdmin
              ? "lg:grid-cols-4"
              : "lg:grid-cols-3"
            : "lg:grid-cols-2"
        } gap-4`}
      >
        {canViewFinancial && (
          <KpiCard
            title="Faturamento"
            value={formatCurrency(kpis.totalValor)}
            icon={DollarSign}
            color="text-green-600"
            bg="bg-green-50 dark:bg-green-900/20"
            borderColor="border-green-200 dark:border-green-900/50"
          />
        )}

        <KpiCard
          title="Total de Horas"
          value={formatHoursInt(kpis.totalHoras)}
          subValue="Horas trabalhadas"
          icon={Clock}
          color="text-blue-600"
          bg="bg-blue-50 dark:bg-blue-900/20"
          borderColor="border-blue-200 dark:border-blue-900/50"
        />

        {isAdmin && canViewFinancial && (
          <KpiCard
            title="Ticket Médio / Hora"
            value={formatCurrency(kpis.ticketMedio)}
            subValue="Eficiência financeira"
            icon={TrendingUp}
            color="text-purple-600"
            bg="bg-purple-50 dark:bg-purple-900/20"
            borderColor="border-purple-200 dark:border-purple-900/50"
          />
        )}

        <KpiCard
          title="Total Serviços"
          value={kpis.totalServicos}
          subValue="Entregas realizadas"
          icon={Briefcase}
          color="text-amber-600"
          bg="bg-amber-50 dark:bg-amber-900/20"
          borderColor="border-amber-200 dark:border-amber-900/50"
        />
      </div>

      {/* =================================================== */}
      {/* FUNIL DE STATUS */}
      {/* =================================================== */}
      <div>
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">
          Funil de Aprovação
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {Object.entries(statusMetrics).map(([status, dados]) => {
            const config = statusConfig[status] || statusConfig["Pendente"];

            if (canViewFinancial) {
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
            }

            return (
              <OperationalStatusCard
                key={status}
                status={status}
                count={dados.count}
                color={config.color}
                icon={config.icon}
              />
            );
          })}
        </div>
      </div>

      {/* =================================================== */}
      {/* GRÁFICOS FINANCEIROS */}
      {/* =================================================== */}
      {canViewFinancial && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* EVOLUÇÃO DE FATURAMENTO */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-96">
              <h3 className="font-bold text-gray-800 dark:text-white mb-4">
                Evolução de Faturamento
              </h3>

              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartDataEvolucaoFinanceira}>
                  <defs>
                    <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8} />

                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E5E7EB"
                  />

                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#9CA3AF",
                      fontSize: 12,
                    }}
                    dy={10}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#9CA3AF",
                      fontSize: 12,
                    }}
                    tickFormatter={(value) => `R$${value / 1000}k`}
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    formatter={(value) => [
                      formatCurrency(value),
                      "Faturamento",
                    ]}
                  />

                  <Area
                    type="monotone"
                    dataKey="valor"
                    stroke="#4F46E5"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorValor)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* DISTRIBUIÇÃO DE RECEITA */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-96 flex flex-col">
              <h3 className="font-bold text-gray-800 dark:text-white mb-2">
                Distribuição de Receita
              </h3>

              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartDataStatusFinanceiro}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartDataStatusFinanceiro.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      formatter={(value) => [
                        formatCurrency(value),
                        "Valor Total",
                      ]}
                      contentStyle={{
                        backgroundColor: "#fff",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        color: "#333",
                      }}
                    />

                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* TOP CLIENTES RECEITA */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-white mb-6">
              Top 5 Clientes (Receita)
            </h3>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartDataClientesFinanceiro}
                  layout="vertical"
                  margin={{
                    left: 20,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#E5E7EB"
                  />

                  <XAxis type="number" hide />

                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#4B5563",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  />

                  <Tooltip
                    cursor={{
                      fill: "transparent",
                    }}
                    contentStyle={{
                      backgroundColor: "#fff",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                    formatter={(value) => [formatCurrency(value), "Receita"]}
                  />

                  <Bar
                    dataKey="valor"
                    fill="#10B981"
                    radius={[0, 4, 4, 0]}
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* =================================================== */}
      {/* GRÁFICOS OPERACIONAIS - GP */}
      {/* =================================================== */}
      {!canViewFinancial && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* EVOLUÇÃO DE HORAS */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-96">
              <h3 className="font-bold text-gray-800 dark:text-white mb-4">
                Evolução de Horas
              </h3>

              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartDataEvolucaoOperacional}>
                  <defs>
                    <linearGradient id="colorHoras" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8} />

                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E5E7EB"
                  />

                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#9CA3AF",
                      fontSize: 12,
                    }}
                    dy={10}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#9CA3AF",
                      fontSize: 12,
                    }}
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    formatter={(value) => [
                      `${Number(value).toFixed(1)}h`,
                      "Horas",
                    ]}
                  />

                  <Area
                    type="monotone"
                    dataKey="horas"
                    stroke="#4F46E5"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorHoras)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* DISTRIBUIÇÃO POR STATUS */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-96 flex flex-col">
              <h3 className="font-bold text-gray-800 dark:text-white mb-2">
                Distribuição por Status
              </h3>

              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartDataStatusOperacional}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartDataStatusOperacional.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      formatter={(value) => [
                        value,
                        Number(value) === 1 ? "Serviço" : "Serviços",
                      ]}
                      contentStyle={{
                        backgroundColor: "#fff",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        color: "#333",
                      }}
                    />

                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* TOP CLIENTES HORAS */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-white mb-6">
              Top 5 Clientes (Horas)
            </h3>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartDataClientesOperacional}
                  layout="vertical"
                  margin={{
                    left: 20,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#E5E7EB"
                  />

                  <XAxis type="number" hide />

                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#4B5563",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  />

                  <Tooltip
                    cursor={{
                      fill: "transparent",
                    }}
                    contentStyle={{
                      backgroundColor: "#fff",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                    formatter={(value) => [
                      `${Number(value).toFixed(1)}h`,
                      "Horas",
                    ]}
                  />

                  <Bar
                    dataKey="horas"
                    fill="#4F46E5"
                    radius={[0, 4, 4, 0]}
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ===========================================================
// CARD KPI
// ===========================================================
const KpiCard = ({
  title,
  value,
  subValue,
  icon: Icon,
  color,
  bg,
  borderColor,
}) => (
  <div
    className={`p-5 rounded-2xl border ${borderColor} ${bg} flex flex-col justify-between transition-transform hover:scale-[1.02]`}
  >
    <div className="flex justify-between items-start mb-2">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider opacity-60 text-gray-600 dark:text-gray-300">
          {title}
        </p>

        <h4
          className={`text-2xl font-black mt-1 ${color.replace(
            "text-",
            "text-gray-800 dark:text-white"
          )}`}
        >
          {value}
        </h4>
      </div>

      <div className={`p-2 rounded-lg bg-white/50 dark:bg-black/20 ${color}`}>
        <Icon size={20} />
      </div>
    </div>

    {subValue && (
      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
        {subValue}
      </p>
    )}
  </div>
);

// ===========================================================
// CARD DE STATUS OPERACIONAL - SEM VALORES FINANCEIROS
// ===========================================================
const OperationalStatusCard = ({ status, count, color, icon: Icon }) => (
  <div
    className={`p-4 rounded-xl border transition-all duration-300 hover:shadow-md hover:-translate-y-1 ${color}`}
  >
    <div className="flex items-center gap-2 mb-3 opacity-80 dark:opacity-100">
      <Icon size={20} strokeWidth={2.5} />

      <span className="text-xs font-bold uppercase tracking-wider">
        {status}
      </span>
    </div>

    <div>
      <h3 className="text-2xl font-bold tracking-tight dark:text-white">
        {count}
      </h3>

      <p className="text-sm font-medium opacity-70 mt-1 dark:text-gray-400">
        {count === 1 ? "serviço" : "serviços"}
      </p>
    </div>
  </div>
);

export default Dashboard;
