import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import {
  Star,
  MessageSquare,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Save,
  ThumbsUp,
  Lightbulb,
  Flag,
  ShieldAlert,
  Filter,
  Link as LinkIcon,
  Copy,
  Check
} from 'lucide-react';
import type {
  PesquisaSatisfacao,
  OuvidoriaManifestacao,
  StatusOuvidoria,
  TipoOuvidoria,
  CategoriaSatisfacao
} from '../../types';

interface FeedbackManagerProps {
  theme: 'dark' | 'light';
}

type SubTab = 'pesquisa' | 'ouvidoria';

const OUVIDORIA_TIPO_ICON: Record<TipoOuvidoria, any> = {
  Elogio: ThumbsUp,
  'Sugestão': Lightbulb,
  'Reclamação': Flag,
  'Denúncia': ShieldAlert
};

const STATUS_LABEL: Record<StatusOuvidoria, string> = {
  novo: 'Novo',
  em_analise: 'Em análise',
  resolvido: 'Resolvido',
  arquivado: 'Arquivado'
};

const STATUS_STYLE: Record<StatusOuvidoria, string> = {
  novo: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  em_analise: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  resolvido: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  arquivado: 'bg-white/10 text-white/60 border-white/20'
};

const TIPO_STYLE: Record<TipoOuvidoria, string> = {
  Elogio: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Sugestão': 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  'Reclamação': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Denúncia': 'bg-rose-500/10 text-rose-400 border-rose-500/20'
};

const CATEGORIAS_SAT: CategoriaSatisfacao[] = ['Geral', 'Ambiente', 'Liderança', 'Benefícios', 'Carreira', 'Comunicação'];

export default function FeedbackManager({ theme }: FeedbackManagerProps) {
  const [subTab, setSubTab] = useState<SubTab>('pesquisa');
  const [loading, setLoading] = useState(true);
  const [pesquisas, setPesquisas] = useState<PesquisaSatisfacao[]>([]);
  const [manifestacoes, setManifestacoes] = useState<OuvidoriaManifestacao[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const cardBg = theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-white border-black/10 shadow-sm';
  const inputBg = theme === 'dark' ? 'bg-[#0D0D0C] border-white/10 focus:border-[#E5DFD3]/40' : 'bg-white border-black/10 focus:border-black/40';
  const btnPrimary = theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C] hover:bg-[#D4CBB7]' : 'bg-[#0A0A0A] text-[#FBFBFA] hover:bg-[#2A2A2A]';
  const btnSecondary = theme === 'dark' ? 'border-white/10 hover:bg-white/5 text-white/90' : 'border-black/10 hover:bg-black/5 text-black/90';

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pRes, mRes] = await Promise.all([
        supabase.from('pesquisas_satisfacao').select('*').order('criado_em', { ascending: false }),
        supabase.from('ouvidoria_manifestacoes').select('*').order('criado_em', { ascending: false })
      ]);
      if (pRes.error) throw pRes.error;
      if (mRes.error) throw mRes.error;
      setPesquisas((pRes.data as PesquisaSatisfacao[]) || []);
      setManifestacoes((mRes.data as OuvidoriaManifestacao[]) || []);
    } catch (err: any) {
      console.error('FeedbackManager fetch:', err);
      setErrorMsg(err.message || 'Falha ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (!successMsg && !errorMsg) return;
    const t = setTimeout(() => { setSuccessMsg(''); setErrorMsg(''); }, 4500);
    return () => clearTimeout(t);
  }, [successMsg, errorMsg]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="pb-6 border-b border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#E5DFD3]/20">MÓDULO 10</span>
            <h3 className="text-xl font-bold">Voz do Time</h3>
          </div>
          <p className="text-xs opacity-65 mt-1">Pesquisa de satisfação e canal de ouvidoria — ambos totalmente anônimos.</p>
        </div>

        <div className={`inline-flex p-1 rounded-xl border ${theme === 'dark' ? 'border-white/10 bg-[#0D0D0C]' : 'border-black/10 bg-white'}`}>
          <button
            onClick={() => setSubTab('pesquisa')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 transition-colors ${
              subTab === 'pesquisa' ? btnPrimary : 'opacity-60 hover:opacity-100'
            }`}
          >
            <Star size={13} /> Pesquisa
          </button>
          <button
            onClick={() => setSubTab('ouvidoria')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 transition-colors ${
              subTab === 'ouvidoria' ? btnPrimary : 'opacity-60 hover:opacity-100'
            }`}
          >
            <MessageSquare size={13} /> Ouvidoria
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-2">
          <AlertTriangle size={14} /> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-lg text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center gap-2">
          <CheckCircle size={14} /> {successMsg}
        </div>
      )}

      <PublicLinksCard theme={theme} cardBg={cardBg} btnPrimary={btnPrimary} btnSecondary={btnSecondary} />

      {loading ? (
        <div className="py-16 flex flex-col items-center gap-3 opacity-60">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-xs font-mono uppercase tracking-wider">Carregando...</span>
        </div>
      ) : subTab === 'pesquisa' ? (
        <PesquisaView
          pesquisas={pesquisas}
          theme={theme}
          onChange={fetchAll}
          setErrorMsg={setErrorMsg}
          setSuccessMsg={setSuccessMsg}
          cardBg={cardBg}
          btnSecondary={btnSecondary}
        />
      ) : (
        <OuvidoriaView
          manifestacoes={manifestacoes}
          theme={theme}
          onChange={fetchAll}
          setErrorMsg={setErrorMsg}
          setSuccessMsg={setSuccessMsg}
          cardBg={cardBg}
          inputBg={inputBg}
          btnPrimary={btnPrimary}
          btnSecondary={btnSecondary}
        />
      )}
    </div>
  );
}

