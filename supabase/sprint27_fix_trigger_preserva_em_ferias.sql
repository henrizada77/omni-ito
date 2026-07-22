-- ----------------------------------------------------------------------------
-- SPRINT 27 — FIX: trigger de onboarding sobrescrevia o status 'em_ferias'
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente.
--
-- Bug: trg_fn_recalc_onboarding_progress roda BEFORE UPDATE em colaboradores e
-- forçava status := 'ativo' (onboarding 100%) ou 'pendente' em todo update,
-- preservando apenas 'desligado'. Resultado: "Colocar em Férias" gravava
-- 'em_ferias' e o trigger revertia para 'ativo' na mesma transação — o painel
-- "Em Férias Agora" nunca aparecia e o status na aba Colaboradores não mudava.
--
-- Fix: 'em_ferias' passa a ser preservado como 'desligado' já era. O retorno
-- continua manual (RH volta o status para 'ativo' no app).
-- ----------------------------------------------------------------------------

create or replace function public.trg_fn_recalc_onboarding_progress()
returns trigger as $$
declare
  true_count integer := 0;
  total_items integer := 8;
begin
  if new.vale_alimentacao then true_count := true_count + 1; end if;
  if new.plano_saude then true_count := true_count + 1; end if;
  if new.depily then true_count := true_count + 1; end if;
  if new.kit_onboarding then true_count := true_count + 1; end if;
  if new.uniforme_sapato then true_count := true_count + 1; end if;
  if new.entrega_epi then true_count := true_count + 1; end if;
  if new.treinamento_inicial then true_count := true_count + 1; end if;
  if new.cadastro_biometria then true_count := true_count + 1; end if;

  new.onboarding_progresso := (true_count * 100) / total_items;

  -- Status definidos manualmente pelo RH têm precedência sobre o cálculo do
  -- onboarding: 'desligado' e 'em_ferias' nunca são sobrescritos aqui.
  if new.status in ('desligado', 'em_ferias') then
    -- mantém
  elsif new.onboarding_progresso = 100 then
    new.status := 'ativo';
  else
    new.status := 'pendente';
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Backfill: tentativas anteriores de "Colocar em Férias" gravaram
-- ferias_inicio/ferias_dias (o trigger não toca nesses campos), mas o status
-- foi revertido para 'ativo'. Restaura 'em_ferias' para quem está com período
-- de férias em curso hoje. Idempotente: a janela de datas limita o efeito.
update public.colaboradores
set status = 'em_ferias'
where status = 'ativo'
  and ferias_inicio is not null
  and ferias_dias is not null
  and current_date >= ferias_inicio
  and current_date < ferias_inicio + ferias_dias;

NOTIFY pgrst, 'reload schema';
