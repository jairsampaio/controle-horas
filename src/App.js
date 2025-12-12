/* eslint-disable no-restricted-globals */
import gerarRelatorioPDF from "./utils/gerarRelatorioPDF";
import React, { useState, useEffect } from 'react';
import { Clock, DollarSign, User, FileText, Plus, Filter, Settings, Mail, Users, LayoutDashboard, Briefcase } from 'lucide-react';
import supabase from './services/supabase'; // 
import StatusCard from './components/StatusCard';
import ClientModal from './components/ClientModal';
import ServicesTable from './components/ServicesTable';
import ClientsTable from './components/ClientsTable';
import ServiceModal from './components/ServiceModal';
import Auth from './components/Auth';
import ConfigModal from './components/ConfigModal';
import DashboardCharts from './components/DashboardCharts';
import * as XLSX from 'xlsx';

const App = () => {
  // --- ESTADOS ---
  const [servicos, setServicos] = useState([]);
  const [clientes, setClientes] = useState([]);
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
  const [valorHoraPadrao, setValorHoraPadrao] = useState('150.00'); // Começa com 150 fixo até carregar do banco
  
  const [filtros, setFiltros] = useState({
    cliente: '',
    status: '',
    dataInicio: '',
    dataFim: ''
  });

  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    hora_inicial: '09:00',
    hora_final: '18:00',
    valor_hora: '120.00',
    atividade: '',
    solicitante: '',
    cliente: '',
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

  // --- CONFIGURAÇÃO DE CORES DOS STATUS ---
  const statusConfig = {
    'Pendente': { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: '⏳', label: 'Pendente' },
    'Em aprovação': { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: '⏱️', label: 'Em Aprovação' },
    'Aprovado': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '✅', label: 'Aprovado' },
    'NF Emitida': { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '📄', label: 'NF Emitida' },
    'Pago': { color: 'bg-green-100 text-green-800 border-green-200', icon: '💰', label: 'Pago' }
  };


