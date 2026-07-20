import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import {
  ShieldAlert,
  AlertTriangle,
  TrendingDown,
  CalendarClock,
  UserX,
  Loader2,
  Search,
  Info,
  Users
} from 'lucide-react';

interface RiscoManagerProps {
  theme: 'dark' | 'light';
}

type Banda = 'alto' | 'medio' | 'baixo';

interface Motivo {
  label: string;
  pontos: number;
}

interface ColabRisco {
  id: string;
  nome: string;
  cargo?: string;
  setor?: string;
  score: number;
  banda: Banda;
  motivos: Motivo[];
}

// ---------------------------------------------------------------------------
// Modelo heurístico de risco de desligamento (0–100), calculado no cliente.
// Cada fator soma pontos; só os que dispararam viram "motivo". O total é
// limitado a 100. Não é determinístico — é um indicador para priorizar
// conversas de retenção, não uma decisão automática.
// ---------------------------------------------------------------------------

const JANELA_DIAS = 90; // janela recente para faltas/atrasos
const MESES_SEM_PROMOCAO = 36; // "sem promoção há 3 anos"

const mesesEntre = (dateStr: string | null | undefined, ref: Date): number => {
  if (!dateStr) return 0;
  const d = new Date(dateStr.length <= 10 ? dateStr + 'T12:00:00' : dateStr);
  if (isNaN(d.getTime())) return 0;
  return (ref.getFullYear() - d.getFullYear()) * 12 + (ref.getMonth() - d.getMonth());
};

function calcularRisco(
  colab: any,
  ocorrencias: any[],
  avaliacoes: any[],
  promocoes: any[],
  agora: Date
): ColabRisco {
  const motivos: Motivo[] = [];
  const limiteJanela = new Date(agora.getTime() - JANELA_DIAS * 24 * 60 * 60 * 1000);

  const parseData = (s?: string) => (s ? new Date(s.length <= 10 ? s + 'T12:00:00' : s) : null);

  // --- Fator 1: faltas e atrasos recentes (últimos 90 dias) ------------------
  const ocorrsColab = ocorrencias.filter(o => o.colaborador_id === colab.id);
  const recentes = ocorrsColab.filter(o => {
    const d = parseData(o.data_ocorrencia);
    return d && d >= limiteJanela;
  });
  const faltasInjustificadas = recentes.filter(o => o.tipo === 'Falta Injustificada').length;
  const atrasosSaidas = recentes.filter(o =>
    o.tipo === 'Atraso' || o.tipo === 'Saída Antecipada' || o.tipo === 'Descumprimento de Carga'
  ).length;

  if (faltasInjustificadas > 0) {
    const pts = Math.min(35, faltasInjustificadas * 14);
    motivos.push({
      label: `${faltasInjustificadas} falta${faltasInjustificadas > 1 ? 's' : ''} injustificada${faltasInjustificadas > 1 ? 's' : ''} nos últimos 90 dias`,
      pontos: pts
    });
  }
  if (atrasosSaidas >= 2) {
    const pts = Math.min(15, atrasosSaidas * 4);
    motivos.push({
      label: `${atrasosSaidas} atrasos/saídas antecipadas nos últimos 90 dias`,
      pontos: pts
    });
  }

  // --- Fatores 2 e 3: avaliação ruim e queda de performance ------------------
  const avalsColab = avaliacoes
    .filter(a => a.colaborador_id === colab.id && !isNaN(Number(a.nota)))
    .sort((a, b) => {
      const da = parseData(a.data_avaliacao)?.getTime() ?? 0;
      const db = parseData(b.data_avaliacao)?.getTime() ?? 0;
      return db - da; // mais recente primeiro
    });
  const ultima = avalsColab[0];
  const penultima = avalsColab[1];

  if (ultima) {
    const nota = Number(ultima.nota);
    if (nota < 3.0) {
      motivos.push({ label: `Última avaliação crítica (nota ${nota.toFixed(1)}/5)`, pontos: 25 });
    } else if (nota < 4.0) {
      motivos.push({ label: `Última avaliação abaixo do ideal (nota ${nota.toFixed(1)}/5)`, pontos: 12 });
    }

    if (penultima) {
      const queda = Number(penultima.nota) - nota;
      if (queda >= 0.5) {
        const pts = Math.min(20, Math.round(queda * 20));
        motivos.push({
          label: `Queda de desempenho (de ${Number(penultima.nota).toFixed(1)} para ${nota.toFixed(1)})`,
          pontos: pts
        });
      }
    }
  }

  // --- Fator 4: sem promoção há muito tempo ----------------------------------
  const tenureMeses = mesesEntre(colab.data_admissao, agora);
  const promsColab = promocoes
    .filter(p => p.colaborador_id === colab.id && p.status === 'efetivada' && p.data_efetivacao)
    .sort((a, b) => (parseData(b.data_efetivacao)?.getTime() ?? 0) - (parseData(a.data_efetivacao)?.getTime() ?? 0));
  const ultimaProm = promsColab[0];
  const mesesSemProm = ultimaProm
    ? mesesEntre(ultimaProm.data_efetivacao, agora)
    : tenureMeses;

  // Só penaliza quem já tem casa suficiente para uma promoção fazer sentido.
  if (tenureMeses >= MESES_SEM_PROMOCAO && mesesSemProm >= MESES_SEM_PROMOCAO) {
    const anos = Math.floor(mesesSemProm / 12);
    const pts = mesesSemProm >= 60 ? 18 : 12;
    motivos.push({
      label: ultimaProm
        ? `Sem promoção há ${anos} anos`
        : `${anos} anos de casa sem nenhuma promoção`,
      pontos: pts
    });
  }

  const bruto = motivos.reduce((s, m) => s + m.pontos, 0);
  const score = Math.min(100, bruto);
  const banda: Banda = score >= 60 ? 'alto' : score >= 30 ? 'medio' : 'baixo';

  motivos.sort((a, b) => b.pontos - a.pontos);

  return {
    id: colab.id,
    nome: colab.nome,
    cargo: colab.cargo,
    setor: colab.setor,
    score,
    banda,
    motivos
  };
}

