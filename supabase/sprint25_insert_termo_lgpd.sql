-- ----------------------------------------------------------------------------
-- SPRINT 25 — MODELO: TERMO ADITIVO LGPD (PROTEÇÃO DE DADOS)
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente (ON CONFLICT DO UPDATE).
--
-- Placeholders convertidos: {{nome}} {{cargo}} {{cpf}} {{dia}} {{mes}} {{ano}}.
--
-- Ajustes feitos no texto original (confirmar):
--   • CNPJ corrigido: 37.370.182 -> 37.037.182/0001-85 (dígito trocado no envio).
--   • "CL" -> "CLT".
--   • Citações "art. 70/60/50" -> "art. 7º/6º/5º" (OCR: º virou 0; a Cláusula 2ª
--     lista os princípios da LGPD, que são o art. 6º).
--
-- Assinatura: "COLABORADOR: {{nome}}" (colab) e "EMPREGADORA: BIOLIFE..." (rep).
-- A Edge Function reconhece COLABORADOR como o colaborador (colab).
-- ----------------------------------------------------------------------------

ALTER TABLE public.modelos_documentos ADD COLUMN IF NOT EXISTS tipo_arquivo text DEFAULT 'texto';

INSERT INTO public.modelos_documentos (id, titulo, conteudo, tipo_arquivo)
VALUES (
  'f4a5b6c7-8d9e-4f0a-b1c2-3d4e5f607182',
  'Termo Aditivo LGPD (Proteção de Dados)',
  'TERMO ADITIVO REFERENTE À LEI GERAL DE PROTEÇÃO DE DADOS

Pelo presente instrumento, BIOLIFE CLÍNICA MÉDICA LTDA, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 37.037.182/0001-85, com sede na Rua Olavo Macedo Ribeiro, nº 320, bairro Jatiúca, Maceió/AL, CEP: 57036-830, ora Empregadora, e {{nome}}, {{cargo}}, brasileiro(a), inscrito(a) no CPF sob o nº {{cpf}}, doravante designado(a) Empregado(a), firmam o presente contrato individual de trabalho, de conformidade com as disposições pertinentes constantes da Consolidação das Leis do Trabalho – CLT, convencionando as seguintes cláusulas:

DA PROTEÇÃO DE DADOS

Cláusula 1ª:
A Lei Geral de Proteção de Dados será obedecida, em todos os seus termos, pelo EMPREGADO(A), obrigando-se ela a tratar os dados da EMPREGADORA que forem eventualmente coletados, conforme sua necessidade ou obrigatoriedade. (art. 7º, LGPD)

Cláusula 2ª:
Conforme prevê a Lei Geral de Proteção de Dados, obriga-se o EMPREGADO(A) a executar os seus trabalhos e tratar os dados da EMPREGADORA respeitando os princípios da finalidade, adequação, transparência, livre acesso, segurança, prevenção e não discriminação. (art. 6º, LGPD)

Cláusula 3ª:
O EMPREGADO(A) obriga-se a garantir a confidencialidade dos dados coletados da EMPREGADORA por meio de uma política interna de privacidade, a fim de respeitar, por si, seus funcionários e seus prepostos, o objetivo do presente termo. (art. 5º, LGPD)

1. Entende-se por "Dados Pessoais" todos e quaisquer dados ou informações que, individualmente ou em conjunto com outros dados ou nomes, identifiquem ou permitam que um determinado usuário seja identificado, nos termos da Lei 13.709/2018 ("LGPD").

2. O EMPREGADO(A), na qualidade de Operador dos Dados Pessoais, deverá tratá-los única e exclusivamente para as finalidades estabelecidas neste instrumento, ou conforme orientação por escrito fornecida pela EMPREGADORA.

3. O EMPREGADO(A) obriga-se a atuar no presente Contrato em conformidade com a legislação vigente sobre Proteção de Dados Pessoais e as determinações de órgãos reguladores/fiscalizadores sobre a matéria, em especial a Lei 13.709/2018, além das demais normas e políticas de proteção de dados de cada país onde houver qualquer tipo de tratamento dos dados dos clientes, o que inclui os dados dos clientes desta. No manuseio dos dados o EMPREGADO(A) deverá:
a) Tratar os dados pessoais a que tiver acesso apenas de acordo com as instruções da EMPREGADORA e em conformidade com estas cláusulas, e que, na eventualidade de não mais poder cumprir estas obrigações, por qualquer razão, concorda em informar de modo formal este fato imediatamente à EMPREGADORA, que terá o direito de rescindir o contrato sem qualquer ônus, multa ou encargo.
b) Manter e utilizar medidas de segurança administrativas, técnicas e físicas apropriadas e suficientes para proteger a confidencialidade e integridade de todos os dados pessoais mantidos ou consultados/transmitidos eletronicamente, para garantir a proteção desses dados contra acesso não autorizado, destruição, uso, modificação, divulgação ou perda acidental ou indevida.
c) Acessar os dados dentro de seu escopo e na medida abrangida por sua permissão de acesso (autorização), sendo que os dados pessoais não podem ser lidos, copiados, modificados ou removidos sem autorização expressa e por escrito da EMPREGADORA.

4. Os dados pessoais não poderão ser revelados a terceiros, com exceção da prévia autorização por escrito da EMPREGADORA, quer direta ou indiretamente, seja mediante a distribuição de cópias, resumos, compilações, extratos, análises, estudos ou outros meios que contenham ou de outra forma reflitam referidas informações.
4.1. Caso o EMPREGADO(A) seja obrigado por determinação legal a fornecer dados pessoais a uma autoridade pública, deverá informar previamente a EMPREGADORA para que esta tome as medidas que julgar cabíveis.
4.2. O EMPREGADO(A) deverá notificar a EMPREGADORA em até 24 (vinte e quatro) horas a respeito de:
a) Qualquer não cumprimento (ainda que suspeito) das disposições legais relativas à proteção de Dados Pessoais pelo EMPREGADO(A);
b) Qualquer outra violação de segurança no âmbito das atividades e responsabilidades do EMPREGADO(A).
4.3. O EMPREGADO(A) será integralmente responsável pelo pagamento de perdas e danos de ordem moral e material, bem como pelo ressarcimento do pagamento de qualquer multa ou penalidade imposta à EMPREGADORA e/ou a terceiros diretamente resultantes do descumprimento pelo EMPREGADO(A) de qualquer das cláusulas previstas neste capítulo quanto à proteção e uso dos dados pessoais.

Maceió, {{dia}} de {{mes}} de {{ano}}.


_______________________________
COLABORADOR: {{nome}}


_______________________________
EMPREGADORA: BIOLIFE CLÍNICA MÉDICA LTDA',
  'texto'
)
ON CONFLICT (id) DO UPDATE
SET titulo = EXCLUDED.titulo,
    conteudo = EXCLUDED.conteudo,
    tipo_arquivo = EXCLUDED.tipo_arquivo;

NOTIFY pgrst, 'reload schema';
