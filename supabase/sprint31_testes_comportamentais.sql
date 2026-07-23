-- ----------------------------------------------------------------------------
-- SPRINT 31 — TESTE COMPORTAMENTAL DISC (aba Vagas, parte B)
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor do projeto real. Idempotente.
--
-- RH gera um teste por candidato; o candidato responde pelo link /teste-comportamental/:token.
-- A tabela NÃO é exposta ao anônimo: o candidato lê/grava só via RPCs SECURITY
-- DEFINER (get_teste_by_token, submit_teste_comportamental), como o fluxo de
-- admissão (sprint8). Leitura/gestão completa só para o RH.
-- ----------------------------------------------------------------------------

create table if not exists public.testes_comportamentais (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  candidato_nome text not null,
  candidato_email text,
  vaga_relacionada text,               -- texto livre, opcional
  status text not null default 'pendente'
    constraint check_status_teste check (status in ('pendente','respondido')),
  ativo boolean not null default true,  -- false = link revogado
  respostas jsonb,                      -- [{ bloco:int, mais:'D'|'I'|'S'|'C', menos:'D'|'I'|'S'|'C' }]
  resultado jsonb,                      -- { pressao:{D,I,S,C}, natural:{D,I,S,C}, net:{D,I,S,C}, dominante:'D' }
  criado_por_email text,
  respondido_em timestamp with time zone,
  criado_em timestamp with time zone not null default timezone('utc'::text, now())
);

comment on table public.testes_comportamentais is
  'Testes DISC por candidato. Anon acessa só via RPCs get_teste_by_token / '
  'submit_teste_comportamental. Gestão e leitura de resultado só para o RH.';

create index if not exists idx_testes_comportamentais_status on public.testes_comportamentais(status);
create index if not exists idx_testes_comportamentais_criado on public.testes_comportamentais(criado_em desc);
create index if not exists idx_testes_comportamentais_token on public.testes_comportamentais(token);

-- ----------------------------------------------------------------------------
-- RLS — só RH (nenhuma policy para anon; anon usa as RPCs abaixo)
-- ----------------------------------------------------------------------------

alter table public.testes_comportamentais enable row level security;

drop policy if exists "Leitura de teste para RH" on public.testes_comportamentais;
create policy "Leitura de teste para RH"
  on public.testes_comportamentais for select
  to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Insercao de teste para RH" on public.testes_comportamentais;
create policy "Insercao de teste para RH"
  on public.testes_comportamentais for insert
  to authenticated
  with check (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Update de teste para RH" on public.testes_comportamentais;
create policy "Update de teste para RH"
  on public.testes_comportamentais for update
  to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com')
  with check (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Exclusao de teste para RH" on public.testes_comportamentais;
create policy "Exclusao de teste para RH"
  on public.testes_comportamentais for delete
  to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

-- ----------------------------------------------------------------------------
-- RPCs SECURITY DEFINER — único caminho do anônimo
-- ----------------------------------------------------------------------------

-- Candidato carrega o teste pelo token. Devolve só campos públicos.
create or replace function public.get_teste_by_token(p_token text)
returns table (candidato_nome text, status text, ativo boolean, vaga_relacionada text)
language sql
security definer
set search_path = public
as $$
  select candidato_nome, status, ativo, vaga_relacionada
  from public.testes_comportamentais
  where token = p_token;
$$;

-- Candidato envia respostas. Só grava se pendente e ativo; senão no-op (false).
create or replace function public.submit_teste_comportamental(
  p_token text, p_respostas jsonb, p_resultado jsonb
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare afetadas int;
begin
  update public.testes_comportamentais
     set respostas = p_respostas,
         resultado = p_resultado,
         status = 'respondido',
         respondido_em = timezone('utc'::text, now())
   where token = p_token and status = 'pendente' and ativo = true;
  get diagnostics afetadas = row_count;
  return afetadas > 0;
end;
$$;

grant execute on function public.get_teste_by_token(text) to anon, authenticated;
grant execute on function public.submit_teste_comportamental(text, jsonb, jsonb) to anon, authenticated;

notify pgrst, 'reload schema';
