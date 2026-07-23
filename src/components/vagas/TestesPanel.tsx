import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import {
  Brain,
  Loader2,
  AlertTriangle,
  Copy,
  Check,
  Ban,
  RefreshCw,
  Plus,
  BarChart3
} from 'lucide-react';
import { DESCRICOES, type Fator, type ResultadoDISC } from '../../utils/disc';

interface TestesPanelProps {
  theme: 'dark' | 'light';
  userId: string;
  userEmail: string;
}

interface Teste {
  id: string;
  token: string;
  candidato_nome: string;
  candidato_email: string | null;
  vaga_relacionada: string | null;
  status: 'pendente' | 'respondido';
  ativo: boolean;
  resultado: ResultadoDISC | null;
  criado_em: string;
  respondido_em: string | null;
}

const FATORES: Fator[] = ['D', 'I', 'S', 'C'];
const FATOR_COR: Record<Fator, string> = { D: '#ef4444', I: '#f59e0b', S: '#10b981', C: '#3b82f6' };

const fmtData = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
};

export default function TestesPanel({ theme, userId, userEmail }: TestesPanelProps) {
  const [lista, setLista] = useState<Teste[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  // Form de geração
  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novaVaga, setNovaVaga] = useState('');
  const [gerando, setGerando] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const fetchLista = async () => {
    setLoading(true);
    setErro('');
    const { data, error } = await supabase
      .from('testes_comportamentais')
      .select('*')
      .order('criado_em', { ascending: false });
    if (error) {
      console.error('Falha ao carregar testes:', error);
      setErro('Não foi possível carregar os testes.');
      setLista([]);
    } else {
      setLista((data || []) as Teste[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchLista(); }, []);

  const logAuditoria = async (acao: string, detalhes: any = {}) => {
    try {
      await supabase.from('logs_auditoria').insert({ usuario_id: userId, usuario_email: userEmail, acao, detalhes });
    } catch (err) {
      console.error('Audit log failed:', err);
    }
  };

  const linkDe = (t: Teste) => `${origin}/teste-comportamental/${t.token}`;

  const copiar = async (t: Teste) => {
    try {
      await navigator.clipboard.writeText(linkDe(t));
      setCopiadoId(t.id);
      setTimeout(() => setCopiadoId(null), 2000);
    } catch { /* clipboard bloqueado — link visível no botão Abrir */ }
  };

  const gerar = async () => {
    if (!novoNome.trim()) { setErro('Informe o nome do candidato.'); return; }
    setGerando(true);
    setErro('');
    const token = crypto.randomUUID().replace(/-/g, '');
    const { data, error } = await supabase
      .from('testes_comportamentais')
      .insert({
        token,
        candidato_nome: novoNome.trim(),
        candidato_email: novoEmail.trim() || null,
        vaga_relacionada: novaVaga.trim() || null,
        criado_por_email: userEmail
      })
      .select('*')
      .single();
    if (error) {
      console.error('Falha ao gerar teste:', error);
      setErro('Não foi possível gerar o teste.');
      setGerando(false);
      return;
    }
    try { await navigator.clipboard.writeText(`${origin}/teste-comportamental/${token}`); } catch { /* ignore */ }
    await logAuditoria('TESTE_COMPORTAMENTAL_GERADO', { candidato_nome: novoNome.trim(), token });
    setCopiadoId((data as Teste).id);
    setTimeout(() => setCopiadoId(null), 2000);
    setNovoNome(''); setNovoEmail(''); setNovaVaga('');
    setGerando(false);
    await fetchLista();
  };

  const revogar = async (t: Teste) => {
    const { error } = await supabase.from('testes_comportamentais').update({ ativo: false }).eq('id', t.id);
    if (error) { setErro('Não foi possível revogar o link.'); return; }
    await logAuditoria('TESTE_COMPORTAMENTAL_REVOGADO', { teste_id: t.id, candidato_nome: t.candidato_nome });
    await fetchLista();
  };

  const cardBg = theme === 'dark' ? 'bg-white/[0.03] border-white/10' : 'bg-black/[0.02] border-black/10';
  const inputBg = theme === 'dark' ? 'bg-[#0D0D0C] border-white/15 focus:border-[#E5DFD3]/40' : 'bg-white border-black/15 focus:border-black/40';
  const btnPrimary = theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C] hover:bg-[#D4CBB7]' : 'bg-[#0A0A0A] text-[#FBFBFA] hover:bg-[#2A2A2A]';
  const btnSec = theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5';

  const respondidosCount = useMemo(() => lista.filter(t => t.status === 'respondido').length, [lista]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="pb-6 border-b border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Brain size={20} /> Testes comportamentais (DISC)</h2>
          <p className="text-xs opacity-60 mt-1">
            Gere um teste por candidato, copie o link e envie. {respondidosCount > 0 && <span className="font-bold">{respondidosCount} respondido(s).</span>}
          </p>
        </div>
        <button onClick={fetchLista} className={`self-start px-3 py-2 rounded-lg border text-xs flex items-center gap-1.5 ${btnSec}`}>
          <RefreshCw size={13} /> Atualizar
        </button>
      </div>

      {/* Gerar novo teste */}
      <div className={`rounded-2xl border p-4 ${cardBg} space-y-3`}>
        <div className="text-[11px] font-bold uppercase tracking-wider opacity-70">Gerar novo teste</div>
        <div className="grid gap-3 md:grid-cols-3">
          <input value={novoNome} onChange={e => setNovoNome(e.target.value)} maxLength={120} placeholder="Nome do candidato *" className={`text-xs px-3 py-2 rounded-lg border ${inputBg}`} />
          <input value={novoEmail} onChange={e => setNovoEmail(e.target.value)} maxLength={160} placeholder="E-mail (opcional)" className={`text-xs px-3 py-2 rounded-lg border ${inputBg}`} />
          <input value={novaVaga} onChange={e => setNovaVaga(e.target.value)} maxLength={160} placeholder="Vaga relacionada (opcional)" className={`text-xs px-3 py-2 rounded-lg border ${inputBg}`} />
        </div>
        <button onClick={gerar} disabled={gerando} className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 ${btnPrimary} disabled:opacity-50`}>
          {gerando ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Gerar e copiar link
        </button>
      </div>

      {erro && (
        <div className="p-3 rounded-lg text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-2">
          <AlertTriangle size={14} /> {erro}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-xs opacity-60 py-10 justify-center"><Loader2 size={16} className="animate-spin" /> Carregando...</div>
      ) : lista.length === 0 ? (
        <div className="text-center text-xs opacity-50 py-10">Nenhum teste gerado ainda.</div>
      ) : (
        <div className="grid gap-3">
          {lista.map(t => {
            const aberto = abertoId === t.id;
            const podeCopiar = t.status === 'pendente' && t.ativo;
            return (
              <div key={t.id} className={`rounded-xl border p-4 ${cardBg}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm">{t.candidato_nome}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        t.status === 'respondido' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>{t.status === 'respondido' ? 'Respondido' : 'Pendente'}</span>
                      {!t.ativo && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border border-rose-500/20 text-rose-500 bg-rose-500/10">Revogado</span>}
                    </div>
                    <div className="text-[11px] opacity-60 mt-1">
                      {t.vaga_relacionada ? `${t.vaga_relacionada} · ` : ''}Criado {fmtData(t.criado_em)}
                      {t.respondido_em ? ` · Respondido ${fmtData(t.respondido_em)}` : ''}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {podeCopiar && (
                      <>
                        <button onClick={() => copiar(t)} className={`text-[10px] font-bold px-2.5 py-1.5 rounded border flex items-center gap-1 ${copiadoId === t.id ? 'border-emerald-500/40 text-emerald-500 bg-emerald-500/10' : btnSec}`}>
                          {copiadoId === t.id ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar link</>}
                        </button>
                        <button onClick={() => revogar(t)} className={`text-[10px] font-bold px-2.5 py-1.5 rounded border flex items-center gap-1 ${btnSec}`}>
                          <Ban size={11} /> Revogar
                        </button>
                      </>
                    )}
                    {t.status === 'respondido' && t.resultado && (
                      <button onClick={() => setAbertoId(aberto ? null : t.id)} className={`text-[10px] font-bold px-2.5 py-1.5 rounded border flex items-center gap-1 ${btnSec}`}>
                        <BarChart3 size={11} /> {aberto ? 'Fechar' : 'Ver resultado'}
                      </button>
                    )}
                  </div>
                </div>

                {aberto && t.resultado && <ResultadoView resultado={t.resultado} theme={theme} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ResultadoView({ resultado, theme }: { resultado: ResultadoDISC; theme: 'dark' | 'light' }) {
  const dom = resultado.dominante;
  const trilho = theme === 'dark' ? 'bg-white/10' : 'bg-black/10';

  const grupo = (titulo: string, valores: Record<Fator, number>) => {
    const max = Math.max(1, ...FATORES.map(f => Math.abs(valores[f])));
    return (
      <div className="flex-1 min-w-[200px]">
        <div className="text-[10px] uppercase tracking-wider opacity-50 mb-2">{titulo}</div>
        <div className="space-y-1.5">
          {FATORES.map(f => (
            <div key={f} className="flex items-center gap-2">
              <span className="w-4 text-[11px] font-bold" style={{ color: FATOR_COR[f] }}>{f}</span>
              <div className={`flex-1 h-3 rounded-full overflow-hidden ${trilho}`}>
                <div className="h-full rounded-full" style={{ width: `${(Math.abs(valores[f]) / max) * 100}%`, backgroundColor: FATOR_COR[f] }} />
              </div>
              <span className="w-6 text-right text-[11px] tabular-nums opacity-70">{valores[f]}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
      <div className="flex flex-wrap gap-6">
        {grupo('Sob pressão (máscara)', resultado.pressao)}
        {grupo('Natural (núcleo)', resultado.natural)}
      </div>
      <div className={`rounded-lg p-3 border ${theme === 'dark' ? 'border-white/10 bg-white/[0.02]' : 'border-black/10 bg-black/[0.02]'}`}>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold text-white" style={{ backgroundColor: FATOR_COR[dom] }}>{dom}</span>
          <span className="text-sm font-bold">Perfil dominante: {DESCRICOES[dom].titulo}</span>
        </div>
        <p className="text-xs opacity-70 mt-1.5 leading-relaxed">{DESCRICOES[dom].texto}</p>
      </div>
    </div>
  );
}
