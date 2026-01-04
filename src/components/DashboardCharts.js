import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { formatCurrency } from '../utils/formatters';

const DashboardCharts = ({ servicos }) => {
  
  // 1. Processar dados para o Top 5 Clientes
  const clientesMap = servicos.reduce((acc, curr) => {
    const nome = curr.cliente || 'Sem Cliente';
    acc[nome] = (acc[nome] || 0) + parseFloat(curr.valor_total || 0);
    return acc;
  }, {});

  const dataClientes = Object.entries(clientesMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5); // Pega só os top 5

  // 2. Processar dados para Faturamento por Status
  const statusMap = servicos.reduce((acc, curr) => {
    const status = curr.status || 'Outros';
    acc[status] = (acc[status] || 0) + parseFloat(curr.valor_total || 0);
    return acc;
  }, {});

  const dataStatus = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  // Cores personalizadas para o gráfico de Pizza (Status)
  const COLORS = {
    'Pendente': '#9CA3AF',      // Gray 400
    'Em aprovação': '#F97316',  // Orange 500
    'Aprovado': '#EAB308',      // Yellow 500
    'NF Emitida': '#3B82F6',    // Blue 500
    'Pago': '#22C55E',          // Green 500
  };

  // Cores personalizadas para o gráfico de Barras (Top Clientes)
  const BAR_COLOR = '#6366f1'; 

  // Customização do Tooltip para suportar Dark Mode
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg shadow-lg">
          <p className="font-bold text-gray-800 dark:text-white mb-1">{label}</p>
          <p className="text-indigo-600 dark:text-indigo-400 font-medium">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (servicos.length === 0) {
    return null; // Não exibe gráficos se não tiver dados
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* GRÁFICO 1: TOP 5 CLIENTES */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Top 5 Clientes (Faturamento)</h3>
        <div className="h-[300px] w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dataClientes}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#374151" opacity={0.2} />
              
              <XAxis type="number" hide />
              
              <YAxis 
                dataKey="name" 
                type="category" 
                width={100} 
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              
              <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltip />} />
              
              <Bar 
                dataKey="value" 
                fill={BAR_COLOR} 
                radius={[0, 4, 4, 0]} 
                barSize={20}
                className="fill-indigo-600 dark:fill-indigo-500"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GRÁFICO 2: FATURAMENTO POR STATUS */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Faturamento por Status</h3>
        <div className="h-[300px] w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataStatus}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {dataStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#CBD5E1'} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconType="circle"
                formatter={(value) => <span className="text-gray-600 dark:text-gray-400 ml-1">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

export default DashboardCharts;