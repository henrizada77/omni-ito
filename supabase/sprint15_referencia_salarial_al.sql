-- ----------------------------------------------------------------------------
-- SPRINT 15 — REFERÊNCIA SALARIAL DE MERCADO (ALAGOAS)
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente.
--
-- Adiciona 3 colunas na tabela cargos para permitir comparação da média salarial
-- do ITO com o mercado alagoano por cargo. Editável pelo RH via CargosManager.
--
-- Os placeholders inseridos abaixo (fonte='(placeholder — atualizar)') são
-- valores plausíveis para renderizar o gráfico já na primeira abertura, mas
-- NÃO são medições reais. Antes de usar em decisão salarial, o RH DEVE
-- substituir cada linha pela fonte real (RAIS/CAGED/Catho/pesquisa própria)
-- e trocar o texto da coluna referencia_salarial_fonte.
--
-- O gráfico só considera cargos com referencia_salarial_al preenchida — deixar
-- null "esconde" o cargo do comparativo sem afetar o resto do catálogo.
-- ----------------------------------------------------------------------------


alter table public.cargos
  add column if not exists referencia_salarial_al numeric;

alter table public.cargos
  add column if not exists referencia_salarial_fonte text;

alter table public.cargos
  add column if not exists referencia_salarial_data date;

comment on column public.cargos.referencia_salarial_al is
  'Média salarial de mercado do cargo no estado de Alagoas (R$). '
  'Alimenta o gráfico "ITO vs Mercado AL" em CompensationsPanel. '
  'Cargos com null são omitidos do comparativo.';

comment on column public.cargos.referencia_salarial_fonte is
  'De onde saiu o valor: RAIS 2025, CAGED T2 2026, Catho jul/2026, etc. '
  'Se estiver "(placeholder — atualizar)", o valor é do seed e não deve '
  'ser tomado como referência de verdade.';

comment on column public.cargos.referencia_salarial_data is
  'Data de referência do valor pesquisado (não é a data do insert).';


-- ----------------------------------------------------------------------------
-- Seed de placeholders — plausíveis, mas explicitamente placeholder.
-- Só atualiza cargos EXISTENTES que ainda não têm referência preenchida.
-- Nada é inserido nem sobrescreve manutenção anterior do RH.
-- ----------------------------------------------------------------------------

update public.cargos set
  referencia_salarial_al = coalesce(referencia_salarial_al, v.valor),
  referencia_salarial_fonte = coalesce(referencia_salarial_fonte, '(placeholder — atualizar)'),
  referencia_salarial_data = coalesce(referencia_salarial_data, current_date)
from (
  values
    ('Recepcionista',                            1700.00),
    ('Recepcionista Líder',                      2400.00),
    ('Recepcionista da Noite',                   1900.00),
    ('Operador de Call Center',                  1500.00),
    ('Operador de Telemarketing',                1500.00),
    ('Supervisora Call Center',                  2600.00),
    ('Supervisor de Atendimento',                2600.00),
    ('Auxiliar de Serviços Gerais',              1400.00),
    ('Auxiliar de Copa',                         1400.00),
    ('Auxiliar de Limpeza',                      1400.00),
    ('Líder de Serviços Gerais',                 1900.00),
    ('Fisioterapeuta',                           3800.00),
    ('Fisioterapeuta Especialista',              5200.00),
    ('Fisioterapeuta Dermato-Funcional',         4000.00),
    ('Fisioterapeuta Dermato-Funcional Especialista', 5400.00),
    ('Enfermeiro Esteta',                        4200.00),
    ('Enfermeiro Esteta Sênior',                 5800.00),
    ('Enfermeiro Residente',                     3500.00),
    ('Enfermeira Chefe',                         5500.00),
    ('Farmacêutica Esteta',                      4500.00),
    ('Farmacêutica Esteta Sênior',               6000.00),
    ('Farmacêutico Esteta',                      4500.00),
    ('Farmacêutica Residente',                   3900.00),
    ('Nutricionista',                            3200.00),
    ('Nutricionista Clínico',                    3400.00),
    ('Nutricionista Esportiva',                  3400.00),
    ('Analista Financeiro',                      3200.00),
    ('Analista de Custos',                       3300.00),
    ('Gerente Financeiro',                       7500.00),
    ('Consultora Smartshape',                    2600.00),
    ('Consultor Smartshape',                     2600.00),
    ('Consultora de Vendas',                     2500.00),
    ('Líder de Unidade Smartshape',              4000.00)
) as v(titulo, valor)
where public.cargos.titulo = v.titulo
  and public.cargos.referencia_salarial_al is null;


notify pgrst, 'reload schema';
