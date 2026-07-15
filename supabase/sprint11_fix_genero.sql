-- ----------------------------------------------------------------------------
-- SPRINT 11 — O BANCO PASSA A ACEITAR O QUE A FICHA PERGUNTA (campo genero)
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente: pode rodar mais de uma vez.
-- Não altera nenhum dado — só a constraint. O backfill é decisão sua (seção 4).
--
-- PROBLEMA
-- A ficha de admissão oferece quatro opções de gênero:
--   'Feminino', 'Masculino', 'Outro', 'Prefiro não declarar'
-- mas a coluna aceita só duas: check (genero in ('M','F')).
-- O frontend resolve o conflito jogando fora o que não cabe:
--   AdmissionForm.tsx:234 -> 'Masculino'?'M' : 'Feminino'?'F' : null
--
-- E o campo nasce marcado como 'Prefiro não declarar' (AdmissionForm.tsx:59),
-- ou seja: quem não mexe no select — a maioria — grava null e some do gráfico
-- de Paridade Salarial por Gênero. Os 28 colaboradores do seed têm gênero
-- porque o sprint8_analytics.sql preencheu na mão, por nome. Ninguém admitido
-- pelo sistema tem.
--
-- DEPOIS DESTE SCRIPT
-- Valores válidos: 'M', 'F', 'O' (outro), 'NI' (não informado), ou null.
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- 1. DIAGNÓSTICO — rode primeiro e leia o resultado
-- ----------------------------------------------------------------------------
-- Mostra o tamanho real do problema antes de mexer em qualquer coisa.

select
  coalesce(genero, '(null)') as genero,
  count(*) as colaboradores,
  count(*) filter (where status = 'ativo') as ativos,
  count(*) filter (where status = 'ativo' and setor is not null
                     and salario is not null and salario <> '') as aptos_ao_grafico
from public.colaboradores
group by 1
order by 2 desc;

-- Leitura: a linha '(null)' são as pessoas invisíveis no gráfico de paridade.
-- Se 'aptos_ao_grafico' for alto na linha (null), o dado que falta é só o gênero.


-- ----------------------------------------------------------------------------
-- 2. Trocar a constraint
-- ----------------------------------------------------------------------------
-- O DO block descobre o nome real da constraint em vez de assumir
-- 'colaboradores_genero_check'. Ela foi criada implicitamente por um
-- `add column ... check (...)`, e o nome pode variar conforme o histórico.

do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'colaboradores'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%genero%'
  loop
    execute format('alter table public.colaboradores drop constraint %I', c.conname);
    raise notice 'Constraint removida: %', c.conname;
  end loop;
end $$;

alter table public.colaboradores
  add constraint colaboradores_genero_check
  check (genero is null or genero in ('M', 'F', 'O', 'NI'));

comment on column public.colaboradores.genero is
  'M = Masculino | F = Feminino | O = Outro | NI = prefere não declarar. '
  'null = admissão anterior a este campo, ou dado nunca coletado. '
  'O gráfico de paridade compara só M e F; O e NI são contados e exibidos à parte.';


-- ----------------------------------------------------------------------------
-- 3. Conferir que pegou
-- ----------------------------------------------------------------------------

select pg_get_constraintdef(con.oid) as constraint_atual
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and rel.relname = 'colaboradores'
  and con.contype = 'c'
  and pg_get_constraintdef(con.oid) ilike '%genero%';

-- Esperado:
--   CHECK (genero IS NULL OR genero = ANY (ARRAY['M','F','O','NI']))


-- ----------------------------------------------------------------------------
-- 4. BACKFILL — decisão sua, e por isso NÃO está automatizado
-- ----------------------------------------------------------------------------
-- Os colaboradores que já estão com genero null continuam fora do gráfico.
-- Não há como inferir o gênero de ninguém a partir dos dados: isso tem que vir
-- do RH, registro a registro.
--
-- Para preencher caso a caso, com a pessoa certa decidindo:
--
--   update public.colaboradores set genero = 'F' where cpf = '000.000.000-00';
--
-- Para marcar explicitamente quem optou por não declarar (melhor que null:
-- distingue "não quis dizer" de "nunca perguntamos"):
--
--   update public.colaboradores set genero = 'NI' where cpf = '000.000.000-00';
--
-- ATENÇÃO — não repita o que o sprint8_analytics.sql:24 fez:
--
--   update public.colaboradores set genero = 'F' where genero is null;  -- NÃO
--
-- Isso chuta 'F' para todo mundo que sobrou. Não corrige o relatório de
-- paridade salarial: falsifica. Um relatório de disparidade de gênero
-- construído sobre gênero inventado é pior que relatório nenhum, porque parece
-- confiável. Se o dado não existe, o gráfico deve dizer que não existe — e
-- depois desta sprint ele diz.


-- ----------------------------------------------------------------------------
-- PRÓXIMO PASSO (do lado do código, ainda NÃO aplicado)
-- ----------------------------------------------------------------------------
-- Assim que este script rodar, o AdmissionForm passa a poder gravar os quatro
-- valores:
--   'Feminino' -> 'F' | 'Masculino' -> 'M' | 'Outro' -> 'O'
--   'Prefiro não declarar' -> 'NI'
--
-- A troca no frontend foi deixada para DEPOIS de propósito: se o código
-- enviasse 'O' antes desta constraint existir, toda admissão em que o candidato
-- escolhesse "Outro" falharia com violação de check — trocaríamos um gráfico
-- vazio por um cadastro quebrado. SQL primeiro, código depois.
