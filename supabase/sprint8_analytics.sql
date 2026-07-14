-- Migration: Sprint 8 Analytics
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

-- Seed some desligados to test turnover
insert into public.colaboradores (nome, cpf, rg, cargo, setor, salario, status, data_admissao, genero, tipo_desligamento, vale_alimentacao, plano_saude, depily, kit_onboarding, uniforme_sapato, entrega_epi, treinamento_inicial, cadastro_biometria, onboarding_progresso)
values 
  ('Mariana Costa Lima', '111.111.111-11', '11.111.111-1', 'Recepcionista', 'Recepção', 'R$ 2.200,00', 'desligado', '2023-01-15', 'F', 'Voluntario', true, true, true, true, true, true, true, true, 100),
  ('José Carlos Santos', '222.222.222-22', '22.222.222-2', 'Operador de Call Center', 'Call Center', 'R$ 1.800,00', 'desligado', '2024-03-10', 'M', 'Involuntario', true, false, true, true, false, true, true, true, 80),
  ('Renata Souza Santos', '333.333.333-33', '33.333.333-3', 'Fisioterapeuta', 'Biomedicina', 'R$ 4.500,00', 'desligado', '2022-05-20', 'F', 'Voluntario', true, true, true, true, true, true, true, true, 100),
  ('Marcos Vinícius Silva', '444.444.444-44', '44.444.444-4', 'Analista Financeiro', 'Financeiro', 'R$ 3.800,00', 'desligado', '2021-11-01', 'M', 'Involuntario', true, true, true, true, true, true, true, true, 100)
on conflict (cpf) do nothing;

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
