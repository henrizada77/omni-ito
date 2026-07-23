# Turnover Semestral + Movimentação de Pessoal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turnover calculado por semestre (fórmula clássica RH) usando um log de movimentação de pessoal seedado da planilha 2026, com KPI do semestre atual + gráfico de evolução.

**Architecture:** Nova tabela `movimentacoes_pessoal` (seed SQL manual). Helper puro `src/utils/turnover.ts` calcula headcount e turnover por semestre a partir de `colaboradores` ∪ `movimentacoes_pessoal` (dedupe por CPF). `TurnoverPanel.tsx` troca o KPI acumulado por semestral + barras de evolução.

**Tech Stack:** React + TypeScript (Vite), Supabase (Postgres + RLS), recharts, lucide-react.

## Global Constraints

- SQL **não** é aplicado por MCP (conta ligada aponta para outro projeto). Todo `.sql` é arquivo em `supabase/` para o usuário rodar no SQL Editor do projeto real (`jyvxhyaeagqljvqqeuwi`).
- Sem framework de teste: verificação = `npx tsc --noEmit -p tsconfig.app.json` (deve sair 0). Plain `tsc --noEmit` é NO-OP aqui (tsconfig raiz solution-style).
- Fórmula: `taxa = efetivoMedio > 0 ? ((admissoes+demissoes)/2)/efetivoMedio*100 : 0`. Semestre: S1 = jan–jun, S2 = jul–dez.
- Efetivo médio = `(headcountEm(inicio) + headcountEm(fim)) / 2`.
- Dedupe sempre por CPF só-dígitos; registro sem CPF conta como identidade própria.
- Não alterar o donut voluntário/involuntário nem a barra por setor (leem `colaboradores`).
- Commits pt-BR (`feat:`), rodapé `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Migração + seed `supabase/sprint29_movimentacoes_pessoal.sql`

**Files:**
- Create: `supabase/sprint29_movimentacoes_pessoal.sql`

**Interfaces:**
- Produces: tabela `public.movimentacoes_pessoal` — consumida pelas Tasks 2–4 via `supabase.from('movimentacoes_pessoal')`.

- [ ] **Step 1: Criar o arquivo** (DDL + seed idempotente das 28 linhas)

```sql
-- ----------------------------------------------------------------------------
-- SPRINT 29 — MOVIMENTAÇÃO DE PESSOAL (histórico p/ turnover semestral)
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente.
-- Seed = planilha "Colaboradores - admitidos e demitidos 01.2026 a 07.2026".
-- ----------------------------------------------------------------------------

create table if not exists public.movimentacoes_pessoal (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf text,
  cargo text,
  setor text,
  data_admissao date not null,
  data_demissao date,
  tipo_desligamento text,
  origem text not null default 'planilha_2026',
  criado_em timestamptz not null default timezone('utc', now())
);

create index if not exists idx_movimentacoes_admissao on public.movimentacoes_pessoal (data_admissao);
create index if not exists idx_movimentacoes_demissao on public.movimentacoes_pessoal (data_demissao);

alter table public.movimentacoes_pessoal enable row level security;

drop policy if exists "Leitura de movimentacoes para autenticados" on public.movimentacoes_pessoal;
create policy "Leitura de movimentacoes para autenticados"
  on public.movimentacoes_pessoal for select to authenticated using (true);

