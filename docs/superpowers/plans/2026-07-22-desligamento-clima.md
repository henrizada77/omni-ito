# Desligamento Completo + Clima & Indicadores — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fluxo de desligamento com prazos legais automáticos + entrevista de saída, e painel de clima (média mensal, categorias, absenteísmo).

**Architecture:** Estender o drawer de desligamento existente no `Dashboard.tsx` com cálculo de aviso prévio (helper puro) gravado numa tabela nova `desligamentos`; entrevista e alerta de rescisão leem dessa tabela. Clima é um novo painel de Analytics (`ClimaPanel.tsx`) 100% derivado de dados já carregados.

**Tech Stack:** React + TypeScript (Vite), Supabase (Postgres + RLS), recharts, lucide-react, Tailwind inline.

## Global Constraints

- Spec de referência: `docs/superpowers/specs/2026-07-22-desligamento-clima-design.md`. Em conflito entre plano e spec, o spec vence.
- Sem framework de teste no repo: verificação = `npx tsc --noEmit` (deve sair 0) + fluxo manual descrito na Task 7.
- SQL **não** é aplicado pelo MCP (aponta para outro projeto!). Todo `.sql` é entregue como arquivo em `supabase/` para o usuário rodar no SQL Editor do projeto `jyvxhyaeagqljvqqeuwi`.
- Domínios exatos: `tipo` ∈ `sem_justa_causa | pedido_demissao`; `modalidade_aviso` ∈ `trabalhado | indenizado_ou_dispensado`.
- Compat legado: continuar gravando `colaboradores.tipo_desligamento` = `Voluntario` (pedido) / `Involuntario` (sem justa causa) — TurnoverPanel depende disso.
- Estilo: seguir os padrões visuais do Dashboard (ternários de `theme`, classes existentes); mensagens de erro via `notify('… ' + err.message)`.
- Commits pequenos por task, mensagens em pt-BR (`feat:`/`fix:`), rodapé `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Helper puro de prazos — `src/utils/desligamento.ts`

**Files:**
- Create: `src/utils/desligamento.ts`

**Interfaces:**
- Produces: `calcularPrazosDesligamento(tipo, modalidade, dataComunicacao, dataAdmissao)` → `{ diasAviso: number; dataTermino: string; dataLimitePagamento: string }` (datas `YYYY-MM-DD`); tipos `TipoDesligamento`, `ModalidadeAviso`. Consumido nas Tasks 3 e 4.

- [ ] **Step 1: Criar o arquivo com o código completo**

```ts
// Prazos legais de desligamento.
// Aviso prévio proporcional (Lei 12.506/2011): 30 dias + 3 por ano completo
// de casa, teto 90 — só quando o empregador desliga sem justa causa. No
// pedido de demissão o aviso é do empregado: 30 dias fixos.
// Pagamento das verbas: até 10 dias corridos do término do contrato
// (CLT art. 477, §6º).

export type TipoDesligamento = 'sem_justa_causa' | 'pedido_demissao';
export type ModalidadeAviso = 'trabalhado' | 'indenizado_ou_dispensado';

export interface PrazosDesligamento {
  diasAviso: number;
  dataTermino: string;
  dataLimitePagamento: string;
}

const addDaysISO = (iso: string, days: number): string => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export const anosCompletos = (dataAdmissao: string, dataRef: string): number => {
  const adm = new Date(dataAdmissao + 'T12:00:00');
  const ref = new Date(dataRef + 'T12:00:00');
  if (isNaN(adm.getTime()) || isNaN(ref.getTime())) return 0;
  let anos = ref.getFullYear() - adm.getFullYear();
  const aniv = new Date(adm);
  aniv.setFullYear(adm.getFullYear() + anos);
  if (aniv > ref) anos -= 1;
  return Math.max(0, anos);
};

