import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const gerarRelatorioPDF = (servicos, filtros, nomeConsultor) => {
  const doc = new jsPDF();

  // --- 1. CABEÇALHO PREMIUM ---
  // Barra Superior Colorida (Indigo)
  doc.setFillColor(79, 70, 229); // Cor Indigo-600
  doc.rect(0, 0, 210, 24, 'F'); // Retângulo preenchido no topo

  // Título Principal (Branco)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text("Relatório de Serviços Prestados", 14, 15);

  // --- 2. INFORMAÇÕES DO RELATÓRIO ---
  doc.setTextColor(40, 40, 40); // Cinza escuro
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  
  // Nome do Consultor (Em destaque, como pedido)
  // Se o nome vier vazio, usa um fallback, mas a ideia é mostrar "Jair Sampaio"
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
    doc.text(`Cliente(s): ${filtros.cliente.join(', ')}`, 14, 48);
  }

  // Data de Emissão (Canto direito)
  doc.setFontSize(9);
  doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 196, 42, { align: 'right' });

  // --- 3. TABELA DE SERVIÇOS ---
  const tableColumn = [
    "Data", 
    "Cliente", 
    "OS/OP/DPC",  // <--- CAMPO NOVO ADICIONADO AQUI
    "Atividade", 
    "Solicitante",
    "Horas", 
    "Valor", 
    "Status"
  ];

  const tableRows = [];
  let totalHoras = 0;
  let totalValor = 0;

  // Ordenar por data (mais recente primeiro) se não estiver ordenado
  const servicosOrdenados = [...servicos].sort((a, b) => new Date(b.data) - new Date(a.data));

  servicosOrdenados.forEach(servico => {
    const horas = parseFloat(servico.qtd_horas || 0);
    const valor = parseFloat(servico.valor_total || 0);
    
    totalHoras += horas;
    totalValor += valor;

    const rowData = [
      new Date(servico.data + 'T00:00:00').toLocaleDateString('pt-BR'), // Data corrigida fuso
      servico.cliente,
      servico.os_op_dpc || '-', // <--- VALOR DO CAMPO NOVO
      servico.atividade,
      servico.solicitante || '-',
      horas.toFixed(2), // Formato 1.50
      formatCurrency(valor),
      servico.status
    ];
    tableRows.push(rowData);
  });

  autoTable(doc, {
    startY: 55,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 3,
      font: 'helvetica',
      textColor: [50, 50, 50]
    },
    headStyles: {
      fillColor: [79, 70, 229], // Indigo combinando com cabeçalho
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' }, // Data
      1: { cellWidth: 25, fontStyle: 'bold' }, // Cliente
      2: { cellWidth: 20, halign: 'center', fontStyle: 'bold', textColor: [70, 70, 70] }, // OS/OP/DPC (Destaque leve)
      3: { cellWidth: 'auto' }, // Atividade (Fica com o espaço restante)
      4: { cellWidth: 25 }, // Solicitante
      5: { cellWidth: 15, halign: 'center' }, // Horas
      6: { cellWidth: 25, halign: 'right' }, // Valor
      7: { cellWidth: 22, halign: 'center' } // Status
    },
    alternateRowStyles: {
      fillColor: [245, 247, 255] // Zebra suave azulada
    },
    didParseCell: function(data) {
        // Cores condicionais para o Status
        if (data.section === 'body' && data.column.index === 7) {
            const status = data.cell.raw;
            if (status === 'Pago') data.cell.styles.textColor = [22, 163, 74]; // Verde
            if (status === 'Pendente') data.cell.styles.textColor = [234, 88, 12]; // Laranja
        }
    }
  });

  // --- 4. RODAPÉ DE TOTAIS ---
  const finalY = doc.lastAutoTable.finalY + 10;

  // Caixa de Totais
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(130, finalY, 66, 22, 2, 2, 'FD'); // X, Y, W, H

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Total de Horas:", 135, finalY + 8);
  doc.text("Valor Total:", 135, finalY + 16);

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(`${totalHoras.toFixed(2)}h`, 190, finalY + 8, { align: 'right' });
  doc.text(`${formatCurrency(totalValor)}`, 190, finalY + 16, { align: 'right' });

  // Rodapé da Página
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
    doc.text("Gerado pelo Sistema de Consultoria", 105, 294, { align: 'center' });
  }

  return doc.output('blob');
};

export default gerarRelatorioPDF;