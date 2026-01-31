/* eslint-disable no-restricted-globals */
import gerarRelatorioPDF from "./utils/gerarRelatorioPDF";
import gerarRelatorioExcel from "./utils/gerarRelatorioExcel"; 
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Plus, Filter, Users, Mail,
  LayoutDashboard, Briefcase, Hourglass, Timer, FileCheck, 
  Building2, Menu, Eye, EyeOff, ShieldCheck, Wallet, LayoutList, Kanban, Target, Calendar, CheckCircle, ChevronDown, DollarSign, Clock, FileText
} from 'lucide-react'; 
import supabase from './services/supabase'; 
import ClientModal from './components/ClientModal';
import ServicesTable from './components/ServicesTable';
import ServicesKanban from './components/ServicesKanban'; 
import ClientsTable from './components/ClientsTable';
import ServiceModal from './components/ServiceModal';
import Auth from './components/Auth';
import ConfigModal from './components/ConfigModal';
import Dashboard from './components/Dashboard'; // <--- IMPORTANTE: O NOVO DASHBOARD
import ConfirmModal from './components/ConfirmModal'; 
import SolicitantesModal from './components/SolicitantesModal'; 
import MultiSelect from './components/MultiSelect'; 
import ChannelsManagement from './components/ChannelsManagement'; 
import Sidebar from './components/Sidebar'; 
import AdminTenants from './components/AdminTenants'; 
import AdminModal from './components/AdminModal';
import AdminFinance from './components/AdminFinance';
import AdminPlans from './components/AdminPlans';
import TeamManagement from './components/TeamManagement';
import AccessDenied from './components/AccessDenied'; 
import DemandList from './components/DemandList';
import TeamCalendar from './components/TeamCalendar';
import Reports from './components/Reports'; 
import { formatHoursInt } from './utils/formatters'; // Removido formatCurrency se não for usado aqui direto

