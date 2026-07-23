-- ----------------------------------------------------------------------------
-- SPRINT 29 — MOVIMENTAÇÃO DE PESSOAL (histórico p/ turnover semestral)
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente.
-- Seed = planilha "Colaboradores - admitidos e demitidos 01.2026 a 07.2026".
-- ----------------------------------------------------------------------------

create table if not exists public.movimentacoes_pessoal (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf text,
  cargo text,
  setor text,
  data_admissao date not null,
  data_demissao date,
  tipo_desligamento text,
  origem text not null default 'planilha_2026',
  criado_em timestamptz not null default timezone('utc', now())
);

create index if not exists idx_movimentacoes_admissao on public.movimentacoes_pessoal (data_admissao);
create index if not exists idx_movimentacoes_demissao on public.movimentacoes_pessoal (data_demissao);

alter table public.movimentacoes_pessoal enable row level security;

drop policy if exists "Leitura de movimentacoes para autenticados" on public.movimentacoes_pessoal;
create policy "Leitura de movimentacoes para autenticados"
  on public.movimentacoes_pessoal for select to authenticated using (true);

drop policy if exists "Escrita de movimentacoes restrita ao RH" on public.movimentacoes_pessoal;
create policy "Escrita de movimentacoes restrita ao RH"
  on public.movimentacoes_pessoal for all to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com')
  with check (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

-- Seed idempotente: limpa só o lote da planilha e reinsere.
delete from public.movimentacoes_pessoal where origem = 'planilha_2026';

insert into public.movimentacoes_pessoal (nome, cpf, cargo, setor, data_admissao, data_demissao) values
  -- ATIVOS (data_demissao null)
  ('NAYARA COSTA ARAUJO FONTES', '06617399455', 'COORDENADOR FINANCEIRO', 'Financeiro', '2026-02-02', null),
  ('CALLY HAVENA SALES DA CRUZ', '13740764490', 'ASSISTENTE ADMINISTRATIVO', 'Administrativo', '2026-03-23', null),
  ('LEONARDO JOSE DA SILVA TORRES', '70528510401', 'SERVICOS GERAIS II', 'Serviços Gerais', '2026-05-12', null),
  ('THIAGO HENRIQUE DA SILVA', '11880109484', 'ESTAGIARIO(A)', 'Administrativo', '2026-05-11', null),
  ('SOFIA SABINO MEDEIROS DE LIMA', '11362662402', 'BIOMEDICO (A)', 'Biomedicina', '2026-06-03', null),
  ('RAFAELA ARAUJO SILVA', '06478674436', 'SECRETARIO (A) EXECUTIVO', 'Administrativo', '2026-06-15', null),
  ('LUANA KELLY DA SILVA BRANDÃO', '11473111455', 'SDR', 'Smartshape', '2026-06-15', null),
  ('EWELLYN VITORIA SILVA FONSECA', '11444094467', 'RECEPCIONISTA', 'Recepção', '2026-06-30', null),
  ('DANIELE MARIA DOS SANTOS', '06726087403', 'ESTOQUISTA DE FARMÁCIA', 'Farmácia', '2026-07-13', null),
  ('JOELMA BASTOS CORDEIRO', '04556890403', 'SERVICOS GERAIS', 'Serviços Gerais', '2026-07-17', null),
  -- DEMITIDOS (data_admissao / data_demissao)
  ('LUCIANO SILVA NEGRAO', '04598139439', 'GERENTE ADMINISTRATIVO E FINANCEIRO', 'Financeiro', '2023-08-18', '2026-01-12'),
  ('DAYANA VASCONCELOS DE MELO', '14041976480', 'SERVICOS GERAIS', 'Serviços Gerais', '2024-04-15', '2026-07-15'),
  ('EDUARDO AFONSO SOTERO SALGUEIRO FEITOSA', '11317100450', 'SERVICOS GERAIS', 'Serviços Gerais', '2025-02-07', '2026-04-08'),
  ('GEORGE WILLIAM GOMES COELHO', '10733597432', 'ASSISTENTE ADMINISTRATIVO', 'Administrativo', '2025-03-11', '2026-02-19'),
  ('ESTER CAVALCANTI DA SILVA', '09125275445', 'ASSISTENTE ADMINISTRATIVO', 'Administrativo', '2025-08-11', '2026-01-12'),
  ('ADRYELLE CRISTINA DA SILVA', '11853763489', 'SERVICOS GERAIS', 'Serviços Gerais', '2025-10-20', '2026-05-22'),
  ('BRUNA LUIZA LEE DE DOS SANTOS SILVA', '09218015486', 'ASSISTENTE ADMINISTRATIVO', 'Administrativo', '2026-01-13', '2026-01-19'),
  ('CICERO FRANCISCO DOS SANTOS POSSIDONIO', '09188857441', 'ANALISTA ADMINISTRATIVO', 'Administrativo', '2026-01-14', '2026-03-23'),
  ('YASMIN KAROLLINE VIEIRA GALDINO', '11420915460', 'ASSISTENTE ADMINISTRATIVO', 'Administrativo', '2026-01-26', '2026-01-28'),
  ('TAIS LANE DOS SANTOS', '08606263427', 'ASSISTENTE ADMINISTRATIVO', 'Administrativo', '2026-01-29', '2026-02-03'),
  ('MARTA EDUARDA DE LIMA CARDOSO', '12625374446', 'ASSISTENTE ADMINISTRATIVO', 'Administrativo', '2026-02-10', '2026-03-09'),
  ('DAYANE MARIA BEZERRA DA SILVA', '08102989459', 'ASSISTENTE ADMINISTRATIVO', 'Administrativo', '2026-02-10', '2026-02-24'),
  ('KALLINE CRISTINA SILVA BERNARDO', '11951114442', 'ASSISTENTE ADMINISTRATIVO', 'Administrativo', '2026-02-27', '2026-03-02'),
  ('YURY KARLLA FREITAS BARBOSA RODRIGUES', '11350688444', 'ASSISTENTE ADMINISTRATIVO', 'Administrativo', '2026-03-18', '2026-06-15'),
  ('ANDRESSA DA SILVA', '08468808490', 'ANALISTA ADMINISTRATIVO', 'Administrativo', '2026-03-30', '2026-04-15'),
  ('GABRIEL LOPES ALVARES', '62384423363', 'ESTAGIARIO(A)', 'Administrativo', '2026-04-15', '2026-05-11'),
  ('ANDRESSA FERREIRA DA SILVA', '09813000490', 'ASSISTENTE ADMINISTRATIVO', 'Administrativo', '2026-04-30', '2026-06-15'),
  ('EVANDRO LOPES DA SILVA', '08455480424', 'ANALISTA DE COMPRAS', 'Financeiro', '2026-06-15', '2026-07-14');

NOTIFY pgrst, 'reload schema';
