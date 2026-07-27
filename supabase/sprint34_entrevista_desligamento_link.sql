-- ----------------------------------------------------------------------------
-- SPRINT 34 — ENTREVISTA DE DESLIGAMENTO POR LINK
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor do projeto real. Idempotente.
--
-- Até aqui a entrevista de saída era digitada pelo RH no drawer do colaborador.
-- Agora o RH gera um link e o ex-colaborador responde as MESMAS perguntas em
-- /entrevista-desligamento/:token.
--
-- A tabela `desligamentos` continua 100% RH-only (decisão da sprint28: entrevista
-- de saída é dado sensível). O anônimo NÃO ganha policy nenhuma: ele chega só
-- pelas duas RPCs SECURITY DEFINER abaixo, exatamente como o candidato do teste
-- comportamental (sprint31) e o candidato da admissão (sprint8).
--
-- REGRA CENTRAL — "uma resposta por link": não é validação de UI. É o predicado
-- `entrevista_realizada_em is null` dentro do WHERE de um único UPDATE. Dois
-- envios simultâneos disputam a mesma linha e só um afeta row_count; o segundo
-- recebe false. O cliente não tem como burlar porque não alcança a tabela.
-- ----------------------------------------------------------------------------

alter table public.desligamentos add column if not exists entrevista_token text;
alter table public.desligamentos add column if not exists entrevista_token_ativo boolean not null default true;
alter table public.desligamentos add column if not exists entrevista_origem text;

comment on column public.desligamentos.entrevista_token is
  'Token do link público da entrevista de saída. Null = link nunca gerado.';
comment on column public.desligamentos.entrevista_token_ativo is
  'false = link revogado pelo RH. Não apaga o token (mantém rastro de que existiu).';
comment on column public.desligamentos.entrevista_origem is
  'Quem preencheu a entrevista: o RH na mão ou o próprio ex-colaborador pelo link.';

-- Unique parcial: vários desligamentos podem ter token null (link nunca gerado),
-- mas dois tokens iguais nunca. Um `unique` de coluna barraria o segundo null
-- em alguns bancos e é semanticamente errado aqui.
create unique index if not exists idx_desligamentos_entrevista_token
  on public.desligamentos (entrevista_token)
  where entrevista_token is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'check_deslig_entrevista_origem'
  ) then
    alter table public.desligamentos
      add constraint check_deslig_entrevista_origem
      check (entrevista_origem is null or entrevista_origem in ('rh', 'ex_colaborador'));
  end if;
end $$;

-- Entrevistas que já existem foram todas digitadas pelo RH (o link não existia).
update public.desligamentos
   set entrevista_origem = 'rh'
 where entrevista_realizada_em is not null
   and entrevista_origem is null;

-- ----------------------------------------------------------------------------
-- RPCs SECURITY DEFINER — único caminho do anônimo
-- ----------------------------------------------------------------------------
-- O prazo de 15 dias é derivado de `data_termino`, não guardado em coluna: se o
-- RH corrigir a data de término, o prazo acompanha sozinho. Não há como as duas
-- informações divergirem porque só existe uma.
-- ----------------------------------------------------------------------------

-- Carrega o mínimo para montar a tela: o nome (para cumprimentar quem abriu o
-- link) e os três motivos possíveis de o link não valer. Salário, motivo do
-- desligamento, prazos e valores NÃO saem por aqui.
create or replace function public.get_entrevista_desligamento_by_token(p_token text)
returns table (
  colaborador_nome text,
  ja_respondida boolean,
  expirada boolean,
  ativa boolean
)
language sql
security definer
set search_path = public
as $$
  select
    c.nome,
    d.entrevista_realizada_em is not null,
    current_date > (d.data_termino + 15),
    d.entrevista_token_ativo
  from public.desligamentos d
  join public.colaboradores c on c.id = d.colaborador_id
  where d.entrevista_token = p_token;
$$;

-- Grava as respostas. As quatro condições do WHERE são a autorização inteira:
-- token confere, ainda não respondida, link não revogado, dentro dos 15 dias.
-- Falhou qualquer uma → 0 linhas → false, sem vazar qual delas falhou.
create or replace function public.submit_entrevista_desligamento(
  p_token text,
  p_motivo_real text,
  p_pontos_positivos text,
  p_pontos_melhorar text,
  p_recomendaria int,
  p_comentarios text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare afetadas int;
begin
  update public.desligamentos
     set entrevista_realizada_em    = timezone('utc'::text, now()),
         entrevista_motivo_real     = nullif(btrim(p_motivo_real), ''),
         entrevista_pontos_positivos = nullif(btrim(p_pontos_positivos), ''),
         entrevista_pontos_melhorar  = nullif(btrim(p_pontos_melhorar), ''),
         -- Clamp no banco: a coluna tem check 0..10 e um valor fora faria a
         -- resposta do ex-colaborador ser perdida com erro em vez de salva.
         entrevista_recomendaria     = greatest(0, least(10, p_recomendaria))::smallint,
         entrevista_comentarios      = nullif(btrim(p_comentarios), ''),
         entrevista_origem           = 'ex_colaborador'
   where entrevista_token = p_token
     and entrevista_realizada_em is null
     and entrevista_token_ativo = true
     and current_date <= (data_termino + 15);
  get diagnostics afetadas = row_count;
  return afetadas > 0;
end;
$$;

grant execute on function public.get_entrevista_desligamento_by_token(text) to anon, authenticated;
grant execute on function public.submit_entrevista_desligamento(text, text, text, text, int, text) to anon, authenticated;

notify pgrst, 'reload schema';
