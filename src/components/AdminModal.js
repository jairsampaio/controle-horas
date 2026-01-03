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
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-gray-900 text-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-700">
        
        {/* Header Hacker Style */}
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-950">
          <div className="flex items-center gap-3">
            <Shield className="text-green-500" size={24} />
            <div>
              <h2 className="text-xl font-bold font-mono text-green-500">CENTRAL DE COMANDO</h2>
              <p className="text-xs text-gray-500 uppercase tracking-widest">Acesso Restrito: {userEmail}</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-gray-800 p-2 rounded-full transition-colors"><X size={24} /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 font-mono">
          
          {erro && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded mb-6 flex items-center gap-3">
              <AlertTriangle /> {erro}
            </div>
          )}

          {/* Cards de Métricas Gerais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-800 p-4 rounded border border-gray-700">
              <div className="text-gray-400 text-xs uppercase mb-1">Usuários Ativos</div>
              <div className="text-2xl font-bold flex items-center gap-2"><Users className="text-blue-400"/> {totalUsuarios}</div>
            </div>
            <div className="bg-gray-800 p-4 rounded border border-gray-700">
              <div className="text-gray-400 text-xs uppercase mb-1">Empresas Gerenciadas</div>
              <div className="text-2xl font-bold flex items-center gap-2"><Activity className="text-purple-400"/> {totalClientesGeral}</div>
            </div>
            <div className="bg-gray-800 p-4 rounded border border-gray-700">
              <div className="text-gray-400 text-xs uppercase mb-1">Volume de Horas</div>
              <div className="text-2xl font-bold flex items-center gap-2"><Clock className="text-yellow-400"/> {Math.round(totalHorasGeral)}h</div>
            </div>
          </div>

          {/* Tabela de Usuários */}
          <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Detalhamento por Cliente (SaaS)</h3>
          
          <div className="bg-gray-800 rounded border border-gray-700 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-950 text-gray-400 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">E-mail (Login)</th>
                  <th className="px-4 py-3">Último Acesso</th>
                  <th className="px-4 py-3 text-center">Clientes</th>
                  <th className="px-4 py-3 text-center">Serviços</th>
                  <th className="px-4 py-3 text-right">Horas Lançadas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">Carregando dados da matrix...</td></tr>
                ) : dados.map((user, idx) => (
                  <tr key={idx} className="hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-white">{user.email}</td>
                    <td className="px-4 py-3 text-gray-400">
                        {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Nunca'}
                    </td>
                    <td className="px-4 py-3 text-center">
                        <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">{user.total_clientes}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                        <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">{user.total_servicos}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-green-400 font-bold">
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