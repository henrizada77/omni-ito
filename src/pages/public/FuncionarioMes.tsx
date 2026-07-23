import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  CheckCircle,
  AlertTriangle,
  Sun,
  Moon,
  Send,
  ArrowLeft,
  Loader2,
  CalendarClock
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

interface FuncionarioMesProps {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

interface Rodada { id: string; competencia: string; titulo: string | null; data_fim: string; }
interface Colab { id: string; nome: string; setor: string | null; }

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const mesExtenso = (comp: string) => {
  const [ano, mes] = comp.split('-');
  const i = Number(mes) - 1;
  return i >= 0 && i < 12 ? `${MESES[i]} de ${ano}` : comp;
};

type Estado = 'carregando' | 'fechada' | 'form' | 'enviado';

export default function FuncionarioMes({ theme, setTheme }: FuncionarioMesProps) {
  const [estado, setEstado] = useState<Estado>('carregando');
  const [rodada, setRodada] = useState<Rodada | null>(null);
  const [colaboradores, setColaboradores] = useState<Colab[]>([]);
  const [votanteId, setVotanteId] = useState('');
  const [votadoId, setVotadoId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.className = theme === 'dark'
      ? 'dark bg-[#0D0D0C] text-[#E5DFD3] antialiased'
      : 'light bg-[#FBFBFA] text-[#0A0A0A] antialiased';
  }, [theme]);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const [rd, cols] = await Promise.all([
        supabase.rpc('get_funcionario_mes_aberto'),
        supabase.rpc('listar_colaboradores_ativos_votacao')
      ]);
      if (!ativo) return;
      if (rd.error) {
        console.error('Falha ao carregar votação:', rd.error);
        setEstado('fechada');
        return;
      }
      const r = Array.isArray(rd.data) ? rd.data[0] : rd.data;
      if (!r) { setEstado('fechada'); return; }
      setRodada(r as Rodada);
      setColaboradores(((cols.data as Colab[]) || []));
      setEstado('form');
    })();
    return () => { ativo = false; };
  }, []);

  const enviar = async () => {
    if (!rodada || !votanteId || !votadoId) return;
    if (votanteId === votadoId) { setError('Você não pode votar em si mesmo.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const { data: res, error: err } = await supabase.rpc('registrar_voto_funcionario_mes', {
        p_rodada_id: rodada.id,
        p_votante_id: votanteId,
        p_votado_id: votadoId
      });
      if (err) throw err;
      if (res === 'ok') { setEstado('enviado'); return; }
      if (res === 'ja_votou') { setError('Você já votou nesta rodada.'); }
      else if (res === 'fechada') { setError('A votação foi encerrada.'); }
      else { setError('Não foi possível registrar seu voto. Verifique os nomes selecionados.'); }
    } catch (err: any) {
      console.error('Falha ao registrar voto:', err);
      setError('Não foi possível registrar seu voto agora. Tente novamente em instantes.');
    } finally {
      setSubmitting(false);
    }
  };

  const cardBg = theme === 'dark' ? 'glass-card-dark border-white/10' : 'glass-card-light border-black/10';
  const inputBg = theme === 'dark' ? 'bg-[#0D0D0C] border-white/15 focus:border-[#E5DFD3]/40' : 'bg-white border-black/15 focus:border-black/40';
  const btnPrimary = theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C] hover:bg-[#D4CBB7]' : 'bg-[#0A0A0A] text-[#FBFBFA] hover:bg-[#2A2A2A]';
  const labelCls = 'block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-2';

  const chrome = (children: React.ReactNode) => (
    <div className={`min-h-screen p-6 flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0D0D0C] text-[#E5DFD3]' : 'bg-[#FBFBFA] text-[#0A0A0A]'}`}>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
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
      <div className="w-full max-w-lg relative z-10 my-8">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold tracking-tight text-sm ${theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C]' : 'bg-[#0A0A0A] text-[#FBFBFA]'}`}>ITO</div>
          <span className="font-semibold tracking-wider text-base">INSTITUTO THIAGO OMENA</span>
        </div>
        {children}
      </div>
    </div>
  );

  if (estado === 'carregando') {
    return chrome(<div className="flex items-center gap-2 text-xs opacity-60 py-10 justify-center"><Loader2 size={16} className="animate-spin" /> Carregando votação...</div>);
  }

  if (estado === 'fechada') {
    return chrome(
      <div className={`rounded-2xl border p-8 text-center space-y-5 animate-fadeIn ${cardBg}`}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-amber-500/10 border border-amber-500/25 text-amber-500"><CalendarClock size={30} /></div>
        <h2 className="text-xl font-bold">Votação encerrada</h2>
        <p className="text-xs opacity-70 max-w-md mx-auto leading-relaxed">Não há votação de Funcionário do Mês aberta no momento. Fique de olho — o RH abre uma nova rodada a cada mês.</p>
      </div>
    );
  }

  if (estado === 'enviado') {
    return chrome(
      <div className={`rounded-2xl border p-8 text-center space-y-5 animate-fadeIn ${cardBg}`}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 animate-bounce"><CheckCircle size={32} /></div>
        <h2 className="text-xl font-bold">Voto registrado!</h2>
        <p className="text-xs opacity-70 max-w-md mx-auto leading-relaxed">Obrigado por participar. O resultado será divulgado pelo RH ao fim do prazo.</p>
      </div>
    );
  }

  // estado === 'form'
  const opcoesVotado = colaboradores.filter(c => c.id !== votanteId);

  return chrome(
    <div className={`rounded-2xl border p-6 md:p-8 space-y-6 ${cardBg}`}>
      <div>
        <span className="px-2.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20 inline-flex items-center gap-1">
          <Trophy size={11} /> Funcionário do Mês
        </span>
        <h2 className="text-xl font-bold mt-2">Vote no colega do mês</h2>
        <p className="text-xs opacity-60 mt-1 leading-relaxed">
          Referência: <strong>{mesExtenso(rodada?.competencia || '')}</strong>.
          {rodada?.data_fim && <> Votação aberta até <strong>{new Date(rodada.data_fim + 'T12:00:00').toLocaleDateString('pt-BR')}</strong>.</>}
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div>
        <label className={labelCls}>Quem é você? *</label>
        <select value={votanteId} onChange={e => { setVotanteId(e.target.value); if (e.target.value === votadoId) setVotadoId(''); }} className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`}>
          <option value="">— Selecione seu nome —</option>
          {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}{c.setor ? ` · ${c.setor}` : ''}</option>)}
        </select>
      </div>

      <div>
        <label className={labelCls}>Em quem você vota? *</label>
        <select value={votadoId} onChange={e => setVotadoId(e.target.value)} disabled={!votanteId} className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg} disabled:opacity-50`}>
          <option value="">— Selecione o colega —</option>
          {opcoesVotado.map(c => <option key={c.id} value={c.id}>{c.nome}{c.setor ? ` · ${c.setor}` : ''}</option>)}
        </select>
      </div>

      <button
        type="button"
        onClick={enviar}
        disabled={submitting || !votanteId || !votadoId}
        className={`w-full py-3 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 ${btnPrimary} disabled:opacity-50`}
      >
        {submitting ? <><Loader2 size={13} className="animate-spin" /> Enviando...</> : <><Send size={13} /> Confirmar voto</>}
      </button>

      <div className="text-[10px] opacity-40 font-mono text-center pt-4 border-t border-white/5">
        1 voto por pessoa · o RH acompanha a participação
      </div>
    </div>
  );
}
