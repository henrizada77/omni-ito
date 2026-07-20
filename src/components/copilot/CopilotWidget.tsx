import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import {
  Sparkles,
  X,
  Send,
  Plus,
  History,
  Loader2,
  MessageSquare,
  Trash2
} from 'lucide-react';

interface CopilotWidgetProps {
  theme: 'dark' | 'light';
}

interface Msg { role: 'user' | 'assistant'; content: string }
interface Conversa { id: string; titulo: string | null; atualizado_em: string }

export default function CopilotWidget({ theme }: CopilotWidgetProps) {
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

  const panelBg = dark ? 'bg-[#0D0D0C] border-white/10' : 'bg-white border-black/10';
  const bubbleUser = dark ? 'bg-[#E5DFD3] text-[#0D0D0C]' : 'bg-[#0A0A0A] text-white';
  const bubbleBot = dark ? 'bg-white/5 text-[#E5DFD3] border border-white/10' : 'bg-black/[0.03] text-[#0A0A0A] border border-black/10';
  const inputBg = dark ? 'bg-[#121211] border-white/10' : 'bg-white border-black/15';

  const loadConversas = useCallback(async () => {
    const { data } = await supabase
      .from('copilot_conversas')
      .select('id, titulo, atualizado_em')
      .order('atualizado_em', { ascending: false })
      .limit(30);
    setConversas((data as Conversa[]) || []);
  }, []);

  useEffect(() => { if (open) loadConversas(); }, [open, loadConversas]);

  // Auto-scroll para o fim ao chegar mensagem / stream
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streamText]);

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

  const send = async () => {
    const texto = input.trim();
    if (!texto || streaming) return;
    setError('');
    setInput('');

    // Garante uma conversa (cria na primeira mensagem, título = início do texto)
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
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/copilot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ messages: nextMessages })
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
      // Salva o parcial se houver, para não perder o que já veio.
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

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* Botão flutuante */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Copiloto de RH"
          className={`fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 ${
            dark ? 'bg-[#E5DFD3] text-[#0D0D0C]' : 'bg-[#0A0A0A] text-white'
          }`}
        >
          <Sparkles size={22} />
        </button>
      )}

      {/* Painel */}
      {open && (
        <div className={`fixed bottom-5 right-5 z-50 w-[92vw] max-w-md h-[70vh] max-h-[640px] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${panelBg}`}>
          {/* Header */}
          <div className={`flex items-center justify-between px-4 py-3 border-b ${dark ? 'border-white/10' : 'border-black/10'}`}>
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${dark ? 'bg-[#E5DFD3] text-[#0D0D0C]' : 'bg-[#0A0A0A] text-white'}`}>
                <Sparkles size={15} />
              </div>
              <div className="leading-tight">
                <div className="text-xs font-bold">Copiloto de Gente</div>
                <div className="text-[9px] opacity-50">Diretora de RH · IA</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowHistory(s => !s)} title="Histórico" className="p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-white/5"><History size={15} /></button>
              <button onClick={newConversa} title="Nova conversa" className="p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-white/5"><Plus size={16} /></button>
              <button onClick={() => setOpen(false)} title="Fechar" className="p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-white/5"><X size={16} /></button>
            </div>
          </div>

          {/* Histórico */}
          {showHistory && (
            <div className={`px-2 py-2 border-b max-h-52 overflow-y-auto ${dark ? 'border-white/10' : 'border-black/10'}`}>
              {conversas.length === 0 ? (
                <div className="text-[11px] italic opacity-50 px-2 py-3 text-center">Sem conversas ainda.</div>
              ) : conversas.map(c => (
                <div key={c.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer ${currentId === c.id ? (dark ? 'bg-white/10' : 'bg-black/5') : 'hover:bg-white/5'}`}>
                  <MessageSquare size={12} className="opacity-50 shrink-0" />
                  <span onClick={() => openConversa(c.id)} className="flex-1 truncate">{c.titulo || 'Conversa'}</span>
                  <button onClick={() => deleteConversa(c.id)} className="opacity-40 hover:opacity-100 hover:text-rose-500"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          )}

          {/* Mensagens */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && !streaming && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-60 px-4">
                <Sparkles size={26} className="mb-3" />
                <p className="text-xs font-semibold">Sua Diretora de Gente, sempre à mão.</p>
                <p className="text-[11px] mt-1 leading-relaxed">Pergunte sobre contratação, cultura, turnover, plano de carreira, demissão, avaliação, processos de RH. Ela responde com diagnóstico e passo a passo.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? bubbleUser : bubbleBot}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {streaming && (
              <div className="flex justify-start">
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${bubbleBot}`}>
                  {streamText || <span className="inline-flex items-center gap-1 opacity-60"><Loader2 size={12} className="animate-spin" /> pensando...</span>}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="px-4 py-2 text-[11px] text-rose-500 bg-rose-500/5 border-t border-rose-500/20">{error}</div>
          )}

          {/* Input */}
          <div className={`p-3 border-t ${dark ? 'border-white/10' : 'border-black/10'}`}>
            <div className={`flex items-end gap-2 rounded-xl border p-2 ${inputBg}`}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Pergunte à sua Diretora de Gente..."
                className="flex-1 bg-transparent text-xs resize-none outline-none max-h-24 leading-relaxed"
              />
              <button
                onClick={send}
                disabled={streaming || !input.trim()}
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${dark ? 'bg-[#E5DFD3] text-[#0D0D0C]' : 'bg-[#0A0A0A] text-white'} disabled:opacity-40`}
              >
                {streaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
            <div className="text-[9px] opacity-40 mt-1.5 text-center">A IA pode errar. Confirme dados jurídicos e números antes de decidir.</div>
          </div>
        </div>
      )}
    </>
  );
}
