import * as XLSX from 'xlsx';

const gerarRelatorioExcel = (servicos, filtros, nomeConsultor, semValores = false) => {
  // 1. Prepara os dados (Ordena por data)
  const servicosOrdenados = [...servicos].sort((a, b) => new Date(b.data) - new Date(a.data));

  // 2. Mapeia para o formato do Excel
  const dadosFormatados = servicosOrdenados.map(s => {
    const linha = {
        "Data": new Date(s.data + 'T00:00:00').toLocaleDateString('pt-BR'),
        "Canal": s.canais?.nome || 'Direto',
        "Cliente": s.cliente,
        "Consultor": s.profiles?.nome || 'N/A',
        "Atividade": s.atividade,
        "Solicitante": s.solicitante || '-',
        "OS/OP/DPC": s.os_op_dpc || '-',
        "Qtd Horas": parseFloat(s.qtd_horas || 0)
    };

    // Só adiciona financeiro se NÃO for versão "Sem Valores"
    if (!semValores) {
        linha["Valor Hora"] = parseFloat(s.valor_hora || 0);
        linha["Valor Total"] = parseFloat(s.valor_total || 0);
    }

    linha["Status"] = s.status; // Status sempre vai
    
    // Formatação da nota fiscal
    linha["Nota Fiscal"] = s.numero_nfs || '-';

    return linha;
  });

  // 3. Cria a Planilha
  const ws = XLSX.utils.json_to_sheet(dadosFormatados);

  // 4. Adiciona Totais no final (Opcional, mas fica chique)
  const totalHoras = servicosOrdenados.reduce((acc, s) => acc + parseFloat(s.qtd_horas || 0), 0);
  const totalValor = servicosOrdenados.reduce((acc, s) => acc + parseFloat(s.valor_total || 0), 0);

  // Adiciona uma linha vazia e depois os totais
  XLSX.utils.sheet_add_json(ws, [
      {}, // Linha vazia
      { 
          "Atividade": "TOTAIS GERAIS:", 
          "Qtd Horas": totalHoras, 
          "Valor Total": semValores ? "" : totalValor 
      }
  ], { skipHeader: true, origin: -1 }); // -1 significa "no final"

  // 5. Gera o Arquivo
  const wb = XLSX.utils.book_new();
  const nomeAba = semValores ? "Horas (Canais)" : "Relatório Completo";
  XLSX.utils.book_append_sheet(wb, ws, nomeAba);

  const sulfixo = semValores ? "Horas_Canais" : "Completo";
  const nomeArquivo = `Relatorio_Servicos_${sulfixo}_${new Date().toISOString().split('T')[0]}.xlsx`;

  XLSX.writeFile(wb, nomeArquivo);
};

export default gerarRelatorioExcel;