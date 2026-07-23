-- ----------------------------------------------------------------------------
-- SPRINT 32 — FUNCIONÁRIO DO MÊS (votação identificada + pódio Top 3)
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor do projeto real. Idempotente.
--
-- Voto identificado: o RH vê quem votou e em quem. Página pública sem login;
-- o votante escolhe o próprio nome (colaboradores ativos) e vota num colega.
-- Tabelas SEM acesso anônimo direto — o público age só pelas RPCs SECURITY
-- DEFINER (get_funcionario_mes_aberto, listar_colaboradores_ativos_votacao,
-- registrar_voto_funcionario_mes). Leitura/gestão completa só do RH.
-- ----------------------------------------------------------------------------

create table if not exists public.funcionario_mes_rodadas (
  id uuid primary key default gen_random_uuid(),
  competencia text not null,            -- 'YYYY-MM'
  titulo text,
  data_fim date not null,
  status text not null default 'aberta'
    constraint check_status_rodada check (status in ('aberta','fechada')),
  top3 jsonb,                           -- [{ colaborador_id, nome, setor, votos }] (no fechamento)
  criado_por_email text,
  fechada_em timestamp with time zone,
  criado_em timestamp with time zone not null default timezone('utc'::text, now())
);

create table if not exists public.funcionario_mes_votos (
  id uuid primary key default gen_random_uuid(),
  rodada_id uuid not null references public.funcionario_mes_rodadas(id) on delete cascade,
  votante_id uuid not null,             -- colaboradores.id (quem votou)
  votado_id uuid not null,              -- colaboradores.id (quem recebeu)
  criado_em timestamp with time zone not null default timezone('utc'::text, now()),
  constraint uq_voto_por_votante unique (rodada_id, votante_id)
);

comment on table public.funcionario_mes_rodadas is
  'Rodadas mensais de Funcionário do Mês. Só uma aberta por vez (índice parcial).';
comment on table public.funcionario_mes_votos is
  'Votos identificados. 1 voto por votante por rodada (unique).';

create index if not exists idx_fm_rodadas_status on public.funcionario_mes_rodadas(status);
create index if not exists idx_fm_votos_rodada on public.funcionario_mes_votos(rodada_id);
create index if not exists idx_fm_votos_votado on public.funcionario_mes_votos(votado_id);

-- Garante no máximo uma rodada aberta ao mesmo tempo.
create unique index if not exists uq_rodada_aberta
  on public.funcionario_mes_rodadas (status)
  where status = 'aberta';

-- ----------------------------------------------------------------------------
-- RLS — só RH (nenhuma policy para anon; anon usa as RPCs)
-- ----------------------------------------------------------------------------

alter table public.funcionario_mes_rodadas enable row level security;
alter table public.funcionario_mes_votos enable row level security;

-- Rodadas
drop policy if exists "Leitura de rodadas para RH" on public.funcionario_mes_rodadas;
create policy "Leitura de rodadas para RH"
  on public.funcionario_mes_rodadas for select to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Insercao de rodadas para RH" on public.funcionario_mes_rodadas;
create policy "Insercao de rodadas para RH"
  on public.funcionario_mes_rodadas for insert to authenticated
  with check (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Update de rodadas para RH" on public.funcionario_mes_rodadas;
create policy "Update de rodadas para RH"
  on public.funcionario_mes_rodadas for update to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com')
  with check (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Exclusao de rodadas para RH" on public.funcionario_mes_rodadas;
create policy "Exclusao de rodadas para RH"
  on public.funcionario_mes_rodadas for delete to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

-- Votos
drop policy if exists "Leitura de votos para RH" on public.funcionario_mes_votos;
create policy "Leitura de votos para RH"
  on public.funcionario_mes_votos for select to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Insercao de votos para RH" on public.funcionario_mes_votos;
create policy "Insercao de votos para RH"
  on public.funcionario_mes_votos for insert to authenticated
  with check (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Update de votos para RH" on public.funcionario_mes_votos;
create policy "Update de votos para RH"
  on public.funcionario_mes_votos for update to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com')
  with check (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Exclusao de votos para RH" on public.funcionario_mes_votos;
create policy "Exclusao de votos para RH"
  on public.funcionario_mes_votos for delete to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

-- ----------------------------------------------------------------------------
-- RPCs SECURITY DEFINER — único caminho do anônimo
-- ----------------------------------------------------------------------------

-- Rodada aberta (ou nenhuma). Uma linha ou zero.
create or replace function public.get_funcionario_mes_aberto()
returns table (id uuid, competencia text, titulo text, data_fim date)
language sql security definer set search_path = public as $$
  select id, competencia, titulo, data_fim
  from public.funcionario_mes_rodadas
  where status = 'aberta'
  order by criado_em desc
  limit 1;
$$;

-- Colaboradores elegíveis (ativos): só id, nome, setor.
create or replace function public.listar_colaboradores_ativos_votacao()
returns table (id uuid, nome text, setor text)
language sql security definer set search_path = public as $$
  select id, nome, setor
  from public.colaboradores
  where coalesce(status, '') <> 'desligado'
  order by nome;
$$;

-- Registra voto. Retorna 'ok' | 'ja_votou' | 'invalido' | 'fechada'.
create or replace function public.registrar_voto_funcionario_mes(
  p_rodada_id uuid, p_votante_id uuid, p_votado_id uuid
) returns text
language plpgsql security definer set search_path = public as $$
declare v_aberta boolean; v_votante_ok boolean; v_votado_ok boolean;
begin
  if p_votante_id = p_votado_id then return 'invalido'; end if;

  select (status = 'aberta') into v_aberta
    from public.funcionario_mes_rodadas where id = p_rodada_id;
  if v_aberta is not true then return 'fechada'; end if;

  select coalesce(status,'') <> 'desligado' into v_votante_ok
    from public.colaboradores where id = p_votante_id;
  select coalesce(status,'') <> 'desligado' into v_votado_ok
    from public.colaboradores where id = p_votado_id;
  if v_votante_ok is not true or v_votado_ok is not true then return 'invalido'; end if;

  begin
    insert into public.funcionario_mes_votos (rodada_id, votante_id, votado_id)
    values (p_rodada_id, p_votante_id, p_votado_id);
  exception when unique_violation then
    return 'ja_votou';
  end;
  return 'ok';
end;
$$;

grant execute on function public.get_funcionario_mes_aberto() to anon, authenticated;
grant execute on function public.listar_colaboradores_ativos_votacao() to anon, authenticated;
grant execute on function public.registrar_voto_funcionario_mes(uuid, uuid, uuid) to anon, authenticated;

notify pgrst, 'reload schema';
