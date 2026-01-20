import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, Calendar, Filter, BarChart3, 
  DollarSign, TrendingUp, PieChart, Download, Clock 
} from 'lucide-react';
import supabase from '../services/supabase';
import { formatCurrency, formatHoursInt } from '../utils/formatters';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [canais, setCanais] = useState([]);
  
  // Filtros - Padrão: Início do Ano até Hoje (para pegar dados reais)
  const [periodo, setPeriodo] = useState({
    inicio: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], 
    fim: new Date().toISOString().split('T')[0]
  });
  const [canalSelecionado, setCanalSelecionado] = useState('todos');

  const [dados, setDados] = useState([]);
  const [resumo, setResumo] = useState({
    totalHorasVendidas: 0,
    totalFaturamento: 0,
    qtdDemandas: 0,
    ticketMedio: 0
  });

  // Carrega lista de canais
  useEffect(() => {
    const fetchCanais = async () => {
      const { data } = await supabase.from('canais').select('*').eq('ativo', true).order('nome');
      if (data) setCanais(data);
    };
    fetchCanais();
  }, []);

  // Busca e Processa os Dados (Lógica Blindada: Tabelas Separadas)
  const gerarRelatorio = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Busca Demandas Básicas
      const { data: demandas, error: errDemandas } = await supabase
        .from('demandas')
        .select('*') // Traz tudo para evitar erro de nome de coluna
        .gte('created_at', `${periodo.inicio}T00:00:00`)
        .lte('created_at', `${periodo.fim}T23:59:59`)
        .neq('status', 'Cancelada');

      if (errDemandas) throw errDemandas;

      if (!demandas || demandas.length === 0) {
          setDados([]);
          setResumo({ totalHorasVendidas: 0, totalFaturamento: 0, qtdDemandas: 0, ticketMedio: 0 });
          setLoading(false);
          return;
      }

      // 2. Coleta IDs
      const demandaIds = demandas.map(d => d.id);
      // Tenta pegar ID do cliente (suporta 'cliente_id' ou 'cliente')
      const clienteIds = [...new Set(demandas.map(d => d.cliente_id || d.cliente).filter(Boolean))];
      
      // 3. Busca Financeiro
      const { data: finData } = await supabase
        .from('demandas_financeiro')
        .select('demanda_id, horas_vendidas, valor_cobrado')
        .in('demanda_id', demandaIds);

      // 4. Busca Clientes
      let clientesMap = {};
      if (clienteIds.length > 0) {
          const { data: clientesData } = await supabase
            .from('clientes')
            .select('id, nome')
            .in('id', clienteIds);
          
          if (clientesData) {
              clientesData.forEach(c => { clientesMap[c.id] = c.nome; });
          }
      }

      // 5. Mapeamentos Auxiliares
      let financeiroMap = {};
      if (finData) finData.forEach(f => { financeiroMap[f.demanda_id] = f; });

      let canaisMap = {};
      canais.forEach(c => { canaisMap[c.id] = c.nome; });

      // 6. Cruzamento de Dados
      let listaProcessada = demandas.map(d => {
          const fin = financeiroMap[d.id] || {};
          
          const idClienteReal = d.cliente_id || d.cliente;
          const idCanalReal = d.canal_id || d.canal;

          const nomeCliente = clientesMap[idClienteReal] || 'Cliente n/d';
          const nomeCanal = canaisMap[idCanalReal] || 'Direto / Sem Canal';

          return {
              data: new Date(d.created_at).toLocaleDateString('pt-BR'),
              cliente: nomeCliente,
              demanda: d.titulo,
              canal: nomeCanal,
              canal_id: idCanalReal,
              horasVendidas: Number(fin.horas_vendidas || 0),
              valorVenda: Number(fin.valor_cobrado || 0),
              status: d.status
          };
      });

      // 7. Filtro de Canal (No Array Final)
      if (canalSelecionado === 'direto') {
        listaProcessada = listaProcessada.filter(d => !d.canal_id);
      } else if (canalSelecionado !== 'todos') {
        // eslint-disable-next-line
        listaProcessada = listaProcessada.filter(d => d.canal_id == canalSelecionado);
      }

      // 8. Totais
      let somaHoras = 0;
      let somaValor = 0;
      listaProcessada.forEach(item => {
          somaHoras += item.horasVendidas;
          somaValor += item.valorVenda;
      });

      setDados(listaProcessada);
      setResumo({
        totalHorasVendidas: somaHoras,
        totalFaturamento: somaValor,
        qtdDemandas: listaProcessada.length,
        ticketMedio: listaProcessada.length > 0 ? somaValor / listaProcessada.length : 0
      });

    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
    } finally {
      setLoading(false);
    }
  }, [periodo, canalSelecionado, canais]);

  // Gera ao carregar ou mudar filtros
  useEffect(() => {
    if (canais.length > 0 || !loading) {
        gerarRelatorio();
    }
    // eslint-disable-next-line
  }, [gerarRelatorio]);

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(dados.map(d => ({
        Data: d.data,
        Cliente: d.cliente,
        Demanda: d.demanda,
        Canal: d.canal,
        'Horas Vendidas': d.horasVendidas,
        'Valor Venda': d.valorVenda,
        Status: d.status
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatorio_Vendas");
    XLSX.writeFile(wb, `Relatorio_Vendas_${periodo.inicio}.xlsx`);
  };

  const exportarPDF = () => {
    const doc = new jsPDF();

    // Cabeçalho
    doc.setFillColor(79, 70, 229); 
    doc.rect(0, 0, 210, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("Relatório Gerencial de Vendas", 14, 15);

    // Filtros
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const dataIni = new Date(periodo.inicio).toLocaleDateString('pt-BR');
    const dataFim = new Date(periodo.fim).toLocaleDateString('pt-BR');
    
    let canalLabel = 'Todos os Canais';
    if (canalSelecionado === 'direto') canalLabel = 'Apenas Direto (Sem Canal)';
    // eslint-disable-next-line
    else if (canalSelecionado !== 'todos') canalLabel = canais.find(c => c.id == canalSelecionado)?.nome || 'Canal Específico';

    doc.text(`Período: ${dataIni} até ${dataFim}`, 14, 35);
    doc.text(`Filtro de Canal: ${canalLabel}`, 14, 40);
    doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 196, 35, { align: 'right' });

    // Tabela
    const tableColumn = ["Data", "Cliente", "Demanda", "Canal", "Hrs Vendidas", "Valor Venda"];
    const tableRows = dados.map(row => [
        row.data,
        row.cliente,
        row.demanda,
        row.canal,
        formatHoursInt(row.horasVendidas),
        formatCurrency(row.valorVenda)
    ]);

    autoTable(doc, {
      startY: 45,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3, textColor: [50, 50, 50] },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        1: { cellWidth: 35, fontStyle: 'bold' },
        4: { cellWidth: 25, halign: 'center', fontStyle: 'bold', textColor: [79, 70, 229] }, 
        5: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: [22, 163, 74] }   
      },
      alternateRowStyles: { fillColor: [245, 247, 255] }
    });

    // Rodapé
    let finalY = doc.lastAutoTable.finalY + 10;
    if (finalY > 260) { doc.addPage(); finalY = 20; }

    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(120, finalY, 76, 24, 2, 2, 'FD');

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Total Horas Vendidas:", 125, finalY + 8);
    doc.text("Faturamento Total:", 125, finalY + 16);

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(formatHoursInt(resumo.totalHorasVendidas), 190, finalY + 8, { align: 'right' });
    doc.text(formatCurrency(resumo.totalFaturamento), 190, finalY + 16, { align: 'right' });

    doc.save(`Relatorio_Vendas_${periodo.inicio}.pdf`);
  };

  return (
    <div className="space-y-6 animate-fade-in p-2">
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <BarChart3 className="text-indigo-600" /> Relatórios de Vendas
            </h2>
            <p className="text-gray-500 text-sm">Análise de Demandas Vendidas e Performance</p>
          </div>
          
          <div className="flex gap-2">
            <button onClick={exportarExcel} disabled={dados.length === 0} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700 transition-colors disabled:opacity-50 text-sm">
                <Download size={18} /> Excel
            </button>
            <button onClick={exportarPDF} disabled={dados.length === 0} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-red-700 transition-colors disabled:opacity-50 text-sm">
                <FileText size={18} /> PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Início</label>
            <input type="date" value={periodo.inicio} onChange={e => setPeriodo({...periodo, inicio: e.target.value})} className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Fim</label>
            <input type="date" value={periodo.fim} onChange={e => setPeriodo({...periodo, fim: e.target.value})} className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Filtrar por Canal</label>
            <select value={canalSelecionado} onChange={e => setCanalSelecionado(e.target.value)} className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-medium">
              <option value="todos">Todos os Canais (Inclui Direto)</option>
              <option value="direto">Apenas Direto / Sem Canal</option>
              {canais.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg text-white">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-indigo-200 text-xs font-bold uppercase">Total Horas Vendidas</p>
                  <h3 className="text-3xl font-black mt-1">{formatHoursInt(resumo.totalHorasVendidas)}</h3>
                </div>
                <div className="p-2 bg-indigo-500/30 rounded-lg"><Clock className="text-white" size={24}/></div>
              </div>
              <p className="text-xs text-indigo-200 mt-4 font-medium">No período selecionado</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-xs font-bold uppercase">Faturamento (Venda)</p>
                  <h3 className="text-2xl font-black text-green-600 dark:text-green-400 mt-1">{formatCurrency(resumo.totalFaturamento)}</h3>
                </div>
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg"><DollarSign className="text-green-600" size={24}/></div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-xs font-bold uppercase">Novas Demandas</p>
                  <h3 className="text-2xl font-black text-gray-800 dark:text-white mt-1">{resumo.qtdDemandas}</h3>
                </div>
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><FileText className="text-blue-600" size={24}/></div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-xs font-bold uppercase">Ticket Médio (Venda)</p>
                  <h3 className="text-2xl font-black text-gray-800 dark:text-white mt-1">{formatCurrency(resumo.ticketMedio)}</h3>
                </div>
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg"><TrendingUp className="text-purple-600" size={24}/></div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-800 dark:text-white">Detalhamento das Vendas (Demandas)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 uppercase font-bold text-xs">
                  <tr>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Demanda</th>
                    <th className="px-6 py-4">Canal</th>
                    <th className="px-6 py-4 text-center">Horas Vendidas</th>
                    <th className="px-6 py-4 text-right">Valor Venda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {dados.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  ) : (
                    dados.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-4 text-gray-500">{row.data}</td>
                        <td className="px-6 py-4 font-bold text-gray-800 dark:text-white">{row.cliente}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300 truncate max-w-[200px]" title={row.demanda}>{row.demanda}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${row.canal.includes('Direto') ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
                            {row.canal}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-indigo-600">{formatHoursInt(row.horasVendidas)}</td>
                        <td className="px-6 py-4 text-right font-bold text-green-600">{formatCurrency(row.valorVenda)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;