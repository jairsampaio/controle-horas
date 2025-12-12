// src/utils/gerarRelatorioPDF.js
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const gerarRelatorioPDF = (servicos, filtros) => {
  try {
    console.log("Iniciando geração de PDF...");
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
    // Nota: O autotable espera um Array de Arrays para o cabeçalho
    const tableColumn = ["Data", "Cliente", "Solicitante", "Atividade", "Horas", "Valor", "Status"];
    
    // 3. Preparação dos Dados (Com proteção contra nulos)
    const tableRows = servicos.map(servico => {
      // Garante que os valores numéricos sejam tratados com segurança
      const horas = parseFloat(servico.qtd_horas || 0);
      const valor = parseFloat(servico.valor_total || 0);
      
      return [
        // Data: tenta formatar, se falhar usa a string original
        safeDate(servico.data),
        // Cliente
        String(servico.cliente || '-'),
        // Solicitante (Aqui estava o possível erro se fosse undefined)
        String(servico.solicitante || '-'),
        // Atividade
        String(servico.atividade || ''),
        // Horas
        horas.toFixed(2),
        // Valor
        `R$ ${valor.toFixed(2)}`,
        // Status
        String(servico.status || 'Pendente')
      ];
    });

    // 4. Totais
    const totalHoras = servicos.reduce((sum, s) => sum + parseFloat(s.qtd_horas || 0), 0);
    const totalValor = servicos.reduce((sum, s) => sum + parseFloat(s.valor_total || 0), 0);

    console.log("Dados processados. Gerando tabela...");

    // 5. Geração da Tabela
    doc.autoTable({
      startY: 40,
      head: [tableColumn], // Array de Arrays
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 8, cellPadding: 2 },
      
      // Definição das larguras
      columnStyles: {
        0: { cellWidth: 20 }, // Data
        1: { cellWidth: 25 }, // Cliente
        2: { cellWidth: 25 }, // Solicitante
        3: { cellWidth: 'auto' }, // Atividade
        4: { cellWidth: 15, halign: 'right' }, // Horas
        5: { cellWidth: 25, halign: 'right' }, // Valor
        6: { cellWidth: 25 }  // Status
      },
      
      // Rodapé com totais
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
    alert("Erro ao gerar o PDF. Verifique o console (F12) para detalhes.");
    return null;
  }
};

// Função auxiliar para data segura
const safeDate = (dataStr) => {
  try {
    if (!dataStr) return '-';
    return new Date(dataStr + 'T00:00:00').toLocaleDateString('pt-BR');
  } catch (e) {
    return dataStr;
  }
};

export default gerarRelatorioPDF;