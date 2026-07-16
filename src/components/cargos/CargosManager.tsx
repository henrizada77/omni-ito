import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import {
  Briefcase,
  GitBranch,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  X,
  ChevronRight
} from 'lucide-react';
import type {
  Cargo,
  TrilhaCarreira,
  TrilhaDegrau,
  Promocao,
  PromocaoStatus,
  Colaborador
} from '../../types';

interface CargosManagerProps {
  theme: 'dark' | 'light';
  userEmail: string;
}

type SubTab = 'catalogo' | 'promocoes';

const STATUS_LABEL: Record<PromocaoStatus, string> = {
  proposta: 'Proposta',
  aprovada: 'Aprovada',
  efetivada: 'Efetivada',
  rejeitada: 'Rejeitada'
};

const STATUS_STYLE: Record<PromocaoStatus, string> = {
  proposta: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  aprovada: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  efetivada: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  rejeitada: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
};

const formatMoney = (n?: number | null) => {
  if (n === null || n === undefined || isNaN(Number(n))) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n));
};

export default function CargosManager({ theme, userEmail }: CargosManagerProps) {
  const [subTab, setSubTab] = useState<SubTab>('catalogo');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const dismissFeedback = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  // Domain state
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [trilhas, setTrilhas] = useState<TrilhaCarreira[]>([]);
  const [degraus, setDegraus] = useState<TrilhaDegrau[]>([]);
  const [promocoes, setPromocoes] = useState<Promocao[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);

  const cardBg = theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-white border-black/10 shadow-sm';
  const inputBg = theme === 'dark'
    ? 'bg-[#0D0D0C] border-white/10 focus:border-[#E5DFD3]/40'
    : 'bg-white border-black/10 focus:border-black/40';
  const btnPrimary = theme === 'dark'
    ? 'bg-[#E5DFD3] text-[#0D0D0C] hover:bg-[#D4CBB7]'
    : 'bg-[#0A0A0A] text-[#FBFBFA] hover:bg-[#2A2A2A]';
  const btnSecondary = theme === 'dark'
    ? 'border-white/10 hover:bg-white/5 text-white/90'
    : 'border-black/10 hover:bg-black/5 text-black/90';

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cargosRes, trilhasRes, degrausRes, promocoesRes, colabsRes] = await Promise.all([
        supabase.from('cargos').select('*').order('titulo'),
        supabase.from('trilhas_carreira').select('*').order('nome'),
        supabase.from('trilha_degraus').select('*').order('ordem'),
        supabase.from('promocoes').select('*').order('criado_em', { ascending: false }),
        supabase.from('colaboradores').select('id, nome, cargo, setor, salario, status').order('nome')
      ]);

      if (cargosRes.error) throw cargosRes.error;
      if (trilhasRes.error) throw trilhasRes.error;
      if (degrausRes.error) throw degrausRes.error;
      if (promocoesRes.error) throw promocoesRes.error;
      if (colabsRes.error) throw colabsRes.error;

      setCargos(cargosRes.data || []);
      setTrilhas(trilhasRes.data || []);
      setDegraus(degrausRes.data || []);
      setPromocoes(promocoesRes.data || []);
      setColaboradores((colabsRes.data as Colaborador[]) || []);
    } catch (err: any) {
      console.error('CargosManager fetch:', err);
      setErrorMsg(err.message || 'Falha ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (!successMsg && !errorMsg) return;
    const t = setTimeout(dismissFeedback, 4500);
    return () => clearTimeout(t);
  }, [successMsg, errorMsg]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="pb-6 border-b border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#E5DFD3]/20">MÓDULO 9</span>
            <h3 className="text-xl font-bold">Cargos & Descritivos</h3>
          </div>
          <p className="text-xs opacity-65 mt-1">Catálogo central de cargos, trilhas de carreira com múltiplos degraus e o workflow de promoções.</p>
        </div>

        {/* Sub-tab switcher */}
        <div className={`inline-flex p-1 rounded-xl border ${theme === 'dark' ? 'border-white/10 bg-[#0D0D0C]' : 'border-black/10 bg-white'}`}>
          <button
            onClick={() => setSubTab('catalogo')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 transition-colors ${
              subTab === 'catalogo' ? btnPrimary : 'opacity-60 hover:opacity-100'
            }`}
          >
            <Briefcase size={13} /> Catálogo & Trilhas
          </button>
          <button
            onClick={() => setSubTab('promocoes')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 transition-colors ${
              subTab === 'promocoes' ? btnPrimary : 'opacity-60 hover:opacity-100'
            }`}
          >
            <GitBranch size={13} /> Promoções
          </button>
        </div>
      </div>

      {/* Global feedback */}
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

      {loading ? (
        <div className="py-16 flex flex-col items-center gap-3 opacity-60">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-xs font-mono uppercase tracking-wider">Carregando catálogo...</span>
        </div>
      ) : subTab === 'catalogo' ? (
        <CatalogoView
          theme={theme}
          cargos={cargos}
          trilhas={trilhas}
          degraus={degraus}
          onChange={fetchAll}
          setErrorMsg={setErrorMsg}
          setSuccessMsg={setSuccessMsg}
          cardBg={cardBg}
          inputBg={inputBg}
          btnPrimary={btnPrimary}
          btnSecondary={btnSecondary}
        />
      ) : (
        <PromocoesView
          theme={theme}
          promocoes={promocoes}
          cargos={cargos}
          colaboradores={colaboradores}
          userEmail={userEmail}
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
// CATÁLOGO & TRILHAS
// ============================================================================

interface CatalogoViewProps {
  theme: 'dark' | 'light';
  cargos: Cargo[];
  trilhas: TrilhaCarreira[];
  degraus: TrilhaDegrau[];
  onChange: () => Promise<void>;
  setErrorMsg: (m: string) => void;
  setSuccessMsg: (m: string) => void;
  cardBg: string;
  inputBg: string;
  btnPrimary: string;
  btnSecondary: string;
}

function CatalogoView({
  theme,
  cargos,
  trilhas,
  degraus,
  onChange,
  setErrorMsg,
  setSuccessMsg,
  cardBg,
  inputBg,
  btnPrimary,
  btnSecondary
}: CatalogoViewProps) {
  const [selectedCargoId, setSelectedCargoId] = useState<string | null>(null);
  const [selectedTrilhaId, setSelectedTrilhaId] = useState<string | null>(null);
  const [cargoDraft, setCargoDraft] = useState<Partial<Cargo> | null>(null);
  const [trilhaDraft, setTrilhaDraft] = useState<Partial<TrilhaCarreira> | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchCargo, setSearchCargo] = useState('');

  const filteredCargos = useMemo(() => {
    const q = searchCargo.toLowerCase().trim();
    if (!q) return cargos;
    return cargos.filter(
      c => c.titulo.toLowerCase().includes(q) || (c.setor || '').toLowerCase().includes(q)
    );
  }, [cargos, searchCargo]);

  const trilhaDegraus = useMemo(() => {
    if (!selectedTrilhaId) return [];
    return degraus
      .filter(d => d.trilha_id === selectedTrilhaId)
      .sort((a, b) => a.ordem - b.ordem);
  }, [degraus, selectedTrilhaId]);

  const cargoById = (id?: string) => cargos.find(c => c.id === id);

  const startNewCargo = () => {
    setSelectedCargoId(null);
    setCargoDraft({
      titulo: '',
      descricao: '',
      atribuicoes: [],
      cbo: '',
      setor: '',
      faixa_salarial_min: undefined,
      faixa_salarial_max: undefined,
      requisitos: '',
      ativo: true
    });
  };

  const startEditCargo = (c: Cargo) => {
    setSelectedCargoId(c.id);
    setCargoDraft({ ...c });
  };

  const saveCargo = async () => {
    if (!cargoDraft?.titulo?.trim()) {
      setErrorMsg('Título do cargo é obrigatório.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        titulo: cargoDraft.titulo.trim(),
        descricao: cargoDraft.descricao || null,
        atribuicoes: cargoDraft.atribuicoes || [],
        cbo: cargoDraft.cbo || null,
        setor: cargoDraft.setor || null,
        faixa_salarial_min: cargoDraft.faixa_salarial_min ?? null,
        faixa_salarial_max: cargoDraft.faixa_salarial_max ?? null,
        requisitos: cargoDraft.requisitos || null,
        ativo: cargoDraft.ativo ?? true
      };

      if (selectedCargoId) {
        const { error } = await supabase.from('cargos').update(payload).eq('id', selectedCargoId);
        if (error) throw error;
        setSuccessMsg('Cargo atualizado.');
      } else {
        const { error } = await supabase.from('cargos').insert(payload);
        if (error) throw error;
        setSuccessMsg('Cargo criado.');
      }
      setCargoDraft(null);
      setSelectedCargoId(null);
      await onChange();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Falha ao salvar cargo.');
    } finally {
      setSaving(false);
    }
  };

  const deleteCargo = async (c: Cargo) => {
    if (!confirm(`Excluir o cargo "${c.titulo}"? Cargos referenciados em trilhas ou promoções não podem ser excluídos.`)) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('cargos').delete().eq('id', c.id);
      if (error) throw error;
      setSuccessMsg('Cargo removido.');
      if (selectedCargoId === c.id) {
        setSelectedCargoId(null);
        setCargoDraft(null);
      }
      await onChange();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao excluir cargo (pode estar em uso).');
    } finally {
      setSaving(false);
    }
  };

  const startNewTrilha = () => {
    setSelectedTrilhaId(null);
    setTrilhaDraft({ nome: '', descricao: '', ativo: true });
  };

  const saveTrilha = async () => {
    if (!trilhaDraft?.nome?.trim()) {
      setErrorMsg('Nome da trilha é obrigatório.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome: trilhaDraft.nome.trim(),
        descricao: trilhaDraft.descricao || null,
        ativo: trilhaDraft.ativo ?? true
      };
      if (selectedTrilhaId) {
        const { error } = await supabase.from('trilhas_carreira').update(payload).eq('id', selectedTrilhaId);
        if (error) throw error;
        setSuccessMsg('Trilha atualizada.');
      } else {
        const { error } = await supabase.from('trilhas_carreira').insert(payload);
        if (error) throw error;
        setSuccessMsg('Trilha criada.');
      }
      setTrilhaDraft(null);
      await onChange();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao salvar trilha.');
    } finally {
      setSaving(false);
    }
  };

  const addDegrauToTrilha = async (trilhaId: string, cargoId: string) => {
    if (!cargoId) return;
    const existentes = degraus.filter(d => d.trilha_id === trilhaId);
    const nextOrdem = existentes.length ? Math.max(...existentes.map(d => d.ordem)) + 1 : 1;
    setSaving(true);
    try {
      const { error } = await supabase.from('trilha_degraus').insert({
        trilha_id: trilhaId,
        cargo_id: cargoId,
        ordem: nextOrdem,
        requisito_tempo_meses: 12,
        requisito_nota_avaliacao: 4.0
      });
      if (error) throw error;
      setSuccessMsg('Degrau adicionado.');
      await onChange();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao adicionar degrau (o cargo já pode estar na trilha).');
    } finally {
      setSaving(false);
    }
  };

  const removeDegrau = async (degrauId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('trilha_degraus').delete().eq('id', degrauId);
      if (error) throw error;
      await onChange();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao remover degrau.');
    } finally {
      setSaving(false);
    }
  };

  const moveDegrau = async (degrau: TrilhaDegrau, direction: 'up' | 'down') => {
    const sameTrilha = degraus.filter(d => d.trilha_id === degrau.trilha_id).sort((a, b) => a.ordem - b.ordem);
    const idx = sameTrilha.findIndex(d => d.id === degrau.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sameTrilha.length) return;
    const other = sameTrilha[swapIdx];
    setSaving(true);
    try {
      // Duas atualizações — a unique(trilha_id, ordem) obriga a passar por um
      // valor temporário para não colidir no meio da troca.
      const tempOrdem = -1 - Math.floor(Math.random() * 100000);
      const step1 = await supabase.from('trilha_degraus').update({ ordem: tempOrdem }).eq('id', degrau.id);
      if (step1.error) throw step1.error;
      const step2 = await supabase.from('trilha_degraus').update({ ordem: degrau.ordem }).eq('id', other.id);
      if (step2.error) throw step2.error;
      const step3 = await supabase.from('trilha_degraus').update({ ordem: other.ordem }).eq('id', degrau.id);
      if (step3.error) throw step3.error;
      await onChange();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao reordenar degrau.');
    } finally {
      setSaving(false);
    }
  };

  const updateDegrauField = async (degrauId: string, field: string, value: any) => {
    try {
      const { error } = await supabase.from('trilha_degraus').update({ [field]: value }).eq('id', degrauId);
      if (error) throw error;
      await onChange();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao atualizar degrau.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* ==================== COLUNA CARGOS ==================== */}
      <div className={`lg:col-span-5 p-5 rounded-2xl border ${cardBg}`}>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold uppercase tracking-wider opacity-75 flex items-center gap-1.5">
            <Briefcase size={14} /> Cargos ({cargos.length})
          </h4>
          <button
            onClick={startNewCargo}
            className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg flex items-center gap-1 ${btnPrimary}`}
          >
            <Plus size={12} /> Novo
          </button>
        </div>

        <input
          type="text"
          placeholder="Buscar por título ou setor..."
          value={searchCargo}
          onChange={e => setSearchCargo(e.target.value)}
          className={`w-full text-xs px-3 py-2 rounded-lg border mb-3 ${inputBg}`}
        />

        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
          {filteredCargos.length === 0 && (
            <div className="py-6 text-center text-xs italic opacity-50">Nenhum cargo cadastrado.</div>
          )}
          {filteredCargos.map(c => (
            <button
              key={c.id}
              onClick={() => startEditCargo(c)}
              className={`w-full text-left px-3 py-2 rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                selectedCargoId === c.id
                  ? theme === 'dark'
                    ? 'border-[#E5DFD3]/40 bg-[#E5DFD3]/10'
                    : 'border-black/40 bg-black/5'
                  : theme === 'dark'
                    ? 'border-white/5 hover:bg-white/5'
                    : 'border-black/5 hover:bg-black/5'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold truncate">{c.titulo}</div>
                <div className="text-[10px] opacity-60 truncate">
                  {c.setor || 'Sem setor'}
                  {c.faixa_salarial_min ? ` · ${formatMoney(c.faixa_salarial_min)}` : ''}
                  {c.faixa_salarial_max ? ` – ${formatMoney(c.faixa_salarial_max)}` : ''}
                </div>
              </div>
              <ChevronRight size={13} className="opacity-40 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* ==================== COLUNA EDITOR ==================== */}
      <div className={`lg:col-span-7 p-5 rounded-2xl border ${cardBg} space-y-6`}>
        {cargoDraft ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase tracking-wider opacity-75">
                {selectedCargoId ? 'Editando cargo' : 'Novo cargo'}
              </h4>
              <button
                onClick={() => {
                  setCargoDraft(null);
                  setSelectedCargoId(null);
                }}
                className="opacity-50 hover:opacity-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Título *</label>
                <input
                  type="text"
                  value={cargoDraft.titulo || ''}
                  onChange={e => setCargoDraft({ ...cargoDraft, titulo: e.target.value })}
                  className={`w-full text-xs px-3 py-2 rounded-lg border mt-1 ${inputBg}`}
                  placeholder="Ex.: Enfermeiro Esteta"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Setor</label>
                <input
                  type="text"
                  value={cargoDraft.setor || ''}
                  onChange={e => setCargoDraft({ ...cargoDraft, setor: e.target.value })}
                  className={`w-full text-xs px-3 py-2 rounded-lg border mt-1 ${inputBg}`}
                  placeholder="Ex.: Enfermagem"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">CBO</label>
                <input
                  type="text"
                  value={cargoDraft.cbo || ''}
                  onChange={e => setCargoDraft({ ...cargoDraft, cbo: e.target.value })}
                  className={`w-full text-xs px-3 py-2 rounded-lg border mt-1 ${inputBg}`}
                  placeholder="Ex.: 2235-05"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Faixa mín. (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={cargoDraft.faixa_salarial_min ?? ''}
                  onChange={e => setCargoDraft({ ...cargoDraft, faixa_salarial_min: e.target.value ? Number(e.target.value) : undefined })}
                  className={`w-full text-xs px-3 py-2 rounded-lg border mt-1 ${inputBg}`}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Faixa máx. (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={cargoDraft.faixa_salarial_max ?? ''}
                  onChange={e => setCargoDraft({ ...cargoDraft, faixa_salarial_max: e.target.value ? Number(e.target.value) : undefined })}
                  className={`w-full text-xs px-3 py-2 rounded-lg border mt-1 ${inputBg}`}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Descrição</label>
                <textarea
                  value={cargoDraft.descricao || ''}
                  onChange={e => setCargoDraft({ ...cargoDraft, descricao: e.target.value })}
                  rows={2}
                  className={`w-full text-xs px-3 py-2 rounded-lg border mt-1 ${inputBg}`}
                  placeholder="Resumo do papel..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Atribuições (uma por linha)</label>
                <textarea
                  value={(cargoDraft.atribuicoes || []).join('\n')}
                  onChange={e =>
                    setCargoDraft({
                      ...cargoDraft,
                      atribuicoes: e.target.value.split('\n').map(s => s.trim()).filter(Boolean)
                    })
                  }
                  rows={4}
                  className={`w-full text-xs px-3 py-2 rounded-lg border mt-1 ${inputBg}`}
                  placeholder={'Executar procedimentos estéticos\nAvaliar pacientes\nEmitir relatórios'}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Requisitos / Formação</label>
                <textarea
                  value={cargoDraft.requisitos || ''}
                  onChange={e => setCargoDraft({ ...cargoDraft, requisitos: e.target.value })}
                  rows={2}
                  className={`w-full text-xs px-3 py-2 rounded-lg border mt-1 ${inputBg}`}
                  placeholder="Ex.: Graduação em Enfermagem, COREN ativo, curso de estética..."
                />
              </div>

              <label className="md:col-span-2 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={cargoDraft.ativo ?? true}
                  onChange={e => setCargoDraft({ ...cargoDraft, ativo: e.target.checked })}
                />
                Cargo ativo (aparece nos seletores)
              </label>
            </div>

            <div className="flex flex-wrap gap-2 pt-3 border-t border-white/5">
              <button
                onClick={saveCargo}
                disabled={saving}
                className={`text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 ${btnPrimary} disabled:opacity-50`}
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Salvar
              </button>
              {selectedCargoId && (
                <button
                  onClick={() => deleteCargo(cargos.find(c => c.id === selectedCargoId)!)}
                  disabled={saving}
                  className="text-xs font-bold px-4 py-2 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 flex items-center gap-1.5"
                >
                  <Trash2 size={13} /> Excluir
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-xs opacity-50 italic">
            Selecione um cargo à esquerda ou clique em <strong>Novo</strong> para começar.
          </div>
        )}

        {/* ==================== TRILHAS ==================== */}
        <div className="pt-4 border-t border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold uppercase tracking-wider opacity-75 flex items-center gap-1.5">
              <GitBranch size={14} /> Trilhas de Carreira ({trilhas.length})
            </h4>
            <button
              onClick={startNewTrilha}
              className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg flex items-center gap-1 ${btnPrimary}`}
            >
              <Plus size={12} /> Nova Trilha
            </button>
          </div>

          {trilhaDraft && (
            <div className={`p-4 rounded-xl border space-y-3 ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                  {selectedTrilhaId ? 'Editando trilha' : 'Nova trilha'}
                </span>
                <button onClick={() => setTrilhaDraft(null)} className="opacity-50 hover:opacity-100">
                  <X size={14} />
                </button>
              </div>
              <input
                type="text"
                value={trilhaDraft.nome || ''}
                onChange={e => setTrilhaDraft({ ...trilhaDraft, nome: e.target.value })}
                placeholder="Nome da trilha (ex.: Trilha Enfermagem)"
                className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`}
              />
              <textarea
                value={trilhaDraft.descricao || ''}
                onChange={e => setTrilhaDraft({ ...trilhaDraft, descricao: e.target.value })}
                placeholder="Descrição opcional da trilha..."
                rows={2}
                className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`}
              />
              <button
                onClick={saveTrilha}
                disabled={saving}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${btnPrimary} disabled:opacity-50`}
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Salvar trilha
              </button>
            </div>
          )}

          <div className="space-y-3">
            {trilhas.length === 0 && !trilhaDraft && (
              <div className="text-xs italic opacity-50 py-4">Nenhuma trilha cadastrada.</div>
            )}
            {trilhas.map(t => {
              const isOpen = selectedTrilhaId === t.id;
              return (
                <div key={t.id} className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'border-white/10' : 'border-black/10'}`}>
                  <button
                    onClick={() => setSelectedTrilhaId(isOpen ? null : t.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                      isOpen
                        ? theme === 'dark' ? 'bg-white/5' : 'bg-black/5'
                        : theme === 'dark' ? 'hover:bg-white/[0.03]' : 'hover:bg-black/[0.03]'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{t.nome}</div>
                      {t.descricao && <div className="text-[10px] opacity-60">{t.descricao}</div>}
                    </div>
                    <div className="text-[10px] opacity-50 flex items-center gap-2">
                      {degraus.filter(d => d.trilha_id === t.id).length} degraus
                      <ChevronRight size={12} className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="p-4 space-y-3 border-t border-white/5">
                      {trilhaDegraus.length === 0 && (
                        <div className="text-xs italic opacity-50">Nenhum degrau adicionado.</div>
                      )}
                      {trilhaDegraus.map((d, idx) => {
                        const cargo = cargoById(d.cargo_id);
                        return (
                          <div key={d.id} className={`p-3 rounded-lg border ${theme === 'dark' ? 'border-white/10 bg-white/[0.02]' : 'border-black/10 bg-black/[0.02]'}`}>
                            <div className="flex items-start gap-2">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 ${theme === 'dark' ? 'bg-[#E5DFD3]/20 text-[#E5DFD3]' : 'bg-black/10 text-black'}`}>
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold">{cargo?.titulo || '(cargo removido)'}</div>
                                <div className="text-[10px] opacity-60">{cargo?.setor}</div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => moveDegrau(d, 'up')} disabled={idx === 0} className="p-1 rounded hover:bg-white/10 disabled:opacity-30" title="Subir">
                                  <ArrowUp size={12} />
                                </button>
                                <button onClick={() => moveDegrau(d, 'down')} disabled={idx === trilhaDegraus.length - 1} className="p-1 rounded hover:bg-white/10 disabled:opacity-30" title="Descer">
                                  <ArrowDown size={12} />
                                </button>
                                <button onClick={() => removeDegrau(d.id)} className="p-1 rounded hover:bg-rose-500/20 text-rose-500" title="Remover">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <div>
                                <label className="text-[9px] uppercase tracking-wider opacity-60">Tempo mín. (meses)</label>
                                <input
                                  type="number"
                                  defaultValue={d.requisito_tempo_meses ?? 12}
                                  onBlur={e => updateDegrauField(d.id, 'requisito_tempo_meses', Number(e.target.value) || 0)}
                                  className={`w-full text-xs px-2 py-1 rounded border ${inputBg}`}
                                />
                              </div>
                              <div>
                                <label className="text-[9px] uppercase tracking-wider opacity-60">Nota mín. (0-5)</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="5"
                                  defaultValue={d.requisito_nota_avaliacao ?? 4.0}
                                  onBlur={e => updateDegrauField(d.id, 'requisito_nota_avaliacao', Number(e.target.value) || 0)}
                                  className={`w-full text-xs px-2 py-1 rounded border ${inputBg}`}
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="text-[9px] uppercase tracking-wider opacity-60">Competências / formações exigidas</label>
                                <textarea
                                  defaultValue={d.competencias || ''}
                                  onBlur={e => updateDegrauField(d.id, 'competencias', e.target.value || null)}
                                  rows={2}
                                  className={`w-full text-xs px-2 py-1 rounded border ${inputBg}`}
                                  placeholder="Cursos, certificações, habilidades específicas..."
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Add degrau */}
                      <AddDegrauControl
                        cargos={cargos.filter(c => c.ativo && !trilhaDegraus.some(d => d.cargo_id === c.id))}
                        onAdd={cargoId => addDegrauToTrilha(t.id, cargoId)}
                        theme={theme}
                        inputBg={inputBg}
                        btnSecondary={btnSecondary}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddDegrauControl({
  cargos,
  onAdd,
  inputBg,
  btnSecondary
}: {
  cargos: Cargo[];
  onAdd: (cargoId: string) => void;
  theme: 'dark' | 'light';
  inputBg: string;
  btnSecondary: string;
}) {
  const [cargoId, setCargoId] = useState('');
  return (
    <div className="flex gap-2 items-center pt-2 border-t border-white/5">
      <select
        value={cargoId}
        onChange={e => setCargoId(e.target.value)}
        className={`flex-1 text-xs px-2 py-1.5 rounded border ${inputBg}`}
      >
        <option value="">Adicionar cargo à trilha…</option>
        {cargos.map(c => (
          <option key={c.id} value={c.id}>{c.titulo}</option>
        ))}
      </select>
      <button
        onClick={() => {
          if (cargoId) {
            onAdd(cargoId);
            setCargoId('');
          }
        }}
        disabled={!cargoId}
        className={`text-xs font-bold px-3 py-1.5 rounded border ${btnSecondary} disabled:opacity-40`}
      >
        <Plus size={12} className="inline mr-1" /> Adicionar
      </button>
    </div>
  );
}

// ============================================================================
// PROMOÇÕES
// ============================================================================

interface PromocoesViewProps {
  theme: 'dark' | 'light';
  promocoes: Promocao[];
  cargos: Cargo[];
  colaboradores: Colaborador[];
  userEmail: string;
  onChange: () => Promise<void>;
  setErrorMsg: (m: string) => void;
  setSuccessMsg: (m: string) => void;
  cardBg: string;
  inputBg: string;
  btnPrimary: string;
  btnSecondary: string;
}

function PromocoesView({
  theme,
  promocoes,
  cargos,
  colaboradores,
  userEmail,
  onChange,
  setErrorMsg,
  setSuccessMsg,
  cardBg,
  inputBg,
  btnPrimary,
  btnSecondary
}: PromocoesViewProps) {
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'todos' | PromocaoStatus>('todos');
  const [saving, setSaving] = useState(false);

  // Modal form
  const [formColabId, setFormColabId] = useState('');
  const [formCargoDestId, setFormCargoDestId] = useState('');
  const [formSalarioNovo, setFormSalarioNovo] = useState('');
  const [formMotivo, setFormMotivo] = useState('');

  const cargoById = (id?: string) => cargos.find(c => c.id === id);
  const colabById = (id?: string) => colaboradores.find(c => c.id === id);

  const filtered = useMemo(() => {
    if (statusFilter === 'todos') return promocoes;
    return promocoes.filter(p => p.status === statusFilter);
  }, [promocoes, statusFilter]);

  const countBy = (s: PromocaoStatus) => promocoes.filter(p => p.status === s).length;

  const resetForm = () => {
    setFormColabId('');
    setFormCargoDestId('');
    setFormSalarioNovo('');
    setFormMotivo('');
  };

  const proporPromocao = async () => {
    if (!formColabId || !formCargoDestId) {
      setErrorMsg('Selecione o colaborador e o cargo de destino.');
      return;
    }
    const colab = colabById(formColabId);
    const cargoDest = cargoById(formCargoDestId);
    if (!colab || !cargoDest) return;

    setSaving(true);
    try {
      // Match cargo de origem por título — colaboradores.cargo é text livre e
      // nem sempre coincide com um registro em cargos. Se não achar, salva só
      // o snapshot em cargo_origem_titulo e deixa cargo_origem_id NULL.
      const cargoOrigem = cargos.find(c => c.titulo === colab.cargo);

      const { error } = await supabase.from('promocoes').insert({
        colaborador_id: colab.id,
        cargo_origem_id: cargoOrigem?.id || null,
        cargo_destino_id: cargoDest.id,
        cargo_origem_titulo: colab.cargo || null,
        cargo_destino_titulo: cargoDest.titulo,
        salario_anterior: colab.salario || null,
        salario_novo: formSalarioNovo || null,
        motivo: formMotivo || null,
        proposto_por: userEmail,
        status: 'proposta'
      });
      if (error) throw error;
      setSuccessMsg('Proposta de promoção registrada.');
      resetForm();
      setShowModal(false);
      await onChange();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao propor promoção.');
    } finally {
      setSaving(false);
    }
  };

  const transicionar = async (p: Promocao, novoStatus: PromocaoStatus) => {
    setSaving(true);
    try {
      const patch: Partial<Promocao> = { status: novoStatus };
      if (novoStatus === 'aprovada') {
        patch.aprovado_por = userEmail;
      }
      if (novoStatus === 'efetivada') {
        // Efetivar = aplica a mudança no colaborador
        patch.data_efetivacao = new Date().toISOString().split('T')[0];
        const colab = colabById(p.colaborador_id);
        if (colab) {
          const cargoDestino = cargoById(p.cargo_destino_id);
          const colabUpdate: Record<string, any> = {
            cargo: p.cargo_destino_titulo
          };
          if (p.salario_novo) colabUpdate.salario = p.salario_novo;
          // O setor vem do catálogo do cargo de destino. Se o cargo não tiver
          // setor cadastrado, mantém o setor atual do colaborador em vez de
          // apagar — apagar aqui derrubaria filtros e relatórios que usam setor.
          if (cargoDestino?.setor) colabUpdate.setor = cargoDestino.setor;
          const upd = await supabase.from('colaboradores').update(colabUpdate).eq('id', colab.id);
          if (upd.error) throw upd.error;
        }
      }
      const { error } = await supabase.from('promocoes').update(patch).eq('id', p.id);
      if (error) throw error;
      setSuccessMsg(
        novoStatus === 'efetivada' ? 'Promoção efetivada — cargo e salário do colaborador atualizados.' :
        novoStatus === 'aprovada' ? 'Promoção aprovada.' :
        novoStatus === 'rejeitada' ? 'Promoção rejeitada.' : ''
      );
      await onChange();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha na transição de status.');
    } finally {
      setSaving(false);
    }
  };

  const excluirPromocao = async (p: Promocao) => {
    if (!confirm(`Excluir esta promoção de ${colabById(p.colaborador_id)?.nome}? Não é reversível.`)) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('promocoes').delete().eq('id', p.id);
      if (error) throw error;
      setSuccessMsg('Promoção excluída.');
      await onChange();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao excluir.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className={`p-5 rounded-2xl border ${cardBg} flex flex-col md:flex-row md:items-center md:justify-between gap-4`}>
        <div className="flex flex-wrap gap-2">
          {(['todos', 'proposta', 'aprovada', 'efetivada', 'rejeitada'] as const).map(s => {
            const count = s === 'todos' ? promocoes.length : countBy(s);
            const active = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase border transition-colors ${
                  active ? btnPrimary : btnSecondary
                }`}
              >
                {s === 'todos' ? 'Todos' : STATUS_LABEL[s]} ({count})
              </button>
            );
          })}
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className={`text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 ${btnPrimary}`}
        >
          <Plus size={13} /> Nova Proposta
        </button>
      </div>

      {/* List */}
      <div className={`p-5 rounded-2xl border ${cardBg}`}>
        {filtered.length === 0 ? (
          <div className="py-10 text-center opacity-50 italic text-xs">
            Nenhuma promoção {statusFilter !== 'todos' ? `com status "${STATUS_LABEL[statusFilter]}"` : 'registrada'}.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(p => {
              const colab = colabById(p.colaborador_id);
              return (
                <div key={p.id} className={`p-4 rounded-xl border ${theme === 'dark' ? 'border-white/10 bg-white/[0.02]' : 'border-black/10 bg-black/[0.02]'}`}>
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold tracking-wider border ${STATUS_STYLE[p.status]}`}>
                          {STATUS_LABEL[p.status]}
                        </span>
                        <span className="text-xs font-bold">{colab?.nome || '(colaborador removido)'}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs opacity-80">
                        <span>{p.cargo_origem_titulo || '—'}</span>
                        <ArrowRight size={12} className="opacity-50" />
                        <span className="font-bold">{p.cargo_destino_titulo}</span>
                      </div>
                      <div className="mt-1 text-[11px] opacity-60 space-x-3">
                        {p.salario_anterior && p.salario_novo && (
                          <span>{p.salario_anterior} → {p.salario_novo}</span>
                        )}
                        <span>Proposta em {new Date(p.data_proposta + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                        {p.data_efetivacao && (
                          <span>Efetivada em {new Date(p.data_efetivacao + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                        )}
                      </div>
                      {p.motivo && (
                        <div className="mt-2 text-[11px] opacity-70 italic border-l-2 border-white/10 pl-2">
                          {p.motivo}
                        </div>
                      )}
                      <div className="mt-2 text-[9px] opacity-40 space-x-3">
                        {p.proposto_por && <span>Proposto por: {p.proposto_por}</span>}
                        {p.aprovado_por && <span>Aprovado por: {p.aprovado_por}</span>}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {p.status === 'proposta' && (
                        <>
                          <button
                            onClick={() => transicionar(p, 'aprovada')}
                            disabled={saving}
                            className="text-[10px] font-bold px-3 py-1.5 rounded border border-sky-500/30 text-sky-500 hover:bg-sky-500/10 disabled:opacity-50"
                          >
                            Aprovar
                          </button>
                          <button
                            onClick={() => transicionar(p, 'rejeitada')}
                            disabled={saving}
                            className="text-[10px] font-bold px-3 py-1.5 rounded border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 disabled:opacity-50"
                          >
                            Rejeitar
                          </button>
                        </>
                      )}
                      {p.status === 'aprovada' && (
                        <>
                          <button
                            onClick={() => transicionar(p, 'efetivada')}
                            disabled={saving}
                            className="text-[10px] font-bold px-3 py-1.5 rounded border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 disabled:opacity-50"
                            title="Aplica a mudança de cargo e salário no colaborador"
                          >
                            Efetivar promoção
                          </button>
                          <button
                            onClick={() => transicionar(p, 'rejeitada')}
                            disabled={saving}
                            className="text-[10px] font-bold px-3 py-1.5 rounded border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 disabled:opacity-50"
                          >
                            Rejeitar
                          </button>
                        </>
                      )}
                      {(p.status === 'rejeitada' || p.status === 'efetivada') && (
                        <button
                          onClick={() => excluirPromocao(p)}
                          disabled={saving}
                          className="text-[10px] font-bold px-3 py-1.5 rounded border border-white/10 opacity-60 hover:opacity-100"
                        >
                          <Trash2 size={11} className="inline mr-1" /> Remover
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal — Nova Proposta */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setShowModal(false)} />
          <div className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-lg z-50 rounded-2xl border p-6 ${cardBg}`}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold uppercase tracking-wider">Propor promoção</h4>
              <button onClick={() => setShowModal(false)} className="opacity-60 hover:opacity-100">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Colaborador *</label>
                <select
                  value={formColabId}
                  onChange={e => setFormColabId(e.target.value)}
                  className={`w-full text-xs px-3 py-2 rounded-lg border mt-1 ${inputBg}`}
                >
                  <option value="">Selecione...</option>
                  {colaboradores.filter(c => c.status !== 'desligado').map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nome} — {c.cargo || 'sem cargo'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Cargo de destino *</label>
                <select
                  value={formCargoDestId}
                  onChange={e => setFormCargoDestId(e.target.value)}
                  className={`w-full text-xs px-3 py-2 rounded-lg border mt-1 ${inputBg}`}
                >
                  <option value="">Selecione...</option>
                  {cargos.filter(c => c.ativo).map(c => (
                    <option key={c.id} value={c.id}>{c.titulo}</option>
                  ))}
                </select>
                {formCargoDestId && (() => {
                  const cd = cargoById(formCargoDestId);
                  if (!cd?.faixa_salarial_min && !cd?.faixa_salarial_max) return null;
                  return (
                    <div className="text-[10px] opacity-60 mt-1">
                      Faixa salarial de referência: {formatMoney(cd.faixa_salarial_min)}
                      {cd.faixa_salarial_max ? ` – ${formatMoney(cd.faixa_salarial_max)}` : ''}
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Novo salário</label>
                <input
                  type="text"
                  value={formSalarioNovo}
                  onChange={e => setFormSalarioNovo(e.target.value)}
                  placeholder="Ex.: R$ 4.500,00"
                  className={`w-full text-xs px-3 py-2 rounded-lg border mt-1 ${inputBg}`}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Motivo / Justificativa</label>
                <textarea
                  value={formMotivo}
                  onChange={e => setFormMotivo(e.target.value)}
                  rows={3}
                  placeholder="Ex.: Cumpriu 24 meses no cargo com nota média 4.6, concluiu curso técnico exigido."
                  className={`w-full text-xs px-3 py-2 rounded-lg border mt-1 ${inputBg}`}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5 pt-4 border-t border-white/5">
              <button
                onClick={proporPromocao}
                disabled={saving}
                className={`text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 ${btnPrimary} disabled:opacity-50`}
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Registrar proposta
              </button>
              <button
                onClick={() => setShowModal(false)}
                className={`text-xs font-bold px-4 py-2 rounded-lg border ${btnSecondary}`}
              >
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