const App = () => {
  // --- ESTADOS ---
  const [userRole, setUserRole] = useState(null); 
  const [accessDeniedType, setAccessDeniedType] = useState(null); 
  const [servicos, setServicos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [canais, setCanais] = useState([]); 
  
  // NOVOS ESTADOS PARA OS FILTROS
  const [listaDemandas, setListaDemandas] = useState([]); 
  const [listaSolicitantesGeral, setListaSolicitantesGeral] = useState([]); 

  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState(() => {
      return localStorage.getItem('lastActiveTab') || 'dashboard';
  });

  useEffect(() => {
      localStorage.setItem('lastActiveTab', activeTab);
  }, [activeTab]);
  
  const [viewMode, setViewMode] = useState('list'); 
  const [selectedTenantId, setSelectedTenantId] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [emailEnviando, setEmailEnviando] = useState(false);
  const [toast, setToast] = useState({ mensagem: "", tipo: "", visivel: false });
  const [aviso, setAviso] = useState({ mensagem: "", tipo: "" });
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [editingCliente, setEditingCliente] = useState(null);
  const [session, setSession] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  
  const [profileData, setProfileData] = useState(null);

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [clientToInactivate, setClientToInactivate] = useState(null);
  const [mostrarInativos, setMostrarInativos] = useState(false); 

  const [valorHoraPadrao, setValorHoraPadrao] = useState('150.00'); 
  const [nomeConsultor, setNomeConsultor] = useState(''); 

  const [showSolicitantesModal, setShowSolicitantesModal] = useState(false);
  const [clienteParaSolicitantes, setClienteParaSolicitantes] = useState(null);
  
  const [todosSolicitantesDoCliente, setTodosSolicitantesDoCliente] = useState([]); 
  const [sortConfig, setSortConfig] = useState({ key: 'data', direction: 'desc' });
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [filtrosConsultores, setFiltrosConsultores] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  // ESTADO PARA O MENU PDF E EXCEL
  const [showPdfMenu, setShowPdfMenu] = useState(false);
  const [showExcelMenu, setShowExcelMenu] = useState(false);
  const pdfMenuRef = useRef(null);
  const excelMenuRef = useRef(null);

  // --- INICIALIZAÇÃO DOS FILTROS COM LOCALSTORAGE ---
  const [filtros, setFiltros] = useState(() => {
    const filtrosSalvos = localStorage.getItem('filtrosConsultFlow');
    if (filtrosSalvos) {
        try {
            return JSON.parse(filtrosSalvos);
        } catch (e) {
            console.error("Erro ao ler filtros salvos", e);
        }
    }
    return {
        canal: [], 
        cliente: [],
        status: [], 
        demanda: [], 
        dataInicio: '',
        dataFim: '',
        solicitantes: []
    };
  });

  useEffect(() => {
    localStorage.setItem('filtrosConsultFlow', JSON.stringify(filtros));
  }, [filtros]);

  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    hora_inicial: '09:00',
    hora_final: '18:00',
    valor_hora: '120.00',
    atividade: '',
    solicitante: '',
    cliente: '',
    canal_id: '',
    status: 'Pendente',
    numero_nfs: '',
    os_op_dpc: '',
    observacoes: ''
  });

  const [clienteFormData, setClienteFormData] = useState({
    nome: '',
    email: '', 
    telefone: '',
    ativo: true
  });

  // Fecha os menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
        if (pdfMenuRef.current && !pdfMenuRef.current.contains(event.target)) {
            setShowPdfMenu(false);
        }
        if (excelMenuRef.current && !excelMenuRef.current.contains(event.target)) {
            setShowExcelMenu(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const carregarSolicitantesFiltro = async () => {
      if (filtros.cliente.length === 1) {
          const nomeCliente = filtros.cliente[0];
          const clienteObj = clientes.find(c => c.nome === nomeCliente);
          if (clienteObj) {
            const { data } = await supabase.from('solicitantes').select('nome').eq('cliente_id', clienteObj.id).order('nome', { ascending: true });
            if (data) {
                const nomesUnicos = [...new Set(data.map(s => s.nome.trim()))];
                setTodosSolicitantesDoCliente(nomesUnicos);
            }
          }
      } else {
          setTodosSolicitantesDoCliente([]); 
      }
    };
    carregarSolicitantesFiltro();
  }, [filtros.cliente, clientes]);

  const getSession = async () => {
    setLoading(true);
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) { console.error('Erro sessão:', error); alert('Erro de autenticação!'); }
    setSession(session);
    setLoading(false);
  };

  const carregarConfiguracao = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('chave, valor')
        .in('chave', ['valor_hora_padrao', 'nome_consultor'])
        .eq('user_id', session.user.id); 

      if (error) console.error('Erro config:', error);

      if (data) {
        const valorConf = data.find(c => c.chave === 'valor_hora_padrao');
        const nomeConf = data.find(c => c.chave === 'nome_consultor');
        if (valorConf) setValorHoraPadrao(valorConf.valor);
        if (nomeConf) setNomeConsultor(nomeConf.valor);
      }
    } catch (error) {
      console.error('Erro config:', error);
    }
  }, [session]);

  const handleSaveConfig = async (dadosDoModal) => {
    setLoading(true);
    try {
        let avatarUrl = null;
        if (dadosDoModal.fotoArquivo) {
            const file = dadosDoModal.fotoArquivo;
            const fileExt = file.name.split('.').pop();
            const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;
            const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
            avatarUrl = urlData.publicUrl;
        }

        const updates = {
            nome: dadosDoModal.nome,
            whatsapp: dadosDoModal.whatsapp,
            valor_hora: dadosDoModal.valor_hora,
            banco: dadosDoModal.banco,
            agencia: dadosDoModal.agencia,
            conta: dadosDoModal.conta,
            chave_pix: dadosDoModal.chave_pix,
            updated_at: new Date(),
        };
        if (avatarUrl) updates.avatar_url = avatarUrl;

        const { error } = await supabase.from('profiles').update(updates).eq('id', session.user.id);
        if (error) throw error;

        await supabase.from('configuracoes').upsert({ chave: 'valor_hora_padrao', valor: dadosDoModal.valor_hora, user_id: session.user.id }, { onConflict: 'chave, user_id' });
        
        setValorHoraPadrao(dadosDoModal.valor_hora);
        showToast('Perfil atualizado com sucesso!', 'sucesso');
        setShowConfigModal(false);
        carregarDados();
    } catch (error) {
        console.error("Erro ao salvar perfil:", error);
        showToast("Erro ao salvar: " + error.message, 'erro');
    } finally {
        setLoading(false);
    }
  };

  const carregarDados = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*, consultorias(id, status)') 
        .eq('id', session.user.id)
        .single();

      if (profileError || !userProfile) return;

      setProfileData(userProfile);
      setUserRole(userProfile.role || userProfile.cargo);

      if (userProfile.ativo === false) {
          setAccessDeniedType('usuario_bloqueado');
          return; 
      }
      if (userProfile.consultorias?.status === 'bloqueada') {
          setAccessDeniedType('consultoria_bloqueada');
          return; 
      }
      setAccessDeniedType(null);

      const meuId = userProfile.consultoria_id;
      if (!meuId) return;

      // 1. CARREGAR SERVIÇOS (COM DEMANDAS VINCULADAS)
      let query = supabase
        .from('servicos_prestados')
        .select('*, canais(nome), profiles(nome), demandas(codigo, titulo)')
        .eq('consultoria_id', meuId);

      const isChefe = userProfile.role === 'admin' || userProfile.role === 'dono' || userProfile.cargo === 'admin' || userProfile.cargo === 'dono';
      
      if (!isChefe) {
          query = query.eq('user_id', session.user.id);
      }

      const { data: dataServicos, error: errorServicos } = await query.order('data', { ascending: false });
      if (errorServicos) throw errorServicos;
      setServicos(dataServicos);

      // 2. CARREGAR CLIENTES
      const { data: dataClientes, error: errorClientes } = await supabase
        .from('clientes')
        .select('*') 
        .eq('consultoria_id', meuId) 
        .order('nome', { ascending: true });
      if (errorClientes) throw errorClientes;
      setClientes(dataClientes);

      // 3. CARREGAR CANAIS
      const { data: dataCanais, error: errorCanais } = await supabase
        .from('canais')
        .select('*')
        .eq('ativo', true)
        .eq('consultoria_id', meuId)
        .order('nome', { ascending: true });
      if (!errorCanais) setCanais(dataCanais);

      // 4. CARREGAR TODAS AS DEMANDAS (PARA O FILTRO)
      const { data: dataDemandas } = await supabase
        .from('demandas')
        .select('id, codigo, titulo')
        .eq('consultoria_id', meuId)
        .neq('status', 'Cancelada') 
        .order('created_at', { ascending: false });
      if (dataDemandas) setListaDemandas(dataDemandas);

      // 5. CARREGAR TODOS OS SOLICITANTES (PARA O FILTRO LIVRE)
      if (dataClientes && dataClientes.length > 0) {
          const idsClientes = dataClientes.map(c => c.id);
          const { data: dataSolicitantes } = await supabase
            .from('solicitantes')
            .select('id, nome, cliente_id')
            .in('cliente_id', idsClientes)
            .eq('ativo', true)
            .order('nome');
          if (dataSolicitantes) setListaSolicitantesGeral(dataSolicitantes);
      }

    } catch (error) { 
      console.error('Erro ao carregar dados:', error); 
    }
  }, [session]);

  useEffect(() => {
    getSession();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => { 
        setSession(session); 
        if (event === 'SIGNED_IN') setAccessDeniedType(null); 
    });
    return () => { authListener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (session) { 
        if (servicos.length === 0) setLoading(true); 
        carregarDados().then(() => { if (servicos.length === 0) setLoading(false); });
        carregarConfiguracao(); 
    } else { 
        setServicos([]); 
        setClientes([]); 
    }
  }, [session, carregarDados, carregarConfiguracao]);

  useEffect(() => {
    const algumModalAberto = showModal || showClienteModal || showSolicitantesModal || showConfigModal;
    if (algumModalAberto) {
        if (window.location.hash !== '#modal') window.history.pushState({ type: 'modal' }, '', '#modal');
    } else if (activeTab !== 'dashboard') {
        if (window.location.hash !== `#${activeTab}`) window.history.pushState({ type: 'tab' }, '', `#${activeTab}`);
    }
    const handlePopState = () => {
      if (showModal || showClienteModal || showSolicitantesModal || showConfigModal) {
        setShowModal(false); setShowClienteModal(false); setShowSolicitantesModal(false); setShowConfigModal(false); 
        return;
      }
      if (activeTab !== 'dashboard') setActiveTab('dashboard');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTab, showModal, showClienteModal, showSolicitantesModal, showConfigModal]);

  // --- FUNÇÃO DE UPDATE EM MASSA ---
  const handleBulkStatusUpdate = async (novoStatus) => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Tem certeza que deseja alterar o status de ${selectedIds.length} serviços para "${novoStatus}"?`)) return;

    try {
        setLoading(true);
        const { error } = await supabase.from('servicos_prestados').update({ status: novoStatus }).in('id', selectedIds);
        if (error) throw error;
        showToast(`${selectedIds.length} serviços atualizados com sucesso!`, 'sucesso');
        setSelectedIds([]);
        await carregarDados();
    } catch (error) {
        console.error("Erro no update em massa:", error);
        showToast("Erro ao atualizar serviços em massa.", 'erro');
    } finally {
        setLoading(false);
    }
  };

  const salvarServico = async () => {
    try {
      if (!profileData?.consultoria_id) throw new Error("Consultoria não identificada no perfil.");
      const dadosParaSalvar = {
          ...formData,
          user_id: session.user.id,
          consultoria_id: profileData.consultoria_id,
          canal_id: formData.canal_id === '' ? null : formData.canal_id,
          cliente: formData.cliente === '' ? null : formData.cliente
      };

      let error;
      if (editingService) {
        if (!editingService.id) throw new Error("ID do serviço não encontrado para edição.");
        const { error: updateError } = await supabase.from('servicos_prestados').update(dadosParaSalvar).eq('id', editingService.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('servicos_prestados').insert([dadosParaSalvar]);
        error = insertError;
      }

      if (error) throw error;
      showToast(editingService ? 'Serviço atualizado com sucesso!' : 'Serviço cadastrado com sucesso!', 'sucesso');
      setShowModal(false); setEditingService(null); resetForm(); await carregarDados(); 
    } catch (error) { 
      console.error('Erro CRÍTICO ao salvar:', error); 
      showToast('Erro ao salvar: ' + (error.message || error.details || 'Erro desconhecido'), 'erro'); 
    }
  };

  const deletarServico = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;
    try {
      const { error } = await supabase.from('servicos_prestados').delete().eq('id', id);
      if (error) throw error;
      showToast('Serviço excluído!', 'sucesso'); 
      carregarDados();
      return true;
    } catch (error) { 
      console.error('Erro deletar:', error); 
      showToast('Erro ao excluir serviço!', 'erro'); 
      return false;
    }
  };

  const alterarStatusRapido = async (id, novoStatus) => {
    try {
      const { error } = await supabase.from('servicos_prestados').update({ status: novoStatus }).eq('id', id);
      if (error) throw error; carregarDados();
    } catch (error) { console.error('Erro status:', error); alert('Erro ao alterar status!'); }
  };

  const salvarCliente = async () => {
    if (!clienteFormData.nome.trim()) { showToast('Nome do cliente é obrigatório!', 'erro'); return; }
    try {
      setLoading(true);
      if (!profileData?.consultoria_id) throw new Error("Consultoria não identificada.");
      const dadosCliente = { ...clienteFormData, user_id: session.user.id, consultoria_id: profileData.consultoria_id };
      let clienteSalvo = null; 
      if (editingCliente) {
        const { error } = await supabase.from('clientes').update(dadosCliente).eq('id', editingCliente.id);
        if (error) throw error;
        showToast('Cliente atualizado!', 'sucesso');
      } else {
        const { data, error } = await supabase.from('clientes').insert([dadosCliente]).select().single();
        if (error) throw error;
        clienteSalvo = data;
        showToast('Cliente criado! Cadastre a equipe agora.', 'sucesso');
      }
      setShowClienteModal(false); setEditingCliente(null); resetClienteForm(); await carregarDados(); 
      if (clienteSalvo) { setTimeout(() => { handleManageTeam(clienteSalvo); }, 500); }
    } catch (error) { console.error('Erro ao salvar cliente:', error); showToast('Erro ao salvar cliente!', 'erro'); } finally { setLoading(false); }
  };

  const handleRequestInactivate = (cliente) => { setClientToInactivate(cliente); setConfirmModalOpen(true); };

  const confirmInactivation = async () => {
    if (!clientToInactivate) return;
    try {
      const { error } = await supabase.from('clientes').update({ ativo: false }).eq('id', clientToInactivate.id);
      if (error) throw error;
      showToast('Cliente inativado e oculto da lista.', 'sucesso');
      carregarDados();
    } catch (error) { console.error('Erro deletar:', error); showToast('Erro ao inativar cliente!', 'erro'); }
  };

  const reativarCliente = async (id) => {
    try {
      const { error } = await supabase.from('clientes').update({ ativo: true }).eq('id', id);
      if (error) throw error;
      showToast('Cliente restaurado com sucesso!', 'sucesso');
      carregarDados();
    } catch (error) { console.error('Erro reativar:', error); showToast('Erro ao reativar cliente.', 'erro'); }
  };

  const handleLogout = async () => { setLoading(true); const { error } = await supabase.auth.signOut(); if (error) console.error(error); else setSession(null); setLoading(false); };
  const blobToBase64 = (blob) => { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); }); };
  const showToast = (mensagem, tipo = 'sucesso') => { setToast({ visivel: true, mensagem: mensagem, tipo: tipo }); setTimeout(() => { setToast(prev => ({ ...prev, visivel: false })); }, 3000); };

  const handleGerarPDF = (semValores = false) => {
    const baseDados = servicosFiltradosData;
    const dadosParaRelatorio = selectedIds.length > 0 ? baseDados.filter(s => selectedIds.includes(s.id)) : baseDados;
    if (dadosParaRelatorio.length === 0) { showToast("Nenhum serviço disponível para gerar o relatório.", "erro"); return; }
    const nomeParaRelatorio = nomeConsultor || profileData?.nome || session?.user?.email || 'Consultor';
    const pdfBlob = gerarRelatorioPDF(dadosParaRelatorio, filtros, nomeParaRelatorio, semValores);
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = semValores ? "relatorio-horas-canais.pdf" : "relatorio-completo.pdf";
    a.click();
    URL.revokeObjectURL(url);
    setShowPdfMenu(false); 
  };

  const handleExportarExcel = (semValores = false) => {
    const baseDados = servicosFiltradosData;
    const dadosParaExportar = selectedIds.length > 0 ? baseDados.filter(s => selectedIds.includes(s.id)) : baseDados;
    if (dadosParaExportar.length === 0) { showToast("Nenhum serviço disponível para exportar.", "erro"); return; }
    const nomeParaRelatorio = nomeConsultor || session?.user?.email || 'Consultor';
    gerarRelatorioExcel(dadosParaExportar, filtros, nomeParaRelatorio, semValores);
    showToast('Planilha Excel gerada com sucesso!', 'sucesso');
    setShowExcelMenu(false);
  };

  const handleEnviarEmail = async () => {
    if (!filtros.cliente || filtros.cliente.length === 0) { showToast("Selecione um cliente no filtro.", "erro"); return; }
    const dadosParaEnvio = selectedIds.length > 0 ? servicosFiltradosData.filter(s => selectedIds.includes(s.id)) : servicosFiltradosData;
    if (dadosParaEnvio.length === 0) { showToast("Não há serviços selecionados para enviar.", "erro"); return; }
    const nomeClienteAlvo = filtros.cliente[0];
    const clienteSelecionado = clientes.find(c => c.nome === nomeClienteAlvo);
    if (!clienteSelecionado) { showToast("Cliente não encontrado.", "erro"); return; }

    setEmailEnviando(true);
    try {
      const { data: todosSolicitantes, error } = await supabase.from('solicitantes').select('*').eq('cliente_id', clienteSelecionado.id);
      if (error) throw error;
      const pacotesDeEnvio = {};
      let servicosSemDestino = 0;

      dadosParaEnvio.forEach(servico => { 
        if (servico.cliente !== clienteSelecionado.nome) return;
        let emailDestino = null;
        let emailCC = null;
        const nomeNoServico = (servico.solicitante || '').trim().toLowerCase();
        const solicitanteEncontrado = todosSolicitantes.find(s => s.nome.trim().toLowerCase() === nomeNoServico);

        if (solicitanteEncontrado) {
          if (solicitanteEncontrado.coordenador_id) {
            const chefe = todosSolicitantes.find(s => s.id === solicitanteEncontrado.coordenador_id);
            if (chefe && chefe.email) { emailDestino = chefe.email; if (solicitanteEncontrado.email) emailCC = solicitanteEncontrado.email; }
          } else if (solicitanteEncontrado.email) { emailDestino = solicitanteEncontrado.email; }
        }
        if (!emailDestino) { servicosSemDestino++; return; }
        if (!pacotesDeEnvio[emailDestino]) { pacotesDeEnvio[emailDestino] = { destinatario: emailDestino, servicos: [], ccs: new Set() }; }
        pacotesDeEnvio[emailDestino].servicos.push(servico);
        if (emailCC) pacotesDeEnvio[emailDestino].ccs.add(emailCC);
      });

      if (Object.keys(pacotesDeEnvio).length === 0) { showToast("Nenhum e-mail de gestor/solicitante encontrado.", "erro"); return; }
      let enviados = 0;
      for (const [emailDestino, pacote] of Object.entries(pacotesDeEnvio)) {
        const listaCCs = Array.from(pacote.ccs);
        showToast(`Enviando para ${emailDestino}...`, "aviso");
        const nomeParaRelatorio = nomeConsultor || session?.user?.email || 'Consultor';
        const pdfBlob = gerarRelatorioPDF(pacote.servicos, filtros, nomeParaRelatorio);
        if (!pdfBlob) throw new Error("Falha ao gerar PDF");
        const pdfBase64 = await blobToBase64(pdfBlob);
        const response = await fetch("/api/enviar-email", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailDestino, cc: listaCCs, nomeCliente: clienteSelecionado.nome, pdfBase64: pdfBase64, periodo: filtros.dataInicio ? `${new Date(filtros.dataInicio).toLocaleDateString()} a ...` : 'Período Geral' })
        });
        if (response.ok) enviados++;
      }
      if (servicosSemDestino > 0) { showToast(`Enviados: ${enviados}. Atenção: ${servicosSemDestino} serviços sem email cadastrado.`, "aviso"); } 
      else { showToast(`Sucesso! ${enviados} pacote(s) de email enviados.`, "sucesso"); }
    } catch (error) { console.error("Erro:", error); showToast("Erro no processo de envio.", "erro"); } finally { setEmailEnviando(false); }
  };
  
  const resetForm = () => { 
    setFormData({ 
      data: new Date().toISOString().split('T')[0], 
      hora_inicial: '09:00', hora_final: '18:00', valor_hora: parseFloat(valorHoraPadrao || '0').toFixed(2), 
      atividade: '', solicitante: '', cliente: '', canal_id: '', 
      status: 'Pendente', numero_nfs: '', os_op_dpc: '', observacoes: '' 
    }); 
  };
  const resetClienteForm = () => { setClienteFormData({ nome: '', email: '', telefone: '', ativo: true }); };
  
  const editarServico = (servico) => { 
    setEditingService(servico); 
    setFormData({
      id: servico.id, data: servico.data, hora_inicial: servico.hora_inicial, hora_final: servico.hora_final,
      valor_hora: servico.valor_hora, atividade: servico.atividade, solicitante: servico.solicitante || '',
      cliente: servico.cliente, canal_id: servico.canal_id || '', status: servico.status,
      numero_nfs: servico.numero_nfs || '', os_op_dpc: servico.os_op_dpc || '',
      observacoes: servico.observacoes || '', demanda_id: servico.demanda_id || null 
    });
    setShowModal(true); 
  };

  const handleDuplicateService = (servicoOriginal) => {
    setFormData({
      data: servicoOriginal.data, hora_inicial: servicoOriginal.hora_inicial, hora_final: servicoOriginal.hora_final,
      valor_hora: servicoOriginal.valor_hora, atividade: servicoOriginal.atividade, solicitante: servicoOriginal.solicitante || '',
      cliente: servicoOriginal.cliente, canal_id: servicoOriginal.canal_id || '', status: 'Pendente', 
      numero_nfs: '', os_op_dpc: servicoOriginal.os_op_dpc || '', observacoes: servicoOriginal.observacoes || '',
      demanda_id: servicoOriginal.demanda_id || null 
    });
    setEditingService(null); 
    setShowModal(true);
  };

  const editarCliente = (cliente) => { setEditingCliente(cliente); setClienteFormData(cliente); setShowClienteModal(true); };
  const handleManageTeam = (cliente) => { setClienteParaSolicitantes(cliente); setShowSolicitantesModal(true); };
  const handleSort = (key) => { let direction = 'asc'; if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc'; setSortConfig({ key, direction }); };

  const servicosFiltrados = () => {
    let result = servicos.filter(s => {
      if (filtros.canal.length > 0) { const nomeCanalServico = s.canais?.nome || 'Direto'; if (!filtros.canal.includes(nomeCanalServico)) return false; }
      if (filtros.cliente.length > 0) { if (!filtros.cliente.includes(s.cliente)) return false; }
      if (filtros.status.length > 0) { if (!filtros.status.includes(s.status)) return false; }
      if (filtros.dataInicio && s.data < filtros.dataInicio) return false;
      if (filtros.dataFim && s.data > filtros.dataFim) return false;
      
      // Filtro Solicitante
      if (filtros.solicitantes && filtros.solicitantes.length > 0) { 
          const solNome = (s.solicitante || '').trim(); 
          if (!filtros.solicitantes.includes(solNome)) return false; 
      }
      
      // Filtro Demanda
      if (filtros.demanda && filtros.demanda.length > 0) {
          const nomeDemanda = s.demandas ? `#${s.demandas.codigo} - ${s.demandas.titulo}` : 'Sem Demanda';
          if (!filtros.demanda.includes(nomeDemanda)) return false;
      }
      
      if (filtrosConsultores.length > 0) {
         if (!filtrosConsultores.includes(s.user_id)) return false;
      }
      return true;
    });
    if (sortConfig.key) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (sortConfig.key === 'valor_total' || sortConfig.key === 'qtd_horas') { valA = parseFloat(valA || 0); valB = parseFloat(valB || 0); }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  };

  const filtrarClientes = (todosClientes) => {
    return mostrarInativos ? todosClientes : todosClientes.filter(c => c.ativo !== false);
  };

  const servicosFiltradosData = servicosFiltrados(); 
  const clientesParaTabela = filtrarClientes(clientes);

  // OPÇÕES PARA FILTROS
  const opcoesCanais = ['Direto', ...canais.map(c => c.nome)];
  const opcoesClientes = clientes.map(c => c.nome);
  const opcoesStatus = ['Pendente', 'Em aprovação', 'Aprovado', 'NF Emitida', 'Pago'];
  const opcoesSolicitantes = [...new Set(listaSolicitantesGeral.map(s => s.nome.trim()))];
  const opcoesDemandas = listaDemandas.map(d => `#${d.codigo} - ${d.titulo}`);
  opcoesDemandas.push('Sem Demanda');

  const clientesAtivos = clientes.filter(c => c.ativo !== false);

  // Stats calculados para a barra da tabela (apenas o que sobrou, já que o dashboard tem os dele)
  const statsTabela = {
    totalHoras: servicosFiltradosData.reduce((sum, s) => sum + parseFloat(s.qtd_horas || 0), 0),
    totalValor: servicosFiltradosData.reduce((sum, s) => sum + parseFloat(s.valor_total || 0), 0),
    totalServicos: servicosFiltradosData.length
  };

  if (loading && !session) return <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-600"></div></div>;
  if (!session) return <Auth />;

  if (accessDeniedType) {
      return (
          <AccessDenied 
              type={accessDeniedType} 
              onLogout={async () => {
                  await supabase.auth.signOut();
                  setSession(null);
                  setAccessDeniedType(null);
              }} 
          />
      );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onLogout={handleLogout}
        onOpenConfig={() => setShowConfigModal(true)}
        onOpenChannels={() => setActiveTab('channels')} 
        userEmail={session?.user?.email}
        userProfile={profileData}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-16 flex items-center justify-between px-6 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 -ml-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              {activeTab === 'dashboard' && <><LayoutDashboard className="text-indigo-600 dark:text-indigo-400" /> Dashboard</>}
              {activeTab === 'servicos' && <><Briefcase className="text-indigo-600 dark:text-indigo-400" /> Meus Serviços</>}
              {activeTab === 'clientes' && <><Users className="text-indigo-600 dark:text-indigo-400" /> Clientes</>}
              {activeTab === 'demandas' && <><Target className="text-indigo-600 dark:text-indigo-400" /> Mural de Oportunidades</>}
              {activeTab === 'agenda' && <><Calendar className="text-indigo-600 dark:text-indigo-400" /> Agenda da Equipe</>}              
              {activeTab === 'admin-tenants' && <><ShieldCheck className="text-yellow-600 dark:text-yellow-400" /> Gestão de Assinantes</>}
              {activeTab === 'admin-finance' && <><Wallet className="text-yellow-600 dark:text-yellow-400" /> Financeiro</>}
              {activeTab === 'team' && <><Users className="text-indigo-600 dark:text-indigo-400" /> Gestão de Equipe</>}
              {activeTab === 'admin-plans' && <><FileText className="text-yellow-600 dark:text-yellow-400" /> Planos & Preços</>}
              {activeTab === 'channels' && <><Building2 className="text-indigo-600 dark:text-indigo-400" /> Canais & Parceiros</>}
            </h1>
          </div>
          
          {['servicos'].includes(activeTab) && (
            <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-indigo-600 dark:bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-700 dark:hover:bg-indigo-500 transition-all duration-200 hover:scale-105 active:scale-95 text-sm font-bold shadow-md shadow-indigo-200 dark:shadow-none">
                <Plus size={18} /><span className="hidden sm:inline">Novo Serviço</span>
            </button>
          )}
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
          <div className="w-full max-w-full px-4 md:px-8 py-6 animate-fade-in-up pb-10">
            {loading ? (
              <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div><p className="mt-4 text-gray-600 dark:text-gray-400">Carregando Dados...</p></div>
            ) : (
                <>
                    {/* --- AQUI ESTÁ A INTEGRAÇÃO CORRETA DO NOVO DASHBOARD --- */}
                    {activeTab === 'dashboard' && (
                        <Dashboard 
                            servicos={servicos} 
                            clientes={clientes} 
                        />
                    )}

                    {activeTab === 'servicos' && (
                        <div className="space-y-6">
                            {/* Summary Bar da Tabela */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-between shadow-sm">
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Total Horas</p>
                                        <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{formatHoursInt(statsTabela.totalHoras)}</p>
                                    </div>
                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg"><Clock className="text-indigo-600 dark:text-indigo-400" size={24} /></div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-between shadow-sm">
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Valor Total</p>
                                        <p className="text-xl font-black text-green-600 dark:text-green-400 truncate max-w-[150px]">{formatHoursInt(statsTabela.totalValor).replace(':', ',') /* Ajuste rápido de visualização, ideal usar formatCurrency */}</p>
                                    </div>
                                    <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg"><DollarSign className="text-green-600 dark:text-green-400" size={24} /></div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-between shadow-sm">
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Quantidade</p>
                                        <p className="text-xl font-black text-gray-700 dark:text-white">{statsTabela.totalServicos} <span className="text-xs font-medium text-gray-400">serviços</span></p>
                                    </div>
                                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"><FileText className="text-gray-600 dark:text-gray-300" size={24} /></div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-gray-800 dark:text-white font-bold">
                                        <Filter size={20} className="text-indigo-600 dark:text-indigo-400" /> Filtros Avançados
                                    </div>
                                    <div className="hidden md:flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg border border-gray-200 dark:border-gray-600">
                                        <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}><LayoutList size={20} /></button>
                                        <button onClick={() => setViewMode('kanban')} className={`p-2 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}><Kanban size={20} /></button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                    <div className="col-span-full md:col-span-3 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <MultiSelect options={opcoesCanais} selected={filtros.canal} onChange={(novos) => setFiltros({...filtros, canal: novos})} placeholder="Canais..." />
                                        <MultiSelect options={opcoesClientes} selected={filtros.cliente} onChange={(novos) => setFiltros({...filtros, cliente: novos})} placeholder="Clientes..." />
                                        <MultiSelect options={opcoesSolicitantes} selected={filtros.solicitantes} onChange={(novos) => setFiltros({...filtros, solicitantes: novos})} placeholder="Solicitantes..." />
                                        <MultiSelect options={opcoesStatus} selected={filtros.status} onChange={(novos) => setFiltros({...filtros, status: novos})} placeholder="Status..." />
                                        <MultiSelect options={opcoesDemandas} selected={filtros.demanda} onChange={(novos) => setFiltros({...filtros, demanda: novos})} placeholder="Demandas..." />
                                    </div>
                                    <div className="col-span-full md:col-span-2 lg:col-span-2 grid grid-cols-2 gap-4">
                                        <input type="date" value={filtros.dataInicio} onChange={(e) => setFiltros({...filtros, dataInicio: e.target.value})} className="border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg px-3 pb-2 pt-5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full h-[46px]" />
                                        <input type="date" value={filtros.dataFim} onChange={(e) => setFiltros({...filtros, dataFim: e.target.value})} className="border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg px-3 pb-2 pt-5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full h-[46px]" />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-2 items-center">
                                    {/* Ações em Massa */}
                                    {selectedIds.length > 0 && (
                                        <div className="flex items-center gap-2 mr-auto bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800 animate-in fade-in slide-in-from-left-5">
                                            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 whitespace-nowrap">{selectedIds.length} selecionado(s)</span>
                                            <div className="h-4 w-px bg-indigo-200 dark:bg-indigo-700 mx-1"></div>
                                            <select 
                                                className="text-sm bg-transparent border-none focus:ring-0 text-gray-700 dark:text-gray-200 font-medium cursor-pointer py-0 pl-0 pr-6"
                                                onChange={(e) => { if(e.target.value) handleBulkStatusUpdate(e.target.value); e.target.value = ""; }}
                                            >
                                                <option value="">Alterar Status...</option>
                                                <option value="Pendente">Pendente</option>
                                                <option value="Em aprovação">Em aprovação</option>
                                                <option value="Aprovado">Aprovado</option>
                                                <option value="NF Emitida">NF Emitida</option>
                                                <option value="Pago">Pago</option>
                                            </select>
                                        </div>
                                    )}

                                    {/* Excel Dropdown */}
                                    <div className="relative" ref={excelMenuRef}>
                                        <button onClick={() => setShowExcelMenu(!showExcelMenu)} className={`flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${showExcelMenu ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300 ring-2 ring-green-100 dark:ring-green-900/50' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300'}`} title="Opções de Excel">
                                            <FileText size={18} className={showExcelMenu ? "text-green-600" : "text-green-600 dark:text-green-400"} /> <span>Excel</span> <ChevronDown size={14} className={`transition-transform duration-300 ${showExcelMenu ? 'rotate-180' : ''}`}/>
                                        </button>
                                        {showExcelMenu && (
                                            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                                <div className="p-2 space-y-1">
                                                    <button onClick={() => handleExportarExcel(false)} className="w-full text-left px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg flex items-center gap-3 transition-colors group">
                                                        <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors"><DollarSign size={18} /></div>
                                                        <div><p className="text-sm font-bold text-gray-800 dark:text-white leading-tight">Completo</p><p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Com valores (R$)</p></div>
                                                    </button>
                                                    <button onClick={() => handleExportarExcel(true)} className="w-full text-left px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg flex items-center gap-3 transition-colors group">
                                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors"><Clock size={18} /></div>
                                                        <div><p className="text-sm font-bold text-gray-800 dark:text-white leading-tight">Apenas Horas</p><p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Para Canais e Parceiros</p></div>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* PDF Dropdown */}
                                    <div className="relative" ref={pdfMenuRef}>
                                        <button onClick={() => setShowPdfMenu(!showPdfMenu)} className={`flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${showPdfMenu ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-100 dark:ring-indigo-900/50' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300'}`} title="Opções de PDF">
                                            <FileText size={18} className={showPdfMenu ? "text-indigo-600" : "text-red-600 dark:text-red-400"} /> <span>PDF</span> <ChevronDown size={14} className={`transition-transform duration-300 ${showPdfMenu ? 'rotate-180' : ''}`}/>
                                        </button>
                                        {showPdfMenu && (
                                            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                                <div className="p-2 space-y-1">
                                                    <button onClick={() => handleGerarPDF(false)} className="w-full text-left px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg flex items-center gap-3 transition-colors group">
                                                        <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors"><DollarSign size={18} /></div>
                                                        <div><p className="text-sm font-bold text-gray-800 dark:text-white leading-tight">Relatório Completo</p><p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Inclui valores financeiros (R$)</p></div>
                                                    </button>
                                                    <button onClick={() => handleGerarPDF(true)} className="w-full text-left px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg flex items-center gap-3 transition-colors group">
                                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors"><Clock size={18} /></div>
                                                        <div><p className="text-sm font-bold text-gray-800 dark:text-white leading-tight">Apenas Horas</p><p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Para Canais e Parceiros</p></div>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <button onClick={handleEnviarEmail} disabled={emailEnviando} className={`flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${emailEnviando ? 'opacity-50 cursor-not-allowed' : ''}`} title="Enviar por Email">
                                        {emailEnviando ? 'Enviando...' : <><Mail size={18} className="text-blue-600 dark:text-blue-400" /> Enviar</>}
                                    </button>
                                </div>
                            </div>
                            
                            <div className="md:hidden">
                                <ServicesTable servicos={servicosFiltradosData} onStatusChange={alterarStatusRapido} onEdit={editarServico} onDelete={deletarServico} onSort={handleSort} sortConfig={sortConfig} filtrosConsultores={filtrosConsultores} setFiltrosConsultores={setFiltrosConsultores} isAdmin={['admin', 'dono', 'super_admin', 'gestor'].includes(userRole)} onDuplicate={handleDuplicateService} selectedIds={selectedIds} setSelectedIds={setSelectedIds} />
                            </div>
                            <div className="hidden md:block">
                                {viewMode === 'list' ? (
                                    <ServicesTable servicos={servicosFiltradosData} onStatusChange={alterarStatusRapido} onEdit={editarServico} onDelete={deletarServico} onSort={handleSort} sortConfig={sortConfig} filtrosConsultores={filtrosConsultores} setFiltrosConsultores={setFiltrosConsultores} isAdmin={['admin', 'dono', 'super_admin', 'gestor'].includes(userRole)} onDuplicate={handleDuplicateService} selectedIds={selectedIds} setSelectedIds={setSelectedIds} />
                                ) : (
                                    <div className="h-[600px]"><ServicesKanban servicos={servicosFiltradosData} onEditService={editarServico} onStatusChange={alterarStatusRapido} /></div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'clientes' && (
                        <div className="space-y-6">
                            <div className="flex flex-col gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Base de Clientes</h2>
                                    <div className="flex gap-2 md:gap-3">
                                        <button onClick={() => setMostrarInativos(!mostrarInativos)} className={`px-3 md:px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 transition-colors ${mostrarInativos ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`} title={mostrarInativos ? "Ocultar Inativos" : "Ver Inativos"}>
                                            {mostrarInativos ? <EyeOff size={18} /> : <Eye size={18} />}
                                            <span className="hidden md:inline">{mostrarInativos ? 'Ocultar Inativos' : 'Exibir Inativos'}</span>
                                        </button>
                                        <button onClick={() => { resetClienteForm(); setShowClienteModal(true); }} className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-3 md:px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center gap-2" title="Cadastrar Novo">
                                            <Plus size={18} /> <span className="hidden md:inline">Cadastrar</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <ClientsTable clientes={clientesParaTabela} onEdit={editarCliente} onDeleteClick={handleRequestInactivate} onReactivate={reativarCliente} onManageTeam={handleManageTeam} />
                        </div>
                    )}

                    {activeTab === 'demandas' && <DemandList userId={session?.user?.id} userRole={userRole} consultoriaId={profileData?.consultoria_id} showToast={showToast} />}
                    {activeTab === 'agenda' && <TeamCalendar userId={session?.user?.id} userRole={userRole} showToast={showToast} />}
                    {activeTab === 'admin-tenants' && <AdminTenants onViewDetails={(id) => setSelectedTenantId(id)} />}
                    {activeTab === 'admin-finance' && <AdminFinance />}
                    {activeTab === 'team' && <TeamManagement showToast={showToast} />}
                    {activeTab === 'admin-plans' && <AdminPlans />}
                    {activeTab === 'channels' && <ChannelsManagement userId={session?.user?.id} showToast={showToast} />}
                    {activeTab === 'reports' && <Reports />}
                </>
            )}
          </div>
        </main>
      </div>

      <AdminModal isOpen={!!selectedTenantId} onClose={() => setSelectedTenantId(null)} tenantId={selectedTenantId} />
      <ServiceModal isOpen={showModal} onClose={() => { setShowModal(false); setEditingService(null); resetForm(); }} onSave={salvarServico} onDelete={deletarServico} formData={formData} setFormData={setFormData} clientes={clientesAtivos} isEditing={!!editingService} />
      <ClientModal isOpen={showClienteModal} onClose={() => { setShowClienteModal(false); setEditingCliente(null); resetClienteForm(); }} onSave={salvarCliente} formData={clienteFormData} setFormData={setClienteFormData} isEditing={!!editingCliente} />
      <SolicitantesModal isOpen={showSolicitantesModal} onClose={() => { setShowSolicitantesModal(false); setClienteParaSolicitantes(null); }} cliente={clienteParaSolicitantes} userId={session?.user?.id} showToast={showToast} />
      <ConfigModal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} onSave={handleSaveConfig} profileData={profileData} userEmail={session?.user?.email} />
      
      <ConfirmModal isOpen={confirmModalOpen} onClose={() => setConfirmModalOpen(false)} onConfirm={confirmInactivation} title="Inativar Cliente?" message={`Deseja realmente inativar "${clientToInactivate?.nome}"? Ele ficará oculto das novas seleções, mas o histórico financeiro será mantido.`} confirmText="Sim, inativar" cancelText="Cancelar" type="danger" />

      <div className={`fixed top-6 right-6 w-96 max-w-xs px-6 py-3 rounded-xl shadow-lg text-white transform transition-all duration-500 z-[90] ${toast.visivel ? "translate-x-0 opacity-100" : "translate-x-24 opacity-0 pointer-events-none"} ${toast.tipo === 'sucesso' ? 'bg-green-600' : 'bg-red-600'}`}>
        {toast.mensagem}
      </div>

      {aviso.mensagem && (
        <div className={`fixed top-4 right-4 px-4 py-2 rounded shadow-lg text-white transition-all z-[90] pointer-events-auto ${aviso.tipo === "sucesso" ? "bg-green-600" : "bg-red-600"}`} onAnimationEnd={() => setAviso({ mensagem: "", tipo: "" })}>
          {aviso.mensagem}
        </div>
      )}
    </div>
  );
};
export default App;