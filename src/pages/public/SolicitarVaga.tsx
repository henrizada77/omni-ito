import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Sun,
  Moon,
  Send,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

interface SolicitarVagaProps {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

// Mesma lista de setores da Ouvidoria, para consistência dos filtros no RH.
const SETORES = [
  'Recepção', 'Enfermagem', 'Biomedicina', 'Farmácia', 'Nutrição',
  'Call Center', 'Smartshape', 'Financeiro', 'Serviços Gerais', 'Coordenação/RH', 'Outro'
];

const TIPOS_CONTRATACAO = ['CLT', 'PJ', 'Estágio', 'Temporário', 'A definir'];
const URGENCIAS = ['Baixa', 'Média', 'Alta'] as const;

export default function SolicitarVaga({ theme, setTheme }: SolicitarVagaProps) {
  const [coordenadorNome, setCoordenadorNome] = useState('');
  const [setor, setSetor] = useState('');
  const [tituloCargo, setTituloCargo] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [funcoes, setFuncoes] = useState('');
  const [requisitos, setRequisitos] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [tipoContratacao, setTipoContratacao] = useState('A definir');
  const [urgencia, setUrgencia] = useState<typeof URGENCIAS[number]>('Média');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.className = theme === 'dark'
      ? 'dark bg-[#0D0D0C] text-[#E5DFD3] antialiased'
      : 'light bg-[#FBFBFA] text-[#0A0A0A] antialiased';
  }, [theme]);

  const submit = async () => {
    if (!coordenadorNome.trim()) return setError('Informe seu nome.');
    if (!setor) return setError('Selecione o setor.');
    if (!tituloCargo.trim()) return setError('Informe o cargo/título da vaga.');
    if (funcoes.trim().length < 10) return setError('Descreva as funções com pelo menos 10 caracteres.');

    setSubmitting(true);
    setError('');
    try {
      const { error: dbErr } = await supabase.from('solicitacoes_vaga').insert({
        coordenador_nome: coordenadorNome.trim(),
        setor,
        titulo_cargo: tituloCargo.trim(),
        quantidade: Math.max(1, Number(quantidade) || 1),
        funcoes: funcoes.trim(),
        requisitos: requisitos.trim() || null,
        justificativa: justificativa.trim() || null,
        tipo_contratacao: tipoContratacao,
        urgencia
      });
      if (dbErr) throw dbErr;
      setSubmitted(true);
    } catch (err: any) {
      console.error('Falha ao registrar solicitação de vaga:', err);
      setError('Não foi possível registrar a solicitação agora. Tente novamente em instantes.');
    } finally {
      setSubmitting(false);
    }
  };

  const cardBg = theme === 'dark' ? 'glass-card-dark border-white/10' : 'glass-card-light border-black/10';
  const inputBg = theme === 'dark' ? 'bg-[#0D0D0C] border-white/15 focus:border-[#E5DFD3]/40' : 'bg-white border-black/15 focus:border-black/40';
  const btnPrimary = theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C] hover:bg-[#D4CBB7]' : 'bg-[#0A0A0A] text-[#FBFBFA] hover:bg-[#2A2A2A]';
  const labelCls = 'block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-2';

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
              <h2 className="text-xl font-bold">Solicitação enviada ao RH</h2>
              <p className="text-xs opacity-70 max-w-md mx-auto leading-relaxed">
                Sua solicitação de vaga foi registrada. A coordenação de RH vai
                analisar e dar andamento à divulgação.
              </p>
            </div>
          </div>
        ) : (
          <div className={`rounded-2xl border p-6 md:p-8 space-y-5 ${cardBg}`}>
            <div>
              <span className="px-2.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Abertura de Vaga
              </span>
              <h2 className="text-xl font-bold mt-2">Solicitar vaga</h2>
              <p className="text-xs opacity-60 mt-1 leading-relaxed">
                Coordenador: descreva a vaga necessária. O RH recebe, analisa e
                cadastra a divulgação.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-2">
                <AlertTriangle size={14} /> {error}
              </div>
            )}

            <div>
              <label className={labelCls}>Seu nome *</label>
              <input
                value={coordenadorNome}
                onChange={e => setCoordenadorNome(e.target.value)}
                maxLength={120}
                className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Setor *</label>
                <select value={setor} onChange={e => setSetor(e.target.value)} className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`}>
                  <option value="">— Selecione —</option>
                  {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Quantidade</label>
                <input
                  type="number"
                  min={1}
                  value={quantidade}
                  onChange={e => setQuantidade(Number(e.target.value))}
                  className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Cargo / título da vaga *</label>
              <input
                value={tituloCargo}
                onChange={e => setTituloCargo(e.target.value)}
                maxLength={160}
                className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`}
              />
            </div>

            <div>
              <label className={labelCls}>Funções / atividades *</label>
              <textarea
                value={funcoes}
                onChange={e => setFuncoes(e.target.value)}
                rows={4}
                maxLength={4000}
                placeholder="O que a pessoa vai fazer no dia a dia."
                className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`}
              />
            </div>

            <div>
              <label className={labelCls}>Requisitos / necessidades</label>
              <textarea
                value={requisitos}
                onChange={e => setRequisitos(e.target.value)}
                rows={3}
                maxLength={4000}
                placeholder="Formação, experiência, habilidades desejadas."
                className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`}
              />
            </div>

            <div>
              <label className={labelCls}>Justificativa</label>
              <textarea
                value={justificativa}
                onChange={e => setJustificativa(e.target.value)}
                rows={2}
                maxLength={2000}
                placeholder="Por que a vaga é necessária (substituição, expansão...)."
                className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Tipo de contratação</label>
                <select value={tipoContratacao} onChange={e => setTipoContratacao(e.target.value)} className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`}>
                  {TIPOS_CONTRATACAO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Urgência</label>
                <select value={urgencia} onChange={e => setUrgencia(e.target.value as typeof URGENCIAS[number])} className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`}>
                  {URGENCIAS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className={`w-full py-3 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 ${btnPrimary} disabled:opacity-50`}
            >
              {submitting ? 'Enviando...' : <><Send size={13} /> Enviar solicitação</>}
            </button>

            <div className="text-[10px] opacity-40 font-mono flex items-center justify-center gap-1.5 pt-4 border-t border-white/5">
              <ShieldCheck size={12} className="text-emerald-500" />
              Vai direto para a coordenação de RH
            </div>
          </div>
        )}

        <div className="text-center mt-4 flex items-center justify-center gap-1 opacity-60">
          <Briefcase size={11} />
          <span className="text-[11px]">Abertura de vaga · Instituto Thiago Omena</span>
        </div>
      </div>
    </div>
  );
}
