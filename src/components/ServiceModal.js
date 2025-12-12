import React, { useState, useEffect } from 'react';
import { X, Save, Clock, DollarSign, User, FileText, Calendar, Activity, List } from 'lucide-react';
import supabase from '../services/supabase';

const ServiceModal = ({ isOpen, onClose, onSave, formData, setFormData, clientes, isEditing }) => {
  const [loading, setLoading] = useState(false);
  
  // Estado para armazenar a lista de solicitantes do cliente selecionado
  const [listaSolicitantes, setListaSolicitantes] = useState([]);
  const [loadingSolicitantes, setLoadingSolicitantes] = useState(false);

  // EFEITO: Sempre que o cliente mudar, busca os solicitantes dele
  useEffect(() => {
    const carregarSolicitantesDoCliente = async () => {
      // 1. Se não tem cliente selecionado, limpa a lista
      if (!formData.cliente) {
        setListaSolicitantes([]);
        return;
      }

      // 2. Acha o ID do cliente baseado no nome (pois o formData salva o nome)
      const clienteObj = clientes.find(c => c.nome === formData.cliente);
      
      if (!clienteObj) return;

      setLoadingSolicitantes(true);

      // 3. Busca no banco
      const { data, error } = await supabase
        .from('solicitantes')
        .select('nome')
        .eq('cliente_id', clienteObj.id)
        .order('nome', { ascending: true });

      if (error) {
        console.error("Erro ao buscar solicitantes:", error);
      } else {
        setListaSolicitantes(data || []);
      }
      setLoadingSolicitantes(false);
    };

    carregarSolicitantesDoCliente();
  }, [formData.cliente, clientes]);


  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSave();
    setLoading(false);
  };

  // Função genérica para calcular total ao mudar horas ou valor
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabeçalho */}
        <div className="bg-indigo-600 p-6 flex justify-between items-center text-white">
          <div>
            <h2 className="text-xl font-bold">{isEditing ? 'Editar Serviço' : 'Novo Serviço'}</h2>
            <p className="text-sm opacity-90">Preencha os dados do serviço prestado</p>
          </div>
          <button onClick={onClose} className="hover:bg-indigo-700 p-2 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-6 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* LINHA 1: Datas e Horas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <Calendar size={14} /> Data
                </label>
                <input
                  type="date"
                  value={formData.data}
                  onChange={(e) => handleChange('data', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <Clock size={14} /> Início
                </label>
                <input
                  type="time"
                  value={formData.hora_inicial}
                  onChange={(e) => handleChange('hora_inicial', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <Clock size={14} /> Fim
                </label>
                <input
                  type="time"
                  value={formData.hora_final}
                  onChange={(e) => handleChange('hora_final', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  required
                />
              </div>
            </div>

            {/* LINHA 2: Cliente e Solicitante (INTEGRADO) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* CLIENTE */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <User size={14} /> Cliente
                </label>
                <select
                  value={formData.cliente}
                  onChange={(e) => {
                    // Ao mudar o cliente, limpamos o solicitante antigo para evitar erro
                    setFormData(prev => ({ ...prev, cliente: e.target.value, solicitante: '' }));
                  }}
                  className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-white"
                  required
                >
                  <option value="">Selecione um cliente...</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.nome}>{c.nome}</option>
                  ))}
                </select>
              </div>

              {/* SOLICITANTE (INTELIGENTE) */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <User size={14} /> Solicitante
                </label>
                
                {loadingSolicitantes ? (
                  // Estado de Carregamento
                  <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-gray-50 text-gray-500 text-sm">
                    <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                    Buscando equipe...
                  </div>
                ) : listaSolicitantes.length > 0 ? (
                  // COMBOBOX (Se tiver solicitantes cadastrados)
                  <select
                    value={formData.solicitante}
                    onChange={(e) => handleChange('solicitante', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-white"
                    required
                  >
                    <option value="">Quem solicitou?</option>
                    {listaSolicitantes.map((sol, index) => (
                      <option key={index} value={sol.nome}>{sol.nome}</option>
                    ))}
                  </select>
                ) : (
                  // TEXTO LIVRE (Caso não tenha equipe cadastrada ou cliente não selecionado)
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={formData.cliente ? "Digite o nome (ou cadastre a equipe)" : "Selecione um cliente primeiro"}
                      value={formData.solicitante}
                      onChange={(e) => handleChange('solicitante', e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:bg-gray-100"
                      disabled={!formData.cliente} // Bloqueia se não tiver cliente
                      required
                    />
                    {formData.cliente && (
                      <span className="absolute right-3 top-2.5 text-xs text-gray-400">Manual</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* LINHA 3: Atividade */}
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                <Activity size={14} /> Atividade
              </label>
              <input
                type="text"
                placeholder="Descreva o que foi feito..."
                value={formData.atividade}
                onChange={(e) => handleChange('atividade', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                required
              />
            </div>

            {/* LINHA 4: Financeiro e Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <DollarSign size={14} /> Valor Hora
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.valor_hora}
                  onChange={(e) => handleChange('valor_hora', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                 <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <FileText size={14} /> N.F. (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Número da Nota"
                  value={formData.numero_nfs}
                  onChange={(e) => handleChange('numero_nfs', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <List size={14} /> Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-white"
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Em aprovação">Em aprovação</option>
                  <option value="Aprovado">Aprovado</option>
                  <option value="NF Emitida">NF Emitida</option>
                  <option value="Pago">Pago</option>
                </select>
              </div>
            </div>

            {/* LINHA 5: Observações */}
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Observações</label>
              <textarea
                rows="3"
                value={formData.observacoes}
                onChange={(e) => handleChange('observacoes', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
              ></textarea>
            </div>

            {/* Rodapé do Modal */}
            <div className="pt-4 border-t flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all transform active:scale-95 flex items-center gap-2 font-medium shadow-lg shadow-indigo-200"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Salvar Serviço
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default ServiceModal;