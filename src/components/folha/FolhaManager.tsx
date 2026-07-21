import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import {
  Receipt,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Send,
  CalendarClock,
  Copy,
  Check,
  Filter
} from 'lucide-react';
import type { FolhaLancamento, CategoriaFolha, StatusFolha } from '../../types';

interface FolhaManagerProps {
  theme: 'dark' | 'light';
  userEmail: string;
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const CATEGORIAS: CategoriaFolha[] = [
  'Desconto', 'Adiantamento', 'Insalubridade', 'Periculosidade',
  'Hora Extra', 'Inclusão', 'Falta', 'Outro'
];

const CAT_STYLE: Record<CategoriaFolha, string> = {
  'Desconto': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  'Adiantamento': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Insalubridade': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Periculosidade': 'bg-red-500/10 text-red-400 border-red-500/20',
  'Hora Extra': 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  'Inclusão': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Falta': 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
  'Outro': 'bg-white/10 text-white/70 border-white/20'
};

// Dia do mês a partir do qual o aviso de "fim do mês" aparece.
const DIA_ALERTA = 20;

const compAtual = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const compLabel = (comp: string) => {
  const m = comp.match(/^(\d{4})-(\d{2})$/);
  if (!m) return comp;
  return `${MESES[Number(m[2]) - 1]}/${m[1]}`;
};
const fmtMoney = (n?: number | null) =>
  (n === null || n === undefined || isNaN(Number(n)))
    ? '—'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n));

