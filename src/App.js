/* eslint-disable no-restricted-globals */
import gerarRelatorioPDF from "./utils/gerarRelatorioPDF";
import React, { useState, useEffect } from 'react';
import { Clock, DollarSign, User, FileText, Plus, Filter, Settings, Mail, Users, LayoutDashboard, Briefcase, Hourglass, Timer, CheckCircle, FileCheck, Building2, Menu, Eye, EyeOff } from 'lucide-react'; 
import supabase from './services/supabase'; 
import StatusCard from './components/StatusCard';
import ClientModal from './components/ClientModal';
import ServicesTable from './components/ServicesTable';
import ClientsTable from './components/ClientsTable';
import ServiceModal from './components/ServiceModal';
import Auth from './components/Auth';
import ConfigModal from './components/ConfigModal';
import DashboardCharts from './components/DashboardCharts';
import ConfirmModal from './components/ConfirmModal'; 
import AdminModal from './components/AdminModal'; 
import * as XLSX from 'xlsx';
import SolicitantesModal from './components/SolicitantesModal'; 
import MultiSelect from './components/MultiSelect'; 
import ChannelsModal from './components/ChannelsModal'; 
import Sidebar from './components/Sidebar'; 
import { formatCurrency, formatHours, formatHoursInt } from './utils/formatters'; 

