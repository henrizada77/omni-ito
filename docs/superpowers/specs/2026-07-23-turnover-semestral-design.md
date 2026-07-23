# Design — Turnover semestral + histórico de movimentação

**Data:** 2026-07-23 · **Branch:** feature/rh-modulos · **Status:** aprovado pelo usuário

## Problema

`TurnoverPanel.tsx` hoje calcula `turnoverGeral = desligados / ativos × 100` a partir de `colaboradores` (snapshot atual, sem janela temporal). Não reflete rotatividade por período. O usuário quer **turnover semestral** (fórmula clássica RH) e forneceu a planilha `Colaboradores - admitidos e demitidos 01.2026 a 07.2026.xls` com o histórico de movimentação de 2026, que não está no banco.

## Decisões (aprovadas)

1. **Fórmula clássica RH:** `((admissões + demissões) / 2) / efetivo médio × 100`, por semestre (S1 = jan–jun, S2 = jul–dez).
2. **Destino dos dados:** tabela nova `movimentacoes_pessoal` (não polui `colaboradores`/headcount/clima). Seed da planilha.
3. **Exibição:** KPI do semestre corrente + gráfico de barras da evolução entre semestres.
4. **Efetivo médio** do semestre = `(H_início + H_fim) / 2` (aproximação declarada).
5. **Headcount numa data** = ativos de `colaboradores` ∪ `movimentacoes_pessoal`, **dedupe por CPF** (só dígitos) — evita contar 2x quem está nas duas fontes.

## Bloco 1 — Tabela + seed (`supabase/sprint29_movimentacoes_pessoal.sql`, manual no SQL Editor)

```sql
create table if not exists public.movimentacoes_pessoal (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf text,
  cargo text,
  setor text,
  data_admissao date not null,
  data_demissao date,            -- null = ativo
  tipo_desligamento text,        -- null: planilha não traz motivo
  origem text not null default 'planilha_2026',
  criado_em timestamptz not null default timezone('utc', now())
);
alter table public.movimentacoes_pessoal enable row level security;
-- leitura para autenticados (padrão dos analytics); escrita restrita ao RH.
```

Seed idempotente (28 linhas). Mapa cargo→setor aprovado:

| cargo (planilha) | setor |
|---|---|
| COORDENADOR FINANCEIRO, GERENTE ADMINISTRATIVO E FINANCEIRO, ANALISTA DE COMPRAS | Financeiro |
| ASSISTENTE ADMINISTRATIVO, ANALISTA ADMINISTRATIVO, SECRETARIO (A) EXECUTIVO, ESTAGIARIO(A) | Administrativo |
| SERVICOS GERAIS / SERVICOS GERAIS II | Serviços Gerais |
| BIOMEDICO (A) | Biomedicina |
| RECEPCIONISTA | Recepção |
| SDR | Smartshape |
| ESTOQUISTA DE FARMÁCIA | Farmácia |

Ativos (data_demissao null): NAYARA COSTA ARAUJO FONTES, CALLY HAVENA SALES DA CRUZ, LEONARDO JOSE DA SILVA TORRES, THIAGO HENRIQUE DA SILVA, SOFIA SABINO MEDEIROS DE LIMA, RAFAELA ARAUJO SILVA, LUANA KELLY DA SILVA BRANDÃO, EWELLYN VITORIA SILVA FONSECA, DANIELE MARIA DOS SANTOS, JOELMA BASTOS CORDEIRO (admissões fev–jul/2026).

Demitidos (18): admissão 2023–2026, demissão jan–jul/2026 — inclui alta rotatividade de Assistente Administrativo no 1º semestre. Valores completos (CPF/datas) vão no plano de implementação.

## Bloco 2 — Helper puro (`src/utils/turnover.ts`)

- `type Semestre = { ano: number; s: 1 | 2; label: string; inicio: string; fim: string }`.
- `cpfDigits(cpf)` → só dígitos.
- `listarSemestres(dataMin: string, hoje: string): Semestre[]` — do semestre da menor data de movimento até o semestre corrente.
- `headcountEm(dataISO, colaboradores, movimentacoes): number` — conta CPFs distintos ativos na data. Ativo em `colaboradores`: `data_admissao <= D && (status !== 'desligado' || !data_desligamento || data_desligamento > D)`. Ativo em `movimentacoes`: `data_admissao <= D && (!data_demissao || data_demissao > D)`. União dedupe por CPF (registros sem CPF contam como identidade própria).
- `turnoverSemestre(sem, colaboradores, movimentacoes)` → `{ admissoes, demissoes, efetivoMedio, taxa }`. `admissoes`/`demissoes` = movimentos com data dentro de `[inicio, fim]` (de ambas as fontes, dedupe por CPF+tipo-de-evento). `efetivoMedio = (headcountEm(inicio) + headcountEm(fim)) / 2`. `taxa = efetivoMedio > 0 ? ((admissoes+demissoes)/2)/efetivoMedio*100 : 0`.

## Bloco 3 — `TurnoverPanel.tsx`

- Nova prop `movimentacoesList: any[]`.
- KPI "Turnover Geral (Acumulado)" → **"Turnover Semestral"** do semestre corrente, sub-linha `adm X · dem Y · efetivo médio Z`.
- Novo **BarChart** "Evolução do turnover por semestre" (taxa % por semestre, do helper).
- Donut voluntário/involuntário e barra por setor **inalterados** (leem `colaboradores`; planilha não tem motivo). Escopo enxuto.

## Bloco 4 — `Dashboard.tsx`

- Estado `movimentacoesList` + query `supabase.from('movimentacoes_pessoal').select('*')` no `Promise.all` do `fetchColaboradoresList`.
- Passa `movimentacoesList` ao `<TurnoverPanel>`.

## Fora de escopo

Classificar voluntário/involuntário dos históricos (planilha não traz); reconstrução exata de headcount dia a dia; editar movimentações pela UI (só seed SQL nesta rodada); turnover de setor por período.

## Ressalvas declaradas

Efetivo médio por (início+fim)/2; dedupe por CPF (conflito de status entre fontes resolvido como "ativo se qualquer fonte disser ativo na data"); semestre corrente incompleto aparece como barra parcial.

## Verificação

`npx tsc --noEmit -p tsconfig.app.json` (exit 0) + conferência manual: S1 2026 deve mostrar taxa alta (churn de assistentes); barra de evolução com S1/S2 2026; KPI bate com `adm`/`dem` contados na planilha.