// ============================================================================
// PESQUISA
// ============================================================================

function PesquisaView({
  pesquisas,
  theme,
  onChange,
  setErrorMsg,
  setSuccessMsg,
  cardBg,
  btnSecondary
}: {
  pesquisas: PesquisaSatisfacao[];
  theme: 'dark' | 'light';
  onChange: () => Promise<void>;
  setErrorMsg: (m: string) => void;
  setSuccessMsg: (m: string) => void;
  cardBg: string;
  btnSecondary: string;
}) {
  const [filterCategoria, setFilterCategoria] = useState<CategoriaSatisfacao | 'Todas'>('Todas');
  const [filterPeriodo, setFilterPeriodo] = useState<'30' | '90' | '365' | 'all'>('90');
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = pesquisas;
    if (filterCategoria !== 'Todas') list = list.filter(p => p.categoria === filterCategoria);
    if (filterPeriodo !== 'all') {
      const days = Number(filterPeriodo);
      const cutoff = new Date(Date.now() - days * 86400000);
      list = list.filter(p => new Date(p.criado_em) >= cutoff);
    }
    return list;
  }, [pesquisas, filterCategoria, filterPeriodo]);

  const media = filtered.length > 0
    ? filtered.reduce((acc, p) => acc + p.nota, 0) / filtered.length
    : 0;

  const distribuicao = useMemo(() => {
    const dist = [0, 0, 0, 0, 0];
    filtered.forEach(p => {
      if (p.nota >= 1 && p.nota <= 5) dist[p.nota - 1]++;
    });
    return dist;
  }, [filtered]);

  const porCategoria = useMemo(() => {
    const agg: Record<string, { total: number; count: number }> = {};
    filtered.forEach(p => {
      if (!agg[p.categoria]) agg[p.categoria] = { total: 0, count: 0 };
      agg[p.categoria].total += p.nota;
      agg[p.categoria].count++;
    });
    return Object.entries(agg).map(([cat, v]) => ({
      categoria: cat,
      media: v.count > 0 ? v.total / v.count : 0,
      count: v.count
    })).sort((a, b) => b.media - a.media);
  }, [filtered]);

  const excluir = async (id: string) => {
    if (!confirm('Excluir esta avaliação? Ela é removida definitivamente e sai da média do analytics.')) return;
    setDeleting(id);
    try {
      const { error } = await supabase.from('pesquisas_satisfacao').delete().eq('id', id);
      if (error) throw error;
      setSuccessMsg('Avaliação removida.');
      await onChange();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao excluir.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className={`p-4 rounded-2xl border ${cardBg} flex flex-wrap gap-3 items-center`}>
        <Filter size={14} className="opacity-60" />
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Período:</span>
        {([['30', '30 dias'], ['90', '90 dias'], ['365', '12 meses'], ['all', 'Tudo']] as const).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setFilterPeriodo(v)}
            className={`px-3 py-1 rounded text-[10px] font-bold uppercase border transition-colors ${
              filterPeriodo === v
                ? theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C] border-transparent' : 'bg-black text-white border-transparent'
                : btnSecondary
            }`}
          >
            {label}
          </button>
        ))}
        <span className="mx-2 opacity-30">|</span>
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Categoria:</span>
        <select
          value={filterCategoria}
          onChange={e => setFilterCategoria(e.target.value as any)}
          className={`text-[11px] px-2 py-1 rounded border ${theme === 'dark' ? 'bg-[#0D0D0C] border-white/10' : 'bg-white border-black/10'}`}
        >
          <option value="Todas">Todas</option>
          {CATEGORIAS_SAT.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-5 rounded-2xl border ${cardBg}`}>
          <div className="text-[10px] uppercase font-bold tracking-wider opacity-60 mb-1">Nota média</div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold font-mono text-emerald-500">
              {media > 0 ? media.toFixed(1) : '—'}
            </span>
            <span className="text-xs opacity-50">/ 5</span>
          </div>
          <div className="flex gap-0.5 mt-1 text-amber-400">
            {[1, 2, 3, 4, 5].map(i => (
              <span key={i} className={i <= Math.round(media) ? 'opacity-100' : 'opacity-25'}>★</span>
            ))}
          </div>
        </div>

        <div className={`p-5 rounded-2xl border ${cardBg}`}>
          <div className="text-[10px] uppercase font-bold tracking-wider opacity-60 mb-1">Respostas no período</div>
          <div className="text-4xl font-extrabold font-mono">{filtered.length}</div>
          <div className="text-[10px] opacity-60 mt-1">De {pesquisas.length} totais</div>
        </div>

        <div className={`p-5 rounded-2xl border ${cardBg}`}>
          <div className="text-[10px] uppercase font-bold tracking-wider opacity-60 mb-2">Distribuição</div>
          <div className="space-y-1">
            {[5, 4, 3, 2, 1].map(n => {
              const count = distribuicao[n - 1];
              const pct = filtered.length > 0 ? (count / filtered.length) * 100 : 0;
              return (
                <div key={n} className="flex items-center gap-2 text-[10px]">
                  <span className="font-mono w-5 opacity-60">{n}★</span>
                  <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="font-mono opacity-70 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Por categoria */}
      <div className={`p-5 rounded-2xl border ${cardBg}`}>
        <h4 className="text-xs font-bold uppercase tracking-wider opacity-75 mb-3">Média por categoria</h4>
        {porCategoria.length === 0 ? (
          <div className="text-xs italic opacity-50">Sem dados no período.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {porCategoria.map(c => (
              <div key={c.categoria} className={`p-3 rounded-lg border ${theme === 'dark' ? 'border-white/10 bg-white/[0.02]' : 'border-black/10 bg-black/[0.02]'}`}>
                <div className="text-[10px] uppercase font-bold opacity-60">{c.categoria}</div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-extrabold font-mono">{c.media.toFixed(1)}</span>
                  <span className="text-[10px] opacity-50">({c.count})</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comentários */}
      <div className={`p-5 rounded-2xl border ${cardBg}`}>
        <h4 className="text-xs font-bold uppercase tracking-wider opacity-75 mb-3">
          Respostas anônimas ({filtered.length})
        </h4>
        {filtered.length === 0 ? (
          <div className="py-8 text-xs italic opacity-50 text-center">Nenhuma resposta no período.</div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {filtered.map(p => (
              <div key={p.id} className={`p-3 rounded-lg border ${theme === 'dark' ? 'border-white/10 bg-white/[0.02]' : 'border-black/10 bg-black/[0.02]'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex gap-0.5 text-amber-400 text-sm">
                      {[1, 2, 3, 4, 5].map(i => (
                        <span key={i} className={i <= p.nota ? 'opacity-100' : 'opacity-25'}>★</span>
                      ))}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider border bg-white/5">
                      {p.categoria}
                    </span>
                    <span className="text-[10px] opacity-50">{new Date(p.criado_em).toLocaleString('pt-BR')}</span>
                  </div>
                  <button
                    onClick={() => excluir(p.id)}
                    disabled={deleting === p.id}
                    className="opacity-40 hover:opacity-100 hover:text-rose-500 transition-opacity"
                    title="Excluir"
                  >
                    {deleting === p.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>
                </div>
                {p.comentario ? (
                  <p className="text-xs mt-2 leading-relaxed whitespace-pre-wrap">{p.comentario}</p>
                ) : (
                  <p className="text-xs mt-2 italic opacity-40">Sem comentário.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// OUVIDORIA
// ============================================================================

function OuvidoriaView({
  manifestacoes,
  theme,
  onChange,
  setErrorMsg,
  setSuccessMsg,
  cardBg,
  inputBg,
  btnPrimary,
  btnSecondary
}: {
  manifestacoes: OuvidoriaManifestacao[];
  theme: 'dark' | 'light';
  onChange: () => Promise<void>;
  setErrorMsg: (m: string) => void;
  setSuccessMsg: (m: string) => void;
  cardBg: string;
  inputBg: string;
  btnPrimary: string;
  btnSecondary: string;
}) {
  const [statusFilter, setStatusFilter] = useState<'todos' | StatusOuvidoria>('todos');
  const [tipoFilter, setTipoFilter] = useState<'todos' | TipoOuvidoria>('todos');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [respostaDrafts, setRespostaDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return manifestacoes.filter(m =>
      (statusFilter === 'todos' || m.status === statusFilter) &&
      (tipoFilter === 'todos' || m.tipo === tipoFilter)
    );
  }, [manifestacoes, statusFilter, tipoFilter]);

  const countByStatus = (s: StatusOuvidoria) => manifestacoes.filter(m => m.status === s).length;
  const countByTipo = (t: TipoOuvidoria) => manifestacoes.filter(m => m.tipo === t).length;

  const mudarStatus = async (m: OuvidoriaManifestacao, novo: StatusOuvidoria) => {
    setSaving(m.id);
    try {
      const { error } = await supabase.from('ouvidoria_manifestacoes').update({ status: novo }).eq('id', m.id);
      if (error) throw error;
      setSuccessMsg(`Status atualizado para "${STATUS_LABEL[novo]}".`);
      await onChange();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao mudar status.');
    } finally {
      setSaving(null);
    }
  };

  const salvarResposta = async (m: OuvidoriaManifestacao) => {
    const texto = respostaDrafts[m.id] ?? m.resposta_interna ?? '';
    setSaving(m.id);
    try {
      const { error } = await supabase
        .from('ouvidoria_manifestacoes')
        .update({ resposta_interna: texto.trim() || null })
        .eq('id', m.id);
      if (error) throw error;
      setSuccessMsg('Nota interna salva.');
      setRespostaDrafts(prev => {
        const next = { ...prev };
        delete next[m.id];
        return next;
      });
      await onChange();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao salvar nota.');
    } finally {
      setSaving(null);
    }
  };

  const excluir = async (m: OuvidoriaManifestacao) => {
    if (!confirm(`Excluir esta manifestação (${m.tipo})? Não é reversível.`)) return;
    setSaving(m.id);
    try {
      const { error } = await supabase.from('ouvidoria_manifestacoes').delete().eq('id', m.id);
      if (error) throw error;
      setSuccessMsg('Manifestação excluída.');
      await onChange();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao excluir.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* KPI por tipo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['Elogio', 'Sugestão', 'Reclamação', 'Denúncia'] as const).map(t => {
          const Icon = OUVIDORIA_TIPO_ICON[t];
          return (
            <div key={t} className={`p-4 rounded-2xl border ${cardBg}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">{t}</span>
                <Icon size={14} className="opacity-40" />
              </div>
              <div className="text-2xl font-extrabold font-mono mt-1">{countByTipo(t)}</div>
            </div>
          );
        })}
      </div>

      {/* Filtros */}
      <div className={`p-4 rounded-2xl border ${cardBg} flex flex-wrap gap-3 items-center`}>
        <Filter size={14} className="opacity-60" />
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Status:</span>
        {(['todos', 'novo', 'em_analise', 'resolvido', 'arquivado'] as const).map(s => {
          const count = s === 'todos' ? manifestacoes.length : countByStatus(s);
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded text-[10px] font-bold uppercase border transition-colors ${
                active
                  ? theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C] border-transparent' : 'bg-black text-white border-transparent'
                  : btnSecondary
              }`}
            >
              {s === 'todos' ? 'Todos' : STATUS_LABEL[s]} ({count})
            </button>
          );
        })}
        <span className="mx-2 opacity-30">|</span>
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Tipo:</span>
        <select
          value={tipoFilter}
          onChange={e => setTipoFilter(e.target.value as any)}
          className={`text-[11px] px-2 py-1 rounded border ${theme === 'dark' ? 'bg-[#0D0D0C] border-white/10' : 'bg-white border-black/10'}`}
        >
          <option value="todos">Todos</option>
          {(['Elogio', 'Sugestão', 'Reclamação', 'Denúncia'] as const).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Lista */}
      <div className={`p-5 rounded-2xl border ${cardBg}`}>
        {filtered.length === 0 ? (
          <div className="py-10 text-center opacity-50 italic text-xs">Nenhuma manifestação com esses filtros.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(m => {
              const isOpen = expanded === m.id;
              const draft = respostaDrafts[m.id];
              const respostaAtual = draft ?? m.resposta_interna ?? '';
              return (
                <div key={m.id} className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'border-white/10 bg-white/[0.02]' : 'border-black/10 bg-black/[0.02]'}`}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : m.id)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold tracking-wider border ${TIPO_STYLE[m.tipo]}`}>
                            {m.tipo}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold tracking-wider border ${STATUS_STYLE[m.status]}`}>
                            {STATUS_LABEL[m.status]}
                          </span>
                          {m.setor_alvo && (
                            <span className="text-[10px] opacity-60">· {m.setor_alvo}</span>
                          )}
                          <span className="text-[10px] opacity-50 ml-auto">
                            {new Date(m.criado_em).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className={`text-xs mt-2 leading-relaxed whitespace-pre-wrap ${isOpen ? '' : 'line-clamp-2'}`}>
                          {m.mensagem}
                        </p>
                        {!isOpen && m.resposta_interna && (
                          <div className="mt-2 text-[10px] opacity-60 italic">
                            📝 Contém nota interna
                          </div>
                        )}
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 space-y-3 border-t border-white/5">
                      {/* Ações de status */}
                      <div className="flex flex-wrap gap-2 pt-3">
                        {(['novo', 'em_analise', 'resolvido', 'arquivado'] as const)
                          .filter(s => s !== m.status)
                          .map(s => (
                            <button
                              key={s}
                              onClick={() => mudarStatus(m, s)}
                              disabled={saving === m.id}
                              className={`text-[10px] font-bold px-3 py-1.5 rounded border ${btnSecondary} disabled:opacity-50`}
                            >
                              Mover para {STATUS_LABEL[s]}
                            </button>
                          ))}
                        <button
                          onClick={() => excluir(m)}
                          disabled={saving === m.id}
                          className="text-[10px] font-bold px-3 py-1.5 rounded border border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
                        >
                          <Trash2 size={11} className="inline mr-1" /> Excluir
                        </button>
                      </div>

                      {/* Nota interna */}
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                          Nota interna (visível só para o RH)
                        </label>
                        <textarea
                          value={respostaAtual}
                          onChange={e => setRespostaDrafts(prev => ({ ...prev, [m.id]: e.target.value }))}
                          rows={3}
                          placeholder="Anote encaminhamentos, decisões, contato feito, etc."
                          className={`w-full text-xs px-3 py-2 rounded-lg border mt-1 ${inputBg}`}
                        />
                        {draft !== undefined && (
                          <button
                            onClick={() => salvarResposta(m)}
                            disabled={saving === m.id}
                            className={`mt-2 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${btnPrimary} disabled:opacity-50`}
                          >
                            {saving === m.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                            Salvar nota
                          </button>
                        )}
                      </div>

                      <div className="text-[9px] opacity-40 font-mono border-t border-white/5 pt-2">
                        Última atualização: {new Date(m.atualizado_em).toLocaleString('pt-BR')} · Envio anônimo (sem IP/e-mail)
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// PUBLIC LINKS CARD — compartilhar as URLs anônimas
// ============================================================================

function PublicLinksCard({
  theme,
  cardBg,
  btnPrimary,
  btnSecondary
}: {
  theme: 'dark' | 'light';
  cardBg: string;
  btnPrimary: string;
  btnSecondary: string;
}) {
  // window.location.origin em SSR seria undefined, mas Vite/React puro roda no
  // client — usar direto é seguro aqui.
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pesquisaUrl = `${origin}/pesquisa`;
  const ouvidoriaUrl = `${origin}/ouvidoria`;
  const [copied, setCopied] = useState<'pesquisa' | 'ouvidoria' | null>(null);

  const copy = async (url: string, which: 'pesquisa' | 'ouvidoria') => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // clipboard bloqueado (iframe cross-origin ou navegador antigo) — usuário
      // ainda vê o link em texto e pode copiar manualmente.
    }
  };

  const rowBase = theme === 'dark'
    ? 'border-white/10 bg-white/[0.02]'
    : 'border-black/10 bg-black/[0.02]';

  return (
    <div className={`p-5 rounded-2xl border ${cardBg}`}>
      <div className="flex items-center gap-2 mb-3">
        <LinkIcon size={14} className="opacity-60" />
        <h4 className="text-xs font-bold uppercase tracking-wider opacity-75">
          Links públicos para divulgar
        </h4>
      </div>
      <p className="text-[10px] opacity-60 mb-4 leading-relaxed">
        Compartilhe estes links com o time (WhatsApp, e-mail, QR code impresso).
        Ambos abrem formulários anônimos com rate limit de 1 envio a cada 3h por dispositivo.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className={`p-3 rounded-lg border ${rowBase}`}>
          <div className="flex items-center gap-1.5 mb-2">
            <Star size={12} className="text-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Pesquisa de Satisfação</span>
          </div>
          <div className="flex items-center gap-2">
            <code className={`flex-1 text-[10px] px-2 py-1.5 rounded font-mono truncate ${theme === 'dark' ? 'bg-[#0D0D0C]' : 'bg-white'}`}>
              {pesquisaUrl}
            </code>
            <button
              onClick={() => copy(pesquisaUrl, 'pesquisa')}
              className={`text-[10px] font-bold px-2.5 py-1.5 rounded border flex items-center gap-1 ${copied === 'pesquisa' ? 'border-emerald-500/40 text-emerald-500 bg-emerald-500/10' : btnSecondary}`}
              title="Copiar link"
            >
              {copied === 'pesquisa' ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
            </button>
            <a
              href={pesquisaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-[10px] font-bold px-2.5 py-1.5 rounded ${btnPrimary}`}
              title="Abrir formulário em nova aba"
            >
              Abrir
            </a>
          </div>
        </div>

        <div className={`p-3 rounded-lg border ${rowBase}`}>
          <div className="flex items-center gap-1.5 mb-2">
            <MessageSquare size={12} className="text-sky-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Ouvidoria</span>
          </div>
          <div className="flex items-center gap-2">
            <code className={`flex-1 text-[10px] px-2 py-1.5 rounded font-mono truncate ${theme === 'dark' ? 'bg-[#0D0D0C]' : 'bg-white'}`}>
              {ouvidoriaUrl}
            </code>
            <button
              onClick={() => copy(ouvidoriaUrl, 'ouvidoria')}
              className={`text-[10px] font-bold px-2.5 py-1.5 rounded border flex items-center gap-1 ${copied === 'ouvidoria' ? 'border-emerald-500/40 text-emerald-500 bg-emerald-500/10' : btnSecondary}`}
              title="Copiar link"
            >
              {copied === 'ouvidoria' ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
            </button>
            <a
              href={ouvidoriaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-[10px] font-bold px-2.5 py-1.5 rounded ${btnPrimary}`}
              title="Abrir formulário em nova aba"
            >
              Abrir
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
