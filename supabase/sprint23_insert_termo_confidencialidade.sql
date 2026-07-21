-- ----------------------------------------------------------------------------
-- SPRINT 23 — MODELO: TERMO DE CONFIDENCIALIDADE
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente (ON CONFLICT DO UPDATE).
--
-- Placeholders convertidos nas {{variáveis}} do sistema:
--   {{nome}} {{cpf}} {{cargo}} {{dia}} {{mes}} {{ano}}
--
-- Assinatura: o marcador "(ASSINATURA DO COLABORADOR AQUI)" do original virou
-- linhas de assinatura reais. Duas âncoras:
--   • "___" + "Empregador: ..."   → assinatura do RH (rep)
--   • "___" + "Empregado(a): ..."  → assinatura do colaborador (colab)
-- A Edge Function gerar-contrato-pdf distingue Empregador (rep) de Empregado
-- (colab) pela regra EMPREGADO(?!R) — "empregado" é substring de "empregador".
-- ----------------------------------------------------------------------------

ALTER TABLE public.modelos_documentos ADD COLUMN IF NOT EXISTS tipo_arquivo text DEFAULT 'texto';

INSERT INTO public.modelos_documentos (id, titulo, conteudo, tipo_arquivo)
VALUES (
  'd2e3f4a5-6b7c-4d8e-9f0a-1b2c3d4e5f60',
  'Termo de Confidencialidade',
  'TERMO DE CONFIDENCIALIDADE

Nome do funcionário: {{nome}}
Documento (CPF): {{cpf}}
Cargo ocupado: {{cargo}}

DO OBJETIVO
1.1. O presente termo tem por objetivo estabelecer regras e proteção às informações referentes ao EMPREGADOR que o EMPREGADO tenha acesso.
1.2. Este termo adere ao contrato entabulado e vigente entre as partes, revogando expressamente as determinações diversas.

DA DEFINIÇÃO
2.1. Para fins do presente contrato, entende-se por informação confidencial:
(a) qualquer informação relacionada ao negócio e operações do(a) EMPREGADOR(A) que não sejam públicas; (b) informações contidas em pesquisas, faturamento, metas, comissões, planos de negócio, vendas, informações financeiras, informações contábeis, custos, dados de precificação, parceiros de negócios, informações de fornecedores, propriedade intelectual, especificações, expertises, técnicas, invenções e todos os métodos, conceitos ou ideias relacionadas ao negócio do EMPREGADOR(A);
2.1.1. Entende-se também como confidenciais quaisquer informações relativas a clientes (nome, documentos, transações financeiras, saldos e similares), modelos financeiros, políticas e processos internos, bem como dados de acesso aos sistemas utilizados.

DO SIGILO
3.1. O(A) EMPREGADO(A) deverá manter em sigilo, durante a vigência do presente termo e mesmo após sua extinção, qualquer informação relativa aos negócios, políticas, segredos institucionais, organização, criação, lista de clientes, quadro de funcionários, faturamento, metas e comissões, bem como as demais características e informações supramencionadas, sejam estas obtidas direta ou indiretamente.
3.2. Todas as informações confidenciais são de propriedade exclusiva do EMPREGADOR, mesmo que tenham sido desenvolvidas ou modificadas pelo EMPREGADO(A) durante seu período de trabalho.
3.3. O EMPREGADO deverá adotar todas as medidas necessárias para garantir que as informações confidenciais não sejam acidentalmente divulgadas ou acessadas por terceiros não autorizados.

DA VIGÊNCIA
4.1. O dever de confidencialidade permanece mesmo após o término do contrato de trabalho vigente, por tempo indeterminado, independentemente do motivo rescisório.

DAS PENALIDADES
5.1. O descumprimento das obrigações de confidencialidade poderá sujeitar o EMPREGADO às sanções previstas e eventualmente aplicáveis na legislação trabalhista, cível e criminal, a depender do caso.
5.2. A violação da obrigação de confidencialidade pode causar a rescisão imediata deste contrato por justa causa, conforme o artigo 482, alínea g da CLT.
5.3. Em caso de violação desta cláusula o(a) EMPREGADO(A) poderá ser responsabilizado pelo pagamento das quantias equivalentes ao dano causado e estará sujeito ao pagamento de multa no valor de R$ 5.000,00 (cinco mil reais), a ser devidamente atualizada e corrigida no momento de sua aplicação.
5.4. Este termo será regido e interpretado de acordo com as leis brasileiras, e quaisquer disputas decorrentes do presente instrumento serão submetidas ao foro determinado em contrato de trabalho.

Por estarem as partes de pleno acordo, assinam o presente TERMO DE CONFIDENCIALIDADE em duas vias, ficando a primeira em poder do EMPREGADOR, e a segunda com o(a) EMPREGADO(A).

Local e data: Maceió/AL, {{dia}} de {{mes}} de {{ano}}.


____________________________________________________
Empregador: BIOLIFE CLÍNICA MÉDICA LTDA


____________________________________________________
Empregado(a): {{nome}}',
  'texto'
)
ON CONFLICT (id) DO UPDATE
SET titulo = EXCLUDED.titulo,
    conteudo = EXCLUDED.conteudo,
    tipo_arquivo = EXCLUDED.tipo_arquivo;

NOTIFY pgrst, 'reload schema';
