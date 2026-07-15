# Sistema de Advertência ao Empregado

## Goal
Implementar o fluxo completo de registro, visualização, impressão e contagem de advertências formais (Aviso de Advertência) para os colaboradores, integrando com o banco de dados Supabase e exibindo alertas no Dashboard.

## Tasks
- [ ] **Task 1: Banco de Dados** → Criar a tabela `colaborador_advertencias` com colunas (id, colaborador_id, data_falta, descricao_situacao, avaliador_email, criado_em) e habilitar RLS com políticas de leitura para autenticados e escrita para coordenadora_rh.
- [ ] **Task 2: Consulta e Estado no React** → Adicionar a busca de advertências na inicialização do `Dashboard.tsx` (`dbAdvertencias`) e manter o estado atualizado localmente ao registrar novas.
- [ ] **Task 3: Formulário de Registro (Modal)** → Implementar o modal de cadastro "Registrar Advertência" na gaveta do colaborador (aba Ocorrências) com os campos: Data da falta e Descrição da situação.
- [ ] **Task 4: Histórico na Ficha do Colaborador** → Renderizar a lista de advertências registradas na aba "Ocorrências" do prontuário, com opção de "Visualizar Relatório/Imprimir".
- [ ] **Task 5: PDF Temático Corporativo para Impressão** → Criar o componente de visualização da Advertência sob o modelo oficial (Aviso de Advertência ao Empregado, Artigo 482 da CLT, etc.), buscando dinamicamente as advertências anteriores do mesmo colaborador e formatando o layout A4 para impressão (`window.print()`).
- [ ] **Task 6: Alertas Visuais e Gráficos** → Adicionar indicativos visuais de advertências na gaveta do colaborador (ex: badge `⚠️ 1 Advertência`), na listagem geral de colaboradores e um contador geral no topo do Dashboard.
- [ ] **Task 7: Validação Técnica** → Executar checagem de tipos TypeScript (`tsc --noEmit`) e linter (`oxlint`).

## Done When
- [ ] O gestor consegue registrar uma advertência para qualquer colaborador.
- [ ] O histórico de advertências do colaborador é listado em seu prontuário com o contador de alertas atualizado.
- [ ] O aviso de advertência é gerado em PDF corporativo impecável e sem elementos interativos, contendo a lista automática de advertências passadas daquele funcionário.
- [ ] Código passa sem erros no compilador TypeScript e no linter do projeto.

## Notes
- O modelo de impressão deve respeitar as margens A4 retrato do CSS de impressão ajustado anteriormente.
- A exclusão em cascata deve ser mantida ao deletar um colaborador.
