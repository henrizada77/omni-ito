-- ----------------------------------------------------------------------------
-- APOIO — Aniversários da planilha do RH → colaboradores.data_aniversario
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente (pode rodar de novo sem problema).
--
-- A planilha só tem dia/mês do aniversário, então o ano gravado é 1900
-- (placeholder de "ano desconhecido") — o card e os dots da Agenda usam só
-- dia/mês. O casamento é por CPF normalizado (só dígitos), imune a diferença
-- de pontuação. O SELECT final do bloco mostra quem da planilha NÃO foi
-- encontrado na tabela (CPF divergente) para conferência.
-- ----------------------------------------------------------------------------

with dados (cpf_digits, aniversario, nome_planilha) as (
  values
    ('12116616441', date '1900-02-04', 'ALDO MIGUEL DO CARMO DOS SANTOS'),
    ('09150034499', date '1900-12-23', 'ANA BEATRIZ LIRA GARCIA'),
    ('11567098495', date '1900-10-01', 'ANA PAULA DA SILVA SANTOS'),
    ('09813000490', date '1900-06-02', 'ANDRESSA FERREIRA DA SILVA'),
    ('10285718444', date '1900-05-19', 'BARBARA MORGANA MEDEIROS'),
    ('13740764490', date '1900-08-30', 'CALLY HAVENA SALES DA CRUZ'),
    ('11588189635', date '1900-09-11', 'CAMILA FERNANDA GOUVEA'),
    ('14041976480', date '1900-02-12', 'DAYANA VASCONCELOS DE MELO'),
    ('08455480424', date '1900-11-07', 'EVANDRO LOPES DA SILVA'),
    -- ('11323306455', date '1900-??-??', 'GABRIELLA NANINY NUNES'),  -- PREENCHER: aniversário ilegível na planilha
    ('12191459471', date '1900-07-13', 'GEOVANA DE SOUZA ALVES'),
    ('11099594430', date '1900-09-15', 'HEVERSSON OLIVEIRA DA SILVA'),
    ('04606182539', date '1900-03-06', 'HYTALLA DE OLIVEIRA'),
    ('11156765471', date '1900-04-26', 'JESSICA KAMILA FREITAS RODRIGUES'),
    ('70528510401', date '1900-11-01', 'LEONARDO JOSE DA SILVA TORRES'),
    ('10615278400', date '1900-05-04', 'LILIANE SANTOS DA SILVA'),
    ('11473111455', date '1900-05-06', 'LUANA KELLY DA SILVA BRANDAO'),
    ('04520787173', date '1900-04-03', 'LUIARA FREITAS FERREIRA'),
    ('08102976470', date '1900-12-30', 'MARIANA VITORIA BARBOSA SILVA'),
    ('11578639492', date '1900-09-18', 'MILENA CAVALCANTI COSTA LIMA'),
    ('06617399455', date '1900-03-14', 'NAYARA COSTA ARAUJO FONTES'),
    ('06478674436', date '1900-11-29', 'RAFAELA ARAUJO SILVA'),
    ('11362662402', date '1900-02-24', 'SOFIA SABINO MEDEIROS DE LIMA'),
    ('06969789462', date '1900-02-21', 'TAMIRES SANTOS CAVALCANTE'),
    ('11880109484', date '1900-10-24', 'THIAGO HENRIQUE DA SILVA'),
    ('06625928402', date '1900-11-02', 'WILLIAM LIMA COSTA')
),
upd as (
  update public.colaboradores c
  set data_aniversario = d.aniversario
  from dados d
  where regexp_replace(coalesce(c.cpf, ''), '\D', '', 'g') = d.cpf_digits
  returning c.id, c.nome, c.cpf
)
select d.nome_planilha, d.cpf_digits, '⚠ NÃO ENCONTRADO na tabela — conferir CPF' as obs
from dados d
where not exists (
  select 1 from upd u
  where regexp_replace(coalesce(u.cpf, ''), '\D', '', 'g') = d.cpf_digits
);

-- Conferência final: aniversários gravados, em ordem de mês/dia
select nome, cargo, setor, status,
       to_char(data_aniversario, 'DD/MM') as aniversario
from public.colaboradores
where status <> 'desligado' and data_aniversario is not null
order by extract(month from data_aniversario), extract(day from data_aniversario);
