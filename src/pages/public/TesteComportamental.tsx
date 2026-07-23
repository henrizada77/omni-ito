import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Brain,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Sun,
  Moon,
  Send,
  ArrowLeft,
  Loader2,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { BLOCOS, calcularDISC, type RespostaBloco, type Fator } from '../../utils/disc';

interface TesteComportamentalProps {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

type Estado = 'carregando' | 'invalido' | 'respondido' | 'form' | 'enviado';

export default function TesteComportamental({ theme, setTheme }: TesteComportamentalProps) {
  const { token } = useParams<{ token: string }>();
  const [estado, setEstado] = useState<Estado>('carregando');
  const [nome, setNome] = useState('');
  const [respostas, setRespostas] = useState<(RespostaBloco | undefined)[]>(() => BLOCOS.map(() => undefined));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.className = theme === 'dark'
      ? 'dark bg-[#0D0D0C] text-[#E5DFD3] antialiased'
      : 'light bg-[#FBFBFA] text-[#0A0A0A] antialiased';
  }, [theme]);

  useEffect(() => {
    if (!token) { setEstado('invalido'); return; }
    let ativo = true;
    (async () => {
      const { data, error: err } = await supabase.rpc('get_teste_by_token', { p_token: token });
      if (!ativo) return;
      if (err) {
        console.error('Falha ao carregar teste:', err);
        setEstado('invalido');
        return;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row || row.ativo === false) { setEstado('invalido'); return; }
      if (row.status === 'respondido') { setEstado('respondido'); return; }
      setNome(row.candidato_nome || '');
      setEstado('form');
    })();
    return () => { ativo = false; };
  }, [token]);

  // Regra do bloco: "mais" e "menos" nunca podem ser o mesmo fator.
  const escolher = (bloco: number, campo: 'mais' | 'menos', fator: Fator) => {
    setRespostas(prev => {
      const next = [...prev];
      const atual = next[bloco] || { bloco, mais: undefined as unknown as Fator, menos: undefined as unknown as Fator };
      let mais = atual.mais;
      let menos = atual.menos;
      if (campo === 'mais') {
        mais = fator;
        if (menos === fator) menos = undefined as unknown as Fator;
      } else {
        menos = fator;
        if (mais === fator) mais = undefined as unknown as Fator;
      }
      next[bloco] = { bloco, mais, menos };
      return next;
    });
  };

  const respondidos = respostas.filter(r => r && r.mais && r.menos).length;
  const completo = respondidos === BLOCOS.length;

  const enviar = async () => {
    if (!completo || !token) return;
    setSubmitting(true);
    setError('');
    try {
      const completas = respostas.filter(r => r && r.mais && r.menos) as RespostaBloco[];
      const resultado = calcularDISC(completas);
      const { data: ok, error: err } = await supabase.rpc('submit_teste_comportamental', {
        p_token: token,
        p_respostas: completas,
        p_resultado: resultado
      });
      if (err) throw err;
      if (ok === false) {
        setError('Este teste não está mais disponível (já respondido ou revogado).');
        setSubmitting(false);
        return;
      }
      setEstado('enviado');
    } catch (err: any) {
      console.error('Falha ao enviar teste:', err);
      setError('Não foi possível enviar suas respostas agora. Tente novamente em instantes.');
    } finally {
      setSubmitting(false);
    }
  };

  const cardBg = theme === 'dark' ? 'glass-card-dark border-white/10' : 'glass-card-light border-black/10';
  const btnPrimary = theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C] hover:bg-[#D4CBB7]' : 'bg-[#0A0A0A] text-[#FBFBFA] hover:bg-[#2A2A2A]';

  const chrome = (children: React.ReactNode) => (
    <div className={`min-h-screen p-6 flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-500 ${
      theme === 'dark' ? 'bg-[#0D0D0C] text-[#E5DFD3]' : 'bg-[#FBFBFA] text-[#0A0A0A]'
    }`}>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-6 left-6">
        <Link to="/" className={`p-2 rounded-lg border transition-colors flex items-center gap-1.5 text-xs ${theme === 'dark' ? 'border-white/10 hover:bg-white/5 bg-[#0D0D0C]' : 'border-black/10 hover:bg-black/5 bg-[#FBFBFA]'}`}>
          <ArrowLeft size={14} /> Voltar
        </Link>
      </div>
      <div className="absolute top-6 right-6">
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className={`p-2 rounded-lg border transition-colors ${theme === 'dark' ? 'border-white/10 hover:bg-white/5 bg-[#0D0D0C]' : 'border-black/10 hover:bg-black/5 bg-[#FBFBFA]'}`}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
      <div className="w-full max-w-2xl relative z-10 my-8">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold tracking-tight text-sm ${theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C]' : 'bg-[#0A0A0A] text-[#FBFBFA]'}`}>ITO</div>
          <span className="font-semibold tracking-wider text-base">INSTITUTO THIAGO OMENA</span>
        </div>
        {children}
      </div>
    </div>
  );

  const mensagem = (icon: React.ReactNode, titulo: string, texto: string) => chrome(
    <div className={`rounded-2xl border p-8 text-center space-y-5 animate-fadeIn ${cardBg}`}>
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-violet-500/10 border border-violet-500/25 text-violet-500">{icon}</div>
      <h2 className="text-xl font-bold">{titulo}</h2>
      <p className="text-xs opacity-70 max-w-md mx-auto leading-relaxed">{texto}</p>
    </div>
  );

  if (estado === 'carregando') {
    return chrome(
      <div className="flex items-center gap-2 text-xs opacity-60 py-10 justify-center">
        <Loader2 size={16} className="animate-spin" /> Carregando teste...
      </div>
    );
  }
  if (estado === 'invalido') {
    return mensagem(<AlertTriangle size={30} />, 'Link inválido', 'Este teste não existe, expirou ou foi revogado. Peça um novo link ao RH.');
  }
  if (estado === 'respondido') {
    return mensagem(<CheckCircle size={30} />, 'Teste já enviado', 'Este teste já foi respondido. Não é preciso responder de novo.');
  }
  if (estado === 'enviado') {
    return mensagem(<CheckCircle size={30} />, 'Respostas enviadas', 'Obrigado! Suas respostas foram registradas e enviadas ao RH.');
  }

  // estado === 'form'
  return chrome(
    <div className={`rounded-2xl border p-6 md:p-8 space-y-6 ${cardBg}`}>
      <div>
        <span className="px-2.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase bg-violet-500/10 text-violet-500 border border-violet-500/20 inline-flex items-center gap-1">
          <Brain size={11} /> Teste Comportamental
        </span>
        <h2 className="text-xl font-bold mt-2">Olá{nome ? `, ${nome.split(' ')[0]}` : ''}!</h2>
        <p className="text-xs opacity-60 mt-1 leading-relaxed">
          Em cada grupo, marque o adjetivo que <strong>MAIS</strong> combina com você e o que <strong>MENOS</strong> combina.
          Não existe resposta certa — responda com sinceridade.
        </p>
      </div>

      {/* Progresso */}
      <div className="sticky top-2 z-10">
        <div className={`rounded-lg border px-3 py-2 text-[11px] font-semibold flex items-center justify-between ${theme === 'dark' ? 'bg-[#0D0D0C] border-white/10' : 'bg-white border-black/10'}`}>
          <span>Progresso</span>
          <span>{respondidos}/{BLOCOS.length}</span>
        </div>
        <div className="h-1 mt-1 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-violet-500 transition-all" style={{ width: `${(respondidos / BLOCOS.length) * 100}%` }} />
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div className="space-y-4">
        {BLOCOS.map((bloco, i) => {
          const r = respostas[i];
          return (
            <div key={i} className={`rounded-xl border p-4 ${theme === 'dark' ? 'border-white/10' : 'border-black/10'}`}>
              <div className="text-[10px] uppercase tracking-wider opacity-40 mb-2">Grupo {i + 1}</div>
              <div className="grid grid-cols-1 gap-1.5">
                {bloco.adjetivos.map(adj => {
                  const isMais = r?.mais === adj.fator;
                  const isMenos = r?.menos === adj.fator;
                  return (
                    <div key={adj.fator} className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 border ${
                      isMais ? 'border-emerald-500/40 bg-emerald-500/5'
                        : isMenos ? 'border-rose-500/40 bg-rose-500/5'
                          : (theme === 'dark' ? 'border-white/5' : 'border-black/5')
                    }`}>
                      <span className="text-sm">{adj.texto}</span>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => escolher(i, 'mais', adj.fator)}
                          title="MAIS combina comigo"
                          className={`w-8 h-8 rounded-md border flex items-center justify-center transition-colors ${
                            isMais ? 'bg-emerald-500 text-white border-emerald-500' : (theme === 'dark' ? 'border-white/15 hover:bg-white/5' : 'border-black/15 hover:bg-black/5')
                          }`}
                        >
                          <ThumbsUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => escolher(i, 'menos', adj.fator)}
                          title="MENOS combina comigo"
                          className={`w-8 h-8 rounded-md border flex items-center justify-center transition-colors ${
                            isMenos ? 'bg-rose-500 text-white border-rose-500' : (theme === 'dark' ? 'border-white/15 hover:bg-white/5' : 'border-black/15 hover:bg-black/5')
                          }`}
                        >
                          <ThumbsDown size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={enviar}
        disabled={!completo || submitting}
        className={`w-full py-3 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 ${btnPrimary} disabled:opacity-50`}
      >
        {submitting ? <><Loader2 size={13} className="animate-spin" /> Enviando...</> : <><Send size={13} /> Enviar respostas {completo ? '' : `(${respondidos}/${BLOCOS.length})`}</>}
      </button>

      <div className="text-[10px] opacity-40 font-mono flex items-center justify-center gap-1.5 pt-4 border-t border-white/5">
        <ShieldCheck size={12} className="text-violet-500" />
        Suas respostas vão direto para o RH
      </div>
    </div>
  );
}
