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
  ArrowLeft
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

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

  useEffect(() => {
    document.body.className = theme === 'dark'
      ? 'bg-[#0D0D0C] text-[#E5DFD3] antialiased'
      : 'bg-[#FBFBFA] text-[#0A0A0A] antialiased';
  }, [theme]);

  const submit = async () => {
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
      setSubmitted(true);
    } catch (err: any) {
      console.error('Falha ao registrar pesquisa:', err);
      setError('Não foi possível registrar sua avaliação agora. Tente novamente em instantes.');
    } finally {
      setSubmitting(false);
    }
  };

  const cardBg = theme === 'dark' ? 'glass-card-dark border-white/10' : 'glass-card-light border-black/10';
  const inputBg = theme === 'dark' ? 'bg-[#0D0D0C] border-white/15 focus:border-[#E5DFD3]/40' : 'bg-white border-black/15 focus:border-black/40';
  const btnPrimary = theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C] hover:bg-[#D4CBB7]' : 'bg-[#0A0A0A] text-[#FBFBFA] hover:bg-[#2A2A2A]';

  return (
    <div className={`min-h-screen p-6 flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-500 ${
      theme === 'dark' ? 'bg-[#0D0D0C] text-[#E5DFD3]' : 'bg-[#FBFBFA] text-[#0A0A0A]'
    }`}>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

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
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/25 rounded-full flex items-center justify-center mx-auto text-emerald-500 animate-bounce">
              <CheckCircle size={32} />
            </div>
            <div className="space-y-3">
              <h2 className="text-xl font-bold">Obrigado!</h2>
              <p className="text-xs opacity-70 max-w-md mx-auto leading-relaxed">
                Sua avaliação foi registrada anonimamente. Ela entra na média que a
                coordenação de RH acompanha no painel de compensação e clima.
              </p>
            </div>
            <div className="text-[10px] opacity-40 font-mono flex items-center justify-center gap-1.5 pt-4 border-t border-white/5">
              <ShieldCheck size={12} className="text-emerald-500" />
              Nenhum dado pessoal foi coletado
            </div>
            <button
              onClick={() => {
                setSubmitted(false);
                setNota(0);
                setComentario('');
                setCategoria('Geral');
              }}
              className={`text-xs px-4 py-1.5 rounded-lg font-bold ${btnPrimary}`}
            >
              Enviar outra avaliação
            </button>
          </div>
        ) : (
          <div className={`rounded-2xl border p-6 md:p-8 space-y-6 ${cardBg}`}>
            <div>
              <span className="px-2.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Canal Anônimo
              </span>
              <h2 className="text-xl font-bold mt-2">Pesquisa de Satisfação</h2>
              <p className="text-xs opacity-60 mt-1 leading-relaxed">
                Sua resposta é completamente anônima — não gravamos e-mail, IP nem
                identificador de dispositivo. Leva menos de um minuto.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-2">
                <AlertTriangle size={14} /> {error}
              </div>
            )}

            {/* Categoria */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-2">
                Sobre qual assunto?
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIAS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategoria(c)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                      categoria === c
                        ? theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C] border-transparent' : 'bg-[#0A0A0A] text-[#FBFBFA] border-transparent'
                        : theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Nota */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-2">
                Sua nota (1 a 5)
              </label>
              <div className="flex gap-1 justify-center py-2">
                {[1, 2, 3, 4, 5].map(n => {
                  const filled = (hoverNota || nota) >= n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNota(n)}
                      onMouseEnter={() => setHoverNota(n)}
                      onMouseLeave={() => setHoverNota(0)}
                      className="p-1 transition-transform hover:scale-110"
                      aria-label={`Nota ${n}`}
                    >
                      <Star
                        size={40}
                        strokeWidth={1.5}
                        className={filled ? 'fill-amber-400 text-amber-400' : theme === 'dark' ? 'text-white/20' : 'text-black/20'}
                      />
                    </button>
                  );
                })}
              </div>
              <div className="text-center text-[10px] opacity-60 mt-1">
                {nota === 0 ? 'Toque para escolher' : `${nota} de 5`}
              </div>
            </div>

            {/* Comentário */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-2">
                Comentário (opcional)
              </label>
              <textarea
                value={comentario}
                onChange={e => setComentario(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Conte o que motivou sua nota..."
                className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`}
              />
              <div className="text-right text-[9px] opacity-40 mt-1">{comentario.length}/2000</div>
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={submitting || nota < 1}
              className={`w-full py-3 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 ${btnPrimary} disabled:opacity-50`}
            >
              {submitting ? 'Enviando...' : <><Send size={13} /> Enviar avaliação anônima</>}
            </button>

            <div className="text-[10px] opacity-40 font-mono flex items-center justify-center gap-1.5 pt-4 border-t border-white/5">
              <ShieldCheck size={12} className="text-emerald-500" />
              Envio anônimo — sem IP, sem e-mail, sem rastro
            </div>
          </div>
        )}

        <div className="text-center mt-4">
          <Link to="/ouvidoria" className="text-[11px] underline opacity-70 hover:opacity-100">
            Prefere abrir uma ouvidoria (elogio, sugestão, reclamação, denúncia)?
          </Link>
        </div>
      </div>
    </div>
  );
}