const App = () => {
  // --- ESTADOS ---
  const [servicos, setServicos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [canais, setCanais] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showModal, setShowModal] = useState(false);
  const [emailEnviando, setEmailEnviando] = useState(false);
  const [toast, setToast] = useState({ mensagem: "", tipo: "", visivel: false });
  const [aviso, setAviso] = useState({ mensagem: "", tipo: "" });
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [editingCliente, setEditingCliente] = useState(null);
  const [session, setSession] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  
  // Estados para Inativação de Cliente
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [clientToInactivate, setClientToInactivate] = useState(null);
  const [mostrarInativos, setMostrarInativos] = useState(false); 

  // Estado para o Painel Admin (Botão Secreto)
  const [showAdminModal, setShowAdminModal] = useState(false);

  // CONFIGURAÇÕES GERAIS
  const [valorHoraPadrao, setValorHoraPadrao] = useState('150.00'); 
  const [nomeConsultor, setNomeConsultor] = useState(''); 

  const [showSolicitantesModal, setShowSolicitantesModal] = useState(false);
  const [clienteParaSolicitantes, setClienteParaSolicitantes] = useState(null);
  const [showChannelsModal, setShowChannelsModal] = useState(false);
  const [todosSolicitantesDoCliente, setTodosSolicitantesDoCliente] = useState([]); 
  const [sortConfig, setSortConfig] = useState({ key: 'data', direction: 'desc' });
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [filtros, setFiltros] = useState({
    canal: [], 
    cliente: [],
    status: [], 
    dataInicio: '',
    dataFim: '',
    solicitantes: []
  });

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
    observacoes: ''
  });

  const [clienteFormData, setClienteFormData] = useState({
    nome: '',
    email: '', 
    telefone: '',
    ativo: true
  });

  const statusConfig = {
    'Pendente': { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Hourglass, label: 'Pendente' },
    'Em aprovação': { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Timer, label: 'Em Aprovação' },
    'Aprovado': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: CheckCircle, label: 'Aprovado' },
    'NF Emitida': { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: FileCheck, label: 'NF Emitida' },
    'Pago': { color: 'bg-green-100 text-green-800 border-green-200', icon: DollarSign, label: 'Pago' }
  };

  useEffect(() => {
    const carregarSolicitantesFiltro = async () => {
      if (filtros.cliente.length === 0) {
        setTodosSolicitantesDoCliente([]);
        setFiltros(prev => ({ ...prev, solicitantes: [] })); 
        return;
      }
      
      if (filtros.cliente.length === 1) {
          const nomeCliente = filtros.cliente[0];
          const clienteObj = clientes.find(c => c.nome === nomeCliente);
          if (clienteObj) {
            const { data } = await supabase.from('solicitantes').select('nome').eq('cliente_id', clienteObj.id).order('nome', { ascending: true });
            if (data) setTodosSolicitantesDoCliente(data.map(s => s.nome));
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

  const carregarConfiguracao = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('chave, valor')
        .in('chave', ['valor_hora_padrao', 'nome_consultor']);

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
  };

  const salvarConfiguracao = async (novoValor, novoNome) => {
    try {
      setLoading(true);
      await supabase.from('configuracoes').upsert({ chave: 'valor_hora_padrao', valor: novoValor, user_id: session.user.id }, { onConflict: 'chave, user_id' });
      await supabase.from('configuracoes').upsert({ chave: 'nome_consultor', valor: novoNome, user_id: session.user.id }, { onConflict: 'chave, user_id' });
      setValorHoraPadrao(novoValor);
      setNomeConsultor(novoNome);
      setShowConfigModal(false);
      showToast('Configurações salvas!', 'sucesso');
    } catch (error) { console.error('Erro ao salvar config:', error); showToast('Erro ao salvar configuração.', 'erro'); } finally { setLoading(false); }
  };

  const carregarDados = async () => {
    try {
      const { data: dataServicos, error: errorServicos } = await supabase.from('servicos_prestados').select('*, canais(nome)').order('data', { ascending: false });
      if (errorServicos) throw errorServicos;
      setServicos(dataServicos);

      const { data: dataClientes, error: errorClientes } = await supabase.from('clientes').select('*').order('nome', { ascending: true });
      if (errorClientes) throw errorClientes;
      setClientes(dataClientes);

      const { data: dataCanais, error: errorCanais } = await supabase.from('canais').select('*').eq('ativo', true).order('nome', { ascending: true });
      if (!errorCanais) setCanais(dataCanais);

    } catch (error) { console.error('Erro dados:', error); alert('Erro ao carregar dados.'); }
  };

  useEffect(() => {
    getSession();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); });
    return () => { authListener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (session) { setLoading(true); carregarDados(); carregarConfiguracao(); setLoading(false); } 
    else { setServicos([]); setClientes([]); }
  }, [session]);

  // 🔴 AQUI ESTAVA O PROBLEMA: REMOVIDO O BLOCO QUE FAZIA LOGOUT NO REFRESH

  useEffect(() => {
    const algumModalAberto = showModal || showClienteModal || showSolicitantesModal || showConfigModal || showChannelsModal || showAdminModal;
    if (algumModalAberto) {
        if (window.location.hash !== '#modal') window.history.pushState({ type: 'modal' }, '', '#modal');
    } else if (activeTab !== 'dashboard') {
        if (window.location.hash !== `#${activeTab}`) window.history.pushState({ type: 'tab' }, '', `#${activeTab}`);
    }
    const handlePopState = () => {
      if (showModal || showClienteModal || showSolicitantesModal || showConfigModal || showChannelsModal || showAdminModal) {
        setShowModal(false); setShowClienteModal(false); setShowSolicitantesModal(false); setShowConfigModal(false); setShowChannelsModal(false); setShowAdminModal(false);
        return;
      }
      if (activeTab !== 'dashboard') setActiveTab('dashboard');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTab, showModal, showClienteModal, showSolicitantesModal, showConfigModal, showChannelsModal, showAdminModal]);

  const salvarServico = async () => {
    try {
      let error;
      if (editingService) {
        const { error: updateError } = await supabase.from('servicos_prestados').update(formData).eq('id', editingService.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('servicos_prestados').insert([{...formData, user_id: session.user.id }]);
        error = insertError;
      }
      if (error) throw error;
      showToast(editingService ? 'Serviço atualizado!' : 'Serviço cadastrado!', 'sucesso');
      setShowModal(false); setEditingService(null); resetForm(); carregarDados();
    } catch (error) { console.error('Erro ao salvar:', error); showToast('Erro ao salvar serviço: ' + error.message, 'erro'); }
  };

  const deletarServico = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;
    try {
      const { error } = await supabase.from('servicos_prestados').delete().eq('id', id);
      if (error) throw error;
      showToast('Serviço excluído!', 'sucesso'); carregarDados();
    } catch (error) { console.error('Erro deletar:', error); showToast('Erro ao excluir serviço!', 'erro'); }
  };

  const alterarStatusRapido = async (id, novoStatus) => {
    try {
      const { error } = await supabase.from('servicos_prestados').update({ status: novoStatus }).eq('id', id);
      if (error) throw error; carregarDados();
    } catch (error) { console.error('Erro status:', error); alert('Erro ao alterar status!'); }
  };

  // --- CLIENTES: SALVAR ---
  const salvarCliente = async () => {
    if (!clienteFormData.nome.trim()) { showToast('Nome do cliente é obrigatório!', 'erro'); return; }
    try {
      setLoading(true);
      let clienteSalvo = null; 
      if (editingCliente) {
        const { error } = await supabase.from('clientes').update(clienteFormData).eq('id', editingCliente.id);
        if (error) throw error;
        showToast('Cliente atualizado!', 'sucesso');
      } else {
        const { data, error } = await supabase.from('clientes').insert([{...clienteFormData, user_id: session.user.id }]).select().single();
        if (error) throw error;
        clienteSalvo = data;
        showToast('Cliente criado! Cadastre a equipe agora.', 'sucesso');
      }
      setShowClienteModal(false); setEditingCliente(null); resetClienteForm(); await carregarDados(); 
      if (clienteSalvo) { setTimeout(() => { handleManageTeam(clienteSalvo); }, 500); }
    } catch (error) { console.error('Erro ao salvar cliente:', error); showToast('Erro ao salvar cliente!', 'erro'); } finally { setLoading(false); }
  };

  // --- CLIENTES: INATIVAR (Prepara o modal) ---
  const handleRequestInactivate = (cliente) => {
    setClientToInactivate(cliente);
    setConfirmModalOpen(true);
  };

  // --- CLIENTES: CONFIRMAR INATIVAÇÃO (Ação do Modal) ---
  const confirmInactivation = async () => {
    if (!clientToInactivate) return;
    try {
      const { error } = await supabase.from('clientes').update({ ativo: false }).eq('id', clientToInactivate.id);
      if (error) throw error;
      showToast('Cliente inativado e oculto da lista.', 'sucesso');
      carregarDados();
    } catch (error) { console.error('Erro deletar:', error); showToast('Erro ao inativar cliente!', 'erro'); }
  };

  // --- CLIENTES: REATIVAR ---
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

  const handleGerarPDF = () => {
    const dadosParaRelatorio = servicosFiltrados(); 
    const nomeParaRelatorio = nomeConsultor || session?.user?.email || 'Consultor';
    const pdfBlob = gerarRelatorioPDF(dadosParaRelatorio, filtros, nomeParaRelatorio);
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "relatorio-servicos.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportarExcel = () => {
    const dados = servicosFiltradosData.map(s => ({ Data: new Date(s.data + 'T00:00:00').toLocaleDateString('pt-BR'), Canal: s.canais?.nome || 'Direto', Cliente: s.cliente, Atividade: s.atividade, 'Qtd Horas': parseFloat(s.qtd_horas).toFixed(2).replace('.', ','), 'Valor Total': parseFloat(s.valor_total).toFixed(2).replace('.', ','), Status: s.status, Solicitante: s.solicitante || '-', 'Nota Fiscal': s.numero_nfs || '-' }));
    const ws = XLSX.utils.json_to_sheet(dados); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Serviços"); XLSX.writeFile(wb, `Relatorio_Servicos_${new Date().toISOString().split('T')[0]}.xlsx`); showToast('Planilha Excel gerada com sucesso!', 'sucesso');
  };

  const handleEnviarEmail = async () => {
    if (!filtros.cliente || filtros.cliente.length === 0) { showToast("Selecione um cliente no filtro.", "erro"); return; }
    const nomeClienteAlvo = filtros.cliente[0];
    const clienteSelecionado = clientes.find(c => c.nome === nomeClienteAlvo);
    
    if (!clienteSelecionado) { showToast("Cliente não encontrado.", "erro"); return; }
    if (servicosFiltradosData.length === 0) { showToast("Não há serviços listados para enviar.", "erro"); return; }

    setEmailEnviando(true);
    try {
      const { data: todosSolicitantes, error } = await supabase.from('solicitantes').select('*').eq('cliente_id', clienteSelecionado.id);
      if (error) throw error;
      
      const pacotesDeEnvio = {};
      let servicosSemDestino = 0;

      servicosFiltradosData.forEach(servico => {
        if (servico.cliente !== clienteSelecionado.nome) return;

        let emailDestino = null;
        let emailCC = null;

        const solicitanteEncontrado = todosSolicitantes.find(s => s.nome.trim().toLowerCase() === (servico.solicitante || '').trim().toLowerCase());

        if (solicitanteEncontrado) {
          if (solicitanteEncontrado.coordenador_id) {
            const chefe = todosSolicitantes.find(s => s.id === solicitanteEncontrado.coordenador_id);
            if (chefe && chefe.email) {
              emailDestino = chefe.email;
              if (solicitanteEncontrado.email) emailCC = solicitanteEncontrado.email;
            }
          } else if (solicitanteEncontrado.email) {
            emailDestino = solicitanteEncontrado.email;
          }
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
        showToast(`Enviando para ${emailDestino}...`, "sucesso");

        const nomeParaRelatorio = nomeConsultor || session?.user?.email || 'Consultor';
        const pdfBlob = gerarRelatorioPDF(pacote.servicos, filtros, nomeParaRelatorio);
        
        if (!pdfBlob) throw new Error("Falha ao gerar PDF");
        const pdfBase64 = await blobToBase64(pdfBlob);
        
        console.log("📨 ENVIO:", { Para: emailDestino, CC: listaCCs, Qtd: pacote.servicos.length });
        
        const response = await fetch("/api/enviar-email", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailDestino, cc: listaCCs, nomeCliente: clienteSelecionado.nome, pdfBase64: pdfBase64, periodo: filtros.dataInicio ? `${new Date(filtros.dataInicio).toLocaleDateString()} a ...` : 'Período Geral' })
        });

        if (response.ok) enviados++;
      }

      if (servicosSemDestino > 0) { showToast(`Sucesso! ${enviados} emails enviados. (${servicosSemDestino} itens sem contato ignorados)`, "sucesso"); } 
      else { showToast(`Sucesso Total! ${enviados} email(s) enviados.`, "sucesso"); }

    } catch (error) { console.error("Erro:", error); showToast("Erro no processo de envio.", "erro"); } finally { setEmailEnviando(false); }
  };
  
  const resetForm = () => { 
    setFormData({ 
      data: new Date().toISOString().split('T')[0], 
      hora_inicial: '09:00', 
      hora_final: '18:00', 
      valor_hora: parseFloat(valorHoraPadrao || '0').toFixed(2), 
      atividade: '', 
      solicitante: '', 
      cliente: '', 
      canal_id: '', 
      status: 'Pendente', 
      numero_nfs: '', 
      observacoes: '' 
    }); 
  };
  const resetClienteForm = () => { setClienteFormData({ nome: '', email: '', telefone: '', ativo: true }); };
  const editarServico = (servico) => { 
    setEditingService(servico); 
    setFormData({
      data: servico.data,
      hora_inicial: servico.hora_inicial,
      hora_final: servico.hora_final,
      valor_hora: servico.valor_hora,
      atividade: servico.atividade,
      solicitante: servico.solicitante || '',
      cliente: servico.cliente,
      canal_id: servico.canal_id || '', 
      status: servico.status,
      numero_nfs: servico.numero_nfs || '',
      observacoes: servico.observacoes || ''
    });
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
      if (filtros.solicitantes && filtros.solicitantes.length > 0) { const solNome = (s.solicitante || '').trim(); if (!filtros.solicitantes.includes(solNome)) return false; }
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

  const servicosFiltradosData = servicosFiltrados(); 
  const stats = {
    totalHoras: servicosFiltradosData.reduce((sum, s) => sum + parseFloat(s.qtd_horas || 0), 0),
    totalValor: servicosFiltradosData.reduce((sum, s) => sum + parseFloat(s.valor_total || 0), 0),
    totalServicos: servicosFiltradosData.length,
    porStatus: servicosFiltradosData.reduce((acc, s) => { if (!acc[s.status]) { acc[s.status] = { count: 0, valor: 0 }; } acc[s.status].count += 1; acc[s.status].valor += parseFloat(s.valor_total || 0); return acc; }, {})
  };

  if (loading && !session) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-600"></div></div>;
  if (!session) return <Auth />;

  const opcoesCanais = ['Direto', ...canais.map(c => c.nome)];
  const opcoesClientes = clientes.map(c => c.nome);
  const opcoesStatus = ['Pendente', 'Em aprovação', 'Aprovado', 'NF Emitida', 'Pago'];

  const clientesAtivos = clientes.filter(c => c.ativo !== false); 
  const clientesParaTabela = mostrarInativos ? clientes : clientesAtivos;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onLogout={handleLogout}
        onOpenConfig={() => setShowConfigModal(true)}
        onOpenChannels={() => setShowChannelsModal(true)}
        userEmail={session?.user?.email}
        onOpenAdmin={() => setShowAdminModal(true)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              {activeTab === 'dashboard' && <><LayoutDashboard className="text-indigo-600" /> Dashboard</>}
              {activeTab === 'servicos' && <><Briefcase className="text-indigo-600" /> Meus Serviços</>}
              {activeTab === 'clientes' && <><Users className="text-indigo-600" /> Clientes</>}
            </h1>
          </div>
          <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all duration-200 hover:scale-105 active:scale-95 text-sm font-bold shadow-md shadow-indigo-200">
            <Plus size={18} /><span className="hidden sm:inline">Novo Serviço</span>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto animate-fade-in-up pb-10">
            {loading ? (
              <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div><p className="mt-4 text-gray-600">Carregando Dados...</p></div>
            ) : activeTab === 'dashboard' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                  <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2"><div className="p-2 md:p-3 bg-indigo-50 rounded-xl"><Clock className="text-indigo-600" size={20} /></div></div>
                    <div><p className="text-sm md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Horas</p><p className="text-xl md:text-2xl font-black text-gray-900">{formatHoursInt(stats.totalHoras)}</p></div>
                  </div>
                  <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2"><div className="p-2 md:p-3 bg-green-50 rounded-xl"><DollarSign className="text-green-600" size={20} /></div></div>
                    <div><p className="text-sm md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total</p><p className="text-xl md:text-2xl font-black text-gray-900 truncate" title={formatCurrency(stats.totalValor)}><span className="text-base md:text-2xl">{formatCurrency(stats.totalValor).split(' ')[0]}</span> {formatCurrency(stats.totalValor).split(' ')[1]}</p></div>
                  </div>
                  <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2"><div className="p-2 md:p-3 bg-blue-50 rounded-xl"><FileText className="text-blue-600" size={20} /></div></div>
                    <div><p className="text-sm md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Serviços</p><p className="text-xl md:text-2xl font-black text-gray-900">{stats.totalServicos}</p></div>
                  </div>
                  <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2"><div className="p-2 md:p-3 bg-purple-50 rounded-xl"><Users className="text-purple-600" size={20} /></div></div>
                    <div><p className="text-sm md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Clientes</p><p className="text-xl md:text-2xl font-black text-gray-900">{clientesAtivos.length}</p></div>
                  </div>
                </div>
                <DashboardCharts servicos={servicosFiltradosData} />
                <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-800 mb-6">Status dos Serviços</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {Object.entries(stats.porStatus || {}).map(([status, dados]) => {
                      const config = statusConfig[status] || statusConfig['Pendente'];
                      return <StatusCard key={status} status={status} count={dados.count} valor={dados.valor} color={config.color} icon={config.icon} />;
                    })}
                  </div>
                </div>
              </div>
            ) : activeTab === 'servicos' ? (
              <div className="space-y-6">
                
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                  <div className="flex items-center gap-2 text-gray-800 font-bold mb-2">
                    <Filter size={20} className="text-indigo-600" /> Filtros Avançados
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    
                    <MultiSelect options={opcoesCanais} selected={filtros.canal} onChange={(novos) => setFiltros({...filtros, canal: novos})} placeholder="Canais..." />
                    
                    <MultiSelect options={opcoesClientes} selected={filtros.cliente} onChange={(novos) => setFiltros({...filtros, cliente: novos})} placeholder="Clientes..." />
                    
                    <MultiSelect options={todosSolicitantesDoCliente} selected={filtros.solicitantes} onChange={(novos) => setFiltros({...filtros, solicitantes: novos})} placeholder={filtros.cliente.length === 1 ? "Solicitantes..." : (filtros.cliente.length > 1 ? "Selecione 1 Cliente" : "Selecione Cliente")} />
                    
                    <MultiSelect options={opcoesStatus} selected={filtros.status} onChange={(novos) => setFiltros({...filtros, status: novos})} placeholder="Status..." />
                    
                    <div className="relative">
                        <label className="text-[10px] uppercase font-bold text-gray-400 absolute top-1 left-3">Data Inicial</label>
                        <input type="date" value={filtros.dataInicio} onChange={(e) => setFiltros({...filtros, dataInicio: e.target.value})} className="border border-gray-200 rounded-lg px-3 pb-2 pt-5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full h-[46px]" />
                    </div>
                    
                    <div className="relative">
                        <label className="text-[10px] uppercase font-bold text-gray-400 absolute top-1 left-3">Data Final</label>
                        <input type="date" value={filtros.dataFim} onChange={(e) => setFiltros({...filtros, dataFim: e.target.value})} className="border border-gray-200 rounded-lg px-3 pb-2 pt-5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full h-[46px]" />
                    </div>

                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-3">
                  <button onClick={handleExportarExcel} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors" title="Exportar Excel"><FileText size={18} className="text-green-600" /> Excel</button>
                  <button onClick={handleGerarPDF} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors" title="Gerar PDF"><FileText size={18} className="text-red-600" /> PDF</button>
                  <button onClick={async () => { setEmailEnviando(true); try { await handleEnviarEmail(); } catch { setToast({ mensagem: "Erro inesperado!", tipo: "erro", visivel: true }); } setEmailEnviando(false); setTimeout(() => setToast(prev => ({ ...prev, visivel: false })), 3000); }} disabled={emailEnviando} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-white ${emailEnviando ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"}`}>{emailEnviando ? <Clock size={18} className="animate-spin" /> : <Mail size={18} />} {emailEnviando ? "Enviando..." : "Enviar p/ Cliente"}</button>
                </div>

                <ServicesTable servicos={servicosFiltradosData} onStatusChange={alterarStatusRapido} onEdit={editarServico} onDelete={deletarServico} onSort={handleSort} sortConfig={sortConfig} /> 
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h2 className="text-lg font-bold text-gray-800">Base de Clientes</h2>
                  <div className="flex gap-2 md:gap-3">
                    <button 
                      onClick={() => setMostrarInativos(!mostrarInativos)}
                      className={`px-3 md:px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 transition-colors ${mostrarInativos ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                      title={mostrarInativos ? "Ocultar Inativos" : "Ver Inativos"}
                    >
                      {mostrarInativos ? <EyeOff size={18} /> : <Eye size={18} />}
                      <span className="hidden md:inline">{mostrarInativos ? 'Ocultar Inativos' : 'Exibir Inativos'}</span>
                    </button>

                    <button 
                        onClick={() => { resetClienteForm(); setShowClienteModal(true); }} 
                        className="bg-indigo-50 text-indigo-700 px-3 md:px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors flex items-center gap-2"
                        title="Cadastrar Novo"
                    >
                        <Plus size={18} /> 
                        <span className="hidden md:inline">Cadastrar</span>
                    </button>
                  </div>
                </div>
                
                <ClientsTable 
                    clientes={clientesParaTabela} 
                    onEdit={editarCliente} 
                    onDeleteClick={handleRequestInactivate} 
                    onReactivate={reativarCliente} 
                    onManageTeam={handleManageTeam} 
                />
              </div>
            )}
          </div>
        </main>
      </div>

      <ServiceModal 
        isOpen={showModal} 
        onClose={() => { setShowModal(false); setEditingService(null); resetForm(); }} 
        onSave={salvarServico} 
        formData={formData} 
        setFormData={setFormData} 
        clientes={clientesAtivos} 
        isEditing={!!editingService} 
      />
      
      <ClientModal isOpen={showClienteModal} onClose={() => { setShowClienteModal(false); setEditingCliente(null); resetClienteForm(); }} onSave={salvarCliente} formData={clienteFormData} setFormData={setClienteFormData} isEditing={!!editingCliente} />
      
      <SolicitantesModal 
        isOpen={showSolicitantesModal} 
        onClose={() => { setShowSolicitantesModal(false); setClienteParaSolicitantes(null); }} 
        cliente={clienteParaSolicitantes} 
        userId={session?.user?.id} 
        showToast={showToast} 
      />
      
      <ConfigModal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} onSave={salvarConfiguracao} valorAtual={valorHoraPadrao} nomeAtual={nomeConsultor} />
      <ChannelsModal isOpen={showChannelsModal} onClose={() => setShowChannelsModal(false)} userId={session?.user?.id} />
      
      <AdminModal 
        isOpen={showAdminModal} 
        onClose={() => setShowAdminModal(false)} 
        userEmail={session?.user?.email} 
      />

      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={confirmInactivation}
        title="Inativar Cliente?"
        message={`Deseja realmente inativar "${clientToInactivate?.nome}"? Ele ficará oculto das novas seleções, mas o histórico financeiro será mantido.`}
        confirmText="Sim, inativar"
        cancelText="Cancelar"
        type="danger"
      />

      <div className={`fixed top-6 right-6 w-96 max-w-xs px-6 py-3 rounded-xl shadow-lg text-white transform transition-all duration-500 z-[90] 
        ${toast.visivel ? "translate-x-0 opacity-100" : "translate-x-24 opacity-0 pointer-events-none"} 
        ${toast.tipo === 'sucesso' ? 'bg-green-600' : 'bg-red-600'}`}
      >
        {toast.mensagem}
      </div>

      {aviso.mensagem && (
        <div className={`fixed top-4 right-4 px-4 py-2 rounded shadow-lg text-white transition-all z-[90] pointer-events-auto
          ${aviso.tipo === "sucesso" ? "bg-green-600" : "bg-red-600"}`} 
          onAnimationEnd={() => setAviso({ mensagem: "", tipo: "" })}
        >
          {aviso.mensagem}
        </div>
      )}
    </div>
  );
};
export default App;