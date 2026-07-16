-- ----------------------------------------------------------------------------
-- SPRINT 12 — COLUNAS DE VENCIMENTO (ASO E FÉRIAS) EM colaboradores
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente.
--
-- PROBLEMA
-- O frontend usa `data_aso_vencimento` e `data_ferias_vencimento` em vários
-- pontos (Dashboard.tsx:1505-1506, 1689-1690, 4022-4032, 4231-4270, 5049-5050,
-- e a agregação da Agenda RH em 1917-1964). O tipo TS em src/types/index.ts:74
-- também declara ambos. Mas o schema em `supabase_setup.sql` nunca criou essas
-- colunas — o select devolve undefined, o quadro "Eventos prestes a vencer" da
-- Agenda RH fica vazio e o update do painel "Férias & ASO" falha em silêncio.
--
-- DEPOIS DESTE SCRIPT
-- Ambas as colunas existem como `date null`. Nenhuma linha é alterada — o RH
-- preenche caso a caso pelo painel "Férias & ASO" (Dashboard.tsx:4266) e a
-- Agenda RH passa a mostrar os pontos coloridos e os cards de detalhe.
-- ----------------------------------------------------------------------------

alter table public.colaboradores
  add column if not exists data_aso_vencimento date;

alter table public.colaboradores
  add column if not exists data_ferias_vencimento date;

comment on column public.colaboradores.data_aso_vencimento is
  'Data em que o Atestado de Saúde Ocupacional (ASO) vence. Preenchido pelo RH.';
comment on column public.colaboradores.data_ferias_vencimento is
  'Limite legal para saída em férias (data_admissao + 12 meses, ajustado por período aquisitivo). Preenchido pelo RH.';

-- Sem esta linha, o cache do PostgREST continua sem saber das colunas e o
-- select via supabase-js devolve erro "column ... does not exist" mesmo após o
-- alter table rodar.
notify pgrst, 'reload schema';
