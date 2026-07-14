-- Migration: Sprint 9 - Insert Termo de Formalizacao de Banco de Horas Template
-- PASSO 1: Execute esta linha primeiro se a coluna tipo_arquivo ainda não tiver sido criada (caso já tenha executado no script anterior, pode pular para o Passo 2):
ALTER TABLE public.modelos_documentos ADD COLUMN IF NOT EXISTS tipo_arquivo text DEFAULT 'texto';

-- PASSO 2: Execute este bloco para inserir o modelo do Banco de Horas:
INSERT INTO public.modelos_documentos (id, titulo, conteudo, tipo_arquivo)
VALUES (
  '1b4237cd-789a-4c28-98ab-34ac8f1a2603',
  'Termo de Formalização de Banco de Horas',
  'TERMO DE FORMALIZAÇÃO DE BANCO DE HORAS

EMPREGADORA: BIOLIFE CLINICA MEDICA LTDA
CNPJ: 37.037.182/0001-85

EMPREGADO(A):
Nome: {{nome}}
CPF: {{cpf}}

As partes acima identificadas firmam o presente termo de formalização de banco de horas, mediante as cláusulas e condições abaixo:

CLÁUSULA PRIMEIRA: DO OBJETO
O presente termo tem por objeto formalizar a adoção do sistema de compensação de jornada por meio de banco de horas, prática já existente na empresa.

CLÁUSULA SEGUNDA: DO FUNCIONAMENTO DO BANCO DE HORAS
O banco de horas consiste no sistema pelo qual:
I. O excesso de horas trabalhadas em determinado dia poderá ser compensado pela correspondente diminuição da jornada em outro dia, na proporção de um para um;
II. o prazo máximo para compensação das horas será de até 6 (seis) meses, contados do respectivo fato gerador.

CLÁUSULA TERCEIRA: DA CONTABILIZAÇÃO DAS HORAS
A compensação será realizada em horas, e não necessariamente em dias inteiros de trabalho, sendo expressamente admitida:
I. A compensação parcial da jornada diária;
II. A contabilização de créditos e débitos em horas e minutos, conforme registros de jornada.

CLÁUSULA QUARTA: DO SALDO DO BANCO DE HORAS
O banco de horas poderá apresentar saldo:
I. Credor, quando houver horas trabalhadas além da jornada contratual, a serem compensadas futuramente;
II. Devedor, quando houver horas não trabalhadas, sujeitas à recuperação posterior.
A empresa informará mensalmente ao(à) empregado(a) a posição individual do banco de horas, com indicação clara do saldo acumulado, se existente.

CLÁUSULA QUINTA: DO MOMENTO DA COMPENSAÇÃO
Fica expressamente ajustado que a definição do momento, da forma e da oportunidade da compensação das horas constantes no banco de horas caberá exclusivamente à EMPREGADORA, observadas as necessidades operacionais da empresa.

CLÁUSULA SEXTA: DA COMPENSAÇÃO DURANTE AS FÉRIAS
A empregadora poderá, por sua própria e exclusiva decisão, optar por realizar a compensação do banco de horas no período subsequente destinado às férias, adicionando-se aos dias de férias os dias ou horas correspondentes à compensação.

CLÁUSULA SÉTIMA: DA RESCISÃO DO CONTRATO DE TRABALHO
Na hipótese de rescisão do contrato de trabalho, ou caso decorra o prazo máximo de compensação sem que tenha havido a compensação integral das horas extraordinárias, o(a) empregado(a) fará jus ao pagamento das horas extras não compensadas, calculadas com base na remuneração vigente à época da rescisão ou do efetivo pagamento, observando-se o adicional previsto na norma coletiva.

CLÁUSULA OITAVA: DAS DISPOSIÇÕES GERAIS
O presente termo não altera a jornada contratual originalmente pactuada, limitando-se a formalizar o regime de banco de horas, permanecendo válidas todas as demais condições do contrato de trabalho.

E, por estarem de pleno acordo, as partes assinam o presente termo em duas vias de igual teor e forma.

Maceió, {{dia}} de {{mes}} de {{ano}}.

EMPREGADORA: ______________________________________
EMPREGADO(A): ______________________________________',
  'texto'
)
ON CONFLICT (id) DO UPDATE 
SET titulo = EXCLUDED.titulo,
    conteudo = EXCLUDED.conteudo,
    tipo_arquivo = EXCLUDED.tipo_arquivo;

NOTIFY pgrst, 'reload schema';
