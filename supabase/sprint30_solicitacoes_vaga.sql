-- ----------------------------------------------------------------------------
-- SPRINT 30 — SOLICITAÇÃO DE VAGA (aba Vagas, parte A)
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor do projeto real. Idempotente.
--
-- Superfície pública anônima:
--   /solicitar-vaga → solicitacoes_vaga (coordenador descreve a vaga necessária)
--
-- Modelo da ouvidoria (sprint14): anon só INSERT de linha "crua"; leitura,
-- update (status/link/resposta) e delete só para o RH. Não é canal anônimo:
-- o coordenador se identifica com nome + setor. Não gravamos IP/UA.
-- ----------------------------------------------------------------------------

create table if not exists public.solicitacoes_vaga (
  id uuid primary key default gen_random_uuid(),
  coordenador_nome text not null,
  setor text not null,
  titulo_cargo text not null,
  quantidade integer not null default 1,
  funcoes text not null,            -- atividades/funções da vaga
  requisitos text,                  -- necessidades/requisitos
  justificativa text,               -- por que a vaga é necessária
  tipo_contratacao text,            -- CLT | PJ | Estágio | Temporário | A definir
  urgencia text not null default 'Média'
    constraint check_urgencia_vaga check (urgencia in ('Baixa','Média','Alta')),
  status text not null default 'nova'
    constraint check_status_vaga
    check (status in ('nova','em_analise','publicada','preenchida','arquivada')),
  link_externo text,                -- URL da vaga no site externo (preenchido pelo RH)
  resposta_interna text,            -- anotação do RH
  atualizado_em timestamp with time zone default timezone('utc'::text, now()) not null,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.solicitacoes_vaga is
  'Solicitações de vaga abertas por coordenadores (página pública /solicitar-vaga). '
  'link_externo e resposta_interna são preenchidos só pelo RH.';

create index if not exists idx_solicitacoes_vaga_status on public.solicitacoes_vaga(status);
create index if not exists idx_solicitacoes_vaga_criado on public.solicitacoes_vaga(criado_em desc);

-- Trigger de atualizado_em (reaproveita a função da sprint14; recria por segurança)
create or replace function public.trg_fn_touch_atualizado_em()
returns trigger as $$
begin new.atualizado_em := now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_solicitacoes_vaga_touch on public.solicitacoes_vaga;
create trigger trg_solicitacoes_vaga_touch
  before update on public.solicitacoes_vaga
  for each row execute function public.trg_fn_touch_atualizado_em();

-- ----------------------------------------------------------------------------
-- RLS — INSERT anônimo (linha crua), leitura/edição só RH
-- ----------------------------------------------------------------------------

alter table public.solicitacoes_vaga enable row level security;

-- Anon só pode inserir solicitação "crua": status inicial, sem link nem resposta.
-- Bloqueia envio pré-classificado ou com dado plantado por terceiro.
drop policy if exists "Insercao anonima de solicitacao de vaga" on public.solicitacoes_vaga;
create policy "Insercao anonima de solicitacao de vaga"
  on public.solicitacoes_vaga for insert
  to anon
  with check (
    (status is null or status = 'nova')
    and link_externo is null
    and resposta_interna is null
  );

drop policy if exists "Insercao autenticada de solicitacao de vaga" on public.solicitacoes_vaga;
create policy "Insercao autenticada de solicitacao de vaga"
  on public.solicitacoes_vaga for insert
  to authenticated
  with check (
    (status is null or status = 'nova')
    and link_externo is null
    and resposta_interna is null
  );

drop policy if exists "Leitura de solicitacao de vaga para RH" on public.solicitacoes_vaga;
create policy "Leitura de solicitacao de vaga para RH"
  on public.solicitacoes_vaga for select
  to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Update de solicitacao de vaga para RH" on public.solicitacoes_vaga;
create policy "Update de solicitacao de vaga para RH"
  on public.solicitacoes_vaga for update
  to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com')
  with check (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Exclusao de solicitacao de vaga para RH" on public.solicitacoes_vaga;
create policy "Exclusao de solicitacao de vaga para RH"
  on public.solicitacoes_vaga for delete
  to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

notify pgrst, 'reload schema';
