import React, { useState, useEffect, useCallback, useRef } from "react";

import {
  FileText,
  BarChart3,
  DollarSign,
  Wallet,
  AlertCircle,
  TrendingUp,
  Download,
  Clock,
  ChevronDown,
  CheckCircle,
  ShieldCheck,
} from "lucide-react";

import supabase from "../services/supabase";

import { formatCurrency, formatHoursInt } from "../utils/formatters";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import ErrorState from "./ErrorState";

const Reports = () => {
  // =========================================================
  // ACESSO
  // =========================================================
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [consultoriaId, setConsultoriaId] = useState(null);
  const [auxLoaded, setAuxLoaded] = useState(false);

  // =========================================================
  // ESTADOS
  // =========================================================
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);
  const [canais, setCanais] = useState([]);
  const [clientes, setClientes] = useState([]);

  // Filtros
  const [periodo, setPeriodo] = useState({
    inicio: new Date(new Date().getFullYear(), 0, 1)
      .toISOString()
      .split("T")[0],

    fim: new Date().toISOString().split("T")[0],
  });

  const [canalSelecionado, setCanalSelecionado] = useState("todos");

  const [clienteSelecionado, setClienteSelecionado] = useState("todos");

  // Dados
  const [dados, setDados] = useState([]);

  const [resumo, setResumo] = useState({
    totalVenda: 0,
    totalCusto: 0,
    lucro: 0,
    margem: 0,
    horasVendidas: 0,
    horasCusto: 0,
  });

  // Dropdown PDF
  const [showPdfMenu, setShowPdfMenu] = useState(false);

  const dropdownRef = useRef(null);

  // =========================================================
  // HELPERS
  // =========================================================
  const getResumoVazio = () => ({
    totalVenda: 0,
    totalCusto: 0,
    lucro: 0,
    margem: 0,
    horasVendidas: 0,
    horasCusto: 0,
  });

  const resolverRoleEfetiva = (profile) => {
    if (!profile) {
      return "consultor";
    }

    if (profile.role === "super_admin") {
      return "super_admin";
    }

    if (["admin", "dono"].includes(profile.role)) {
      return profile.role;
    }

    if (["admin", "dono", "super_admin"].includes(profile.cargo)) {
      return profile.cargo;
    }

    return profile.role || profile.cargo || "consultor";
  };

  const formatarDataBR = (data) => {
    if (!data) {
      return "-";
    }

    return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
  };

  // =========================================================
  // VALIDAR ACESSO
  // =========================================================
  useEffect(() => {
    const validarAcesso = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setHasAccess(false);
          setAccessChecked(true);
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role, cargo, consultoria_id")
          .eq("id", user.id)
          .single();

        if (error || !profile) {
          setHasAccess(false);
          setAccessChecked(true);
          return;
        }

        const roleEfetiva = resolverRoleEfetiva(profile);

        const permitido = ["admin", "dono", "super_admin"].includes(
          roleEfetiva
        );

        setHasAccess(permitido);

        setConsultoriaId(permitido ? profile.consultoria_id : null);
      } catch (error) {
        console.error("Erro ao validar acesso aos relatórios:", error);

        setHasAccess(false);
        setConsultoriaId(null);
      } finally {
        setAccessChecked(true);
      }
    };

    validarAcesso();
  }, []);

  // =========================================================
  // FECHAR DROPDOWN AO CLICAR FORA
  // =========================================================
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowPdfMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // =========================================================
  // CARREGAR LISTAS AUXILIARES
  // =========================================================
  useEffect(() => {
    const fetchAuxiliar = async () => {
      if (!hasAccess || !consultoriaId) {
        return;
      }

      try {
        const [canaisResult, clientesResult] = await Promise.all([
          supabase
            .from("canais")
            .select("id, nome")
            .eq("consultoria_id", consultoriaId)
            .eq("ativo", true)
            .order("nome"),

          supabase
            .from("clientes")
            .select("id, nome")
            .eq("consultoria_id", consultoriaId)
            .eq("ativo", true)
            .order("nome"),
        ]);

        if (canaisResult.error) {
          throw canaisResult.error;
        }

        if (clientesResult.error) {
          throw clientesResult.error;
        }

        setCanais(canaisResult.data || []);

        setClientes(clientesResult.data || []);
      } catch (error) {
        console.error(
          "Erro ao carregar dados auxiliares dos relatórios:",
          error
        );

        setCanais([]);
        setClientes([]);
      } finally {
        setAuxLoaded(true);
      }
    };

    fetchAuxiliar();
  }, [hasAccess, consultoriaId]);

  // =========================================================
  // GERAR RELATÓRIO
  // =========================================================
  const gerarRelatorio = useCallback(async () => {
    if (!hasAccess || !consultoriaId || !auxLoaded) {
      return;
    }

    setLoading(true);
    setErro(null);

    try {
      // 1. Demandas da própria consultoria
      const { data: demandas, error: errDemandas } = await supabase
        .from("demandas")
        .select(
          `
              id,
              created_at,
              titulo,
              cliente_id,
              canal_id,
              estimativa,
              status,
              os_op_dpc
            `
        )
        .eq("consultoria_id", consultoriaId)
        .gte("created_at", `${periodo.inicio}T00:00:00`)
        .lte("created_at", `${periodo.fim}T23:59:59`)
        .neq("status", "Cancelada");

      if (errDemandas) {
        throw errDemandas;
      }

      if (!demandas || demandas.length === 0) {
        setDados([]);
        setResumo(getResumoVazio());

        return;
      }

      // 2. IDs
      const demandaIds = demandas.map((demanda) => demanda.id);

      const clienteIds = [
        ...new Set(
          demandas.map((demanda) => demanda.cliente_id).filter(Boolean)
        ),
      ];

      // 3. Financeiro
      const { data: finData, error: errFinanceiro } = await supabase
        .from("demandas_financeiro")
        .select(
          `
              demanda_id,
              horas_vendidas,
              valor_cobrado,
              valor_interno_hora
            `
        )
        .in("demanda_id", demandaIds);

      if (errFinanceiro) {
        throw errFinanceiro;
      }

      // 4. Clientes
      let clientesMap = {};

      if (clienteIds.length > 0) {
        const { data: clientesData, error: errClientes } = await supabase
          .from("clientes")
          .select("id, nome")
          .eq("consultoria_id", consultoriaId)
          .in("id", clienteIds);

        if (errClientes) {
          throw errClientes;
        }

        if (clientesData) {
          clientesData.forEach((cliente) => {
            clientesMap[cliente.id] = cliente.nome;
          });
        }
      }

      // 5. Mapas
      const financeiroMap = {};

      (finData || []).forEach((financeiro) => {
        financeiroMap[financeiro.demanda_id] = financeiro;
      });

      const canaisMap = {};

      canais.forEach((canal) => {
        canaisMap[canal.id] = canal.nome;
      });

      // 6. Processamento
      let listaProcessada = demandas.map((demanda) => {
        const fin = financeiroMap[demanda.id] || {};

        const idClienteReal = demanda.cliente_id;

        const idCanalReal = demanda.canal_id;

        const nomeCliente = clientesMap[idClienteReal] || "Cliente n/d";

        const nomeCanal = canaisMap[idCanalReal] || "Direto / Sem Canal";

        const vlrVenda = Number(fin.valor_cobrado || 0);

        const hrsVendidas = Number(fin.horas_vendidas || 0);

        const hrsCusto = Number(demanda.estimativa || 0);

        const vlrHoraCusto = Number(fin.valor_interno_hora || 0);

        const custoTotal = hrsCusto * vlrHoraCusto;

        const lucroItem = vlrVenda - custoTotal;

        return {
          data: new Date(demanda.created_at).toLocaleDateString("pt-BR"),

          cliente: nomeCliente,

          cliente_id: idClienteReal,

          demanda: demanda.titulo,

          os_op_dpc: demanda.os_op_dpc || "-",

          canal: nomeCanal,

          canal_id: idCanalReal,

          horasVendidas: hrsVendidas,

          horasCusto: hrsCusto,

          valorVenda: vlrVenda,

          custoTotal,

          lucro: lucroItem,

          status: demanda.status,
        };
      });

      // 7. Filtros
      if (canalSelecionado === "direto") {
        listaProcessada = listaProcessada.filter((item) => !item.canal_id);
      } else if (canalSelecionado !== "todos") {
        listaProcessada = listaProcessada.filter(
          (item) => String(item.canal_id) === String(canalSelecionado)
        );
      }

      if (clienteSelecionado !== "todos") {
        listaProcessada = listaProcessada.filter(
          (item) => String(item.cliente_id) === String(clienteSelecionado)
        );
      }

      // 8. Totais
      let totalVenda = 0;
      let totalCusto = 0;
      let totalHorasVenda = 0;
      let totalHorasCusto = 0;

      listaProcessada.forEach((item) => {
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
        horasCusto: totalHorasCusto,
      });
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);

      setErro(error.message || "Não foi possível gerar o relatório.");

      setDados([]);

      setResumo(getResumoVazio());
    } finally {
      setLoading(false);
    }
  }, [
    hasAccess,
    consultoriaId,
    auxLoaded,
    periodo,
    canalSelecionado,
    clienteSelecionado,
    canais,
  ]);

  // =========================================================
  // ATUALIZAR RELATÓRIO
  // =========================================================
  useEffect(() => {
    if (hasAccess && consultoriaId && auxLoaded) {
      gerarRelatorio();
    }
  }, [hasAccess, consultoriaId, auxLoaded, gerarRelatorio]);

  // =========================================================
  // EXCEL
  // =========================================================
  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      dados.map((item) => ({
        Data: item.data,

        Cliente: item.cliente,

        Demanda: item.demanda,

        Canal: item.canal,

        "Hrs Vendidas": item.horasVendidas,

        "Hrs Custo": item.horasCusto,

        "Valor Venda": item.valorVenda,

        "Custo Total": item.custoTotal,

        Lucro: item.lucro,
      }))
    );

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Resultado_Financeiro");

    XLSX.writeFile(wb, `Resultado_Financeiro_${periodo.inicio}.xlsx`);
  };

  // =========================================================
  // PDF INTERNO
  // =========================================================
  const exportarPDFInterno = () => {
    const doc = new jsPDF("l", "mm", "a4");

    setShowPdfMenu(false);

    doc.setFillColor(79, 70, 229);

    doc.rect(0, 0, 297, 24, "F");

    doc.setTextColor(255, 255, 255);

    doc.setFontSize(16);

    doc.setFont("helvetica", "bold");

    doc.text("Relatório Gerencial (Interno)", 14, 15);

    doc.setTextColor(40, 40, 40);

    doc.setFontSize(10);

    doc.setFont("helvetica", "normal");

    doc.text(
      `Período: ${formatarDataBR(periodo.inicio)} até ${formatarDataBR(
        periodo.fim
      )}`,
      14,
      35
    );

    doc.text(`Emissão: ${new Date().toLocaleDateString("pt-BR")}`, 280, 35, {
      align: "right",
    });

    const tableColumn = [
      "Data",
      "Cliente",
      "Demanda",
      "Canal",
      "Hrs Venda",
      "Hrs Custo",
      "Venda (R$)",
      "Custo (R$)",
      "Lucro (R$)",
    ];

    const tableRows = dados.map((row) => [
      row.data,
      row.cliente,
      row.demanda,
      row.canal,

      formatHoursInt(row.horasVendidas),

      formatHoursInt(row.horasCusto),

      formatCurrency(row.valorVenda),

      formatCurrency(row.custoTotal),

      formatCurrency(row.lucro),
    ]);

    autoTable(doc, {
      startY: 45,

      head: [tableColumn],

      body: tableRows,

      theme: "grid",

      styles: {
        fontSize: 8,

        cellPadding: 2,

        textColor: [50, 50, 50],
      },

      headStyles: {
        fillColor: [79, 70, 229],

        textColor: [255, 255, 255],

        fontStyle: "bold",

        halign: "center",
      },

      columnStyles: {
        6: {
          halign: "right",

          textColor: [22, 163, 74],

          fontStyle: "bold",
        },

        7: {
          halign: "right",

          textColor: [220, 38, 38],
        },

        8: {
          halign: "right",

          fontStyle: "bold",
        },
      },

      alternateRowStyles: {
        fillColor: [245, 247, 255],
      },
    });

    let finalY = doc.lastAutoTable.finalY + 10;

    if (finalY > 170) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFontSize(10);

    doc.setTextColor(100, 100, 100);

    doc.text(
      `Total Faturamento: ${formatCurrency(resumo.totalVenda)}`,
      280,
      finalY,
      {
        align: "right",
      }
    );

    doc.text(
      `Custo Consultores: ${formatCurrency(resumo.totalCusto)}`,
      280,
      finalY + 6,
      {
        align: "right",
      }
    );

    doc.setFontSize(12);

    doc.setTextColor(0, 0, 0);

    doc.setFont("helvetica", "bold");

    doc.text(
      `Lucro Líquido: ${formatCurrency(resumo.lucro)}`,
      280,
      finalY + 14,
      {
        align: "right",
      }
    );

    doc.save("Gerencial_Interno.pdf");
  };

  // =========================================================
  // PDF EXTERNO
  // =========================================================
  const exportarPDFExterno = () => {
    const doc = new jsPDF("l", "mm", "a4");

    setShowPdfMenu(false);

    let tituloRelatorio = "Relatório de Atividades e Cobrança";

    if (canalSelecionado !== "todos") {
      if (canalSelecionado === "direto") {
        tituloRelatorio = "Relatório de Cobrança - Venda Direta";
      } else {
        const canalEncontrado = canais.find(
          (canal) => String(canal.id) === String(canalSelecionado)
        );

        if (canalEncontrado) {
          tituloRelatorio = `Relatório de Cobrança - ${canalEncontrado.nome.toUpperCase()}`;
        }
      }
    }

    doc.setFillColor(79, 70, 229);

    doc.rect(0, 0, 297, 26, "F");

    doc.setTextColor(255, 255, 255);

    doc.setFontSize(16);

    doc.setFont("helvetica", "bold");

    doc.text(tituloRelatorio, 14, 12);

    doc.setFontSize(10);

    doc.setFont("helvetica", "normal");

    doc.text(`Emissão: ${new Date().toLocaleDateString("pt-BR")}`, 280, 12, {
      align: "right",
    });

    doc.setDrawColor(255, 255, 255);

    doc.setLineWidth(0.1);

    doc.line(14, 16, 283, 16);

    const dataIni = formatarDataBR(periodo.inicio);

    const dataFim = formatarDataBR(periodo.fim);

    doc.text(`Período de Competência: ${dataIni} a ${dataFim}`, 14, 22);

    const tableColumn = [
      "Data",
      "Canal",
      "Cliente",
      "OS/OP/DPC",
      "Demanda",
      "Qtd Hrs",
      "Vlr Hora",
      "Vlr Total",
    ];

    const tableRows = dados.map((row) => {
      let vlrUnit = 0;

      if (row.horasVendidas > 0) {
        vlrUnit = row.valorVenda / row.horasVendidas;
      }

      return [
        row.data,
        row.canal,
        row.cliente,
        row.os_op_dpc || "-",
        row.demanda,

        formatHoursInt(row.horasVendidas),

        formatCurrency(vlrUnit),

        formatCurrency(row.valorVenda),
      ];
    });

    autoTable(doc, {
      startY: 40,

      head: [tableColumn],

      body: tableRows,

      theme: "grid",

      styles: {
        fontSize: 9,

        cellPadding: 3,

        textColor: [40, 40, 40],
      },

      headStyles: {
        fillColor: [79, 70, 229],

        textColor: [255, 255, 255],

        fontStyle: "bold",

        halign: "center",
      },

      columnStyles: {
        5: {
          halign: "center",
        },

        6: {
          halign: "right",
        },

        7: {
          halign: "right",

          fontStyle: "bold",
        },
      },

      alternateRowStyles: {
        fillColor: [245, 247, 255],
      },
    });

    let finalY = doc.lastAutoTable.finalY + 10;

    if (finalY > 180) {
      doc.addPage();
      finalY = 20;
    }

    doc.setTextColor(0, 0, 0);

    doc.setFontSize(11);

    doc.setFont("helvetica", "bold");

    doc.text(
      `Total de Horas: ${formatHoursInt(resumo.horasVendidas)}`,
      280,
      finalY,
      {
        align: "right",
      }
    );

    doc.text(
      `Valor Total Geral: ${formatCurrency(resumo.totalVenda)}`,
      280,
      finalY + 6,
      {
        align: "right",
      }
    );

    doc.save(`Extrato_Cobranca_${periodo.inicio}.pdf`);
  };

  // =========================================================
  // VALIDANDO ACESSO
  // =========================================================
  if (!accessChecked) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  // =========================================================
  // ACESSO NEGADO
  // =========================================================
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
          <ShieldCheck size={32} className="text-red-500" />
        </div>

        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
          Acesso não autorizado
        </h2>

        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-md">
          Esta área contém informações financeiras e está disponível somente
          para administradores.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in p-2">
      {/* =================================================== */}
      {/* CABEÇALHO E FILTROS */}
      {/* =================================================== */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <BarChart3 className="text-indigo-600" />
              Relatórios Financeiros
            </h2>

            <p className="text-gray-500 text-sm">
              Confronto: Vendas vs Custo de Consultores
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={exportarExcel}
              disabled={dados.length === 0}
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700 transition-colors disabled:opacity-50 text-sm"
            >
              <Download size={18} />
              Excel
            </button>

            {/* PDF */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowPdfMenu(!showPdfMenu)}
                disabled={dados.length === 0}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-red-700 transition-colors disabled:opacity-50 text-sm"
              >
                <FileText size={18} />
                PDF
                <ChevronDown size={16} />
              </button>

              {showPdfMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-fade-in">
                  <div className="p-2 space-y-1">
                    <button
                      onClick={exportarPDFInterno}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex items-center gap-3 transition-colors group"
                    >
                      <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600">
                        <BarChart3 size={18} />
                      </div>

                      <div>
                        <span className="block text-sm font-bold text-gray-800 dark:text-white">
                          Gerencial Interno
                        </span>

                        <span className="block text-xs text-gray-500">
                          Com custos e lucros
                        </span>
                      </div>
                    </button>

                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />

                    <button
                      onClick={exportarPDFExterno}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex items-center gap-3 transition-colors group"
                    >
                      <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-gray-600 dark:text-gray-300">
                        <CheckCircle size={18} />
                      </div>

                      <div>
                        <span className="block text-sm font-bold text-gray-800 dark:text-white">
                          Relatório de Cobrança
                        </span>

                        <span className="block text-xs text-gray-500">
                          Externo (Sem custos)
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FILTROS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Data Início
            </label>

            <input
              type="date"
              value={periodo.inicio}
              onChange={(event) =>
                setPeriodo({
                  ...periodo,
                  inicio: event.target.value,
                })
              }
              className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Data Fim
            </label>

            <input
              type="date"
              value={periodo.fim}
              onChange={(event) =>
                setPeriodo({
                  ...periodo,
                  fim: event.target.value,
                })
              }
              className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Filtrar Canal
            </label>

            <select
              value={canalSelecionado}
              onChange={(event) => setCanalSelecionado(event.target.value)}
              className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-medium"
            >
              <option value="todos">Todos os Canais</option>

              <option value="direto">Apenas Direto</option>

              {canais.map((canal) => (
                <option key={canal.id} value={canal.id}>
                  {canal.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Filtrar Cliente
            </label>

            <select
              value={clienteSelecionado}
              onChange={(event) => setClienteSelecionado(event.target.value)}
              className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-medium"
            >
              <option value="todos">Todos os Clientes</option>

              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
        </div>
      ) : erro ? (
        <ErrorState message={erro} onRetry={gerarRelatorio} />
      ) : (
        <>
          {/* ================================================= */}
          {/* CARDS DRE */}
          {/* ================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* FATURAMENTO */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <DollarSign size={40} className="text-green-600" />
              </div>

              <p className="text-gray-400 text-xs font-bold uppercase mb-1">
                Faturamento (Venda)
              </p>

              <h3 className="text-2xl font-black text-green-600 dark:text-green-400">
                {formatCurrency(resumo.totalVenda)}
              </h3>

              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <Clock size={12} />
                {formatHoursInt(resumo.horasVendidas)}h vendidas
              </p>
            </div>

            {/* CUSTO */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Wallet size={40} className="text-red-600" />
              </div>

              <p className="text-gray-400 text-xs font-bold uppercase mb-1">
                Custos (Consultores)
              </p>

              <h3 className="text-2xl font-black text-red-500 dark:text-red-400">
                {formatCurrency(resumo.totalCusto)}
              </h3>

              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <Clock size={12} />
                {formatHoursInt(resumo.horasCusto)}h de repasse
              </p>
            </div>

            {/* LUCRO */}
            <div className="bg-indigo-600 p-5 rounded-2xl shadow-lg text-white relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />

              <div className="flex justify-between items-start">
                <div>
                  <p className="text-indigo-200 text-xs font-bold uppercase mb-1">
                    Lucro Líquido
                  </p>

                  <h3 className="text-3xl font-black">
                    {formatCurrency(resumo.lucro)}
                  </h3>
                </div>

                <TrendingUp className="text-indigo-200" size={28} />
              </div>

              <div className="mt-4 inline-flex items-center px-2 py-1 rounded bg-white/20 text-xs font-bold">
                Margem: {resumo.margem.toFixed(1)}%
              </div>
            </div>

            {/* HORAS */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-center">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-500 font-bold">HORAS VENDIDAS</span>

                <span className="text-indigo-600 font-bold">
                  {formatHoursInt(resumo.horasVendidas)}
                </span>
              </div>

              <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full mb-4 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full"
                  style={{
                    width: "100%",
                  }}
                />
              </div>

              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-500 font-bold">HORAS CUSTO</span>

                <span className="text-red-500 font-bold">
                  {formatHoursInt(resumo.horasCusto)}
                </span>
              </div>

              <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-red-400 h-full rounded-full"
                  style={{
                    width: `${
                      resumo.horasVendidas > 0
                        ? Math.min(
                            (resumo.horasCusto / resumo.horasVendidas) * 100,
                            100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* ================================================= */}
          {/* TABELA */}
          {/* ================================================= */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 dark:text-white">
                Detalhamento Financeiro (DRE por Demanda)
              </h3>

              <span className="text-xs text-gray-400 flex items-center gap-1">
                <AlertCircle size={12} />
                Venda - Custo = Lucro
              </span>
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
                      <td
                        colSpan="9"
                        className="px-6 py-8 text-center text-gray-400"
                      >
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  ) : (
                    dados.map((row, index) => (
                      <tr
                        key={`${row.demanda}-${index}`}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="px-6 py-4 text-gray-500 text-xs">
                          {row.data}
                        </td>

                        <td className="px-6 py-4 font-bold text-gray-800 dark:text-white">
                          {row.cliente}
                        </td>

                        <td
                          className="px-6 py-4 text-gray-600 dark:text-gray-300 truncate max-w-[150px]"
                          title={row.demanda}
                        >
                          {row.demanda}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold ${
                              row.canal.includes("Direto")
                                ? "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                                : "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                            }`}
                          >
                            {row.canal}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-center font-bold text-indigo-600">
                          {formatHoursInt(row.horasVendidas)}
                        </td>

                        <td className="px-6 py-4 text-center text-gray-500">
                          {formatHoursInt(row.horasCusto)}
                        </td>

                        <td className="px-6 py-4 text-right font-bold text-green-600">
                          {formatCurrency(row.valorVenda)}
                        </td>

                        <td className="px-6 py-4 text-right text-red-500 text-xs">
                          {formatCurrency(row.custoTotal)}
                        </td>

                        <td
                          className={`px-6 py-4 text-right font-black ${
                            row.lucro >= 0 ? "text-indigo-600" : "text-red-600"
                          }`}
                        >
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
