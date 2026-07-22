-- ----------------------------------------------------------------------------
-- SPRINT 27 — DAY OFF DE ANIVERSÁRIO
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente.
--
-- Guarda o ano em que o day off de aniversário foi concedido ao colaborador.
-- O app compara com o ano corrente: se day_off_aniversario_ano = ano atual, o
-- benefício já foi dado neste ciclo (mostra "concedido"); caso contrário exibe
-- o botão "Conceder". Volta a ficar disponível no próximo aniversário.
-- ----------------------------------------------------------------------------

ALTER TABLE public.colaboradores
  ADD COLUMN IF NOT EXISTS day_off_aniversario_ano integer;

NOTIFY pgrst, 'reload schema';
