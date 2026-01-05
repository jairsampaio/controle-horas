import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, LogIn, UserPlus, CheckCircle, Building2, User } from 'lucide-react';
import supabase from '../services/supabase';

const Auth = () => {
  const [loading, setLoading] = useState(false);
  
  // --- NOVOS CAMPOS PARA O CADASTRO COMPLETO ---
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Mensagens de Feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Tradutor de erros do Supabase
  const traduzirErro = (erro) => {
    if (!erro) return '';
    const msg = erro.message.toLowerCase();

    // --- ERROS ESPECÍFICOS ---
    if (msg.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
    if (msg.includes('user not found')) return 'Usuário não encontrado.';
    if (msg.includes('password should be at least')) return 'A senha deve ter no mínimo 6 caracteres.';
    if (msg.includes('email not confirmed')) return 'Verifique seu e-mail para confirmar o cadastro.';
    if (msg.includes('already registered')) return 'Este e-mail já está cadastrado.';
    
    // --- ERRO DO TRIGGER (SEM CONVITE) ---
    if (msg.includes('acesso negado') || msg.includes('convite')) {
        return 'Cadastro bloqueado: Este e-mail não possui um convite ativo para entrar no sistema.';
    }

    // Erro Genérico
    return erro.message || 'Ocorreu um erro desconhecido. Tente novamente.';
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    // Validação básica para cadastro
    if (isRegistering) {
        if (!nomeUsuario.trim()) {
            setErrorMsg('Por favor, informe seu nome completo.');
            setLoading(false);
            return;
        }
        if (!nomeEmpresa.trim()) {
            setErrorMsg('Por favor, informe o nome da sua empresa/consultoria.');
            setLoading(false);
            return;
        }
    }

    let result;
    
    if (isRegistering) {
      // --- AQUI ESTÁ A MUDANÇA PRINCIPAL ---
      // Enviamos os dados extras (metadata) para o Gatilho do Banco ler
      result = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
            data: {
                nome_completo: nomeUsuario, // Vai para raw_user_meta_data
                nome_empresa: nomeEmpresa   // O Gatilho vai usar isso para criar a Consultoria
            }
        }
      });
    } else {
      result = await supabase.auth.signInWithPassword({ email, password });
    }

    const { error } = result;

    if (error) {
      setErrorMsg(traduzirErro(error));
    } else {
      if (isRegistering) {
        setSuccessMsg(`Cadastro realizado! A consultoria "${nomeEmpresa}" foi criada. Verifique seu e-mail se necessário.`);
        
        if (!result.data.session) {
             setIsRegistering(false);
             setPassword('');
        }
      }
    }
    setLoading(false);
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setErrorMsg('');
    setSuccessMsg('');
    // Limpa campos extras ao trocar de aba
    if (!isRegistering) {
        setNomeUsuario('');
        setNomeEmpresa('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4 transition-colors duration-500">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-gray-700 animate-fade-in-up">
        
        {/* Cabeçalho */}
        <div className="bg-indigo-600 dark:bg-indigo-700 p-8 text-center relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-full bg-white opacity-5 transform -skew-x-12 translate-x-full group-hover:translate-x-0 transition-transform duration-700"></div>
          <h1 className="text-3xl font-bold text-white mb-2 relative z-10">
            {isRegistering ? 'Nova Consultoria' : 'Bem-vindo'}
          </h1>
          <p className="text-indigo-100 text-sm relative z-10">
            {isRegistering ? 'Cadastre sua empresa e comece' : 'Faça login para continuar'}
          </p>
        </div>

        <div className="p-8">
          
          {successMsg && (
            <div className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 text-sm flex items-start gap-3 animate-scale-in">
              <CheckCircle size={20} className="flex-shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
              <div>
                <span className="font-bold block mb-1">Sucesso!</span>
                {successMsg}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex items-start gap-3 animate-pulse">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            
            {/* CAMPOS EXTRAS QUE SÓ APARECEM NO CADASTRO */}
            {isRegistering && (
                <>
                    <div className="space-y-1 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Seu Nome</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <User size={18} />
                            </div>
                            <input
                                type="text"
                                placeholder="Ex: João Silva"
                                value={nomeUsuario}
                                onChange={(e) => setNomeUsuario(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-1 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Nome da Consultoria</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <Building2 size={18} />
                            </div>
                            <input
                                type="text"
                                placeholder="Ex: JS Consultoria"
                                value={nomeEmpresa}
                                onChange={(e) => setNomeEmpresa(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                        </div>
                    </div>
                </>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Email</label>
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
                  {isRegistering ? <UserPlus size={20} /> : <LogIn size={20} />}
                  {isRegistering ? 'Cadastrar' : 'Entrar'}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isRegistering ? 'Já tem uma conta?' : 'Quer cadastrar sua empresa?'}
            </p>
            <button
              onClick={toggleMode}
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold text-sm mt-1 transition-colors"
            >
              {isRegistering ? 'Fazer Login' : 'Criar nova conta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;