import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import {
  Trophy,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Play,
  Flag,
  Plus,
  Link as LinkIcon,
  Copy,
  Check
} from 'lucide-react';
import PodioArte, { type TopItem } from './PodioArte';

interface FuncionarioMesManagerProps {
  theme: 'dark' | 'light';
  userId: string;
  userEmail: string;
}

interface Rodada {
  id: string;
  competencia: string;
  titulo: string | null;
  data_fim: string;
  status: 'aberta' | 'fechada';
  top3: TopItem[] | null;
  fechada_em: string | null;
  criado_em: string;
}
interface Colab { id: string; nome: string; setor: string | null; documentos_anexos: Record<string, string> | null; }
interface Voto { id: string; votante_id: string; votado_id: string; }

const hojeCompetencia = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function FuncionarioMesManager({ theme, userId, userEmail }: FuncionarioMesManagerProps) {
  const [rodada, setRodada] = useState<Rodada | null>(null);
  const [colaboradores, setColaboradores] = useState<Colab[]>([]);
  const [votos, setVotos] = useState<Voto[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [acao, setAcao] = useState(false); // abrir/fechar em andamento
  const [fotos, setFotos] = useState<(string | null)[]>([]);
  const [modoNovaRodada, setModoNovaRodada] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);

  const linkVotacao = `${typeof window !== 'undefined' ? window.location.origin : ''}/funcionario-do-mes`;
  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(linkVotacao);
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2000);
    } catch { /* clipboard bloqueado — link visível em texto */ }
  };

  // Form abrir rodada
  const [competencia, setCompetencia] = useState(hojeCompetencia());
  const [dataFim, setDataFim] = useState('');

  const logAuditoria = async (a: string, detalhes: any = {}) => {
    try { await supabase.from('logs_auditoria').insert({ usuario_id: userId, usuario_email: userEmail, acao: a, detalhes }); }
    catch (err) { console.error('Audit log failed:', err); }
  };

  const fetchTudo = async () => {
    setLoading(true);
    setErro('');
    const [rd, cols] = await Promise.all([
      supabase.from('funcionario_mes_rodadas').select('*').order('criado_em', { ascending: false }).limit(1),
      supabase.from('colaboradores').select('id, nome, setor, documentos_anexos').neq('status', 'desligado').order('nome')
    ]);
    if (rd.error || cols.error) {
      console.error('Falha ao carregar funcionário do mês:', rd.error || cols.error);
      setErro('Não foi possível carregar os dados.');
      setLoading(false);
      return;
    }
    const r = (rd.data?.[0] as Rodada) || null;
    setRodada(r);
    setColaboradores((cols.data as Colab[]) || []);
    if (r) {
      const { data: vs } = await supabase.from('funcionario_mes_votos').select('id, votante_id, votado_id').eq('rodada_id', r.id);
      setVotos((vs as Voto[]) || []);
    } else {
      setVotos([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTudo(); }, []);

  // Resolve fotos do top3 quando a rodada está fechada.
  useEffect(() => {
    if (!rodada || rodada.status !== 'fechada' || !rodada.top3) { setFotos([]); return; }
    let ativo = true;
    (async () => {
      const resolvidas = await Promise.all(rodada.top3!.map(async (item) => {
        const c = colaboradores.find(x => x.id === item.colaborador_id);
        const path = c?.documentos_anexos?.foto;
        if (!path) return null;
        try {
          const { data: signed } = await supabase.storage.from('documentos-envios').createSignedUrl(path, 60);
          if (!signed?.signedUrl) return null;
          const resp = await fetch(signed.signedUrl);
          const blob = await resp.blob();
          return await new Promise<string | null>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        } catch { return null; }
      }));
      if (ativo) setFotos(resolvidas);
    })();
    return () => { ativo = false; };
  }, [rodada, colaboradores]);

  const abrirRodada = async () => {
    if (!competencia.trim()) { setErro('Informe a competência (AAAA-MM).'); return; }
    if (!dataFim) { setErro('Informe a data-limite.'); return; }
    setAcao(true);
    setErro('');
    const { error } = await supabase.from('funcionario_mes_rodadas').insert({
      competencia: competencia.trim(),
      data_fim: dataFim,
      criado_por_email: userEmail
    });
    if (error) {
      console.error('Falha ao abrir rodada:', error);
      // índice único parcial: já existe uma aberta
      setErro(error.code === '23505' ? 'Já existe uma rodada aberta. Feche-a antes de abrir outra.' : 'Não foi possível abrir a rodada.');
      setAcao(false);
      return;
    }
    await logAuditoria('FUNCIONARIO_MES_RODADA_ABERTA', { competencia: competencia.trim(), data_fim: dataFim });
    setModoNovaRodada(false);
    setAcao(false);
    await fetchTudo();
  };

  // Apuração: votado_id -> contagem
  const apuracao = useMemo(() => {
    const cont = new Map<string, number>();
    for (const v of votos) cont.set(v.votado_id, (cont.get(v.votado_id) || 0) + 1);
    const nome = (id: string) => colaboradores.find(c => c.id === id);
    return Array.from(cont.entries())
      .map(([id, n]) => ({ colaborador_id: id, nome: nome(id)?.nome || '—', setor: nome(id)?.setor ?? null, votos: n }))
      .sort((a, b) => b.votos - a.votos || a.nome.localeCompare(b.nome));
  }, [votos, colaboradores]);

  const votantesSet = useMemo(() => new Set(votos.map(v => v.votante_id)), [votos]);
  const jaVotaram = useMemo(() => colaboradores.filter(c => votantesSet.has(c.id)), [colaboradores, votantesSet]);
  const faltam = useMemo(() => colaboradores.filter(c => !votantesSet.has(c.id)), [colaboradores, votantesSet]);

  const fecharRodada = async () => {
    if (!rodada) return;
    setAcao(true);
    setErro('');
    const top3: TopItem[] = apuracao.slice(0, 3);
    const { error } = await supabase.from('funcionario_mes_rodadas')
      .update({ status: 'fechada', top3, fechada_em: new Date().toISOString() })
      .eq('id', rodada.id);
    if (error) {
      console.error('Falha ao fechar rodada:', error);
      setErro('Não foi possível fechar a rodada.');
      setAcao(false);
      return;
    }
    await logAuditoria('FUNCIONARIO_MES_RODADA_FECHADA', { rodada_id: rodada.id, top3 });
    setAcao(false);
    await fetchTudo();
  };

  const cardBg = theme === 'dark' ? 'bg-white/[0.03] border-white/10' : 'bg-black/[0.02] border-black/10';
  const inputBg = theme === 'dark' ? 'bg-[#0D0D0C] border-white/15 focus:border-[#E5DFD3]/40' : 'bg-white border-black/15 focus:border-black/40';
  const btnPrimary = theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C] hover:bg-[#D4CBB7]' : 'bg-[#0A0A0A] text-[#FBFBFA] hover:bg-[#2A2A2A]';

  if (loading) {
    return <div className="flex items-center gap-2 text-xs opacity-60 py-10 justify-center"><Loader2 size={16} className="animate-spin" /> Carregando...</div>;
  }

  const semRodadaAberta = !rodada || rodada.status === 'fechada';
  const mostrarFormAbrir = modoNovaRodada || (semRodadaAberta && !rodada);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="pb-6 border-b border-white/10">
        <h2 className="text-xl font-bold flex items-center gap-2"><Trophy size={20} /> Funcionário do Mês</h2>
        <p className="text-xs opacity-60 mt-1">Votação identificada: você vê quem votou, quem falta e a apuração. O Top 3 gera a arte no fechamento.</p>
      </div>

      {erro && (
        <div className="p-3 rounded-lg text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-2">
          <AlertTriangle size={14} /> {erro}
        </div>
      )}

      {/* Abrir rodada */}
      {mostrarFormAbrir && (
        <div className={`rounded-2xl border p-4 ${cardBg} space-y-3`}>
          <div className="text-[11px] font-bold uppercase tracking-wider opacity-70">Abrir nova rodada</div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Competência (AAAA-MM)</label>
              <input value={competencia} onChange={e => setCompetencia(e.target.value)} placeholder="2026-07" className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`} />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Votação aberta até</label>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={abrirRodada} disabled={acao} className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 ${btnPrimary} disabled:opacity-50`}>
              {acao ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} Abrir rodada
            </button>
            {modoNovaRodada && rodada && (
              <button onClick={() => setModoNovaRodada(false)} className={`px-4 py-2 rounded-lg border text-xs ${theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'}`}>Cancelar</button>
            )}
          </div>
        </div>
      )}

      {/* Rodada aberta: progresso + apuração + fechar */}
      {rodada && rodada.status === 'aberta' && !modoNovaRodada && (
        <div className="space-y-5">
          <div className={`rounded-2xl border p-4 ${cardBg} flex flex-wrap items-center justify-between gap-3`}>
            <div>
              <div className="text-sm font-bold">Rodada {rodada.competencia}</div>
              <div className="text-[11px] opacity-60">Aberta até {new Date(rodada.data_fim + 'T12:00:00').toLocaleDateString('pt-BR')} · {jaVotaram.length}/{colaboradores.length} votaram ({colaboradores.length ? Math.round((jaVotaram.length / colaboradores.length) * 100) : 0}%)</div>
            </div>
            <button onClick={fecharRodada} disabled={acao} className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 ${btnPrimary} disabled:opacity-50`}>
              {acao ? <Loader2 size={13} className="animate-spin" /> : <Flag size={13} />} Fechar e gerar pódio
            </button>
          </div>

          {/* Link de votação para divulgar aos colaboradores */}
          <div className={`p-4 rounded-2xl border ${cardBg} flex flex-col sm:flex-row sm:items-center gap-3`}>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <LinkIcon size={16} className="opacity-60 shrink-0" />
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wider">Link de votação</div>
                <code className="block text-[10px] font-mono truncate opacity-70">{linkVotacao}</code>
              </div>
            </div>
            <p className="text-[10px] opacity-55 sm:max-w-[200px]">Envie por WhatsApp/e-mail. Cada colaborador vota uma vez, sem login.</p>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={copiarLink}
                className={`text-[10px] font-bold px-2.5 py-1.5 rounded border flex items-center gap-1 ${linkCopiado ? 'border-emerald-500/40 text-emerald-500 bg-emerald-500/10' : (theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5')}`}
              >
                {linkCopiado ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
              </button>
              <a
                href={linkVotacao}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-[10px] font-bold px-2.5 py-1.5 rounded border ${theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'}`}
              >
                Abrir
              </a>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className={`rounded-2xl border p-4 ${cardBg}`}>
              <div className="text-[11px] font-bold uppercase tracking-wider opacity-70 mb-2 flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-500" /> Já votaram ({jaVotaram.length})</div>
              <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                {jaVotaram.length === 0 ? <div className="text-xs opacity-40">Ninguém votou ainda.</div> : jaVotaram.map(c => <div key={c.id} className="text-xs opacity-80">{c.nome}</div>)}
              </div>
            </div>
            <div className={`rounded-2xl border p-4 ${cardBg}`}>
              <div className="text-[11px] font-bold uppercase tracking-wider opacity-70 mb-2 flex items-center gap-1.5"><CircleDashed size={13} className="text-amber-500" /> Faltam votar ({faltam.length})</div>
              <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                {faltam.length === 0 ? <div className="text-xs opacity-40">Todos votaram! 🎉</div> : faltam.map(c => <div key={c.id} className="text-xs opacity-80">{c.nome}</div>)}
              </div>
            </div>
          </div>

          <div className={`rounded-2xl border p-4 ${cardBg}`}>
            <div className="text-[11px] font-bold uppercase tracking-wider opacity-70 mb-2">Apuração parcial</div>
            {apuracao.length === 0 ? <div className="text-xs opacity-40">Nenhum voto ainda.</div> : (
              <div className="space-y-1.5">
                {apuracao.map((a, i) => (
                  <div key={a.colaborador_id} className="flex items-center gap-2 text-xs">
                    <span className="w-5 opacity-50">{i + 1}º</span>
                    <span className="flex-1 font-semibold">{a.nome}{a.setor ? <span className="opacity-50 font-normal"> · {a.setor}</span> : ''}</span>
                    <span className="tabular-nums font-bold">{a.votos}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rodada fechada: pódio + arte */}
      {rodada && rodada.status === 'fechada' && !modoNovaRodada && (
        <div className="space-y-5">
          <div className={`rounded-2xl border p-4 ${cardBg} flex flex-wrap items-center justify-between gap-3`}>
            <div>
              <div className="text-sm font-bold">Rodada {rodada.competencia} — encerrada</div>
              <div className="text-[11px] opacity-60">{rodada.fechada_em ? `Fechada em ${new Date(rodada.fechada_em).toLocaleDateString('pt-BR')}` : ''}</div>
            </div>
            <button onClick={() => { setModoNovaRodada(true); setCompetencia(hojeCompetencia()); setDataFim(''); }} className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 ${btnPrimary}`}>
              <Plus size={13} /> Abrir nova rodada
            </button>
          </div>

          {rodada.top3 && rodada.top3.length > 0 ? (
            <PodioArte top3={rodada.top3} fotos={fotos} competencia={rodada.competencia} theme={theme} />
          ) : (
            <div className="text-center text-xs opacity-50 py-8">Esta rodada foi fechada sem votos.</div>
          )}
        </div>
      )}
    </div>
  );
}
