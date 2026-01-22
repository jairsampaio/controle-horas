import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper simples para moeda
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const gerarRelatorioPDF = (servicos, filtros, nomeConsultor) => {
  // 'l' = landscape (paisagem), 'mm' = milímetros, 'a4' = formato
  const doc = new jsPDF('l', 'mm', 'a4');

  // --- 1. CABEÇALHO PREMIUM ---
  // Barra Superior Colorida (Indigo)
  doc.setFillColor(79, 70, 229); // Cor Indigo-600
  doc.rect(0, 0, 297, 24, 'F'); // 297mm é a largura do A4 Paisagem

  // Título Principal (Branco)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text("Relatório de Serviços Prestados", 14, 15);

  // --- 2. INFORMAÇÕES DO RELATÓRIO ---
  doc.setTextColor(40, 40, 40); // Cinza escuro
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  
  // Nome do Consultor (Em destaque)
  const nomeExibicao = nomeConsultor ? nomeConsultor.toUpperCase() : "CONSULTOR";
  doc.text(`PROFISSIONAL: ${nomeExibicao}`, 14, 35);

  // Período e Filtros
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);

  const dataInicial = filtros.dataInicio ? new Date(filtros.dataInicio).toLocaleDateString('pt-BR') : 'Início';
  const dataFinal = filtros.dataFim ? new Date(filtros.dataFim).toLocaleDateString('pt-BR') : 'Hoje';
  
  doc.text(`Período: ${dataInicial} até ${dataFinal}`, 14, 42);
  
  if (filtros.cliente && filtros.cliente.length > 0) {
    const clientesTexto = filtros.cliente.join(', ');
    // Truncar texto se for muito longo
    const textoFinal = clientesTexto.length > 90 ? clientesTexto.substring(0, 90) + '...' : clientesTexto;
    doc.text(`Cliente(s): ${textoFinal}`, 14, 48);
  }

  // Data de Emissão (Canto direito - ajustado para Paisagem 280mm)
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255); // <--- ADICIONE ISSO AQUI (BRANCO)
  doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 283, 15, { align: 'right', baseline: 'middle' });
  doc.setTextColor(255, 255, 255); // Volta pra branco só pra garantir se for escrever no header

  // --- 3. TABELA DE SERVIÇOS ---
  const tableColumn = [
    "Data", 
    "Cliente", 
    "OS/OP/DPC",  
    "Atividade", 
    "Solicitante",
    "Horas", 
    "Valor", 
    "Status"
  ];

  const tableRows = [];
  let totalHoras = 0;
  let totalValor = 0;

  // Ordenar por data (mais recente primeiro)
  const servicosOrdenados = [...servicos].sort((a, b) => new Date(b.data) - new Date(a.data));

  servicosOrdenados.forEach(servico => {
    const horas = typeof servico.qtd_horas === 'string' ? parseFloat(servico.qtd_horas) : (servico.qtd_horas || 0);
    const valor = typeof servico.valor_total === 'string' ? parseFloat(servico.valor_total) : (servico.valor_total || 0);
    
    totalHoras += horas;
    totalValor += valor;

    // Ajuste de fuso horário simples
    const dataFormatada = servico.data ? servico.data.split('T')[0].split('-').reverse().join('/') : '-';

    const rowData = [
      dataFormatada, 
      servico.cliente || '-',
      servico.os_op_dpc || '-', 
      servico.atividade || '',
      servico.solicitante || '-',
      horas.toFixed(2), 
      formatCurrency(valor),
      servico.status || 'Pendente'
    ];
    tableRows.push(rowData);
  });

  autoTable(doc, {
    startY: 55,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 9, // Aumentei um pouco pois paisagem cabe mais
      cellPadding: 3,
      font: 'helvetica',
      textColor: [50, 50, 50],
      valign: 'middle',
      lineColor: [200, 200, 200],
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [79, 70, 229], // Indigo
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' }, // Data
      1: { cellWidth: 35, fontStyle: 'bold' }, // Cliente
      2: { cellWidth: 25, halign: 'center', fontStyle: 'bold', textColor: [70, 70, 70] }, // OS
      3: { cellWidth: 'auto' }, // Atividade (Automático para preencher espaço)
      4: { cellWidth: 30 }, // Solicitante
      5: { cellWidth: 18, halign: 'center' }, // Horas
      6: { cellWidth: 28, halign: 'right' }, // Valor
      7: { cellWidth: 25, halign: 'center', fontStyle: 'bold' } // Status
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // Cinza muito suave
    },
    didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 7) {
            const status = data.cell.raw;
            if (status === 'Pago' || status === 'NF Emitida') data.cell.styles.textColor = [22, 163, 74]; // Verde
            else if (status === 'Pendente') data.cell.styles.textColor = [234, 88, 12]; // Laranja
            else if (status === 'Aprovado') data.cell.styles.textColor = [37, 99, 235]; // Azul
            else data.cell.styles.textColor = [100, 100, 100];
        }
    }
  });

  // --- 4. RODAPÉ DE TOTAIS ---
  let finalY = doc.lastAutoTable.finalY + 10;
  
  // Se estiver muito no final da página (A4 paisagem tem ~210mm de altura), quebra
  if (finalY > 180) {
      doc.addPage();
      finalY = 20;
  }

  // Caixa de Totais (Posicionada à direita na paisagem: X ~215)
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(215, finalY, 70, 24, 2, 2, 'FD'); 

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Total de Horas:", 220, finalY + 8);
  doc.text("Valor Total:", 220, finalY + 16);

  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(`${totalHoras.toFixed(2)}h`, 280, finalY + 8, { align: 'right' });
  doc.text(`${formatCurrency(totalValor)}`, 280, finalY + 16, { align: 'right' });

  // Rodapé da Página (Paginação Centralizada em 297mm/2)
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const footerText = `Página ${i} de ${pageCount} | ConsultFlow Sistema de Gestão`;
    doc.text(footerText, 148, 200, { align: 'center' }); // 148 é o meio da folha paisagem
  }

  return doc.output('blob');
};

export default gerarRelatorioPDF;