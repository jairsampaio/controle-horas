// src/utils/gerarRelatorioPDF.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const gerarRelatorioPDF = (servicos, filtros, nomeConsultor = '') => {
  try {
    const doc = new jsPDF();

    // 1. Título e Cabeçalho Personalizado
    doc.setFontSize(18);
    // Usa o nome passado ou um texto padrão se estiver vazio
    const titulo = nomeConsultor 
      ? `Relatório de Serviços Prestados - ${nomeConsultor}`
      : 'Relatório de Serviços Prestados';
      
    doc.text(titulo, 14, 20);

    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);

    if (filtros && filtros.cliente) {
      doc.text(`Filtro por Cliente: ${filtros.cliente}`, 14, 34);
    }

    // 2. Definição das Colunas (Com a nova coluna CANAL)
    const tableColumn = ["Data", "Canal", "Cliente", "Solicitante", "Atividade", "Horas", "Valor", "Status"];
    
    // 3. Preparação dos Dados
    const tableRows = servicos.map(servico => {
      const horas = parseFloat(servico.qtd_horas || 0);
      const valor = parseFloat(servico.valor_total || 0);
      
      // Tenta pegar o nome do canal. 
      // OBS: O Supabase precisa retornar a relação (canais:nome) ou você ter tratado isso antes.
      // Se vier apenas o ID, mostraremos "Direto/ID" provisoriamente ou tratamos no frontend.
      // Assumindo que o objeto serviço já venha com o nome ou que vamos tratar 'canal_id'
      
      // Lógica de exibição do Canal:
      // Se o objeto 'canais' existir (join) usa o nome, senão verifica se tem ID, senão põe "Direto"
      let nomeCanal = '-';
      if (servico.canais && servico.canais.nome) {
          nomeCanal = servico.canais.nome;
      } else if (servico.canal_nome) { // Caso tenhamos achatado o dado antes
          nomeCanal = servico.canal_nome;
      } else {
          nomeCanal = servico.canal_id ? 'Parceiro' : 'Direto';
      }

      return [
        safeDate(servico.data),
        String(nomeCanal), // 👈 Nova Coluna
        String(servico.cliente || '-'),
        String(servico.solicitante || '-'),
        String(servico.atividade || ''),
        formatHours(horas), // Usando formatação visual
        formatCurrency(valor), // Usando formatação visual
        String(servico.status || 'Pendente')
      ];
    });

    // 4. Totais
    const totalHoras = servicos.reduce((sum, s) => sum + parseFloat(s.qtd_horas || 0), 0);
    const totalValor = servicos.reduce((sum, s) => sum + parseFloat(s.valor_total || 0), 0);

    // 5. Geração da Tabela
    autoTable(doc, {
      startY: 40,
      head: [tableColumn],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }, // Cor Indigo do seu tema
      styles: { fontSize: 7, cellPadding: 2, valign: 'middle' }, // Fonte um pouco menor para caber tudo
      columnStyles: {
        0: { cellWidth: 18 }, // Data
        1: { cellWidth: 22 }, // Canal (Novo)
        2: { cellWidth: 22 }, // Cliente
        3: { cellWidth: 22 }, // Solicitante
        4: { cellWidth: 'auto' }, // Atividade (Ocupa o resto)
        5: { cellWidth: 12, halign: 'right' }, // Horas
        6: { cellWidth: 22, halign: 'right' }, // Valor
        7: { cellWidth: 20 }  // Status
      },
      foot: [[
        "", "", "", "TOTAIS:", 
        `${servicos.length} serviços`, 
        formatHours(totalHoras), 
        formatCurrency(totalValor), 
        ""
      ]],
      footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    // return doc.output('blob'); // Retorna o blob para download/envio
    return doc.output('blob');

  } catch (error) {
    console.error("ERRO AO GERAR PDF:", error);
    return null;
  }
};

// Funções auxiliares de formatação internas para não depender de importação externa se falhar
const safeDate = (dataStr) => {
  try {
    if (!dataStr) return '-';
    return new Date(dataStr + 'T00:00:00').toLocaleDateString('pt-BR');
  } catch (e) {
    return dataStr;
  }
};

const formatCurrency = (val) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatHours = (val) => {
    return val.toFixed(2).replace('.', ',') + 'h';
};

export default gerarRelatorioPDF;