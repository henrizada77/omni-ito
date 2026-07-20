-- ----------------------------------------------------------------------------
-- SPRINT 18 — COPILOTO IA (histórico de conversas)
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente.
--
-- Guarda o histórico de conversas do copiloto ("Diretora de Gente") por usuário.
-- A chamada ao LLM é feita pela Edge Function `copilot` (proxy OpenRouter) —
-- estas tabelas só persistem o histórico. Conteúdo é PRIVADO por usuário
-- (cada RH vê só as próprias conversas), diferente das demais tabelas que usam
-- leitura ampla — aqui é chat pessoal.
-- ----------------------------------------------------------------------------

create table if not exists public.copilot_conversas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titulo text,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null,
  atualizado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists ix_copilot_conversas_usuario
  on public.copilot_conversas (usuario_id, atualizado_em desc);

create table if not exists public.copilot_mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.copilot_conversas(id) on delete cascade,
  papel text not null constraint check_copilot_papel check (papel in ('user', 'assistant')),
  conteudo text not null,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists ix_copilot_mensagens_conversa
  on public.copilot_mensagens (conversa_id, criado_em);


-- ----------------------------------------------------------------------------
-- RLS — cada usuário só enxerga/gerencia as PRÓPRIAS conversas
-- ----------------------------------------------------------------------------

alter table public.copilot_conversas enable row level security;
alter table public.copilot_mensagens enable row level security;

drop policy if exists "Conversas do próprio usuário" on public.copilot_conversas;
create policy "Conversas do próprio usuário"
  on public.copilot_conversas for all to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

-- Mensagens: acessíveis se a conversa pai é do usuário.
drop policy if exists "Mensagens das conversas do usuário" on public.copilot_mensagens;
create policy "Mensagens das conversas do usuário"
  on public.copilot_mensagens for all to authenticated
  using (exists (
    select 1 from public.copilot_conversas c
    where c.id = conversa_id and c.usuario_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.copilot_conversas c
    where c.id = conversa_id and c.usuario_id = auth.uid()
  ));

notify pgrst, 'reload schema';
