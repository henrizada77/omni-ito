-- ----------------------------------------------------------------------------
-- SPRINT 26 — STATUS "EM FÉRIAS" + registro de férias
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente.
--
-- Adiciona o status 'em_ferias' ao colaborador e os campos do período de férias
-- em curso. Ao colocar em férias, o app grava ferias_inicio + ferias_dias e
-- empurra data_ferias_vencimento para (início + 12 meses). O retorno é manual
-- (RH volta o status para 'ativo').
-- ----------------------------------------------------------------------------

-- Recria a check de status incluindo 'em_ferias'
ALTER TABLE public.colaboradores DROP CONSTRAINT IF EXISTS check_status;
ALTER TABLE public.colaboradores
  ADD CONSTRAINT check_status CHECK (status IN ('pendente', 'ativo', 'desligado', 'em_ferias'));

-- Campos do período de férias em curso
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS ferias_inicio date;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS ferias_dias integer;

NOTIFY pgrst, 'reload schema';
