/* eslint-disable no-restricted-globals */
import gerarRelatorioPDF from "./utils/gerarRelatorioPDF";
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, DollarSign, User, FileText, Plus, Edit2, Trash2, Filter } from 'lucide-react';
import supabase from './services/supabase'; // ✅ Importamos nossa conexão nova

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
    valor_hora: '150.00',
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

  const carregarDados = async () => {
    try {
      setLoading(true);
      
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
    } finally {
      setLoading(false);
    }
  };

  // Carrega dados ao abrir o app
  useEffect(() => {
    carregarDados();
  }, []);

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
          .insert([formData]);
        error = insertError;
      }

      if (error) throw error;

      alert(editingService ? 'Serviço atualizado!' : 'Serviço cadastrado!');
      setShowModal(false);
      setEditingService(null);
      resetForm();
      carregarDados();

    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar serviço: ' + error.message);
    }
  };

  const deletarServico = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;
    
    try {
      const { error } = await supabase
        .from('servicos_prestados')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      alert('Serviço excluído!');
      carregarDados();
    } catch (error) {
      console.error('Erro ao deletar:', error);
      alert('Erro ao excluir serviço!');
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
    if (!clienteFormData.nome.trim()) {
      alert('Nome do cliente é obrigatório!');
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
          .insert([clienteFormData]);
        error = insertError;
      }

      if (error) throw error;

      alert(editingCliente ? 'Cliente atualizado!' : 'Cliente cadastrado!');
      setShowClienteModal(false);
      setEditingCliente(null);
      resetClienteForm();
      carregarDados();

    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      alert('Erro ao salvar cliente!');
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
      
      alert('Cliente excluído!');
      carregarDados();
    } catch (error) {
      console.error('Erro ao deletar:', error);
      alert('Erro ao excluir cliente!');
    }
  };

  // --- FUNÇÕES DE FORMULÁRIO E UTILITÁRIOS ---

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
    const dadosParaRelatorio = servicosFiltrados();
    const pdfBlob = gerarRelatorioPDF(dadosParaRelatorio, filtros);
    const formDataEmail = new FormData();
    formDataEmail.append("pdf", pdfBlob, "relatorio-servicos.pdf");
    formDataEmail.append("email", clienteSelecionado.email);
    formDataEmail.append("nomeCliente", clienteSelecionado.nome);

    const response = await fetch("http://localhost:3333/enviar-pdf", {
      method: "POST",
      body: formDataEmail
    });

    if (response.ok) {
      setToast({ visivel: true, mensagem: "Email enviado com sucesso! 📧", tipo: "sucesso" });
    } else {
      const errorText = await response.text();
      setToast({ visivel: true, mensagem: "Erro ao enviar email: " + errorText, tipo: "erro" });
    }
  };

  const resetForm = () => {
    setFormData({
      data: new Date().toISOString().split('T')[0],
      hora_inicial: '09:00',
      hora_final: '18:00',
      valor_hora: '150.00',
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

  // --- RENDERIZAÇÃO (JSX) ---

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Controle de Horas</h1>
              <p className="text-sm text-gray-500">Gerencie seus serviços prestados</p>
            </div>
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 
                        hover:bg-indigo-700 transition-all duration-200 
                        hover:scale-105 active:scale-95"
            >
              <Plus size={20} />
              Novo Serviço
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="flex gap-2 border-b">
          {['dashboard', 'servicos', 'clientes'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium transition ${
                activeTab === tab
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'dashboard' ? '📊 Dashboard' : tab === 'servicos' ? '📋 Serviços' : '👥 Clientes'}
            </button>
          ))}
        </div>
      </div>

      <div key={activeTab} className="max-w-7xl mx-auto px-4 py-6 animate-fade-in-up">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando...</p>
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

            {/* Dashboard Colorido e Responsivo */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Serviços por Status</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {Object.entries(stats.porStatus || {}).map(([status, dados]) => {
                  const config = statusConfig[status] || statusConfig['Pendente'];
                  return (
                    <div 
                      key={status} 
                      className={`flex flex-col justify-between p-4 rounded-lg border shadow-sm transition-transform hover:scale-105 ${config.color}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="text-3xl">{config.icon}</div>
                        <p className="text-2xl font-bold font-mono">{dados.count}</p>
                      </div>
                      <div className="mt-4">
                        <p className="text-xs font-bold uppercase tracking-wide opacity-90">
                          {status}
                        </p>
                        <p className="text-sm font-medium opacity-80 mt-1 border-t border-black/10 pt-2">
                          R$ {dados.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
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
            <div className="flex justify-end gap-4">
              <button
                onClick={handleGerarPDF}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow transition-all hover:scale-105 active:scale-95"
              >
                📄 Gerar Relatório PDF
              </button>

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
                className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow transition-all hover:scale-105 active:scale-95 
                  ${emailEnviando ? "bg-green-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 text-white"}`}
              >
                {emailEnviando ? "Enviando Email ⏳" : "✉️ Enviar por Email"}
              </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Atividade</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horas</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {servicosFiltradosData.map(servico => (
                      <tr key={servico.id} className="hover:bg-blue-50 transition-all duration-200 hover:shadow-sm">
                        <td className="px-4 py-3 text-sm">
                          {new Date(servico.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">{servico.cliente}</td>
                        <td className="px-4 py-3 text-sm">{servico.atividade}</td>
                        <td className="px-4 py-3 text-sm">{parseFloat(servico.qtd_horas).toFixed(2)}h</td>
                        <td className="px-4 py-3 text-sm">R$ {parseFloat(servico.valor_total).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <select
                            value={servico.status}
                            onChange={(e) => alterarStatusRapido(servico.id, e.target.value)}
                            className={`px-2 py-1 text-xs rounded-full border-0 cursor-pointer ${
                              servico.status === 'Pago' ? 'bg-green-100 text-green-800' :
                              servico.status === 'NF Emitida' ? 'bg-blue-100 text-blue-800' :
                              servico.status === 'Aprovado' ? 'bg-yellow-100 text-yellow-800' :
                              servico.status === 'Em aprovação' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            <option value="Pendente">Pendente</option>
                            <option value="Em aprovação">Em aprovação</option>
                            <option value="Aprovado">Aprovado</option>
                            <option value="NF Emitida">NF Emitida</option>
                            <option value="Pago">Pago</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => editarServico(servico)}
                              className="text-blue-600 hover:text-blue-800 transition-transform hover:scale-125"
                              title="Editar serviço"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => deletarServico(servico.id)}
                              className="text-red-600 hover:text-red-800 transition-transform hover:scale-125"
                              title="Excluir serviço"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Gerenciar Clientes</h2>
              <button
                onClick={() => { resetClienteForm(); setShowClienteModal(true); }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 
                          hover:bg-indigo-700 transition-all duration-200 
                          hover:scale-105 active:scale-95"
              >
                <Plus size={20} />
                Novo Cliente
              </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {clientes.map(cliente => (
                    <tr key={cliente.id} className="hover:bg-blue-50 transition-all duration-200 hover:shadow-sm">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{cliente.nome}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{cliente.email || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{cliente.telefone || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          cliente.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {cliente.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => editarCliente(cliente)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Editar cliente"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => deletarCliente(cliente.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Excluir cliente"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity duration-300 opacity-100">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-95 animate-slide-up">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {editingService ? 'Editar Serviço' : 'Novo Serviço'}
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                    <input
                      type="date"
                      value={formData.data}
                      onChange={(e) => setFormData({...formData, data: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                    <select
                      value={formData.cliente}
                      onChange={(e) => setFormData({...formData, cliente: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Selecione...</option>
                      {clientes.map(c => (
                        <option key={c.id} value={c.nome}>{c.nome}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hora Inicial</label>
                    <input
                      type="time"
                      value={formData.hora_inicial}
                      onChange={(e) => setFormData({...formData, hora_inicial: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hora Final</label>
                    <input
                      type="time"
                      value={formData.hora_final}
                      onChange={(e) => setFormData({...formData, hora_final: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor/Hora (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.valor_hora}
                      onChange={(e) => setFormData({...formData, valor_hora: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Em aprovação">Em aprovação</option>
                      <option value="Aprovado">Aprovado</option>
                      <option value="NF Emitida">NF Emitida</option>
                      <option value="Pago">Pago</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Solicitante</label>
                    <input
                      type="text"
                      value={formData.solicitante}
                      onChange={(e) => setFormData({...formData, solicitante: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número NFS</label>
                    <input
                      type="text"
                      value={formData.numero_nfs}
                      onChange={(e) => setFormData({...formData, numero_nfs: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Atividade *</label>
                  <textarea
                    value={formData.atividade}
                    onChange={(e) => setFormData({...formData, atividade: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    rows="3"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    rows="2"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={salvarServico}
                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg 
                    hover:bg-indigo-700 transition-all duration-200 
                    hover:scale-105 active:scale-95"
                  >
                    {editingService ? 'Atualizar' : 'Cadastrar'}
                  </button>
                  <button
                    onClick={() => { setShowModal(false); setEditingService(null); resetForm(); }}
                    className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg 
                    hover:bg-gray-300 transition-all duration-200 
                    hover:scale-105 active:scale-95"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showClienteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity duration-300 opacity-100">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full transform transition-all duration-300 scale-95 animate-slide-up">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input
                    type="text"
                    value={clienteFormData.nome}
                    onChange={(e) => setClienteFormData({...clienteFormData, nome: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Nome do cliente"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={clienteFormData.email}
                    onChange={(e) => setClienteFormData({...clienteFormData, email: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    placeholder="email@exemplo.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={clienteFormData.telefone}
                    onChange={(e) => setClienteFormData({...clienteFormData, telefone: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    placeholder="(11) 99999-9999"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ativo"
                    checked={clienteFormData.ativo}
                    onChange={(e) => setClienteFormData({...clienteFormData, ativo: e.target.checked})}
                    className="rounded"
                  />
                  <label htmlFor="ativo" className="text-sm font-medium text-gray-700">Cliente ativo</label>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={salvarCliente}
                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg 
                              hover:bg-indigo-700 transition-all duration-200 
                              hover:scale-105 active:scale-95"
                  >
                    {editingCliente ? 'Atualizar' : 'Cadastrar'}
                  </button>

                  <button
                    onClick={() => { setShowClienteModal(false); setEditingCliente(null); resetClienteForm(); }}
                    className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg 
                              hover:bg-gray-300 transition-all duration-200 
                              hover:scale-105 active:scale-95"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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