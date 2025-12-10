import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function gerarRelatorioPDF(servicos = [], filtros = {}) {
  const doc = new jsPDF();

  // =========================
  // ✅ TOPO DO RELATÓRIO
  // =========================
  doc.setFontSize(16);
  doc.text("Relatório de Serviços", 14, 20);

  let yTopo = 26;

  if (filtros?.cliente) {
    doc.setFontSize(12);
    doc.text(`Cliente: ${filtros.cliente}`, 14, yTopo);
    yTopo += 6;
  }

  doc.setFontSize(10);
  doc.text(
    `Gerado em: ${new Date().toLocaleDateString("pt-BR")}`,
    14,
    yTopo
  );

  // =========================
  // ✅ FILTROS APLICADOS
  // =========================
  let yFiltro = yTopo + 10;

  if (filtros?.status) {
    doc.text(`Status: ${filtros.status}`, 14, yFiltro);
    yFiltro += 6;
  }

  if (filtros?.dataInicio && filtros?.dataFim) {
    doc.text(
      `Período: ${new Date(filtros.dataInicio).toLocaleDateString("pt-BR")} até ${new Date(filtros.dataFim).toLocaleDateString("pt-BR")}`,
      14,
      yFiltro
    );
    yFiltro += 6;
  }

  // =========================
  // ✅ DADOS DA TABELA
  // =========================
  const dados = servicos.map((s) => {
    const horas = Number(s.qtd_horas || 0);
    const valor = Number(s.valor_total || 0);

    return [
      new Date(s.data + "T00:00:00").toLocaleDateString("pt-BR"),
      s.cliente || "-",
      s.atividade || "-",
      horas.toFixed(2),
      valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
      s.status || "-",
    ];
  });

  autoTable(doc, {
    startY: yFiltro + 6,
    head: [["Data", "Cliente", "Atividade", "Horas", "Valor", "Status"]],
    body: dados.length ? dados : [["-", "-", "-", "0.00", "R$ 0,00", "-"]],
  });

  // =========================
  // ✅ TOTAIS
  // =========================
  const totalHoras = servicos.reduce(
    (acc, s) => acc + Number(s.qtd_horas || 0),
    0
  );

  const totalValor = servicos.reduce(
    (acc, s) => acc + Number(s.valor_total || 0),
    0
  );

  const finalY = doc.lastAutoTable?.finalY || yFiltro + 20;

  doc.setFontSize(11);
  doc.text(`Total de Horas: ${totalHoras.toFixed(2)}`, 14, finalY + 10);

  doc.text(
    `Valor Total: ${totalValor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })}`,
    14,
    finalY + 18
  );

  // =========================
  // ✅ GERA O PDF E RETORNA
  // =========================
  const pdfBlob = doc.output("blob");
  return pdfBlob;
}
