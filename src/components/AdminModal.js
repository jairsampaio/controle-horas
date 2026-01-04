import React, { useState, useEffect } from 'react';
import { X, Shield, Activity, Users, FileText, Clock, AlertTriangle } from 'lucide-react';
import supabase from '../services/supabase';

const AdminModal = ({ isOpen, onClose, userEmail }) => {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (isOpen) {
      carregarDadosAdmin();
    }
  }, [isOpen]);

  const carregarDadosAdmin = async () => {
    setLoading(true);
    setErro('');
    
    // Chama a função RPC que criamos no banco
    const { data, error } = await supabase.rpc('get_admin_stats');

    if (error) {
      console.error(error);
      setErro('Acesso negado ou erro ao carregar. Você é o Jair?');
      setDados([]);
    } else {
      setDados(data);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  // Cálculos Gerais do SaaS
  const totalUsuarios = dados.length;
  const totalHorasGeral = dados.reduce((acc, curr) => acc + (curr.total_horas || 0), 0);
  const totalClientesGeral = dados.reduce((acc, curr) => acc + (curr.total_clientes || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-700 animate-scale-up">
        
        {/* Header - Light: Clean | Dark: Hacker Style */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-950">
          <div className="flex items-center gap-3">
            <Shield className="text-indigo-600 dark:text-green-500 transition-colors" size={24} />
            <div>
              <h2 className="text-xl font-bold font-sans dark:font-mono text-gray-800 dark:text-green-500 tracking-tight">CENTRAL DE COMANDO</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest">Acesso Restrito: {userEmail}</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-gray-200 dark:hover:bg-gray-800 p-2 rounded-full transition-colors text-gray-500 dark:text-gray-400">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 font-sans dark:font-mono">
          
          {erro && (
            <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-500 text-red-700 dark:text-red-200 p-4 rounded mb-6 flex items-center gap-3">
              <AlertTriangle /> {erro}
            </div>
          )}

          {/* Cards de Métricas Gerais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="text-gray-500 dark:text-gray-400 text-xs uppercase mb-1">Usuários Ativos</div>
              <div className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                <Users className="text-blue-600 dark:text-blue-400"/> {totalUsuarios}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="text-gray-500 dark:text-gray-400 text-xs uppercase mb-1">Empresas Gerenciadas</div>
              <div className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                <Activity className="text-purple-600 dark:text-purple-400"/> {totalClientesGeral}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="text-gray-500 dark:text-gray-400 text-xs uppercase mb-1">Volume de Horas</div>
              <div className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                <Clock className="text-yellow-500 dark:text-yellow-400"/> {Math.round(totalHorasGeral)}h
              </div>
            </div>
          </div>

          {/* Tabela de Usuários */}
          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">Detalhamento por Cliente (SaaS)</h3>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-950 text-gray-500 dark:text-gray-400 uppercase text-xs border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3">E-mail (Login)</th>
                  <th className="px-4 py-3">Último Acesso</th>
                  <th className="px-4 py-3 text-center">Clientes</th>
                  <th className="px-4 py-3 text-center">Serviços</th>
                  <th className="px-4 py-3 text-right">Horas Lançadas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">Carregando dados da matrix...</td></tr>
                ) : dados.map((user, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-800 dark:text-white">{user.email}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Nunca'}
                    </td>
                    <td className="px-4 py-3 text-center">
                        <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs font-bold">{user.total_clientes}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                        <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs font-bold">{user.total_servicos}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-green-600 dark:text-green-400 font-bold">
                        {user.total_horas}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminModal;