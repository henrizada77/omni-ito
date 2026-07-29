import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Sun,
  Moon,
  Send,
  ArrowLeft,
  CalendarCheck,
  Activity
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import Logo from '../../components/common/Logo';

interface PulseSemanalProps {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

const HUMORES = [
  { valor: 4, emoji: '😀', label: 'Ótima' },
  { valor: 3, emoji: '🙂', label: 'Boa' },
  { valor: 2, emoji: '😕', label: 'Mais ou menos' },
  { valor: 1, emoji: '😞', label: 'Difícil' }
] as const;

const SETORES = [
  'Biomedicina', 'Recepção', 'Financeiro', 'Call Center', 'Smartshape',
  'Enfermagem', 'Farmácia', 'Serviços Gerais', 'Nutrição', 'Administrativo'
] as const;

const DEVICE_KEY = 'omni_pulse_device';
const WEEK_KEY = 'omni_pulse_week';

function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = (crypto?.randomUUID?.() ?? `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export default function PulseSemanal({ theme, setTheme }: PulseSemanalProps) {
  const [humor, setHumor] = useState<number>(0);
  const [setor, setSetor] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const semanaAtual = isoWeekKey(new Date());

  const [jaRespondeu, setJaRespondeu] = useState<boolean>(() => {
    try {
      return localStorage.getItem(WEEK_KEY) === semanaAtual;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.body.className = theme === 'dark'
      ? 'dark bg-[#0A0E17] text-[#E6EAF2] antialiased'
      : 'light bg-[#F3F5FB] text-[#0F1729] antialiased';
  }, [theme]);

  const submit = async () => {
    if (humor < 1) {
      setError('Escolha um emoji para responder.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const { data, error: rpcErr } = await supabase.rpc('registrar_pulse', {
        p_device_id: getDeviceId(),
        p_humor: humor,
        p_setor: setor || null
      });
      if (rpcErr) throw rpcErr;
      if (data && data.success === false) throw new Error(data.error || 'Falha ao registrar.');

      try {
        localStorage.setItem(WEEK_KEY, (data?.semana_iso as string) || semanaAtual);
      } catch { /* localStorage bloqueado */ }

      if (data?.ja_respondeu) setJaRespondeu(true);
      setSubmitted(true);
    } catch (err: any) {
      console.error('Falha ao registrar pulse:', err);
      setError('Não foi possível registrar agora. Tente novamente em instantes.');
    } finally {
      setSubmitting(false);
    }
  };

  const cardBg = theme === 'dark'
    ? 'bg-[#121A2A]/90 border-[#1E2739] shadow-2xl backdrop-blur-xl'
    : 'bg-white border-[#E9ECF3] shadow-xl backdrop-blur-xl';

  const inputCls = theme === 'dark'
    ? 'bg-[#0F1626] border-[#1E2739] text-[#E6EAF2] placeholder-[#6B7688] focus:border-[#4F6DF5] focus:ring-1 focus:ring-[#4F6DF5]'
    : 'bg-[#F1F3F9] border-[#E9ECF3] text-[#0F1729] placeholder-[#8A94A6] focus:border-[#4F6DF5] focus:ring-1 focus:ring-[#4F6DF5]';

  const jaRespondeuTela = submitted && jaRespondeu;

  return (
    <div className={`min-h-screen px-4 py-6 sm:px-6 sm:py-10 flex flex-col items-center justify-center relative overflow-x-hidden transition-colors duration-500 ${
      theme === 'dark' ? 'bg-[#0A0E17] text-[#E6EAF2]' : 'bg-[#F3F5FB] text-[#0F1729]'
    }`}>
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-[#4F6DF5]/10 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[200px] sm:w-[300px] h-[200px] sm:h-[300px] bg-amber-500/5 rounded-full blur-[80px] sm:blur-[100px] pointer-events-none" />

      {/* Header Bar para Mobile / Tablet / Desktop */}
      <div className="w-full max-w-lg grid grid-cols-3 items-center mb-4 sm:mb-6 z-20">
        <div className="justify-self-start">
          <Link
            to="/"
            className={`p-2 sm:p-2.5 rounded-xl border transition-all flex items-center gap-1.5 sm:gap-2 text-xs font-semibold ${
              theme === 'dark' ? 'border-[#1E2739] hover:bg-[#121A2A] bg-[#0A0E17]/80 text-[#9AA4B6]' : 'border-[#E9ECF3] hover:bg-white bg-white/80 text-[#5B6472]'
            }`}
          >
            <ArrowLeft size={15} /> <span>Voltar</span>
          </Link>
        </div>
        
        {/* Branding Centralizado Absoluto */}
        <div className="justify-self-center flex items-center gap-2">
          <Logo className="w-7 h-7 sm:w-8 sm:h-8 text-[#4F6DF5]" />
          <span className="font-bold tracking-wider text-sm sm:text-base">ITO</span>
        </div>

        <div className="justify-self-end">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Alternar tema"
            className={`p-2 sm:p-2.5 rounded-xl border transition-all ${
              theme === 'dark' ? 'border-[#1E2739] hover:bg-[#121A2A] bg-[#0A0E17]/80 text-[#9AA4B6]' : 'border-[#E9ECF3] hover:bg-white bg-white/80 text-[#5B6472]'
            }`}
          >
            {theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-[#4F6DF5]" />}
          </button>
        </div>
      </div>

      <div className="w-full max-w-lg relative z-10 my-2 sm:my-4">
        {submitted ? (
          <div className={`rounded-2xl sm:rounded-3xl border p-5 sm:p-8 text-center space-y-5 sm:space-y-6 animate-fadeIn ${cardBg}`}>
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#4F6DF5]/10 border border-[#4F6DF5]/20 rounded-2xl flex items-center justify-center mx-auto text-[#4F6DF5] animate-bounce">
              <CheckCircle size={28} className="sm:w-8 sm:h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold">{jaRespondeuTela ? 'Você já respondeu esta semana' : 'Obrigado! 💛'}</h2>
              <p className="text-xs text-[#9AA4B6] max-w-md mx-auto leading-relaxed">
                {jaRespondeuTela
                  ? 'Cada pessoa responde o pulse uma vez por semana. Volte na próxima sexta.'
                  : 'Seu pulse foi registrado. Ele ajuda o RH a sentir o clima da semana — de forma anônima, sem nome nem e-mail.'}
              </p>
            </div>
            <div className="text-[10px] text-[#9AA4B6] font-mono flex items-center justify-center gap-1.5 pt-4 border-t border-[#1E2739]/40">
              <ShieldCheck size={13} className="text-[#4F6DF5] shrink-0" />
              Sem nome, sem e-mail, sem IP
            </div>
          </div>
        ) : (
          <div className={`rounded-2xl sm:rounded-3xl border p-4 sm:p-8 space-y-5 sm:space-y-6 ${cardBg}`}>
            <div className="text-center space-y-1.5 sm:space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-[#4F6DF5]/10 text-[#4F6DF5] border border-[#4F6DF5]/20">
                <Activity size={13} /> Pulse Semanal · 30 segundos
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Como foi sua semana?</h2>
              <p className="text-xs text-[#9AA4B6] leading-relaxed max-w-md mx-auto">
                Toque no emoji que melhor traduz a sua semana. Anônimo — sem nome, sem e-mail.
              </p>
            </div>

            {error && (
              <div className="p-3 sm:p-3.5 rounded-xl text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-2.5">
                <AlertTriangle size={16} className="shrink-0" /> {error}
              </div>
            )}

            {/* Emojis */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5">
              {HUMORES.map(h => {
                const active = humor === h.valor;
                return (
                  <button
                    key={h.valor}
                    type="button"
                    onClick={() => setHumor(h.valor)}
                    aria-label={h.label}
                    aria-pressed={active}
                    className={`flex flex-col items-center gap-1.5 sm:gap-2 py-3.5 sm:py-4 px-1 sm:px-2 rounded-2xl border transition-all cursor-pointer touch-manipulation ${
                      active
                        ? 'border-[#4F6DF5] bg-[#4F6DF5]/15 scale-105 shadow-lg shadow-[#4F6DF5]/15'
                        : theme === 'dark' ? 'border-[#1E2739] hover:bg-[#1E2739]/50' : 'border-[#E9ECF3] hover:bg-[#F3F5FB]'
                    }`}
                  >
                    <span className={`text-3xl sm:text-4xl transition-transform ${active ? 'scale-110' : 'opacity-70 grayscale-[0.2]'}`}>
                      {h.emoji}
                    </span>
                    <span className={`text-[10px] sm:text-[11px] font-bold ${active ? 'text-[#4F6DF5]' : 'opacity-70'}`}>{h.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Setor (opcional) */}
            <div className="space-y-2">
              <label htmlFor="pulse-setor" className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#9AA4B6]">
                Seu setor <span className="opacity-60 normal-case font-normal">(opcional)</span>
              </label>
              <select id="pulse-setor"
                value={setor}
                onChange={e => setSetor(e.target.value)}
                className={`w-full text-xs px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl border transition-all cursor-pointer ${inputCls}`}
              >
                <option value="">Prefiro não dizer</option>
                {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={submitting || humor < 1}
              className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-white bg-gradient-to-r from-[#4F6DF5] to-[#3D5AE0] hover:from-[#3D5AE0] hover:to-[#3148B8] shadow-lg shadow-[#4F6DF5]/25 transition-all disabled:opacity-50 disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting ? 'Enviando...' : <><Send size={15} /> Enviar meu pulse</>}
            </button>

            <div className="text-[10px] opacity-50 font-mono flex items-center justify-center gap-1.5 pt-4 border-t border-[#1E2739]/30 text-center">
              <CalendarCheck size={13} className="text-[#4F6DF5] shrink-0" />
              Uma resposta por semana · toda sexta
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