drop policy if exists "Escrita de movimentacoes restrita ao RH" on public.movimentacoes_pessoal;
create policy "Escrita de movimentacoes restrita ao RH"
  on public.movimentacoes_pessoal for all to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com')
  with check (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

-- Seed idempotente: limpa só o lote da planilha e reinsere.
delete from public.movimentacoes_pessoal where origem = 'planilha_2026';

insert into public.movimentacoes_pessoal (nome, cpf, cargo, setor, data_admissao, data_demissao) values
  -- ATIVOS (data_demissao null)
  ('NAYARA COSTA ARAUJO FONTES', '06617399455', 'COORDENADOR FINANCEIRO', 'Financeiro', '2026-02-02', null),
  ('CALLY HAVENA SALES DA CRUZ', '13740764490', 'ASSISTENTE ADMINISTRATIVO', 'Administrativo', '2026-03-23', null),
  ('LEONARDO JOSE DA SILVA TORRES', '70528510401', 'SERVICOS GERAIS II', 'Serviços Gerais', '2026-05-12', null),
  ('THIAGO HENRIQUE DA SILVA', '11880109484', 'ESTAGIARIO(A)', 'Administrativo', '2026-05-11', null),
  ('SOFIA SABINO MEDEIROS DE LIMA', '11362662402', 'BIOMEDICO (A)', 'Biomedicina', '2026-06-03', null),
  ('RAFAELA ARAUJO SILVA', '06478674436', 'SECRETARIO (A) EXECUTIVO', 'Administrativo', '2026-06-15', null),
  ('LUANA KELLY DA SILVA BRANDÃO', '11473111455', 'SDR', 'Smartshape', '2026-06-15', null),
  ('EWELLYN VITORIA SILVA FONSECA', '11444094467', 'RECEPCIONISTA', 'Recepção', '2026-06-30', null),
  ('DANIELE MARIA DOS SANTOS', '06726087403', 'ESTOQUISTA DE FARMÁCIA', 'Farmácia', '2026-07-13', null),
  ('JOELMA BASTOS CORDEIRO', '04556890403', 'SERVICOS GERAIS', 'Serviços Gerais', '2026-07-17', null),
  -- DEMITIDOS (data_admissao / data_demissao)
  ('LUCIANO SILVA NEGRAO', '04598139439', 'GERENTE ADMINISTRATIVO E FINANCEIRO', 'Financeiro', '2023-08-18', '2026-01-12'),
  ('DAYANA VASCONCELOS DE MELO', '14041976480', 'SERVICOS GERAIS', 'Serviços Gerais', '2024-04-15', '2026-07-15'),
  ('EDUARDO AFONSO SOTERO SALGUEIRO FEITOSA', '11317100450', 'SERVICOS GERAIS', 'Serviços Gerais', '2025-02-07', '2026-04-08'),
  ('GEORGE WILLIAM GOMES COELHO', '10733597432', 'ASSISTENTE ADMINISTRATIVO', 'Administrativo', '2025-03-11', '2026-02-19'),
  ('ESTER CAVALCANTI DA SILVA', '09125275445', 'ASSISTENTE ADMINISTRATIVO', 'Administrativo', '2025-08-11', '2026-01-12'),
  ('ADRYELLE CRISTINA DA SILVA', '11853763489', 'SERVICOS GERAIS', 'Serviços Gerais', '2025-10-20', '2026-05-22'),
  ('BRUNA LUIZA LEE DE DOS SANTOS SILVA', '09218015486', 'ASSISTENTE ADMINISTRATIVO', 'Administrativo', '2026-01-13', '2026-01-19'),
  ('CICERO FRANCISCO DOS SANTOS POSSIDONIO', '09188857441', 'ANALISTA ADMINISTRATIVO', 'Administrativo', '2026-01-14', '2026-03-23'),
  ('YASMIN KAROLLINE VIEIRA GALDINO', '11420915460', 'ASSISTENTE ADMINISTRATIVO', 'Administrativo', '2026-01-26', '2026-01-28'),
  ('TAIS LANE DOS SANTOS', '08606263427', 'ASSISTENTE ADMINISTRATIVO', 'Administrativo', '2026-01-29', '2026-02-03'),
  ('MARTA EDUARDA DE LIMA CARDOSO', '12625374446', 'ASSISTENTE ADMINISTRATIVO', 'Administrativo', '2026-02-10', '2026-03-09'),
  ('DAYANE MARIA BEZERRA DA SILVA', '08102989459', 'ASSISTENTE ADMINISTRATIVO', 'Administrativo', '2026-02-10', '2026-02-24'),
  ('KALLINE CRISTINA SILVA BERNARDO', '11951114442', 'ASSISTENTE ADMINISTRATIVO', 'Administrativo', '2026-02-27', '2026-03-02'),
  ('YURY KARLLA FREITAS BARBOSA RODRIGUES', '11350688444', 'ASSISTENTE ADMINISTRATIVO', 'Administrativo', '2026-03-18', '2026-06-15'),
  ('ANDRESSA DA SILVA', '08468808490', 'ANALISTA ADMINISTRATIVO', 'Administrativo', '2026-03-30', '2026-04-15'),
  ('GABRIEL LOPES ALVARES', '62384423363', 'ESTAGIARIO(A)', 'Administrativo', '2026-04-15', '2026-05-11'),
  ('ANDRESSA FERREIRA DA SILVA', '09813000490', 'ASSISTENTE ADMINISTRATIVO', 'Administrativo', '2026-04-30', '2026-06-15'),
  ('EVANDRO LOPES DA SILVA', '08455480424', 'ANALISTA DE COMPRAS', 'Financeiro', '2026-06-15', '2026-07-14');

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 2: Commit**

```bash
git add supabase/sprint29_movimentacoes_pessoal.sql
git commit -m "feat: sprint29 - movimentacoes_pessoal (seed planilha 2026)"
```

- [ ] **Step 3: Avisar o usuário** para rodar o arquivo no SQL Editor do projeto real ANTES de testar as Tasks 3–4 no app.

---

### Task 2: Helper puro `src/utils/turnover.ts`

**Files:**
- Create: `src/utils/turnover.ts`

**Interfaces:**
- Produces:
  - `cpfDigits(cpf: string | null | undefined): string`
  - `type Semestre = { ano: number; s: 1 | 2; label: string; inicio: string; fim: string }`
  - `listarSemestres(dataMinISO: string, hojeISO: string): Semestre[]`
  - `headcountEm(dataISO: string, colaboradores: any[], movimentacoes: any[]): number`
  - `turnoverSemestre(sem: Semestre, colaboradores: any[], movimentacoes: any[]): { admissoes: number; demissoes: number; efetivoMedio: number; taxa: number }`
  - Consumido pela Task 3.

- [ ] **Step 1: Criar o arquivo com o código completo**

```ts
// Turnover semestral (fórmula clássica RH). Puro, sem I/O.
// Fontes: colaboradores (snapshot) + movimentacoes_pessoal (log da planilha).
// Dedupe sempre por CPF (só dígitos) para não contar a mesma pessoa 2x.

export type Semestre = { ano: number; s: 1 | 2; label: string; inicio: string; fim: string };

export const cpfDigits = (cpf: string | null | undefined): string =>
  (cpf ?? '').replace(/\D/g, '');

// Identidade de uma pessoa para dedupe: CPF-dígitos, ou uma chave própria
// quando não há CPF (nunca colide com um CPF real).
const identidade = (reg: any, fallbackPrefix: string, idx: number): string => {
  const c = cpfDigits(reg?.cpf);
  return c !== '' ? c : `${fallbackPrefix}:${reg?.nome ?? ''}:${idx}`;
};

const semestreDeData = (iso: string): { ano: number; s: 1 | 2 } => {
  const ano = Number(iso.slice(0, 4));
  const mes = Number(iso.slice(5, 7));
  return { ano, s: mes <= 6 ? 1 : 2 };
};

const boundsSemestre = (ano: number, s: 1 | 2): { inicio: string; fim: string } =>
  s === 1
    ? { inicio: `${ano}-01-01`, fim: `${ano}-06-30` }
    : { inicio: `${ano}-07-01`, fim: `${ano}-12-31` };

export const listarSemestres = (dataMinISO: string, hojeISO: string): Semestre[] => {
  const min = semestreDeData(dataMinISO);
  const cur = semestreDeData(hojeISO);
  const out: Semestre[] = [];
  let ano = min.ano;
  let s: 1 | 2 = min.s;
  while (ano < cur.ano || (ano === cur.ano && s <= cur.s)) {
    const b = boundsSemestre(ano, s);
    out.push({ ano, s, label: `S${s} ${ano}`, inicio: b.inicio, fim: b.fim });
    if (s === 1) { s = 2; } else { s = 1; ano += 1; }
  }
  return out;
};

// Ativo numa data D:
//  colaboradores: admitido <= D e (não desligado ou desligado depois de D)
//  movimentacoes: admitido <= D e (sem demissão ou demissão depois de D)
export const headcountEm = (dataISO: string, colaboradores: any[], movimentacoes: any[]): number => {
  const ativos = new Set<string>();
  colaboradores.forEach((c, i) => {
    if (!c || !c.data_admissao) return;
    const adm = String(c.data_admissao).slice(0, 10);
    if (adm > dataISO) return;
    const deslig = c.data_desligamento ? String(c.data_desligamento).slice(0, 10) : null;
    const saiu = c.status === 'desligado' && deslig && deslig <= dataISO;
    if (!saiu) ativos.add(identidade(c, 'colab', i));
  });
  movimentacoes.forEach((m, i) => {
    if (!m || !m.data_admissao) return;
    const adm = String(m.data_admissao).slice(0, 10);
    if (adm > dataISO) return;
    const dem = m.data_demissao ? String(m.data_demissao).slice(0, 10) : null;
    if (!dem || dem > dataISO) ativos.add(identidade(m, 'mov', i));
  });
  return ativos.size;
};

// Admissões/demissões no intervalo [inicio, fim], dedupe por identidade+evento.
const contarEventos = (
  colaboradores: any[], movimentacoes: any[], inicio: string, fim: string
): { admissoes: number; demissoes: number } => {
  const adm = new Set<string>();
  const dem = new Set<string>();
  const push = (reg: any, prefix: string, idx: number) => {
    if (!reg) return;
    const id = identidade(reg, prefix, idx);
    const a = reg.data_admissao ? String(reg.data_admissao).slice(0, 10) : null;
    if (a && a >= inicio && a <= fim) adm.add(id);
    const dField = reg.data_demissao ?? reg.data_desligamento ?? null;
    const d = dField ? String(dField).slice(0, 10) : null;
    const isDeslig = reg.data_demissao != null || reg.status === 'desligado';
    if (isDeslig && d && d >= inicio && d <= fim) dem.add(id);
  };
  colaboradores.forEach((c, i) => push(c, 'colab', i));
  movimentacoes.forEach((m, i) => push(m, 'mov', i));
  return { admissoes: adm.size, demissoes: dem.size };
};

export const turnoverSemestre = (
  sem: Semestre, colaboradores: any[], movimentacoes: any[]
): { admissoes: number; demissoes: number; efetivoMedio: number; taxa: number } => {
  const { admissoes, demissoes } = contarEventos(colaboradores, movimentacoes, sem.inicio, sem.fim);
  const hIni = headcountEm(sem.inicio, colaboradores, movimentacoes);
  const hFim = headcountEm(sem.fim, colaboradores, movimentacoes);
  const efetivoMedio = (hIni + hFim) / 2;
  const taxa = efetivoMedio > 0 ? ((admissoes + demissoes) / 2) / efetivoMedio * 100 : 0;
  return { admissoes, demissoes, efetivoMedio, taxa };
};
```

- [ ] **Step 2: Verificar tipos** — `npx tsc --noEmit -p tsconfig.app.json` → exit 0.

- [ ] **Step 3: Sanity check manual (ler e conferir)** — com a seed da planilha, `turnoverSemestre` para S1 2026 (`inicio 2026-01-01`, `fim 2026-06-30`) deve contar ~20 admissões e ~16 demissões (churn de assistentes); a taxa fica alta. S2 2026 (parcial) tem menos.

- [ ] **Step 4: Commit**

```bash
git add src/utils/turnover.ts
git commit -m "feat: helper de turnover semestral (headcount + taxa por semestre)"
```

---

### Task 3: `TurnoverPanel.tsx` — KPI semestral + evolução

**Files:**
- Modify: `src/components/analytics/TurnoverPanel.tsx` (interface props ~19-22; KPI "Turnover Geral" ~78-86; adicionar BarChart de evolução na grade de charts ~111).

**Interfaces:**
- Consumes: `listarSemestres`, `turnoverSemestre`, `Semestre` (Task 2); nova prop `movimentacoesList`.

- [ ] **Step 1: Import + prop** — no topo do arquivo, após os imports de recharts. NÃO importar `LineChart`/`Line` (o BarChart já está importado e `noUnusedLocals` quebra import não usado):

```ts
import { listarSemestres, turnoverSemestre } from '../../utils/turnover';
```

Interface:

```ts
interface TurnoverPanelProps {
  theme: 'dark' | 'light';
  colaboradoresList: any[];
  movimentacoesList: any[];
}
export default function TurnoverPanel({ theme, colaboradoresList, movimentacoesList }: TurnoverPanelProps) {
```

- [ ] **Step 2: Cálculo dos semestres** — logo no início do componente, após as linhas de `activeColabs`/`desligados` existentes:

```ts
  // Turnover semestral (helper puro). Menor data de movimento define o início.
  const todasDatas: string[] = [];
  colaboradoresList.forEach((c: any) => { if (c?.data_admissao) todasDatas.push(String(c.data_admissao).slice(0,10)); });
  movimentacoesList.forEach((m: any) => { if (m?.data_admissao) todasDatas.push(String(m.data_admissao).slice(0,10)); });
  const hojeISO = new Date().toISOString().slice(0, 10);
  const dataMin = todasDatas.length ? todasDatas.reduce((a, b) => (a < b ? a : b)) : hojeISO;
  const semestres = listarSemestres(dataMin, hojeISO);
  const evolucao = semestres.map((sem) => {
    const t = turnoverSemestre(sem, colaboradoresList, movimentacoesList);
    return { semestre: sem.label, taxa: Number(t.taxa.toFixed(1)), adm: t.admissoes, dem: t.demissoes, efetivo: Number(t.efetivoMedio.toFixed(1)) };
  });
  const semestreAtual = evolucao[evolucao.length - 1] ?? { semestre: '—', taxa: 0, adm: 0, dem: 0, efetivo: 0 };
```

- [ ] **Step 3: Trocar o KPI "Turnover Geral (Acumulado)"** — substituir o conteúdo do primeiro card (linhas ~81-85) por:

```tsx
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-50">Turnover Semestral ({semestreAtual.semestre})</span>
          <div>
            <span className="text-3xl font-extrabold font-mono leading-none">{semestreAtual.taxa}%</span>
            <span className="text-[9px] opacity-60 block mt-1">adm {semestreAtual.adm} · dem {semestreAtual.dem} · efetivo médio {semestreAtual.efetivo}</span>
          </div>
```

- [ ] **Step 4: Adicionar BarChart de evolução** — inserir um novo card no início da grade de charts (logo após `<div className="grid grid-cols-1 lg:grid-cols-3 gap-5">`, como primeiro filho de largura total). Envolver a grade existente ou adicionar acima dela um bloco:

```tsx
      <div className={`p-5 rounded-xl border space-y-4 ${theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.01] border-black/5'}`}>
        <div className="pb-2 border-b border-white/5">
          <h4 className="text-xs font-bold uppercase tracking-wider opacity-65">Evolução do Turnover por Semestre</h4>
        </div>
        <div className="h-48 text-[10px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={evolucao} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
              <XAxis dataKey="semestre" stroke="currentColor" opacity={0.4} tickLine={false} />
              <YAxis stroke="currentColor" opacity={0.4} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                formatter={(value: any, _n: any, p: any) => [`${value}%`, 'Turnover', `adm ${p.payload.adm} · dem ${p.payload.dem} · efetivo ${p.payload.efetivo}`]}
                contentStyle={{ backgroundColor: theme === 'dark' ? '#181816' : '#ffffff', borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', color: theme === 'dark' ? '#E5DFD3' : '#0A0A0A', fontSize: '11px', borderRadius: '8px' }}
              />
              <Bar dataKey="taxa" fill={theme === 'dark' ? '#E5DFD3' : '#0A0A0A'} radius={[4, 4, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
```

(Se `LineChart`/`Line` não forem usados, não importar — manter só `BarChart`, já presente. Ajustar o import do Step 1 conforme o que de fato usar.)

- [ ] **Step 5: Verificar** — `npx tsc --noEmit -p tsconfig.app.json` → exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/analytics/TurnoverPanel.tsx
git commit -m "feat: turnover semestral no painel (KPI do semestre + evolucao)"
```

---

### Task 4: Wire no `Dashboard.tsx`

**Files:**
- Modify: `src/pages/private/Dashboard.tsx` — estado novo; query no `Promise.all` de `fetchColaboradoresList` (~1466-1493); prop no `<TurnoverPanel>` (buscar `analyticsSubTab === 'turnover'`, ~4406-4413).

**Interfaces:**
- Consumes: tabela `movimentacoes_pessoal` (Task 1); prop de `TurnoverPanel` (Task 3).

- [ ] **Step 1: Estado** — junto aos outros estados de analytics/listas (ex.: perto de `desligamentosList`):

```ts
const [movimentacoesList, setMovimentacoesList] = useState<any[]>([]);
```

- [ ] **Step 2: Query no Promise.all** — em `fetchColaboradoresList`, acrescentar à desestruturação e ao array do `Promise.all`:

```ts
supabase.from('movimentacoes_pessoal').select('*')
```

nomeando o resultado `movRes`; e após os outros sets:

```ts
if (movRes.data) setMovimentacoesList(movRes.data);
```

- [ ] **Step 3: Passar a prop** — no bloco `{analyticsSubTab === 'turnover' && ( <TurnoverPanel ... /> )}`, adicionar `movimentacoesList={movimentacoesList}`:

```tsx
<TurnoverPanel theme={theme} colaboradoresList={colaboradoresList} movimentacoesList={movimentacoesList} />
```

- [ ] **Step 4: Verificar** — `npx tsc --noEmit -p tsconfig.app.json` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/pages/private/Dashboard.tsx
git commit -m "feat: carrega movimentacoes_pessoal e passa ao TurnoverPanel"
```

---

### Task 5: Verificação manual de ponta a ponta

- [ ] **Step 1:** Confirmar com o usuário que `sprint29_movimentacoes_pessoal.sql` foi rodado no SQL Editor do projeto real.
- [ ] **Step 2:** `npx tsc --noEmit -p tsconfig.app.json` limpo; subir o preview logado como RH; abrir Analytics → Turnover.
- [ ] **Step 3:** KPI "Turnover Semestral (S2 2026)" aparece com adm/dem/efetivo; barra de evolução mostra S1 2026 (taxa alta pelo churn) e S2 2026 (parcial).
- [ ] **Step 4:** Conferir que o donut voluntário/involuntário e a barra por setor continuam funcionando (inalterados).
- [ ] **Step 5:** Sanidade dos números: S1 2026 ≈ 20 adm / 16 dem; taxa coerente com efetivo médio ~faixa 25–40.
- [ ] **Step 6:** Reportar resultados ao usuário (incluindo o SQL pendente, se aplicável).
