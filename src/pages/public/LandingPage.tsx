import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Sun,
  Moon,
  Mail,
  KeyRound,
  User,
  Star,
  MessageSquare
} from 'lucide-react';
import { useMouseGlow } from '../../hooks/useMouseGlow';
import { supabase } from '../../supabaseClient';

interface LandingPageProps {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

// Único endereço fora do domínio institucional com cadastro permitido: o TI
// não tem conta @itoinstituto.com.br. Mantido em sincronia com o trigger
// trg_fn_handle_new_user (supabase/sprint10_fix_escalacao_privilegio.sql).
const TI_EMAIL = 'ito.thiagosilva@gmail.com';

export default function LandingPage({ theme, setTheme }: LandingPageProps) {
  // Form States
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Mouse Glow hooks
  const glowHero = useMouseGlow();
  const glowAuth = useMouseGlow();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword
      });
      if (error) throw error;
    } catch (err: any) {
      // O Supabase devolve "Invalid login credentials" tanto para senha errada
      // quanto para e-mail ainda não confirmado — distinguir os dois evita que o
      // usuário fique tentando a senha achando que errou, quando na verdade
      // falta clicar no link de confirmação.
      const msg = err?.message || '';
      if (err?.code === 'email_not_confirmed' || /email not confirmed/i.test(msg)) {
        setAuthError('Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada (e o spam) e clique no link antes de entrar.');
      } else if (/invalid login credentials/i.test(msg)) {
        setAuthError('E-mail ou senha incorretos. Se você acabou de se cadastrar, confirme o e-mail antes de fazer login.');
      } else {
        setAuthError(msg || 'Erro ao realizar login.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    // Espelha a regra do trigger trg_fn_handle_new_user. Só antecipa o erro:
    // quem valida de verdade é o banco, que esta checagem não alcança.
    const emailDomain = authEmail.split('@')[1];
    if (authEmail !== TI_EMAIL && emailDomain !== 'itoinstituto.com.br') {
      setAuthError('Cadastro restrito a e-mails corporativos @itoinstituto.com.br');
      setAuthLoading(false);
      return;
    }

    try {
      // O cargo não é enviado: o banco define 'ti' para todo cadastro novo, e
      // promoção a coordenadora_rh é feita administrativamente.
      // emailRedirectTo faz o link de confirmação apontar para o domínio de onde
      // o cadastro partiu (produção ou localhost no dev), em vez do Site URL
      // fixo do projeto. Só tem efeito se este domínio estiver na allowlist de
      // Redirect URLs do Supabase — ver Authentication → URL Configuration.
      const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (error) throw error;

      // Quando o e-mail já existe, o Supabase (anti-enumeração) NÃO dá erro:
      // devolve um user com identities vazio. Tratar como "já cadastrado".
      const jaCadastrado =
        !!data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0;

      if (jaCadastrado) {
        setAuthError('Este e-mail já possui cadastro. Faça login ou use "esqueci minha senha".');
        setAuthMode('login');
        setAuthPassword('');
      } else if (data.session) {
        // Confirmação de e-mail DESLIGADA no projeto: o cadastro já vem logado.
        // O onAuthStateChange em App.tsx assume e redireciona para /app.
        setAuthPassword('');
      } else {
        // Confirmação de e-mail LIGADA: a conta existe mas está inativa até o
        // usuário clicar no link enviado. Não é "pode logar agora" — era essa
        // mensagem que enganava, mandando tentar login antes de confirmar.
        alert(
          'Cadastro criado! Enviamos um e-mail de confirmação para ' + authEmail + '.\n\n' +
          'Abra o link do e-mail para ativar a conta ANTES de fazer login. ' +
          'Se o link levar para um endereço que não abre, avise o TI: o redirecionamento do Supabase precisa ser ajustado.'
        );
        setAuthMode('login');
        setAuthPassword('');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Erro ao realizar cadastro.');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 relative overflow-hidden ${
      theme === 'dark' ? 'bg-[#0D0D0C] text-[#E5DFD3]' : 'bg-[#FBFBFA] text-[#0A0A0A]'
    }`}>
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#E5DFD3]/3 rounded-full blur-[120px] pointer-events-none" />

      {/* Header theme button */}
      <div className="absolute top-6 right-6">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={`p-2 rounded-lg border transition-colors ${
            theme === 'dark' ? 'border-white/10 hover:bg-white/5 bg-[#0D0D0C]' : 'border-black/10 hover:bg-black/5 bg-[#FBFBFA]'
          }`}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-16 flex flex-col lg:flex-row items-center justify-between gap-12 min-h-screen relative z-10">
        
        {/* Pitch Text Left Column */}
        <div className="max-w-xl space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase border glass-card-dark"
               style={{
                 borderColor: theme === 'dark' ? 'rgba(229, 223, 211, 0.15)' : 'rgba(10, 10, 10, 0.1)'
               }}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Autenticado via Supabase RLS
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] font-sans">
            A Nova Era da Gestão Operacional do <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E5DFD3] via-[#D4CBB7] to-[#E5DFD3]"
                  style={{
                    backgroundImage: theme === 'dark' ? '' : 'linear-gradient(to right, #0A0A0A, #4A4A4A)'
                  }}>
              Instituto Thiago Omena
            </span>
          </h1>

          <p className="text-sm md:text-base opacity-75 leading-relaxed">
            Elimine planilhas paralelas, processos manuais e papéis. Centralize admissões, contratos e onboarding em uma única plataforma digital segura, imutável e auditada via RLS.
          </p>

          {/* Interactive alerts mockup (pitch) */}
          <div 
            ref={glowHero.ref}
            onMouseMove={glowHero.onMouseMove}
            onMouseEnter={glowHero.onMouseEnter}
            onMouseLeave={glowHero.onMouseLeave}
            style={glowHero.style}
            className={`glow-card rounded-2xl border p-5 transition-all text-left ${
              theme === 'dark' ? 'glass-card-dark glow-border-dark' : 'glass-card-light glow-border-light'
            }`}
          >
            <div className={`glow-overlay-${theme}`}></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 flex-shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase opacity-60">Alertas Operacionais de Experiência</h4>
                <p className="text-xs font-semibold">Monitoramento automático de prazos de 45 e 90 dias ativo.</p>
              </div>
            </div>
          </div>

          {/* Canais anônimos — descobríveis por qualquer visitante sem precisar
              de login. RH divulga o link direto pela equipe. */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              to="/pulse"
              className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-lg leading-none">
                🙂
              </div>
              <div className="text-left">
                <div className="text-xs font-bold">Pulse Semanal</div>
                <div className="text-[10px] opacity-60">Como foi sua semana? · 30 segundos</div>
              </div>
            </Link>
            <Link
              to="/pesquisa"
              className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-500">
                <Star size={16} />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold">Pesquisa de Satisfação</div>
                <div className="text-[10px] opacity-60">Anônima · 1 minuto</div>
              </div>
            </Link>
            <Link
              to="/ouvidoria"
              className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-500">
                <MessageSquare size={16} />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold">Ouvidoria</div>
                <div className="text-[10px] opacity-60">Elogio, sugestão, reclamação ou denúncia</div>
              </div>
            </Link>
            <Link
              to="/cultura"
              className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-teal-500/10 border border-teal-500/25 flex items-center justify-center text-lg leading-none">
                📖
              </div>
              <div className="text-left">
                <div className="text-xs font-bold">Manual de Cultura</div>
                <div className="text-[10px] opacity-60">Nossos valores e princípios</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Login / SignUp Form Right Column */}
        <div 
          ref={glowAuth.ref}
          onMouseMove={glowAuth.onMouseMove}
          onMouseEnter={glowAuth.onMouseEnter}
          onMouseLeave={glowAuth.onMouseLeave}
          style={glowAuth.style}
          className={`glow-card w-full max-w-md rounded-2xl border p-6 md:p-8 transition-all ${
            theme === 'dark' ? 'glass-card-dark' : 'glass-card-light'
          }`}
        >
          <div className={`glow-overlay-${theme}`}></div>
          <div className="relative z-10 space-y-6">
            
            <div className="text-center space-y-2">
              <div className={`w-10 h-10 rounded-xl mx-auto flex items-center justify-center font-bold tracking-tight text-base ${
                theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C]' : 'bg-[#0A0A0A] text-[#FBFBFA]'
              }`}>
                ITO
              </div>
              <h2 className="text-2xl font-bold tracking-tight font-sans">Omni ITO</h2>
              <p className="text-xs opacity-60">Portal Interno do Colaborador</p>
            </div>

            {authError && (
              <div className="p-3 rounded-lg text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-2">
                <AlertTriangle size={14} />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={authMode === 'login' ? handleLogin : handleSignUp} className="space-y-4">
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1.5">E-mail corporativo / pessoal</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 opacity-45" size={14} />
                  <input
                    type="email"
                    required
                    placeholder="nome@itoinstituto.com.br"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className={`w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border focus:outline-none focus:ring-1 transition-all ${
                      theme === 'dark' 
                        ? 'bg-[#121211] border-white/15 focus:ring-[#E5DFD3] text-[#E5DFD3]' 
                        : 'bg-black/5 border-black/15 focus:ring-[#0A0A0A] text-[#0A0A0A]'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1.5">Senha</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 opacity-45" size={14} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className={`w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border focus:outline-none focus:ring-1 transition-all ${
                      theme === 'dark' 
                        ? 'bg-[#121211] border-white/15 focus:ring-[#E5DFD3] text-[#E5DFD3]' 
                        : 'bg-black/5 border-black/15 focus:ring-[#0A0A0A] text-[#0A0A0A]'
                    }`}
                  />
                </div>
              </div>

              {authMode === 'signup' && (
                <div className="animate-fadeIn">
                  <p className={`text-[10px] leading-relaxed opacity-60 ${theme === 'dark' ? 'text-[#E5DFD3]' : 'text-[#0A0A0A]'}`}>
                    <User className="inline mr-1.5 -mt-0.5 opacity-60" size={12} />
                    Novas contas entram como Suporte TI, com acesso de leitura.
                    O acesso de coordenação é liberado pela equipe depois do cadastro.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className={`w-full py-2.5 rounded-lg text-xs font-bold tracking-wide uppercase transition-colors ${
                  theme === 'dark' 
                    ? 'bg-[#E5DFD3] text-[#0D0D0C] hover:bg-[#D4CBB7]' 
                    : 'bg-[#0A0A0A] text-[#FBFBFA] hover:bg-[#2A2A2A]'
                } disabled:opacity-50`}
              >
                {authLoading ? 'Processando...' : (authMode === 'login' ? 'Acessar Painel' : 'Registrar Usuário')}
              </button>

            </form>

            <div className="text-center pt-2">
              <button
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'signup' : 'login');
                  setAuthError('');
                }}
                className="text-[11px] font-medium opacity-65 hover:opacity-100 transition-opacity underline underline-offset-4"
              >
                {authMode === 'login' 
                  ? 'Não possui uma conta? Cadastre-se' 
                  : 'Já possui uma conta? Faça Login'}
              </button>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}
