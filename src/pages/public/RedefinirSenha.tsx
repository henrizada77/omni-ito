// Definição de senha a partir do link de recuperação enviado por e-mail.
//
// Esta rota existe separada de "/" porque "/" redireciona para /app assim que
// enxerga sessão (App.tsx). O link de recuperação CRIA uma sessão ao ser aberto:
// se ele apontasse para a raiz, o usuário cairia direto no painel e nunca veria
// a tela de trocar a senha — que é justamente o que ele veio fazer.
//
// Serve também para quem nunca teve senha. A conta criada por convite ou por
// magic link nasce sem `encrypted_password`, e nesse estado o login por senha
// falha para sempre com "credenciais inválidas". resetPasswordForEmail seguido
// de updateUser é o caminho que define a primeira senha.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  KeyRound,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Sun,
  Moon,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

interface RedefinirSenhaProps {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  /**
   * Desliga o modo de recuperação no App. Só existe porque o App passa a
   * renderizar esta tela por cima de qualquer rota quando detecta recuperação —
   * sem isso, sair daqui não teria efeito: o App renderizaria a tela de novo.
   */
  onConcluido?: () => void;
}

type Estado = 'verificando' | 'invalido' | 'form' | 'salvo';

/** Mínimo do Supabase. Abaixo disso o updateUser recusa. */
const MIN_SENHA = 6;

