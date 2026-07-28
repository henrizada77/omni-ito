-- ----------------------------------------------------------------------------
-- SPRINT 35 — CATÁLOGO DE CARGOS E TRILHAS A PARTIR DO PLANO GS
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente: pode rodar de novo sem duplicar.
--
-- Fonte: Plano_GS_ITO.xlsx, aba Tabela_Cargos_GS (122 linhas,
-- 42 cargos × níveis I/II/III, grades GS01–GS11).
--
-- Um cargo do catálogo = um par (cargo, nível). "Recepcionista Pleno" é uma
-- linha própria, não um atributo de "Recepcionista": é assim que trilha_degraus
-- consegue representar Júnior → Pleno → Sênior, já que cada degrau referencia
-- um cargo_id distinto.
--
-- faixa_salarial_min/max = Faixa_80 e Faixa_120 da planilha. A amplitude de
-- 80% a 120% do midpoint é o que dá espaço para mérito dentro do mesmo cargo
-- sem precisar promover.
--
-- REGRA DAS TRILHAS: cada degrau paga mais que o anterior (market_100
-- estritamente crescente). Promoção que paga menos não é promoção. Alguns
-- cargos ficaram fora das trilhas por violarem isso — continuam no catálogo
-- com faixa própria, só não estão numa escada. Exemplo: Supervisor de
-- Atendimento Júnior (3000) paga menos que Recepcionista Sênior (3393).
-- ----------------------------------------------------------------------------

-- 1. Colunas novas em cargos: a planilha traz grade, nível, mercado e fonte,
--    que não tinham onde morar no schema da sprint13.
alter table public.cargos add column if not exists gs text;
alter table public.cargos add column if not exists nivel text;
alter table public.cargos add column if not exists nivel_nome text;
alter table public.cargos add column if not exists grupo text;
alter table public.cargos add column if not exists market_100 numeric;
alter table public.cargos add column if not exists piso_legal numeric;
alter table public.cargos add column if not exists fonte_pesquisa text;

comment on column public.cargos.gs is 'Grade salarial (GS01–GS11) do Plano GS.';
comment on column public.cargos.market_100 is 'Midpoint da faixa: 100% do mercado pesquisado para Maceió/AL.';
comment on column public.cargos.piso_legal is 'Piso legal ou de convenção. Pode ficar muito abaixo do mercado.';
comment on column public.cargos.fonte_pesquisa is 'URL da pesquisa salarial que originou o market_100.';

-- 2. Cargos antigos (seed da sprint13, sem nível) saem de circulação.
--    ativo=false em vez de delete: promocoes e trilha_degraus referenciam
--    cargo por FK com on delete restrict — apagar quebraria histórico.
update public.cargos set ativo = false where nivel is null;

-- 3. Catálogo vindo da planilha.
insert into public.cargos
  (titulo, setor, grupo, gs, nivel, nivel_nome, faixa_salarial_min, faixa_salarial_max, market_100, piso_legal, fonte_pesquisa, ativo)
