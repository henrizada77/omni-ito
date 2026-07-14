-- ----------------------------------------------------
-- OMNI ITO - SUPABASE DATABASE CONFIGURATION & HELPER
-- ----------------------------------------------------

-- 1. Table structure for user profiles (public.perfis)
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  cargo text not null default 'ti', -- 'coordenadora_rh' ou 'ti'
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint check_cargo check (cargo in ('coordenadora_rh', 'ti'))
);

-- Enable RLS for profiles
alter table public.perfis enable row level security;

-- Create policies for profiles
drop policy if exists "Permitir leitura de perfis para autenticados" on public.perfis;
create policy "Permitir leitura de perfis para autenticados"
  on public.perfis for select
  to authenticated
  using (true);

drop policy if exists "Permitir alteracao do proprio perfil" on public.perfis;
create policy "Permitir alteracao do proprio perfil"
  on public.perfis for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 2. Helper function to fetch the current user's role securely and prevent RLS recursion
create or replace function public.get_user_role()
returns text as $$
declare
  user_role text;
begin
  select cargo into user_role
  from public.perfis
  where id = auth.uid();
  return user_role;
end;
$$ language plpgsql security definer set search_path = public;

-- 3. Document Models Table (public.modelos_documentos)
create table if not exists public.modelos_documentos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  conteudo text not null, -- Contains dynamic variables like {{nome}}, {{cpf}}, etc.
  assinatura_coordenadas jsonb,
  assinatura_rep_coordenadas jsonb,
  tipo_arquivo text default 'texto',
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for document models
alter table public.modelos_documentos enable row level security;

-- Policies for document models
drop policy if exists "Leitura livre de modelos para autenticados" on public.modelos_documentos;
create policy "Leitura livre de modelos para autenticados"
  on public.modelos_documentos for select
  to authenticated
  using (true);

