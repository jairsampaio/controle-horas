// src/components/DashboardCharts.js
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';

const DashboardCharts = ({ servicos }) => {

  // --- 1. PREPARAÇÃO DOS DADOS: Status (Gráfico de Barras) ---
  const dadosStatus = servicos.reduce((acc, curr) => {
    const status = curr.status;
    const valor = parseFloat(curr.valor_total || 0);
    
    const existente = acc.find(item => item.name === status);
    if (existente) {
      existente.value += valor;
    } else {
      acc.push({ name: status, value: valor });
    }
    return acc;
  }, []);

  // Cores oficiais do seu sistema para cada status
  const CORES_STATUS = {
    'Pago': '#22c55e',        // Green
    'NF Emitida': '#3b82f6',  // Blue
    'Aprovado': '#eab308',    // Yellow
    'Em aprovação': '#f97316',// Orange
    'Pendente': '#6b7280'     // Gray
  };

  // --- 2. PREPARAÇÃO DOS DADOS: Clientes (Gráfico de Pizza) ---
  const dadosClientes = servicos.reduce((acc, curr) => {
    const cliente = curr.cliente;
    const valor = parseFloat(curr.valor_total || 0);

    const existente = acc.find(item => item.name === cliente);
    if (existente) {
      existente.value += valor;
    } else {
      acc.push({ name: cliente, value: valor });
    }
    return acc;
  }, []);

  // Ordena para pegar os Top 5 clientes e agrupar o resto
  const dadosClientesFinal = dadosClientes.sort((a, b) => b.value - a.value).slice(0, 5);
  
  // Paleta de cores suave para os clientes
  const CORES_CLIENTES = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];

  // Formatador de dinheiro para o Tooltip
  const formatMoney = (value) => `R$ ${value.toFixed(2)}`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 animate-fade-in-up delay-100">
      
      {/* GRÁFICO 1: Faturamento por Status */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Faturamento por Status</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosStatus}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{fontSize: 12}} interval={0} />
              <YAxis hide />
              <RechartsTooltip formatter={formatMoney} cursor={{fill: '#f3f4f6'}} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {dadosStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CORES_STATUS[entry.name] || '#8884d8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GRÁFICO 2: Top Clientes (Receita) */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Receita por Cliente (Top 5)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dadosClientesFinal}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {dadosClientesFinal.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CORES_CLIENTES[index % CORES_CLIENTES.length]} />
                ))}
              </Pie>
              <RechartsTooltip formatter={formatMoney} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

export default DashboardCharts;