export const calcularPrazosDesligamento = (
  tipo: TipoDesligamento,
  modalidade: ModalidadeAviso,
  dataComunicacao: string,
  dataAdmissao: string | null | undefined
): PrazosDesligamento => {
  const anos = dataAdmissao ? anosCompletos(dataAdmissao, dataComunicacao) : 0;
  const diasAviso = tipo === 'sem_justa_causa' ? Math.min(30 + 3 * anos, 90) : 30;
  const dataTermino =
    modalidade === 'trabalhado' ? addDaysISO(dataComunicacao, diasAviso) : dataComunicacao;
  const dataLimitePagamento = addDaysISO(dataTermino, 10);
  return { diasAviso, dataTermino, dataLimitePagamento };
};
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit` · Expected: exit 0, sem erros.

- [ ] **Step 3: Sanity check manual das contas (ler e conferir)**

Admissão 2023-04-15, comunicação 2026-07-22, sem justa causa → 3 anos completos → aviso 39; trabalhado → término 2026-08-30, pagamento 2026-09-09; indenizado → término 2026-07-22, pagamento 2026-08-01. Pedido de demissão → sempre 30 dias.

- [ ] **Step 4: Commit**

```bash
git add src/utils/desligamento.ts
git commit -m "feat: helper de prazos de desligamento (aviso proporcional + CLT 477)"
```

---

### Task 2: Migração `supabase/sprint28_desligamentos.sql`

**Files:**
- Create: `supabase/sprint28_desligamentos.sql`

**Interfaces:**
- Produces: tabela `public.desligamentos` com as colunas do spec — consumida pelas Tasks 3–5 via `supabase.from('desligamentos')`.

- [ ] **Step 1: Criar o arquivo**

```sql
-- ----------------------------------------------------------------------------
-- SPRINT 28 — DESLIGAMENTO COMPLETO (prazos + entrevista de saída)
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente.
-- Leitura E escrita restritas ao RH (entrevista de saída é dado sensível —
-- exceção deliberada ao padrão de leitura ampla do app).
-- ----------------------------------------------------------------------------

