// src/utils/gerarRelatorioPDF.js
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const gerarRelatorioPDF = (servicos, filtros) => {
  const doc = new jsPDF();

  // 1. Título e Cabeçalho do Relatório
  doc.setFontSize(18);
  doc.text('Relatório de Serviços Prestados', 14, 20);

  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);

  if (filtros.cliente) {
    doc.text(`Cliente: ${filtros.cliente}`, 14, 34);
  }

  // 2. Definição das Colunas e Dados
  const tableColumn = ["Data", "Cliente", "Solicitante", "Atividade", "Horas", "Valor", "Status"];
  
  const tableRows = [];

  servicos.forEach(servico => {
    const servicoData = [
      new Date(servico.data + 'T00:00:00').toLocaleDateString('pt-BR'),
      servico.cliente,
      servico.solicitante || '-', // 👈 AQUI: Adicionamos o Solicitante na linha (se vazio, põe traço)
      servico.atividade,
      parseFloat(servico.qtd_horas).toFixed(2),
      `R$ ${parseFloat(servico.valor_total).toFixed(2)}`,
      servico.status
    ];
    tableRows.push(servicoData);
  });

  // 3. Totais
  const totalHoras = servicos.reduce((sum, s) => sum + parseFloat(s.qtd_horas), 0);
  const totalValor = servicos.reduce((sum, s) => sum + parseFloat(s.valor_total), 0);

  // 4. Geração da Tabela com Estilização
  doc.autoTable({
    startY: 40,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] }, // Cor Indigo (combinando com o app)
    styles: { fontSize: 8, cellPadding: 2 },
    
    // 👇 AQUI: Ajuste das larguras para caber o Solicitante
    columnStyles: {
      0: { cellWidth: 20 }, // Data
      1: { cellWidth: 25 }, // Cliente
      2: { cellWidth: 25 }, // Solicitante (NOVO)
      3: { cellWidth: 'auto' }, // Atividade (ocupa o resto)
      4: { cellWidth: 15, halign: 'right' }, // Horas
      5: { cellWidth: 25, halign: 'right' }, // Valor
      6: { cellWidth: 25 }  // Status
    },
    
    // Adiciona a linha de totais no final
    foot: [[
      "", "", "TOTAIS:", // Pula 2 colunas, escreve "TOTAIS" na coluna Solicitante
      `${servicos.length} serviços`, 
      totalHoras.toFixed(2), 
      `R$ ${totalValor.toFixed(2)}`, 
      ""
    ]],
    footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' }
  });

  return doc.output('blob');
};

export default gerarRelatorioPDF;