import React from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { formatCurrency } from '../utils/formatters';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const DashboardCharts = ({ servicos }) => {
  
  // --- 1. GRÁFICO PRINCIPAL (ESQUERDA): FATURAMENTO POR STATUS (BARRAS) ---
  
  // Define a ordem lógica do processo
  const statusOrdem = ['Pendente', 'Em aprovação', 'Aprovado', 'NF Emitida', 'Pago'];
  
  // Cores fixas iguais às dos cards/badges
  const statusCores = {
    'Pendente': 'rgba(156, 163, 175, 0.8)', // Cinza
    'Em aprovação': 'rgba(249, 115, 22, 0.8)', // Laranja
    'Aprovado': 'rgba(234, 179, 8, 0.8)',   // Amarelo
    'NF Emitida': 'rgba(59, 130, 246, 0.8)', // Azul
    'Pago': 'rgba(34, 197, 94, 0.8)'       // Verde
  };

  // Calcula o valor total (R$) para cada status
  const dadosStatus = statusOrdem.map(status => {
    return servicos
      .filter(s => s.status === status)
      .reduce((acc, curr) => acc + parseFloat(curr.valor_total || 0), 0);
  });

  const dataStatus = {
    labels: statusOrdem,
    datasets: [
      {
        label: 'Valor Total (R$)',
        data: dadosStatus,
        backgroundColor: statusOrdem.map(s => statusCores[s]),
        borderRadius: 4,
        barPercentage: 0.6, // Barras um pouco mais grossas
      },
    ],
  };

  const optionsStatus = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { 
        display: true, 
        text: 'Faturamento por Status (R$)',
        font: { size: 16 }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) label += formatCurrency(context.parsed.y);
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
             // Simplifica o eixo Y (ex: 1k, 2k) para não poluir
             if (value >= 1000) return 'R$ ' + value/1000 + 'k';
             return 'R$ ' + value;
          }
        }
      }
    }
  };

  // --- 2. GRÁFICO SECUNDÁRIO (DIREITA): TOP CLIENTES (ROSCA) ---
  
  const dadosPorCliente = servicos.reduce((acc, curr) => {
    const nome = curr.cliente;
    const valor = parseFloat(curr.valor_total || 0);
    acc[nome] = (acc[nome] || 0) + valor;
    return acc;
  }, {});

  // Pega Top 5
  const topClientes = Object.entries(dadosPorCliente)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const dataClientes = {
    labels: topClientes.map(([nome]) => nome),
    datasets: [
      {
        data: topClientes.map(([, valor]) => valor),
        backgroundColor: [
          'rgba(79, 70, 229, 0.8)',  // Indigo
          'rgba(168, 85, 247, 0.8)', // Roxo
          'rgba(236, 72, 153, 0.8)', // Rosa
          'rgba(14, 165, 233, 0.8)', // Sky Blue
          'rgba(20, 184, 166, 0.8)', // Teal
        ],
        borderWidth: 1,
      },
    ],
  };

  const optionsClientes = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' },
      title: { display: true, text: 'Top 5 Clientes' },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.label || '';
            if (label) label += ': ';
            // Pega o valor bruto do array de dados
            const valor = context.parsed; 
            if (valor !== null) label += formatCurrency(valor);
            return label;
          }
        }
      }
    },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* GRÁFICO ESQUERDA (MAIOR - ocupa 2 colunas no PC) */}
      <div className="bg-white p-6 rounded-lg shadow h-80 md:col-span-2">
        <Bar data={dataStatus} options={optionsStatus} />
      </div>

      {/* GRÁFICO DIREITA (MENOR - ocupa 1 coluna no PC) */}
      <div className="bg-white p-6 rounded-lg shadow h-80 flex items-center justify-center">
        {topClientes.length > 0 ? (
          <div className="w-full h-full">
            <Doughnut data={dataClientes} options={optionsClientes} />
          </div>
        ) : (
          <p className="text-gray-400">Sem dados de clientes</p>
        )}
      </div>
    </div>
  );
};

export default DashboardCharts;