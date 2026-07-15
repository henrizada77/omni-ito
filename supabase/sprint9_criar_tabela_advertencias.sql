-- Migration: Criar tabela de advertencias
create table if not exists public.colaborador_advertencias (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid references public.colaboradores(id) on delete cascade not null,
  data_falta date not null default current_date,
  descricao_situacao text not null,
  avaliador_email text not null,
  advertencias_anteriores jsonb default '[]'::jsonb,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Security
alter table public.colaborador_advertencias enable row level security;

-- Read policy
drop policy if exists "Leitura de colaborador_advertencias para autenticados" on public.colaborador_advertencias;
create policy "Leitura de colaborador_advertencias para autenticados"
  on public.colaborador_advertencias for select to authenticated using (true);

-- Write policy
drop policy if exists "Escrita de colaborador_advertencias para coordenadora_rh" on public.colaborador_advertencias;
create policy "Escrita de colaborador_advertencias para coordenadora_rh"
  on public.colaborador_advertencias for all to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');