drop policy if exists "Escrita restrita a coordenadora de RH" on public.modelos_documentos;
create policy "Escrita restrita a coordenadora de RH"
  on public.modelos_documentos for all
  to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com')
  with check (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

-- 4. Document Electronic Signature Table & Hash Verification Trigger
create extension if not exists pgcrypto;

create table if not exists public.documentos_assinados (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid references auth.users(id) on delete set null,
  colaborador_cpf text, -- Linked to collaborator by CPF
  documento_id uuid, -- Reference to the contract/term template
  assinatura_desenhada text not null, -- base64 representation or vector path
  ip_address inet not null,
  user_agent text not null,
  payload_hash text, -- SHA-256 validation hash
  assinado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Function to generate the payload SHA-256 hash automatically on database side
create or replace function public.trg_fn_generate_document_hash()
returns trigger as $$
begin
  new.payload_hash := encode(
    digest(
      coalesce(new.colaborador_id::text, '') || '|' ||
      coalesce(new.assinatura_desenhada, '') || '|' ||
      coalesce(new.ip_address::text, '') || '|' ||
      coalesce(new.user_agent, ''),
      'sha256'
    ),
    'hex'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
drop trigger if exists trg_generate_document_hash on public.documentos_assinados;
create trigger trg_generate_document_hash
  before insert on public.documentos_assinados
  for each row execute function public.trg_fn_generate_document_hash();

-- 5. Trigger to handle new users, validate corporate domain, and create profiles
create or replace function public.trg_fn_handle_new_user()
returns trigger as $$
declare
  email_domain text;
begin
  email_domain := split_part(new.email, '@', 2);
  if email_domain != 'itoinstituto.com.br' and email_domain != 'gmail.com' then
    raise exception 'Cadastro restrito a e-mails corporativos @itoinstituto.com.br ou @gmail.com';
  end if;

  insert into public.perfis (id, email, cargo)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'cargo', 'ti')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function public.trg_fn_handle_new_user();

-- 6. Audit logs table (public.logs_auditoria)
create table if not exists public.logs_auditoria (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references auth.users(id) on delete set null,
  usuario_email text,
  acao text not null, -- ex: 'GERAR_LINK', 'ASSINAR_TERMO', 'DOWNLOAD_PDF', 'LOG-IN'
  detalhes jsonb default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for logs_auditoria
alter table public.logs_auditoria enable row level security;

-- Create policies: Read and Insert permission for authenticated users
drop policy if exists "Permitir leitura de logs para autenticados" on public.logs_auditoria;
create policy "Permitir leitura de logs para autenticados"
  on public.logs_auditoria for select
  to authenticated
  using (true);

drop policy if exists "Permitir insercao de logs para autenticados" on public.logs_auditoria;
create policy "Permitir insercao de logs para autenticados"
  on public.logs_auditoria for insert
  to authenticated
  with check (true);

-- 7. Admission tokens table for public expiration and tracking
create table if not exists public.admission_tokens (
  id uuid primary key default gen_random_uuid(),
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  candidato_nome text not null,
  candidato_email text not null,
  candidato_cpf text,
  candidato_rg text,
  candidato_cargo text,
  candidato_setor text,
  candidato_salario text,
  detalhes jsonb default '{}'::jsonb,
  expira_em timestamp with time zone not null,
  usado_em timestamp with time zone,
  visualizado_em timestamp with time zone,
  status text default 'pendente_preenchimento',
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.admission_tokens enable row level security;

drop policy if exists "Leitura publica de tokens" on public.admission_tokens;
create policy "Leitura publica de tokens"
  on public.admission_tokens for select
  using (true);

drop policy if exists "Update publico de tokens" on public.admission_tokens;
create policy "Update publico de tokens"
  on public.admission_tokens for update
  using (true)
  with check (true);

drop policy if exists "Insercao de tokens restrita a RH e TI" on public.admission_tokens;
create policy "Insercao de tokens restrita a RH e TI"
  on public.admission_tokens for insert
  to authenticated
  with check (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Exclusao de tokens restrita a RH e TI" on public.admission_tokens;
create policy "Exclusao de tokens restrita a RH e TI"
  on public.admission_tokens for delete
  to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

-- 8. Colaboradores Table (public.colaboradores)
create table if not exists public.colaboradores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf text unique not null,
  rg text,
  cargo text,
  setor text,
  salario text,
  status text not null default 'pendente' constraint check_status check (status in ('pendente', 'ativo', 'desligado')),
  data_admissao date not null default current_date,
  documento_identidade_url text,
  comprovante_residencia_url text,
  exame_aso_url text,
  data_desligamento date,
  motivo_desligamento text,
  
  -- Onboarding Checklist Columns
  vale_alimentacao boolean not null default false,
  plano_saude boolean not null default false,
  depily boolean not null default false,
  kit_onboarding boolean not null default false,
  uniforme_sapato boolean not null default false,
  entrega_epi boolean not null default false,
  treinamento_inicial boolean not null default false,
  cadastro_biometria boolean not null default false,
  
  onboarding_progresso integer not null default 0,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for colaboradores
alter table public.colaboradores enable row level security;

-- Policies for colaboradores
drop policy if exists "Leitura de colaboradores para autenticados" on public.colaboradores;
create policy "Leitura de colaboradores para autenticados"
  on public.colaboradores for select
  to authenticated
  using (true);

drop policy if exists "Escrita restrita de colaboradores para superuser e RH" on public.colaboradores;
create policy "Escrita restrita de colaboradores para superuser e RH"
  on public.colaboradores for all
  to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com')
  with check (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

-- Trigger to recalculate onboarding progress and promote status to active at 100%
create or replace function public.trg_fn_recalc_onboarding_progress()
returns trigger as $$
declare
  true_count integer := 0;
  total_items integer := 8;
begin
  if new.vale_alimentacao then true_count := true_count + 1; end if;
  if new.plano_saude then true_count := true_count + 1; end if;
  if new.depily then true_count := true_count + 1; end if;
  if new.kit_onboarding then true_count := true_count + 1; end if;
  if new.uniforme_sapato then true_count := true_count + 1; end if;
  if new.entrega_epi then true_count := true_count + 1; end if;
  if new.treinamento_inicial then true_count := true_count + 1; end if;
  if new.cadastro_biometria then true_count := true_count + 1; end if;

  new.onboarding_progresso := (true_count * 100) / total_items;
  
  if new.status = 'desligado' then
    -- Keep status as 'desligado'
  elsif new.onboarding_progresso = 100 then
    new.status := 'ativo';
  else
    new.status := 'pendente';
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_recalc_onboarding_progress on public.colaboradores;
create trigger trg_recalc_onboarding_progress
  before insert or update on public.colaboradores
  for each row execute function public.trg_fn_recalc_onboarding_progress();

-- 10. Seed data for public.colaboradores (28 records)
insert into public.colaboradores (nome, cpf, rg, cargo, setor, salario, status, data_admissao, vale_alimentacao, plano_saude, depily, kit_onboarding, uniforme_sapato, entrega_epi, treinamento_inicial, cadastro_biometria, onboarding_progresso)
values
  ('Ana Souza Pereira', '123.456.789-00', '98.765.432-1', 'Fisioterapeuta Dermato-Funcional', 'Biomedicina', 'R$ 4.500,00', 'ativo', '2023-04-15', true, true, true, true, true, true, true, true, 100),
  ('Bruno Silva Oliveira', '234.567.890-11', '87.654.321-0', 'Recepcionista', 'Recepção', 'R$ 2.200,00', 'ativo', '2024-02-10', true, true, true, true, true, true, true, true, 100),
  ('Camila Costa Rodrigues', '345.678.901-22', '76.543.210-9', 'Analista Financeiro', 'Financeiro', 'R$ 3.800,00', 'ativo', '2022-09-01', true, true, true, true, true, true, true, true, 100),
  ('Daniel Santos Almeida', '456.789.012-33', '65.432.109-8', 'Operador de Call Center', 'Call Center', 'R$ 1.800,00', 'ativo', '2025-01-20', true, false, true, true, false, true, true, true, 80),
  ('Eduarda Lima Martins', '567.890.123-44', '54.321.098-7', 'Consultora Smartshape', 'Smartshape', 'R$ 3.000,00', 'ativo', '2023-11-05', true, true, true, true, true, true, true, true, 100),
  ('Felipe Alves Carvalho', '678.901.234-55', '43.210.987-6', 'Enfermeiro Esteta', 'Enfermagem', 'R$ 4.800,00', 'ativo', '2021-07-22', true, true, true, true, true, true, true, true, 100),
  ('Gabriela Gomes Pires', '789.012.345-66', '32.109.876-5', 'Farmacêutica Esteta', 'Farmácia', 'R$ 5.200,00', 'ativo', '2022-03-14', true, true, true, true, true, true, true, true, 100),
  ('Hugo Rocha Ferreira', '890.123.456-77', '21.098.765-4', 'Auxiliar de Serviços Gerais', 'Serviços Gerais', 'R$ 1.600,00', 'ativo', '2024-08-18', true, false, true, true, true, true, true, true, 90),
  ('Isabela Mendes Souza', '901.234.567-88', '10.987.654-3', 'Nutricionista', 'Nutrição', 'R$ 4.200,00', 'ativo', '2023-01-10', true, true, true, true, true, true, true, true, 100),
  ('João Castro Silva', '012.345.678-99', '09.876.543-2', 'Fisioterapeuta', 'Biomedicina', 'R$ 4.500,00', 'ativo', '2025-05-12', true, true, true, true, true, true, false, false, 75),
  ('Larissa Nogueira Pinto', '112.233.445-56', '12.345.678-9', 'Recepcionista Líder', 'Recepção', 'R$ 2.600,00', 'ativo', '2022-05-01', true, true, true, true, true, true, true, true, 100),
  ('Mateus Xavier Barbosa', '223.344.556-67', '23.456.789-0', 'Gerente Financeiro', 'Financeiro', 'R$ 6.500,00', 'ativo', '2021-12-01', true, true, true, true, true, true, true, true, 100),
  ('Natália Vieira Ramos', '334.455.667-78', '34.567.890-1', 'Supervisora Call Center', 'Call Center', 'R$ 2.800,00', 'ativo', '2023-08-10', true, true, true, true, true, true, true, true, 100),
  ('Otávio Cardoso Cruz', '445.566.778-89', '45.678.901-2', 'Consultor Smartshape', 'Smartshape', 'R$ 3.000,00', 'ativo', '2024-10-01', true, true, true, true, true, true, true, true, 100),
  ('Patrícia Teixeira Lima', '556.677.889-90', '56.789.012-3', 'Enfermeira Chefe', 'Enfermagem', 'R$ 5.500,00', 'ativo', '2022-01-15', true, true, true, true, true, true, true, true, 100),
  ('Rafael Miranda Fonseca', '667.788.990-01', '67.890.123-4', 'Farmacêutico Esteta', 'Farmácia', 'R$ 5.200,00', 'ativo', '2024-03-01', true, true, true, true, true, true, true, true, 100),
  ('Sabrina Neves Rocha', '778.899.001-12', '78.901.234-5', 'Auxiliar de Limpeza', 'Serviços Gerais', 'R$ 1.600,00', 'ativo', '2025-02-15', true, false, true, true, true, true, true, true, 90),
  ('Thiago Peixoto Antunes', '889.900.112-23', '89.012.345-6', 'Nutricionista Clínico', 'Nutrição', 'R$ 4.200,00', 'ativo', '2023-06-20', true, true, true, true, true, true, true, true, 100),
  ('Vanessa Lins Machado', '990.011.223-34', '90.123.456-7', 'Fisioterapeuta', 'Biomedicina', 'R$ 4.500,00', 'ativo', '2024-06-01', true, true, true, true, true, true, true, true, 100),
  ('William Santos Borges', '001.122.334-45', '01.234.567-8', 'Recepcionista da Noite', 'Recepção', 'R$ 2.300,00', 'ativo', '2023-09-15', true, true, true, true, true, true, true, true, 100),
  ('Yara Fernandes Toledo', '102.203.304-45', '12.345.000-0', 'Analista de Custos', 'Financeiro', 'R$ 3.900,00', 'ativo', '2022-11-20', true, true, true, true, true, true, true, true, 100),
  ('Arthur Novaes Moura', '203.304.405-56', '23.456.111-1', 'Operador de Telemarketing', 'Call Center', 'R$ 1.800,00', 'pendente', '2026-07-01', true, false, false, true, false, true, false, false, 37),
  ('Beatriz Diniz Albuquerque', '304.405.506-67', '34.567.222-2', 'Consultora de Vendas', 'Smartshape', 'R$ 3.000,00', 'ativo', '2024-11-10', true, true, true, true, true, true, true, true, 100),
  ('Caio Moreira Jardim', '405.506.607-78', '45.678.333-3', 'Enfermeiro Residente', 'Enfermagem', 'R$ 4.000,00', 'pendente', '2026-07-08', true, false, false, false, false, false, false, false, 12),
  ('Diana Fontes Silveira', '506.607.708-89', '56.789.444-4', 'Farmacêutica Residente', 'Farmácia', 'R$ 4.500,00', 'ativo', '2025-09-01', true, true, true, true, true, true, true, true, 100),
  ('Erick Ribeiro Viana', '607.708.809-90', '67.890.555-5', 'Auxiliar de Copa', 'Serviços Gerais', 'R$ 1.600,00', 'ativo', '2023-05-18', true, false, true, true, true, true, true, true, 90),
  ('Flávia Correa Godoy', '708.809.900-01', '78.901.666-6', 'Nutricionista Esportiva', 'Nutrição', 'R$ 4.200,00', 'ativo', '2024-07-15', true, true, true, true, true, true, true, true, 100),
  ('Gabriel Cunha Bastos', '809.900.011-12', '89.012.777-7', 'Fisioterapeuta Dermato-Funcional', 'Biomedicina', 'R$ 4.500,00', 'pendente', '2026-07-12', false, false, false, false, false, false, false, false, 0)
on conflict (cpf) do nothing;

-- 11. Storage configuration for private bucket "contratos-assinados"
insert into storage.buckets (id, name, public)
values ('contratos-assinados', 'contratos-assinados', false)
on conflict (id) do nothing;

-- Enable RLS on storage objects
alter table storage.objects enable row level security;

-- Policy: Allow RH/TI full access to 'contratos-assinados' bucket
drop policy if exists "Permitir controle total do bucket contratos-assinados para RH e TI" on storage.objects;
create policy "Permitir controle total do bucket contratos-assinados para RH e TI"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'contratos-assinados' 
    and (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com')
  )
  with check (
    bucket_id = 'contratos-assinados' 
    and (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com')
  );

-- 12. Migrations and Realtime Config for Sprint 6
alter table public.admission_tokens add column if not exists status text default 'pendente_preenchimento';

-- Enable Realtime publication for documentos_assinados (checks if already exists/adds if not)
begin;
  -- Remove if already in publication to avoid duplicates
  alter publication supabase_realtime drop table if exists public.documentos_assinados;
  alter publication supabase_realtime add table public.documentos_assinados;
commit;

-- 13. Migrations and Registros Ponto Config for Sprint 7
alter table public.documentos_assinados add column if not exists status text default 'aguardando_rh';
alter table public.documentos_assinados add column if not exists assinatura_representante text;
alter table public.documentos_assinados add column if not exists url_arquivo text;
alter table public.documentos_assinados add column if not exists titulo text;
alter table public.documentos_assinados add column if not exists document_hash text;

create table if not exists public.registros_ponto (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid references public.colaboradores(id) on delete cascade,
  tipo text not null constraint check_tipo check (tipo in ('entrada', 'intervalo_saida', 'intervalo_retorno', 'saida')),
  latitude double precision,
  longitude double precision,
  registrado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.registros_ponto enable row level security;

drop policy if exists "Leitura de ponto para autenticados" on public.registros_ponto;
create policy "Leitura de ponto para autenticados"
  on public.registros_ponto for select
  to authenticated
  using (true);

drop policy if exists "Insercao de ponto restrita ao proprio colaborador ou RH" on public.registros_ponto;
create policy "Insercao de ponto restrita ao proprio colaborador ou RH"
  on public.registros_ponto for insert
  to authenticated
  with check (
    public.get_user_role() = 'coordenadora_rh' 
    or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com'
    or exists (
      select 1 from public.colaboradores c 
      where c.id = colaborador_id 
      and c.cpf = (select cpf from public.colaboradores where email = auth.jwt() ->> 'email' limit 1)
    )
  );

-- 14. Migrations for Sprint 8 (Jornada ocorrencias & documentos-envios bucket)
insert into storage.buckets (id, name, public) 
values ('documentos-envios', 'documentos-envios', false)
on conflict (id) do nothing;

drop policy if exists "Permitir controle total do bucket documentos-envios para RH e TI" on storage.objects;
create policy "Permitir controle total do bucket documentos-envios para RH e TI"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'documentos-envios' 
    and (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com')
  )
  with check (
    bucket_id = 'documentos-envios' 
    and (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com')
  );

-- Policy: Candidatos anônimos (formulário público /admissao/:token) podem
-- fazer upload apenas no path admissao/ do bucket documentos-envios
drop policy if exists "Permitir upload de admissao por candidatos anonimos" on storage.objects;
create policy "Permitir upload de admissao por candidatos anonimos"
  on storage.objects for insert
  to anon
  with check (
    bucket_id = 'documentos-envios'
    and (storage.foldername(name))[1] = 'admissao'
  );

create table if not exists public.ocorrencias_jornada (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid references public.colaboradores(id) on delete cascade not null,
  tipo text not null constraint check_ocorrencia_tipo check (tipo in ('Atraso', 'Falta Injustificada', 'Falta Justificada (Atestado)', 'Saída Antecipada', 'Descumprimento de Carga')),
  data_ocorrencia date not null,
  horas_minutos_desvio text,
  justificativa text,
  anexo_url text,
  criado_por uuid references public.perfis(id),
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.ocorrencias_jornada enable row level security;

drop policy if exists "Leitura de ocorrencias para autenticados" on public.ocorrencias_jornada;
create policy "Leitura de ocorrencias para autenticados"
  on public.ocorrencias_jornada for select
  to authenticated
  using (true);

drop policy if exists "Escrita de ocorrencias restrita a coordenadora de RH e Superuser" on public.ocorrencias_jornada;
create policy "Escrita de ocorrencias restrita a coordenadora de RH e Superuser"
  on public.ocorrencias_jornada for all
  to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com')
  with check (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

-- 15. Migrations for Sprint 8 Analytics
-- Add genero and tipo_desligamento to colaboradores table
alter table public.colaboradores add column if not exists genero text check (genero in ('M', 'F'));
alter table public.colaboradores add column if not exists tipo_desligamento text check (tipo_desligamento in ('Voluntario', 'Involuntario'));

-- Update existing colaboradores with genders
update public.colaboradores set genero = 'F' where nome in (
  'Ana Souza Pereira', 'Camila Costa Rodrigues', 'Eduarda Lima Martins', 
  'Gabriela Gomes Pires', 'Isabela Mendes Souza', 'Larissa Nogueira Pinto', 
  'Natália Vieira Ramos', 'Patrícia Teixeira Lima', 'Sabrina Neves Rocha', 
  'Vanessa Lins Machado', 'Yara Fernandes Toledo', 'Beatriz Diniz Albuquerque', 
  'Diana Fontes Silveira', 'Flávia Correa Godoy'
);

update public.colaboradores set genero = 'M' where nome in (
  'Bruno Silva Oliveira', 'Daniel Santos Almeida', 'Felipe Alves Carvalho', 
  'Hugo Rocha Ferreira', 'João Castro Silva', 'Mateus Xavier Barbosa', 
  'Otávio Cardoso Cruz', 'Rafael Miranda Fonseca', 'Thiago Peixoto Antunes', 
  'William Santos Borges', 'Arthur Novaes Moura', 'Caio Moreira Jardim', 
  'Erick Ribeiro Viana', 'Gabriel Cunha Bastos'
);

-- Ensure all remaining/unscheduled active workers get a fallback gender
update public.colaboradores set genero = 'F' where genero is null;



-- Create table public.indicadores_trabalhistas
create table if not exists public.indicadores_trabalhistas (
  id uuid default gen_random_uuid() primary key,
  tipo text check (tipo in ('Processo Trabalhista', 'Acidente de Trabalho', 'Pesquisa Beneficio')) not null,
  data_registro date not null,
  status text not null, -- 'Ativo', 'Resolvido', etc.
  detalhes text,
  valor_envolvido numeric,
  tempo_resolucao_dias integer,
  nota_satisfacao integer check (nota_satisfacao between 1 and 5),
  setor text not null,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for indicadores_trabalhistas
alter table public.indicadores_trabalhistas enable row level security;

-- Policies for indicadores_trabalhistas
drop policy if exists "Leitura de indicadores para autenticados" on public.indicadores_trabalhistas;
create policy "Leitura de indicadores para autenticados"
  on public.indicadores_trabalhistas for select
  to authenticated
  using (true);

drop policy if exists "Escrita de indicadores para superuser e RH" on public.indicadores_trabalhistas;
create policy "Escrita de indicadores para superuser e RH"
  on public.indicadores_trabalhistas for all
  to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com')
  with check (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

-- Seed data for public.indicadores_trabalhistas
insert into public.indicadores_trabalhistas (tipo, data_registro, status, detalhes, valor_envolvido, tempo_resolucao_dias, nota_satisfacao, setor)
values
  -- Processos Trabalhistas
  ('Processo Trabalhista', '2025-10-15', 'Ativo', 'Contestação de Horas Extras e Intervalo Intrajornada', 15000.00, null, null, 'Call Center'),
  ('Processo Trabalhista', '2026-02-18', 'Ativo', 'Reclamação de desvio de função', 22000.00, null, null, 'Recepção'),
  ('Processo Trabalhista', '2024-05-10', 'Resolvido', 'Acordo homologado sobre adicional de insalubridade', 12000.00, 180, null, 'Biomedicina'),
  ('Processo Trabalhista', '2025-01-20', 'Resolvido', 'Acordo extrajudicial de verbas rescisórias', 8500.00, 95, null, 'Smartshape'),
  
  -- Acidentes de Trabalho
  ('Acidente de Trabalho', '2026-01-12', 'Resolvido', 'Queda de mesma altura na recepção (torção de tornozelo)', 800.00, null, null, 'Recepção'),
  ('Acidente de Trabalho', '2025-07-22', 'Resolvido', 'Corte leve com material perfurocortante descartável', 120.00, null, null, 'Enfermagem'),
  ('Acidente de Trabalho', '2026-05-04', 'Ativo', 'Esforço repetitivo grave relatado, aguardando CAT/perícia', 0.00, null, null, 'Call Center'),
  
  -- Pesquisas de Benefícios (satisfação com benefícios)
  ('Pesquisa Beneficio', '2026-06-01', 'Finalizado', 'Pesquisa de clima - Ticket Alimentação', null, null, 4, 'Biomedicina'),
  ('Pesquisa Beneficio', '2026-06-01', 'Finalizado', 'Pesquisa de clima - Plano de Saúde', null, null, 5, 'Biomedicina'),
  ('Pesquisa Beneficio', '2026-06-02', 'Finalizado', 'Pesquisa de clima - Ticket Alimentação', null, null, 3, 'Call Center'),
  ('Pesquisa Beneficio', '2026-06-02', 'Finalizado', 'Pesquisa de clima - Plano de Saúde', null, null, 2, 'Call Center'),
  ('Pesquisa Beneficio', '2026-06-03', 'Finalizado', 'Pesquisa de clima - Ticket Alimentação', null, null, 4, 'Recepção'),
  ('Pesquisa Beneficio', '2026-06-03', 'Finalizado', 'Pesquisa de clima - Plano de Saúde', null, null, 4, 'Recepção'),
  ('Pesquisa Beneficio', '2026-06-04', 'Finalizado', 'Pesquisa de clima - Plano de Saúde', null, null, 5, 'Financeiro'),
  ('Pesquisa Beneficio', '2026-06-04', 'Finalizado', 'Pesquisa de clima - Plano de Saúde', null, null, 4, 'Enfermagem');

-- 16. Migrations for Admission Form/Onboarding
alter table public.colaboradores add column if not exists ficha_admissao jsonb;
alter table public.colaboradores add column if not exists documentos_anexos jsonb;

-- 17. Migrations for Benefits management
create table if not exists public.beneficios (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  tipo text check (tipo in ('adicional', 'desconto')) not null,
  valor_padrao numeric not null,
  descricao text,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.colaborador_beneficios (
  colaborador_id uuid references public.colaboradores(id) on delete cascade not null,
  beneficio_id uuid references public.beneficios(id) on delete cascade not null,
  valor_customizado numeric,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (colaborador_id, beneficio_id)
);

alter table public.beneficios enable row level security;
alter table public.colaborador_beneficios enable row level security;

drop policy if exists "Leitura de beneficios para autenticados" on public.beneficios;
create policy "Leitura de beneficios para autenticados"
  on public.beneficios for select to authenticated using (true);

drop policy if exists "Escrita de beneficios restrita a coordenadora de RH e Superuser" on public.beneficios;
create policy "Escrita de beneficios restrita a coordenadora de RH e Superuser"
  on public.beneficios for all to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Leitura de colaborador_beneficios para autenticados" on public.colaborador_beneficios;
create policy "Leitura de colaborador_beneficios para autenticados"
  on public.colaborador_beneficios for select to authenticated using (true);

drop policy if exists "Escrita de colaborador_beneficios restrita a coordenadora de RH e Superuser" on public.colaborador_beneficios;
create policy "Escrita de colaborador_beneficios restrita a coordenadora de RH e Superuser"
  on public.colaborador_beneficios for all to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

insert into public.beneficios (nome, tipo, valor_padrao, descricao)
values
  ('Vale Alimentação (VR/VA)', 'adicional', 450.00, 'Auxílio alimentação mensal para dias trabalhados'),
  ('Plano de Saúde Unimed', 'desconto', 180.00, 'Coparticipação do plano de saúde corporativo'),
  ('Vale Transporte (VT)', 'desconto', 0.06, 'Desconto legal de 6% do salário base para Vale Transporte'),
  ('Auxílio Creche', 'adicional', 150.00, 'Auxílio para colaboradores com filhos até 5 anos'),
  ('Seguro de Vida', 'desconto', 25.00, 'Seguro de vida em grupo opcional')
on conflict (nome) do nothing;

-- 15. Tabelas de Plano de Carreira e Avaliação de Desempenho
create table if not exists public.planos_carreira (
  id uuid primary key default gen_random_uuid(),
  cargo_atual text not null unique,
  proximo_cargo text not null,
  requisito_tempo_meses integer not null default 12,
  requisito_nota_avaliacao numeric not null default 4.0,
  salario_projetado text not null,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.avaliacoes_desempenho (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid references public.colaboradores(id) on delete cascade not null,
  data_avaliacao date not null default current_date,
  nota numeric not null constraint check_nota check (nota between 1.0 and 5.0),
  comentarios text,
  avaliador_email text,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.planos_carreira enable row level security;
alter table public.avaliacoes_desempenho enable row level security;

drop policy if exists "Leitura de planos_carreira para autenticados" on public.planos_carreira;
create policy "Leitura de planos_carreira para autenticados"
  on public.planos_carreira for select to authenticated using (true);

drop policy if exists "Escrita de planos_carreira para coordenadora_rh" on public.planos_carreira;
create policy "Escrita de planos_carreira para coordenadora_rh"
  on public.planos_carreira for all to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Leitura de avaliacoes_desempenho para autenticados" on public.avaliacoes_desempenho;
create policy "Leitura de avaliacoes_desempenho para autenticados"
  on public.avaliacoes_desempenho for select to authenticated using (true);

drop policy if exists "Escrita de avaliacoes_desempenho para coordenadora_rh" on public.avaliacoes_desempenho;
create policy "Escrita de avaliacoes_desempenho para coordenadora_rh"
  on public.avaliacoes_desempenho for all to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

-- Seeding planos_carreira
insert into public.planos_carreira (cargo_atual, proximo_cargo, requisito_tempo_meses, requisito_nota_avaliacao, salario_projetado)
values
  ('Recepcionista', 'Recepcionista Líder', 12, 4.0, 'R$ 2.800,00'),
  ('Operador de Call Center', 'Supervisor de Atendimento', 12, 4.2, 'R$ 2.600,00'),
  ('Auxiliar de Serviços Gerais', 'Líder de Serviços Gerais', 18, 3.8, 'R$ 2.000,00'),
  ('Fisioterapeuta', 'Fisioterapeuta Especialista', 24, 4.5, 'R$ 5.800,00'),
  ('Fisioterapeuta Dermato-Funcional', 'Fisioterapeuta Dermato-Funcional Especialista', 24, 4.5, 'R$ 5.800,00'),
  ('Enfermeiro Esteta', 'Enfermeiro Esteta Sênior', 24, 4.5, 'R$ 6.200,00'),
  ('Farmacêutica Esteta', 'Farmacêutica Esteta Sênior', 24, 4.5, 'R$ 6.500,00'),
  ('Consultora Smartshape', 'Líder de Unidade Smartshape', 18, 4.2, 'R$ 4.200,00')
on conflict (cargo_atual) do update
set proximo_cargo = excluded.proximo_cargo,
    requisito_tempo_meses = excluded.requisito_tempo_meses,
    requisito_nota_avaliacao = excluded.requisito_nota_avaliacao,
    salario_projetado = excluded.salario_projetado;

