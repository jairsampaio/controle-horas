import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, BarChart3, 
  DollarSign, TrendingUp, Download, Clock, Wallet, AlertCircle
} from 'lucide-react';
import supabase from '../services/supabase';
import { formatCurrency, formatHoursInt } from '../utils/formatters';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [canais, setCanais] = useState([]);
  const [clientes, setClientes] = useState([]);
  
  // Filtros - Padrão: Início do Ano até Hoje
  const [periodo, setPeriodo] = useState({
    inicio: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], 
    fim: new Date().toISOString().split('T')[0]
  });
  const [canalSelecionado, setCanalSelecionado] = useState('todos');
  const [clienteSelecionado, setClienteSelecionado] = useState('todos');

  const [dados, setDados] = useState([]);
  const [resumo, setResumo] = useState({
    totalVenda: 0,
    totalCusto: 0,
    lucro: 0,
    margem: 0,
    horasVendidas: 0,
    horasCusto: 0
  });

  // Carrega Listas Auxiliares
  useEffect(() => {
    const fetchAuxiliar = async () => {
      // Busca Canais
      const { data: dataCanais } = await supabase.from('canais').select('*').eq('ativo', true).order('nome');
      if (dataCanais) setCanais(dataCanais);

      // Busca Clientes
      const { data: dataClientes } = await supabase.from('clientes').select('id, nome').eq('ativo', true).order('nome');
      if (dataClientes) setClientes(dataClientes);
    };
    fetchAuxiliar();
  }, []);

  const gerarRelatorio = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Busca Demandas Básicas
      const { data: demandas, error: errDemandas } = await supabase
        .from('demandas')
        .select('*') 
        .gte('created_at', `${periodo.inicio}T00:00:00`)
        .lte('created_at', `${periodo.fim}T23:59:59`)
        .neq('status', 'Cancelada');

      if (errDemandas) throw errDemandas;

      if (!demandas || demandas.length === 0) {
          setDados([]);
          setResumo({ totalVenda: 0, totalCusto: 0, lucro: 0, margem: 0, horasVendidas: 0, horasCusto: 0 });
          setLoading(false);
          return;
      }

      // 2. Coleta IDs
      const demandaIds = demandas.map(d => d.id);
      const clienteIds = [...new Set(demandas.map(d => d.cliente_id || d.cliente).filter(Boolean))];
      
      // 3. Busca Financeiro
      const { data: finData } = await supabase
        .from('demandas_financeiro')
        .select('demanda_id, horas_vendidas, valor_cobrado, valor_interno_hora')
        .in('demanda_id', demandaIds);

      // 4. Busca Clientes (Nomes)
      let clientesMap = {};
      if (clienteIds.length > 0) {
          const { data: clientesData } = await supabase.from('clientes').select('id, nome').in('id', clienteIds);
          if (clientesData) clientesData.forEach(c => { clientesMap[c.id] = c.nome; });
      }

      // 5. Mapeamentos
      let financeiroMap = {};
      if (finData) finData.forEach(f => { financeiroMap[f.demanda_id] = f; });

      let canaisMap = {};
      canais.forEach(c => { canaisMap[c.id] = c.nome; });

      // 6. Cruzamento e Cálculos
      let listaProcessada = demandas.map(d => {
          const fin = financeiroMap[d.id] || {};
          
          const idClienteReal = d.cliente_id || d.cliente;
          const idCanalReal = d.canal_id || d.canal;

          const nomeCliente = clientesMap[idClienteReal] || 'Cliente n/d';
          const nomeCanal = canaisMap[idCanalReal] || 'Direto / Sem Canal';

          const vlrVenda = Number(fin.valor_cobrado || 0);
          const hrsVendidas = Number(fin.horas_vendidas || 0);
          
          const hrsCusto = Number(d.estimativa || 0); 
          const vlrHoraCusto = Number(fin.valor_interno_hora || 0);
          const custoTotal = hrsCusto * vlrHoraCusto;

          const lucroItem = vlrVenda - custoTotal;

          return {
              data: new Date(d.created_at).toLocaleDateString('pt-BR'),
              cliente: nomeCliente,
              cliente_id: idClienteReal, 
              demanda: d.titulo,
              canal: nomeCanal,
              canal_id: idCanalReal,
              
              horasVendidas: hrsVendidas,
              horasCusto: hrsCusto,
              
              valorVenda: vlrVenda,
              custoTotal: custoTotal,
              lucro: lucroItem,
              
              status: d.status
          };
      });

      // 7. Filtros (Canal E Cliente) - CORREÇÃO DE LINT AQUI (String vs String)
      
      // Filtro Canal
      if (canalSelecionado === 'direto') {
        listaProcessada = listaProcessada.filter(d => !d.canal_id);
      } else if (canalSelecionado !== 'todos') {
        // Converte ambos para String para usar ===
        listaProcessada = listaProcessada.filter(d => String(d.canal_id) === String(canalSelecionado));
      }

      // Filtro Cliente
      if (clienteSelecionado !== 'todos') {
        // Converte ambos para String para usar ===
        listaProcessada = listaProcessada.filter(d => String(d.cliente_id) === String(clienteSelecionado));
      }

      // 8. Totais Gerais
      let totalVenda = 0;
      let totalCusto = 0;
      let totalHorasVenda = 0;
      let totalHorasCusto = 0;

      listaProcessada.forEach(item => {
          totalVenda += item.valorVenda;
          totalCusto += item.custoTotal;
          totalHorasVenda += item.horasVendidas;
          totalHorasCusto += item.horasCusto;
      });

      const lucroTotal = totalVenda - totalCusto;
      const margemTotal = totalVenda > 0 ? (lucroTotal / totalVenda) * 100 : 0;

      setDados(listaProcessada);
      setResumo({
        totalVenda,
        totalCusto,
        lucro: lucroTotal,
        margem: margemTotal,
        horasVendidas: totalHorasVenda,
        horasCusto: totalHorasCusto
      });

    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
    } finally {
      setLoading(false);
    }
  }, [periodo, canalSelecionado, clienteSelecionado, canais]);

  useEffect(() => {
    // Garante que só roda se tiver listas carregadas ou se não estiver carregando
    if ((canais.length > 0 && clientes.length > 0) || !loading) {
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
        'Hrs Vendidas': d.horasVendidas,
        'Hrs Custo': d.horasCusto,
        'Valor Venda': d.valorVenda,
        'Custo Total': d.custoTotal,
        'Lucro': d.lucro
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resultado_Financeiro");
    XLSX.writeFile(wb, `Resultado_Financeiro_${periodo.inicio}.xlsx`);
  };

  const exportarPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');

    // Cabeçalho
    doc.setFillColor(79, 70, 229); 
    doc.rect(0, 0, 297, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("Relatório de Performance Financeira", 14, 15);

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const dataIni = new Date(periodo.inicio).toLocaleDateString('pt-BR');
    const dataFim = new Date(periodo.fim).toLocaleDateString('pt-BR');
    
    // Texto dos Filtros no PDF - CORREÇÃO DE LINT AQUI
    let filtrosTexto = `Período: ${dataIni} até ${dataFim}`;
    
    if (canalSelecionado !== 'todos') {
        const canalEnc = canais.find(c => String(c.id) === String(canalSelecionado));
        filtrosTexto += ` | Canal: ${canalEnc?.nome || 'Direto'}`;
    }
    
    if (clienteSelecionado !== 'todos') {
        const cliEnc = clientes.find(c => String(c.id) === String(clienteSelecionado));
        filtrosTexto += ` | Cliente: ${cliEnc?.nome}`;
    }

    doc.text(filtrosTexto, 14, 35);
    doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 280, 35, { align: 'right' });

    const tableColumn = ["Data", "Cliente", "Demanda", "Canal", "Hrs Venda", "Hrs Custo", "Venda (R$)", "Custo (R$)", "Lucro (R$)"];
    const tableRows = dados.map(row => [
        row.data,
        row.cliente,
        row.demanda,
        row.canal,
        formatHoursInt(row.horasVendidas),
        formatHoursInt(row.horasCusto),
        formatCurrency(row.valorVenda),
        formatCurrency(row.custoTotal),
        formatCurrency(row.lucro)
    ]);

    autoTable(doc, {
      startY: 45,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, textColor: [50, 50, 50] },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        6: { halign: 'right', textColor: [22, 163, 74], fontStyle: 'bold' }, // Venda Verde
        7: { halign: 'right', textColor: [220, 38, 38] }, // Custo Vermelho
        8: { halign: 'right', fontStyle: 'bold' } // Lucro
      },
      alternateRowStyles: { fillColor: [245, 247, 255] }
    });

    let finalY = doc.lastAutoTable.finalY + 10;
    if (finalY > 180) { doc.addPage(); finalY = 20; }

    doc.setFontSize(10); doc.setTextColor(100, 100, 100);
    doc.text(`Total Faturamento: ${formatCurrency(resumo.totalVenda)}`, 280, finalY, { align: 'right' });
    doc.text(`Custo Consultores: ${formatCurrency(resumo.totalCusto)}`, 280, finalY + 6, { align: 'right' });
    doc.setFontSize(12); doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'bold');
    doc.text(`Lucro Líquido: ${formatCurrency(resumo.lucro)} (${resumo.margem.toFixed(1)}%)`, 280, finalY + 14, { align: 'right' });

    doc.save(`Performance_Financeira.pdf`);
  };

  return (
    <div className="space-y-6 animate-fade-in p-2">
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <BarChart3 className="text-indigo-600" /> Relatórios Financeiros
            </h2>
            <p className="text-gray-500 text-sm">Confronto: Vendas vs Custo de Consultores</p>
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

        {/* --- ÁREA DE FILTROS --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Início</label>
            <input type="date" value={periodo.inicio} onChange={e => setPeriodo({...periodo, inicio: e.target.value})} className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Fim</label>
            <input type="date" value={periodo.fim} onChange={e => setPeriodo({...periodo, fim: e.target.value})} className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Filtrar Canal</label>
            <select value={canalSelecionado} onChange={e => setCanalSelecionado(e.target.value)} className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-medium">
              <option value="todos">Todos os Canais</option>
              <option value="direto">Apenas Direto</option>
              {canais.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Filtrar Cliente</label>
            <select value={clienteSelecionado} onChange={e => setClienteSelecionado(e.target.value)} className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-medium">
              <option value="todos">Todos os Clientes</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div></div>
      ) : (
        <>
          {/* --- CARDS DE DRE (DEMONSTRATIVO DE RESULTADO) --- */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* 1. FATURAMENTO (VENDA) */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <DollarSign size={40} className="text-green-600" />
              </div>
              <p className="text-gray-400 text-xs font-bold uppercase mb-1">Faturamento (Venda)</p>
              <h3 className="text-2xl font-black text-green-600 dark:text-green-400">
                {formatCurrency(resumo.totalVenda)}
              </h3>
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <Clock size={12}/> {formatHoursInt(resumo.horasVendidas)}h vendidas
              </p>
            </div>

            {/* 2. CUSTO CONSULTOR */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Wallet size={40} className="text-red-600" />
              </div>
              <p className="text-gray-400 text-xs font-bold uppercase mb-1">Custos (Consultores)</p>
              <h3 className="text-2xl font-black text-red-500 dark:text-red-400">
                {formatCurrency(resumo.totalCusto)}
              </h3>
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <Clock size={12}/> {formatHoursInt(resumo.horasCusto)}h de repasse
              </p>
            </div>

            {/* 3. LUCRO LÍQUIDO (DESTAQUE) */}
            <div className="bg-indigo-600 p-5 rounded-2xl shadow-lg text-white relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-indigo-200 text-xs font-bold uppercase mb-1">Lucro Líquido</p>
                  <h3 className="text-3xl font-black">{formatCurrency(resumo.lucro)}</h3>
                </div>
                <TrendingUp className="text-indigo-200" size={28}/>
              </div>
              <div className="mt-4 inline-flex items-center px-2 py-1 rounded bg-white/20 text-xs font-bold">
                Margem: {resumo.margem.toFixed(1)}%
              </div>
            </div>

            {/* 4. BALANÇO DE HORAS */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-center">
               <div className="flex justify-between text-xs mb-2">
                  <span className="text-gray-500 font-bold">HORAS VENDIDAS</span>
                  <span className="text-indigo-600 font-bold">{formatHoursInt(resumo.horasVendidas)}</span>
               </div>
               <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full mb-4 overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: '100%' }}></div>
               </div>

               <div className="flex justify-between text-xs mb-2">
                  <span className="text-gray-500 font-bold">HORAS CUSTO</span>
                  <span className="text-red-500 font-bold">{formatHoursInt(resumo.horasCusto)}</span>
               </div>
               <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-red-400 h-full rounded-full" style={{ width: `${resumo.horasVendidas > 0 ? (resumo.horasCusto / resumo.horasVendidas) * 100 : 0}%` }}></div>
               </div>
            </div>

          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 dark:text-white">Detalhamento Financeiro (DRE por Demanda)</h3>
              <span className="text-xs text-gray-400 flex items-center gap-1"><AlertCircle size={12}/> Venda - Custo = Lucro</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 uppercase font-bold text-xs">
                  <tr>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Demanda</th>
                    <th className="px-6 py-4">Canal</th>
                    <th className="px-6 py-4 text-center">Hrs Venda</th>
                    <th className="px-6 py-4 text-center">Hrs Custo</th>
                    <th className="px-6 py-4 text-right">Venda (R$)</th>
                    <th className="px-6 py-4 text-right">Custo (R$)</th>
                    <th className="px-6 py-4 text-right">Lucro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {dados.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-8 text-center text-gray-400">
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  ) : (
                    dados.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-4 text-gray-500 text-xs">{row.data}</td>
                        <td className="px-6 py-4 font-bold text-gray-800 dark:text-white">{row.cliente}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300 truncate max-w-[150px]" title={row.demanda}>{row.demanda}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${row.canal.includes('Direto') ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
                            {row.canal}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 text-center font-bold text-indigo-600">{formatHoursInt(row.horasVendidas)}</td>
                        <td className="px-6 py-4 text-center text-gray-500">{formatHoursInt(row.horasCusto)}</td>
                        
                        <td className="px-6 py-4 text-right font-bold text-green-600">{formatCurrency(row.valorVenda)}</td>
                        <td className="px-6 py-4 text-right text-red-500 text-xs">{formatCurrency(row.custoTotal)}</td>
                        <td className={`px-6 py-4 text-right font-black ${row.lucro >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                            {formatCurrency(row.lucro)}
                        </td>
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