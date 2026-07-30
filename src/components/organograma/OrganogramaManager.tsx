import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { Plus, Pencil, Trash2, X, ChevronUp, ChevronDown, User, ImageDown, Printer } from 'lucide-react';
import {
  gerarSvgOrganograma,
  svgParaPngBlob,
  baixarArquivo,
  imprimirSvg,
  type NoOrganograma
} from '../../utils/organogramaSvg';
import { useDialogoAcessivel } from '../../hooks/useDialogoAcessivel';

type Theme = 'dark' | 'light';

interface OrgNode {
  id: string;
  parent_id: string | null;
  titulo: string;
  subtitulo: string | null;
  colaborador_id: string | null;
  ordem: number;
}

interface Colab { id: string; nome: string; cargo?: string | null }

interface Props {
  theme: Theme;
  colaboradoresList: Colab[];
  hasFullAccess: boolean;
  notify?: (msg: string) => void;
}

const emptyForm = { titulo: '', subtitulo: '', colaborador_id: '', parent_id: null as string | null };

export default function OrganogramaManager({ colaboradoresList, hasFullAccess, notify }: Props) {
  const [nodes, setNodes] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [semTabela, setSemTabela] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // modal de edição/criação
  const [exportando, setExportando] = useState<'png' | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // null = criando
  const [form, setForm] = useState(emptyForm);

  const aviso = useCallback((m: string) => { notify ? notify(m) : window.alert(m); }, [notify]);

  // Esc fecha, Tab circula dentro do modal, e o foco volta para quem abriu.
  const { ref: refModal, propsDialogo } = useDialogoAcessivel(modalOpen, () => setModalOpen(false));

  const fetchNodes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('organograma_nos').select('*').order('ordem');
    if (error) {
      // Tabela ainda não existe (migração não rodada) — mostra instrução, não quebra.
      setSemTabela(true);
      setNodes([]);
      setLoading(false);
      return;
    }
    setSemTabela(false);
    setNodes((data || []) as OrgNode[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchNodes(); }, [fetchNodes]);

  // mapa pai -> filhos (ordenado)
  const childrenOf = useMemo(() => {
    const m: Record<string, OrgNode[]> = {};
    for (const n of nodes) {
      const k = n.parent_id || '__root__';
      (m[k] ||= []).push(n);
    }
    for (const k in m) m[k].sort((a, b) => (a.ordem - b.ordem) || a.titulo.localeCompare(b.titulo));
    return m;
  }, [nodes]);

  const roots = childrenOf['__root__'] || [];

  // descendentes de um nó (para impedir escolher a si mesmo/descendente como superior)
  const descendentesDe = useCallback((id: string): Set<string> => {
    const out = new Set<string>();
    const walk = (pid: string) => {
      for (const c of (childrenOf[pid] || [])) { out.add(c.id); walk(c.id); }
    };
    walk(id);
    return out;
  }, [childrenOf]);

  const nomeColab = useCallback((id: string | null) => {
    if (!id) return null;
    return colaboradoresList.find(c => c.id === id)?.nome || null;
  }, [colaboradoresList]);

  // ---- ações ----
  const abrirNovo = (parentId: string | null) => {
    setEditingId(null);
    setForm({ ...emptyForm, parent_id: parentId });
    setModalOpen(true);
  };

  const abrirEdicao = (n: OrgNode) => {
    setEditingId(n.id);
    setForm({
      titulo: n.titulo,
      subtitulo: n.subtitulo || '',
      colaborador_id: n.colaborador_id || '',
      parent_id: n.parent_id,
    });
    setModalOpen(true);
  };

  const salvar = async () => {
    const titulo = form.titulo.trim();
    if (!titulo) { aviso('Informe o cargo/título do nó.'); return; }
    setSalvando(true);
    const payload = {
      titulo,
      subtitulo: form.subtitulo.trim() || null,
      colaborador_id: form.colaborador_id || null,
      parent_id: form.parent_id || null,
    };
    if (editingId) {
      const { error } = await supabase.from('organograma_nos').update(payload).eq('id', editingId);
      if (error) { aviso('Erro ao salvar: ' + error.message); setSalvando(false); return; }
    } else {
      const irmaos = childrenOf[form.parent_id || '__root__'] || [];
      const ordem = irmaos.length ? Math.max(...irmaos.map(i => i.ordem)) + 1 : 0;
      const { error } = await supabase.from('organograma_nos').insert({ ...payload, ordem });
      if (error) { aviso('Erro ao criar: ' + error.message); setSalvando(false); return; }
    }
    setSalvando(false);
    setModalOpen(false);
    await fetchNodes();
  };

  const excluir = async (n: OrgNode) => {
    const filhos = childrenOf[n.id] || [];
    const msg = filhos.length
      ? `Excluir "${n.titulo}" e seus ${filhos.length} subordinado(s)? Esta ação não pode ser desfeita.`
      : `Excluir "${n.titulo}"?`;
    if (!window.confirm(msg)) return;
    const { error } = await supabase.from('organograma_nos').delete().eq('id', n.id);
    if (error) { aviso('Erro ao excluir: ' + error.message); return; }
    await fetchNodes();
  };

  // troca a ordem com o irmão anterior/seguinte
  const mover = async (n: OrgNode, dir: -1 | 1) => {
    const irmaos = childrenOf[n.parent_id || '__root__'] || [];
    const idx = irmaos.findIndex(i => i.id === n.id);
    const alvo = irmaos[idx + dir];
    if (!alvo) return;
    const { error: e1 } = await supabase.from('organograma_nos').update({ ordem: alvo.ordem }).eq('id', n.id);
    const { error: e2 } = await supabase.from('organograma_nos').update({ ordem: n.ordem }).eq('id', alvo.id);
    if (e1 || e2) { aviso('Erro ao reordenar.'); return; }
    await fetchNodes();
  };

  // ---- render de um nó (recursivo) ----
  const renderNode = (n: OrgNode) => {
    const filhos = childrenOf[n.id] || [];
    const colab = nomeColab(n.colaborador_id);
    return (
      <li key={n.id}>
        <div className="org-box group">
          <p className="font-rounded text-[10px] font-bold uppercase tracking-wider leading-tight">{n.titulo}</p>
          {n.subtitulo && <p className="text-[9px] opacity-70 mt-0.5 leading-tight">({n.subtitulo})</p>}
          {colab && (
            <p className="inline-flex items-center gap-1 text-[8px] opacity-80 mt-1.5 px-1.5 py-0.5 rounded-full bg-white/10">
              <User size={8} /> {colab.split(' ').slice(0, 2).join(' ')}
            </p>
          )}
          {hasFullAccess && (
            <div className="flex items-center justify-center gap-1 mt-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
              {/* aria-label além do title: title não é lido de forma confiável
                  por leitor de tela e não aparece no toque. E o rótulo cita o
                  cargo, senão a pessoa ouve "Excluir" cinco vezes seguidas sem
                  saber excluir o quê. */}
              <button onClick={() => abrirNovo(n.id)} title="Adicionar subordinado" aria-label={`Adicionar subordinado a ${n.titulo}`} className="p-1 rounded bg-white/10 hover:bg-white/20"><Plus size={11} aria-hidden /></button>
              <button onClick={() => abrirEdicao(n)} title="Editar" aria-label={`Editar ${n.titulo}`} className="p-1 rounded bg-white/10 hover:bg-white/20"><Pencil size={10} aria-hidden /></button>
              <button onClick={() => mover(n, -1)} title="Mover para a esquerda" aria-label={`Mover ${n.titulo} para a esquerda`} className="p-1 rounded bg-white/10 hover:bg-white/20"><ChevronUp size={11} aria-hidden /></button>
              <button onClick={() => mover(n, 1)} title="Mover para a direita" aria-label={`Mover ${n.titulo} para a direita`} className="p-1 rounded bg-white/10 hover:bg-white/20"><ChevronDown size={11} aria-hidden /></button>
              <button onClick={() => excluir(n)} title="Excluir" aria-label={`Excluir ${n.titulo}`} className="p-1 rounded bg-rose-500/25 hover:bg-rose-500/40"><Trash2 size={10} aria-hidden /></button>
            </div>
          )}
        </div>
        {filhos.length > 0 && <ul>{filhos.map(renderNode)}</ul>}
      </li>
    );
  };

  // ---- exportação ----
  // O SVG é desenhado a partir dos dados, não capturado da tela. A árvore
  // visível usa vidro e blur, que nenhum capturador de HTML reproduz bem — e
  // desenhar do zero ainda sai mais nítido e sem dependência nova.
  const montarSvg = useCallback(() => {
    const paraExportar: NoOrganograma[] = nodes.map(n => ({
      id: n.id,
      parent_id: n.parent_id,
      titulo: n.titulo,
      subtitulo: n.subtitulo,
      colaborador: nomeColab(n.colaborador_id),
      ordem: n.ordem
    }));
    return gerarSvgOrganograma(paraExportar, {
      titulo: 'Organograma',
      rodape: `Gerado em ${new Date().toLocaleDateString('pt-BR')} · Omni ITO`
    });
  }, [nodes, nomeColab]);

  const nomeBase = () => `organograma-${new Date().toISOString().slice(0, 10)}`;

  const exportarPng = async () => {
    setExportando('png');
    try {
      const blob = await svgParaPngBlob(montarSvg(), 2);
      baixarArquivo(blob, `${nomeBase()}.png`, 'image/png');
    } catch (e) {
      aviso(e instanceof Error ? e.message : 'Não foi possível gerar o PNG.');
    } finally {
      setExportando(null);
    }
  };

  const exportarPdf = () => {
    // Sem biblioteca de PDF: o diálogo do navegador já gera PDF vetorial, e
    // quem imprime escolhe margem e orientação. jsPDF custaria ~350 kB.
    try {
      imprimirSvg(montarSvg(), 'Organograma — Omni ITO');
    } catch (e) {
      aviso(e instanceof Error ? e.message : 'Não foi possível abrir a impressão.');
    }
  };

  // superiores válidos no dropdown (não pode ser o próprio nó nem descendente)
  const opcoesSuperior = useMemo(() => {
    const bloqueados = editingId ? (() => { const s = descendentesDe(editingId); s.add(editingId); return s; })() : new Set<string>();
    return nodes.filter(n => !bloqueados.has(n.id));
  }, [nodes, editingId, descendentesDe]);

  if (loading) {
    return <div className="py-16 text-center text-xs text-fg-muted animate-pulse">Carregando organograma…</div>;
  }

  if (semTabela) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 text-sm space-y-3">
        <p className="font-rounded font-bold uppercase tracking-wider text-amber-500 text-xs">Tabela do organograma não encontrada</p>
        <p className="text-fg-secondary text-xs leading-relaxed">
          Rode o SQL de criação da tabela <code className="px-1 rounded bg-black/10">organograma_nos</code> no Supabase
          (arquivo <code className="px-1 rounded bg-black/10">supabase/organograma.sql</code>) e recarregue esta aba.
        </p>
        <button onClick={fetchNodes} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-brand text-white hover:bg-brand-strong">Tentar de novo</button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-display text-xl font-semibold">Organograma</h3>
          <p className="text-xs text-fg-secondary mt-1">Estrutura hierárquica da clínica. Passe o mouse num cargo para editar, adicionar subordinado ou reordenar.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Exportar não depende de hasFullAccess: quem enxerga o organograma
              pode levá-lo para uma reunião. Não há dado a mais no arquivo do
              que já está na tela. */}
          {roots.length > 0 && (
            <>
              <button
                onClick={exportarPng}
                disabled={exportando === 'png'}
                title="Baixar como imagem PNG"
                className="inline-flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl border border-line hover:bg-surface-2 transition-colors disabled:opacity-50"
              >
                <ImageDown size={14} aria-hidden />
                {exportando === 'png' ? 'Gerando…' : 'PNG'}
              </button>
              <button
                onClick={exportarPdf}
                title="Abrir a impressão para salvar em PDF"
                className="inline-flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl border border-line hover:bg-surface-2 transition-colors"
              >
                <Printer size={14} aria-hidden />
                PDF
              </button>
            </>
          )}
          {hasFullAccess && (
            <button onClick={() => abrirNovo(null)} className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl bg-brand text-white hover:bg-brand-strong transition-colors">
              <Plus size={14} aria-hidden /> Novo cargo (topo)
            </button>
          )}
        </div>
      </div>

      {roots.length === 0 ? (
        <div className="rounded-2xl border border-line glass-fill glass-sheen p-10 text-center">
          <p className="text-sm text-fg-secondary">Nenhum cargo ainda.</p>
          {hasFullAccess && <p className="text-xs text-fg-muted mt-1">Clique em “Novo cargo (topo)” para começar (ex.: CEO).</p>}
        </div>
      ) : (
        <div className="rounded-2xl border border-line glass-fill glass-sheen p-6 overflow-x-auto">
          <div className="org-tree min-w-full justify-center">
            <ul>{roots.map(renderNode)}</ul>
          </div>
        </div>
      )}

      {/* Modal de edição/criação */}
      {modalOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" onClick={() => setModalOpen(false)} />
          <div
            ref={refModal}
            {...propsDialogo}
            aria-labelledby="org-modal-titulo"
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-[92vw] max-w-md rounded-2xl border border-line glass-fill glass-sheen p-5 space-y-4 outline-none"
          >
            <div className="flex items-center justify-between">
              <h4 id="org-modal-titulo" className="font-display text-lg font-semibold">{editingId ? 'Editar cargo' : 'Novo cargo'}</h4>
              <button onClick={() => setModalOpen(false)} aria-label="Fechar" className="p-1.5 rounded-lg border border-line hover:bg-surface-2"><X size={16} aria-hidden /></button>
            </div>

            <div className="space-y-1">
              <label htmlFor="org-titulo" className="font-rounded text-[10px] font-bold uppercase tracking-wider text-fg-muted">Cargo / Título</label>
              <input id="org-titulo"
                autoFocus
                value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex.: Coordenadora RH"
                className="w-full text-sm p-2.5 rounded-lg border border-line bg-surface-2 text-fg focus:outline-none focus:border-brand/50"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="org-subtitulo" className="font-rounded text-[10px] font-bold uppercase tracking-wider text-fg-muted">Subtítulo (opcional)</label>
              <input id="org-subtitulo"
                value={form.subtitulo}
                onChange={e => setForm(f => ({ ...f, subtitulo: e.target.value }))}
                placeholder="Ex.: Analista Financeiro"
                className="w-full text-sm p-2.5 rounded-lg border border-line bg-surface-2 text-fg focus:outline-none focus:border-brand/50"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="org-superior-imediato" className="font-rounded text-[10px] font-bold uppercase tracking-wider text-fg-muted">Superior imediato</label>
              <select id="org-superior-imediato"
                value={form.parent_id || ''}
                onChange={e => setForm(f => ({ ...f, parent_id: e.target.value || null }))}
                className="w-full text-sm p-2.5 rounded-lg border border-line bg-surface-2 text-fg focus:outline-none focus:border-brand/50"
              >
                <option value="">— Nenhum (topo) —</option>
                {opcoesSuperior.map(n => (
                  <option key={n.id} value={n.id}>{n.titulo}{n.subtitulo ? ` (${n.subtitulo})` : ''}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="org-colaborador-id" className="font-rounded text-[10px] font-bold uppercase tracking-wider text-fg-muted">Vincular colaborador (opcional)</label>
              <select id="org-colaborador-id"
                value={form.colaborador_id}
                onChange={e => setForm(f => ({ ...f, colaborador_id: e.target.value }))}
                className="w-full text-sm p-2.5 rounded-lg border border-line bg-surface-2 text-fg focus:outline-none focus:border-brand/50"
              >
                <option value="">— Sem vínculo —</option>
                {colaboradoresList.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}{c.cargo ? ` — ${c.cargo}` : ''}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setModalOpen(false)} className="text-xs font-bold px-4 py-2 rounded-lg border border-line hover:bg-surface-2">Cancelar</button>
              <button onClick={salvar} disabled={salvando} className="text-xs font-bold px-4 py-2 rounded-lg bg-brand text-white hover:bg-brand-strong disabled:opacity-50">
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
