-- PASSO 1: Execute APENAS esta linha primeiro e clique em "Run"
ALTER TABLE public.modelos_documentos ADD COLUMN IF NOT EXISTS tipo_arquivo text DEFAULT 'texto';

-- PASSO 2: Depois que o Passo 1 rodar com sucesso, apague a linha de cima e execute APENAS o bloco abaixo:
INSERT INTO public.modelos_documentos (id, titulo, conteudo, tipo_arquivo)
VALUES (
  '8a5137cd-789a-4c28-98ab-34ac8f1a2602',
  'Termo de Compromisso - Regimento Interno',
  'TERMO DE CIÊNCIA E COMPROMISSO COM O REGIMENTO INTERNO

Eu, {{nome}}, pessoa física, inscrita no CPF sob o nº {{cpf}} , residente e domiciliado(a) em Rua {{endereco}}, colaborador(a) da empresa BIOLIFE CLINICA MEDICA LTDA, declaro que recebi, li e compreendi integralmente o Regimento Interno, bem como as normas, políticas, procedures, diretrizes e orientações nele estabelecidas.
Declaro estar ciente de que o cumprimento das regras previstas no Regimento Interno é obrigatório durante toda a vigência do meu vínculo com a empresa, comprometendo-me a respeitar e seguir todas as disposições nele contidas, bem como eventuais atualizações que venham a ser formalmente comunicadas.
Reconheço que o desconhecimento das normas não me exime da responsabilidade pelo seu cumprimento e estou ciente de que o descumprimento das regras poderá acarretar a aplicação das medidas disciplinares cabíveis, conforme previsto na legislação trabalhista vigente e nas políticas internas da empresa.
Por fim, declaro que tive a oportunidade de esclarecer eventuais dúvidas relacionadas ao conteúdo apresentado e que estou de acordo com as condições estabelecidas.
Local e data: {{dia}} de {{mes}} de {{ano}}, Maceió/AL
EMPREGADORA: ______________________________________
EMPREGADO(A): ______________________________________',
  'texto'
)
ON CONFLICT (id) DO UPDATE 
SET titulo = EXCLUDED.titulo,
    conteudo = EXCLUDED.conteudo,
    tipo_arquivo = EXCLUDED.tipo_arquivo;

NOTIFY pgrst, 'reload schema';