// --- FUNÇÕES DE BANCO DE DADOS (SUPABASE V2) ---

  const getSession = async () => {
    setLoading(true);
    // Busca o estado de autenticação do Supabase
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Erro ao buscar sessão:', error);
      alert('Erro de autenticação!');
    }
    setSession(session);
    setLoading(false);
  };

  // --- FUNÇÕES DE CONFIGURAÇÃO ---

  const carregarConfiguracao = async () => {
    try {
      // Busca a configuração onde a chave é 'valor_hora_padrao'
      const { data, error } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'valor_hora_padrao')
        .single();

      if (error && error.code !== 'PGRST116') { // Ignora erro se não existir ainda
        console.error('Erro ao carregar config:', error);
      }

      if (data) {
        setValorHoraPadrao(data.valor);
      }
    } catch (error) {
      console.error('Erro config:', error);
    }
  };

  const salvarConfiguracao = async (novoValor) => {
    try {
      setLoading(true);
      
      // Verifica se já existe para decidir se faz Update ou Insert
      // O jeito mais fácil no Supabase é deletar a antiga e criar a nova (ou usar upsert), 
      // mas vamos usar a lógica de consulta simples para garantir.
      
      const { data: existente } = await supabase
        .from('configuracoes')
        .select('id')
        .eq('chave', 'valor_hora_padrao')
        .single();

      let error;

      if (existente) {
        // Atualiza
        const { error: updateError } = await supabase
          .from('configuracoes')
          .update({ valor: novoValor })
          .eq('chave', 'valor_hora_padrao');
        error = updateError;
      } else {
        // Cria (Insert)
        const { error: insertError } = await supabase
          .from('configuracoes')
          .insert([{ 
            chave: 'valor_hora_padrao', 
            valor: novoValor,
            user_id: session.user.id 
          }]);
        error = insertError;
      }

      if (error) throw error;

      setValorHoraPadrao(novoValor);
      setShowConfigModal(false);
      showToast('Configuração salva!', 'sucesso');

    } catch (error) {
      console.error('Erro ao salvar config:', error);
      showToast('Erro ao salvar configuração.', 'erro');
    } finally {
      setLoading(false);
    }
  };

  const carregarDados = async () => {
    try {
      // 1. Buscar Serviços (Ordenado por data decrescente)
      const { data: dataServicos, error: errorServicos } = await supabase
        .from('servicos_prestados')
        .select('*')
        .order('data', { ascending: false });

      if (errorServicos) throw errorServicos;
      setServicos(dataServicos);

      // 2. Buscar Clientes (Ordenado por nome)
      const { data: dataClientes, error: errorClientes } = await supabase
        .from('clientes')
        .select('*')
        .order('nome', { ascending: true });

      if (errorClientes) throw errorClientes;
      setClientes(dataClientes);
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados do sistema.');
    }
  };

  // Carrega a sessão na montagem e monitora mudanças de estado
  useEffect(() => {
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );
    
    return () => {
      authListener.subscription.unsubscribe();
    };

  }, []); // Roda apenas na montagem

  // Recarrega os dados SEMPRE que a sessão for estabelecida
  useEffect(() => {
    if (session) {
      setLoading(true);
      carregarDados();
      carregarConfiguracao();
      setLoading(false);
    } else {
      // Limpa os dados se fizer logout
      setServicos([]);
      setClientes([]);
    }
  }, [session]); // Roda quando a sessão muda (login/logout)

  
    // src/App.js (Substitua todo o bloco 'Força o Logout ao fechar a aba...')

    // --- NOVO: Força o Logout ao fechar a aba do navegador ---
    useEffect(() => {
        // Só ativa o monitoramento se houver uma sessão ativa
        if (session) {
            const handleBeforeUnload = (e) => { // NÃO PRECISA SER ASYNC
                // 1. Tenta o logout (se a rede permitir a requisição rápida)
                supabase.auth.signOut(); 
                
                // 2. GARANTIA: Limpa todo o Local Storage.
                // Isso força o app a não encontrar o token de sessão na próxima carga.
                localStorage.clear(); 
                
                // Remove o aviso de confirmação do navegador, pois já temos o confirm() feio
                delete e.returnValue; 
            };

            // Adiciona o listener ao objeto Window
            window.addEventListener('beforeunload', handleBeforeUnload);

            // Remove o listener quando o componente for desmontado
            return () => {
                window.removeEventListener('beforeunload', handleBeforeUnload);
            };
        }
    }, [session]); // Roda sempre que a sessão mudar

  const salvarServico = async () => {
    try {
      let error;
      
      if (editingService) {
        // ATUALIZAR (UPDATE)
        const { error: updateError } = await supabase
          .from('servicos_prestados')
          .update(formData)
          .eq('id', editingService.id);
        error = updateError;
      } else {
        // CRIAR NOVO (INSERT)
        const { error: insertError } = await supabase
          .from('servicos_prestados')
          .insert([{...formData, user_id: session.user.id }]);
        error = insertError;
      }

      if (error) throw error;

      //alert(editingService ? 'Serviço atualizado!' : 'Serviço cadastrado!');
      showToast(editingService ? 'Serviço atualizado!' : 'Serviço cadastrado!', 'sucesso');
      setShowModal(false);
      setEditingService(null);
      resetForm();
      carregarDados();

    } catch (error) {
      console.error('Erro ao salvar:', error);
      //alert('Erro ao salvar serviço: ' + error.message);
      showToast('Erro ao salvar serviço: ' + error.message, 'erro');
    }
  };

  const deletarServico = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;
    // Dentro de deletarServico:
     
    
    try {
      const { error } = await supabase
        .from('servicos_prestados')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      //alert('Serviço excluído!');
      showToast('Serviço excluído!', 'sucesso');
      carregarDados();
    } catch (error) {
      console.error('Erro ao deletar:', error);
      //alert('Erro ao excluir serviço!');
      showToast('Erro ao excluir serviço!', 'erro');
    }
  };

  const alterarStatusRapido = async (id, novoStatus) => {
    try {
      const { error } = await supabase
        .from('servicos_prestados')
        .update({ status: novoStatus })
        .eq('id', id);

      if (error) throw error;
      carregarDados();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      alert('Erro ao alterar status!');
    }
  };

  const salvarCliente = async () => {
    //if (!clienteFormData.nome.trim()) {
      //alert('Nome do cliente é obrigatório!');
      //return;
    //}
    if (!clienteFormData.nome.trim()) { 
    showToast('Nome do cliente é obrigatório!', 'erro');
    return; 
    }

    try {
      let error;

      if (editingCliente) {
        // ATUALIZAR CLIENTE
        const { error: updateError } = await supabase
          .from('clientes')
          .update(clienteFormData)
          .eq('id', editingCliente.id);
        error = updateError;
      } else {
        // CRIAR CLIENTE
        const { error: insertError } = await supabase
          .from('clientes')
          .insert([{...clienteFormData, user_id: session.user.id }]);
        error = insertError;
      }

      if (error) throw error;

      //alert(editingCliente ? 'Cliente atualizado!' : 'Cliente cadastrado!');
      showToast(editingCliente ? 'Cliente atualizado!' : 'Cliente cadastrado!', 'sucesso');
      setShowClienteModal(false);
      setEditingCliente(null);
      resetClienteForm();
      carregarDados();

    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      //alert('Erro ao salvar cliente!');
      showToast('Erro ao salvar cliente!', 'erro');
    }
  };

  const deletarCliente = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

    
    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      //alert('Cliente excluído!');
      showToast('Cliente excluído!', 'sucesso');
      carregarDados();
    } catch (error) {
      console.error('Erro ao deletar:', error);
      //alert('Erro ao excluir cliente!');
      showToast('Erro ao excluir cliente!', 'erro');
    }
  };

  // Funções utilitárias de Autenticação
  const handleLogout = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error(error);
    } else {
      setSession(null); // Limpa a sessão localmente
      // Os dados serão limpos no useEffect
    }
    setLoading(false);
  };

  // --- FUNÇÕES DE FORMULÁRIO E UTILITÁRIOS ---
      // 2. Converte Blob para Base64 (Texto)
    const blobToBase64 = (blob) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    };
    // src/App.js (Na seção de utilitários)

    // Função auxiliar para exibir o Toast e fazê-lo sumir automaticamente
    const showToast = (mensagem, tipo = 'sucesso') => {
      setToast({ visivel: true, mensagem: mensagem, tipo: tipo });
      setTimeout(() => {
        setToast(prev => ({ ...prev, visivel: false }));
      }, 3000); // Esconde após 3 segundos
    };

  const handleGerarPDF = () => {
    const dadosParaRelatorio = servicosFiltrados(); // Usa a função de filtro
    const pdfBlob = gerarRelatorioPDF(dadosParaRelatorio, filtros);
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "relatorio-servicos.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  // src/App.js (Na seção de Utilitários)

const handleExportarExcel = () => {
  // 1. Pega os dados filtrados (o que o usuário está vendo na tabela)
  const dados = servicosFiltradosData.map(s => ({
    Data: new Date(s.data + 'T00:00:00').toLocaleDateString('pt-BR'),
    Cliente: s.cliente,
    Atividade: s.atividade,
    'Qtd Horas': parseFloat(s.qtd_horas).toFixed(2).replace('.', ','),
    'Valor Total': parseFloat(s.valor_total).toFixed(2).replace('.', ','),
    Status: s.status,
    Solicitante: s.solicitante || '-',
    'Nota Fiscal': s.numero_nfs || '-'
  }));

  // 2. Cria uma Planilha (Worksheet)
  const ws = XLSX.utils.json_to_sheet(dados);

  // 3. Cria um Livro (Workbook) e adiciona a planilha
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Serviços");

  // 4. Gera o arquivo e força o download
  XLSX.writeFile(wb, `Relatorio_Servicos_${new Date().toISOString().split('T')[0]}.xlsx`);

  showToast('Planilha Excel gerada com sucesso!', 'sucesso');
};

  const handleEnviarEmail = async () => {
    if (!filtros.cliente) {
      alert("Selecione um cliente antes de enviar o e-mail!");
      return;
    }

    const clienteSelecionado = clientes.find(c => c.nome === filtros.cliente);
    if (!clienteSelecionado || !clienteSelecionado.email) {
      alert("O cliente selecionado não possui e-mail cadastrado!");
      return;
    }

    // 1. Gera o PDF (igual você já fazia)
    const dadosParaRelatorio = servicosFiltrados();
    const pdfBlob = gerarRelatorioPDF(dadosParaRelatorio, filtros);

    try {
      const pdfBase64 = await blobToBase64(pdfBlob);

      // 3. Envia para a API da Vercel (JSON simples)
      const response = await fetch("/api/enviar-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: clienteSelecionado.email,
          nomeCliente: clienteSelecionado.nome,
          pdfBase64: pdfBase64
        })
      });

      if (response.ok) {
        setToast({ visivel: true, mensagem: "Email enviado com sucesso! 📧", tipo: "sucesso" });
      } else {
        const errorData = await response.json();
        setToast({ visivel: true, mensagem: "Erro: " + (errorData.error || "Falha no envio"), tipo: "erro" });
      }

    } catch (error) {
      console.error("Erro técnico:", error);
      setToast({ visivel: true, mensagem: "Erro de conexão ao enviar email.", tipo: "erro" });
    }
  };
  
  const resetForm = () => {
    setFormData({
      data: new Date().toISOString().split('T')[0],
      hora_inicial: '09:00',
      hora_final: '18:00',
      valor_hora: parseFloat(valorHoraPadrao || '0').toFixed(2), // 👈 AQUI! Usa a variável do estado em vez de fixo
      atividade: '',
      solicitante: '',
      cliente: '',
      status: 'Pendente',
      numero_nfs: '',
      observacoes: ''
    });
  };

  const resetClienteForm = () => {
    setClienteFormData({
      nome: '',
      email: '',
      telefone: '',
      ativo: true
    });
  };

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
      status: servico.status,
      numero_nfs: servico.numero_nfs || '',
      observacoes: servico.observacoes || ''
    });
    setShowModal(true);
  };

  const editarCliente = (cliente) => {
    setEditingCliente(cliente);
    setClienteFormData({
      nome: cliente.nome,
      email: cliente.email || '',
      telefone: cliente.telefone || '',
      ativo: cliente.ativo
    });
    setShowClienteModal(true);
  };

  // Função auxiliar para filtrar (usada no render e no PDF)
  const servicosFiltrados = () => {
    return servicos.filter(s => {
      if (filtros.cliente && s.cliente !== filtros.cliente) return false;
      if (filtros.status && s.status !== filtros.status) return false;
      if (filtros.dataInicio && s.data < filtros.dataInicio) return false;
      if (filtros.dataFim && s.data > filtros.dataFim) return false;
      return true;
    });
  };

  const servicosFiltradosData = servicosFiltrados(); // Executa o filtro para usar na tela

  // Cálculos do Dashboard
  const stats = {
    totalHoras: servicosFiltradosData.reduce((sum, s) => sum + parseFloat(s.qtd_horas || 0), 0),
    totalValor: servicosFiltradosData.reduce((sum, s) => sum + parseFloat(s.valor_total || 0), 0),
    totalServicos: servicosFiltradosData.length,
    porStatus: servicosFiltradosData.reduce((acc, s) => {
      if (!acc[s.status]) {
        acc[s.status] = { count: 0, valor: 0 };
      }
      acc[s.status].count += 1;
      acc[s.status].valor += parseFloat(s.valor_total || 0);
      return acc;
    }, {})
  };

  // src/App.js (Substituir a partir de // --- RENDERIZAÇÃO (JSX) ---)

