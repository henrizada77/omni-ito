-- Migration: Sprint 8 - Insert Contract of Experience Template
INSERT INTO public.modelos_documentos (id, titulo, conteudo, tipo_arquivo)
VALUES (
  '37a34651-789a-4c28-98ab-34ac8f1a2601',
  'Contrato Individual de Trabalho a Título de Experiência',
  'CONTRATO INDIVIDUAL DE TRABALHO A TÍTULO DE EXPERIÊNCIA

Pelo presente instrumento particular, de um lado BIOLIFE CLÍNICA MÉDICA LTDA., pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 37.037.182/0001-85, com sede na Rua Olavo Macedo Ribeiro, nº 320, bairro Jatiúca, Maceió/AL, doravante denominada EMPREGADORA, e, de outro lado, {{nome}}, pessoa física, inscrita no CPF sob o nº {{cpf}}, residente e domiciliado(a) em Rua {{endereco}}, doravante denominado(a) EMPREGADO(A), têm entre si justo e contratado o presente CONTRATO DE TRABALHO A TÍTULO DE EXPERIÊNCIA, nos termos do artigo 443, §2º, alínea "c", da CLT, mediante as cláusulas e condições a seguir:

CLÁUSULA 1ª – DO OBJETO E DA ADMISSÃO
1.1. O(A) EMPREGADO(A) é admitido(a) para prestar serviços à EMPREGADORA a partir de {{data_admissao}}.
1.2. O presente contrato é celebrado em caráter de experiência, visando à avaliação recíproca entre as partes quanto à adaptação às atividades e às condições de trabalho.

CLÁUSULA 2ª – DA FUNÇÃO E DAS ATIVIDADES
2.1. O(A) EMPREGADO(A) exercerá a função de {{cargo}}, compatível com o CBO nº {{cbo}}.
    • 2.2. Constituem atribuições do cargo, dentre outras compatíveis com a função e com a condição pessoal do(a) EMPREGADO(A): 
{{atribuicoes}}

2.3. O(A) EMPREGADO(A) compromete-se a executar as atividades inerentes à sua função com zelo, diligência e boa-fé, observando as orientações da EMPREGADORA.
2.4. Poderá haver a designação para atividades correlatas, desde que compatíveis com a função contratada, sem que isso configure acúmulo ou desvio de função.
2.5. Eventual alteração de função observará os limites legais e será formalizada por aditivo contratual.

CLÁUSULA 3ª – DA REMUNERAÇÃO
3.1. O(A) EMPREGADO(A) perceberá salário mensal no valor de R$ {{salario}} ({{salario_extenso}}).
3.2. O pagamento será realizado até o 5º dia útil do mês subsequente ao vencido.

CLÁUSULA 4ª – DA JORNADA DE TRABALHO E BANCO DE HORAS
4.1. A jornada de trabalho será alternada em uma semana de segunda-feira a quinta-feira, das 08h00 às 13h00 e das 14h00 às 18h00, sexta-feira das 08h00 ás 17h00, podendo sofrer ajustes conforme necessidade operacional, respeitados os limites legais.
4.2. As partes ajustam a adoção de banco de horas, nos termos da lei, mediante as seguintes condições:
(a) As horas extraordinárias serão registradas e compensadas na proporção de 1 (uma) hora trabalhada por 1 (uma) hora de descanso;
(b) O prazo máximo para compensação será de até 6 (seis) meses;
(c) A compensação será definida de comum acordo entre as partes, observadas as necessidades do serviço;
(d) Na hipótese de rescisão contratual sem compensação integral, as horas extras serão pagas como extraordinárias.

CLÁUSULA 5ª – DO LOCAL DE TRABALHO
5.1. O(A) EMPREGADO(A) exercerá suas atividades na sede da EMPREGADORA, concordando com a possibilidade de transferência, a qualquer tempo, a título temporário ou definitivo, tanto no âmbito da unidade para a qual foi admitido(a) como para outras, em qualquer localidade deste estado ou do país.

CLÁUSULA 6ª – DOS DESCONTOS
6.1. A EMPREGADORA poderá efetuar os descontos previstos in lei, em instrumentos coletivos e outros autorizados pelo(a) EMPREGADO(A).
6.2. Eventuais danos causados pelo(a) EMPREGADO(A) poderão ser descontados quando comprovada a conduta dolosa ou culposa, mediante apuração e garantia de contraditório.
6.3. Contribuições sindicais ou assistenciais observarão estritamente o disposto em norma coletiva e o direito de oposição do empregado.

CLÁUSULA 7ª – DAS NORMAS INTERNAS E USO DE DISPOSITIVOS
7.1. O(A) EMPREGADO(A) deverá observar as normas internas da EMPREGADORA.
7.2. O uso de dispositivos pessoais durante a jornada poderá ser restringido quando incompatível com as atividades, sem prejuízo de situações emergenciais ou devidamente autorizadas.

CLÁUSULA 8ª – DA CONFIDENCIALIDADE E PROTEÇÃO DE DADOS
8.1. O(A) EMPREGADO(A) obriga-se a manter sigilo sobre informações confidenciais da EMPREGADORA, incluindo dados de pacientes, informações comerciais, operacionais e estratégicas.
8.2. O tratamento de dados pessoais deverá observar as diretrizes da Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
8.3. O descumprimento desta cláusula poderá ensejar a aplicação das medidas disciplinares cabíveis, inclusive rescisão por justa causa.

CLÁUSULA 9ª – DO MONITORAMENTO
9.1. A EMPREGADORA poderá realizar monitoramento por câmeras em suas dependências, para fins de segurança e controle patrimonial, dentre outros.
9.2. O monitoramento observará os princípios da necessidade, adequação e proporcionalidade, sendo vedada a captação em áreas de intimidade do estabelecimento.

CLÁUSULA 10ª – DAS SANÇÕES ADMINISTRATIVAS
10.1. O descumprimento das obrigações contratuais e normas internas poderá ensejar a aplicação de medidas disciplinares ao(à) EMPREGADO(A), como advertência verbal, advertência escrita, suspensão e rescisão por justa causa, nos termos da legislação trabalhista.

CLÁUSULA 11ª – DA VIGÊNCIA
11.1. O presente contrato terá duração inicial de 30 (trinta) dias, podendo ser prorrogado uma única vez, até o limite máximo de 90 (noventa) dias.
11.2. Findo o prazo sem manifestação das partes, o contrato será automaticamente convertido em prazo indeterminado.

CLÁUSULA 12ª – DISPOSIÇÕES GERAIS
12.1. O presente contrato substitui quaisquer ajustes anteriores.
12.2. Permanecem aplicáveis as disposições da CLT, normas coletivas e legislação vigente.

E, por estarem de pleno acordo, assinam o presente instrumento em duas vias de igual teor.

Maceió/AL, {{dia}} de {{mes}} de {{ano}}.',
  'texto'
)
ON CONFLICT (id) DO NOTHING;
