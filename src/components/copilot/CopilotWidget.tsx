import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import {
  Sparkles,
  X,
  Send,
  Plus,
  History,
  Loader2,
  MessageSquare,
  Trash2,
  Bot,
  User,
  Activity,
  ExternalLink,
  PieChart
} from 'lucide-react';

interface CopilotWidgetProps {
  theme: 'dark' | 'light';
}

interface Msg { role: 'user' | 'assistant' | 'system'; content: string }
interface Conversa { id: string; titulo: string | null; atualizado_em: string }

export default function CopilotWidget({ theme }: CopilotWidgetProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const dark = theme === 'dark';

  const panelBg = dark ? 'bg-[#0B101D] text-[#E6EAF2] border-white/10' : 'bg-white text-[#0F1729] border-black/10';
  const bubbleUser = 'bg-gradient-to-r from-brand to-brand-strong text-white shadow-md shadow-brand/20 font-medium';
  const bubbleBot = dark ? 'bg-[#131B2E] text-[#E6EAF2] border border-white/10 shadow-lg' : 'bg-[#F0F3FA] text-[#0F1729] border border-black/10 shadow-sm';
  const inputBg = dark ? 'bg-[#131B2E] border-white/15 text-white focus-within:border-brand/60' : 'bg-[#F0F3FA] border-black/15 text-black focus-within:border-brand/60';

  const loadConversas = useCallback(async () => {
    const { data } = await supabase
      .from('copilot_conversas')
      .select('id, titulo, atualizado_em')
      .order('atualizado_em', { ascending: false })
      .limit(30);
    setConversas((data as Conversa[]) || []);
  }, []);

  useEffect(() => { if (open) loadConversas(); }, [open, loadConversas]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streamText]);

  // Coleta dados em tempo real da aplicação para alimentar a IA com dados precisos
  const fetchLiveContextInfo = async (): Promise<string> => {
    try {
      const [colabsRes, feriasRes, rodadaRes] = await Promise.all([
        supabase.from('colaboradores').select('id, status, setor, cargo').neq('status', 'desligado'),
        supabase.from('colaboradores').select('nome, setor, data_inicio_ferias, data_fim_ferias').eq('status', 'em_ferias'),
        supabase.from('funcionario_mes_rodadas').select('id, competencia, status, data_fim, titulo').order('criado_em', { ascending: false }).limit(1)
      ]);

      const colabs = colabsRes.data || [];
      const emFerias = feriasRes.data || [];
      const rodada = rodadaRes.data?.[0];

      let votosCount = 0;
      if (rodada?.id) {
        const { data: votosData } = await supabase
          .from('funcionario_mes_votos')
          .select('id')
          .eq('rodada_id', rodada.id);
        votosCount = votosData?.length || 0;
      }

      const setoresCount: Record<string, number> = {};
      colabs.forEach(c => {
        const s = c.setor || 'Sem Setor';
        setoresCount[s] = (setoresCount[s] || 0) + 1;
      });

      const setoresStr = Object.entries(setoresCount)
        .map(([setor, qtd]) => `${setor}: ${qtd}`)
        .join(', ');

      const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

      let context = `Data Atual: ${hoje}\n`;
      context += `Total de Colaboradores Ativos no Sistema: ${colabs.length}\n`;
      context += `Distribuição por Setor: ${setoresStr || 'Nenhum'}\n`;
      context += `Colaboradores em Férias Atualmente: ${emFerias.length} (${emFerias.map(f => `${f.nome} - ${f.setor}`).join('; ') || 'Nenhum'})\n`;
      
      if (rodada) {
        context += `\nMÓDULO DE FUNCIONÁRIO DO MÊS (ATIVO E EM USO NO SISTEMA - ROTA: /app/funcionario-mes):\n`;
        context += `- Rodada Atual: Competência ${rodada.competencia}${rodada.titulo ? ` (${rodada.titulo})` : ''}\n`;
        context += `- Status da Rodada: ${rodada.status === 'aberta' ? 'ABERTA (Eleição em andamento para todos os colaboradores ativos)' : 'Fechada (Pódio gerado)'}\n`;
        context += `- Prazo Limite de Votação: ${rodada.data_fim}\n`;
        context += `- Votos Já Registrados Nesta Rodada: ${votosCount} voto(s) computado(s) de ${colabs.length} elegíveis\n`;
      } else {
        context += `\nMÓDULO DE FUNCIONÁRIO DO MÊS: Módulo ativo no Omni ITO (ROTA: /app/funcionario-mes), porém nenhuma rodada aberta no momento.\n`;
      }

      return context;
    } catch (err) {
      console.error('Falha ao coletar contexto ao vivo para o Copilot:', err);
      return `Data Atual: ${new Date().toLocaleDateString('pt-BR')}`;
    }
  };

  const openConversa = async (id: string) => {
    setShowHistory(false);
    setError('');
    setCurrentId(id);
    const { data } = await supabase
      .from('copilot_mensagens')
      .select('papel, conteudo')
      .eq('conversa_id', id)
      .order('criado_em', { ascending: true });
    setMessages(((data as any[]) || []).map(m => ({ role: m.papel, content: m.conteudo })));
  };

  const newConversa = () => {
    setCurrentId(null);
    setMessages([]);
    setShowHistory(false);
    setError('');
  };

  const deleteConversa = async (id: string) => {
    if (!confirm('Excluir esta conversa?')) return;
    await supabase.from('copilot_conversas').delete().eq('id', id);
    if (currentId === id) newConversa();
    loadConversas();
  };

  const sendPrompt = async (texto: string) => {
    if (!texto.trim() || streaming) return;
    setError('');
    setInput('');

    let convId = currentId;
    if (!convId) {
      const { data, error: convErr } = await supabase
        .from('copilot_conversas')
        .insert({ titulo: texto.slice(0, 60) })
        .select('id')
        .single();
      if (convErr || !data) { setError('Não foi possível iniciar a conversa.'); return; }
      convId = data.id;
      setCurrentId(convId);
    }

    const userMsg: Msg = { role: 'user', content: texto };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    supabase.from('copilot_mensagens').insert({ conversa_id: convId, papel: 'user', conteudo: texto });

    setStreaming(true);
    setStreamText('');
    let acc = '';
    try {
      const liveContextInfo = await fetchLiveContextInfo();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const contextSystemMsg: Msg = {
        role: 'system',
        content: `DADOS EM TEMPO REAL DO SISTEMA OMNI ITO (COLETADOS AGORA EM ${new Date().toLocaleDateString('pt-BR')}):\n${liveContextInfo}\nUse estes dados acima como verdade absoluta para responder sobre a empresa ITO.`
      };

      const payloadMessages = [contextSystemMsg, ...nextMessages];

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/copilot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ messages: payloadMessages, contextInfo: liveContextInfo })
      });

      if (!resp.ok || !resp.body) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || 'O copiloto não conseguiu responder agora.');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let done = false;
      while (!done) {
        const { done: rd, value } = await reader.read();
        if (rd) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith('data:')) continue;
          const payload = t.slice(5).trim();
          if (payload === '[DONE]') { done = true; break; }
          try {
            const j = JSON.parse(payload);
            const delta = j.choices?.[0]?.delta?.content;
            if (delta) { acc += delta; setStreamText(acc); }
          } catch { /* keep-alive/comment lines */ }
        }
      }

      const finalText = acc.trim() || '(sem resposta)';
      setMessages(prev => [...prev, { role: 'assistant', content: finalText }]);
      setStreamText('');
      await supabase.from('copilot_mensagens').insert({ conversa_id: convId, papel: 'assistant', conteudo: finalText });
      await supabase.from('copilot_conversas').update({ atualizado_em: new Date().toISOString() }).eq('id', convId);
      loadConversas();
    } catch (err: any) {
      if (acc.trim()) {
        setMessages(prev => [...prev, { role: 'assistant', content: acc.trim() }]);
        supabase.from('copilot_mensagens').insert({ conversa_id: convId, papel: 'assistant', conteudo: acc.trim() });
      }
      setStreamText('');
      setError(err.message || 'Falha ao falar com o copiloto.');
    } finally {
      setStreaming(false);
    }
  };

  const send = () => sendPrompt(input);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // Renderiza botões de ação interativos quando o texto menciona rotas do sistema
  const renderMessageContent = (content: string) => {
    const hasFuncMes = content.includes('/app/funcionario-mes') || content.toLowerCase().includes('funcionário do mês');
    const hasColabs = content.includes('/app/colaboradores') || content.toLowerCase().includes('colaboradores');
    const hasFolha = content.includes('/app/folha') || content.toLowerCase().includes('folha de pagamento');

    return (
      <div className="space-y-2">
        <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
        {(hasFuncMes || hasColabs || hasFolha) && (
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/10">
            {hasFuncMes && (
              <button
                onClick={() => { setOpen(false); navigate('/app/funcionario-mes'); }}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-brand/20 text-brand border border-brand/40 hover:bg-brand/30 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <ExternalLink size={11} /> Ir para Funcionário do Mês
              </button>
            )}
            {hasColabs && (
              <button
                onClick={() => { setOpen(false); navigate('/app/colaboradores'); }}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-brand/20 text-brand border border-brand/40 hover:bg-brand/30 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <ExternalLink size={11} /> Ir para Colaboradores
              </button>
            )}
            {hasFolha && (
              <button
                onClick={() => { setOpen(false); navigate('/app/folha'); }}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-brand/20 text-brand border border-brand/40 hover:bg-brand/30 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <ExternalLink size={11} /> Ir para Folha de Pagamento
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Botão flutuante */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Copiloto de Gente"
          aria-label="Abrir Copiloto de Gente"
          className="group fixed bottom-5 right-5 z-50 w-14 h-14 rounded-2xl flex items-center justify-center text-white transition-all duration-300 hover:scale-105 bg-gradient-to-br from-brand to-brand-strong ring-1 ring-white/30 shadow-[0_10px_30px_-8px_rgba(79,109,245,0.65)] hover:shadow-[0_14px_36px_-8px_rgba(79,109,245,0.85)] cursor-pointer"
        >
          <span aria-hidden className="absolute inset-0 rounded-2xl bg-brand/40 blur-md -z-10 animate-pulse" />
          <Sparkles size={22} className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)] group-hover:rotate-12 transition-transform duration-300" />
        </button>
      )}

      {/* Painel do Copiloto */}
      {open && (
        <div className={`fixed bottom-5 right-5 z-50 w-[94vw] max-w-lg h-[80vh] max-h-[700px] rounded-3xl border shadow-2xl flex flex-col overflow-hidden animate-fadeIn ${panelBg}`}>
          {/* Header */}
          <div className={`flex items-center justify-between px-5 py-3.5 border-b ${dark ? 'border-white/10 bg-[#0B101D]/90' : 'border-black/10 bg-white/90'} backdrop-blur-md`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-gradient-to-br from-brand to-brand-strong text-white shadow-md shadow-brand/25">
                <Sparkles size={18} />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-bold flex items-center gap-2">
                  Copiloto de Gente
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <Activity size={10} className="animate-pulse" /> Dados em tempo real
                  </span>
                </div>
                <div className="text-[11px] opacity-60">Diretora de RH &amp; Estratégia de Pessoas</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowHistory(s => !s)} title="Histórico de Conversas" className="p-2 rounded-xl opacity-70 hover:opacity-100 hover:bg-white/10 transition-colors"><History size={16} /></button>
              <button onClick={newConversa} title="Nova conversa" className="p-2 rounded-xl opacity-70 hover:opacity-100 hover:bg-white/10 transition-colors"><Plus size={17} /></button>
              <button onClick={() => setOpen(false)} title="Fechar" className="p-2 rounded-xl opacity-70 hover:opacity-100 hover:bg-white/10 transition-colors"><X size={17} /></button>
            </div>
          </div>

          {/* Histórico */}
          {showHistory && (
            <div className={`px-3 py-2.5 border-b max-h-56 overflow-y-auto ${dark ? 'border-white/10 bg-[#131B2E]' : 'border-black/10 bg-[#F0F3FA]'}`}>
              {conversas.length === 0 ? (
                <div className="text-[11px] italic opacity-50 px-2 py-3 text-center">Sem conversas anteriores.</div>
              ) : conversas.map(c => (
                <div key={c.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors ${currentId === c.id ? (dark ? 'bg-brand/20 border border-brand/40 font-semibold' : 'bg-brand/10 border border-brand/30 font-semibold') : 'hover:bg-white/5'}`}>
                  <MessageSquare size={13} className="opacity-70 shrink-0 text-brand" />
                  <span onClick={() => openConversa(c.id)} className="flex-1 truncate">{c.titulo || 'Conversa sem título'}</span>
                  <button onClick={() => deleteConversa(c.id)} className="opacity-40 hover:opacity-100 hover:text-rose-500 transition-opacity p-1"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          )}

          {/* Mensagens */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {messages.length === 0 && !streaming && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-90 px-2 py-4 space-y-4">
                <div className="w-14 h-14 rounded-3xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand shadow-inner">
                  <Bot size={30} />
                </div>
                <div>
                  <h4 className="text-sm font-bold">Sua Diretora de Gente Integrada</h4>
                  <p className="text-xs mt-1 opacity-70 leading-relaxed max-w-xs">
                    Conectada aos dados ao vivo do Omni ITO. Pergunte sobre funcionários, férias, funcionário do mês, contratação e CLT.
                  </p>
                </div>

                {/* Sugestões Rápidas & Briefing Proativo */}
                <div className="w-full space-y-2 pt-2">
                  {/* Botão de Briefing Executivo Proativo (Item 1) */}
                  <button
                    onClick={() => sendPrompt("Elabore um briefing executivo de RH com base nas métricas reais da empresa hoje (colaboradores ativos, férias, funcionário do mês e pontos de atenção para a gestão).")}
                    className="w-full text-xs font-bold px-4 py-3 rounded-2xl bg-gradient-to-r from-brand/20 to-brand/10 border border-brand/40 text-brand hover:bg-brand/20 flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <PieChart size={16} /> 📊 Gerar Briefing Executivo de RH (1 Clique)
                  </button>

                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-50 text-left px-1 pt-1">Perguntas Frequentes &amp; Ações:</div>
                  <div className="grid gap-2 text-left">
                    {[
                      { label: "🏆 Como está a rodada do Funcionário do Mês?", query: "Como está a rodada do Funcionário do Mês?" },
                      { label: "📊 Quantos colaboradores temos ativos hoje?", query: "Quantos colaboradores temos ativos hoje no sistema?" },
                      { label: "🏖️ Quem está em férias atualmente?", query: "Quem está em férias atualmente na empresa?" },
                      { label: "📋 Qual o prazo legal de quitação da rescisão?", query: "Qual o prazo legal para pagamento da rescisão contratual?" }
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => sendPrompt(item.query)}
                        className={`w-full text-xs px-3.5 py-2.5 rounded-2xl border text-left transition-all cursor-pointer ${dark ? 'border-white/10 hover:border-brand/60 hover:bg-brand/15' : 'border-black/10 hover:border-brand/40 hover:bg-brand/5'}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-brand/20 border border-brand/30 flex items-center justify-center text-brand shrink-0 mt-0.5">
                    <Sparkles size={14} />
                  </div>
                )}
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-xs leading-relaxed ${m.role === 'user' ? bubbleUser : bubbleBot}`}>
                  {m.role === 'assistant' ? renderMessageContent(m.content) : m.content}
                </div>
                {m.role === 'user' && (
                  <div className="w-6 h-6 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0 mt-0.5">
                    <User size={12} />
                  </div>
                )}
              </div>
            ))}

            {streaming && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-xl bg-brand/20 border border-brand/30 flex items-center justify-center text-brand shrink-0 mt-0.5">
                  <Sparkles size={14} />
                </div>
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-xs leading-relaxed ${bubbleBot}`}>
                  {streamText ? renderMessageContent(streamText) : <span className="inline-flex items-center gap-1.5 opacity-70 font-medium"><Loader2 size={14} className="animate-spin text-brand" /> Analisando métricas ao vivo do sistema...</span>}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="px-4 py-2.5 text-xs font-semibold text-rose-400 bg-rose-500/10 border-t border-rose-500/20">{error}</div>
          )}

          {/* Input */}
          <div className={`p-4 border-t ${dark ? 'border-white/10 bg-[#0B101D]' : 'border-black/10 bg-white'}`}>
            <div className={`flex items-end gap-2 rounded-2xl border p-2.5 ${inputBg}`}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Pergunte à sua Diretora de Gente..."
                className="flex-1 bg-transparent text-xs resize-none outline-none max-h-28 leading-relaxed px-1"
              />
              <button
                onClick={send}
                disabled={streaming || !input.trim()}
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-brand text-white hover:bg-brand-strong disabled:opacity-40 shadow-md shadow-brand/20 transition-all cursor-pointer"
              >
                {streaming ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
            <div className="text-[10px] opacity-40 mt-2 text-center font-medium">Dados atualizados dinamicamente via Omni ITO · Diretrizes de RH e CLT.</div>
          </div>
        </div>
      )}
    </>
  );
}