const BANDA_STYLE: Record<Banda, { chip: string; bar: string; text: string; label: string }> = {
  alto: {
    chip: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    bar: 'bg-rose-500',
    text: 'text-rose-400',
    label: 'Alto'
  },
  medio: {
    chip: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    bar: 'bg-amber-500',
    text: 'text-amber-400',
    label: 'Médio'
  },
  baixo: {
    chip: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    bar: 'bg-emerald-500',
    text: 'text-emerald-400',
    label: 'Baixo'
  }
};

export default function RiscoManager({ theme }: RiscoManagerProps) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [promocoes, setPromocoes] = useState<any[]>([]);

  const [search, setSearch] = useState('');
  const [filtroBanda, setFiltroBanda] = useState<'todos' | Banda>('todos');

  const cardBg = theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-white border-black/10 shadow-sm';
  const kpiBg = theme === 'dark' ? 'bg-[#111110] border-white/5' : 'bg-white border-black/5 shadow-sm';
  const inputBg = theme === 'dark'
    ? 'bg-[#0D0D0C] border-white/10 focus:border-[#E5DFD3]/40'
    : 'bg-white border-black/10 focus:border-black/40';

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const [colabsRes, ocorrRes, avalsRes, promsRes] = await Promise.all([
          supabase.from('colaboradores')
            .select('id, nome, cargo, setor, status, data_admissao')
            .eq('status', 'ativo')
            .order('nome'),
          supabase.from('ocorrencias_jornada').select('colaborador_id, tipo, data_ocorrencia'),
          supabase.from('avaliacoes_desempenho').select('colaborador_id, nota, data_avaliacao'),
          supabase.from('promocoes').select('colaborador_id, status, data_efetivacao')
        ]);

        if (colabsRes.error) throw colabsRes.error;
        if (ocorrRes.error) throw ocorrRes.error;
        if (avalsRes.error) throw avalsRes.error;
        if (promsRes.error) throw promsRes.error;

        setColaboradores(colabsRes.data || []);
        setOcorrencias(ocorrRes.data || []);
        setAvaliacoes(avalsRes.data || []);
        setPromocoes(promsRes.data || []);
      } catch (err: any) {
        console.error('RiscoManager fetch:', err);
        setErrorMsg(err.message || 'Falha ao carregar dados de risco.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const riscos = useMemo(() => {
    const agora = new Date();
    return colaboradores
      .map(c => calcularRisco(c, ocorrencias, avaliacoes, promocoes, agora))
      .sort((a, b) => b.score - a.score);
  }, [colaboradores, ocorrencias, avaliacoes, promocoes]);

  const kpis = useMemo(() => {
    const alto = riscos.filter(r => r.banda === 'alto').length;
    const medio = riscos.filter(r => r.banda === 'medio').length;
    const baixo = riscos.filter(r => r.banda === 'baixo').length;
    const media = riscos.length > 0
      ? Math.round(riscos.reduce((s, r) => s + r.score, 0) / riscos.length)
      : 0;
    return { total: riscos.length, alto, medio, baixo, media };
  }, [riscos]);

  const listaFiltrada = useMemo(() => {
    return riscos.filter(r => {
      if (filtroBanda !== 'todos' && r.banda !== filtroBanda) return false;
      if (search && !r.nome.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [riscos, filtroBanda, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 opacity-60">
        <Loader2 size={22} className="animate-spin mr-2" /> Calculando mapa de riscos…
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="pb-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#E5DFD3]/20">MÓDULO 13</span>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <ShieldAlert size={20} className="text-rose-400" /> Mapa de Riscos
          </h3>
        </div>
        <p className="text-xs opacity-65 mt-1">
          Score heurístico de <strong>risco de desligamento</strong> por colaborador ativo, a partir de faltas,
          desempenho e tempo sem promoção.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle size={14} /> {errorMsg}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border flex flex-col justify-between h-24 ${kpiBg}`}>
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-45 flex items-center gap-1">
            <Users size={11} /> Colaboradores Ativos
          </span>
          <span className="text-3xl font-black font-mono">{kpis.total}</span>
        </div>
        <div className={`p-4 rounded-xl border flex flex-col justify-between h-24 ${kpiBg}`}>
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-45">Risco Alto</span>
          <span className="text-3xl font-black font-mono text-rose-400">{kpis.alto}</span>
        </div>
        <div className={`p-4 rounded-xl border flex flex-col justify-between h-24 ${kpiBg}`}>
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-45">Risco Médio</span>
          <span className="text-3xl font-black font-mono text-amber-400">{kpis.medio}</span>
        </div>
        <div className={`p-4 rounded-xl border flex flex-col justify-between h-24 ${kpiBg}`}>
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-45">Score Médio</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-black font-mono">{kpis.media}</span>
            <span className="text-xs opacity-50">/ 100</span>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className={`flex items-center gap-2 px-3 rounded-lg border flex-1 ${inputBg}`}>
          <Search size={14} className="opacity-40" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar colaborador…"
            className="bg-transparent py-2 text-sm outline-none w-full"
          />
        </div>
        <div className={`inline-flex p-1 rounded-xl border self-start ${theme === 'dark' ? 'border-white/10 bg-[#0D0D0C]' : 'border-black/10 bg-white'}`}>
          {([
            { key: 'todos', label: 'Todos' },
            { key: 'alto', label: 'Alto' },
            { key: 'medio', label: 'Médio' },
            { key: 'baixo', label: 'Baixo' }
          ] as { key: 'todos' | Banda; label: string }[]).map(f => (
            <button
              key={f.key}
              onClick={() => setFiltroBanda(f.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-colors ${
                filtroBanda === f.key
                  ? (theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C]' : 'bg-[#0A0A0A] text-[#FBFBFA]')
                  : 'opacity-55 hover:opacity-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de cards */}
      {listaFiltrada.length === 0 ? (
        <div className="py-16 text-center opacity-45 text-sm">
          Nenhum colaborador nesse filtro.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {listaFiltrada.map(r => {
            const style = BANDA_STYLE[r.banda];
            return (
              <div key={r.id} className={`p-5 rounded-xl border ${cardBg}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="font-bold truncate">{r.nome}</h4>
                    <p className="text-[11px] opacity-55 truncate">
                      {r.cargo || 'Sem cargo'}{r.setor ? ` · ${r.setor}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-3xl font-black font-mono leading-none ${style.text}`}>{r.score}%</span>
                    <span className={`block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${style.chip}`}>
                      Risco {style.label}
                    </span>
                  </div>
                </div>

                {/* Barra */}
                <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${r.score}%` }} />
                </div>

                {/* Motivos */}
                <div className="mt-4">
                  <span className="text-[9px] font-bold uppercase tracking-wider opacity-45">Motivos</span>
                  {r.motivos.length > 0 ? (
                    <ul className="mt-2 space-y-1.5">
                      {r.motivos.map((m, i) => (
                        <li key={i} className="flex items-center gap-2 text-[12px]">
                          <MotivoIcon label={m.label} />
                          <span className="opacity-85">{m.label}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[12px] opacity-45 italic">Nenhum sinal de risco relevante.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Nota metodológica */}
      <div className="flex items-start gap-2 text-[11px] opacity-50 pt-2">
        <Info size={13} className="mt-0.5 shrink-0" />
        <span>
          Indicador heurístico para priorizar ações de retenção — não é uma decisão automática. Considera
          faltas e atrasos dos últimos 90 dias, a última avaliação e sua tendência, e o tempo sem promoção
          (≥ 3 anos). O score é limitado a 100.
        </span>
      </div>
    </div>
  );
}

function MotivoIcon({ label }: { label: string }) {
  const l = label.toLowerCase();
  if (l.includes('falta') || l.includes('atraso')) return <UserX size={13} className="text-rose-400 shrink-0" />;
  if (l.includes('queda')) return <TrendingDown size={13} className="text-amber-400 shrink-0" />;
  if (l.includes('avaliação')) return <AlertTriangle size={13} className="text-amber-400 shrink-0" />;
  if (l.includes('promoção')) return <CalendarClock size={13} className="text-sky-400 shrink-0" />;
  return <AlertTriangle size={13} className="text-amber-400 shrink-0" />;
}