create table if not exists public.desligamentos (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null unique references public.colaboradores(id) on delete cascade,
  tipo text not null constraint check_deslig_tipo
    check (tipo in ('sem_justa_causa', 'pedido_demissao')),
  modalidade_aviso text not null constraint check_deslig_modalidade
    check (modalidade_aviso in ('trabalhado', 'indenizado_ou_dispensado')),
  data_comunicacao date not null,
  dias_aviso integer not null,
  data_termino date not null,
  data_limite_pagamento date not null,
  pagamento_efetuado_em date,
  observacoes text,
  entrevista_realizada_em timestamptz,
  entrevista_motivo_real text,
  entrevista_pontos_positivos text,
  entrevista_pontos_melhorar text,
  entrevista_recomendaria smallint
    constraint check_deslig_recomendaria check (entrevista_recomendaria between 0 and 10),
  entrevista_comentarios text,
  criado_em timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_desligamentos_pagamento
  on public.desligamentos (data_limite_pagamento) where pagamento_efetuado_em is null;

alter table public.desligamentos enable row level security;

drop policy if exists "Desligamentos restritos ao RH" on public.desligamentos;
create policy "Desligamentos restritos ao RH"
  on public.desligamentos for all
  to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com')
  with check (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 2: Commit**

```bash
git add supabase/sprint28_desligamentos.sql
git commit -m "feat: sprint28 - tabela desligamentos (prazos + entrevista, RLS restrita ao RH)"
```

- [ ] **Step 3: Avisar o usuário** para rodar o arquivo no SQL Editor do projeto real ANTES de testar as Tasks 3–5 no app.

---

### Task 3: Fluxo de desligar com prazos (Dashboard.tsx)

**Files:**
- Modify: `src/pages/private/Dashboard.tsx` — estados ~linha 359-361; handler `handleOffboardColaborador` ~1705-1755; form do drawer ~5958-6018.

**Interfaces:**
- Consumes: `calcularPrazosDesligamento` (Task 1); tabela `desligamentos` (Task 2).
- Produces: estado `desligamentosList: any[]` + `fetchDesligamentos()` reutilizados nas Tasks 4 e 5; insert em `desligamentos` no confirmar.

- [ ] **Step 1: Trocar o estado do tipo e adicionar modalidade + lista** (substituir a linha do `offboardType`, mantendo `offboardDate`/`offboardReason`)

```ts
const [offboardTipo, setOffboardTipo] = useState<'sem_justa_causa' | 'pedido_demissao'>('sem_justa_causa');
const [offboardModalidade, setOffboardModalidade] = useState<'trabalhado' | 'indenizado_ou_dispensado'>('indenizado_ou_dispensado');
const [desligamentosList, setDesligamentosList] = useState<any[]>([]);
```

Import no topo do arquivo: `import { calcularPrazosDesligamento } from '../../utils/desligamento';`

Remover o estado antigo `offboardType` e substituir TODAS as referências (linhas ~1710, ~1730, ~1746, ~5979-5986) conforme os passos abaixo — `npx tsc --noEmit` acusa qualquer sobra.

- [ ] **Step 2: Carregar a lista de desligamentos** — dentro de `fetchColaboradoresList` (Promise.all ~linha 1466), adicionar a query e o set:

```ts
// no Promise.all, acrescentar:
supabase.from('desligamentos').select('*').order('data_limite_pagamento')
// e após os outros sets:
if (desligRes.data) setDesligamentosList(desligRes.data);
```

(nomear o novo resultado `desligRes` na desestruturação do Promise.all)

- [ ] **Step 3: Reescrever o miolo do `handleOffboardColaborador`** — antes do update, calcular prazos; depois do update de `colaboradores`, inserir em `desligamentos`:

```ts
const prazos = calcularPrazosDesligamento(
  offboardTipo, offboardModalidade, offboardDate,
  activeColaboradorForDrawer.data_admissao
);
const updateData = {
  status: 'desligado',
  tipo_desligamento: offboardTipo === 'pedido_demissao' ? 'Voluntario' : 'Involuntario',
  data_desligamento: prazos.dataTermino,
  motivo_desligamento: offboardReason.trim() || null
};
// ... update em colaboradores como hoje (checando error) ...
const { error: desligError } = await supabase.from('desligamentos').insert({
  colaborador_id: activeColaboradorForDrawer.id,
  tipo: offboardTipo,
  modalidade_aviso: offboardModalidade,
  data_comunicacao: offboardDate,
  dias_aviso: prazos.diasAviso,
  data_termino: prazos.dataTermino,
  data_limite_pagamento: prazos.dataLimitePagamento,
  observacoes: offboardReason.trim() || null
});
if (desligError) notify('Colaborador desligado, mas falhou o registro de prazos: ' + desligError.message);
await logAuditoria('DESLIGAMENTO_COLABORADOR', {
  colaborador_id: activeColaboradorForDrawer.id,
  nome: activeColaboradorForDrawer.nome,
  tipo: offboardTipo,
  modalidade: offboardModalidade,
  data_comunicacao: offboardDate,
  data_termino: prazos.dataTermino,
  data_limite_pagamento: prazos.dataLimitePagamento
});
```

Sem rollback se o insert falhar (decisão do spec): notifica e segue. Ao final, chamar `fetchColaboradoresList()` (recarrega colaboradores e desligamentos).

- [ ] **Step 4: Form do drawer** — trocar o `<select>` de tipo e acrescentar modalidade + preview (mesmas classes do form atual). Label da data vira "Data da Comunicação *":

```tsx
<select value={offboardTipo} onChange={e => setOffboardTipo(e.target.value as any)} className={`w-full p-2.5 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'}`}>
  <option value="sem_justa_causa">Sem justa causa (empresa desliga)</option>
  <option value="pedido_demissao">Pedido de demissão (colaborador sai)</option>
</select>
<select value={offboardModalidade} onChange={e => setOffboardModalidade(e.target.value as any)} className={`w-full p-2.5 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'}`}>
  <option value="indenizado_ou_dispensado">Aviso indenizado / dispensado</option>
  <option value="trabalhado">Aviso trabalhado</option>
</select>
{offboardDate && (() => {
  const p = calcularPrazosDesligamento(offboardTipo, offboardModalidade, offboardDate, activeColaboradorForDrawer?.data_admissao);
  const fmt = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR');
  return (
    <div className={`p-3 rounded-lg border text-[10px] space-y-1 ${theme === 'dark' ? 'bg-amber-500/8 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
      <p><b>Aviso prévio:</b> {p.diasAviso} dias</p>
      <p><b>Término do contrato:</b> {fmt(p.dataTermino)}</p>
      <p><b>Pagamento das verbas até:</b> {fmt(p.dataLimitePagamento)} (CLT 477 §6º)</p>
    </div>
  );
})()}
```

- [ ] **Step 5: Verificar** — `npx tsc --noEmit` → exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/pages/private/Dashboard.tsx
git commit -m "feat: desligamento com tipo/modalidade e prazos automaticos (aviso + CLT 477)"
```

---

### Task 4: Alerta "Rescisões a Pagar" no Dashboard

**Files:**
- Modify: `src/pages/private/Dashboard.tsx` — inserir card logo após o bloco "Em Férias Agora" (~linha 2754).

**Interfaces:**
- Consumes: `desligamentosList`, `colaboradoresList`, `fetchColaboradoresList()` (Task 3).

- [ ] **Step 1: Inserir o card** (mesmo padrão visual do "Em Férias Agora", accent rose):

```tsx
{/* ── Rescisões a Pagar ── */}
{(() => {
  const pendentes = desligamentosList.filter((d: any) => d && !d.pagamento_efetuado_em);
  if (pendentes.length === 0) return null;
  const hoje = new Date().toISOString().split('T')[0];
  return (
    <div className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'border-rose-500/15 bg-[#111110]' : 'border-rose-200 bg-white'}`}>
      <div className={`px-5 py-3.5 border-b flex items-center justify-between ${theme === 'dark' ? 'bg-rose-500/8 border-rose-500/15' : 'bg-rose-50 border-rose-200'}`}>
        <span className="text-[10px] font-black tracking-[0.15em] uppercase text-rose-400">💸 Rescisões a Pagar</span>
        <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full ${theme === 'dark' ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-100 text-rose-600'}`}>{pendentes.length}</span>
      </div>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {pendentes.map((d: any) => {
          const col = colaboradoresList.find((c: any) => c.id === d.colaborador_id);
          const vencido = d.data_limite_pagamento < hoje;
          return (
            <div key={d.id} className={`p-3 rounded-xl border text-xs ${theme === 'dark' ? 'bg-rose-500/8 border-rose-500/15' : 'bg-rose-50 border-rose-100'}`}>
              <p className="font-semibold truncate">{col?.nome || 'Colaborador'}</p>
              <p className={`font-mono text-[9px] mt-1 ${vencido ? 'text-rose-500 font-black' : (theme === 'dark' ? 'text-rose-300' : 'text-rose-600')}`}>
                {vencido ? '⚠ VENCIDO — ' : 'pagar até '}{new Date(d.data_limite_pagamento + 'T12:00:00').toLocaleDateString('pt-BR')}
              </p>
              <button
                onClick={async () => {
                  const { error } = await supabase.from('desligamentos')
                    .update({ pagamento_efetuado_em: new Date().toISOString().split('T')[0] })
                    .eq('id', d.id);
                  if (error) { notify('Erro ao marcar pagamento: ' + error.message); return; }
                  await logAuditoria('RESCISAO_PAGAMENTO_MARCADO', { desligamento_id: d.id, colaborador_id: d.colaborador_id });
                  fetchColaboradoresList();
                }}
                className={`mt-2 w-full py-1.5 rounded-lg text-[9px] font-bold tracking-widest uppercase border transition-colors ${theme === 'dark' ? 'border-rose-500/25 text-rose-300 hover:bg-rose-500/10' : 'border-rose-300 text-rose-600 hover:bg-rose-50'}`}
              >✓ Marcar pago</button>
            </div>
          );
        })}
      </div>
    </div>
  );
})()}
```

- [ ] **Step 2: Verificar** — `npx tsc --noEmit` → exit 0.
- [ ] **Step 3: Commit** — `git commit -m "feat: alerta de rescisoes a pagar no dashboard"` (com `git add src/pages/private/Dashboard.tsx`).

---

### Task 5: Entrevista de desligamento no drawer

**Files:**
- Modify: `src/pages/private/Dashboard.tsx` — estados junto aos de offboard (~359); seção no drawer do desligado, logo após o bloco que mostra `data_desligamento`/`motivo_desligamento` (~5944-5955).

**Interfaces:**
- Consumes: `desligamentosList`, `fetchColaboradoresList()` (Task 3).

- [ ] **Step 1: Estados do form**

```ts
const [entrevistaDraft, setEntrevistaDraft] = useState({ motivo_real: 'Remuneração', motivo_texto: '', pontos_positivos: '', pontos_melhorar: '', recomendaria: '7', comentarios: '' });
const [isSavingEntrevista, setIsSavingEntrevista] = useState(false);
```

- [ ] **Step 2: Seção no drawer** (renderiza só quando `activeColaboradorForDrawer?.status === 'desligado'`):

```tsx
{(() => {
  const deslig = desligamentosList.find((d: any) => d.colaborador_id === activeColaboradorForDrawer.id);
  if (!deslig) return null;
  if (deslig.entrevista_realizada_em) {
    return (
      <div className={`p-4 rounded-xl border space-y-2 text-xs ${theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-black/5 border-black/10'}`}>
        <h5 className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">✓ Entrevista de Desligamento — {new Date(deslig.entrevista_realizada_em).toLocaleDateString('pt-BR')}</h5>
        <p><b>Motivo real:</b> {deslig.entrevista_motivo_real || '—'}</p>
        <p><b>Pontos positivos:</b> {deslig.entrevista_pontos_positivos || '—'}</p>
        <p><b>A melhorar:</b> {deslig.entrevista_pontos_melhorar || '—'}</p>
        <p><b>Recomendaria (0–10):</b> {deslig.entrevista_recomendaria ?? '—'}</p>
        {deslig.entrevista_comentarios && <p className="italic opacity-80">"{deslig.entrevista_comentarios}"</p>}
      </div>
    );
  }
  return (
    <div className={`p-4 rounded-xl border space-y-3 ${theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-black/5 border-black/10'}`}>
      <h5 className="text-[10px] font-bold uppercase tracking-wider text-amber-500">🗒 Entrevista de Desligamento — pendente</h5>
      <div className="space-y-2 text-xs">
        <select value={entrevistaDraft.motivo_real} onChange={e => setEntrevistaDraft(p => ({ ...p, motivo_real: e.target.value }))} className={`w-full p-2.5 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'}`}>
          {['Remuneração', 'Liderança', 'Carreira', 'Clima', 'Pessoal', 'Outro'].map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <input placeholder="Detalhe do motivo (opcional)" value={entrevistaDraft.motivo_texto} onChange={e => setEntrevistaDraft(p => ({ ...p, motivo_texto: e.target.value }))} className={`w-full p-2.5 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'}`} />
        <textarea rows={2} placeholder="O que funcionou bem?" value={entrevistaDraft.pontos_positivos} onChange={e => setEntrevistaDraft(p => ({ ...p, pontos_positivos: e.target.value }))} className={`w-full p-2.5 rounded border bg-transparent resize-none ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'}`} />
        <textarea rows={2} placeholder="O que a clínica pode melhorar?" value={entrevistaDraft.pontos_melhorar} onChange={e => setEntrevistaDraft(p => ({ ...p, pontos_melhorar: e.target.value }))} className={`w-full p-2.5 rounded border bg-transparent resize-none ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'}`} />
        <div>
          <label className="block text-[9px] font-bold uppercase opacity-65 mb-1">Recomendaria trabalhar aqui? (0–10)</label>
          <input type="number" min={0} max={10} value={entrevistaDraft.recomendaria} onChange={e => setEntrevistaDraft(p => ({ ...p, recomendaria: e.target.value }))} className={`w-full p-2.5 rounded border bg-transparent ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'}`} />
        </div>
        <textarea rows={2} placeholder="Comentários finais (opcional)" value={entrevistaDraft.comentarios} onChange={e => setEntrevistaDraft(p => ({ ...p, comentarios: e.target.value }))} className={`w-full p-2.5 rounded border bg-transparent resize-none ${theme === 'dark' ? 'border-white/10 text-white bg-[#0D0D0C]' : 'border-black/10 text-black bg-white'}`} />
        <button
          disabled={isSavingEntrevista}
          onClick={async () => {
            setIsSavingEntrevista(true);
            try {
              const nota = parseInt(entrevistaDraft.recomendaria, 10);
              const { error } = await supabase.from('desligamentos').update({
                entrevista_realizada_em: new Date().toISOString(),
                entrevista_motivo_real: entrevistaDraft.motivo_texto.trim() ? `${entrevistaDraft.motivo_real} — ${entrevistaDraft.motivo_texto.trim()}` : entrevistaDraft.motivo_real,
                entrevista_pontos_positivos: entrevistaDraft.pontos_positivos.trim() || null,
                entrevista_pontos_melhorar: entrevistaDraft.pontos_melhorar.trim() || null,
                entrevista_recomendaria: isNaN(nota) ? null : Math.max(0, Math.min(10, nota)),
                entrevista_comentarios: entrevistaDraft.comentarios.trim() || null
              }).eq('id', deslig.id);
              if (error) throw error;
              await logAuditoria('ENTREVISTA_DESLIGAMENTO_REGISTRADA', { desligamento_id: deslig.id, colaborador_id: deslig.colaborador_id });
              notify('Entrevista registrada.');
              fetchColaboradoresList();
            } catch (err: any) { notify('Erro ao salvar entrevista: ' + err.message); }
            finally { setIsSavingEntrevista(false); }
          }}
          className="w-full py-2 rounded-lg font-bold text-xs bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >{isSavingEntrevista ? 'Salvando…' : '✓ Registrar Entrevista'}</button>
      </div>
    </div>
  );
})()}
```

- [ ] **Step 3: Verificar** — `npx tsc --noEmit` → exit 0.
- [ ] **Step 4: Commit** — `git commit -m "feat: entrevista de desligamento no drawer (form interno do RH)"`.

---

### Task 6: `ClimaPanel.tsx` + sub-tab "Clima"

**Files:**
- Create: `src/components/analytics/ClimaPanel.tsx`
- Modify: `src/pages/private/Dashboard.tsx` — union do `analyticsSubTab` (~1628), array de tabs (~4330-4336), render (~4406).

**Interfaces:**
- Consumes: estados existentes `pesquisasSatisfacao`, `ocorrenciasAnalytics`, `colaboradoresList`, `theme`.

- [ ] **Step 1: Criar `ClimaPanel.tsx`** (padrão dos painéis irmãos — default export, props tipadas):

```tsx
import { Smile, CalendarX } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface ClimaPanelProps {
  theme: 'dark' | 'light';
  pesquisasList: any[];      // pesquisas_satisfacao: { nota, categoria, criado_em }
  ocorrenciasList: any[];    // ocorrencias_jornada: { tipo, data_ocorrencia }
  colaboradoresList: any[];
}

const mesKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const mesLabel = (key: string) => {
  const [y, m] = key.split('-');
  return `${['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][parseInt(m, 10) - 1]}/${y.slice(2)}`;
};
const ultimosMeses = (n: number): string[] => {
  const out: string[] = [];
  const base = new Date();
  for (let i = n - 1; i >= 0; i--) out.push(mesKey(new Date(base.getFullYear(), base.getMonth() - i, 1)));
  return out;
};
const diasUteis = (key: string): number => {
  const [y, m] = key.split('-').map(Number);
  let count = 0;
  const d = new Date(y, m - 1, 1);
  while (d.getMonth() === m - 1) {
    if (d.getDay() !== 0 && d.getDay() !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
};

export default function ClimaPanel({ theme, pesquisasList, ocorrenciasList, colaboradoresList }: ClimaPanelProps) {
  const notas = pesquisasList.filter(p => p && typeof p.nota === 'number');
  const media = (arr: any[]) => arr.length ? arr.reduce((s, p) => s + p.nota, 0) / arr.length : null;

  const mediaGeral = media(notas);
  const mesAtual = mesKey(new Date());
  const mesAnterior = ultimosMeses(2)[0];
  const notasDoMes = (key: string) => notas.filter(p => mesKey(new Date(p.criado_em)) === key);
  const mediaMesAtual = media(notasDoMes(mesAtual));
  const mediaMesAnterior = media(notasDoMes(mesAnterior));
  const tendencia = mediaMesAtual !== null && mediaMesAnterior !== null ? mediaMesAtual - mediaMesAnterior : null;

  const linhaMensal = ultimosMeses(12).map(key => ({
    mes: mesLabel(key),
    media: media(notasDoMes(key)) !== null ? Number(media(notasDoMes(key))!.toFixed(2)) : null
  }));

  const categorias = ['Geral', 'Ambiente', 'Liderança', 'Benefícios', 'Carreira', 'Comunicação'];
  const barrasCategoria = categorias
    .map(cat => ({ categoria: cat, media: media(notas.filter(p => p.categoria === cat)) }))
    .filter(c => c.media !== null)
    .map(c => ({ ...c, media: Number((c.media as number).toFixed(2)) }));

  const headcount = colaboradoresList.filter(c => c && c.status !== 'desligado').length;
  const FALTAS_JUST = 'Falta Justificada (Atestado)';
  const FALTAS_INJUST = 'Falta Injustificada';
  const absenteismo = ultimosMeses(6).map(key => {
    const noMes = ocorrenciasList.filter(o => o && o.data_ocorrencia && o.data_ocorrencia.slice(0, 7) === key);
    const just = noMes.filter(o => o.tipo === FALTAS_JUST).length;
    const injust = noMes.filter(o => o.tipo === FALTAS_INJUST).length;
    const base = diasUteis(key) * Math.max(headcount, 1);
    return {
      mes: mesLabel(key),
      Justificadas: just,
      Injustificadas: injust,
      taxa: Number((((just + injust) / base) * 100).toFixed(2))
    };
  });
  const atrasosPeriodo = ocorrenciasList.filter(o =>
    o && ['Atraso', 'Saída Antecipada'].includes(o.tipo) &&
    o.data_ocorrencia && ultimosMeses(6).includes(o.data_ocorrencia.slice(0, 7))
  ).length;
  const taxaMesAtual = absenteismo[absenteismo.length - 1]?.taxa ?? 0;

  const cardCls = `p-5 rounded-xl border ${theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-white border-black/10 shadow-sm'}`;
  const axisColor = theme === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cardCls}>
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-45 flex items-center gap-1"><Smile size={11} /> Média Geral</span>
          <span className="text-3xl font-black font-mono block mt-2">{mediaGeral !== null ? mediaGeral.toFixed(2) : '—'}<span className="text-sm opacity-40">/5</span></span>
        </div>
        <div className={cardCls}>
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-45">Média do Mês</span>
          <span className="text-3xl font-black font-mono block mt-2">
            {mediaMesAtual !== null ? mediaMesAtual.toFixed(2) : '—'}
            {tendencia !== null && <span className={`text-sm ml-2 ${tendencia >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{tendencia >= 0 ? '▲' : '▼'} {Math.abs(tendencia).toFixed(2)}</span>}
          </span>
        </div>
        <div className={cardCls}>
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-45">Respostas</span>
          <span className="text-3xl font-black font-mono block mt-2">{notas.length}</span>
        </div>
        <div className={cardCls}>
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-45 flex items-center gap-1"><CalendarX size={11} /> Absenteísmo (mês)</span>
          <span className={`text-3xl font-black font-mono block mt-2 ${taxaMesAtual > 3 ? 'text-amber-500' : 'text-emerald-500'}`}>{taxaMesAtual}%</span>
        </div>
      </div>

      <div className={cardCls}>
        <h4 className="text-xs font-bold uppercase tracking-wider opacity-60 mb-4">Evolução da Satisfação — 12 meses</h4>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={linhaMensal}>
            <XAxis dataKey="mes" tick={{ fontSize: 10, fill: axisColor }} />
            <YAxis domain={[1, 5]} tick={{ fontSize: 10, fill: axisColor }} />
            <Tooltip />
            <Line type="monotone" dataKey="media" stroke="#10b981" strokeWidth={2} connectNulls={false} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={cardCls}>
          <h4 className="text-xs font-bold uppercase tracking-wider opacity-60 mb-4">Média por Categoria</h4>
          {barrasCategoria.length === 0 ? <p className="text-xs opacity-50 italic py-6 text-center">Sem respostas ainda.</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barrasCategoria} layout="vertical">
                <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 10, fill: axisColor }} />
                <YAxis type="category" dataKey="categoria" width={90} tick={{ fontSize: 10, fill: axisColor }} />
                <Tooltip />
                <Bar dataKey="media" fill="#38bdf8" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className={cardCls}>
          <h4 className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Absenteísmo — faltas por mês (6 meses)</h4>
          <p className="text-[9px] opacity-45 mb-3">Taxa = faltas ÷ (dias úteis × {headcount} colaboradores). Atrasos + saídas antecipadas no período: <b>{atrasosPeriodo}</b> (fora do índice).</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={absenteismo}>
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: axisColor }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: axisColor }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Justificadas" stackId="f" fill="#38bdf8" />
              <Bar dataKey="Injustificadas" stackId="f" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Ligar no Dashboard** — (a) union: `'geral' | 'turnover' | 'saude' | 'compensacao' | 'juridico' | 'clima'`; (b) tabs: acrescentar `{ key: 'clima', label: 'Clima & Frequência' }`; (c) import `ClimaPanel from '../../components/analytics/ClimaPanel';` e render após o bloco do turnover:

```tsx
{analyticsSubTab === 'clima' && (
  <ClimaPanel
    theme={theme}
    pesquisasList={pesquisasSatisfacao}
    ocorrenciasList={ocorrenciasAnalytics}
    colaboradoresList={colaboradoresList}
  />
)}
```

- [ ] **Step 3: Verificar** — `npx tsc --noEmit` → exit 0.
- [ ] **Step 4: Commit** — `git add src/components/analytics/ClimaPanel.tsx src/pages/private/Dashboard.tsx` + `git commit -m "feat: painel Clima & Frequencia (evolucao mensal, categorias, absenteismo)"`.

---

### Task 7: Verificação manual de ponta a ponta

- [ ] **Step 1:** Confirmar com o usuário que `sprint28_desligamentos.sql` foi rodado no SQL Editor do projeto real.
- [ ] **Step 2:** `npx tsc --noEmit` limpo; subir o preview (launch.json/dev server) logado como RH.
- [ ] **Step 3:** Desligar um colaborador de teste: conferir preview de datas nos 2 tipos × 2 modalidades (proporcionalidade: >1 ano de casa muda os dias no sem justa causa; pedido fica 30).
- [ ] **Step 4:** Card "Rescisões a Pagar" aparece no Dashboard; "Marcar pago" o remove; log de auditoria criado.
- [ ] **Step 5:** Drawer do desligado mostra entrevista "pendente"; preencher; vira bloco somente leitura.
- [ ] **Step 6:** Sub-tab "Clima & Frequência": renderiza com dados reais e não quebra com base vazia (médias "—", gráficos vazios).
- [ ] **Step 7:** Reportar resultados ao usuário (incluindo o que ficou pendente de rodar no SQL Editor).
