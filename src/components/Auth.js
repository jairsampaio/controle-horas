import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, LogIn, ShieldCheck } from 'lucide-react';
import supabase from '../services/supabase';

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Mensagens de Feedback
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    // Apenas Login (SignIn) - Sem lógica de cadastro público
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('invalid login credentials')) setErrorMsg('E-mail ou senha incorretos.');
      else if (msg.includes('email not confirmed')) setErrorMsg('E-mail não confirmado.');
      else setErrorMsg('Erro ao acessar. Verifique suas credenciais.');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4 transition-colors duration-500">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-gray-700 animate-fade-in-up">
        
        {/* Cabeçalho - Estilo "Área Restrita" */}
        <div className="bg-indigo-900 dark:bg-indigo-950 p-8 text-center relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-full bg-white opacity-5 transform -skew-x-12 translate-x-full group-hover:translate-x-0 transition-transform duration-700"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <ShieldCheck className="text-white mb-2 opacity-90" size={32} />
            <h1 className="text-2xl font-bold text-white mb-1">
                Área Restrita
            </h1>
            <p className="text-indigo-200 text-xs uppercase tracking-wider">
                Acesso Exclusivo para Assinantes
            </p>
          </div>
        </div>

        <div className="p-8">
          
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex items-start gap-3 animate-pulse">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Email Corporativo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-600 cursor-pointer transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all transform active:scale-95 shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <LogIn size={20} /> Entrar no Sistema
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center border-t border-gray-100 dark:border-gray-700 pt-4">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Não possui acesso?
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
              Entre em contato com o administrador da sua consultoria para solicitar o cadastro.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;