export default function FolhaManager({ theme, userEmail }: FolhaManagerProps) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [lancamentos, setLancamentos] = useState<FolhaLancamento[]>([]);
  const [colaboradores, setColaboradores] = useState<any[]>([]);

  const [competencia, setCompetencia] = useState<string>(compAtual());
  const [filtroStatus, setFiltroStatus] = useState<'todos' | StatusFolha>('todos');

  // Form novo lançamento
  const [fColab, setFColab] = useState<string>('');
  const [fCategoria, setFCategoria] = useState<CategoriaFolha>('Desconto');
  const [fValor, setFValor] = useState<string>('');
  const [fDescricao, setFDescricao] = useState<string>('');
  const [adding, setAdding] = useState(false);

  const cardBg = theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-white border-black/10 shadow-sm';
  const kpiBg = theme === 'dark' ? 'bg-[#111110] border-white/5' : 'bg-white border-black/5 shadow-sm';
  const inputBg = theme === 'dark'
    ? 'bg-[#0D0D0C] border-white/10 focus:border-[#E5DFD3]/40'
    : 'bg-white border-black/10 focus:border-black/40';
  const btnPrimary = theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C] hover:bg-[#D4CBB7]' : 'bg-[#0A0A0A] text-[#FBFBFA] hover:bg-[#2A2A2A]';
  const btnSecondary = theme === 'dark' ? 'border-white/10 hover:bg-white/5 text-white/90' : 'border-black/10 hover:bg-black/5 text-black/90';

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [lRes, cRes] = await Promise.all([
        supabase.from('folha_lancamentos').select('*').order('criado_em', { ascending: false }),
        supabase.from('colaboradores').select('id, nome, status').eq('status', 'ativo').order('nome')
      ]);
      if (lRes.error) throw lRes.error;
      if (cRes.error) throw cRes.error;
      setLancamentos((lRes.data as FolhaLancamento[]) || []);
      setColaboradores(cRes.data || []);
    } catch (err: any) {
      console.error('FolhaManager fetch:', err);
      setErrorMsg(err.message || 'Falha ao carregar lançamentos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    if (!successMsg && !errorMsg) return;
    const t = setTimeout(() => { setSuccessMsg(''); setErrorMsg(''); }, 4000);
    return () => clearTimeout(t);
  }, [successMsg, errorMsg]);

  const nomeDe = (id?: string) => id ? (colaboradores.find(c => c.id === id)?.nome || 'Colaborador removido') : 'Geral / sem vínculo';

  // Competências existentes + a atual, para o seletor.
  const competenciasDisponiveis = useMemo(() => {
    const set = new Set<string>(lancamentos.map(l => l.competencia));
    set.add(compAtual());
    set.add(competencia);
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }, [lancamentos, competencia]);

  const daComp = useMemo(
    () => lancamentos.filter(l => l.competencia === competencia),
    [lancamentos, competencia]
  );

  const filtrados = useMemo(() => {
    const list = filtroStatus === 'todos' ? daComp : daComp.filter(l => l.status === filtroStatus);
    // pendentes primeiro, depois por data
    return [...list].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'pendente' ? -1 : 1;
      return a.criado_em < b.criado_em ? 1 : -1;
    });
  }, [daComp, filtroStatus]);

  const pendentes = useMemo(() => daComp.filter(l => l.status === 'pendente'), [daComp]);
  const somaPendentes = useMemo(
    () => pendentes.reduce((s, l) => s + (Number(l.valor) || 0), 0),
    [pendentes]
  );

  // Alerta de fim de mês: do dia 20 em diante, se houver pendentes na competência atual.
  const hoje = new Date();
  const mostrarAlerta = hoje.getDate() >= DIA_ALERTA
    && competencia === compAtual()
    && pendentes.length > 0;

  const adicionar = async () => {
    if (!fDescricao.trim()) { setErrorMsg('Descreva o lançamento.'); return; }
    setAdding(true);
    try {
      const valorNum = fValor.trim() ? Number(fValor.replace(/\./g, '').replace(',', '.')) : null;
      const { error } = await supabase.from('folha_lancamentos').insert({
        colaborador_id: fColab || null,
        categoria: fCategoria,
        valor: valorNum !== null && !isNaN(valorNum) ? valorNum : null,
        descricao: fDescricao.trim(),
        competencia,
        criado_por: userEmail || null
      });
      if (error) throw error;
      setSuccessMsg('Lançamento anotado.');
      setFColab(''); setFCategoria('Desconto'); setFValor(''); setFDescricao('');
      await fetchAll();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao salvar.');
    } finally {
      setAdding(false);
    }
  };

  const marcarStatus = async (l: FolhaLancamento, novo: StatusFolha) => {
    setSaving(l.id);
    try {
      const { error } = await supabase
        .from('folha_lancamentos')
        .update({ status: novo, enviado_em: novo === 'enviado' ? new Date().toISOString() : null })
        .eq('id', l.id);
      if (error) throw error;
      setSuccessMsg(novo === 'enviado' ? 'Marcado como enviado à folha.' : 'Reaberto como pendente.');
      await fetchAll();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao atualizar.');
    } finally {
      setSaving(null);
    }
  };

  const excluir = async (l: FolhaLancamento) => {
    if (!confirm('Excluir este lançamento?')) return;
    setSaving(l.id);
    try {
      const { error } = await supabase.from('folha_lancamentos').delete().eq('id', l.id);
      if (error) throw error;
      setSuccessMsg('Lançamento excluído.');
      await fetchAll();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao excluir.');
    } finally {
      setSaving(null);
    }
  };

  const copiarResumo = async () => {
    if (pendentes.length === 0) { setErrorMsg('Nenhum lançamento pendente nesta competência.'); return; }
    const linhas = pendentes.map(l => {
      const val = (l.valor !== null && l.valor !== undefined) ? ` ${fmtMoney(l.valor)}` : '';
      return `- [${l.categoria}] ${nomeDe(l.colaborador_id)}:${val} — ${l.descricao}`;
    });
    const texto =
      `Folha ${compLabel(competencia)} — lançamentos para inclusão (${pendentes.length}):\n` +
      linhas.join('\n');
    try {
      await navigator.clipboard.writeText(texto);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setSuccessMsg('Resumo copiado — cole no WhatsApp/e-mail do contador.');
    } catch {
      setErrorMsg('Não foi possível copiar automaticamente. Selecione e copie manualmente.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 opacity-60">
        <Loader2 size={22} className="animate-spin mr-2" /> Carregando lançamentos…
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="pb-6 border-b border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#E5DFD3]/20">MÓDULO 14</span>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Receipt size={20} className="text-emerald-400" /> Lançamentos da Folha
            </h3>
          </div>
          <p className="text-xs opacity-65 mt-1">
            Anote descontos, adiantamentos, insalubridade e inclusões ao longo do mês — e envie tudo no fechamento sem esquecer nada.
          </p>
        </div>

        {/* Seletor de competência */}
        <div className="flex items-center gap-2 self-start">
          <CalendarClock size={15} className="opacity-50" />
          <select
            value={competencia}
            onChange={e => setCompetencia(e.target.value)}
            className={`text-sm px-3 py-2 rounded-lg border ${inputBg}`}
          >
            {competenciasDisponiveis.map(c => (
              <option key={c} value={c}>{compLabel(c)}</option>
            ))}
          </select>
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

      {/* Alerta de fim de mês */}
      {mostrarAlerta && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/[0.08] flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <AlertTriangle size={18} className="text-amber-400 shrink-0" />
            <span className="text-sm">
              <strong>Fim do mês chegando.</strong> Há <strong>{pendentes.length}</strong> lançamento(s) pendente(s)
              para a folha de <strong>{compLabel(competencia)}</strong>. Não esqueça de enviar ao fechamento.
            </span>
          </div>
          <button onClick={copiarResumo} className={`text-[11px] font-bold px-3 py-2 rounded-lg ${btnPrimary} flex items-center gap-1.5 shrink-0`}>
            {copied ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar resumo</>}
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border flex flex-col justify-between h-24 ${kpiBg}`}>
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-45">Pendentes ({compLabel(competencia)})</span>
          <span className={`text-3xl font-black font-mono ${pendentes.length > 0 ? 'text-amber-400' : ''}`}>{pendentes.length}</span>
        </div>
        <div className={`p-4 rounded-xl border flex flex-col justify-between h-24 ${kpiBg}`}>
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-45">Soma dos valores pendentes</span>
          <span className="text-2xl font-black font-mono">{fmtMoney(somaPendentes)}</span>
        </div>
        <div className={`p-4 rounded-xl border flex flex-col justify-between h-24 ${kpiBg}`}>
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-45">Enviados</span>
          <span className="text-3xl font-black font-mono text-emerald-400">{daComp.filter(l => l.status === 'enviado').length}</span>
        </div>
        <div className={`p-4 rounded-xl border flex flex-col justify-between h-24 ${kpiBg}`}>
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-45">Total no mês</span>
          <span className="text-3xl font-black font-mono">{daComp.length}</span>
        </div>
      </div>

      {/* Form novo lançamento */}
      <div className={`p-5 rounded-2xl border ${cardBg} space-y-3`}>
        <h4 className="text-xs font-bold uppercase tracking-wider opacity-75 flex items-center gap-1.5">
          <Plus size={14} /> Novo lançamento — {compLabel(competencia)}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select value={fColab} onChange={e => setFColab(e.target.value)} className={`text-xs px-3 py-2.5 rounded-lg border ${inputBg}`}>
            <option value="">Geral / sem vínculo</option>
            {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select value={fCategoria} onChange={e => setFCategoria(e.target.value as CategoriaFolha)} className={`text-xs px-3 py-2.5 rounded-lg border ${inputBg}`}>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            value={fValor}
            onChange={e => setFValor(e.target.value)}
            inputMode="decimal"
            placeholder="Valor (opcional) — ex: 150,00"
            className={`text-xs px-3 py-2.5 rounded-lg border ${inputBg}`}
          />
          <button
            onClick={adicionar}
            disabled={adding || !fDescricao.trim()}
            className={`text-xs font-bold px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 ${btnPrimary} disabled:opacity-50`}
          >
            {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Anotar
          </button>
        </div>
        <input
          value={fDescricao}
          onChange={e => setFDescricao(e.target.value)}
          placeholder="Descrição — ex: adicional de insalubridade 20%, adiantamento quinzenal, desconto de vale..."
          className={`w-full text-xs px-3 py-2.5 rounded-lg border ${inputBg}`}
        />
      </div>

      {/* Filtro + copiar */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter size={14} className="opacity-50" />
        {(['todos', 'pendente', 'enviado'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFiltroStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
              filtroStatus === s
                ? (theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C] border-transparent' : 'bg-black text-white border-transparent')
                : btnSecondary
            }`}
          >
            {s === 'todos' ? 'Todos' : s === 'pendente' ? `Pendentes (${pendentes.length})` : 'Enviados'}
          </button>
        ))}
        <button onClick={copiarResumo} className={`ml-auto text-[11px] font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${copied ? 'border-emerald-500/40 text-emerald-500 bg-emerald-500/10' : btnSecondary}`}>
          {copied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar resumo dos pendentes</>}
        </button>
      </div>

      {/* Lista */}
      <div className={`rounded-2xl border ${cardBg}`}>
        {filtrados.length === 0 ? (
          <div className="py-14 text-center opacity-45 text-sm">Nenhum lançamento nesta competência.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtrados.map(l => (
              <div key={l.id} className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border ${CAT_STYLE[l.categoria]}`}>
                      {l.categoria}
                    </span>
                    <span className="text-sm font-bold truncate">{nomeDe(l.colaborador_id)}</span>
                    {l.valor !== null && l.valor !== undefined && (
                      <span className="text-sm font-mono font-bold">{fmtMoney(l.valor)}</span>
                    )}
                    {l.status === 'enviado' && (
                      <span className="px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        Enviado
                      </span>
                    )}
                  </div>
                  <p className="text-xs opacity-80 mt-1 leading-relaxed">{l.descricao}</p>
                  <p className="text-[10px] opacity-40 mt-1 font-mono">
                    {new Date(l.criado_em).toLocaleDateString('pt-BR')}
                    {l.criado_por ? ` · ${l.criado_por}` : ''}
                    {l.status === 'enviado' && l.enviado_em ? ` · enviado ${new Date(l.enviado_em).toLocaleDateString('pt-BR')}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {l.status === 'pendente' ? (
                    <button
                      onClick={() => marcarStatus(l, 'enviado')}
                      disabled={saving === l.id}
                      title="Marcar como enviado à folha"
                      className="text-[10px] font-bold px-2.5 py-1.5 rounded border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50 flex items-center gap-1"
                    >
                      {saving === l.id ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />} Enviado
                    </button>
                  ) : (
                    <button
                      onClick={() => marcarStatus(l, 'pendente')}
                      disabled={saving === l.id}
                      title="Reabrir como pendente"
                      className={`text-[10px] font-bold px-2.5 py-1.5 rounded border ${btnSecondary} disabled:opacity-50`}
                    >
                      Reabrir
                    </button>
                  )}
                  <button
                    onClick={() => excluir(l)}
                    disabled={saving === l.id}
                    title="Excluir"
                    className="p-1.5 rounded opacity-50 hover:opacity-100 hover:text-rose-500"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
