-- ----------------------------------------------------------------------------
-- SPRINT 29 — DOCUMENTOS INSTITUCIONAIS (Manual de Cultura visível a todos)
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente.
--
-- Tabela genérica para conteúdos institucionais editados pelo RH e lidos por
-- qualquer pessoa (inclusive deslogada), como o Manual de Cultura. A página
-- pública /cultura lê com a chave anon; por isso o SELECT é liberado para anon.
-- A escrita continua restrita à coordenadora_rh / superuser TI.
--
-- 'tipo' é único: cada tipo tem no máximo um documento vigente (upsert por tipo).
-- ----------------------------------------------------------------------------

create table if not exists public.documentos_institucionais (
  id uuid primary key default gen_random_uuid(),
  tipo text not null unique default 'manual_cultura',
  titulo text not null default 'Manual de Cultura',
  conteudo text not null default '',
  atualizado_por text,
  atualizado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.documentos_institucionais is
  'Conteúdos institucionais (Manual de Cultura etc.) editados pelo RH e lidos '
  'publicamente. Um registro por tipo.';

-- Trigger de atualizado_em (reaproveita a função já criada em sprints anteriores).
create or replace function public.trg_fn_touch_atualizado_em()
returns trigger as $$
begin new.atualizado_em := now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_docinst_touch on public.documentos_institucionais;
create trigger trg_docinst_touch
  before update on public.documentos_institucionais
  for each row execute function public.trg_fn_touch_atualizado_em();

-- RLS
alter table public.documentos_institucionais enable row level security;

-- Leitura pública (a página /cultura lê deslogada, com a chave anon).
drop policy if exists "Leitura pública de documentos_institucionais" on public.documentos_institucionais;
create policy "Leitura pública de documentos_institucionais"
  on public.documentos_institucionais for select to anon, authenticated using (true);

-- Escrita só coordenadora_rh / superuser TI.
drop policy if exists "Escrita de documentos_institucionais para coordenadora_rh" on public.documentos_institucionais;
create policy "Escrita de documentos_institucionais para coordenadora_rh"
  on public.documentos_institucionais for all to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com')
  with check (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

-- Semente do Manual de Cultura (só se ainda não existir).
insert into public.documentos_institucionais (tipo, titulo, conteudo)
values ('manual_cultura', 'Manual de Cultura', '')
on conflict (tipo) do nothing;

notify pgrst, 'reload schema';
