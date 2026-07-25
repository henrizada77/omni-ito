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
  MessageSquare,
  ShieldCheck,
  Heart
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

  const canaisAnonimos: { to: string; node: React.ReactNode; tone: string; titulo: string; desc: string }[] = [
    { to: '/pulse', node: '🙂', tone: 'amber', titulo: 'Pulse Semanal', desc: 'Como foi sua semana? · 30 segundos' },
    { to: '/pesquisa', node: <Star size={16} />, tone: 'emerald', titulo: 'Pesquisa de Satisfação', desc: 'Anônima · 1 minuto' },
    { to: '/ouvidoria', node: <MessageSquare size={16} />, tone: 'sky', titulo: 'Ouvidoria', desc: 'Elogio, sugestão ou desabafo' },
    { to: '/cultura', node: '📖', tone: 'teal', titulo: 'Manual de Cultura', desc: 'Nossos valores e princípios' },
  ];

  const toneMap: Record<string, string> = {
    amber: 'bg-amber-500/12 text-amber-500 border-amber-500/25',
    emerald: 'bg-emerald-500/12 text-emerald-500 border-emerald-500/25',
    sky: 'bg-sky-500/12 text-sky-500 border-sky-500/25',
    teal: 'bg-teal-500/12 text-teal-500 border-teal-500/25',
  };

  return (
    <div className="app-aurora min-h-screen transition-colors duration-500 relative overflow-hidden bg-canvas text-fg">
      {/* Blobs de luz flutuantes (motion leve, só transform) */}
      <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 w-[460px] h-[460px] rounded-full bg-brand/20 blur-[130px] animate-floaty" />
      <div aria-hidden className="pointer-events-none absolute top-1/3 -right-32 w-[420px] h-[420px] rounded-full bg-teal-400/10 blur-[130px] animate-floaty2" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/3 w-[400px] h-[400px] rounded-full bg-brand/12 blur-[130px] animate-floaty" />

      {/* Header theme button */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Alternar tema"
          className="p-2.5 rounded-xl border border-line glass-fill hover:bg-surface-2 transition-colors"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-16 flex flex-col lg:flex-row items-center justify-between gap-12 min-h-screen relative z-10">

        {/* Pitch Text Left Column */}
        <div className="max-w-xl space-y-7 text-center lg:text-left reveal-up">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-rounded font-bold tracking-wide border border-line glass-fill">
            <Heart size={12} className="text-brand" />
            Feito com cuidado · seguro e auditado
          </div>

          <div className="space-y-3">
            <h1 className="font-display text-[40px] md:text-[54px] font-semibold tracking-tight leading-[1.03]">
              Cuidar de quem
              <br />cuida de pessoas.
            </h1>
            <p className="text-base md:text-lg text-fg-secondary leading-relaxed">
              O portal de gente do{' '}
              <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-brand via-brand-strong to-brand">
                ITO
              </span>
              . Admissões, contratos, onboarding e o bem-estar do time — reunidos em um só lugar, com a delicadeza que as pessoas merecem.
            </p>
          </div>

          {/* Card-pitch interativo (glow que segue o mouse = motion) */}
          <div
            ref={glowHero.ref}
            onMouseMove={glowHero.onMouseMove}
            onMouseEnter={glowHero.onMouseEnter}
            onMouseLeave={glowHero.onMouseLeave}
            style={glowHero.style}
            className={`glow-card rounded-2xl border border-line glass-fill glass-sheen p-5 transition-all text-left ${theme === 'dark' ? 'glow-border-dark' : 'glow-border-light'}`}
          >
            <div className={`glow-overlay-${theme}`}></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-11 h-11 rounded-2xl bg-brand/12 border border-brand/25 flex items-center justify-center text-brand flex-shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-rounded text-[10px] font-bold uppercase tracking-wider text-fg-muted">Cuidado que se antecipa</h4>
                <p className="text-xs md:text-sm font-medium text-fg">Avisamos sobre prazos de experiência (45 e 90 dias) antes que passem — ninguém fica para trás.</p>
              </div>
            </div>
          </div>

          {/* Canais anônimos — descobríveis por qualquer visitante sem login. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {canaisAnonimos.map((c) => (
              <Link
                key={c.to}
                to={c.to}
                className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-line glass-fill card-glow hover:-translate-y-0.5 hover:border-brand/40 transition-all"
              >
                <div className={`w-9 h-9 rounded-full border flex items-center justify-center text-lg leading-none ${toneMap[c.tone]}`}>
                  {c.node}
                </div>
                <div className="text-left min-w-0">
                  <div className="text-xs font-bold truncate">{c.titulo}</div>
                  <div className="text-[10px] text-fg-muted truncate">{c.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Login / SignUp Form Right Column */}
        <div
          ref={glowAuth.ref}
          onMouseMove={glowAuth.onMouseMove}
          onMouseEnter={glowAuth.onMouseEnter}
          onMouseLeave={glowAuth.onMouseLeave}
          style={glowAuth.style}
          className="glow-card w-full max-w-md rounded-[22px] border border-line glass-fill glass-blur glass-sheen p-6 md:p-8 transition-all reveal-up"
        >
          <div className={`glow-overlay-${theme}`}></div>
          <div className="relative z-10 space-y-6">

            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center font-rounded font-extrabold tracking-tight text-lg bg-brand text-white shadow-[0_10px_30px_-8px_rgba(79,109,245,0.6)]">
                ITO
              </div>
              <h2 className="font-display text-2xl font-semibold tracking-tight">Omni ITO</h2>
              <p className="text-xs text-fg-secondary">
                {authMode === 'login' ? 'Que bom te ver de novo. 💙' : 'Vamos criar o seu acesso.'}
              </p>
            </div>

            {authError && (
              <div className="p-3 rounded-lg text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-2">
                <AlertTriangle size={14} />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={authMode === 'login' ? handleLogin : handleSignUp} className="space-y-4">

              <div>
                <label className="block font-rounded text-[10px] font-bold uppercase tracking-wider text-fg-muted mb-1.5">E-mail corporativo / pessoal</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-fg-muted" size={14} />
                  <input
                    type="email"
                    required
                    placeholder="nome@itoinstituto.com.br"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-line bg-surface-2 text-fg focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block font-rounded text-[10px] font-bold uppercase tracking-wider text-fg-muted mb-1.5">Senha</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 text-fg-muted" size={14} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-line bg-surface-2 text-fg focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/20 transition-all"
                  />
                </div>
              </div>

              {authMode === 'signup' && (
                <div className="animate-fadeIn">
                  <p className="text-[10px] leading-relaxed text-fg-secondary">
                    <User className="inline mr-1.5 -mt-0.5 text-fg-muted" size={12} />
                    Novas contas entram como Suporte TI, com acesso de leitura. O acesso de coordenação é liberado pela equipe depois do cadastro.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 rounded-xl text-xs font-bold tracking-wide uppercase bg-brand text-white hover:bg-brand-strong transition-colors disabled:opacity-50 shadow-[0_10px_30px_-10px_rgba(79,109,245,0.6)]"
              >
                {authLoading ? 'Só um instante…' : (authMode === 'login' ? 'Entrar' : 'Criar meu acesso')}
              </button>

            </form>

            <div className="text-center pt-1">
              <button
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'signup' : 'login');
                  setAuthError('');
                }}
                className="text-[11px] font-medium text-fg-secondary hover:text-fg transition-colors underline underline-offset-4"
              >
                {authMode === 'login'
                  ? 'Ainda não tem conta? Cadastre-se'
                  : 'Já tem conta? Entrar'}
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
