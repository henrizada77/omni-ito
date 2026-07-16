-- ----------------------------------------------------------------------------
-- SPRINT 13 — CATÁLOGO DE CARGOS, TRILHAS DE CARREIRA E WORKFLOW DE PROMOÇÕES
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente.
--
-- Este script introduz o cadastro central de cargos (fonte da verdade para
-- descritivos e faixas salariais), o conceito de trilha de carreira como uma
-- sequência ordenada de degraus (cargos), e o workflow de promoção com quatro
-- estados: proposta → aprovada → efetivada (ou rejeitada de qualquer não-final).
--
-- O que já existia (planos_carreira e avaliacoes_desempenho) continua no lugar
-- e não é migrado por este script — planos_carreira é a modelagem antiga por
-- pares "cargo_atual → proximo_cargo" e permanece útil como shortcut. Trilhas
-- são o desenho novo, com múltiplos degraus. Migração/consolidação é decisão
-- posterior; enquanto isso, os dois coexistem sem conflito.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 1. Catálogo de cargos
-- ----------------------------------------------------------------------------

create table if not exists public.cargos (
  id uuid primary key default gen_random_uuid(),
  titulo text unique not null,
  descricao text,
  atribuicoes text[] not null default '{}'::text[],
  cbo text,
  setor text,
  faixa_salarial_min numeric,
  faixa_salarial_max numeric,
  requisitos text,
  ativo boolean not null default true,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.cargos is
  'Catálogo central de cargos. Fonte da verdade para descritivos, faixas '
  'salariais e atribuições. Referenciado por trilha_degraus e promocoes.';

-- Seed automático a partir dos cargos que já aparecem em colaboradores.
-- Só cria os que ainda não existem; nada é sobrescrito.
insert into public.cargos (titulo, setor)
select distinct cargo, setor
from public.colaboradores
where cargo is not null and cargo <> ''
on conflict (titulo) do nothing;

-- ----------------------------------------------------------------------------
-- 2. Trilhas de carreira (com múltiplos degraus)
-- ----------------------------------------------------------------------------

create table if not exists public.trilhas_carreira (
  id uuid primary key default gen_random_uuid(),
  nome text unique not null,
  descricao text,
  ativo boolean not null default true,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.trilhas_carreira is
  'Trilha = sequência ordenada de cargos (degraus) que compõe um plano de '
  'carreira. Ex: "Recepção" contém Recepcionista → Recepcionista Líder → '
  'Supervisora de Recepção. Cada trilha pode ter N degraus.';

create table if not exists public.trilha_degraus (
  id uuid primary key default gen_random_uuid(),
  trilha_id uuid references public.trilhas_carreira(id) on delete cascade not null,
  cargo_id uuid references public.cargos(id) on delete restrict not null,
  ordem integer not null,
  requisito_tempo_meses integer default 12,
  requisito_nota_avaliacao numeric default 4.0,
  competencias text,
  observacao text,
  unique (trilha_id, ordem),
  unique (trilha_id, cargo_id)
);

comment on column public.trilha_degraus.ordem is
  'Posição do degrau na trilha (1 = degrau inicial). Único por trilha.';

-- ----------------------------------------------------------------------------
-- 3. Promoções (workflow: proposta → aprovada → efetivada | rejeitada)
-- ----------------------------------------------------------------------------

create table if not exists public.promocoes (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid references public.colaboradores(id) on delete cascade not null,
  cargo_origem_id uuid references public.cargos(id) on delete set null,
  cargo_destino_id uuid references public.cargos(id) on delete restrict not null,
  -- Snapshots do título: se o cargo for renomeado no catálogo, a promoção
  -- histórica continua contando a versão do momento em que foi registrada.
  cargo_origem_titulo text,
  cargo_destino_titulo text not null,
  salario_anterior text,
  salario_novo text,
  data_proposta date not null default current_date,
  data_efetivacao date,
  status text not null default 'proposta'
    constraint check_promocao_status
    check (status in ('proposta', 'aprovada', 'efetivada', 'rejeitada')),
  motivo text,
  proposto_por text,
  aprovado_por text,
  atualizado_em timestamp with time zone default timezone('utc'::text, now()) not null,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.promocoes is
  'Workflow de promoção. Estado inicial "proposta"; RH aprova ou rejeita; '
  'depois de "aprovada", o botão Efetivar atualiza cargo e salário do '
  'colaborador e marca "efetivada" com data_efetivacao.';

create index if not exists idx_promocoes_colaborador on public.promocoes(colaborador_id);
create index if not exists idx_promocoes_status on public.promocoes(status);

-- Trigger para manter atualizado_em em dia. Genérico — pode ser reutilizado.
create or replace function public.trg_fn_touch_atualizado_em()
returns trigger as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_promocoes_touch on public.promocoes;
create trigger trg_promocoes_touch
  before update on public.promocoes
  for each row execute function public.trg_fn_touch_atualizado_em();

-- ----------------------------------------------------------------------------
-- 4. RLS — leitura ampla para autenticados, escrita restrita a RH
-- ----------------------------------------------------------------------------
-- Padrão do restante do sistema (ver sprint10 C-3): leitura para authenticated
-- via `using(true)` é decisão de produto; escrita segue a mesma allowlist RH/TI.
-- ----------------------------------------------------------------------------

alter table public.cargos enable row level security;
alter table public.trilhas_carreira enable row level security;
alter table public.trilha_degraus enable row level security;
alter table public.promocoes enable row level security;

drop policy if exists "Leitura de cargos para autenticados" on public.cargos;
create policy "Leitura de cargos para autenticados"
  on public.cargos for select to authenticated using (true);

drop policy if exists "Escrita de cargos para RH" on public.cargos;
create policy "Escrita de cargos para RH"
  on public.cargos for all to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com')
  with check (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Leitura de trilhas_carreira para autenticados" on public.trilhas_carreira;
create policy "Leitura de trilhas_carreira para autenticados"
  on public.trilhas_carreira for select to authenticated using (true);

drop policy if exists "Escrita de trilhas_carreira para RH" on public.trilhas_carreira;
create policy "Escrita de trilhas_carreira para RH"
  on public.trilhas_carreira for all to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com')
  with check (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Leitura de trilha_degraus para autenticados" on public.trilha_degraus;
create policy "Leitura de trilha_degraus para autenticados"
  on public.trilha_degraus for select to authenticated using (true);

drop policy if exists "Escrita de trilha_degraus para RH" on public.trilha_degraus;
create policy "Escrita de trilha_degraus para RH"
  on public.trilha_degraus for all to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com')
  with check (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Leitura de promocoes para autenticados" on public.promocoes;
create policy "Leitura de promocoes para autenticados"
  on public.promocoes for select to authenticated using (true);

drop policy if exists "Escrita de promocoes para RH" on public.promocoes;
create policy "Escrita de promocoes para RH"
  on public.promocoes for all to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com')
  with check (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

notify pgrst, 'reload schema';
