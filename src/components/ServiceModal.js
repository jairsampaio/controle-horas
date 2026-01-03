import React, { useState, useEffect } from 'react';
import { X, Save, Clock, DollarSign, User, FileText, Calendar, Activity, List, RotateCcw, Building2, AlertCircle } from 'lucide-react'; // 👈 AlertCircle adicionado
import supabase from '../services/supabase';

const ServiceModal = ({ isOpen, onClose, onSave, formData, setFormData, clientes, isEditing }) => {
  const [loading, setLoading] = useState(false);
  const [listaSolicitantes, setListaSolicitantes] = useState([]);
  const [loadingSolicitantes, setLoadingSolicitantes] = useState(false);
  const [listaCanais, setListaCanais] = useState([]);
  const [valorVisual, setValorVisual] = useState('');
  const [erroValidacao, setErroValidacao] = useState(''); // 🆕 Estado para mensagem de erro

  // Sincroniza valor visual
  useEffect(() => {
    if (isOpen) {
      if (formData.valor_hora) {
        setValorVisual(formData.valor_hora.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      } else {
        setValorVisual('');
      }
      setErroValidacao(''); // Limpa erro ao abrir
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); 

  // Busca Canais
  useEffect(() => {
    const carregarCanais = async () => {
      const { data, error } = await supabase.from('canais').select('*').eq('ativo', true).order('nome', { ascending: true });
      if (!error) setListaCanais(data || []);
    };
    if (isOpen) carregarCanais();
  }, [isOpen]);

  // 🆕 Busca Solicitantes (Filtrando apenas ATIVOS)
  useEffect(() => {
    const carregarSolicitantesDoCliente = async () => {
      setListaSolicitantes([]); // Limpa lista anterior
      
      if (!formData.cliente) return;
      
      const clienteObj = clientes.find(c => c.nome === formData.cliente);
      if (!clienteObj) return;

      setLoadingSolicitantes(true);
      const { data, error } = await supabase
        .from('solicitantes')
        .select('nome')
        .eq('cliente_id', clienteObj.id)
        .eq('ativo', true) // 🔴 Só traz quem está ativo
        .order('nome', { ascending: true });
      
      if (!error) setListaSolicitantes(data || []);
      setLoadingSolicitantes(false);
    };
    carregarSolicitantesDoCliente();
  }, [formData.cliente, clientes]);

  if (!isOpen) return null;

  // Lógica Bancária
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

  // 🆕 Validação e Envio
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErroValidacao('');

    // Validação de Obrigatoriedade
    if (!formData.solicitante || formData.solicitante.trim() === '') {
      setErroValidacao('É obrigatório selecionar um solicitante.');
      return;
    }

    setLoading(true);
    await onSave(); // Chama a função do pai
    setLoading(false);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'solicitante') setErroValidacao(''); // Limpa erro ao selecionar
  };

  const headerColor = isEditing ? 'bg-orange-500' : 'bg-indigo-600';
  const buttonColor = isEditing ? 'bg-orange-500 hover:bg-orange-600' : 'bg-indigo-600 hover:bg-indigo-700';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className={`${headerColor} p-6 flex justify-between items-center text-white transition-colors duration-300`}>
          <div><h2 className="text-xl font-bold">{isEditing ? 'Editar Serviço' : 'Novo Serviço'}</h2><p className="text-sm opacity-90">{isEditing ? 'Alterando dados existentes' : 'Preencha os dados'}</p></div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full"><X size={24} /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Aviso de Erro de Validação */}
            {erroValidacao && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 animate-pulse">
                    <AlertCircle size={16} /> {erroValidacao}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1"><Calendar size={12} /> Data</label><input type="date" value={formData.data} onChange={(e) => handleChange('data', e.target.value)} className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" required /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1"><Clock size={12} /> Início</label><input type="time" value={formData.hora_inicial} onChange={(e) => handleChange('hora_inicial', e.target.value)} className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" required /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1"><Clock size={12} /> Fim</label><input type="time" value={formData.hora_final} onChange={(e) => handleChange('hora_final', e.target.value)} className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" required /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1"><Building2 size={12} /> Canal / Parceiro</label>
                <select value={formData.canal_id || ''} onChange={(e) => handleChange('canal_id', e.target.value)} className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="">-- Direto (Sem Canal) --</option>
                    {listaCanais.map(canal => (<option key={canal.id} value={canal.id}>{canal.nome}</option>))}
                </select>
              </div>

              <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1"><User size={12} /> Cliente</label>
                  <select 
                    value={formData.cliente} 
                    onChange={(e) => setFormData(prev => ({ ...prev, cliente: e.target.value, solicitante: '' }))} 
                    className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white" 
                    required
                  >
                    <option value="">Selecione...</option>
                    {clientes.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                  </select>
              </div>
              
              {/* 🔴 SOLICITANTE AGORA É OBRIGATÓRIO E COMBOBOX */}
              <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <User size={12} /> Solicitante <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={formData.solicitante} 
                    onChange={(e) => handleChange('solicitante', e.target.value)} 
                    className={`w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${!formData.cliente ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`} 
                    disabled={!formData.cliente || loadingSolicitantes}
                    required // Validação HTML5
                  >
                    {/* Lógica de Opções */}
                    {!formData.cliente ? (
                        <option value="">Selecione um cliente primeiro</option>
                    ) : loadingSolicitantes ? (
                        <option value="">Carregando...</option>
                    ) : listaSolicitantes.length === 0 ? (
                        <option value="">Nenhum solicitante ativo</option>
                    ) : (
                        <>
                            <option value="">Quem pediu?</option>
                            {listaSolicitantes.map((sol, i) => (
                                <option key={i} value={sol.nome}>{sol.nome}</option>
                            ))}
                        </>
                    )}
                  </select>
              </div>
            </div>

            <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1"><Activity size={12} /> Atividade</label><input type="text" value={formData.atividade} onChange={(e) => handleChange('atividade', e.target.value)} className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" required /></div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1"><DollarSign size={12} /> Valor Hora (R$)</label>
                <input type="text" inputMode="numeric" value={valorVisual} onChange={handleValorChange} placeholder="0,00" className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-right" required />
              </div>
              <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1"><FileText size={12} /> N.F.</label><input type="text" value={formData.numero_nfs} onChange={(e) => handleChange('numero_nfs', e.target.value)} className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1"><List size={12} /> Status</label><select value={formData.status} onChange={(e) => handleChange('status', e.target.value)} className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"><option value="Pendente">Pendente</option><option value="Em aprovação">Em aprovação</option><option value="Aprovado">Aprovado</option><option value="NF Emitida">NF Emitida</option><option value="Pago">Pago</option></select></div>
            </div>

            <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Observações</label><textarea rows="3" value={formData.observacoes} onChange={(e) => handleChange('observacoes', e.target.value)} className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"></textarea></div>

            <div className="pt-4 border-t flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors font-medium flex items-center gap-2"><RotateCcw size={16}/> Cancelar</button>
              <button type="submit" disabled={loading} className={`px-4 py-2 text-sm text-white rounded shadow-sm transition-all transform active:scale-95 flex items-center gap-2 font-medium ${buttonColor}`}>{loading ? 'Salvando...' : <><Save size={16} /> <span className="font-bold">Salvar</span></>}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ServiceModal;