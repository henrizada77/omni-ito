-- ============================================================================
-- Sprint 33 — Ações de Endomarketing na Agenda RH
-- ============================================================================
-- Primeiro evento *criado à mão* da Agenda: até aqui o calendário era 100%
-- derivado de `colaboradores` (ASO, férias, experiência, admissão, aniversário)
-- e de `colaborador_advertencias`. Agora o RH cadastra ações próprias e os dias
-- escolhidos viram pontinhos no calendário principal.
--
-- Os dias ficam num array `date[]` na própria linha (uma ação = uma linha) em
-- vez de uma tabela filha: a ação é sempre lida e editada inteira, nunca por
-- dia isolado. Se algum dia precisar de dado próprio (presença, custo), aí sim
-- vira tabela filha.
--
-- Idempotente. Rodar no SQL Editor do Supabase.
-- ============================================================================

create table if not exists public.acoes_endomarketing (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  categoria text not null default 'Outro'
    constraint check_categoria_endomarketing check (categoria in (
      'Campanha', 'Comemoração', 'Treinamento', 'Integração',
      'Saúde & Bem-estar', 'Comunicado', 'Outro'
    )),
  status text not null default 'planejada'
    constraint check_status_endomarketing check (status in (
      'planejada', 'em_andamento', 'concluida', 'cancelada'
    )),
  responsavel text,
  -- Dias avulsos da ação (não é intervalo): [2026-08-05, 2026-08-12, ...]
  dias date[] not null default '{}',
  criado_por_email text,
  atualizado_em timestamp with time zone default timezone('utc'::text, now()) not null,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null,

  -- Uma ação sem dia nenhum não apareceria em lugar algum do calendário:
  -- é registro órfão. Barrado no banco, não só na UI.
  constraint check_dias_nao_vazio check (array_length(dias, 1) >= 1)
);

comment on table public.acoes_endomarketing is
  'Ações de endomarketing criadas pelo RH (sub-aba da Agenda RH). Os dias em '
  '`dias` aparecem como eventos no calendário principal. Status `cancelada` '
  'esconde a ação do calendário sem apagar o histórico.';

comment on column public.acoes_endomarketing.dias is
  'Dias avulsos escolhidos pelo RH (date[]), não um intervalo início/fim.';

-- GIN: permite `dias && array[...]::date[]` (overlap) para filtrar por mês
-- sem varrer a tabela inteira quando o volume crescer.
create index if not exists idx_acoes_endomarketing_dias
  on public.acoes_endomarketing using gin (dias);

create index if not exists idx_acoes_endomarketing_status
  on public.acoes_endomarketing (status);

-- Trigger de atualizado_em (função já existe desde a sprint14; recria por segurança)
create or replace function public.trg_fn_touch_atualizado_em()
returns trigger as $$
begin new.atualizado_em := now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_acoes_endomarketing_touch on public.acoes_endomarketing;
create trigger trg_acoes_endomarketing_touch
  before update on public.acoes_endomarketing
  for each row execute function public.trg_fn_touch_atualizado_em();

-- ----------------------------------------------------------------------------
-- RLS — leitura para autenticados, escrita só RH. Sem acesso anônimo:
-- agenda é interna, diferente de /pesquisa e /ouvidoria.
-- ----------------------------------------------------------------------------

alter table public.acoes_endomarketing enable row level security;

drop policy if exists "Leitura de acoes de endomarketing" on public.acoes_endomarketing;
create policy "Leitura de acoes de endomarketing"
  on public.acoes_endomarketing for select
  to authenticated
  using (true);

drop policy if exists "Escrita de acoes de endomarketing pelo RH" on public.acoes_endomarketing;
create policy "Escrita de acoes de endomarketing pelo RH"
  on public.acoes_endomarketing for all
  to authenticated
  using (
    public.get_user_role() = 'coordenadora_rh'
    or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com'
  )
  with check (
    public.get_user_role() = 'coordenadora_rh'
    or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com'
  );

notify pgrst, 'reload schema';
