-- Migration: Sprint 8 Benefits Schema & Fictitious Cleanup

-- 1. Create table public.beneficios
create table if not exists public.beneficios (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  tipo text check (tipo in ('adicional', 'desconto')) not null,
  valor_padrao numeric not null,
  descricao text,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create table public.colaborador_beneficios
create table if not exists public.colaborador_beneficios (
  colaborador_id uuid references public.colaboradores(id) on delete cascade not null,
  beneficio_id uuid references public.beneficios(id) on delete cascade not null,
  valor_customizado numeric,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (colaborador_id, beneficio_id)
);

-- Enable RLS
alter table public.beneficios enable row level security;
alter table public.colaborador_beneficios enable row level security;

-- Policies for beneficios
drop policy if exists "Leitura de beneficios para autenticados" on public.beneficios;
create policy "Leitura de beneficios para autenticados"
  on public.beneficios for select
  to authenticated
  using (true);

drop policy if exists "Escrita de beneficios restrita a coordenadora de RH e Superuser" on public.beneficios;
create policy "Escrita de beneficios restrita a coordenadora de RH e Superuser"
  on public.beneficios for all
  to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com')
  with check (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

-- Policies for colaborador_beneficios
drop policy if exists "Leitura de colaborador_beneficios para autenticados" on public.colaborador_beneficios;
create policy "Leitura de colaborador_beneficios para autenticados"
  on public.colaborador_beneficios for select
  to authenticated
  using (true);

drop policy if exists "Escrita de colaborador_beneficios restrita a coordenadora de RH e Superuser" on public.colaborador_beneficios;
create policy "Escrita de colaborador_beneficios restrita a coordenadora de RH e Superuser"
  on public.colaborador_beneficios for all
  to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com')
  with check (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

-- Seed default benefits
insert into public.beneficios (nome, tipo, valor_padrao, descricao)
values
  ('Vale Alimentação (VR/VA)', 'adicional', 450.00, 'Auxílio alimentação mensal para dias trabalhados'),
  ('Plano de Saúde Unimed', 'desconto', 180.00, 'Coparticipação do plano de saúde corporativo'),
  ('Vale Transporte (VT)', 'adicional', 220.00, 'Auxílio deslocamento diário'),
  ('Auxílio Creche', 'adicional', 150.00, 'Auxílio para colaboradores com filhos até 5 anos'),
  ('Seguro de Vida', 'desconto', 25.00, 'Seguro de vida em grupo opcional')
on conflict (nome) do nothing;

-- 3. Cleanup fictitious entries from public.indicadores_trabalhistas
delete from public.indicadores_trabalhistas 
where tipo in ('Processo Trabalhista', 'Acidente de Trabalho');
