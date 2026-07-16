-- ----------------------------------------------------------------------------
-- SPRINT 14 — PESQUISA DE SATISFAÇÃO E OUVIDORIA (CANAIS ANÔNIMOS)
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente.
--
-- Duas superfícies públicas anônimas:
--   /pesquisa   → pesquisas_satisfacao       (nota 1-5, categoria, comentário)
--   /ouvidoria  → ouvidoria_manifestacoes    (tipo, mensagem, setor, status)
--
-- ANONIMATO — NENHUMA das duas tabelas armazena ip_address, user_agent ou
-- vínculo com o autor. Não há trigger populando metadados como acontece em
-- logs_auditoria. Isso é intencional e proposital: se alguém precisar de rastro,
-- essa é a tabela errada — use logs_auditoria via uma ação autenticada, ou
-- uma nova coluna aqui documentada como "não anônima".
--
-- A leitura fica com RH/superuser TI; anon só pode INSERT. RH pode UPDATE para
-- registrar resposta interna e mudança de status na ouvidoria.
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- 1. Pesquisa de satisfação
-- ----------------------------------------------------------------------------

create table if not exists public.pesquisas_satisfacao (
  id uuid primary key default gen_random_uuid(),
  nota smallint not null constraint check_nota_satisfacao check (nota between 1 and 5),
  categoria text not null default 'Geral'
    constraint check_categoria_satisfacao
    check (categoria in ('Geral', 'Ambiente', 'Liderança', 'Benefícios', 'Carreira', 'Comunicação')),
  comentario text,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.pesquisas_satisfacao is
  'Pesquisa de satisfação anônima. Sem IP/UA/user_id. Alimenta o card de '
  'Satisfação Média em CompensationsPanel.';

create index if not exists idx_pesquisas_satisfacao_criado on public.pesquisas_satisfacao(criado_em desc);
create index if not exists idx_pesquisas_satisfacao_categoria on public.pesquisas_satisfacao(categoria);


-- ----------------------------------------------------------------------------
-- 2. Ouvidoria
-- ----------------------------------------------------------------------------

create table if not exists public.ouvidoria_manifestacoes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null
    constraint check_tipo_ouvidoria
    check (tipo in ('Elogio', 'Sugestão', 'Reclamação', 'Denúncia')),
  setor_alvo text,
  mensagem text not null,
  status text not null default 'novo'
    constraint check_status_ouvidoria
    check (status in ('novo', 'em_analise', 'resolvido', 'arquivado')),
  resposta_interna text,
  atualizado_em timestamp with time zone default timezone('utc'::text, now()) not null,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.ouvidoria_manifestacoes is
  'Canal de ouvidoria anônimo. Sem IP/UA/user_id. resposta_interna é anotação '
  'da coordenação — nunca é devolvida ao autor (não há autor).';

create index if not exists idx_ouvidoria_status on public.ouvidoria_manifestacoes(status);
create index if not exists idx_ouvidoria_tipo on public.ouvidoria_manifestacoes(tipo);
create index if not exists idx_ouvidoria_criado on public.ouvidoria_manifestacoes(criado_em desc);

-- Trigger de atualizado_em (reaproveita a função criada na sprint 13; recria por segurança)
create or replace function public.trg_fn_touch_atualizado_em()
returns trigger as $$
begin new.atualizado_em := now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_ouvidoria_touch on public.ouvidoria_manifestacoes;
create trigger trg_ouvidoria_touch
  before update on public.ouvidoria_manifestacoes
  for each row execute function public.trg_fn_touch_atualizado_em();


-- ----------------------------------------------------------------------------
-- 3. RLS — INSERT anônimo, leitura/edição só RH
-- ----------------------------------------------------------------------------

alter table public.pesquisas_satisfacao enable row level security;
alter table public.ouvidoria_manifestacoes enable row level security;

-- Pesquisa de satisfação
drop policy if exists "Insercao anonima de pesquisa" on public.pesquisas_satisfacao;
create policy "Insercao anonima de pesquisa"
  on public.pesquisas_satisfacao for insert
  to anon
  with check (true);

drop policy if exists "Insercao autenticada de pesquisa" on public.pesquisas_satisfacao;
create policy "Insercao autenticada de pesquisa"
  on public.pesquisas_satisfacao for insert
  to authenticated
  with check (true);

drop policy if exists "Leitura de pesquisa para RH" on public.pesquisas_satisfacao;
create policy "Leitura de pesquisa para RH"
  on public.pesquisas_satisfacao for select
  to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Exclusao de pesquisa para RH" on public.pesquisas_satisfacao;
create policy "Exclusao de pesquisa para RH"
  on public.pesquisas_satisfacao for delete
  to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

-- Ouvidoria
drop policy if exists "Insercao anonima de ouvidoria" on public.ouvidoria_manifestacoes;
create policy "Insercao anonima de ouvidoria"
  on public.ouvidoria_manifestacoes for insert
  to anon
  with check (
    -- Anon só pode inserir manifestações "cruas": status inicial, sem resposta interna.
    -- Bloqueia envio pré-classificado ou com resposta plantada por terceiro.
    (status is null or status = 'novo') and resposta_interna is null
  );

drop policy if exists "Insercao autenticada de ouvidoria" on public.ouvidoria_manifestacoes;
create policy "Insercao autenticada de ouvidoria"
  on public.ouvidoria_manifestacoes for insert
  to authenticated
  with check (
    (status is null or status = 'novo') and resposta_interna is null
  );

drop policy if exists "Leitura de ouvidoria para RH" on public.ouvidoria_manifestacoes;
create policy "Leitura de ouvidoria para RH"
  on public.ouvidoria_manifestacoes for select
  to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Update de ouvidoria para RH" on public.ouvidoria_manifestacoes;
create policy "Update de ouvidoria para RH"
  on public.ouvidoria_manifestacoes for update
  to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com')
  with check (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Exclusao de ouvidoria para RH" on public.ouvidoria_manifestacoes;
create policy "Exclusao de ouvidoria para RH"
  on public.ouvidoria_manifestacoes for delete
  to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

notify pgrst, 'reload schema';
