import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Sun,
  Moon,
  Send,
  ArrowLeft,
  ThumbsUp,
  Lightbulb,
  Flag,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useRateLimit, formatRetryAfter } from '../../hooks/useRateLimit';
import Logo from '../../components/common/Logo';

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

interface OuvidoriaProps {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

const TIPOS = [
  { value: 'Elogio', icon: ThumbsUp, hint: 'Reconhecer algo ou alguém' },
  { value: 'Sugestão', icon: Lightbulb, hint: 'Propor uma melhoria' },
  { value: 'Reclamação', icon: Flag, hint: 'Registrar um incômodo' },
  { value: 'Denúncia', icon: ShieldAlert, hint: 'Conduta grave / assédio / fraude' }
] as const;

type Tipo = typeof TIPOS[number]['value'];

const SETORES = [
  'Recepção', 'Enfermagem', 'Biomedicina', 'Farmácia', 'Nutrição',
  'Call Center', 'Smartshape', 'Financeiro', 'Serviços Gerais', 'Coordenação/RH', 'Outro'
];

export default function Ouvidoria({ theme, setTheme }: OuvidoriaProps) {
  const [tipo, setTipo] = useState<Tipo | ''>('');
  const [setor, setSetor] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const rateLimit = useRateLimit('omni_ouvidoria_last', THREE_HOURS_MS);

  useEffect(() => {
    document.body.className = theme === 'dark'
      ? 'dark bg-[#0A0E17] text-[#E6EAF2] antialiased'
      : 'light bg-[#F3F5FB] text-[#0F1729] antialiased';
  }, [theme]);

  const submit = async () => {
    if (!rateLimit.allowed) {
      return setError(`Aguarde ${formatRetryAfter(rateLimit.retryAfterSec)} para enviar outra manifestação.`);
    }
    if (!tipo) return setError('Escolha o tipo da manifestação.');
    if (mensagem.trim().length < 10) return setError('Descreva a manifestação com pelo menos 10 caracteres.');

    setSubmitting(true);
    setError('');
    try {
      const { error: dbErr } = await supabase.from('ouvidoria_manifestacoes').insert({
        tipo,
        setor_alvo: setor || null,
        mensagem: mensagem.trim()
      });
      if (dbErr) throw dbErr;
      rateLimit.markSent();
      setSubmitted(true);
    } catch (err: any) {
      console.error('Falha ao registrar ouvidoria:', err);
      setError('Não foi possível registrar sua manifestação agora. Tente novamente em instantes.');
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

  return (
    <div className={`min-h-screen px-4 py-6 sm:px-6 sm:py-10 flex flex-col items-center justify-center relative overflow-x-hidden transition-colors duration-500 ${
      theme === 'dark' ? 'bg-[#0A0E17] text-[#E6EAF2]' : 'bg-[#F3F5FB] text-[#0F1729]'
    }`}>
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-[#4F6DF5]/10 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[200px] sm:w-[300px] h-[200px] sm:h-[300px] bg-sky-500/5 rounded-full blur-[80px] sm:blur-[100px] pointer-events-none" />

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
              <h2 className="text-xl sm:text-2xl font-bold">Manifestação recebida</h2>
              <p className="text-xs text-[#9AA4B6] max-w-md mx-auto leading-relaxed">
                Sua manifestação foi registrada anonimamente. A coordenação de RH
                analisa e trata cada mensagem — mas <strong>não temos como responder de volta</strong>,
                justamente porque nenhum dado pessoal é armazenado.
              </p>
            </div>
            <div className="text-[10px] text-[#9AA4B6] font-mono flex items-center justify-center gap-1.5 pt-4 border-t border-[#1E2739]/40">
              <ShieldCheck size={13} className="text-[#4F6DF5] shrink-0" />
              Sem IP, sem e-mail, sem identificador de dispositivo
            </div>
            <div className="text-[10px] opacity-60 pt-2">
              Você poderá enviar outra manifestação em <strong>{formatRetryAfter(rateLimit.retryAfterSec)}</strong>.
            </div>
          </div>
        ) : (
          <div className={`rounded-2xl sm:rounded-3xl border p-4 sm:p-8 space-y-5 sm:space-y-6 ${cardBg}`}>
            <div className="space-y-1.5 sm:space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-[#4F6DF5]/10 text-[#4F6DF5] border border-[#4F6DF5]/20">
                <ShieldCheck size={13} /> Canal Anônimo
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Ouvidoria</h2>
              <p className="text-xs text-[#9AA4B6] leading-relaxed">
                Elogios, sugestões, reclamações ou denúncias vão direto para a
                coordenação. Nenhum dado seu é coletado — nem IP, nem e-mail.
              </p>
            </div>

            {error && (
              <div className="p-3 sm:p-3.5 rounded-xl text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-2.5">
                <AlertTriangle size={16} className="shrink-0" /> {error}
              </div>
            )}

            {/* Tipo */}
            <div className="space-y-2">
              <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#9AA4B6]">
                Tipo de manifestação *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                {TIPOS.map(({ value, icon: Icon, hint }) => {
                  const active = tipo === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTipo(value)}
                      className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border text-left transition-all flex sm:block items-center gap-3 sm:gap-0 cursor-pointer ${
                        active
                          ? 'border-[#4F6DF5] bg-[#4F6DF5]/10 text-[#4F6DF5] shadow-md shadow-[#4F6DF5]/10'
                          : theme === 'dark' ? 'border-[#1E2739] hover:bg-[#1E2739]/50 text-[#E6EAF2]' : 'border-[#E9ECF3] hover:bg-[#F3F5FB] text-[#0F1729]'
                      }`}
                    >
                      <Icon size={18} className={`sm:mb-1.5 shrink-0 ${active ? 'text-[#4F6DF5]' : 'opacity-60'}`} />
                      <div>
                        <div className="text-xs font-bold">{value}</div>
                        <div className="text-[10px] opacity-60">{hint}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Setor */}
            <div className="space-y-2">
              <label htmlFor="ouv-setor" className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#9AA4B6]">
                Setor envolvido (opcional)
              </label>
              <select id="ouv-setor"
                value={setor}
                onChange={e => setSetor(e.target.value)}
                className={`w-full text-xs px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl border transition-all cursor-pointer ${inputCls}`}
              >
                <option value="">— Prefiro não especificar —</option>
                {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Mensagem */}
            <div className="space-y-2">
              <label htmlFor="ouv-mensagem" className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#9AA4B6]">
                Mensagem *
              </label>
              <textarea id="ouv-mensagem"
                value={mensagem}
                onChange={e => setMensagem(e.target.value)}
                rows={4}
                maxLength={4000}
                placeholder="Descreva com o máximo de detalhe possível. Evite dados que te identifiquem se você quer permanecer anônimo."
                className={`w-full text-xs p-3.5 sm:p-4 rounded-xl border transition-all ${inputCls}`}
              />
              <div className="text-right text-[10px] font-mono opacity-50">{mensagem.length}/4000</div>
            </div>

            {!rateLimit.allowed && (
              <div className="p-3 sm:p-3.5 rounded-xl text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center gap-2.5">
                <Clock size={16} className="shrink-0" />
                <span>
                  Você já enviou uma manifestação recentemente deste dispositivo.
                  Poderá enviar outra em <strong>{formatRetryAfter(rateLimit.retryAfterSec)}</strong>.
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={submitting || !tipo || mensagem.trim().length < 10 || !rateLimit.allowed}
              className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-white bg-gradient-to-r from-[#4F6DF5] to-[#3D5AE0] hover:from-[#3D5AE0] hover:to-[#3148B8] shadow-lg shadow-[#4F6DF5]/25 transition-all disabled:opacity-50 disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting
                ? 'Enviando...'
                : !rateLimit.allowed
                  ? <><Clock size={15} /> Aguarde {formatRetryAfter(rateLimit.retryAfterSec)}</>
                  : <><Send size={15} /> Enviar anonimamente</>}
            </button>

            <div className="text-[10px] opacity-50 font-mono flex items-center justify-center gap-1.5 pt-4 border-t border-[#1E2739]/30 text-center">
              <ShieldCheck size={13} className="text-[#4F6DF5] shrink-0" />
              Envio anônimo — sem IP, sem e-mail, sem rastro · 1 envio a cada 3h
            </div>
          </div>
        )}

        <div className="text-center mt-4">
          <Link to="/pesquisa" className="text-[11px] font-semibold text-[#4F6DF5] hover:underline flex items-center justify-center gap-1.5">
            <MessageSquare size={13} /> Prefere avaliar com nota de 1 a 5?
          </Link>
        </div>
      </div>
    </div>
  );
}

