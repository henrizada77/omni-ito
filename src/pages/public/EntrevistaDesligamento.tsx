// Entrevista de saída respondida pelo próprio ex-colaborador, via link.
//
// Mesmo formato das outras páginas públicas: nenhuma sessão, nenhum acesso à
// tabela. O token é a credencial e as duas RPCs SECURITY DEFINER da sprint34
// são a única superfície exposta — a `desligamentos` continua RH-only.
//
// As perguntas são deliberadamente as MESMAS que o RH preenche à mão no drawer
// (Dashboard.tsx). Se um lado mudar, o outro precisa mudar junto, senão os dois
// caminhos gravam coisas diferentes nas mesmas colunas.

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MessageSquareHeart,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  Sun,
  Moon,
  Send,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

interface EntrevistaDesligamentoProps {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

type Estado = 'carregando' | 'invalido' | 'expirado' | 'respondido' | 'form' | 'enviado';

const MOTIVOS = ['Remuneração', 'Liderança', 'Carreira', 'Clima', 'Pessoal', 'Outro'];

export default function EntrevistaDesligamento({ theme, setTheme }: EntrevistaDesligamentoProps) {
  const { token } = useParams<{ token: string }>();
  const [estado, setEstado] = useState<Estado>('carregando');
  const [nome, setNome] = useState('');
  const [motivoReal, setMotivoReal] = useState('Remuneração');
  const [motivoTexto, setMotivoTexto] = useState('');
  const [pontosPositivos, setPontosPositivos] = useState('');
  const [pontosMelhorar, setPontosMelhorar] = useState('');
  const [recomendaria, setRecomendaria] = useState('7');
  const [comentarios, setComentarios] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.className = theme === 'dark'
      ? 'dark bg-[#0D0D0C] text-[#E5DFD3] antialiased'
      : 'light bg-[#FBFBFA] text-[#0A0A0A] antialiased';
  }, [theme]);

  useEffect(() => {
    if (!token) { setEstado('invalido'); return; }
    let vivo = true;
    (async () => {
      const { data, error: err } = await supabase.rpc('get_entrevista_desligamento_by_token', { p_token: token });
      if (!vivo) return;
      if (err) {
        console.error('Falha ao carregar entrevista:', err);
        setEstado('invalido');
        return;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row || row.ativa === false) { setEstado('invalido'); return; }
      // Ordem importa: quem já respondeu vê "obrigado", não "expirou" — mesmo
      // que os 15 dias já tenham passado desde então.
      if (row.ja_respondida) { setEstado('respondido'); return; }
      if (row.expirada) { setEstado('expirado'); return; }
      setNome(row.colaborador_nome || '');
      setEstado('form');
    })();
    return () => { vivo = false; };
  }, [token]);

  const enviar = async () => {
    if (!token || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const nota = parseInt(recomendaria, 10);
      const { data: ok, error: err } = await supabase.rpc('submit_entrevista_desligamento', {
        p_token: token,
        p_motivo_real: motivoTexto.trim() ? `${motivoReal} — ${motivoTexto.trim()}` : motivoReal,
        p_pontos_positivos: pontosPositivos,
        p_pontos_melhorar: pontosMelhorar,
        p_recomendaria: isNaN(nota) ? null : nota,
        p_comentarios: comentarios
      });
      if (err) throw err;
      // false = o UPDATE não pegou nenhuma linha: já respondida, revogada ou
      // fora do prazo. A checagem real é do banco, não desta tela.
      if (ok === false) {
        setError('Este link não está mais válido (já respondido, expirado ou revogado).');
        setSubmitting(false);
        return;
      }
      setEstado('enviado');
    } catch (err: any) {
      console.error('Falha ao enviar entrevista:', err);
      setError('Não foi possível enviar suas respostas agora. Tente novamente em instantes.');
    } finally {
      setSubmitting(false);
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
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-sky-500/5 rounded-full blur-[120px] pointer-events-none" />
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
          <span className="font-semibold tracking-wider text-base">ITO</span>
        </div>
        {children}
      </div>
    </div>
  );

  const mensagem = (icon: React.ReactNode, titulo: string, texto: string) => chrome(
    <div className={`rounded-2xl border p-8 text-center space-y-5 animate-fadeIn ${cardBg}`}>
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-sky-500/10 border border-sky-500/25 text-sky-500">{icon}</div>
      <h2 className="text-xl font-bold">{titulo}</h2>
      <p className="text-xs opacity-70 max-w-md mx-auto leading-relaxed">{texto}</p>
    </div>
  );

  if (estado === 'carregando') {
    return chrome(
      <div className="flex items-center gap-2 text-xs opacity-60 py-10 justify-center">
        <Loader2 size={16} className="animate-spin" /> Carregando entrevista...
      </div>
    );
  }
  if (estado === 'invalido') {
    return mensagem(<AlertTriangle size={30} />, 'Link inválido', 'Esta entrevista não existe ou o link foi revogado. Se ainda quiser responder, peça um novo link ao RH.');
  }
  if (estado === 'expirado') {
    return mensagem(<AlertTriangle size={30} />, 'Prazo encerrado', 'O prazo de 15 dias para responder esta entrevista já passou. Se ainda quiser dar seu retorno, fale com o RH.');
  }
  if (estado === 'respondido') {
    return mensagem(<CheckCircle size={30} />, 'Você já respondeu', 'Esta entrevista já foi enviada. Cada link aceita uma única resposta — não é preciso responder de novo.');
  }
  if (estado === 'enviado') {
    return mensagem(<CheckCircle size={30} />, 'Respostas enviadas', 'Obrigado por dedicar esse tempo. Seu retorno chegou ao RH e ajuda a melhorar o dia a dia de quem fica.');
  }

  // estado === 'form'
  return chrome(
    <div className={`rounded-2xl border p-6 md:p-8 space-y-6 ${cardBg}`}>
      <div>
        <span className="px-2.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase bg-sky-500/10 text-sky-500 border border-sky-500/20 inline-flex items-center gap-1">
          <MessageSquareHeart size={11} /> Entrevista de Desligamento
        </span>
        <h2 className="text-xl font-bold mt-2">Olá{nome ? `, ${nome.split(' ')[0]}` : ''}!</h2>
        <p className="text-xs opacity-60 mt-1 leading-relaxed">
          Sua passagem por aqui terminou, mas o que você viu de perto ainda pode mudar as coisas.
          Responda com sinceridade — não existe resposta certa, e nada aqui afeta suas verbas
          rescisórias ou uma futura recontratação.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="entrev-motivoReal" className="block text-[10px] font-bold uppercase tracking-wider opacity-65 mb-1.5">
            Qual foi o motivo real da sua saída?
          </label>
          <select id="entrev-motivoReal" value={motivoReal} onChange={e => setMotivoReal(e.target.value)} className={inputCls}>
            {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input
            placeholder="Quer detalhar? (opcional)"
            value={motivoTexto}
            onChange={e => setMotivoTexto(e.target.value)}
            className={`${inputCls} mt-2`}
          />
        </div>

        <div>
          <label htmlFor="entrev-pontosPositivos" className="block text-[10px] font-bold uppercase tracking-wider opacity-65 mb-1.5">
            O que funcionou bem?
          </label>
          <textarea id="entrev-pontosPositivos"
            rows={3}
            placeholder="O que você levaria daqui para o próximo lugar"
            value={pontosPositivos}
            onChange={e => setPontosPositivos(e.target.value)}
            className={`${inputCls} resize-none`}
          />
        </div>

        <div>
          <label htmlFor="entrev-pontosMelhorar" className="block text-[10px] font-bold uppercase tracking-wider opacity-65 mb-1.5">
            O que a gente pode melhorar?
          </label>
          <textarea id="entrev-pontosMelhorar"
            rows={3}
            placeholder="Seja direto — é para isso que serve esta pergunta"
            value={pontosMelhorar}
            onChange={e => setPontosMelhorar(e.target.value)}
            className={`${inputCls} resize-none`}
          />
        </div>

        <div>
          <label htmlFor="entrev-recomendaria" className="block text-[10px] font-bold uppercase tracking-wider opacity-65 mb-1.5">
            Recomendaria trabalhar aqui? (0 a 10)
          </label>
          <div className="flex items-center gap-3">
            <input id="entrev-recomendaria"
              type="range"
              min={0}
              max={10}
              value={recomendaria}
              onChange={e => setRecomendaria(e.target.value)}
              className="flex-1 accent-sky-500"
            />
            <span className="w-10 text-center text-lg font-bold tabular-nums">{recomendaria}</span>
          </div>
        </div>

        <div>
          <label htmlFor="entrev-comentarios" className="block text-[10px] font-bold uppercase tracking-wider opacity-65 mb-1.5">
            Comentários finais <span className="font-normal opacity-60">(opcional)</span>
          </label>
          <textarea id="entrev-comentarios"
            rows={3}
            placeholder="Qualquer coisa que ficou faltando dizer"
            value={comentarios}
            onChange={e => setComentarios(e.target.value)}
            className={`${inputCls} resize-none`}
          />
        </div>
      </div>

      <div className={`flex items-start gap-2 text-[11px] leading-relaxed opacity-60 border-t pt-4 ${theme === 'dark' ? 'border-white/10' : 'border-black/10'}`}>
        <ShieldCheck size={14} className="shrink-0 mt-0.5" />
        <span>
          Suas respostas vão direto para o RH e ficam vinculadas ao seu registro de desligamento.
          Este link aceita <strong>uma única resposta</strong> — depois de enviar, não dá para editar.
        </span>
      </div>

      <button
        onClick={enviar}
        disabled={submitting}
        className={`w-full py-3 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2 ${btnPrimary}`}
      >
        {submitting
          ? <><Loader2 size={15} className="animate-spin" /> Enviando…</>
          : <><Send size={15} /> Enviar respostas</>}
      </button>
    </div>
  );
}
