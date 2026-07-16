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
  ShieldAlert
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

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

  useEffect(() => {
    document.body.className = theme === 'dark'
      ? 'bg-[#0D0D0C] text-[#E5DFD3] antialiased'
      : 'bg-[#FBFBFA] text-[#0A0A0A] antialiased';
  }, [theme]);

  const submit = async () => {
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
      setSubmitted(true);
    } catch (err: any) {
      console.error('Falha ao registrar ouvidoria:', err);
      setError('Não foi possível registrar sua manifestação agora. Tente novamente em instantes.');
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
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold tracking-tight text-sm ${
            theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C]' : 'bg-[#0A0A0A] text-[#FBFBFA]'
          }`}>ITO</div>
          <span className="font-semibold tracking-wider text-base">INSTITUTO THIAGO OMENA</span>
        </div>

        {submitted ? (
          <div className={`rounded-2xl border p-8 text-center space-y-6 animate-fadeIn ${cardBg}`}>
            <div className="w-16 h-16 bg-sky-500/10 border border-sky-500/25 rounded-full flex items-center justify-center mx-auto text-sky-500 animate-bounce">
              <CheckCircle size={32} />
            </div>
            <div className="space-y-3">
              <h2 className="text-xl font-bold">Manifestação recebida</h2>
              <p className="text-xs opacity-70 max-w-md mx-auto leading-relaxed">
                Sua manifestação foi registrada anonimamente. A coordenação de RH
                analisa e trata cada mensagem — mas <strong>não temos como responder de volta</strong>,
                justamente porque não guardamos nenhum dado seu.
              </p>
            </div>
            <div className="text-[10px] opacity-40 font-mono flex items-center justify-center gap-1.5 pt-4 border-t border-white/5">
              <ShieldCheck size={12} className="text-sky-500" />
              Sem IP, sem e-mail, sem identificador de dispositivo
            </div>
            <button
              onClick={() => {
                setSubmitted(false);
                setTipo('');
                setSetor('');
                setMensagem('');
              }}
              className={`text-xs px-4 py-1.5 rounded-lg font-bold ${btnPrimary}`}
            >
              Enviar outra manifestação
            </button>
          </div>
        ) : (
          <div className={`rounded-2xl border p-6 md:p-8 space-y-6 ${cardBg}`}>
            <div>
              <span className="px-2.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase bg-sky-500/10 text-sky-500 border border-sky-500/20">
                Canal Anônimo
              </span>
              <h2 className="text-xl font-bold mt-2">Ouvidoria</h2>
              <p className="text-xs opacity-60 mt-1 leading-relaxed">
                Elogios, sugestões, reclamações ou denúncias vão direto pra
                coordenação. Nenhum dado seu é coletado — nem IP, nem e-mail.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-2">
                <AlertTriangle size={14} /> {error}
              </div>
            )}

            {/* Tipo */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-2">
                Tipo de manifestação *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TIPOS.map(({ value, icon: Icon, hint }) => {
                  const active = tipo === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTipo(value)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        active
                          ? theme === 'dark' ? 'bg-[#E5DFD3]/15 border-[#E5DFD3]/40' : 'bg-black/5 border-black/40'
                          : theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'
                      }`}
                    >
                      <Icon size={16} className="mb-1" />
                      <div className="text-xs font-bold">{value}</div>
                      <div className="text-[10px] opacity-60">{hint}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Setor */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-2">
                Setor envolvido (opcional)
              </label>
              <select
                value={setor}
                onChange={e => setSetor(e.target.value)}
                className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`}
              >
                <option value="">— Prefiro não especificar —</option>
                {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Mensagem */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-2">
                Mensagem *
              </label>
              <textarea
                value={mensagem}
                onChange={e => setMensagem(e.target.value)}
                rows={6}
                maxLength={4000}
                placeholder="Descreva com o máximo de detalhe possível. Evite dados que te identifiquem se você quer permanecer anônimo."
                className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`}
              />
              <div className="text-right text-[9px] opacity-40 mt-1">{mensagem.length}/4000</div>
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={submitting || !tipo || mensagem.trim().length < 10}
              className={`w-full py-3 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 ${btnPrimary} disabled:opacity-50`}
            >
              {submitting ? 'Enviando...' : <><Send size={13} /> Enviar anonimamente</>}
            </button>

            <div className="text-[10px] opacity-40 font-mono flex items-center justify-center gap-1.5 pt-4 border-t border-white/5">
              <ShieldCheck size={12} className="text-sky-500" />
              Envio anônimo — sem IP, sem e-mail, sem rastro
            </div>
          </div>
        )}

        <div className="text-center mt-4">
          <Link to="/pesquisa" className="text-[11px] underline opacity-70 hover:opacity-100 flex items-center justify-center gap-1">
            <MessageSquare size={11} /> Prefere avaliar com nota de 1 a 5?
          </Link>
        </div>
      </div>
    </div>
  );
}
