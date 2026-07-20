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
  CalendarCheck
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

interface PulseSemanalProps {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

// Humor: valor 1..4 (😞..😀). O alerta de RH dispara em 😞 (valor 1) três
// semanas seguidas — a lógica de "consecutivo" fica no servidor (RPC).
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

// ISO week key no formato 'YYYY-Www', igual ao que o servidor calcula.
function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // segunda = 0
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // quinta da semana ISO
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
    // localStorage bloqueado — gera um id efêmero (sem persistência de semana).
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

  // Já respondeu esta semana neste dispositivo?
  const [jaRespondeu, setJaRespondeu] = useState<boolean>(() => {
    try {
      return localStorage.getItem(WEEK_KEY) === semanaAtual;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.body.className = theme === 'dark'
      ? 'dark bg-[#0D0D0C] text-[#E5DFD3] antialiased'
      : 'light bg-[#FBFBFA] text-[#0A0A0A] antialiased';
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
      } catch { /* localStorage bloqueado — sem persistência da semana */ }

      if (data?.ja_respondeu) setJaRespondeu(true);
      setSubmitted(true);
    } catch (err: any) {
      console.error('Falha ao registrar pulse:', err);
      setError('Não foi possível registrar agora. Tente novamente em instantes.');
    } finally {
      setSubmitting(false);
    }
  };

  const cardBg = theme === 'dark' ? 'glass-card-dark border-white/10' : 'glass-card-light border-black/10';
  const inputBg = theme === 'dark' ? 'bg-[#0D0D0C] border-white/15 focus:border-[#E5DFD3]/40' : 'bg-white border-black/15 focus:border-black/40';
  const btnPrimary = theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C] hover:bg-[#D4CBB7]' : 'bg-[#0A0A0A] text-[#FBFBFA] hover:bg-[#2A2A2A]';

  const jaRespondeuTela = submitted && jaRespondeu;

  return (
    <div className={`min-h-screen p-6 flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-500 ${
      theme === 'dark' ? 'bg-[#0D0D0C] text-[#E5DFD3]' : 'bg-[#FBFBFA] text-[#0A0A0A]'
    }`}>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-sky-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="absolute top-6 left-6">
        <Link
          to="/"
          className={`p-2 rounded-lg border transition-colors flex items-center gap-1.5 text-xs ${
            theme === 'dark' ? 'border-white/10 hover:bg-white/5 bg-[#0D0D0C]' : 'border-black/10 hover:bg-black/5 bg-[#FBFBFA]'
          }`}
        >
          <ArrowLeft size={14} /> Voltar
        </Link>
      </div>

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

      <div className="w-full max-w-lg relative z-10 my-8">
        {/* Branding */}
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold tracking-tight text-sm ${
            theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C]' : 'bg-[#0A0A0A] text-[#FBFBFA]'
          }`}>ITO</div>
          <span className="font-semibold tracking-wider text-base">INSTITUTO THIAGO OMENA</span>
        </div>

        {submitted ? (
          <div className={`rounded-2xl border p-8 text-center space-y-6 animate-fadeIn ${cardBg}`}>
            <div className="w-16 h-16 bg-sky-500/10 border border-sky-500/25 rounded-full flex items-center justify-center mx-auto text-sky-500">
              <CheckCircle size={32} />
            </div>
            <div className="space-y-3">
              <h2 className="text-xl font-bold">{jaRespondeuTela ? 'Você já respondeu esta semana' : 'Obrigado! 💛'}</h2>
              <p className="text-xs opacity-70 max-w-md mx-auto leading-relaxed">
                {jaRespondeuTela
                  ? 'Cada pessoa responde o pulse uma vez por semana. Volte na próxima sexta.'
                  : 'Seu pulse foi registrado. Ele ajuda o RH a sentir o clima da semana — de forma anônima, sem nome nem e-mail.'}
              </p>
            </div>
            <div className="text-[10px] opacity-40 font-mono flex items-center justify-center gap-1.5 pt-4 border-t border-white/5">
              <ShieldCheck size={12} className="text-sky-500" />
              Sem nome, sem e-mail, sem IP
            </div>
          </div>
        ) : (
          <div className={`rounded-2xl border p-6 md:p-8 space-y-6 ${cardBg}`}>
            <div className="text-center">
              <span className="px-2.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase bg-sky-500/10 text-sky-500 border border-sky-500/20">
                Pulse Semanal · 30 segundos
              </span>
              <h2 className="text-2xl font-bold mt-3">Como foi sua semana?</h2>
              <p className="text-xs opacity-60 mt-1 leading-relaxed">
                Toque no emoji que melhor traduz a sua semana. Anônimo — sem nome, sem e-mail.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-2">
                <AlertTriangle size={14} /> {error}
              </div>
            )}

            {/* Emojis */}
            <div className="grid grid-cols-4 gap-2">
              {HUMORES.map(h => {
                const active = humor === h.valor;
                return (
                  <button
                    key={h.valor}
                    type="button"
                    onClick={() => setHumor(h.valor)}
                    aria-label={h.label}
                    aria-pressed={active}
                    className={`flex flex-col items-center gap-1.5 py-4 rounded-2xl border transition-all ${
                      active
                        ? theme === 'dark'
                          ? 'border-[#E5DFD3]/60 bg-white/10 scale-105'
                          : 'border-black/40 bg-black/5 scale-105'
                        : theme === 'dark'
                          ? 'border-white/10 hover:bg-white/5'
                          : 'border-black/10 hover:bg-black/5'
                    }`}
                  >
                    <span className={`text-4xl transition-transform ${active ? '' : 'opacity-70 grayscale-[0.3]'}`}>
                      {h.emoji}
                    </span>
                    <span className="text-[10px] font-semibold opacity-70">{h.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Setor (opcional) */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-2">
                Seu setor <span className="opacity-50 normal-case font-normal">(opcional — ajuda o RH a agir por time, sem te identificar)</span>
              </label>
              <select
                value={setor}
                onChange={e => setSetor(e.target.value)}
                className={`w-full text-xs px-3 py-2.5 rounded-lg border ${inputBg}`}
              >
                <option value="">Prefiro não dizer</option>
                {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={submitting || humor < 1}
              className={`w-full py-3 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 ${btnPrimary} disabled:opacity-50`}
            >
              {submitting ? 'Enviando...' : <><Send size={13} /> Enviar meu pulse</>}
            </button>

            <div className="text-[10px] opacity-40 font-mono flex items-center justify-center gap-1.5 pt-4 border-t border-white/5">
              <CalendarCheck size={12} className="text-sky-500" />
              Uma resposta por semana · toda sexta
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
