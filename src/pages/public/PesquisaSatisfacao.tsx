import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Star,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Sun,
  Moon,
  Send,
  ArrowLeft,
  Clock
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useRateLimit, formatRetryAfter } from '../../hooks/useRateLimit';
import Logo from '../../components/common/Logo';

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

interface PesquisaSatisfacaoProps {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

const CATEGORIAS = ['Geral', 'Ambiente', 'Liderança', 'Benefícios', 'Carreira', 'Comunicação'] as const;
type Categoria = typeof CATEGORIAS[number];

export default function PesquisaSatisfacao({ theme, setTheme }: PesquisaSatisfacaoProps) {
  const [nota, setNota] = useState<number>(0);
  const [hoverNota, setHoverNota] = useState<number>(0);
  const [categoria, setCategoria] = useState<Categoria>('Geral');
  const [comentario, setComentario] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const rateLimit = useRateLimit('omni_pesquisa_last', THREE_HOURS_MS);

  useEffect(() => {
    document.body.className = theme === 'dark'
      ? 'dark bg-[#0A0E17] text-[#E6EAF2] antialiased'
      : 'light bg-[#F3F5FB] text-[#0F1729] antialiased';
  }, [theme]);

  const submit = async () => {
    if (!rateLimit.allowed) {
      setError(`Aguarde ${formatRetryAfter(rateLimit.retryAfterSec)} para enviar outra avaliação.`);
      return;
    }
    if (nota < 1 || nota > 5) {
      setError('Escolha uma nota de 1 a 5 estrelas.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const { error: dbErr } = await supabase.from('pesquisas_satisfacao').insert({
        nota,
        categoria,
        comentario: comentario.trim() || null
      });
      if (dbErr) throw dbErr;
      rateLimit.markSent();
      setSubmitted(true);
    } catch (err: any) {
      console.error('Falha ao registrar pesquisa:', err);
      setError('Não foi possível registrar sua avaliação agora. Tente novamente em instantes.');
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
      <div className="absolute bottom-10 right-10 w-[200px] sm:w-[300px] h-[200px] sm:h-[300px] bg-emerald-500/5 rounded-full blur-[80px] sm:blur-[100px] pointer-events-none" />

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
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto text-emerald-500 animate-bounce">
              <CheckCircle size={28} className="sm:w-8 sm:h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold">Obrigado!</h2>
              <p className="text-xs text-[#9AA4B6] max-w-md mx-auto leading-relaxed">
                Sua avaliação foi registrada anonimamente. Ela entra na média que a
                coordenação de RH acompanha no painel de compensação e clima.
              </p>
            </div>
            <div className="text-[10px] text-[#9AA4B6] font-mono flex items-center justify-center gap-1.5 pt-4 border-t border-[#1E2739]/40">
              <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
              Nenhum dado pessoal foi coletado
            </div>
            <div className="text-[10px] opacity-60 pt-2">
              Você poderá enviar outra avaliação em <strong>{formatRetryAfter(rateLimit.retryAfterSec)}</strong>.
            </div>
          </div>
        ) : (
          <div className={`rounded-2xl sm:rounded-3xl border p-4 sm:p-8 space-y-5 sm:space-y-6 ${cardBg}`}>
            <div className="space-y-1.5 sm:space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-[#4F6DF5]/10 text-[#4F6DF5] border border-[#4F6DF5]/20">
                <ShieldCheck size={13} /> Canal Anônimo
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Pesquisa de Satisfação</h2>
              <p className="text-xs text-[#9AA4B6] leading-relaxed">
                Sua resposta é completamente anônima — não gravamos e-mail, IP nem
                identificador de dispositivo. Leva menos de um minuto.
              </p>
            </div>

            {error && (
              <div className="p-3 sm:p-3.5 rounded-xl text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-2.5">
                <AlertTriangle size={16} className="shrink-0" /> {error}
              </div>
            )}

            {/* Categoria */}
            <div className="space-y-2">
              <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#9AA4B6]">
                Sobre qual assunto?
              </label>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {CATEGORIAS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategoria(c)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold border transition-all cursor-pointer ${
                      categoria === c
                        ? 'border-[#4F6DF5] bg-[#4F6DF5] text-white shadow-md shadow-[#4F6DF5]/20'
                        : theme === 'dark' ? 'border-[#1E2739] hover:bg-[#1E2739]/50 text-[#E6EAF2]' : 'border-[#E9ECF3] hover:bg-[#F3F5FB] text-[#0F1729]'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Nota */}
            <div className="space-y-2">
              <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#9AA4B6]">
                Sua nota (1 a 5)
              </label>
              <div className="flex gap-1.5 sm:gap-2 justify-center py-2">
                {[1, 2, 3, 4, 5].map(n => {
                  const filled = (hoverNota || nota) >= n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNota(n)}
                      onMouseEnter={() => setHoverNota(n)}
                      onMouseLeave={() => setHoverNota(0)}
                      className="p-1 transition-transform hover:scale-115 cursor-pointer touch-manipulation"
                      aria-label={`Nota ${n}`}
                    >
                      <Star
                        size={32}
                        strokeWidth={1.5}
                        className={`sm:w-10 sm:h-10 ${filled ? 'fill-amber-400 text-amber-400 drop-shadow-md' : theme === 'dark' ? 'text-[#1E2739]' : 'text-[#E9ECF3]'}`}
                      />
                    </button>
                  );
                })}
              </div>
              <div className="text-center text-xs font-semibold text-[#4F6DF5]">
                {nota === 0 ? 'Toque para escolher' : `${nota} de 5 estrelas`}
              </div>
            </div>

            {/* Comentário */}
            <div className="space-y-2">
              <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#9AA4B6]">
                Comentário (opcional)
              </label>
              <textarea
                value={comentario}
                onChange={e => setComentario(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Conte o que motivou sua nota..."
                className={`w-full text-xs p-3.5 sm:p-4 rounded-xl border transition-all ${inputCls}`}
              />
              <div className="text-right text-[10px] font-mono opacity-50">{comentario.length}/2000</div>
            </div>

            {!rateLimit.allowed && (
              <div className="p-3 sm:p-3.5 rounded-xl text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center gap-2.5">
                <Clock size={16} className="shrink-0" />
                <span>
                  Você já enviou uma avaliação recentemente deste dispositivo.
                  Poderá enviar outra em <strong>{formatRetryAfter(rateLimit.retryAfterSec)}</strong>.
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={submitting || nota < 1 || !rateLimit.allowed}
              className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-white bg-gradient-to-r from-[#4F6DF5] to-[#3D5AE0] hover:from-[#3D5AE0] hover:to-[#3148B8] shadow-lg shadow-[#4F6DF5]/25 transition-all disabled:opacity-50 disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting
                ? 'Enviando...'
                : !rateLimit.allowed
                  ? <><Clock size={15} /> Aguarde {formatRetryAfter(rateLimit.retryAfterSec)}</>
                  : <><Send size={15} /> Enviar avaliação anônima</>}
            </button>

            <div className="text-[10px] opacity-50 font-mono flex items-center justify-center gap-1.5 pt-4 border-t border-[#1E2739]/30 text-center">
              <ShieldCheck size={13} className="text-[#4F6DF5] shrink-0" />
              Envio anônimo — sem IP, sem e-mail, sem rastro · 1 envio a cada 3h
            </div>
          </div>
        )}

        <div className="text-center mt-4">
          <Link to="/ouvidoria" className="text-[11px] font-semibold text-[#4F6DF5] hover:underline">
            Prefere abrir uma ouvidoria (elogio, sugestão, reclamação, denúncia)?
          </Link>
        </div>
      </div>
    </div>
  );
}

