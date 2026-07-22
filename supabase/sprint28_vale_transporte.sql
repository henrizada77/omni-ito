-- ----------------------------------------------------------------------------
-- SPRINT 28 — VALE-TRANSPORTE (opt-in + base para relatório de desconto)
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente.
--
-- vt_opta: o colaborador optou por receber vale-transporte (art. 1º da Lei
--   7.418/85 — a adesão é opção do empregado).
-- vt_percentual: percentual de desconto em folha (teto legal de 6% do salário
--   básico — Lei 7.418/85 art. 4º). Fica configurável por colaborador, default 6.
--
-- O relatório de desconto é calculado no app: desconto = salario * vt_percentual%.
-- ----------------------------------------------------------------------------

ALTER TABLE public.colaboradores
  ADD COLUMN IF NOT EXISTS vt_opta boolean NOT NULL DEFAULT false;
ALTER TABLE public.colaboradores
  ADD COLUMN IF NOT EXISTS vt_percentual numeric(4, 2) NOT NULL DEFAULT 6;

NOTIFY pgrst, 'reload schema';
