import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import {
  Clock,
  RefreshCw,
  PlugZap,
  Loader2,
  AlertTriangle,
  CheckCircle,
  UserX,
  Filter,
  Calendar
} from 'lucide-react';

interface PontoManagerProps {
  theme: 'dark' | 'light';
}

interface Batida {
  id: string;
  colaborador_id: string;
  tipo: string;
  registrado_em: string;
  data_ref: string | null;
  competencia: string | null;
  colaboradores?: { nome: string; setor: string; cpf: string } | null;
}

interface Inconsistencia {
  id: string;
  colaborador_id: string | null;
  cpf: string | null;
  matricula: string | null;
  nome: string | null;
  data_ref: string;
  tipo: string | null;
  descricao: string | null;
  status_tratamento: string;
  colaboradores?: { nome: string; setor: string } | null;
}

interface SyncLog {
  id: string;
  iniciado_em: string;
  finalizado_em: string | null;
  executado_por: string | null;
  acao: string;
  modo: string;
  status: string;
  competencia: string | null;
  qtd_batidas: number;
  qtd_inconsistencias: number;
  qtd_nao_casados: number;
  qtd_erros: number;
  nao_casados: { cpf?: string; matricula?: string; nome?: string }[];
  mensagem: string | null;
}

const PUNCH_COLS: { tipo: string; label: string }[] = [
  { tipo: 'entrada', label: 'Entrada' },
  { tipo: 'intervalo_saida', label: 'Saída Interv.' },
  { tipo: 'intervalo_retorno', label: 'Retorno Interv.' },
  { tipo: 'saida', label: 'Saída' }
];

