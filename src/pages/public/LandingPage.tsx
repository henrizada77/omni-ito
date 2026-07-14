import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Sun, 
  Moon, 
  Mail, 
  KeyRound, 
  User
} from 'lucide-react';
import { useMouseGlow } from '../../hooks/useMouseGlow';
import { supabase } from '../../supabaseClient';

interface LandingPageProps {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

type Role = 'coordenadora_rh' | 'ti';

export default function LandingPage({ theme, setTheme }: LandingPageProps) {
  // Form States
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authCargo, setAuthCargo] = useState<Role>('ti');
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
      setAuthError(err.message || 'Erro ao realizar login.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    const emailDomain = authEmail.split('@')[1];
    if (emailDomain !== 'institutoomena.com.br' && emailDomain !== 'gmail.com') {
      setAuthError('Cadastro restrito a e-mails corporativos @institutoomena.com.br ou @gmail.com');
      setAuthLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
        options: {
          data: {
            cargo: authCargo
          }
        }
      });

      if (error) throw error;
      if (data.user) {
        alert('Cadastro realizado com sucesso! Você pode realizar o login agora.');
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
                    placeholder="nome@institutoomena.com.br ou @gmail.com"
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
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1.5">Cargo pretendido</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 opacity-45" size={14} />
                    <select
                      value={authCargo}
                      onChange={(e) => setAuthCargo(e.target.value as Role)}
                      className={`w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border focus:outline-none focus:ring-1 appearance-none transition-all ${
                        theme === 'dark' 
                          ? 'bg-[#121211] border-white/15 focus:ring-[#E5DFD3] text-[#E5DFD3]' 
                          : 'bg-black/5 border-black/15 focus:ring-[#0A0A0A] text-[#0A0A0A]'
                      }`}
                    >
                      <option value="coordenadora_rh">Coordenadora de RH (Escrita)</option>
                      <option value="ti">Suporte TI (Apenas Leitura)</option>
                    </select>
                  </div>
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
