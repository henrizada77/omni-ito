# PDF de Avaliação com Design Corporativo

## Goal
Implementar uma estilização e diagramação premium para a impressão de avaliações de desempenho no `Dashboard.tsx`, garantindo que o PDF gerado pelo navegador possua um design corporativo elegante, proporções de página A4 perfeitas e quebras de seção corretas.

## Tasks
- [x] **Task 1: Definir Identidade e Paleta Corporativa para Impressão** → Criar classes específicas e regras CSS no `@media print` utilizando preto/escala de cinza de alta qualidade com toques sutis de verde corporativo/esmeralda (marca da clínica) e tipografia geométrica.
- [x] **Task 2: Ajustar Cabeçalho e Metadados do PDF** → Adicionar uma seção de cabeçalho corporativo oficial com logotipo/identidade da empresa (BIOLIFE / Instituto Thiago Omena), título do documento, informações do colaborador/avaliador de forma estruturada e alinhada.
- [x] **Task 3: Melhorar Legibilidade e Bordas das Tabelas** → Refinar o visual das tabelas de Pontos de Melhoria e PDI com linhas de grade finas e elegantes, cabeçalhos destacados e espaçamentos internos profissionais (`cellpadding`/`padding` equilibrado).
- [x] **Task 4: Otimizar Quebras de Página e Evitar Cortes (Layout A4)** → Adicionar regras de `break-inside: avoid` e margens de página CSS (`@page { margin: 15mm; }`) para assegurar que assinaturas e seções não sejam cortadas ao meio na transição de páginas.
- [x] **Task 5: Refinar Ciência das Partes e Controle Interno** → Estilizar a seção de assinaturas em caixas lado a lado com linhas de preenchimento sólidas e elegantes, e dispor o Controle Interno de forma limpa.
- [x] **Task 6: Executar Scripts de Validação Técnica** → Executar `lint_runner.py` e testes TypeScript (`tsc --noEmit`) para garantir integridade do código.

## Done When
- [x] O documento gerado via `Imprimir / PDF` cabe nas páginas de forma harmônica (geralmente 1 ou 2 páginas A4 completas).
- [x] Apresenta cabeçalho institucional elegante e ausência de elementos interativos (botões de adicionar/remover, caixas de edição).
- [x] Possui design em escala de cinza de alto contraste com preto rico e acentos elegantes, legível e profissional.
- [x] Passa na checagem de tipos TypeScript e de lint.

## Notes
- O PDF é gerado a partir do modal usando o recurso nativo de impressão do navegador (`window.print()`).
- Utilizaremos as classes `print:*` do Tailwind combinadas com regras de reset CSS no bloco de estilos locais do modal.
