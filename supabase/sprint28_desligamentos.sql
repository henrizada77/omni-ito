-- ----------------------------------------------------------------------------
-- SPRINT 28 — DESLIGAMENTO COMPLETO (prazos + entrevista de saída)
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente.
-- Leitura E escrita restritas ao RH (entrevista de saída é dado sensível —
-- exceção deliberada ao padrão de leitura ampla do app).
-- ----------------------------------------------------------------------------

create table if not exists public.desligamentos (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null unique references public.colaboradores(id) on delete cascade,
  tipo text not null constraint check_deslig_tipo
    check (tipo in ('sem_justa_causa', 'pedido_demissao')),
  modalidade_aviso text not null constraint check_deslig_modalidade
    check (modalidade_aviso in ('trabalhado', 'indenizado_ou_dispensado')),
  data_comunicacao date not null,
  dias_aviso integer not null,
  data_termino date not null,
  data_limite_pagamento date not null,
  pagamento_efetuado_em date,
  observacoes text,
  entrevista_realizada_em timestamptz,
  entrevista_motivo_real text,
  entrevista_pontos_positivos text,
  entrevista_pontos_melhorar text,
  entrevista_recomendaria smallint
    constraint check_deslig_recomendaria check (entrevista_recomendaria between 0 and 10),
  entrevista_comentarios text,
  criado_em timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_desligamentos_pagamento
  on public.desligamentos (data_limite_pagamento) where pagamento_efetuado_em is null;

alter table public.desligamentos enable row level security;

drop policy if exists "Desligamentos restritos ao RH" on public.desligamentos;
create policy "Desligamentos restritos ao RH"
  on public.desligamentos for all
  to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com')
  with check (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

NOTIFY pgrst, 'reload schema';
