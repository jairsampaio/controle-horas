// src/utils/gerarRelatorioPDF.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // 👈 MUDANÇA 1: Importação nomeada

const gerarRelatorioPDF = (servicos, filtros) => {
  try {
    const doc = new jsPDF();

    // 1. Título e Cabeçalho
    doc.setFontSize(18);
    doc.text('Relatório de Serviços Prestados', 14, 20);

    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);

    if (filtros && filtros.cliente) {
      doc.text(`Cliente: ${filtros.cliente}`, 14, 34);
    }

    // 2. Definição das Colunas
    const tableColumn = ["Data", "Cliente", "Solicitante", "Atividade", "Horas", "Valor", "Status"];
    
    // 3. Preparação dos Dados
    const tableRows = servicos.map(servico => {
      const horas = parseFloat(servico.qtd_horas || 0);
      const valor = parseFloat(servico.valor_total || 0);
      
      return [
        safeDate(servico.data),
        String(servico.cliente || '-'),
        String(servico.solicitante || '-'),
        String(servico.atividade || ''),
        horas.toFixed(2),
        `R$ ${valor.toFixed(2)}`,
        String(servico.status || 'Pendente')
      ];
    });

    // 4. Totais
    const totalHoras = servicos.reduce((sum, s) => sum + parseFloat(s.qtd_horas || 0), 0);
    const totalValor = servicos.reduce((sum, s) => sum + parseFloat(s.valor_total || 0), 0);

    // 5. Geração da Tabela (MUDANÇA 2: Usando a função importada diretamente)
    autoTable(doc, {
      startY: 40,
      head: [tableColumn],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 15, halign: 'right' },
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 25 }
      },
      foot: [[
        "", "", "TOTAIS:", 
        `${servicos.length} serviços`, 
        totalHoras.toFixed(2), 
        `R$ ${totalValor.toFixed(2)}`, 
        ""
      ]],
      footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    console.log("PDF Gerado com sucesso!");
    return doc.output('blob');

  } catch (error) {
    console.error("ERRO AO GERAR PDF:", error);
    return null;
  }
};

const safeDate = (dataStr) => {
  try {
    if (!dataStr) return '-';
    return new Date(dataStr + 'T00:00:00').toLocaleDateString('pt-BR');
  } catch (e) {
    return dataStr;
  }
};

export default gerarRelatorioPDF;