// competência atual 'YYYY-MM'
const currentCompetencia = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function PontoManager({ theme }: PontoManagerProps) {
  const [competencia, setCompetencia] = useState(currentCompetencia());
  const [batidas, setBatidas] = useState<Batida[]>([]);
  const [inconsistencias, setInconsistencias] = useState<Inconsistencia[]>([]);
  const [lastSync, setLastSync] = useState<SyncLog | null>(null);
  const [naoCasados, setNaoCasados] = useState<SyncLog['nao_casados']>([]);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [modo, setModo] = useState<'mock' | 'real' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [selectedColabId, setSelectedColabId] = useState('');
  const [filterSetor, setFilterSetor] = useState('Todos');

  const cardBg = theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-white border-black/10 shadow-sm';
  const inputBg = theme === 'dark' ? 'bg-[#0D0D0C] border-white/10' : 'bg-white border-black/10';
  const btnPrimary = theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C] hover:bg-[#D4CBB7]' : 'bg-[#0A0A0A] text-[#FBFBFA] hover:bg-[#2A2A2A]';
  const btnSecondary = theme === 'dark' ? 'border-white/10 hover:bg-white/5 text-white/90' : 'border-black/10 hover:bg-black/5 text-black/90';

  const firstDay = `${competencia}-01`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [batRes, incRes, logRes] = await Promise.all([
        supabase.from('registros_ponto')
          .select('id, colaborador_id, tipo, registrado_em, data_ref, competencia, colaboradores(nome, setor, cpf)')
          .eq('origem', 'pontofopag').eq('competencia', firstDay)
          .order('data_ref', { ascending: true }),
        supabase.from('ponto_inconsistencias')
          .select('id, colaborador_id, cpf, matricula, nome, data_ref, tipo, descricao, status_tratamento, colaboradores(nome, setor)')
          .eq('competencia', firstDay).order('data_ref', { ascending: true }),
        supabase.from('ponto_sync_log')
          .select('*').order('iniciado_em', { ascending: false }).limit(20)
      ]);
      if (batRes.error) throw batRes.error;
      if (incRes.error) throw incRes.error;
      if (logRes.error) throw logRes.error;

      setBatidas((batRes.data as any) || []);
      setInconsistencias((incRes.data as any) || []);

      const logs = (logRes.data as SyncLog[]) || [];
      const last = logs.find(l => l.acao === 'sync_ponto') || logs[0] || null;
      setLastSync(last);
      if (last?.modo) setModo(last.modo as 'mock' | 'real');
      const lastPonto = logs.find(l => l.acao === 'sync_ponto');
      setNaoCasados(lastPonto?.nao_casados || []);
    } catch (err: any) {
      console.error('PontoManager fetch:', err);
      setErrorMsg(err.message || 'Falha ao carregar dados de ponto.');
    } finally {
      setLoading(false);
    }
  }, [firstDay]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!successMsg && !errorMsg) return;
    const t = setTimeout(() => { setSuccessMsg(''); setErrorMsg(''); }, 5000);
    return () => clearTimeout(t);
  }, [successMsg, errorMsg]);

  const callEdge = async (action: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;
    const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pontofopag-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ action, competencia })
    });
    if (!resp.ok && resp.status === 401) throw new Error('Acesso restrito ao RH.');
    return await resp.json();
  };

  const handleTest = async () => {
    setTesting(true); setErrorMsg(''); setSuccessMsg('');
    try {
      const res = await callEdge('test');
      if (!res.success) throw new Error(res.error || 'Falha no teste de conexão.');
      setModo(res.modo);
      setSuccessMsg(res.modo === 'mock'
        ? 'Modo simulação ativo — dados de exemplo (Secullum ainda não configurado).'
        : 'Conectado ao Secullum Ponto Web.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha no teste de conexão.');
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true); setErrorMsg(''); setSuccessMsg('');
    try {
      const r1 = await callEdge('sync_ponto');
      if (!r1.success) throw new Error(r1.error || 'Falha ao sincronizar batidas.');
      const r2 = await callEdge('sync_inconsistencias');
      if (!r2.success) throw new Error(r2.error || 'Falha ao sincronizar inconsistências.');
      setSuccessMsg(`Sincronizado: ${r1.inseridos} batida(s), ${r2.inseridos} inconsistência(s), ${r1.nao_casados} não casado(s).`);
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha na sincronização.');
    } finally {
      setSyncing(false);
    }
  };

  // Colaboradores com batidas neste mês (para o seletor do espelho)
  const colabsComBatida = useMemo(() => {
    const map = new Map<string, string>();
    batidas.forEach(b => {
      if (b.colaborador_id && b.colaboradores?.nome) map.set(b.colaborador_id, b.colaboradores.nome);
    });
    return Array.from(map, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [batidas]);

  useEffect(() => {
    if (colabsComBatida.length && !colabsComBatida.find(c => c.id === selectedColabId)) {
      setSelectedColabId(colabsComBatida[0].id);
    }
  }, [colabsComBatida, selectedColabId]);

  // Espelho do colaborador selecionado: dias × tipos
  const espelho = useMemo(() => {
    const doColab = batidas.filter(b => b.colaborador_id === selectedColabId);
    const dias = new Map<string, Record<string, string>>();
    doColab.forEach(b => {
      const dia = b.data_ref || b.registrado_em.slice(0, 10);
      if (!dias.has(dia)) dias.set(dia, {});
      const hora = new Date(b.registrado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
      dias.get(dia)![b.tipo] = hora;
    });
    return Array.from(dias, ([dia, punches]) => ({ dia, punches })).sort((a, b) => a.dia.localeCompare(b.dia));
  }, [batidas, selectedColabId]);

  const setores = useMemo(() => {
    const s = new Set<string>();
    inconsistencias.forEach(i => { const st = i.colaboradores?.setor; if (st) s.add(st); });
    return ['Todos', ...Array.from(s).sort()];
  }, [inconsistencias]);

  const inconsFiltradas = useMemo(() => {
    if (filterSetor === 'Todos') return inconsistencias;
    return inconsistencias.filter(i => i.colaboradores?.setor === filterSetor);
  }, [inconsistencias, filterSetor]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="pb-6 border-b border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#E5DFD3]/20">MÓDULO 11</span>
            <h3 className="text-xl font-bold">Espelho de Ponto</h3>
            {modo && (
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                modo === 'mock' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
              }`}>
                {modo === 'mock' ? 'Modo simulação' : 'Conectado'}
              </span>
            )}
          </div>
          <p className="text-xs opacity-65 mt-1">Batidas e inconsistências vindas do sistema de ponto (Secullum). Somente leitura.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} className="opacity-60" />
            <input
              type="month"
              value={competencia}
              onChange={e => setCompetencia(e.target.value)}
              className={`text-xs px-2 py-1.5 rounded-lg border ${inputBg}`}
            />
          </div>
          <button
            onClick={handleTest}
            disabled={testing || syncing}
            className={`text-xs font-bold px-3 py-2 rounded-lg border flex items-center gap-1.5 ${btnSecondary} disabled:opacity-50`}
          >
            {testing ? <Loader2 size={13} className="animate-spin" /> : <PlugZap size={13} />}
            Testar conexão
          </button>
          <button
            onClick={handleSync}
            disabled={syncing || testing}
            className={`text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 ${btnPrimary} disabled:opacity-50`}
          >
            {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Sincronizar agora
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

      {/* Última sincronização */}
      <div className={`p-4 rounded-2xl border ${cardBg} flex flex-wrap items-center gap-x-6 gap-y-2 text-xs`}>
        <span className="flex items-center gap-1.5 opacity-70"><Clock size={13} /> Última sincronização:</span>
        {lastSync ? (
          <>
            <span className="font-mono">{new Date(lastSync.iniciado_em).toLocaleString('pt-BR')}</span>
            <span className="opacity-60">por {lastSync.executado_por || '—'}</span>
            <span className="opacity-60">batidas: <strong>{lastSync.qtd_batidas}</strong></span>
            <span className="opacity-60">não casados: <strong>{lastSync.qtd_nao_casados}</strong></span>
            {lastSync.qtd_erros > 0 && <span className="text-amber-500">erros: {lastSync.qtd_erros}</span>}
          </>
        ) : (
          <span className="opacity-50 italic">Nenhuma sincronização ainda — clique em "Sincronizar agora".</span>
        )}
      </div>

      {/* Banner não casados */}
      {naoCasados.length > 0 && (
        <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-2 text-amber-500 text-xs font-bold uppercase tracking-wider mb-2">
            <UserX size={14} /> {naoCasados.length} funcionário(s) do ponto sem correspondência no Omni ITO
          </div>
          <p className="text-[11px] opacity-70 mb-2 leading-relaxed">
            Batidas destes CPFs/matrículas foram ignoradas porque não há colaborador cadastrado com esse CPF.
            Cadastre o colaborador ou preencha a matrícula para incluí-los.
          </p>
          <div className="flex flex-wrap gap-2">
            {naoCasados.map((n, i) => (
              <span key={i} className="text-[10px] font-mono px-2 py-1 rounded bg-white/5 border border-white/10">
                {n.nome || '—'} · {n.cpf || n.matricula || '?'}
              </span>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 flex flex-col items-center gap-3 opacity-60">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-xs font-mono uppercase tracking-wider">Carregando ponto...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Espelho de batidas */}
          <div className={`p-5 rounded-2xl border ${cardBg}`}>
            <div className="flex items-center justify-between mb-4 gap-2">
              <h4 className="text-sm font-bold uppercase tracking-wider opacity-75">Espelho de batidas</h4>
              {colabsComBatida.length > 0 && (
                <select
                  value={selectedColabId}
                  onChange={e => setSelectedColabId(e.target.value)}
                  className={`text-xs px-2 py-1.5 rounded-lg border max-w-[55%] ${inputBg}`}
                >
                  {colabsComBatida.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              )}
            </div>

            {espelho.length === 0 ? (
              <div className="py-10 text-center text-xs italic opacity-50">
                Nenhuma batida importada para {competencia}. Clique em "Sincronizar agora".
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="opacity-60 text-[10px] uppercase tracking-wider">
                      <th className="text-left py-2 pr-2">Dia</th>
                      {PUNCH_COLS.map(c => <th key={c.tipo} className="text-center py-2 px-1">{c.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {espelho.map(({ dia, punches }) => (
                      <tr key={dia} className="border-t border-white/5">
                        <td className="py-2 pr-2 font-mono">{new Date(dia + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', weekday: 'short' })}</td>
                        {PUNCH_COLS.map(c => {
                          const v = punches[c.tipo];
                          return (
                            <td key={c.tipo} className={`text-center py-2 px-1 font-mono ${!v ? 'text-rose-500' : ''}`}>
                              {v || '— —'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[10px] opacity-50 mt-3">Célula em vermelho = batida faltante no dia.</p>
              </div>
            )}
          </div>

          {/* Inconsistências */}
          <div className={`p-5 rounded-2xl border ${cardBg}`}>
            <div className="flex items-center justify-between mb-4 gap-2">
              <h4 className="text-sm font-bold uppercase tracking-wider opacity-75 flex items-center gap-1.5">
                Inconsistências
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/15 text-rose-500 font-bold">{inconsFiltradas.length}</span>
              </h4>
              <div className="flex items-center gap-1.5">
                <Filter size={13} className="opacity-60" />
                <select
                  value={filterSetor}
                  onChange={e => setFilterSetor(e.target.value)}
                  className={`text-xs px-2 py-1.5 rounded-lg border ${inputBg}`}
                >
                  {setores.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {inconsFiltradas.length === 0 ? (
              <div className="py-10 text-center text-xs italic opacity-50">Nenhuma inconsistência neste mês/filtro.</div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {inconsFiltradas.map(i => (
                  <div key={i.id} className={`p-3 rounded-lg border ${theme === 'dark' ? 'border-white/10 bg-white/[0.02]' : 'border-black/10 bg-black/[0.02]'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold truncate">
                        {i.colaboradores?.nome || i.nome || '(sem cadastro)'}
                      </span>
                      <span className="text-[10px] font-mono opacity-60 shrink-0">
                        {new Date(i.data_ref + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        {i.tipo || 'pendência'}
                      </span>
                      {i.colaboradores?.setor && <span className="text-[10px] opacity-50">{i.colaboradores.setor}</span>}
                      {!i.colaborador_id && <span className="text-[10px] text-amber-500">sem cadastro</span>}
                    </div>
                    {i.descricao && <p className="text-[11px] opacity-70 mt-1.5 leading-relaxed">{i.descricao}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