values
  ('Aprendiz Sênior', 'Entrada', 'Entrada', 'GS01', 'III', 'Sênior', 1621.00, 2431.50, 2026.25, 1621.00, 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/decreto/d12797.htm', true),
  ('Atendente de Telemarketing Júnior', 'Atendimento', 'Atendimento', 'GS01', 'I', 'Júnior', 1621.00, 2431.50, 2026.25, 1621.00, 'https://www.salario.com.br/profissao/atendente-de-telemarketing-cbo-422315/maceio-al/', true),
  ('Copeira Júnior', 'Operacional', 'Operacional', 'GS01', 'I', 'Júnior', 1621.00, 2431.50, 2026.25, 1621.00, 'https://www.salario.com.br/profissao/copeiro-cbo-513425/maceio-al/', true),
  ('Serviços Gerais Júnior', 'Operacional', 'Operacional', 'GS01', 'I', 'Júnior', 1635.00, 2452.50, 2043.75, 1621.00, 'https://br.indeed.com/career/auxiliar-de-servi%C3%A7os-gerais/salaries/Alagoas', true),
  ('Assistente de Atendimento Júnior', 'Atendimento', 'Atendimento', 'GS01', 'I', 'Júnior', 1621.00, 2431.50, 2026.25, 1621.00, 'https://www.glassdoor.com/Salaries/macei%C3%B3-al-assistente-de-atendimento-salary-SRCH_IL.0%2C9_IC2443621_KO10%2C35.htm', true),
  ('Atendente de Farmácia Júnior', 'Assistencial', 'Assistencial', 'GS01', 'I', 'Júnior', 1621.00, 2431.50, 2026.25, 1621.00, 'https://www.salario.com.br/profissao/atendente-de-farmacia-balconista-cbo-521130/maceio-al/', true),
  ('Recepcionista Júnior', 'Atendimento', 'Atendimento', 'GS01', 'I', 'Júnior', 1621.00, 2431.50, 2026.25, 1621.00, 'https://www.salario.com.br/profissao/recepcionista-cbo-422105/maceio-al/', true),
  ('Auxiliar de Triagem Júnior', 'Técnico', 'Técnico', 'GS01', 'I', 'Júnior', 1621.00, 2431.50, 2026.25, 1621.00, 'https://www.salario.com.br/profissao/atendente-de-servico-de-saude-cbo-515110/maceio-al/', true),
  ('Assistente de Compras Júnior', 'Suprimentos', 'Suprimentos', 'GS02', 'I', 'Júnior', 1920.00, 2880.00, 2400.00, 1920.00, 'https://www.salario.com.br/profissao/assistente-de-compras-cbo-411010/maceio-al/', true),
  ('Auxiliar Administrativo Júnior', 'Administrativo', 'Administrativo', 'GS02', 'I', 'Júnior', 1793.00, 2689.50, 2241.25, 1621.00, 'https://br.indeed.com/career/auxiliar-administrativo/salaries/Macei%C3%B3--AL', true),
  ('Auxiliar Financeiro Júnior', 'Financeiro', 'Financeiro', 'GS02', 'I', 'Júnior', 1816.10, 2724.16, 2270.13, 1816.10, 'https://www.salario.com.br/profissao/auxiliar-financeiro-cbo-413110/maceio-al/', true),
  ('Consultor de Atendimento Júnior', 'Atendimento', 'Atendimento', 'GS02', 'I', 'Júnior', 1760.00, 2640.00, 2200.00, 1760.00, 'https://www.glassdoor.com.br/Sal%C3%A1rios/alagoas-consultor-sal%C3%A1rio-SRCH_IL.0%2C7_IS3916_KO8%2C17.htm', true),
  ('Assistente Acadêmico Pleno', 'Academico', 'Academico', 'GS02', 'II', 'Pleno', 2080.00, 3120.00, 2600.00, 2080.00, 'https://www.salario.com.br/profissao/assistente-administrativo-cbo-411010/maceio-al/', true),
  ('Assistente Financeiro Júnior', 'Financeiro', 'Financeiro', 'GS02', 'I', 'Júnior', 2000.00, 3000.00, 2500.00, 2000.00, 'https://www.salario.com.br/profissao/auxiliar-financeiro-cbo-413110/maceio-al/', true),
  ('Copeira Pleno', 'Operacional', 'Operacional', 'GS03', 'II', 'Pleno', 2097.77, 3146.65, 2622.21, 1621.00, 'https://www.salario.com.br/profissao/copeiro-cbo-513425/maceio-al/', true),
  ('Serviços Gerais Pleno', 'Operacional', 'Operacional', 'GS03', 'II', 'Pleno', 2115.88, 3173.82, 2644.85, 1621.00, 'https://br.indeed.com/career/auxiliar-de-servi%C3%A7os-gerais/salaries/Alagoas', true),
  ('Assistente Administrativo Júnior', 'Administrativo', 'Administrativo', 'GS03', 'I', 'Júnior', 2165.00, 3247.50, 2706.25, 2165.00, 'https://www.salario.com.br/profissao/assistente-administrativo-cbo-411010/maceio-al/', true),
  ('Assistente de Atendimento Pleno', 'Atendimento', 'Atendimento', 'GS03', 'II', 'Pleno', 2097.77, 3146.65, 2622.21, 1621.00, 'https://www.glassdoor.com/Salaries/macei%C3%B3-al-assistente-de-atendimento-salary-SRCH_IL.0%2C9_IC2443621_KO10%2C35.htm', true),
  ('Atendente de Farmácia Pleno', 'Assistencial', 'Assistencial', 'GS03', 'II', 'Pleno', 2097.77, 3146.65, 2622.21, 1621.00, 'https://www.salario.com.br/profissao/atendente-de-farmacia-balconista-cbo-521130/maceio-al/', true),
  ('Atendente de Telemarketing Pleno', 'Atendimento', 'Atendimento', 'GS03', 'II', 'Pleno', 2097.77, 3146.65, 2622.21, 1621.00, 'https://www.salario.com.br/profissao/atendente-de-telemarketing-cbo-422315/maceio-al/', true),
  ('Auxiliar Administrativo Pleno', 'Administrativo', 'Administrativo', 'GS03', 'II', 'Pleno', 2320.35, 3480.53, 2900.44, 1621.00, 'https://br.indeed.com/career/auxiliar-administrativo/salaries/Macei%C3%B3--AL', true),
  ('Auxiliar de Enfermagem Júnior', 'Assistencial', 'Assistencial', 'GS03', 'I', 'Júnior', 2375.00, 3562.50, 2968.75, 2375.00, 'https://www.cofen.gov.br/piso-salarial-da-enfermagem/', true),
  ('Consultor de Atendimento Pleno', 'Atendimento', 'Atendimento', 'GS03', 'II', 'Pleno', 2277.65, 3416.47, 2847.06, 1760.00, 'https://www.glassdoor.com.br/Sal%C3%A1rios/alagoas-consultor-sal%C3%A1rio-SRCH_IL.0%2C7_IS3916_KO8%2C17.htm', true),
  ('Recepcionista Pleno', 'Atendimento', 'Atendimento', 'GS03', 'II', 'Pleno', 2097.77, 3146.65, 2622.21, 1621.00, 'https://www.salario.com.br/profissao/recepcionista-cbo-422105/maceio-al/', true),
  ('Assistente de Compras Pleno', 'Suprimentos', 'Suprimentos', 'GS03', 'II', 'Pleno', 2484.70, 3727.06, 3105.88, 1920.00, 'https://www.salario.com.br/profissao/assistente-de-compras-cbo-411010/maceio-al/', true),
  ('Auxiliar de Triagem Pleno', 'Técnico', 'Técnico', 'GS03', 'II', 'Pleno', 2097.77, 3146.65, 2622.21, 1621.00, 'https://www.salario.com.br/profissao/atendente-de-servico-de-saude-cbo-515110/maceio-al/', true),
  ('Auxiliar Financeiro Pleno', 'Financeiro', 'Financeiro', 'GS03', 'II', 'Pleno', 2350.26, 3525.38, 2937.82, 1816.10, 'https://www.salario.com.br/profissao/auxiliar-financeiro-cbo-413110/maceio-al/', true),
  ('Supervisor de Atendimento Júnior', 'Atendimento', 'Atendimento', 'GS03', 'I', 'Júnior', 2400.00, 3600.00, 3000.00, 2369.65, 'https://www.salario.com.br/profissao/supervisor-de-central-de-atendimento-cbo-420135/maceio-al/', true),
  ('Técnico em Farmácia Júnior', 'Assistencial', 'Assistencial', 'GS03', 'I', 'Júnior', 2513.60, 3770.40, 3142.00, 2513.60, 'https://br.indeed.com/career/t%C3%A9cnico-de-farm%C3%A1cia/salaries/Alagoas', true),
  ('Biomédico Júnior', 'Assistencial', 'Assistencial', 'GS03', 'I', 'Júnior', 2560.00, 3840.00, 3200.00, 2560.00, 'https://www.salario.com.br/profissao/biomedico-cbo-221205/maceio-al/', true),
  ('Analista Administrativo Júnior', 'Administrativo', 'Administrativo', 'GS03', 'I', 'Júnior', 2554.65, 3831.97, 3193.31, 2554.65, 'https://www.salario.com.br/profissao/analista-administrativo-cbo-252105/maceio-al/', true),
  ('Analista de Recursos Humanos Júnior', 'RH', 'RH', 'GS03', 'I', 'Júnior', 2290.17, 3435.25, 2862.71, 2290.17, 'https://www.salario.com.br/profissao/analista-de-recursos-humanos-cbo-252405/maceio-al/', true),
  ('Copeira Sênior', 'Operacional', 'Operacional', 'GS04', 'III', 'Sênior', 2714.75, 4072.13, 3393.44, 1621.00, 'https://www.salario.com.br/profissao/copeiro-cbo-513425/maceio-al/', true),
  ('Serviços Gerais Sênior', 'Operacional', 'Operacional', 'GS04', 'III', 'Sênior', 2738.20, 4107.30, 3422.75, 1621.00, 'https://br.indeed.com/career/auxiliar-de-servi%C3%A7os-gerais/salaries/Alagoas', true),
  ('Assistente Administrativo Pleno', 'Administrativo', 'Administrativo', 'GS04', 'II', 'Pleno', 2801.77, 4202.65, 3502.21, 2165.00, 'https://www.salario.com.br/profissao/assistente-administrativo-cbo-411010/maceio-al/', true),
  ('Assistente de Atendimento Sênior', 'Atendimento', 'Atendimento', 'GS04', 'III', 'Sênior', 2714.75, 4072.13, 3393.44, 1621.00, 'https://www.glassdoor.com/Salaries/macei%C3%B3-al-assistente-de-atendimento-salary-SRCH_IL.0%2C9_IC2443621_KO10%2C35.htm', true),
  ('Atendente de Farmácia Sênior', 'Assistencial', 'Assistencial', 'GS04', 'III', 'Sênior', 2714.75, 4072.13, 3393.44, 1621.00, 'https://www.salario.com.br/profissao/atendente-de-farmacia-balconista-cbo-521130/maceio-al/', true),
  ('Atendente de Telemarketing Sênior', 'Atendimento', 'Atendimento', 'GS04', 'III', 'Sênior', 2714.75, 4072.13, 3393.44, 1621.00, 'https://www.salario.com.br/profissao/atendente-de-telemarketing-cbo-422315/maceio-al/', true),
  ('Auxiliar Administrativo Sênior', 'Administrativo', 'Administrativo', 'GS04', 'III', 'Sênior', 3002.81, 4504.21, 3753.51, 1621.00, 'https://br.indeed.com/career/auxiliar-administrativo/salaries/Macei%C3%B3--AL', true),
  ('Auxiliar de Enfermagem Pleno', 'Assistencial', 'Assistencial', 'GS04', 'II', 'Pleno', 3073.53, 4610.29, 3841.91, 2375.00, 'https://www.cofen.gov.br/piso-salarial-da-enfermagem/', true),
  ('Consultor de Atendimento Sênior', 'Atendimento', 'Atendimento', 'GS04', 'III', 'Sênior', 2947.54, 4421.32, 3684.43, 1760.00, 'https://www.glassdoor.com.br/Sal%C3%A1rios/alagoas-consultor-sal%C3%A1rio-SRCH_IL.0%2C7_IS3916_KO8%2C17.htm', true),
  ('Recepcionista Sênior', 'Atendimento', 'Atendimento', 'GS04', 'III', 'Sênior', 2714.75, 4072.13, 3393.44, 1621.00, 'https://www.salario.com.br/profissao/recepcionista-cbo-422105/maceio-al/', true),
  ('Supervisor de Atendimento Pleno', 'Atendimento', 'Atendimento', 'GS04', 'II', 'Pleno', 3105.88, 4658.82, 3882.35, 2369.65, 'https://www.salario.com.br/profissao/supervisor-de-central-de-atendimento-cbo-420135/maceio-al/', true),
  ('Técnico em Estética Júnior', 'Assistencial', 'Assistencial', 'GS04', 'I', 'Júnior', 2624.00, 3936.00, 3280.00, 2624.00, 'https://br.indeed.com/career/esteticista-facial-e-corporal/salaries/Macei%C3%B3--AL', true),
  ('Analista de Marketing Júnior', 'Marketing', 'Marketing', 'GS04', 'I', 'Júnior', 2983.75, 4475.63, 3729.69, 2983.75, 'https://www.salario.com.br/profissao/analista-de-marketing-cbo-142335/maceio-al/', true),
  ('Assistente Acadêmico Sênior', 'Academico', 'Academico', 'GS04', 'III', 'Sênior', 2691.77, 4037.65, 3364.71, 2080.00, 'https://www.salario.com.br/profissao/assistente-administrativo-cbo-411010/maceio-al/', true),
  ('Assistente Financeiro Pleno', 'Financeiro', 'Financeiro', 'GS04', 'II', 'Pleno', 2588.23, 3882.35, 3235.29, 2000.00, 'https://www.salario.com.br/profissao/auxiliar-financeiro-cbo-413110/maceio-al/', true),
  ('Auxiliar de Triagem Sênior', 'Técnico', 'Técnico', 'GS04', 'III', 'Sênior', 2714.75, 4072.13, 3393.44, 1621.00, 'https://www.salario.com.br/profissao/atendente-de-servico-de-saude-cbo-515110/maceio-al/', true),
  ('Auxiliar Financeiro Sênior', 'Financeiro', 'Financeiro', 'GS04', 'III', 'Sênior', 3041.50, 4562.26, 3801.88, 1816.10, 'https://www.salario.com.br/profissao/auxiliar-financeiro-cbo-413110/maceio-al/', true),
  ('Comprador Júnior', 'Suprimentos', 'Suprimentos', 'GS04', 'I', 'Júnior', 2720.00, 4080.00, 3400.00, 2720.00, 'https://www.salario.com.br/profissao/comprador-cbo-354205/maceio-al/', true),
  ('Nutricionista Júnior', 'Assistencial', 'Assistencial', 'GS04', 'I', 'Júnior', 2607.20, 3910.80, 3259.00, 2607.20, 'https://br.indeed.com/career/nutricionista/salaries/Macei%C3%B3--AL', true),
  ('Supervisor de RH Júnior', 'RH', 'RH', 'GS04', 'I', 'Júnior', 3040.00, 4560.00, 3800.00, 3039.73, 'https://www.salario.com.br/profissao/supervisor-administrativo-cbo-410105/maceio-al/', true),
  ('Supervisor de Serviços Gerais Júnior', 'Operacional', 'Operacional', 'GS04', 'I', 'Júnior', 3040.00, 4560.00, 3800.00, 3039.73, 'https://www.salario.com.br/profissao/supervisor-de-secao-de-servicos-gerais-cbo-410105/maceio-al/', true),
  ('Analista Acadêmico Pleno', 'Academico', 'Academico', 'GS04', 'II', 'Pleno', 3040.00, 4560.00, 3800.00, 3040.00, 'https://www.salario.com.br/profissao/analista-administrativo-cbo-252105/maceio-al/', true),
  ('Analista de Recursos Humanos Pleno', 'RH', 'RH', 'GS04', 'II', 'Pleno', 2963.74, 4445.62, 3704.68, 2290.17, 'https://www.salario.com.br/profissao/analista-de-recursos-humanos-cbo-252405/maceio-al/', true),
  ('Auxiliar de Enfermagem Sênior', 'Assistencial', 'Assistencial', 'GS05', 'III', 'Sênior', 3977.51, 5966.27, 4971.89, 2375.00, 'https://www.cofen.gov.br/piso-salarial-da-enfermagem/', true),
  ('Técnico em Estética Pleno', 'Assistencial', 'Assistencial', 'GS05', 'II', 'Pleno', 3395.77, 5093.65, 4244.71, 2624.00, 'https://br.indeed.com/career/esteticista-facial-e-corporal/salaries/Macei%C3%B3--AL', true),
  ('Assistente Administrativo Sênior', 'Administrativo', 'Administrativo', 'GS05', 'III', 'Sênior', 3625.82, 5438.72, 4532.27, 2165.00, 'https://www.salario.com.br/profissao/assistente-administrativo-cbo-411010/maceio-al/', true),
  ('Assistente de Compras Sênior', 'Suprimentos', 'Suprimentos', 'GS05', 'III', 'Sênior', 3215.50, 4823.26, 4019.38, 1920.00, 'https://www.salario.com.br/profissao/assistente-de-compras-cbo-411010/maceio-al/', true),
  ('Biomédico Pleno', 'Assistencial', 'Assistencial', 'GS05', 'II', 'Pleno', 3312.94, 4969.42, 4141.18, 2560.00, 'https://www.salario.com.br/profissao/biomedico-cbo-221205/maceio-al/', true),
  ('Técnico de Enfermagem Júnior', 'Assistencial', 'Assistencial', 'GS05', 'I', 'Júnior', 3325.00, 4987.50, 4156.25, 3325.00, 'https://www.cofen.gov.br/piso-salarial-da-enfermagem/', true),
  ('Técnico em Farmácia Pleno', 'Assistencial', 'Assistencial', 'GS05', 'II', 'Pleno', 3252.90, 4879.34, 4066.12, 2513.60, 'https://br.indeed.com/career/t%C3%A9cnico-de-farm%C3%A1cia/salaries/Alagoas', true),
  ('Analista de Marketing Pleno', 'Marketing', 'Marketing', 'GS05', 'II', 'Pleno', 3861.33, 5791.99, 4826.66, 2983.75, 'https://www.salario.com.br/profissao/analista-de-marketing-cbo-142335/maceio-al/', true),
  ('Assistente Financeiro Sênior', 'Financeiro', 'Financeiro', 'GS05', 'III', 'Sênior', 3349.48, 5024.22, 4186.85, 2000.00, 'https://www.salario.com.br/profissao/auxiliar-financeiro-cbo-413110/maceio-al/', true),
  ('Comprador Pleno', 'Suprimentos', 'Suprimentos', 'GS05', 'II', 'Pleno', 3520.00, 5280.00, 4400.00, 2720.00, 'https://www.salario.com.br/profissao/comprador-cbo-354205/maceio-al/', true),
  ('Farmacêutico Júnior', 'Assistencial', 'Assistencial', 'GS05', 'I', 'Júnior', 3367.79, 5051.69, 4209.74, 3367.79, 'https://www.salario.com.br/profissao/farmaceutico-cbo-223405/maceio-al/', true),
  ('Nutricionista Pleno', 'Assistencial', 'Assistencial', 'GS05', 'II', 'Pleno', 3374.02, 5061.04, 4217.53, 2607.20, 'https://br.indeed.com/career/nutricionista/salaries/Macei%C3%B3--AL', true),
  ('Supervisor de RH Pleno', 'RH', 'RH', 'GS05', 'II', 'Pleno', 3934.12, 5901.18, 4917.65, 3039.73, 'https://www.salario.com.br/profissao/supervisor-administrativo-cbo-410105/maceio-al/', true),
  ('Supervisor de Serviços Gerais Pleno', 'Operacional', 'Operacional', 'GS05', 'II', 'Pleno', 3934.12, 5901.18, 4917.65, 3039.73, 'https://www.salario.com.br/profissao/supervisor-de-secao-de-servicos-gerais-cbo-410105/maceio-al/', true),
  ('Analista Acadêmico Sênior', 'Academico', 'Academico', 'GS05', 'III', 'Sênior', 3934.12, 5901.18, 4917.65, 3040.00, 'https://www.salario.com.br/profissao/analista-administrativo-cbo-252105/maceio-al/', true),
  ('Analista Administrativo Pleno', 'Administrativo', 'Administrativo', 'GS05', 'II', 'Pleno', 3306.02, 4959.02, 4132.52, 2554.65, 'https://www.salario.com.br/profissao/analista-administrativo-cbo-252105/maceio-al/', true),
  ('Supervisor Financeiro Júnior', 'Financeiro', 'Financeiro', 'GS05', 'I', 'Júnior', 3541.60, 5312.40, 4427.00, 3541.60, 'https://br.indeed.com/career/Supervisor%20Financeiro/salaries/Macei%C3%B3%2C%20AL', true),
  ('Analista de Recursos Humanos Sênior', 'RH', 'RH', 'GS05', 'III', 'Sênior', 3835.44, 5753.16, 4794.30, 2290.17, 'https://www.salario.com.br/profissao/analista-de-recursos-humanos-cbo-252405/maceio-al/', true),
  ('Supervisor de Atendimento Sênior', 'Atendimento', 'Atendimento', 'GS06', 'III', 'Sênior', 4019.38, 6029.06, 5024.22, 2369.65, 'https://www.salario.com.br/profissao/supervisor-de-central-de-atendimento-cbo-420135/maceio-al/', true),
  ('Técnico de Enfermagem Pleno', 'Assistencial', 'Assistencial', 'GS06', 'II', 'Pleno', 4302.94, 6454.42, 5378.68, 3325.00, 'https://www.cofen.gov.br/piso-salarial-da-enfermagem/', true),
  ('Técnico em Estética Sênior', 'Assistencial', 'Assistencial', 'GS06', 'III', 'Sênior', 4394.52, 6591.78, 5493.15, 2624.00, 'https://br.indeed.com/career/esteticista-facial-e-corporal/salaries/Macei%C3%B3--AL', true),
  ('Biomédico Sênior', 'Assistencial', 'Assistencial', 'GS06', 'III', 'Sênior', 4287.34, 6431.00, 5359.17, 2560.00, 'https://www.salario.com.br/profissao/biomedico-cbo-221205/maceio-al/', true),
  ('Técnico em Farmácia Sênior', 'Assistencial', 'Assistencial', 'GS06', 'III', 'Sênior', 4209.62, 6314.44, 5262.03, 2513.60, 'https://br.indeed.com/career/t%C3%A9cnico-de-farm%C3%A1cia/salaries/Alagoas', true),
  ('Comprador Sênior', 'Suprimentos', 'Suprimentos', 'GS06', 'III', 'Sênior', 4555.30, 6832.94, 5694.12, 2720.00, 'https://www.salario.com.br/profissao/comprador-cbo-354205/maceio-al/', true),
  ('Enfermeiro Júnior', 'Assistencial', 'Assistencial', 'GS06', 'I', 'Júnior', 4750.00, 7125.00, 5937.50, 4750.00, 'https://www.cofen.gov.br/piso-salarial-da-enfermagem/', true),
  ('Farmacêutico Pleno', 'Assistencial', 'Assistencial', 'GS06', 'II', 'Pleno', 4358.32, 6537.48, 5447.90, 3367.79, 'https://www.salario.com.br/profissao/farmaceutico-cbo-223405/maceio-al/', true),
  ('Nutricionista Sênior', 'Assistencial', 'Assistencial', 'GS06', 'III', 'Sênior', 4366.38, 6549.58, 5457.98, 2607.20, 'https://br.indeed.com/career/nutricionista/salaries/Macei%C3%B3--AL', true),
  ('Analista Administrativo Sênior', 'Administrativo', 'Administrativo', 'GS06', 'III', 'Sênior', 4278.38, 6417.56, 5347.97, 2554.65, 'https://www.salario.com.br/profissao/analista-administrativo-cbo-252105/maceio-al/', true),
  ('Supervisor Financeiro Pleno', 'Financeiro', 'Financeiro', 'GS06', 'II', 'Pleno', 4583.25, 6874.87, 5729.06, 3541.60, 'https://br.indeed.com/career/Supervisor%20Financeiro/salaries/Macei%C3%B3%2C%20AL', true),
  ('Especialista de Enfermagem Júnior', 'Assistencial', 'Assistencial', 'GS06', 'I', 'Júnior', 4750.00, 7125.00, 5937.50, 4750.00, 'https://www.cofen.gov.br/piso-salarial-da-enfermagem/', true),
  ('Coordenador Administrativo Júnior', 'Gestão', 'Gestão', 'GS07', 'I', 'Júnior', 5760.00, 8640.00, 7200.00, 3040.00, 'https://www.salario.com.br/profissao/coordenador-administrativo-cbo-410105/maceio-al/', true),
  ('Coordenador de Processos Júnior', 'Gestão', 'Gestão', 'GS07', 'I', 'Júnior', 5920.00, 8880.00, 7400.00, 3040.00, 'https://www.salario.com.br/profissao/coordenador-administrativo-cbo-410105/maceio-al/', true),
  ('Coordenador de Atendimento Júnior', 'Gestão', 'Gestão', 'GS07', 'I', 'Júnior', 5760.00, 8640.00, 7200.00, 3040.00, 'https://www.salario.com.br/profissao/coordenador-administrativo-cbo-410105/maceio-al/', true),
  ('Técnico de Enfermagem Sênior', 'Assistencial', 'Assistencial', 'GS07', 'III', 'Sênior', 5568.51, 8352.77, 6960.64, 3325.00, 'https://www.cofen.gov.br/piso-salarial-da-enfermagem/', true),
  ('Analista de Marketing Sênior', 'Marketing', 'Marketing', 'GS07', 'III', 'Sênior', 4997.01, 7495.51, 6246.26, 2983.75, 'https://www.salario.com.br/profissao/analista-de-marketing-cbo-142335/maceio-al/', true),
  ('Supervisor de RH Sênior', 'RH', 'RH', 'GS07', 'III', 'Sênior', 5091.21, 7636.81, 6364.01, 3039.73, 'https://www.salario.com.br/profissao/supervisor-administrativo-cbo-410105/maceio-al/', true),
  ('Supervisor de Serviços Gerais Sênior', 'Operacional', 'Operacional', 'GS07', 'III', 'Sênior', 5091.21, 7636.81, 6364.01, 3039.73, 'https://www.salario.com.br/profissao/supervisor-de-secao-de-servicos-gerais-cbo-410105/maceio-al/', true),
  ('Farmacêutico Sênior', 'Assistencial', 'Assistencial', 'GS07', 'III', 'Sênior', 5640.18, 8460.26, 7050.22, 3367.79, 'https://www.salario.com.br/profissao/farmaceutico-cbo-223405/maceio-al/', true),
  ('Supervisor Financeiro Sênior', 'Financeiro', 'Financeiro', 'GS07', 'III', 'Sênior', 5931.26, 8896.90, 7414.08, 3541.60, 'https://br.indeed.com/career/Supervisor%20Financeiro/salaries/Macei%C3%B3%2C%20AL', true),
  ('Enfermeiro Pleno', 'Assistencial', 'Assistencial', 'GS08', 'II', 'Pleno', 6147.06, 9220.58, 7683.82, 4750.00, 'https://www.cofen.gov.br/piso-salarial-da-enfermagem/', true),
  ('Especialista de Enfermagem Pleno', 'Assistencial', 'Assistencial', 'GS08', 'II', 'Pleno', 6147.06, 9220.58, 7683.82, 4750.00, 'https://www.cofen.gov.br/piso-salarial-da-enfermagem/', true),
  ('Coordenador Administrativo Pleno', 'Gestão', 'Gestão', 'GS09', 'II', 'Pleno', 7454.12, 11181.18, 9317.65, 3040.00, 'https://www.salario.com.br/profissao/coordenador-administrativo-cbo-410105/maceio-al/', true),
  ('Coordenador de Atendimento Pleno', 'Gestão', 'Gestão', 'GS09', 'II', 'Pleno', 7454.12, 11181.18, 9317.65, 3040.00, 'https://www.salario.com.br/profissao/coordenador-administrativo-cbo-410105/maceio-al/', true),
  ('Coordenador de Processos Pleno', 'Gestão', 'Gestão', 'GS09', 'II', 'Pleno', 7661.18, 11491.76, 9576.47, 3040.00, 'https://www.salario.com.br/profissao/coordenador-administrativo-cbo-410105/maceio-al/', true),
  ('Gerente Administrativo Júnior', 'Gestão', 'Gestão', 'GS09', 'I', 'Júnior', 8400.00, 12600.00, 10500.00, 8400.00, 'https://www.salario.com.br/profissao/gerente-administrativo-cbo-142105/maceio-al/', true),
  ('Gerente Financeiro Júnior', 'Financeiro', 'Financeiro', 'GS09', 'I', 'Júnior', 8800.00, 13200.00, 11000.00, 4725.60, 'https://www.salario.com.br/profissao/gerente-de-financas-cbo-142115/maceio-al/', true),
  ('Gerente Geral Júnior', 'Gestão', 'Gestão', 'GS09', 'I', 'Júnior', 9600.00, 14400.00, 12000.00, 9600.00, 'https://www.salario.com.br/profissao/diretor-geral-de-empresa-e-organizacoes-cbo-131120/maceio-al/', true),
  ('Gerente Operacional Júnior', 'Gestão', 'Gestão', 'GS09', 'I', 'Júnior', 8560.00, 12840.00, 10700.00, 4675.00, 'https://br.indeed.com/career/gerente-de-opera%C3%A7%C3%B5es/salaries/Alagoas', true),
  ('Enfermeiro Sênior', 'Assistencial', 'Assistencial', 'GS09', 'III', 'Sênior', 7955.02, 11932.52, 9943.77, 4750.00, 'https://www.cofen.gov.br/piso-salarial-da-enfermagem/', true),
  ('Especialista de Enfermagem Sênior', 'Assistencial', 'Assistencial', 'GS09', 'III', 'Sênior', 7955.02, 11932.52, 9943.77, 4750.00, 'https://www.cofen.gov.br/piso-salarial-da-enfermagem/', true),
  ('Gerente Administrativo Pleno', 'Gestão', 'Gestão', 'GS10', 'II', 'Pleno', 10870.59, 16305.89, 13588.24, 8400.00, 'https://www.salario.com.br/profissao/gerente-administrativo-cbo-142105/maceio-al/', true),
  ('Gerente Operacional Pleno', 'Gestão', 'Gestão', 'GS10', 'II', 'Pleno', 11077.65, 16616.47, 13847.06, 4675.00, 'https://br.indeed.com/career/gerente-de-opera%C3%A7%C3%B5es/salaries/Alagoas', true),
  ('Coordenador Administrativo Sênior', 'Gestão', 'Gestão', 'GS10', 'III', 'Sênior', 9646.50, 14469.76, 12058.13, 3040.00, 'https://www.salario.com.br/profissao/coordenador-administrativo-cbo-410105/maceio-al/', true),
  ('Coordenador de Atendimento Sênior', 'Gestão', 'Gestão', 'GS10', 'III', 'Sênior', 9646.50, 14469.76, 12058.13, 3040.00, 'https://www.salario.com.br/profissao/coordenador-administrativo-cbo-410105/maceio-al/', true),
  ('Coordenador de Processos Sênior', 'Gestão', 'Gestão', 'GS10', 'III', 'Sênior', 9914.46, 14871.70, 12393.08, 3040.00, 'https://www.salario.com.br/profissao/coordenador-administrativo-cbo-410105/maceio-al/', true),
  ('Gerente Financeiro Pleno', 'Financeiro', 'Financeiro', 'GS10', 'II', 'Pleno', 11388.23, 17082.35, 14235.29, 4725.60, 'https://www.salario.com.br/profissao/gerente-de-financas-cbo-142115/maceio-al/', true),
  ('Gerente Geral Pleno', 'Gestão', 'Gestão', 'GS11', 'II', 'Pleno', 12423.53, 18635.29, 15529.41, 9600.00, 'https://www.salario.com.br/profissao/diretor-geral-de-empresa-e-organizacoes-cbo-131120/maceio-al/', true),
  ('Gerente Administrativo Sênior', 'Gestão', 'Gestão', 'GS11', 'III', 'Sênior', 14067.82, 21101.74, 17584.78, 8400.00, 'https://www.salario.com.br/profissao/gerente-administrativo-cbo-142105/maceio-al/', true),
  ('Gerente Geral Sênior', 'Gestão', 'Gestão', 'GS11', 'III', 'Sênior', 16077.51, 24116.27, 20096.89, 9600.00, 'https://www.salario.com.br/profissao/diretor-geral-de-empresa-e-organizacoes-cbo-131120/maceio-al/', true),
  ('Gerente Operacional Sênior', 'Gestão', 'Gestão', 'GS11', 'III', 'Sênior', 14335.78, 21503.66, 17919.72, 4675.00, 'https://br.indeed.com/career/gerente-de-opera%C3%A7%C3%B5es/salaries/Alagoas', true),
  ('Gerente Financeiro Sênior', 'Financeiro', 'Financeiro', 'GS11', 'III', 'Sênior', 14737.72, 22106.58, 18422.15, 4725.60, 'https://www.salario.com.br/profissao/gerente-de-financas-cbo-142115/maceio-al/', true),
  ('Diretor Administrativo Júnior', 'Gestão', 'Gestão', 'GS11', 'I', 'Júnior', 16400.00, 24600.00, 20500.00, 16400.00, 'https://www.salario.com.br/profissao/diretor-administrativo-cbo-123105/', true),
  ('Diretor Administrativo Pleno', 'Gestão', 'Gestão', 'GS11', 'II', 'Pleno', 21223.53, 31835.29, 26529.41, 16400.00, 'https://www.salario.com.br/profissao/diretor-administrativo-cbo-123105/', true),
  ('Diretor Administrativo Sênior', 'Gestão', 'Gestão', 'GS11', 'III', 'Sênior', 27465.74, 41198.62, 34332.18, 16400.00, 'https://www.salario.com.br/profissao/diretor-administrativo-cbo-123105/', true),
  ('Diretor Clínico Júnior', 'Gestão', 'Gestão', 'GS11', 'I', 'Júnior', 16800.00, 25200.00, 21000.00, 15767.03, 'https://www.salario.com.br/profissao/diretor-clinico-cbo-131205/', true),
  ('Diretor Clínico Pleno', 'Gestão', 'Gestão', 'GS11', 'II', 'Pleno', 21741.18, 32611.76, 27176.47, 15767.03, 'https://www.salario.com.br/profissao/diretor-clinico-cbo-131205/', true),
  ('Diretor Clínico Sênior', 'Gestão', 'Gestão', 'GS11', 'III', 'Sênior', 28135.64, 42203.46, 35169.55, 15767.03, 'https://www.salario.com.br/profissao/diretor-clinico-cbo-131205/', true)
on conflict (titulo) do update set
  setor = excluded.setor,
  grupo = excluded.grupo,
  gs = excluded.gs,
  nivel = excluded.nivel,
  nivel_nome = excluded.nivel_nome,
  faixa_salarial_min = excluded.faixa_salarial_min,
  faixa_salarial_max = excluded.faixa_salarial_max,
  market_100 = excluded.market_100,
  piso_legal = excluded.piso_legal,
  fonte_pesquisa = excluded.fonte_pesquisa,
  ativo = true;

-- 4. Trilhas de carreira (20).
--    Requisitos são ponto de partida editável pelo RH: 12 meses para subir de
--    nível no mesmo cargo, 24 meses e nota maior para mudar de cargo, porque
--    trocar de função exige mais do que tempo de casa.

insert into public.trilhas_carreira (nome, descricao) values ('Atendimento e Recepção', 'Da recepção à coordenação da área de atendimento.')
on conflict (nome) do update set descricao = excluded.descricao;

insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 1, 0, 0.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Atendimento e Recepção' and c.titulo = 'Recepcionista Júnior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 2, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Atendimento e Recepção' and c.titulo = 'Recepcionista Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 3, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Atendimento e Recepção' and c.titulo = 'Recepcionista Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 4, 24, 4.5
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Atendimento e Recepção' and c.titulo = 'Supervisor de Atendimento Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 5, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Atendimento e Recepção' and c.titulo = 'Supervisor de Atendimento Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 6, 24, 4.5
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Atendimento e Recepção' and c.titulo = 'Coordenador de Atendimento Júnior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 7, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Atendimento e Recepção' and c.titulo = 'Coordenador de Atendimento Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 8, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Atendimento e Recepção' and c.titulo = 'Coordenador de Atendimento Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;

insert into public.trilhas_carreira (nome, descricao) values ('Telemarketing e Consultoria', 'Carreira de quem entra pelo telemarketing e evolui para consultoria e supervisão.')
on conflict (nome) do update set descricao = excluded.descricao;

insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 1, 0, 0.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Telemarketing e Consultoria' and c.titulo = 'Atendente de Telemarketing Júnior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 2, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Telemarketing e Consultoria' and c.titulo = 'Atendente de Telemarketing Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 3, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Telemarketing e Consultoria' and c.titulo = 'Atendente de Telemarketing Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 4, 24, 4.5
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Telemarketing e Consultoria' and c.titulo = 'Consultor de Atendimento Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 5, 24, 4.5
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Telemarketing e Consultoria' and c.titulo = 'Supervisor de Atendimento Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;

insert into public.trilhas_carreira (nome, descricao) values ('Enfermagem — Carreira Técnica', 'Trilha de nível técnico, sem exigência de graduação em enfermagem.')
on conflict (nome) do update set descricao = excluded.descricao;

insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 1, 0, 0.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Enfermagem — Carreira Técnica' and c.titulo = 'Auxiliar de Enfermagem Júnior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 2, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Enfermagem — Carreira Técnica' and c.titulo = 'Auxiliar de Enfermagem Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 3, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Enfermagem — Carreira Técnica' and c.titulo = 'Auxiliar de Enfermagem Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 4, 24, 4.5
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Enfermagem — Carreira Técnica' and c.titulo = 'Técnico de Enfermagem Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 5, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Enfermagem — Carreira Técnica' and c.titulo = 'Técnico de Enfermagem Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;

insert into public.trilhas_carreira (nome, descricao) values ('Enfermagem — Carreira Superior', 'Trilha para enfermeiros com graduação e registro no COREN.')
on conflict (nome) do update set descricao = excluded.descricao;

insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 1, 0, 0.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Enfermagem — Carreira Superior' and c.titulo = 'Enfermeiro Júnior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 2, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Enfermagem — Carreira Superior' and c.titulo = 'Enfermeiro Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 3, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Enfermagem — Carreira Superior' and c.titulo = 'Enfermeiro Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;

insert into public.trilhas_carreira (nome, descricao) values ('Enfermagem — Especialização', 'Ramo paralelo ao de enfermeiro, para quem segue por especialização clínica.')
on conflict (nome) do update set descricao = excluded.descricao;

insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 1, 0, 0.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Enfermagem — Especialização' and c.titulo = 'Especialista de Enfermagem Júnior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 2, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Enfermagem — Especialização' and c.titulo = 'Especialista de Enfermagem Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 3, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Enfermagem — Especialização' and c.titulo = 'Especialista de Enfermagem Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;

insert into public.trilhas_carreira (nome, descricao) values ('Farmácia', 'Do balcão à responsabilidade técnica da farmácia.')
on conflict (nome) do update set descricao = excluded.descricao;

insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 1, 0, 0.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Farmácia' and c.titulo = 'Atendente de Farmácia Júnior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 2, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Farmácia' and c.titulo = 'Atendente de Farmácia Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 3, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Farmácia' and c.titulo = 'Atendente de Farmácia Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 4, 24, 4.5
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Farmácia' and c.titulo = 'Técnico em Farmácia Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 5, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Farmácia' and c.titulo = 'Técnico em Farmácia Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 6, 24, 4.5
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Farmácia' and c.titulo = 'Farmacêutico Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 7, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Farmácia' and c.titulo = 'Farmacêutico Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;

insert into public.trilhas_carreira (nome, descricao) values ('Estética', 'Carreira técnica de estética facial e corporal.')
on conflict (nome) do update set descricao = excluded.descricao;

insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 1, 0, 0.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Estética' and c.titulo = 'Técnico em Estética Júnior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 2, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Estética' and c.titulo = 'Técnico em Estética Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 3, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Estética' and c.titulo = 'Técnico em Estética Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;

insert into public.trilhas_carreira (nome, descricao) values ('Administrativo', 'A trilha mais longa da casa: do auxiliar à direção administrativa.')
on conflict (nome) do update set descricao = excluded.descricao;

insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 1, 0, 0.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Administrativo' and c.titulo = 'Auxiliar Administrativo Júnior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 2, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Administrativo' and c.titulo = 'Auxiliar Administrativo Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 3, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Administrativo' and c.titulo = 'Auxiliar Administrativo Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 4, 24, 4.5
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Administrativo' and c.titulo = 'Assistente Administrativo Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 5, 24, 4.5
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Administrativo' and c.titulo = 'Analista Administrativo Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 6, 24, 4.5
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Administrativo' and c.titulo = 'Coordenador Administrativo Júnior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 7, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Administrativo' and c.titulo = 'Coordenador Administrativo Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 8, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Administrativo' and c.titulo = 'Coordenador Administrativo Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 9, 24, 4.5
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Administrativo' and c.titulo = 'Gerente Administrativo Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 10, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Administrativo' and c.titulo = 'Gerente Administrativo Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 11, 24, 4.5
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Administrativo' and c.titulo = 'Diretor Administrativo Júnior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 12, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Administrativo' and c.titulo = 'Diretor Administrativo Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 13, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Administrativo' and c.titulo = 'Diretor Administrativo Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;

insert into public.trilhas_carreira (nome, descricao) values ('Financeiro', 'Do auxiliar financeiro à gerência da área.')
on conflict (nome) do update set descricao = excluded.descricao;

insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 1, 0, 0.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Financeiro' and c.titulo = 'Auxiliar Financeiro Júnior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 2, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Financeiro' and c.titulo = 'Auxiliar Financeiro Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 3, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Financeiro' and c.titulo = 'Auxiliar Financeiro Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 4, 24, 4.5
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Financeiro' and c.titulo = 'Assistente Financeiro Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 5, 24, 4.5
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Financeiro' and c.titulo = 'Supervisor Financeiro Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 6, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Financeiro' and c.titulo = 'Supervisor Financeiro Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 7, 24, 4.5
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Financeiro' and c.titulo = 'Gerente Financeiro Júnior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 8, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Financeiro' and c.titulo = 'Gerente Financeiro Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 9, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Financeiro' and c.titulo = 'Gerente Financeiro Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;

insert into public.trilhas_carreira (nome, descricao) values ('Recursos Humanos', 'Carreira de RH, do analista à supervisão.')
on conflict (nome) do update set descricao = excluded.descricao;

insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 1, 0, 0.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Recursos Humanos' and c.titulo = 'Analista de Recursos Humanos Júnior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 2, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Recursos Humanos' and c.titulo = 'Analista de Recursos Humanos Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 3, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Recursos Humanos' and c.titulo = 'Analista de Recursos Humanos Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 4, 24, 4.5
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Recursos Humanos' and c.titulo = 'Supervisor de RH Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 5, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Recursos Humanos' and c.titulo = 'Supervisor de RH Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;

insert into public.trilhas_carreira (nome, descricao) values ('Serviços Gerais', 'Trilha operacional de limpeza e apoio, com saída para supervisão.')
on conflict (nome) do update set descricao = excluded.descricao;

insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 1, 0, 0.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Serviços Gerais' and c.titulo = 'Serviços Gerais Júnior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 2, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Serviços Gerais' and c.titulo = 'Serviços Gerais Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 3, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Serviços Gerais' and c.titulo = 'Serviços Gerais Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 4, 24, 4.5
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Serviços Gerais' and c.titulo = 'Supervisor de Serviços Gerais Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 5, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Serviços Gerais' and c.titulo = 'Supervisor de Serviços Gerais Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;

insert into public.trilhas_carreira (nome, descricao) values ('Copa', 'Trilha da copa, que desemboca na mesma supervisão de serviços gerais.')
on conflict (nome) do update set descricao = excluded.descricao;

insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 1, 0, 0.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Copa' and c.titulo = 'Copeira Júnior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 2, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Copa' and c.titulo = 'Copeira Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 3, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Copa' and c.titulo = 'Copeira Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 4, 24, 4.5
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Copa' and c.titulo = 'Supervisor de Serviços Gerais Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 5, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Copa' and c.titulo = 'Supervisor de Serviços Gerais Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;

insert into public.trilhas_carreira (nome, descricao) values ('Suprimentos', 'De assistente de compras a comprador.')
on conflict (nome) do update set descricao = excluded.descricao;

insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 1, 0, 0.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Suprimentos' and c.titulo = 'Assistente de Compras Júnior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 2, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Suprimentos' and c.titulo = 'Assistente de Compras Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 3, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Suprimentos' and c.titulo = 'Assistente de Compras Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 4, 24, 4.5
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Suprimentos' and c.titulo = 'Comprador Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 5, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Suprimentos' and c.titulo = 'Comprador Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;

insert into public.trilhas_carreira (nome, descricao) values ('Marketing', 'Carreira de analista de marketing.')
on conflict (nome) do update set descricao = excluded.descricao;

insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 1, 0, 0.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Marketing' and c.titulo = 'Analista de Marketing Júnior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 2, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Marketing' and c.titulo = 'Analista de Marketing Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 3, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Marketing' and c.titulo = 'Analista de Marketing Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;

insert into public.trilhas_carreira (nome, descricao) values ('Acadêmico', 'Trilha da área acadêmica, de assistente a analista.')
on conflict (nome) do update set descricao = excluded.descricao;

insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 1, 0, 0.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Acadêmico' and c.titulo = 'Assistente Acadêmico Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 2, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Acadêmico' and c.titulo = 'Assistente Acadêmico Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 3, 24, 4.5
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Acadêmico' and c.titulo = 'Analista Acadêmico Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 4, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Acadêmico' and c.titulo = 'Analista Acadêmico Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;

insert into public.trilhas_carreira (nome, descricao) values ('Nutrição', 'Carreira de nutricionista.')
on conflict (nome) do update set descricao = excluded.descricao;

insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 1, 0, 0.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Nutrição' and c.titulo = 'Nutricionista Júnior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 2, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Nutrição' and c.titulo = 'Nutricionista Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 3, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Nutrição' and c.titulo = 'Nutricionista Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;

insert into public.trilhas_carreira (nome, descricao) values ('Biomedicina', 'Carreira de biomédico.')
on conflict (nome) do update set descricao = excluded.descricao;

insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 1, 0, 0.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Biomedicina' and c.titulo = 'Biomédico Júnior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 2, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Biomedicina' and c.titulo = 'Biomédico Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 3, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Biomedicina' and c.titulo = 'Biomédico Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;

insert into public.trilhas_carreira (nome, descricao) values ('Triagem', 'Trilha de auxiliar de triagem.')
on conflict (nome) do update set descricao = excluded.descricao;

insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 1, 0, 0.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Triagem' and c.titulo = 'Auxiliar de Triagem Júnior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 2, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Triagem' and c.titulo = 'Auxiliar de Triagem Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 3, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Triagem' and c.titulo = 'Auxiliar de Triagem Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;

insert into public.trilhas_carreira (nome, descricao) values ('Gestão e Operações', 'Trilha de gestão: da coordenação de processos à gerência geral.')
on conflict (nome) do update set descricao = excluded.descricao;

insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 1, 0, 0.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Gestão e Operações' and c.titulo = 'Coordenador de Processos Júnior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 2, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Gestão e Operações' and c.titulo = 'Coordenador de Processos Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 3, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Gestão e Operações' and c.titulo = 'Coordenador de Processos Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 4, 24, 4.5
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Gestão e Operações' and c.titulo = 'Gerente Operacional Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 5, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Gestão e Operações' and c.titulo = 'Gerente Operacional Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 6, 24, 4.5
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Gestão e Operações' and c.titulo = 'Gerente Geral Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;

insert into public.trilhas_carreira (nome, descricao) values ('Direção Clínica', 'Trilha de direção clínica.')
on conflict (nome) do update set descricao = excluded.descricao;

insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 1, 0, 0.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Direção Clínica' and c.titulo = 'Diretor Clínico Júnior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 2, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Direção Clínica' and c.titulo = 'Diretor Clínico Pleno'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;
insert into public.trilha_degraus (trilha_id, cargo_id, ordem, requisito_tempo_meses, requisito_nota_avaliacao)
select t.id, c.id, 3, 12, 4.0
  from public.trilhas_carreira t, public.cargos c
 where t.nome = 'Direção Clínica' and c.titulo = 'Diretor Clínico Sênior'
on conflict (trilha_id, ordem) do update set
  cargo_id = excluded.cargo_id,
  requisito_tempo_meses = excluded.requisito_tempo_meses,
  requisito_nota_avaliacao = excluded.requisito_nota_avaliacao;

notify pgrst, 'reload schema';
