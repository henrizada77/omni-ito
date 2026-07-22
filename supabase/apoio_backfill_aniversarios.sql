-- ----------------------------------------------------------------------------
-- APOIO — Backfill de aniversários a partir da tabela de colaboradores
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor, bloco a bloco. Idempotente.
--
-- O card "Aniversariantes do mês" e os dots da Agenda leem, nesta ordem:
--   data_aniversario  →  data_nascimento  →  ficha_admissao->>'data_nascimento'
--
-- Passo 1 copia a data da ficha de admissão para a coluna data_nascimento.
-- Passo 2 mostra quem já tem aniversário e de onde ele vem.
-- Passo 3 gera os UPDATEs prontos para os que ficaram sem data — copie o
--         resultado, troque as datas e execute.
-- ----------------------------------------------------------------------------

-- ── PASSO 1: puxa a data de nascimento da ficha de admissão para a coluna ──
-- (só onde a coluna está vazia e a ficha tem uma data válida YYYY-MM-DD)
update public.colaboradores
set data_nascimento = (ficha_admissao->>'data_nascimento')::date
where data_nascimento is null
  and coalesce(ficha_admissao->>'data_nascimento', '') ~ '^\d{4}-\d{2}-\d{2}$';

-- ── PASSO 2: conferência — quem tem aniversário e a origem do dado ──
select
  nome,
  cargo,
  setor,
  status,
  coalesce(
    data_aniversario,
    data_nascimento,
    case when coalesce(ficha_admissao->>'data_nascimento', '') ~ '^\d{4}-\d{2}-\d{2}$'
         then (ficha_admissao->>'data_nascimento')::date end
  ) as aniversario,
  case
    when data_aniversario is not null then 'coluna data_aniversario'
    when data_nascimento is not null then 'coluna data_nascimento'
    when coalesce(ficha_admissao->>'data_nascimento', '') ~ '^\d{4}-\d{2}-\d{2}$'
         then 'ficha de admissão'
    else '⚠ SEM DATA — usar Passo 3'
  end as origem
from public.colaboradores
where status <> 'desligado'
order by (coalesce(data_aniversario, data_nascimento) is null) desc, nome;

-- ── PASSO 3: gera um UPDATE pronto por colaborador sem data ──
-- Rode este SELECT, copie as linhas do resultado, troque 'AAAA-MM-DD' pela
-- data de nascimento de cada um e execute os UPDATEs.
select format(
  'update public.colaboradores set data_nascimento = date ''AAAA-MM-DD'' where id = %L; -- %s (%s · %s)',
  id, nome, coalesce(cargo, '—'), coalesce(setor, '—')
) as update_pronto
from public.colaboradores
where status <> 'desligado'
  and data_aniversario is null
  and data_nascimento is null
  and coalesce(ficha_admissao->>'data_nascimento', '') !~ '^\d{4}-\d{2}-\d{2}$'
order by nome;
