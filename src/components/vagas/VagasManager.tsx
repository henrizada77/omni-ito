import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import {
  Briefcase,
  Loader2,
  AlertTriangle,
  Save,
  ExternalLink,
  Filter,
  RefreshCw,
  Link as LinkIcon,
  Copy,
  Check
} from 'lucide-react';

interface VagasManagerProps {
  theme: 'dark' | 'light';
  userId: string;
  userEmail: string;
}

interface SolicitacaoVaga {
  id: string;
  coordenador_nome: string;
  setor: string;
  titulo_cargo: string;
  quantidade: number;
  funcoes: string;
  requisitos: string | null;
  justificativa: string | null;
  tipo_contratacao: string | null;
  urgencia: 'Baixa' | 'Média' | 'Alta';
  status: 'nova' | 'em_analise' | 'publicada' | 'preenchida' | 'arquivada';
  link_externo: string | null;
  resposta_interna: string | null;
  atualizado_em: string;
  criado_em: string;
}

const STATUSES: SolicitacaoVaga['status'][] = ['nova', 'em_analise', 'publicada', 'preenchida', 'arquivada'];
const STATUS_LABEL: Record<SolicitacaoVaga['status'], string> = {
  nova: 'Nova',
  em_analise: 'Em análise',
  publicada: 'Publicada',
  preenchida: 'Preenchida',
  arquivada: 'Arquivada'
};
const URGENCIA_RANK: Record<SolicitacaoVaga['urgencia'], number> = { Alta: 0, 'Média': 1, Baixa: 2 };

const fmtData = (iso: string) => {
  const d = new Date(iso); // timestamptz já traz hora; sem risco de -1 dia
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
};

