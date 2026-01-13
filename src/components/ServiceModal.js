import React, { useState, useEffect, useRef } from 'react'; // <--- Adicionei useRef
import { 
  X, Save, Clock, DollarSign, User, FileText, Calendar, 
  Activity, List, RotateCcw, Building2, AlertCircle, Info, Trash2, AlertTriangle
} from 'lucide-react'; 
import supabase from '../services/supabase';
import ConfirmModal from './ConfirmModal'; 

const ServiceModal = ({ isOpen, onClose, onSave, onDelete, formData, setFormData, clientes, isEditing }) => {
  const [loading, setLoading] = useState(false);
  const [listaSolicitantes, setListaSolicitantes] = useState([]);
  const [loadingSolicitantes, setLoadingSolicitantes] = useState(false);
  const [listaCanais, setListaCanais] = useState([]);
  const [valorVisual, setValorVisual] = useState('');
  const [erroValidacao, setErroValidacao] = useState('');
  
  // Controle do Modal de Confirmação (Externo)
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [modoLancamento, setModoLancamento] = useState('detalhado'); 
  const [horasTotais, setHorasTotais] = useState('');
  const [previsaoDistribuicao, setPrevisaoDistribuicao] = useState(null); 

  // --- REF PARA EVITAR PISCA-PISCA ---
  const lastClientRef = useRef(null);

  // --- EFEITO: INICIALIZAÇÃO ---
  useEffect(() => {
    if (isOpen) {
      if (isEditing && formData.valor_hora) {
        setValorVisual(formData.valor_hora.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      } else if (!isEditing) {
        setValorVisual('75,00');
        setFormData(prev => ({ ...prev, valor_hora: 75.00 }));
      } else {
        setValorVisual('');
      }
      
      setErroValidacao(''); 
      setPrevisaoDistribuicao(null);
      setHorasTotais('');
      setShowConfirmModal(false);
      
      // Reseta a ref ao abrir o modal
      lastClientRef.current = null;

      if (formData.canal_id === "") {
        setFormData(prev => ({ ...prev, canal_id: null }));
      }

      setModoLancamento('detalhado');
    }
  }, [isOpen, isEditing]);

  // Carregar Canais
  useEffect(() => {
    const carregarCanais = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('consultoria_id').eq('id', user.id).single();

      if (profile && profile.consultoria_id) {
        const { data, error } = await supabase
          .from('canais')
          .select('*')
          .eq('consultoria_id', profile.consultoria_id)
          .eq('ativo', true)
          .order('nome', { ascending: true });
        if (!error) setListaCanais(data || []);
      }
    };
    if (isOpen) carregarCanais();
  }, [isOpen]);

  // --- CORREÇÃO DO PISCA-PISCA AQUI ---
  useEffect(() => {
    if (!isOpen) return;

    // Se o cliente não mudou desde a última vez e já temos lista, NÃO FAZ NADA.
    // Isso impede que digitar na observação (que muda formData) dispare isso aqui.
    if (formData.cliente === lastClientRef.current && listaSolicitantes.length > 0) {
        return;
    }

    // Atualiza a referência do último cliente
    lastClientRef.current = formData.cliente;

    const carregarSolicitantesDoCliente = async () => {
      // Se não tem cliente, limpa a lista e sai
      if (!formData.cliente) {
          setListaSolicitantes([]);
          return;
      }
      
      // NÃO limpe a lista aqui com setListaSolicitantes([]), isso causa o pisca!
      
      const clienteObj = clientes.find(c => c.nome === formData.cliente);
      if (!clienteObj) return;

      setLoadingSolicitantes(true);
      const { data, error } = await supabase
        .from('solicitantes')
        .select('nome')
        .eq('cliente_id', clienteObj.id)
        .eq('ativo', true)
        .order('nome', { ascending: true });
      
      if (!error) setListaSolicitantes(data || []);
      setLoadingSolicitantes(false);
    };
    
    carregarSolicitantesDoCliente();
  }, [formData.cliente, clientes, isOpen]); // Removi listaSolicitantes das deps para não criar loop

  if (!isOpen) return null;

  // --- HANDLERS ---

  const handleValorChange = (e) => {
    const apenasNumeros = e.target.value.replace(/\D/g, "");
    if (apenasNumeros === "") {
      setValorVisual("");
      setFormData(prev => ({ ...prev, valor_hora: 0 }));
      return;
    }
    const valorFloat = parseFloat(apenasNumeros) / 100;
    const valorFormatado = valorFloat.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setValorVisual(valorFormatado);
    setFormData(prev => ({ ...prev, valor_hora: valorFloat }));
  };

  const handleChange = (field, value) => {
    let valorTratado = value;
    if (field === 'canal_id' && value === '') valorTratado = null;
    setFormData(prev => ({ ...prev, [field]: valorTratado }));
    if (field === 'solicitante' || field === 'cliente') setErroValidacao(''); 
  };

  const handleHorasTotaisChange = (e) => {
      const val = e.target.value;
      setHorasTotais(val);
      setPrevisaoDistribuicao(null); 
      
      if (!val || isNaN(val) || parseFloat(val) <= 0) return;

      const total = parseFloat(val);

      if (total <= 24) {
          const inicio = "09:00";
          const [hInicio, mInicio] = inicio.split(':').map(Number);
          const horasAdicionar = Math.floor(total);
          const minutosAdicionar = Math.round((total % 1) * 60);
          
          let hFim = hInicio + horasAdicionar;
          let mFim = mInicio + minutosAdicionar;
          if (mFim >= 60) { hFim += 1; mFim -= 60; }
          if (hFim >= 24) hFim = 23; 
          
          const fimFormatado = `${String(hFim).padStart(2, '0')}:${String(mFim).padStart(2, '0')}`;
          setFormData(prev => ({ ...prev, hora_inicial: inicio, hora_final: fimFormatado }));
      } else {
          const diasNecessarios = Math.ceil(total / 8); 
          setPrevisaoDistribuicao(`Atenção: ${total} horas excede um dia. O sistema irá gerar automaticamente ${diasNecessarios} lançamentos de 8h (dias úteis).`);
      }
  };

  const salvarEmLote = async () => {
      try {
          const { data: { user } } = await supabase.auth.getUser();
          const { data: profile } = await supabase.from('profiles').select('consultoria_id').eq('id', user.id).single();
          
          let horasRestantes = parseFloat(horasTotais);
          let dataAtual = new Date(formData.data + 'T12:00:00'); 
          const batchInserts = [];

          while (horasRestantes > 0) {
              const diaSemana = dataAtual.getDay();
              if (diaSemana === 0 || diaSemana === 6) {
                  dataAtual.setDate(dataAtual.getDate() + 1);
                  continue;
              }

              const horasHoje = Math.min(horasRestantes, 8);
              const hFim = 9 + Math.floor(horasHoje);
              const mFim = Math.round((horasHoje % 1) * 60);
              const horaFinalStr = `${String(hFim).padStart(2, '0')}:${String(mFim).padStart(2, '0')}`;

              const servico = {
                  data: dataAtual.toISOString().split('T')[0], 
                  hora_inicial: '09:00',
                  hora_final: horaFinalStr,
                  valor_hora: formData.valor_hora,
                  canal_id: formData.canal_id === '' ? null : formData.canal_id,
                  cliente: formData.cliente === '' ? null : formData.cliente,
                  atividade: formData.atividade,
                  solicitante: formData.solicitante,
                  numero_nfs: formData.numero_nfs,
                  status: formData.status,
                  observacoes: formData.observacoes,
                  user_id: user.id,
                  consultoria_id: profile.consultoria_id
              };

              batchInserts.push(servico);
              horasRestantes -= horasHoje;
              dataAtual.setDate(dataAtual.getDate() + 1); 
          }

          const { error } = await supabase.from('servicos_prestados').insert(batchInserts);
          if (error) throw error;
          return true; 

      } catch (error) {
          console.error("Erro no lote:", error);
          setErroValidacao("Erro ao gerar lançamentos em lote: " + error.message);
          return false;
      }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErroValidacao('');

    if (!formData.cliente) { setErroValidacao('Selecione um Cliente.'); return; }
    if (!formData.solicitante || formData.solicitante.trim() === '') { setErroValidacao('Selecione o Solicitante.'); return; }

    setLoading(true);

    if (modoLancamento === 'rapido' && parseFloat(horasTotais) > 24) {
        const sucesso = await salvarEmLote();
        if (sucesso) {
            onClose(); 
            window.location.reload(); 
        }
    } else {
        await onSave();
    }
    setLoading(false);
  };

  // --- LÓGICA DE CONFIRMAÇÃO ---
  const handleRequestDelete = () => {
      setShowConfirmModal(true); // Abre o ConfirmModal
  };

  const handleConfirmDelete = async () => {
      if (onDelete && formData.id) {
          await onDelete(formData.id); // Chama a função do App.js
          onClose(); // Fecha o ServiceModal após deletar
      }
  };

  const headerColor = isEditing ? 'bg-orange-500' : 'bg-indigo-600';
  const buttonColor = isEditing ? 'bg-orange-500 hover:bg-orange-600' : 'bg-indigo-600 hover:bg-indigo-700';

  return (
    <>
        {/* O MODAL PRINCIPAL DE SERVIÇO */}
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-80 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border dark:border-gray-700">
            
            {/* Header */}
            <div className={`${headerColor} p-6 flex justify-between items-center text-white shadow-md`}>
            <div>
                <h2 className="text-xl font-bold">{isEditing ? 'Editar Serviço' : 'Novo Serviço'}</h2>
                <p className="text-sm opacity-90">{isEditing ? 'Alterando dados existentes' : 'Apontamento de Horas'}</p>
            </div>
            <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X size={24} /></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar relative">
            <form onSubmit={handleSubmit} className="space-y-6">
                
                {erroValidacao && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100 dark:border-red-900/50">
                        <AlertCircle size={16} /> {erroValidacao}
                    </div>
                )}
                
                {!isEditing && (
                    <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg w-fit mx-auto md:mx-0">
                        <button type="button" onClick={() => setModoLancamento('detalhado')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${modoLancamento === 'detalhado' ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>Por Horário (Início/Fim)</button>
                        <button type="button" onClick={() => setModoLancamento('rapido')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${modoLancamento === 'rapido' ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>Lançamento Rápido (Total)</button>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1"><Calendar size={12} /> Data Inicial</label>
                    <input type="date" value={formData.data} onChange={(e) => handleChange('data', e.target.value)} className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white" required />
                </div>

                {modoLancamento === 'detalhado' ? (
                    <>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1"><Clock size={12} /> Início</label>
                            <input type="time" value={formData.hora_inicial} onChange={(e) => handleChange('hora_inicial', e.target.value)} className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white" required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1"><Clock size={12} /> Fim</label>
                            <input type="time" value={formData.hora_final} onChange={(e) => handleChange('hora_final', e.target.value)} className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white" required />
                        </div>
                    </>
                ) : (
                    <div className="col-span-2 space-y-1">
                        <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1"><Clock size={12} /> Qtd. Horas Totais</label>
                        <input type="number" step="0.5" min="0" value={horasTotais} onChange={handleHorasTotaisChange} className="w-full border-2 border-indigo-100 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-bold" placeholder="Ex: 32" required />
                    </div>
                )}
                </div>

                {previsaoDistribuicao && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 flex gap-3 items-start">
                        <Info className="text-blue-600 mt-0.5 shrink-0" size={18} />
                        <p className="text-sm text-blue-700 dark:text-blue-300">{previsaoDistribuicao}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1"><Building2 size={12} /> Canal / Parceiro</label>
                    <select value={formData.canal_id || ''} onChange={(e) => handleChange('canal_id', e.target.value)} className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white cursor-pointer">
                        <option value="">-- Direto (Sem Canal) --</option>
                        {listaCanais.map(canal => (<option key={canal.id} value={canal.id}>{canal.nome}</option>))}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1"><User size={12} /> Cliente</label>
                    <select value={formData.cliente} onChange={(e) => { setFormData(prev => ({ ...prev, cliente: e.target.value, solicitante: '' })); }} className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white cursor-pointer" required>
                        <option value="">Selecione...</option>
                        {clientes.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                    </select>
                </div>
                
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1"><User size={12} /> Solicitante <span className="text-red-500">*</span></label>
                    <select value={formData.solicitante} onChange={(e) => handleChange('solicitante', e.target.value)} className={`w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${!formData.cliente ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed border-gray-200 dark:border-gray-700' : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'}`} disabled={!formData.cliente || loadingSolicitantes} required>
                        {!formData.cliente ? <option value="">Selecione um cliente primeiro</option> : loadingSolicitantes ? <option value="">Carregando...</option> : listaSolicitantes.length === 0 ? <option value="">Nenhum solicitante ativo</option> : <><option value="">Quem pediu?</option>{listaSolicitantes.map((sol, i) => (<option key={i} value={sol.nome}>{sol.nome}</option>))}</>}
                    </select>
                </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1"><Activity size={12} /> Atividade</label>
                    <input type="text" value={formData.atividade} onChange={(e) => handleChange('atividade', e.target.value)} className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white" required placeholder="Descrição breve do serviço" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1"><DollarSign size={12} /> Valor Hora (R$)</label>
                    <input type="text" inputMode="numeric" value={valorVisual} onChange={handleValorChange} placeholder="0,00" className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-right bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white" required />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1"><FileText size={12} /> N.F.</label>
                    <input type="text" value={formData.numero_nfs} onChange={(e) => handleChange('numero_nfs', e.target.value)} className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600" placeholder="Opcional" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1"><List size={12} /> Status</label>
                    <select value={formData.status} onChange={(e) => handleChange('status', e.target.value)} className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white cursor-pointer">
                        <option value="Pendente">Pendente</option>
                        <option value="Em aprovação">Em aprovação</option>
                        <option value="Aprovado">Aprovado</option>
                        <option value="NF Emitida">NF Emitida</option>
                        <option value="Pago">Pago</option>
                    </select>
                </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Observações</label>
                    <textarea rows="3" value={formData.observacoes} onChange={(e) => handleChange('observacoes', e.target.value)} className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white" placeholder="Detalhes adicionais..."></textarea>
                </div>

                {/* Footer de Ações */}
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between gap-2">
                {isEditing && (
                    <button 
                        type="button" 
                        onClick={handleRequestDelete} 
                        className="px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors font-bold flex items-center gap-2"
                    >
                        <Trash2 size={18}/> <span className="hidden sm:inline">Excluir</span>
                    </button>
                )}
                <div className="flex gap-2 ml-auto">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium flex items-center gap-2"><RotateCcw size={16}/> Cancelar</button>
                    <button type="submit" disabled={loading} className={`px-4 py-2 text-sm text-white rounded shadow-sm transition-all transform active:scale-95 flex items-center gap-2 font-medium ${buttonColor}`}>{loading ? 'Salvando...' : <><Save size={16} /> <span className="font-bold">Salvar</span></>}</button>
                </div>
                </div>
            </form>
            </div>
        </div>
        </div>

        {/* --- AQUI ESTÁ A MÁGICA: O ConfirmModal sendo renderizado SEPARADAMENTE --- */}
        <ConfirmModal 
            isOpen={showConfirmModal}
            onClose={() => setShowConfirmModal(false)}
            onConfirm={handleConfirmDelete}
            title="Excluir Serviço?"
            message="Tem certeza que deseja remover este apontamento? Essa ação não pode ser desfeita e afetará o saldo total de horas."
            confirmText="Sim, excluir"
            cancelText="Cancelar"
            type="danger"
        />
    </>
  );
};

export default ServiceModal;