export default function RedefinirSenha({ theme, setTheme, onConcluido }: RedefinirSenhaProps) {
  const navigate = useNavigate();

  /** Toda saída desta tela passa por aqui, senão o App a renderiza de novo. */
  const sair = () => {
    onConcluido?.();
    navigate('/', { replace: true });
  };
  const [estado, setEstado] = useState<Estado>('verificando');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    document.body.className = theme === 'dark'
      ? 'dark bg-[#0D0D0C] text-[#E5DFD3] antialiased'
      : 'light bg-[#FBFBFA] text-[#0A0A0A] antialiased';
  }, [theme]);

  useEffect(() => {
    let vivo = true;

    // O supabase-js lê o token do fragmento da URL sozinho (detectSessionInUrl)
    // e emite PASSWORD_RECOVERY quando termina.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, session) => {
      if (vivo && session) setEstado('form');
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!vivo) return;
      if (session) { setEstado('form'); return; }
      // Ausência de sessão agora não é veredito: a leitura do fragmento pode
      // não ter terminado. Só declara link inválido depois da janela, senão
      // quem tem link bom vê "expirado" por uma corrida de milissegundos.
      window.setTimeout(() => {
        if (vivo) setEstado(anterior => (anterior === 'verificando' ? 'invalido' : anterior));
      }, 2500);
    });

    return () => { vivo = false; subscription.unsubscribe(); };
  }, []);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (senha.length < MIN_SENHA) {
      setErro(`A senha precisa ter pelo menos ${MIN_SENHA} caracteres.`);
      return;
    }
    if (senha !== confirmacao) {
      setErro('As duas senhas não são iguais.');
      return;
    }

    setSalvando(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) throw error;

      // Encerra a sessão de recuperação de propósito: obriga a entrar com a
      // senha nova. Se der certo, a pessoa sabe na hora que funcionou; se não,
      // descobre agora e não daqui a uma semana.
      await supabase.auth.signOut();
      setEstado('salvo');
    } catch (err: any) {
      console.error('Falha ao redefinir senha:', err);
      setErro(err?.message || 'Não foi possível salvar a senha agora. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const cardBg = theme === 'dark' ? 'glass-card-dark border-white/10' : 'glass-card-light border-black/10';
  const btnPrimary = theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C] hover:bg-[#D4CBB7]' : 'bg-[#0A0A0A] text-[#FBFBFA] hover:bg-[#2A2A2A]';
  const inputCls = `w-full p-3 rounded-lg border bg-transparent text-sm outline-none transition-colors ${
    theme === 'dark'
      ? 'border-white/10 focus:border-white/30 bg-[#0D0D0C]'
      : 'border-black/10 focus:border-black/30 bg-white'
  }`;

  const chrome = (children: React.ReactNode) => (
    <div className={`min-h-screen p-6 flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-500 ${
      theme === 'dark' ? 'bg-[#0D0D0C] text-[#E5DFD3]' : 'bg-[#FBFBFA] text-[#0A0A0A]'
    }`}>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-brand/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-6 left-6">
        <button onClick={sair} className={`p-2 rounded-lg border transition-colors flex items-center gap-1.5 text-xs ${theme === 'dark' ? 'border-white/10 hover:bg-white/5 bg-[#0D0D0C]' : 'border-black/10 hover:bg-black/5 bg-[#FBFBFA]'}`}>
          <ArrowLeft size={14} /> Voltar
        </button>
      </div>
      <div className="absolute top-6 right-6">
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className={`p-2 rounded-lg border transition-colors ${theme === 'dark' ? 'border-white/10 hover:bg-white/5 bg-[#0D0D0C]' : 'border-black/10 hover:bg-black/5 bg-[#FBFBFA]'}`}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
      <div className="w-full max-w-md relative z-10 my-8">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold tracking-tight text-sm ${theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C]' : 'bg-[#0A0A0A] text-[#FBFBFA]'}`}>ITO</div>
          <span className="font-semibold tracking-wider text-base">ITO</span>
        </div>
        {children}
      </div>
    </div>
  );

  if (estado === 'verificando') {
    return chrome(
      <div className="flex items-center gap-2 text-xs opacity-60 py-10 justify-center">
        <Loader2 size={16} className="animate-spin" /> Validando o link...
      </div>
    );
  }

  if (estado === 'invalido') {
    return chrome(
      <div className={`rounded-2xl border p-8 text-center space-y-5 animate-fadeIn ${cardBg}`}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-rose-500/10 border border-rose-500/25 text-rose-500">
          <AlertTriangle size={30} />
        </div>
        <h2 className="text-xl font-bold">Link inválido ou expirado</h2>
        <p className="text-xs opacity-70 leading-relaxed">
          Links de redefinição valem por tempo limitado e só podem ser usados uma vez.
          Volte à tela de login e peça um novo em "Esqueci minha senha".
        </p>
        <button onClick={sair} className={`w-full py-3 rounded-lg font-bold text-sm transition-colors ${btnPrimary}`}>
          Ir para o login
        </button>
      </div>
    );
  }

  if (estado === 'salvo') {
    return chrome(
      <div className={`rounded-2xl border p-8 text-center space-y-5 animate-fadeIn ${cardBg}`}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-emerald-500/10 border border-emerald-500/25 text-emerald-500">
          <CheckCircle size={30} />
        </div>
        <h2 className="text-xl font-bold">Senha definida</h2>
        <p className="text-xs opacity-70 leading-relaxed">
          Pronto. Entre agora com seu e-mail e a senha que você acabou de criar.
        </p>
        <button onClick={sair} className={`w-full py-3 rounded-lg font-bold text-sm transition-colors ${btnPrimary}`}>
          Fazer login
        </button>
      </div>
    );
  }

  // estado === 'form'
  return chrome(
    <form onSubmit={salvar} className={`rounded-2xl border p-6 md:p-8 space-y-5 ${cardBg}`}>
      <div>
        <span className="px-2.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase bg-brand/10 text-brand border border-brand/20 inline-flex items-center gap-1">
          <KeyRound size={11} /> Redefinir senha
        </span>
        <h2 className="text-xl font-bold mt-2">Crie sua nova senha</h2>
        <p className="text-xs opacity-60 mt-1 leading-relaxed">
          Mínimo de {MIN_SENHA} caracteres. Depois de salvar, você entra no sistema com ela.
        </p>
      </div>

      {erro && (
        <div className="p-3 rounded-lg text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-2">
          <AlertTriangle size={14} /> {erro}
        </div>
      )}

      <div>
        <label htmlFor="senha-senha" className="block text-[10px] font-bold uppercase tracking-wider opacity-65 mb-1.5">Nova senha</label>
        <input id="senha-senha"
          type="password"
          required
          autoComplete="new-password"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="senha-confirmacao" className="block text-[10px] font-bold uppercase tracking-wider opacity-65 mb-1.5">Repita a nova senha</label>
        <input id="senha-confirmacao"
          type="password"
          required
          autoComplete="new-password"
          value={confirmacao}
          onChange={e => setConfirmacao(e.target.value)}
          className={inputCls}
        />
      </div>

      <div className={`flex items-start gap-2 text-[11px] leading-relaxed opacity-60 border-t pt-4 ${theme === 'dark' ? 'border-white/10' : 'border-black/10'}`}>
        <ShieldCheck size={14} className="shrink-0 mt-0.5" />
        <span>Este link só funciona uma vez. Ao salvar, sua sessão atual é encerrada e você entra de novo com a senha nova.</span>
      </div>

      <button
        type="submit"
        disabled={salvando}
        className={`w-full py-3 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2 ${btnPrimary}`}
      >
        {salvando
          ? <><Loader2 size={15} className="animate-spin" /> Salvando…</>
          : <><KeyRound size={15} /> Salvar senha</>}
      </button>
    </form>
  );
}