// --- RENDERIZAÇÃO (JSX) ---

  // Componente interno para o botão Sair
  const LogoutButton = () => (
    <button
      onClick={handleLogout}
      className="bg-red-500 text-white px-3 py-2 text-sm rounded-lg flex items-center gap-1 hover:bg-red-600 transition hover:scale-105 active:scale-95"
    >
      Sair
    </button>
  );

  // 1. Se a sessão ainda não foi verificada (loading), mostra o loader.
  if (loading && !session) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // 2. Se a sessão foi verificada e não existe, mostra a tela de login.
  if (!session) {
    return <Auth />;
  }

  // 3. Se a sessão existe (usuário logado), mostra o App completo.
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Controle de Horas</h1>
              <p className="text-sm text-gray-500">Gerencie seus serviços prestados</p>
            </div>
            <div className='flex items-center gap-2'> {/* Diminuí o gap para caber melhor no mobile */}
              
              {/* Botão de Configurações (Aparece só o ícone no mobile para economizar espaço) */}
              <button
                onClick={() => setShowConfigModal(true)}
                className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-full transition"
                title="Configurações"
              >
                <Settings size={20} />
              </button>

              <button
                onClick={() => { resetForm(); setShowModal(true); }}
                className="bg-indigo-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 
                          hover:bg-indigo-700 transition-all duration-200 
                          hover:scale-105 active:scale-95 text-sm font-medium whitespace-nowrap"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Novo Serviço</span> {/* Esconde texto "Novo Serviço" em telas muito pequenas */}
              </button>
              
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="flex w-full border-b bg-white rounded-t-lg shadow-sm">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'servicos', label: 'Serviços', icon: Briefcase },
            { id: 'clientes', label: 'Clientes', icon: Users },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 flex items-center justify-center gap-2 transition-all duration-200 relative ${
                activeTab === tab.id
                  ? 'text-indigo-600'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              {/* Ícone sempre visível */}
              <tab.icon size={24} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
              
              {/* Texto: Escondido no celular (hidden), Visível no PC (md:block) */}
              <span className="hidden md:block font-medium">
                {tab.label}
              </span>

              {/* A barrinha azul embaixo da aba ativa */}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div key={activeTab} className="max-w-7xl mx-auto px-4 py-6 animate-fade-in-up">
        {loading ? ( // 👈 Note que este loading agora carrega APENAS os dados, não a sessão inicial
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando Dados...</p>
          </div>
        ) : activeTab === 'dashboard' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in-up">
              <div className="bg-white p-6 rounded-lg shadow animate-slide-up delay-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total de Horas</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalHoras.toFixed(2)}h</p>
                  </div>
                  <Clock className="text-indigo-600" size={32} />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow animate-slide-up delay-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Valor Total</p>
                    <p className="text-2xl font-bold text-gray-900">R$ {stats.totalValor.toFixed(2)}</p>
                  </div>
                  <DollarSign className="text-green-600" size={32} />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow animate-slide-up delay-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Serviços</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalServicos}</p>
                  </div>
                  <FileText className="text-blue-600" size={32} />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow animate-slide-up delay-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Clientes</p>
                    <p className="text-2xl font-bold text-gray-900">{clientes.length}</p>
                  </div>
                  <User className="text-purple-600" size={32} />
                </div>
              </div>
            </div>
            <DashboardCharts servicos={servicosFiltradosData} />
            {/* Dashboard Colorido e Responsivo */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Serviços por Status</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {Object.entries(stats.porStatus || {}).map(([status, dados]) => {
                  // Pega a configuração da cor
                  const config = statusConfig[status] || statusConfig['Pendente'];
                  
                  return (
                    <StatusCard 
                      key={status}
                      status={status}
                      count={dados.count}
                      valor={dados.valor}
                      color={config.color}
                      icon={config.icon}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        ) : activeTab === 'servicos' ? (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg shadow space-y-4">
              <div className="flex items-center gap-2 text-gray-700 font-medium">
                <Filter size={20} />
                Filtros
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <select
                  value={filtros.cliente}
                  onChange={(e) => setFiltros({...filtros, cliente: e.target.value})}
                  className="border rounded px-3 py-2"
                >
                  <option value="">Todos os clientes</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.nome}>{c.nome}</option>
                  ))}
                </select>
                
                <select
                  value={filtros.status}
                  onChange={(e) => setFiltros({...filtros, status: e.target.value})}
                  className="border rounded px-3 py-2"
                >
                  <option value="">Todos os status</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Em aprovação">Em aprovação</option>
                  <option value="Aprovado">Aprovado</option>
                  <option value="NF Emitida">NF Emitida</option>
                  <option value="Pago">Pago</option>
                </select>
                
                <input
                  type="date"
                  value={filtros.dataInicio}
                  onChange={(e) => setFiltros({...filtros, dataInicio: e.target.value})}
                  className="border rounded px-3 py-2"
                  placeholder="Data início"
                />
                
                <input
                  type="date"
                  value={filtros.dataFim}
                  onChange={(e) => setFiltros({...filtros, dataFim: e.target.value})}
                  className="border rounded px-3 py-2"
                  placeholder="Data fim"
                />
              </div>
            </div>
            {/* BARRA DE FERRAMENTAS - SERVIÇOS */}
            <div className="bg-white p-4 rounded-lg shadow space-y-4">
              
              {/* ... Filtros (Mantenha seus filtros aqui como estavam) ... */}
              
              {/* BOTÕES DE AÇÃO */}
              <div className="flex justify-end gap-2 pt-2 border-t md:border-t-0 md:pt-0">
                
                {/* Botão Excel */}
                <button
                  onClick={handleExportarExcel}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white p-2 md:px-4 md:py-2 rounded-lg shadow transition-all active:scale-95"
                  title="Exportar para Excel"
                >
                  <FileText size={20} />
                  <span className="hidden md:inline">Excel</span>
                </button>

                {/* Botão PDF */}
                <button
                  onClick={handleGerarPDF}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white p-2 md:px-4 md:py-2 rounded-lg shadow transition-all active:scale-95"
                  title="Gerar PDF"
                >
                  <FileText size={20} />
                  <span className="hidden md:inline">Relatório PDF</span>
                </button>

                {/* Botão Email */}
                <button
                  onClick={async () => {
                    setEmailEnviando(true);
                    try {
                      await handleEnviarEmail();
                    } catch {
                      setToast({ mensagem: "Erro inesperado!", tipo: "erro", visivel: true });
                    }
                    setEmailEnviando(false);
                    setTimeout(() => setToast(prev => ({ ...prev, visivel: false })), 3000);
                  }}
                  disabled={emailEnviando}
                  className={`flex items-center gap-2 p-2 md:px-4 md:py-2 rounded-lg shadow transition-all active:scale-95 
                    ${emailEnviando ? "bg-green-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"}`} // Mudei email para Blue pra diferenciar do Excel
                  title="Enviar por E-mail"
                >
                  {/* Ícone muda se estiver enviando */}
                  {emailEnviando ? <Clock size={20} className="animate-spin" /> : <Mail size={20} />} 
                  <span className="hidden md:inline">
                    {emailEnviando ? "Enviando..." : "Enviar Email"}
                  </span>
                </button>
              </div>
            </div>

            <ServicesTable 
              servicos={servicosFiltradosData}
              onStatusChange={alterarStatusRapido}
              onEdit={editarServico}
              onDelete={deletarServico}
            /> 
            
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Users size={24} className="text-indigo-600 hidden md:block" /> {/* Ícone decorativo no PC */}
                Gerenciar Clientes
              </h2>
              
              <button
                onClick={() => { resetClienteForm(); setShowClienteModal(true); }}
                className="bg-indigo-600 text-white p-2 md:px-4 md:py-2 rounded-lg flex items-center gap-2 
                          hover:bg-indigo-700 transition-all duration-200 
                          hover:scale-105 active:scale-95 shadow"
                title="Cadastrar Novo Cliente"
              >
                <Plus size={20} />
                <span className="hidden md:inline">Novo Cliente</span>
              </button>
            </div>
            
            <ClientsTable 
              clientes={clientes}
              onEdit={editarCliente}
              onDelete={deletarCliente}
            />
          </div>
        )}
      </div>

      {/* Modais e Toasts (Fora do fluxo de login, mas dependem do estado) */}

      <ServiceModal 
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingService(null); resetForm(); }}
        onSave={salvarServico}
        formData={formData}
        setFormData={setFormData}
        clientes={clientes}
        isEditing={!!editingService}
      />

      <ClientModal 
        isOpen={showClienteModal}
        onClose={() => { setShowClienteModal(false); setEditingCliente(null); resetClienteForm(); }}
        onSave={salvarCliente}
        formData={clienteFormData}
        setFormData={setClienteFormData}
        isEditing={!!editingCliente}
      />

      {/* Modal de Configuração */}
      <ConfigModal 
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSave={salvarConfiguracao}
        valorAtual={valorHoraPadrao}
      />

      {/* Toast */}
      <div 
        className={`fixed top-6 right-6 w-96 max-w-xs px-6 py-3 rounded-xl shadow-lg text-white transform transition-all duration-500
          ${toast.visivel ? "translate-x-0 opacity-100" : "translate-x-24 opacity-0"}
          ${toast.tipo === 'sucesso' ? 'bg-green-600' : 'bg-red-600'}
        `}
      >
        {toast.mensagem}
      </div>

      {/* Aviso */}
      {aviso.mensagem && (
        <div className={`fixed top-4 right-4 px-4 py-2 rounded shadow-lg text-white transition-all
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

  