-- ----------------------------------------------------------------------------
-- SPRINT 21 — LANÇAMENTOS DA FOLHA (anotações para o fechamento mensal)
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente.
--
-- O que é: um "livro de lançamentos" onde o RH anota ao longo do mês tudo que
--   precisa entrar na folha de pagamento (desconto, adiantamento, insalubridade,
--   inclusão, hora extra, falta...), vinculado opcionalmente a um colaborador e
--   a uma competência (mês). No fim do mês o sistema lembra dos pendentes para
--   nada ser esquecido antes de enviar ao contador/fechamento.
--
-- Padrão do projeto: leitura para authenticated; escrita só coordenadora_rh /
--   superuser TI. Segue o mesmo modelo de colaborador_advertencias.
-- ----------------------------------------------------------------------------

create table if not exists public.folha_lancamentos (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid references public.colaboradores(id) on delete set null,
  categoria text not null default 'Outro'
    constraint check_categoria_folha check (categoria in (
      'Desconto', 'Adiantamento', 'Insalubridade', 'Periculosidade',
      'Hora Extra', 'Inclusão', 'Falta', 'Outro'
    )),
  valor numeric(12, 2),
  descricao text not null,
  competencia text not null,               -- 'YYYY-MM' (mês de referência da folha)
  status text not null default 'pendente'
    constraint check_status_folha check (status in ('pendente', 'enviado')),
  criado_por text,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null,
  enviado_em timestamp with time zone,
  atualizado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.folha_lancamentos is
  'Anotações do RH para inclusão na folha de pagamento, por competência (mês). '
  'status pendente→enviado quando repassado ao fechamento.';

create index if not exists idx_folha_competencia on public.folha_lancamentos(competencia);
create index if not exists idx_folha_status on public.folha_lancamentos(status);
create index if not exists idx_folha_colaborador on public.folha_lancamentos(colaborador_id);

-- Trigger de atualizado_em (reaproveita a função já criada em sprints anteriores).
create or replace function public.trg_fn_touch_atualizado_em()
returns trigger as $$
begin new.atualizado_em := now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_folha_touch on public.folha_lancamentos;
create trigger trg_folha_touch
  before update on public.folha_lancamentos
  for each row execute function public.trg_fn_touch_atualizado_em();

-- RLS
alter table public.folha_lancamentos enable row level security;

drop policy if exists "Leitura de folha_lancamentos para autenticados" on public.folha_lancamentos;
create policy "Leitura de folha_lancamentos para autenticados"
  on public.folha_lancamentos for select to authenticated using (true);

drop policy if exists "Escrita de folha_lancamentos para coordenadora_rh" on public.folha_lancamentos;
create policy "Escrita de folha_lancamentos para coordenadora_rh"
  on public.folha_lancamentos for all to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com')
  with check (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

notify pgrst, 'reload schema';
