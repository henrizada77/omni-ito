-- ----------------------------------------------------------------------------
-- SPRINT 22 — MODELO: TERMO DE CIÊNCIA DE MONITORAMENTO (CÂMERAS + ÁUDIO)
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente (ON CONFLICT DO UPDATE).
--
-- Insere o "Termo de Ciência sobre Sistema de Monitoramento por Câmeras com
-- Captação de Imagem e Áudio" como novo modelo em public.modelos_documentos.
--
-- Placeholders convertidos nas {{variáveis}} que o sistema já substitui:
--   {{nome}} {{cpf}} {{dia}} {{mes}} {{ano}}
--
-- Assinatura: o marcador "(ASSINATURA...)" do original virou uma LINHA de
-- assinatura real ("___" + "EMPREGADO(A): {{nome}}"), para a Edge Function
-- gerar-contrato-pdf ancorar a assinatura do colaborador exatamente sob
-- "Ciente e de acordo:". É um termo de ciência (só o colaborador assina).
--
-- Fluxo (nada mais a fazer no banco): RH → Documentos → escolhe este modelo
-- → "Gerar Link de Assinatura" → colaborador assina em /admissao/:token.
-- ----------------------------------------------------------------------------

ALTER TABLE public.modelos_documentos ADD COLUMN IF NOT EXISTS tipo_arquivo text DEFAULT 'texto';

INSERT INTO public.modelos_documentos (id, titulo, conteudo, tipo_arquivo)
VALUES (
  'c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
  'Termo de Ciência — Monitoramento por Câmeras (Imagem e Áudio)',
  'TERMO DE CIÊNCIA SOBRE SISTEMA DE MONITORAMENTO POR CÂMERAS COM CAPTAÇÃO DE IMAGEM E ÁUDIO

EMPREGADORA: BIOLIFE CLÍNICA MÉDICA LTDA
CNPJ: 37.037.182/0001-85

EMPREGADO(A): {{nome}}
CPF: {{cpf}}

A EMPREGADORA, no exercício de seu poder diretivo e com fundamento no legítimo interesse relacionado à segurança, à proteção de pessoas, ao controle operacional e à conformidade com normas internas e legais, observados os princípios da necessidade, adequação e proporcionalidade, informa que mantém sistema de monitoramento em suas dependências, o qual inclui captação de imagens e de áudio em determinados ambientes de seu estabelecimento.

O(A) EMPREGADO(A) declara, por meio deste termo, que está ciente de que:

(1) O sistema de monitoramento tem como finalidade exclusiva a segurança do ambiente de trabalho, a prevenção de incidentes, a proteção do patrimônio da empresa e de terceiros, bem como o adequado acompanhamento das atividades operacionais, sendo vedada a sua utilização para fins discriminatórios, abusivos ou alheios à relação de trabalho;

(2) A captação de imagem e áudio ocorrerá apenas em ambientes previamente definidos pela empresa, estando expressamente vedada em locais que envolvam expectativa legítima de privacidade;

(3) As gravações realizadas poderão ser acessadas exclusivamente por pessoas autorizadas pela empresa, sendo armazenadas pelo período necessário ao atendimento de suas finalidades, observados os critérios de segurança da informação e as disposições da Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018);

(4) O(A) EMPREGADO(A) reconhece que foi devidamente informado(a) acerca da existência do sistema de monitoramento com captação de imagem e áudio, bem como de suas finalidades, forma de utilização e limitações, declarando ciência inequívoca da prática adotada pela empresa, apresentando, neste ato, a sua expressa concordância a respeito.

Local e data: Maceió/AL, {{dia}} de {{mes}} de {{ano}}.


Ciente e de acordo:

___________________________________
EMPREGADO(A): {{nome}}
CPF: {{cpf}}',
  'texto'
)
ON CONFLICT (id) DO UPDATE
SET titulo = EXCLUDED.titulo,
    conteudo = EXCLUDED.conteudo,
    tipo_arquivo = EXCLUDED.tipo_arquivo;

NOTIFY pgrst, 'reload schema';
