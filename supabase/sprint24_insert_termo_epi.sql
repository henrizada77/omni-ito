-- ----------------------------------------------------------------------------
-- SPRINT 24 — MODELO: TERMO DE ENTREGA DE EPI
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente (ON CONFLICT DO UPDATE).
--
-- Placeholders convertidos nas {{variáveis}}: {{nome}} {{cpf}} {{cargo}}
--   {{setor}} {{dia}} {{mes}} {{ano}}.
--
-- A tabela de EPIs do original foi achatada numa lista de linhas (o PDF é
-- renderizado como texto, sem layout de tabela). Assinaturas reais no fim:
--   • "___" + "Empregado(a): ..."               → assinatura do colaborador
--   • "___" + "Responsável pela entrega (Empregador)" → assinatura do RH (rep)
-- ----------------------------------------------------------------------------

ALTER TABLE public.modelos_documentos ADD COLUMN IF NOT EXISTS tipo_arquivo text DEFAULT 'texto';

INSERT INTO public.modelos_documentos (id, titulo, conteudo, tipo_arquivo)
VALUES (
  'e3f4a5b6-7c8d-4e9f-a0b1-2c3d4e5f6071',
  'Termo de Entrega de EPI',
  'TERMO DE ENTREGA DE EPI (Equipamento de Proteção Individual)

EMPRESA: BIOLIFE CLÍNICA MÉDICA LTDA
CNPJ: 37.037.182/0001-85

Em conformidade com a legislação trabalhista vigente e as normas de segurança do trabalho, a empresa acima identificada declara que entrega gratuitamente ao(à) colaborador(a) abaixo relacionado(a) os Equipamentos de Proteção Individual (EPIs) necessários ao desempenho de suas atividades.

Nome do(a) Colaborador(a): {{nome}}
CPF: {{cpf}}
Cargo/Função: {{cargo}}
Setor: {{setor}}

EPIs ENTREGUES (Descrição - Quantidade - CA):
- Bota bico plástico nº 40 - Qtd: 01 - CA: 43377
- Respirador PFF1 - Qtd: 05 - CA: 38810
- Respirador com válvula - Qtd: 05 - CA: 38808
- Máscara descartável - Qtd: 01 caixa (50 un.) - CA: nao se aplica
- Touca descartável - Qtd: 01 pacote (100 un.) - CA: nao se aplica
- Luva Danny amarela tam. M - Qtd: 02 - CA: 15532
- Luva Danny verde tam. M - Qtd: 02 - CA: 25313

O(a) colaborador(a) declara que:
- Recebeu os EPIs em perfeitas condições de uso;
- Foi orientado(a) quanto ao uso correto, guarda e conservação;
- Compromete-se a utilizá-los obrigatoriamente durante a execução de suas atividades;
- Compromete-se a comunicar imediatamente qualquer dano, extravio ou necessidade de substituição.

Este termo é firmado para fins de comprovação de entrega e responsabilidade.

Local e data: Maceió/AL, {{dia}} de {{mes}} de {{ano}}.


___________________________________________________
Empregado(a): {{nome}} - declaro ter recebido os EPIs acima


___________________________________________________
Responsável pela entrega (Empregador)

BIOLIFE CLÍNICA MÉDICA LTDA - Maceió/AL - CNPJ: 37.037.182/0001-85
Jatiúca - Rua Olavo Macedo Ribeiro, 320 - CEP: 57036-830
Telefone: (11) 3027-5624',
  'texto'
)
ON CONFLICT (id) DO UPDATE
SET titulo = EXCLUDED.titulo,
    conteudo = EXCLUDED.conteudo,
    tipo_arquivo = EXCLUDED.tipo_arquivo;

NOTIFY pgrst, 'reload schema';
