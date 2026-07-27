import { useState, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import {
  Megaphone,
  Plus,
  Loader2,
  AlertTriangle,
  Save,
  Trash2,
  Pencil,
  X,
  Filter
} from 'lucide-react';

import {
  CATEGORIAS_ENDOMARKETING,
  COR_CATEGORIA,
  STATUS_LABEL_ENDOMARKETING as STATUS_LABEL,
  type AcaoEndomarketing,
  type CategoriaEndomarketing,
  type StatusEndomarketing
} from './constants';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/** 'AAAA-MM-DD' sem passar por Date — evita o -1 dia por fuso. */
const isoDoDia = (ano: number, mes: number, dia: number) =>
  `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

const fmtDiaCurto = (iso: string) => {
  const [, mm, dd] = iso.split('-');
  return `${dd}/${mm}`;
};

interface EndomarketingManagerProps {
  theme: 'dark' | 'light';
  userEmail: string;
  lista: AcaoEndomarketing[];
  carregando: boolean;
  /** Recarrega a lista no Dashboard — o calendário principal lê a mesma fonte. */
  onChange: () => void | Promise<void>;
}

// ---------------------------------------------------------------------------
// Seletor de dias avulsos: recebe as datas marcadas e devolve a lista nova.
// Responsabilidade única, por isso vive isolado do formulário.
// ---------------------------------------------------------------------------
function SeletorDias({
  theme,
  valor,
  onToggle
}: {
  theme: 'dark' | 'light';
  valor: string[];
  onToggle: (iso: string) => void;
}) {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());

  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();

  const celulas: (number | null)[] = [
    ...Array.from({ length: primeiroDiaSemana }, () => null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1)
  ];

  const irPara = (delta: number) => {
    const d = new Date(ano, mes + delta, 1);
    setMes(d.getMonth());
    setAno(d.getFullYear());
  };

  const btnNav = theme === 'dark'
    ? 'border-white/10 hover:bg-white/5'
    : 'border-black/10 hover:bg-black/5';

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => irPara(-1)}
          className={`px-2 py-1 rounded-lg border text-[11px] font-bold ${btnNav}`}
        >
          ◀
        </button>
        <span className="text-xs font-bold uppercase tracking-wider opacity-75">
          {MESES[mes]} {ano}
        </span>
        <button
          type="button"
          onClick={() => irPara(1)}
          className={`px-2 py-1 rounded-lg border text-[11px] font-bold ${btnNav}`}
        >
          ▶
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold uppercase tracking-wider opacity-50 mb-1">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <div key={`${d}-${i}`} className="py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {celulas.map((dia, idx) => {
          if (dia === null) {
            return <div key={`vazio-${idx}`} className="aspect-square" />;
          }
          const iso = isoDoDia(ano, mes, dia);
          const marcado = valor.includes(iso);
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onToggle(iso)}
              aria-pressed={marcado}
              className={`aspect-square rounded-lg border text-[11px] font-bold transition-all ${
                marcado
                  ? 'bg-brand border-transparent text-white'
                  : theme === 'dark'
                    ? 'border-white/5 bg-white/[0.02] hover:bg-white/10 text-white/80'
                    : 'border-black/5 bg-black/[0.01] hover:bg-black/5 text-black/80'
              }`}
            >
              {dia}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function EndomarketingManager({
  theme,
  userEmail,
  lista,
  carregando,
  onChange
}: EndomarketingManagerProps) {
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todas' | StatusEndomarketing>('todas');

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<CategoriaEndomarketing>('Campanha');
  const [status, setStatus] = useState<StatusEndomarketing>('planejada');
  const [responsavel, setResponsavel] = useState('');
  const [dias, setDias] = useState<string[]>([]);

  const cardBase = theme === 'dark'
    ? 'bg-surface-2 border-white/10'
    : 'bg-white border-black/10 shadow-sm';
  const inputBase = `w-full px-3 py-2 rounded-lg border text-xs outline-none transition-colors ${
    theme === 'dark'
      ? 'bg-white/5 border-white/10 focus:border-brand text-white'
      : 'bg-black/[0.02] border-black/10 focus:border-brand text-black'
  }`;

  const listaFiltrada = useMemo(
    () => (filtroStatus === 'todas' ? lista : lista.filter((a) => a.status === filtroStatus)),
    [lista, filtroStatus]
  );

  const limparForm = () => {
    setTitulo('');
    setDescricao('');
    setCategoria('Campanha');
    setStatus('planejada');
    setResponsavel('');
    setDias([]);
    setEditandoId(null);
    setErro('');
  };

  const abrirNova = () => {
    limparForm();
    setModalAberto(true);
  };

  const abrirEdicao = (acao: AcaoEndomarketing) => {
    setEditandoId(acao.id);
    setTitulo(acao.titulo);
    setDescricao(acao.descricao || '');
    setCategoria(acao.categoria);
    setStatus(acao.status);
    setResponsavel(acao.responsavel || '');
    setDias([...acao.dias].sort());
    setErro('');
    setModalAberto(true);
  };

  const alternarDia = (iso: string) => {
    setDias((prev) =>
      prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso].sort()
    );
  };

  const salvar = async () => {
    if (!titulo.trim()) {
      setErro('Dê um título para a ação.');
      return;
    }
    if (dias.length === 0) {
      setErro('Selecione ao menos um dia no calendário.');
      return;
    }

    setSalvando(true);
    setErro('');

    const payload = {
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      categoria,
      status,
      responsavel: responsavel.trim() || null,
      dias
    };

    const { error } = editandoId
      ? await supabase.from('acoes_endomarketing').update(payload).eq('id', editandoId)
      : await supabase
          .from('acoes_endomarketing')
          .insert({ ...payload, criado_por_email: userEmail || null });

    setSalvando(false);

    if (error) {
      setErro(`Não foi possível salvar: ${error.message}`);
      return;
    }

    setModalAberto(false);
    limparForm();
    await onChange();
  };

  const excluir = async (acao: AcaoEndomarketing) => {
    if (!confirm(`Excluir a ação "${acao.titulo}"? Isso remove os dias dela do calendário.`)) return;
    const { error } = await supabase.from('acoes_endomarketing').delete().eq('id', acao.id);
    if (error) {
      setErro(`Não foi possível excluir: ${error.message}`);
      return;
    }
    await onChange();
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Barra de ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter size={13} className="opacity-50" />
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as 'todas' | StatusEndomarketing)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold outline-none ${
              theme === 'dark' ? 'bg-surface-2 border-white/10' : 'bg-white border-black/10'
            }`}
          >
            <option value="todas">Todos os status</option>
            {(Object.keys(STATUS_LABEL) as StatusEndomarketing[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>

        <button
          onClick={abrirNova}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-white text-xs font-bold tracking-wide hover:opacity-90 transition-opacity"
        >
          <Plus size={14} /> Nova ação
        </button>
      </div>

      {erro && !modalAberto && (
        <div className="flex items-start gap-2 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>{erro}</span>
        </div>
      )}

      {/* Lista */}
      {carregando ? (
        <div className="py-12 flex items-center justify-center gap-2 opacity-60 text-xs">
          <Loader2 size={14} className="animate-spin" /> Carregando ações…
        </div>
      ) : listaFiltrada.length === 0 ? (
        <div className={`py-12 rounded-2xl border text-center ${cardBase}`}>
          <Megaphone size={22} className="mx-auto opacity-30 mb-3" />
          <p className="text-xs opacity-60">
            {lista.length === 0
              ? 'Nenhuma ação de endomarketing criada ainda.'
              : 'Nenhuma ação com esse status.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {listaFiltrada.map((acao) => (
            <div key={acao.id} className={`p-5 rounded-2xl border ${cardBase}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`w-2.5 h-2.5 rounded-full ${COR_CATEGORIA[acao.categoria]}`} />
                  <span className="text-[9px] font-extrabold uppercase tracking-wider opacity-70">
                    {acao.categoria}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider border ${
                    acao.status === 'concluida'
                      ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                      : acao.status === 'em_andamento'
                        ? 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                        : acao.status === 'cancelada'
                          ? 'border-rose-500/30 text-rose-400 bg-rose-500/10'
                          : 'border-sky-500/30 text-sky-400 bg-sky-500/10'
                  }`}>
                    {STATUS_LABEL[acao.status]}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => abrirEdicao(acao)}
                    title="Editar"
                    className={`p-1.5 rounded-lg border transition-colors ${
                      theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'
                    }`}
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => excluir(acao)}
                    title="Excluir"
                    className="p-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              <h5 className="text-sm font-bold mb-1">{acao.titulo}</h5>
              {acao.descricao && (
                <p className="text-[11px] opacity-70 leading-relaxed mb-3">{acao.descricao}</p>
              )}

              <div className="flex flex-wrap gap-1 mb-3">
                {[...acao.dias].sort().map((d) => (
                  <span
                    key={d}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      theme === 'dark' ? 'bg-white/5' : 'bg-black/5'
                    }`}
                  >
                    {fmtDiaCurto(d)}
                  </span>
                ))}
              </div>

              {acao.responsavel && (
                <p className="text-[10px] opacity-55">
                  Responsável: <strong>{acao.responsavel}</strong>
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border p-6 ${cardBase}`}>
            <div className="flex items-center justify-between mb-5">
              <h4 className="font-display text-lg font-semibold">
                {editandoId ? 'Editar ação' : 'Nova ação de endomarketing'}
              </h4>
              <button
                onClick={() => { setModalAberto(false); limparForm(); }}
                className={`p-1.5 rounded-lg border ${
                  theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'
                }`}
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Coluna de campos */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1.5">
                    Título *
                  </label>
                  <input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ex: Semana da Saúde"
                    className={inputBase}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1.5">
                    Descrição
                  </label>
                  <textarea
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows={3}
                    placeholder="O que é a ação e o que o time precisa saber."
                    className={`${inputBase} resize-none`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1.5">
                      Categoria
                    </label>
                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value as CategoriaEndomarketing)}
                      className={inputBase}
                    >
                      {CATEGORIAS_ENDOMARKETING.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1.5">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as StatusEndomarketing)}
                      className={inputBase}
                    >
                      {(Object.keys(STATUS_LABEL) as StatusEndomarketing[]).map((s) => (
                        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1.5">
                    Responsável
                  </label>
                  <input
                    value={responsavel}
                    onChange={(e) => setResponsavel(e.target.value)}
                    placeholder="Quem conduz a ação"
                    className={inputBase}
                  />
                </div>
              </div>

              {/* Coluna do seletor de dias */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1.5">
                  Dias da ação *
                </label>
                <div className={`p-4 rounded-xl border ${
                  theme === 'dark' ? 'border-white/10 bg-white/[0.02]' : 'border-black/10 bg-black/[0.01]'
                }`}>
                  <SeletorDias theme={theme} valor={dias} onToggle={alternarDia} />
                </div>

                <div className="mt-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1.5">
                    {dias.length === 0 ? 'Nenhum dia selecionado' : `${dias.length} dia(s) selecionado(s)`}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {dias.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => alternarDia(d)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-brand/15 text-brand text-[10px] font-mono font-bold hover:bg-brand/25 transition-colors"
                      >
                        {fmtDiaCurto(d)} <X size={9} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {erro && (
              <div className="mt-5 flex items-start gap-2 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{erro}</span>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => { setModalAberto(false); limparForm(); }}
                className={`px-4 py-2 rounded-lg border text-xs font-bold ${
                  theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-white text-xs font-bold disabled:opacity-50"
              >
                {salvando ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {salvando ? 'Salvando…' : 'Salvar ação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
