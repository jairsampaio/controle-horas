import React from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { formatCurrency } from '../utils/formatters'; // 👈 IMPORTANTE

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const DashboardCharts = ({ servicos }) => {
  
  // 1. Dados para o Gráfico de Barras (Faturamento por Cliente)
  const dadosPorCliente = servicos.reduce((acc, curr) => {
    const nome = curr.cliente;
    const valor = parseFloat(curr.valor_total || 0);
    acc[nome] = (acc[nome] || 0) + valor;
    return acc;
  }, {});

  // Ordena para pegar os top 5
  const topClientes = Object.entries(dadosPorCliente)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const dataBar = {
    labels: topClientes.map(([nome]) => nome),
    datasets: [
      {
        label: 'Faturamento (R$)',
        data: topClientes.map(([, valor]) => valor),
        backgroundColor: 'rgba(79, 70, 229, 0.8)', // Indigo 600
        borderRadius: 4,
      },
    ],
  };

  const optionsBar = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Top 5 Clientes (Faturamento)' },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            // 👈 AQUI A MÁGICA: Usa o formatador
            if (context.parsed.y !== null) {
              label += formatCurrency(context.parsed.y);
            }
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
            return 'R$ ' + value; // Eixo Y simplificado
          }
        }
      }
    }
  };

  // 2. Dados para o Gráfico de Rosca (Status)
  const dadosPorStatus = servicos.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {});

  const dataDoughnut = {
    labels: Object.keys(dadosPorStatus),
    datasets: [
      {
        data: Object.values(dadosPorStatus),
        backgroundColor: [
          'rgba(255, 206, 86, 0.8)', // Aprovado (Amarelo)
          'rgba(54, 162, 235, 0.8)', // NF Emitida (Azul)
          'rgba(75, 192, 192, 0.8)', // Pago (Verde)
          'rgba(153, 102, 255, 0.8)', // Roxo
          'rgba(201, 203, 207, 0.8)', // Cinza
        ],
      },
    ],
  };

  const optionsDoughnut = {
    responsive: true,
    plugins: {
      legend: { position: 'right' },
      title: { display: true, text: 'Distribuição por Status' },
    },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-lg shadow h-80 flex items-center justify-center">
        {topClientes.length > 0 ? <Bar data={dataBar} options={optionsBar} /> : <p className="text-gray-400">Sem dados suficientes</p>}
      </div>
      <div className="bg-white p-6 rounded-lg shadow h-80 flex items-center justify-center">
        {Object.keys(dadosPorStatus).length > 0 ? <Doughnut data={dataDoughnut} options={optionsDoughnut} /> : <p className="text-gray-400">Sem dados suficientes</p>}
      </div>
    </div>
  );
};

export default DashboardCharts;