export default function VagasManager({ theme, userId, userEmail }: VagasManagerProps) {
  const [lista, setLista] = useState<SolicitacaoVaga[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState<'todas' | SolicitacaoVaga['status']>('todas');
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);

  // Rascunho de edição da solicitação selecionada
  const [editStatus, setEditStatus] = useState<SolicitacaoVaga['status']>('nova');
  const [editLink, setEditLink] = useState('');
  const [editResposta, setEditResposta] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);

  // Link público para os coordenadores abrirem solicitações (sem login).
  const linkPublico = `${typeof window !== 'undefined' ? window.location.origin : ''}/solicitar-vaga`;
  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(linkPublico);
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2000);
    } catch { /* clipboard bloqueado — link visível em texto */ }
  };

  const fetchLista = async () => {
    setLoading(true);
    setErro('');
    const { data, error } = await supabase
      .from('solicitacoes_vaga')
      .select('*')
      .order('criado_em', { ascending: false });
    if (error) {
      console.error('Falha ao carregar solicitações de vaga:', error);
      setErro('Não foi possível carregar as solicitações.');
      setLista([]);
    } else {
      setLista((data || []) as SolicitacaoVaga[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchLista(); }, []);

  const logAuditoria = async (acao: string, detalhes: any = {}) => {
    try {
      await supabase.from('logs_auditoria').insert({
        usuario_id: userId,
        usuario_email: userEmail,
        acao,
        detalhes
      });
    } catch (err) {
      console.error('Audit log failed:', err);
    }
  };

  // Ordena por urgência (Alta→Baixa) e, dentro da urgência, mais recente primeiro.
  const listaOrdenada = useMemo(() => {
    const filtrada = filtro === 'todas' ? lista : lista.filter(s => s.status === filtro);
    return [...filtrada].sort((a, b) => {
      const ru = URGENCIA_RANK[a.urgencia] - URGENCIA_RANK[b.urgencia];
      if (ru !== 0) return ru;
      return b.criado_em.localeCompare(a.criado_em);
    });
  }, [lista, filtro]);

  const novasCount = useMemo(() => lista.filter(s => s.status === 'nova').length, [lista]);

  const abrirDetalhe = (s: SolicitacaoVaga) => {
    setSelecionadaId(s.id);
    setEditStatus(s.status);
    setEditLink(s.link_externo || '');
    setEditResposta(s.resposta_interna || '');
  };

  const salvar = async (s: SolicitacaoVaga) => {
    setSalvando(true);
    setErro('');
    const { error } = await supabase
      .from('solicitacoes_vaga')
      .update({
        status: editStatus,
        link_externo: editLink.trim() || null,
        resposta_interna: editResposta.trim() || null
      })
      .eq('id', s.id);
    if (error) {
      console.error('Falha ao salvar solicitação de vaga:', error);
      setErro('Não foi possível salvar. Tente novamente.');
      setSalvando(false);
      return;
    }
    await logAuditoria('SOLICITACAO_VAGA_ATUALIZADA', {
      solicitacao_id: s.id,
      titulo_cargo: s.titulo_cargo,
      status: editStatus
    });
    setSalvando(false);
    setSelecionadaId(null);
    await fetchLista();
  };

  const cardBg = theme === 'dark' ? 'bg-white/[0.03] border-white/10' : 'bg-black/[0.02] border-black/10';
  const inputBg = theme === 'dark' ? 'bg-[#0D0D0C] border-white/15 focus:border-[#E5DFD3]/40' : 'bg-white border-black/15 focus:border-black/40';
  const btnPrimary = theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C] hover:bg-[#D4CBB7]' : 'bg-[#0A0A0A] text-[#FBFBFA] hover:bg-[#2A2A2A]';

  const urgenciaCor = (u: SolicitacaoVaga['urgencia']) =>
    u === 'Alta' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
      : u === 'Média' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
        : 'bg-sky-500/10 text-sky-500 border-sky-500/20';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="pb-6 border-b border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Briefcase size={20} /> Vagas
          </h2>
          <p className="text-xs opacity-60 mt-1">
            Solicitações de vaga enviadas pelos coordenadores.
            {novasCount > 0 && <span className="ml-1 font-bold text-rose-500">{novasCount} nova(s).</span>}
          </p>
        </div>
        <button
          onClick={fetchLista}
          className={`self-start px-3 py-2 rounded-lg border text-xs flex items-center gap-1.5 ${theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'}`}
        >
          <RefreshCw size={13} /> Atualizar
        </button>
      </div>

      {/* Link público para divulgar aos coordenadores */}
      <div className={`p-4 rounded-2xl border ${cardBg} flex flex-col sm:flex-row sm:items-center gap-3`}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <LinkIcon size={16} className="opacity-60 shrink-0" />
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wider">Link para coordenadores</div>
            <code className="block text-[10px] font-mono truncate opacity-70">{linkPublico}</code>
          </div>
        </div>
        <p className="text-[10px] opacity-55 sm:max-w-[200px]">Envie por WhatsApp/e-mail. Abre a página de abertura de vaga, sem login.</p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={copiarLink}
            className={`text-[10px] font-bold px-2.5 py-1.5 rounded border flex items-center gap-1 ${
              linkCopiado
                ? 'border-emerald-500/40 text-emerald-500 bg-emerald-500/10'
                : (theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5')
            }`}
          >
            {linkCopiado ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
          </button>
          <a
            href={linkPublico}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-[10px] font-bold px-2.5 py-1.5 rounded border ${theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'}`}
          >
            Abrir
          </a>
        </div>
      </div>

      {erro && (
        <div className="p-3 rounded-lg text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-2">
          <AlertTriangle size={14} /> {erro}
        </div>
      )}

      {/* Filtro por status */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider opacity-50 flex items-center gap-1"><Filter size={12} /> Status</span>
        {(['todas', ...STATUSES] as const).map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
              filtro === f
                ? (theme === 'dark' ? 'bg-white/10 border-white/20' : 'bg-black/10 border-black/20')
                : (theme === 'dark' ? 'border-white/10 opacity-60 hover:opacity-100' : 'border-black/10 opacity-60 hover:opacity-100')
            }`}
          >
            {f === 'todas' ? 'Todas' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs opacity-60 py-10 justify-center">
          <Loader2 size={16} className="animate-spin" /> Carregando...
        </div>
      ) : listaOrdenada.length === 0 ? (
        <div className="text-center text-xs opacity-50 py-10">Nenhuma solicitação nesse filtro.</div>
      ) : (
        <div className="grid gap-3">
          {listaOrdenada.map(s => {
            const aberta = selecionadaId === s.id;
            return (
              <div key={s.id} className={`rounded-xl border p-4 ${cardBg}`}>
                <div className="flex items-start justify-between gap-3">
                  <button className="text-left flex-1" onClick={() => (aberta ? setSelecionadaId(null) : abrirDetalhe(s))}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm">{s.titulo_cargo}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${urgenciaCor(s.urgencia)}`}>{s.urgencia}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border border-white/10 opacity-70">{STATUS_LABEL[s.status]}</span>
                      {s.quantidade > 1 && <span className="text-[10px] opacity-60">×{s.quantidade}</span>}
                    </div>
                    <div className="text-[11px] opacity-60 mt-1">
                      {s.setor} · {s.coordenador_nome} · {fmtData(s.criado_em)}
                    </div>
                  </button>
                  {s.link_externo && (
                    <a href={s.link_externo} target="_blank" rel="noopener noreferrer" className="text-emerald-500 opacity-80 hover:opacity-100" title="Abrir vaga publicada">
                      <ExternalLink size={15} />
                    </a>
                  )}
                </div>

                {aberta && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
                    {/* Dados enviados (read-only) */}
                    <div className="grid gap-2 text-xs">
                      <div><span className="opacity-50">Funções: </span>{s.funcoes}</div>
                      {s.requisitos && <div><span className="opacity-50">Requisitos: </span>{s.requisitos}</div>}
                      {s.justificativa && <div><span className="opacity-50">Justificativa: </span>{s.justificativa}</div>}
                      {s.tipo_contratacao && <div><span className="opacity-50">Contratação: </span>{s.tipo_contratacao}</div>}
                    </div>

                    {/* Edição RH */}
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Status</label>
                        <select value={editStatus} onChange={e => setEditStatus(e.target.value as SolicitacaoVaga['status'])} className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`}>
                          {STATUSES.map(st => <option key={st} value={st}>{STATUS_LABEL[st]}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Link da vaga (site externo)</label>
                        <input value={editLink} onChange={e => setEditLink(e.target.value)} placeholder="https://..." className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Anotação interna</label>
                      <textarea value={editResposta} onChange={e => setEditResposta(e.target.value)} rows={2} maxLength={2000} className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`} />
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => salvar(s)}
                        disabled={salvando}
                        className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 ${btnPrimary} disabled:opacity-50`}
                      >
                        {salvando ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Salvar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
