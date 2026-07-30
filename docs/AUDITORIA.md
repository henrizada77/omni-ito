# Auditoria Técnica — Omni ITO

**Data:** 28 de julho de 2026
**Escopo:** repositório completo — 52 arquivos TypeScript/TSX (23.397 linhas), 44 arquivos SQL (5.467 linhas), 3 Edge Functions Deno (1.221 linhas)
**Commit auditado:** `6ce2389` (branch `feature/endomarketing-agenda`)
**Natureza:** documento vivo. A auditoria original foi somente leitura; as correções aplicadas depois estão registradas abaixo, com a nota movendo junto.

---

## Histórico da nota

| Data | Nota | O que mudou |
|---|---|---|
| 2026-07-28 | **3,7** | Auditoria original, sob a premissa de produto SaaS B2B |
| 2026-07-28 | **4,1** | Decisão de produto: sistema interno do Instituto. ARQ-01 (multi-tenancy) sai do escopo; escalabilidade reavaliada contra o requisito real |
| 2026-07-29 | **4,5** | Rodada 1: CI, lint de verdade, Error Boundary, cabeçalhos HTTP, e mais 6 itens |
| 2026-07-29 | **4,9** | `sprint36` aplicado em produção: 3 das 4 falhas críticas fechadas, índices de FK criados. Rodada 2: SEC-03 no código, BD-03 desarmado |
| 2026-07-29 | **4,9** | Rodada 3: primeira suíte de testes — 32 casos sobre o cálculo trabalhista, verificados por mutação, rodando no CI. *(Anotei 5,1 no commit da rodada 3; a média correta era 4,9 — arredondamento meu para cima.)* |
| 2026-07-29 | **5,0** | Rodada 4: 162 rótulos de formulário ligados aos seus campos |
| 2026-07-29 | **5,1** | Rodada 5: camada de telemetria com depuração de dado pessoal testada |
| 2026-07-29 | **5,5** | Sprints 36 a 39 aplicados em produção. Rodada 6: regressões corrigidas. Rodada 7: modais acessíveis, e duas correções ao próprio relatório |

### Rodada 6 — 2026-07-29 · correção de regressões que eu causei

O `sprint36` fechou brechas reais, mas em dois pontos foi longe demais e quebrou funcionalidade legítima. Registro aqui porque o erro de julgamento é mais instrutivo que o conserto.

| Regressão | Sintoma | Causa |
|---|---|---|
| **Organograma: adicionar cargo parou de funcionar** | `new row violates row-level security policy` | Troquei `using (true)` por exigência de `coordenadora_rh`. A vulnerabilidade era acesso **anônimo**; restringir quem do time pode editar é decisão de produto que ninguém me pediu |
| **Auditoria da assinatura do candidato deixou de ser gravada** | Silencioso — a assinatura funciona, o registro não aparece | Revoguei `insert` de `anon` em `logs_auditoria`. A página pública de admissão gravava ali |

**Como o segundo erro passou.** No commit eu afirmei ter verificado que nenhuma página pública escrevia nessas tabelas. Verifiquei numa saída de `grep` truncada por `head -12` e concluí a partir do que **não** apareceu nela. "Não vi" não é "não existe".

**O conserto não é reverter.** `sprint39_correcao_regressoes.sql`:

- Organograma volta a aceitar escrita de qualquer usuário logado — anônimo continua fora, que era o ponto.
- A auditoria do candidato volta por RPC `registrar_auditoria_candidato`, que exige token válido em estado de assinatura, aceita uma **lista fechada** de ações, e lê o e-mail **do token, no servidor**. O problema nunca foi o registro existir; foi ele ser forjável em nome de qualquer pessoa.

O `sprint36` no repositório foi corrigido para não reintroduzir o problema se for rodado de novo.

> **Rode `sprint39_correcao_regressoes.sql` agora.** É o que destrava o organograma.

### Rodada 7 — 2026-07-29 · modais acessíveis, e duas correções ao relatório

**Antes do trabalho, duas coisas que eu errei ao medir.**

| Achado original | O que a medição mostrou |
|---|---|
| "245 botões com 12 rótulos acessíveis" | Enganoso. **A maioria tem texto visível.** Só **24** são ícone puro sem nome — 20 sem nada e 4 apenas com `title` |
| "zero `aria-live`" | O toast usa `role="status"`, que **é** região viva por definição. Ele já era anunciado. Contei o atributo e concluí errado sobre o efeito |
| "sem landmarks" | O painel tem `<nav>`, `<aside>`, `<header>` e `<main>`. Faltam nas páginas públicas |

O que sobrou depois de medir direito é menor do que o relatório sugeria — e continua sendo real.

| Item | Estado | O que foi feito |
|---|---|---|
| **A11Y-03** modais inoperáveis por teclado | 🟢 4 de 10 | Hook `useDialogoAcessivel`: `role="dialog"`, `aria-modal`, Esc fecha, Tab circula, foco devolvido a quem abriu |
| **A11Y-02** botões só de ícone | 🟡 parcial | `aria-label` nos botões do organograma, citando o cargo — senão a pessoa ouve "Excluir" cinco vezes sem saber excluir o quê |

**Por que os modais importam para todo mundo, não só para leitor de tela.** Sem retenção de foco, o Tab escapa para o conteúdo **atrás** do modal e a pessoa passa a preencher um formulário que não está vendo. E Esc não fechava — o que todo mundo espera de um modal.

**Verificado em execução**, montando o hook no navegador e disparando as teclas de verdade:

| Comportamento | Resultado |
|---|---|
| `role="dialog"` / `aria-modal="true"` | ✅ |
| Foca o primeiro campo ao abrir | ✅ |
| Tab no último volta ao primeiro | ✅ |
| Shift+Tab no primeiro vai ao último | ✅ |
| Esc chama o fechamento | ✅ |
| Foco devolvido ao botão que abriu | ✅ |

**Faltam 6 modais:** os 4 do `Dashboard.tsx`, o da ficha do colaborador e o `CommandPalette`. A aplicação é mecânica — três linhas por modal —, ficou de fora por volume, não por dificuldade.

### Pendências que dependem de você

| Script | Estado | Observação |
|---|---|---|
| `sprint36_correcoes_p0_auditoria.sql` | ✅ aplicado | 3 das 4 falhas críticas fechadas, índices de FK criados |
| `sprint37_papel_superadmin_e_search_path.sql` | ✅ aplicado | Papel `superadmin`, `search_path` nas `SECURITY DEFINER`, backdoor de e-mail fora das policies |
| `sprint38_log_erros_cliente.sql` | ✅ aplicado | Telemetria passa a persistir |
| `sprint39_correcao_regressoes.sql` | ✅ aplicado | Organograma e auditoria do candidato restaurados |
| **Deploy das 3 Edge Functions** | ⏳ **confirmar** | Sem ele, SEC-03 segue aberto: as funções em produção ainda autorizam por domínio de e-mail |

```
npx supabase functions deploy copilot            --project-ref jyvxhyaeagqljvqqeuwi
npx supabase functions deploy gerar-contrato-pdf --project-ref jyvxhyaeagqljvqqeuwi
npx supabase functions deploy pontofopag-sync    --project-ref jyvxhyaeagqljvqqeuwi
```

### Rodada 1 — 2026-07-29

Critério de escolha: gravidade Alta ou Crítica **com** esforço Pequeno. Nada de refatoração.

| Item | Estado | O que foi feito |
|---|---|---|
| **DEV-02** CI inexistente | ✅ resolvido | `.github/workflows/ci.yml` roda `tsc -b`, `oxlint` e `vite build` em todo push e PR |
| **COD-05** lint com 2 regras | ✅ resolvido | 30 regras, incluindo `jsx-a11y` e `import`. Sai com código 0: 528 avisos, **0 erros** |
| **SEC-08** sem cabeçalhos HTTP | ✅ resolvido | `vercel.json` com HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` e CSP |
| **UX-01** sem Error Boundary | ✅ resolvido | `ErrorBoundary` na raiz, com tela de recuperação e ponto único para telemetria futura |
| **ARQ-05** cliente degradava calado | ✅ resolvido | `supabaseClient.ts` lança erro no boot se faltar variável |
| **ARQ-06** chave real no `.env.example` | ✅ resolvido | Placeholders; variável duplicada removida |
| **ARQ-07** `strict` implícito | ✅ resolvido | `"strict": true` explícito no `tsconfig.app.json` |
| **ARQ-04** código morto | ✅ resolvido | `ColaboradorProntuarioModal.tsx` removido (289 linhas, zero importadores) |
| **COD-06** `name: temp-app` | ✅ resolvido | Renomeado para `omni-ito` |
| **DEP-01** dependências não usadas | 🟡 parcial | `framer-motion` removido. `clsx` e `tailwind-merge` **mantidos de propósito** — são a ferramenta de UI-02 |
| **SEC-01 · SEC-02 · SEC-04 · BD-01** | ✅ **aplicado em 2026-07-29** | `sprint36_correcoes_p0_auditoria.sql` rodado no SQL Editor. Três das quatro falhas críticas fechadas em produção; índices de FK criados |

### Rodada 2 — 2026-07-29

| Item | Estado | O que foi feito |
|---|---|---|
| **SEC-03** autorização por domínio de e-mail | 🟡 código pronto, **falta rodar e deployar** | Regra centralizada em `supabase/functions/_shared/autorizacao.ts` e aplicada nas três Edge Functions. Só `perfis.cargo` decide; a checagem de domínio e o Gmail fixo saíram. Depende do `sprint37` |
| **BD-03** migration que reabria as brechas | ✅ resolvido | Os três blocos `create policy ... to anon` foram removidos de `run_pending_migrations.sql`. Rodar aquele arquivo não traz mais as brechas de volta. O arquivo ficou (ainda cria tabelas), com histórico no cabeçalho |
| **BD-05** `SECURITY DEFINER` sem `search_path` | 🟡 script pronto, **falta rodar** | Bloco `DO` no `sprint37` que corrige **todas** as pendentes de uma vez, sem depender de listar nome por nome |
| Backdoor de e-mail dentro de policies RLS | 🟡 script pronto, **falta rodar** | Achado durante esta rodada, não estava no relatório original: o mesmo Gmail aparecia em 5 policies (`beneficios`, `colaborador_beneficios`, `planos_carreira`, `avaliacoes_desempenho`, `storage.objects`). Substituído pela função `tem_papel_administrativo()` |

### Rodada 3 — 2026-07-29

| Item | Estado | O que foi feito |
|---|---|---|
| **DEV-01** zero testes automatizados | 🟡 primeira suíte no ar | Vitest instalado, **32 testes** sobre as funções puras de cálculo: aviso prévio proporcional, teto de 90 dias, prazo de quitação (CLT 477 §6º) e turnover semestral com dedupe por CPF. Ligado ao CI |
| **COD-08** 29 de fevereiro no aviso prévio | 🆕 achado novo, **não corrigido** | Ver abaixo |

**Sobre a qualidade da suíte.** Trinta e dois testes passando não provam nada por si — um teste que passa trivialmente é pior que nenhum, porque dá falsa confiança. A suíte foi verificada por **mutação**: três regras foram quebradas de propósito e as três foram pegas.

| Mutação | Testes que falharam |
|---|---|
| Teto do aviso prévio 90 → 120 dias | 2 |
| Prazo de quitação 10 → 15 dias | 3 |
| Dedupe por CPF desligado | 2 |

**Cobertura deliberadamente estreita.** Só `utils/turnover.ts` e `utils/desligamento.ts`. É onde o erro custa passivo trabalhista, não tela feia — e são puras, testáveis sem refatorar nada. O resto do sistema segue sem teste, e `DEV-01` continua aberto.

#### COD-08 — `anosCompletos` erra para quem foi admitido em 29 de fevereiro

| | |
|---|---|
| **Gravidade** | Baixa |
| **Prioridade** | **P3** |
| **Esforço** | Pequeno |

**Evidência.** `anosCompletos('2024-02-29', '2025-02-28')` devolve **0**, não 1. A função usa `setFullYear`, e 29/02 em ano não bissexto rola para 01/03 — então ela entende que o ano ainda não fechou.

**Impacto.** Três dias de aviso prévio a menos para quem foi admitido em 29/02 e é desligado em 28/02. Pequeno, mas **a favor do empregador**, que é o lado errado para errar num cálculo trabalhista.

**Risco técnico.** Nenhum — é aritmética de data isolada.

**Solução.** Tratar 29/02 como 28/02 em anos não bissextos ao projetar o aniversário. O comportamento atual está **fixado por teste**, então a correção não pode passar despercebida.

> Não corrigi por conta própria: alterar regra de cálculo trabalhista é decisão sua, não minha. O teste documenta o comportamento de hoje.

### Rodada 4 — 2026-07-29

| Item | Estado | O que foi feito |
|---|---|---|
| **A11Y-01** rótulos sem `htmlFor` | 🟢 **162 de 178** | Cada `<label>` ligado ao seu campo em 20 arquivos. Total de avisos do lint: 528 → 367 |

**Como os ids foram escolhidos.** Não são inventados — saem do próprio código (`formData.X`, `handleInputChange('X')`, `name="X"`), então `id="adm-cpf"` descreve o campo de verdade em vez de virar `campo-17`.

**O erro que isso quase introduziu.** Rótulo dentro de `.map()` com id fixo gera **id repetido no DOM**, e aí o `htmlFor` aponta sempre para o primeiro item da lista — o leitor de tela passa a mentir com confiança, que é pior do que não ter rótulo. Cinco casos assim foram detectados e corrigidos com id derivado da chave do item (`cargo-tempo-${d.id}`, `fb-resposta-${m.id}`). Um sexto caso era falso: o `<input>` já vivia dentro do `<label>`, então o atributo foi removido em vez de corrigido.

**Os 16 restantes não são script.** São rótulos que encabeçam um *grupo* de opções (rádio, escala de nota). Ali o correto é `<fieldset>` com `<legend>`, não `htmlFor` — é decisão de marcação caso a caso:

`EndomarketingManager:471` · `FichaColaborador:979` · `FormManager:182` · `AdmissaoCandidato:516` · `PesquisaSatisfacao:162,185` · `FuncionarioMes:260,338` · `Ouvidoria:175` · `Dashboard:3343,3444,3892,4480,6221,6240,6302`

### Rodada 5 — 2026-07-29

| Item | Estado | O que foi feito |
|---|---|---|
| **DEV-04 / OBS-01** sem observabilidade | 🟡 captura no ar, **persistência pendente** | Camada de telemetria em `src/utils/telemetria.ts`, ligada ao `ErrorBoundary` e aos handlers globais. Persistência depende de rodar o `sprint38` |

**Por que não Sentry.** Mandar payload de erro de um sistema de RH para um SaaS estrangeiro é transferência internacional de dado pessoal (LGPD Art. 33) e é decisão de quem responde pela empresa, não do código. A camada é neutra: grava no Supabase que o Instituto já usa. Trocar o destino depois é mexer em `enviar()`, uma função. A recomendação original da auditoria dizia "Sentry"; isto é uma correção de rota consciente, não um esquecimento.

**O que a camada cobre.** O `ErrorBoundary` pega erro de render. `window.onerror` e `unhandledrejection` pegam o resto — handler de evento, promessa sem catch, chunk que não carrega —, que na prática é onde mora a maioria dos erros de um SPA.

**Depuração de dados pessoais, testada.** Mensagem de erro deste sistema carrega CPF, salário e e-mail com frequência: vem de constraint do Postgres, de payload de formulário, de linha de planilha. Gravar isso criaria **uma segunda base de dados pessoais** fora de qualquer política de acesso. O filtro remove CPF, CNPJ, e-mail, telefone, valor monetário, sequência longa de dígitos e campos sensíveis citados em JSON — com 10 testes.

O teste pegou um defeito real do filtro na primeira execução: a regra de telefone casava no meio de um CPF sem máscara e deixava o primeiro dígito para trás, produzindo `1[TELEFONE]`. Ordem das regras corrigida.

**Teto no servidor, não no cliente.** A RPC recusa acima de 200 registros por minuto. O cliente também tem teto próprio, mas cliente não é lugar de impor limite — o SEC-04 já mostrou o preço disso.

**Retenção desde o primeiro dia.** 90 dias, com função de poda. O `logs_auditoria` cresce sem limite porque ninguém pensou nisso quando a tabela era pequena.

**Verificado no navegador.** Com a RPC ainda inexistente no banco, disparei uma promessa rejeitada e um erro global: os dois foram capturados e etiquetados, o app seguiu renderizado, e **a falha ao registrar não gerou erro em cascata** — que é a propriedade que importa numa camada de telemetria.

> ⚠️ **A ordem importa e não é negociável.** As Edge Functions novas só aceitam os cargos `coordenadora_rh` e `superadmin`. O papel `superadmin` **ainda não existe** — a constraint `check_cargo` só admite `coordenadora_rh` e `ti`. Se você deployar as funções antes de rodar o `sprint37`, quem hoje entra pelo e-mail fixo fica trancado para fora.
>
> **Rode o `sprint37` primeiro** (editando a linha do e-mail na seção 2), confirme as três queries da seção 5, e só então deploye as três funções.

### Sobre a CSP

Subiu como `Content-Security-Policy-Report-Only`, não como bloqueio. É deliberado: CSP mal calibrada quebra a aplicação em produção, e este projeto não tem teste automatizado para perceber. Rode uma semana em modo relatório, confira o console por violações legítimas, e só então troque o nome do cabeçalho para `Content-Security-Policy`.

---

## 0. Metodologia e limites desta auditoria

Antes de qualquer conclusão, o que **não** foi possível verificar. Isso importa porque muda o peso de vários achados, e um relatório que esconde suas próprias lacunas é pior do que um relatório curto.

| Não verificado | Por quê | Consequência para o relatório |
|---|---|---|
| Estado real do banco em produção | O conector MCP do Supabase devolve *permission denied* em `execute_sql`, `get_logs`, `list_edge_functions` | Todo achado de banco é derivado dos arquivos `.sql` do repositório. **Não sei quais migrations foram efetivamente aplicadas.** |
| Planos de execução de query (`EXPLAIN`) | Idem | Custos de query são estimados por leitura de código, não medidos |
| Comportamento autenticado da aplicação | Não há sessão ativa no preview e não insiro credenciais do usuário | Achados de UX/UI internos vêm de leitura de JSX, não de uso real |
| Métricas de runtime (renders, memória, LCP) | Sem profiling | Achados de performance são estruturais, não medidos |
| Versão realmente publicada das Edge Functions | Sem acesso à API de deploy | O código local pode divergir do que está no ar |

**Consequência prática:** os achados marcados com 🔍 exigem uma verificação sua no banco antes de virar plano de ação. Forneço a query exata em cada caso.

Um ponto de método: durante o levantamento eu suspeitei que o projeto não tivesse `strict` no TypeScript, porque `tsconfig.app.json` não o declara. Testei empiricamente e **o TypeScript 6.0 liga `strict` por padrão** — `strictNullChecks`, `noImplicitAny` e afins estão ativos. O achado virou outro, bem menor. Menciono porque o mesmo cuidado foi aplicado ao resto: onde não pude medir, digo que não medi.

---

## 1. Sumário executivo

O Omni ITO é um sistema de RH **funcional, com alcance de produto surpreendente para o tamanho da equipe** — admissão digital com assinatura, folha, ponto integrado a sistema externo, avaliação de desempenho, plano de carreira, endomarketing, ouvidoria anônima, pulse de clima, funcionário do mês, testes comportamentais e um copiloto de IA. Isso é escopo de produto que empresas com 20 engenheiros levam anos para cobrir.

E é exatamente por isso que o veredito é duro: **a velocidade de entrega foi comprada com dívida estrutural que hoje bloqueia o próximo passo.**

### Veredito por eixo

**O que está genuinamente bom.** As Edge Functions são a melhor parte do sistema: segredos em `Deno.env`, CORS com allowlist explícita de origem, validação de autorização antes de agir, e comentários que explicam *por que* cada guarda existe (o comentário sobre `informado.length > 0` em `gerar-contrato-pdf` documenta um bypass real que foi fechado). O padrão de link por token com RPC `SECURITY DEFINER` (sprints 31, 32, 34) é a decisão de arquitetura mais madura do projeto: a tabela nunca é exposta ao `anon`, só duas funções com contrato estreito. Os buckets de storage são privados e o acesso é por URL assinada com TTL. Há code splitting real (`React.lazy` em 7+ painéis). E os comentários de código são de qualidade acima da média do mercado — explicam intenção, não mecânica.

**O que está quebrado agora.** Encontrei **quatro falhas de segurança críticas**, três delas exploráveis por qualquer pessoa na internet que abra o site e leia a chave publishable do bundle — que é pública por desenho. Duas envolvem políticas RLS declaradas sem cláusula `to`, o que no Postgres significa `PUBLIC`, o que inclui `anon`. Uma delas permite **reescrever tokens de admissão**, e isso encadeia com a lógica de autorização da Edge Function de contrato para formar um bypass de autenticação completo. Outra permite **inserir registros arbitrários na tabela de auditoria** — a mesma tabela que serve de prova em reclamação trabalhista.

**Sobre escala — a premissa foi corrigida durante a auditoria.** O levantamento apontou ausência total de multi-tenancy: nenhuma coluna `empresa_id` ou equivalente em 36 tabelas. Eu tratei isso como o achado mais caro do relatório, sob a premissa de que o objetivo era SaaS B2B. **A decisão de produto, tomada em 2026-07-28, é que o Omni ITO é sistema interno do Instituto** — e sob essa premissa a ausência de tenancy não é dívida, é a modelagem correta. O item saiu do roadmap. O que resta no eixo de escala é modesto e tem horizonte de anos: `logs_auditoria` cresce sem retenção nem particionamento, e o painel carrega tabelas históricas inteiras a cada abertura.

**O que impede a manutenção.** `Dashboard.tsx` tem 6.906 linhas, 42 chamadas diretas ao Supabase, e concentra a maior parte dos 255 `useState` da aplicação. Não há camada de serviço: `supabase.from()` aparece em 26 arquivos. Não há um único teste automatizado. Não há CI. Não há Error Boundary — um erro de render em qualquer lugar apaga a tela inteira. As migrations são rodadas à mão, e **dois arquivos do repositório se desfazem mutuamente** (o `run_pending_migrations.sql` recria as políticas anônimas que o `sprint9_security_hardening.sql` remove).

### Números que resumem o estado

| Métrica | Valor | Leitura |
|---|---|---|
| Maior arquivo | 6.906 linhas (`Dashboard.tsx`) | God Component |
| Chamadas Supabase fora de qualquer abstração | 26 arquivos, 42 só no Dashboard | Sem camada de dados |
| Testes automatizados | **0** | Sem rede de segurança |
| Pipelines de CI | **0** | Nada barra código quebrado |
| `React.memo` / `useRef` no app | 0 / 0 | Sem controle de re-render |
| `.range()` (paginação) | **0** | Nenhuma query pagina |
| `select('*')` | 44 | Sem projeção de colunas |
| `<label>` sem `htmlFor` | 190 de 190 | Formulários inacessíveis |
| Texto abaixo de 12px | 595 ocorrências | Design system ilegível |
| Dependências instaladas e nunca importadas | 3 | Superfície inútil |
| Colunas de tenant | **0** | Não é multi-tenant |

---

## 2. Arquitetura

### 2.1 O que está excelente

**O padrão token → RPC `SECURITY DEFINER`.** Sprints 31, 32 e 34 resolvem o mesmo problema — dar a um anônimo acesso pontual a um dado protegido — sem nunca abrir a tabela ao `anon`. A tabela permanece fechada e só duas funções, com assinatura estreita e `set search_path = public`, ficam expostas. Este é o padrão certo e deveria ser **a regra para todo acesso anônimo do sistema**, substituindo as policies `to anon` que existem hoje.

**A regra de negócio dentro do predicado da query.** Em `submit_entrevista_desligamento`, "uma resposta por link" é garantida pelo `WHERE` de um único `UPDATE` com `get diagnostics row_count`, não por validação de UI. Isso é resistente a corrida e a cliente malicioso. É um nível de rigor que não aparece no resto do sistema, e que deveria.

**Code splitting real.** `App.tsx` carrega o `Dashboard` por `lazy`, e o `Dashboard` carrega 7+ painéis analíticos por `lazy`. O build confirma: `OverviewPanel`, `TurnoverPanel`, `ClimaPanel`, `CompensationsPanel`, `FolhaManager`, `CargosManager` e outros saem em chunks separados.

**A qualidade dos comentários.** Comentários explicam decisões e riscos aceitos, não sintaxe. O bloco `C-3` em `sprint10_fix_escalacao_privilegio.sql` documenta um risco de LGPD, a data da decisão, o motivo, e a correção futura. Isso é documentação de engenharia de verdade.

### 2.2 Achados

---

#### ARQ-01 — Ausência de multi-tenancy — ❌ **NÃO SE APLICA**

> **Decisão de produto tomada em 2026-07-28:** o Omni ITO é **sistema interno do Instituto**, não produto SaaS B2B.
>
> Com isso, este item **deixa de ser dívida técnica e passa a ser arquitetura correta**. Modelar tenancy num sistema de organização única seria complexidade sem cliente — o erro oposto, e mais caro de desfazer. O item permanece no relatório apenas para registro da decisão e do seu custo, caso a premissa mude.
>
> **Efeito no roadmap:** sai o único item de esforço Grande com 6 a 12 semanas. Todo o orçamento de engenharia que ele consumiria fica livre para os itens de segurança, teste e acessibilidade.
>
> **Gatilho de reavaliação:** se em algum momento surgir a intenção de atender uma segunda organização — ainda que uma filial com base de dados separada — este item volta a P0 **antes** de qualquer linha de código, e o custo cresce com o volume de dados acumulado até lá.

<details>
<summary>Análise original (mantida para registro)</summary>

| | |
|---|---|
| **Gravidade** | Crítica *apenas no cenário SaaS* — descartado |
| **Prioridade** | — |
| **Esforço** | Grande (6 a 12 semanas) |

**Evidência.** Busca por `empresa_id`, `tenant_id`, `organizacao_id`, `org_id`, `company_id`, `account_id` em todo `src/` e `supabase/`: **zero ocorrências**. As 36 tabelas modelam uma organização única. `perfis.cargo` tem valores como `coordenadora_rh` e `ti` — papéis globais, não papéis dentro de uma empresa.

**Impacto no produto.** O produto não pode ser vendido para um segundo cliente. Não há caminho incremental: hoje, dois clientes no mesmo banco significa que a coordenadora de RH da empresa A lê a folha de pagamento da empresa B. A alternativa operacional — um projeto Supabase por cliente — multiplica custo de infra, deploy e migração por número de clientes e não sobrevive a 20 clientes, muito menos a 100.

**Risco técnico.** Retrofit de multi-tenancy é a refatoração mais cara que existe em um sistema de dados, e o custo cresce de forma superlinear com o volume de dados e de código. Cada uma das 36 tabelas precisa de coluna de tenant, backfill, índice composto, e cada uma das ~80 policies precisa ser reescrita para incluir o predicado de tenant. Cada uma das 26 chamadas de dados no frontend precisa ser auditada. **Feito hoje custa X; feito com 5 clientes em produção custa 5X e envolve janela de manutenção.**

**Solução recomendada.** Em ordem, e não de outra forma:

1. Criar `empresas` e `perfis.empresa_id` (FK, `not null`).
2. Adicionar `empresa_id uuid not null` a todas as 36 tabelas, com backfill para a empresa existente.
3. Criar função `public.empresa_atual()` `stable security definer` que lê `empresa_id` do perfil de `auth.uid()`.
4. Reescrever **todas** as policies para incluir `empresa_id = public.empresa_atual()`. Esta é a etapa em que erros viram vazamento entre clientes — deve ser feita tabela a tabela, com teste de isolamento para cada uma.
5. Índice composto `(empresa_id, <coluna de filtro>)` em toda tabela consultada.
6. Só então remover as policies globais.

**A decisão que precede tudo isso:** se o Omni ITO vai continuar sendo sistema interno do Instituto, ARQ-01 não é um bug — é uma escolha correta, e todo o esforço acima é desperdício.

</details>

**Resolvido:** a decisão foi tomada — sistema interno. Nada a fazer.

---

#### ARQ-02 — Sem camada de acesso a dados

| | |
|---|---|
| **Gravidade** | **Alta** |
| **Prioridade** | **P1** |
| **Esforço** | **Médio** |

**Evidência.** Não existem `src/services`, `src/lib`, `src/api`, `src/store`, `src/context` nem `src/providers`. `supabase.from|rpc|storage|auth` aparece em 26 arquivos, distribuído assim:

```
Dashboard.tsx           42
CargosManager.tsx       20
FeedbackManager.tsx      8
FuncionarioMesManager    7
OrganogramaManager       6
CopilotWidget            6
… mais 20 arquivos
```

**Impacto no produto.** Toda mudança de schema exige caçar chamadas espalhadas por 26 arquivos. Não há um lugar onde colocar cache, retry, tratamento de erro padronizado ou telemetria — então essas coisas simplesmente não existem. Quando ARQ-01 for feito, o filtro de tenant terá que ser adicionado em 26 lugares em vez de um.

**Risco técnico.** É o multiplicador de custo de todos os outros itens. Sem esta camada, PERF-01 (paginação), OBS-01 (observabilidade) e ARQ-01 (tenancy) custam cada um 26 edições em vez de uma.

**Solução recomendada.** `src/services/<dominio>.ts` exportando funções tipadas — `listarColaboradores(filtros, paginacao)`, `salvarColaborador(dados)`. Nenhum componente importa `supabaseClient` diretamente; regra garantida por lint (`no-restricted-imports`). Migrar por domínio, começando pelo mais usado (colaboradores), não tudo de uma vez.

---

#### ARQ-03 — God Component: `Dashboard.tsx` com 6.906 linhas

| | |
|---|---|
| **Gravidade** | **Alta** |
| **Prioridade** | **P1** |
| **Esforço** | **Grande** |

**Evidência.** 6.906 linhas — 29% de todo o código da aplicação em um arquivo. 42 chamadas ao Supabase, 17 `useEffect`, 8 funções `fetch*`, e a maior parte dos 255 `useState` do projeto. A extração da ficha do colaborador (commit `7167e50`, feita nesta sessão) tirou 1.187 linhas e o arquivo continua com quase 7 mil.

**Impacto no produto.** Duas pessoas não conseguem trabalhar no painel sem conflito de merge. O arquivo excede o que se consegue revisar com atenção — o que aumenta a chance de bug em cada alteração.

**Risco técnico.** Todo estado num componente só significa que **qualquer** `setState` re-renderiza a árvore inteira (ver PERF-02). Com 0 `React.memo` no projeto, não há barreira nenhuma.

**Solução recomendada.** Continuar a extração já iniciada, um módulo por vez, cada um com commit próprio e diff verificável: aba de colaboradores, aba de documentos, aba de admissão, aba de ponto, aba de folha. Meta razoável: nenhum arquivo acima de 500 linhas. **Método que já se provou nesta sessão:** mover o JSX byte a byte primeiro, verificar com `diff` que nada mudou, e só redesenhar num commit seguinte.

---

#### ARQ-04 — Código morto: `ColaboradorProntuarioModal.tsx`

| | |
|---|---|
| **Gravidade** | Baixa |
| **Prioridade** | **P3** |
| **Esforço** | Pequeno |

**Evidência.** 289 linhas. Busca por `ColaboradorProntuarioModal` retorna apenas auto-referências (linhas 15, 24 e 289 do próprio arquivo). Nenhum import em qualquer lugar.

**Impacto.** Confunde quem procura onde a ficha do colaborador é renderizada — há dois candidatos e só um é real. Aumenta o tempo de onboarding de qualquer pessoa nova.

**Solução.** Remover. Está no git se alguém precisar.

---

#### ARQ-05 — `supabaseClient` degrada em silêncio

| | |
|---|---|
| **Gravidade** | Média |
| **Prioridade** | **P2** |
| **Esforço** | Pequeno |

**Evidência.** `src/supabaseClient.ts`:

```ts
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';
```

**Impacto.** Um deploy sem variável de ambiente **sobe e parece funcionar**: a UI renderiza, e cada query falha individualmente com erro de rede. O usuário vê telas vazias em vez de uma falha clara. O diagnóstico leva horas.

**Risco técnico.** Falha silenciosa em configuração é a categoria mais cara de incidente porque o alarme não dispara.

**Solução.** `throw new Error('VITE_SUPABASE_URL ausente')` no boot. Falhar alto e cedo. Complementar: validar as variáveis num passo do build.

---

#### ARQ-06 — `.env.example` com chave real e duas variáveis para a mesma coisa

| | |
|---|---|
| **Gravidade** | Média |
| **Prioridade** | **P2** |
| **Esforço** | Pequeno |

**Evidência.** `.env.example` (versionado) contém a URL real do projeto e `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_DbtXhqxSVooWYtfLMNoFUg_Xw5m0dTU` — valor completo, não placeholder. Além disso define `VITE_SUPABASE_ANON_KEY` **e** `VITE_SUPABASE_PUBLISHABLE_KEY`, mas `supabaseClient.ts` lê apenas a primeira.

**Impacto.** A chave é publicável por desenho e não é, sozinha, uma falha. Mas o arquivo entrega de graça o *project ref* e uma chave válida para quem clonar o repositório — reduzindo a zero o esforço de sondar as policies RLS (que, como este relatório mostra, têm buracos). Uma variável ignorada leva alguém a preencher a errada e perder tempo.

**Solução.** Placeholders literais no `.env.example`. Remover a variável não utilizada. O `.gitignore` já cobre `.env` corretamente — isso está certo.

---

#### ARQ-07 — `strict` do TypeScript é implícito

| | |
|---|---|
| **Gravidade** | Baixa |
| **Prioridade** | **P3** |
| **Esforço** | Pequeno |

**Evidência.** `tsconfig.app.json` não declara `strict`. Verifiquei empiricamente: o TypeScript 6.0.3 aplica `strictNullChecks`, `noImplicitAny` e demais por padrão. O projeto **é** estrito hoje.

**Risco técnico.** A garantia depende de um default de versão. Um downgrade para TS 5.x, ou uma ferramenta que assuma semântica antiga, desliga a checagem inteira sem um único erro — e centenas de bugs de `null` passam a compilar.

**Solução.** `"strict": true` explícito. Uma linha.

---

## 3. Performance

Todos os itens abaixo são **estruturais**, derivados de leitura de código. Nenhum foi medido em runtime — não tive profiling disponível.

---

#### PERF-01 — Nenhuma query pagina; 7 tabelas inteiras por abertura de tela

| | |
|---|---|
| **Gravidade** | **Crítica** (em escala) / Média (nos 25 colaboradores atuais) |
| **Prioridade** | **P1** |
| **Esforço** | Médio |

**Evidência.** `.range()` aparece **zero vezes** em todo o `src/`. `.limit()` aparece 9 vezes. `select('*')` aparece 44 vezes. `fetchColaboradoresList` (`Dashboard.tsx:1561`):

```ts
const [colabsRes, benefitsRes, assocRes, planosRes, avaliacoesRes, desligRes, movRes] =
  await Promise.all([
    supabase.from('colaboradores').select('*').order('nome'),
    supabase.from('beneficios').select('*'),
    supabase.from('colaborador_beneficios').select('*'),
    supabase.from('planos_carreira').select('*'),
    supabase.from('avaliacoes_desempenho').select('*').order('data_avaliacao', …),
    supabase.from('desligamentos').select('*').order('data_limite_pagamento'),
    supabase.from('movimentacoes_pessoal').select('*')
  ]);
```

Sete tabelas inteiras, sem filtro, sem projeção, sem limite. E depois filtradas em JavaScript (`.filter(c => c.status !== 'desligado')`).

**Impacto no produto.** Com 25 colaboradores é imperceptível. Com 500 colaboradores e 5 anos de avaliações e movimentações, `avaliacoes_desempenho` sozinha passa de dezenas de milhares de linhas trafegando a cada abertura do painel. O tempo até a tela usável cresce linearmente com a idade da empresa — o sistema fica mais lento a cada mês que passa, sem que nada tenha mudado.

**Risco técnico adicional, e este é de segurança:** `select('*')` em `colaboradores` traz CPF, RG, salário, dados bancários, deficiência e medicação contínua **para a memória do navegador de qualquer usuário logado**, inclusive perfis `ti`. Mesmo que a UI não mostre, o dado está no `localStorage`/heap e no DevTools. Ver SEC-05.

**Solução recomendada.**
1. Projeção explícita de colunas em toda query — nunca `*` em tabelas com dado sensível.
2. Paginação com `.range()` nas listas (colaboradores, avaliações, movimentações).
3. Mover a agregação para o banco: uma view ou RPC que devolve o resumo já calculado, em vez de trazer 7 tabelas para somar no cliente.
4. As tabelas de referência pequenas (`beneficios`, `planos_carreira`) podem continuar carregando inteiras — são catálogos.

---

#### PERF-02 — Zero memoização em uma árvore com 255 `useState`

| | |
|---|---|
| **Gravidade** | **Alta** |
| **Prioridade** | **P1** |
| **Esforço** | Médio |

**Evidência.** `React.memo`: **0 ocorrências**. `useRef`: **0 ocorrências**. `useCallback`: 7. `useMemo`: 38. Contra 255 `useState` e 64 `useEffect`.

**Impacto no produto.** Digitar num campo de busca do painel dispara re-render de toda a árvore do `Dashboard`, incluindo listas, cards e gráficos Recharts. Recharts é notoriamente caro para re-renderizar — o chunk `generateCategoricalChart` tem 363 kB. O sintoma é digitação com atraso perceptível, e piora com o volume de dados.

**Risco técnico.** Zero `useRef` num app com 64 `useEffect`, 15 `setTimeout` e 2 `setInterval` é um sinal específico: **não há guarda de "componente ainda montado"** nos efeitos assíncronos. Isso é a receita de `setState` após desmontagem e de vazamento de listener. (Exceção elogiável: `RedefinirSenha.tsx` usa uma flag `vivo` local — o padrão certo, mas isolado.)

**Solução recomendada.**
1. Auditar os 64 `useEffect` procurando `setState` assíncrono sem guarda de montagem e `setInterval` sem `clearInterval` no cleanup. **Este é o item de maior risco de bug real desta seção.**
2. `React.memo` nos itens de lista e nos wrappers de gráfico.
3. `useCallback` nos handlers passados como prop para itens memoizados — sem isso o `memo` não tem efeito.
4. Ordem correta: resolver ARQ-03 primeiro. Quebrar o God Component reduz o escopo de re-render naturalmente e faz metade deste trabalho sozinho.

---

#### PERF-03 — Bundle de entrada com 645 kB

| | |
|---|---|
| **Gravidade** | Média |
| **Prioridade** | **P2** |
| **Esforço** | Médio |

**Evidência.** Saída medida do `npm run build`:

```
index-XbWjdMro.js                 644,82 kB │ gzip: 173,58 kB
generateCategoricalChart (Recharts) 363,45 kB │ gzip:  96,65 kB
Dashboard-B6OZj0cP.js             272,68 kB │ gzip:  58,84 kB
```

**Impacto no produto.** 174 kB comprimidos só no entry, antes de qualquer dado. Em 4G de Maceió isso é aproximadamente 1,5 a 3 segundos só de download, somados ao parse. A landing page pública — a primeira coisa que um candidato vê — paga esse custo sem precisar de nada disso.

**Risco técnico.** Recharts inteiro entra no bundle; ele não é *tree-shakeable* de forma eficaz quando importado por barril.

**Solução.** Separar o entry da landing pública do entry do app. Trocar imports de Recharts por caminho direto ou avaliar substituição por SVG próprio nos gráficos simples (vários são barra e linha básicas). Configurar `manualChunks` para isolar vendor.

---

#### PERF-04 — Filtragem e agregação em JavaScript sobre dataset completo

| | |
|---|---|
| **Gravidade** | Média |
| **Prioridade** | **P2** |
| **Esforço** | Médio |

**Evidência.** Padrão recorrente: buscar tudo e reduzir no cliente. Exemplo do relatório de vale-transporte:

```ts
const optantes = colaboradoresList
  .filter(c => c && c.vt_opta && (c.status === 'ativo' || c.status === 'em_ferias' || c.status === 'pendente'))
```

**Impacto.** Transferência e memória proporcionais ao total, não ao resultado. O Postgres faria isso com índice em milissegundos e devolveria só as linhas necessárias.

**Solução.** Empurrar filtro para a query (`.eq('vt_opta', true).in('status', [...])`) e agregação para views/RPCs. Depende de BD-01 (índices) para valer a pena.

---

#### PERF-05 — Sem virtualização de listas

| | |
|---|---|
| **Gravidade** | Baixa hoje / Alta acima de ~500 linhas |
| **Prioridade** | **P3** |
| **Esforço** | Médio |

**Evidência.** Nenhuma biblioteca de virtualização. Listas renderizam `.map()` completo.

**Impacto.** Com 25 colaboradores, irrelevante. Com 2.000, a tabela cria 2.000 nós de DOM e a rolagem trava.

**Solução.** Só depois de PERF-01. Com paginação de 50 itens, virtualização vira desnecessária. **Resolver o problema certo primeiro.**

---

## 4. Banco de dados

🔍 Toda esta seção deriva dos arquivos `.sql`. **Não sei o que está aplicado em produção.** Rode isto antes de agir:

```sql
select schemaname, tablename, policyname, roles, cmd, qual
from pg_policies where schemaname = 'public' order by tablename;
```

---

#### BD-01 — Chaves estrangeiras sem índice

| | |
|---|---|
| **Gravidade** | **Alta** |
| **Prioridade** | **P1** |
| **Esforço** | Pequeno |

**Evidência.** 28 declarações `references` contra 37 índices, e a maioria dos índices existentes é em colunas de filtro (`status`, `criado_em`), não em FK. Especificamente, não encontrei índice para:

- `colaborador_advertencias.colaborador_id`
- `avaliacoes_desempenho.colaborador_id`
- `desligamentos.colaborador_id`
- `colaborador_beneficios.colaborador_id` e `.beneficio_id`
- `documentos_assinados.colaborador_id`
- `acoes_endomarketing` (FKs da sprint 33)

E em `colaboradores`, o único índice é `ix_colaboradores_matricula` — **não há índice em `status`**, que é a coluna mais filtrada de todo o sistema.

**Impacto.** O Postgres **não cria índice de FK automaticamente** (cria só para PK e unique). Cada join colaborador↔avaliação vira *sequential scan*. Pior: todo `DELETE` em `colaboradores` precisa varrer cada tabela filha inteira para checar a FK — um desligamento com `on delete cascade` vira uma cascata de scans completos e é um candidato natural a lock longo e deadlock sob concorrência.

**Solução.**

```sql
create index concurrently if not exists ix_advertencias_colab
  on public.colaborador_advertencias(colaborador_id);
create index concurrently if not exists ix_avaliacoes_colab
  on public.avaliacoes_desempenho(colaborador_id);
create index concurrently if not exists ix_desligamentos_colab
  on public.desligamentos(colaborador_id);
create index concurrently if not exists ix_colab_beneficios_colab
  on public.colaborador_beneficios(colaborador_id);
create index concurrently if not exists ix_colab_beneficios_benef
  on public.colaborador_beneficios(beneficio_id);
create index concurrently if not exists ix_colaboradores_status
  on public.colaboradores(status);
```

`concurrently` para não travar escrita. **Esforço pequeno, ganho grande — é o melhor custo-benefício da auditoria inteira.**

---

#### BD-02 — Migrations sem versionamento, ordem ou registro

| | |
|---|---|
| **Gravidade** | **Alta** |
| **Prioridade** | **P1** |
| **Esforço** | Médio |

**Evidência.** 44 arquivos `.sql` soltos em `supabase/`, nomeados por sprint. Não há `supabase/migrations/` no formato do CLI, não há tabela de controle, não há ordem forçada. Existem `run_pending_migrations.sql` e `apoio_*.sql` — nomes que sugerem execução manual seletiva. Três arquivos estão escritos mas **não aplicados** (sprints 33, 34 e 35), o que significa que o repositório e o banco estão divergentes agora.

**Impacto.** Ninguém consegue responder com certeza "qual é o schema de produção?". Recriar o ambiente do zero exige adivinhar a ordem. Um colaborador novo não tem caminho reproduzível.

**Risco técnico.** É o que torna BD-03 (abaixo) possível — e BD-03 é uma falha de segurança crítica.

**Solução.** Adotar `supabase/migrations/<timestamp>_<nome>.sql` e `supabase db push`. Consolidar o estado atual num baseline. Aposentar `run_pending_migrations.sql`.

---

#### BD-03 — Dois arquivos de migration se desfazem mutuamente 🔍

| | |
|---|---|
| **Gravidade** | **Crítica** |
| **Prioridade** | **P0** |
| **Esforço** | Pequeno |

**Evidência.** Está documentado no próprio repositório, em `sprint10_fix_escalacao_privilegio.sql:132`:

> `C-4  supabase/run_pending_migrations.sql recria as policies anônimas que o sprint9_security_hardening.sql remove. Enquanto os dois existirem no repositório, o próximo a rodar o script errado reabre as brechas.`

Confirmei. `sprint9_security_hardening.sql:125` faz `DROP POLICY "Update publico de tokens"`. `run_pending_migrations.sql:177` recria:

```sql
create policy "Update publico de tokens"
  on public.admission_tokens for update
  using (true)
  with check (true);
```

**Sem cláusula `to`.** No Postgres, isso é `TO PUBLIC` — inclui `anon`.

**Impacto.** Ver SEC-02: é um bypass de autenticação completo. E o mecanismo que o reabre é *rodar um arquivo do próprio repositório*.

**Solução.** Apagar `run_pending_migrations.sql` do repositório após extrair o que ainda for necessário para uma migration corretamente escoped. **Enquanto o arquivo existir, a brecha está a um comando de distância.**

---

#### BD-04 — Dados sensíveis e operacionais na mesma tabela, sob a mesma policy

| | |
|---|---|
| **Gravidade** | **Alta** (LGPD Art. 11) |
| **Prioridade** | **P1** |
| **Esforço** | Grande |

**Evidência.** `colaboradores` contém nome, cargo e setor lado a lado com CPF, RG, salário, dados bancários, deficiência e medicação contínua. Uma única policy governa todas as colunas — e o RLS do Postgres **não restringe por coluna**. Documentado no bloco `C-3` do sprint 10 como risco aceito em 2026-07-15.

**Impacto.** Dado de saúde é dado sensível pelo Art. 11 da LGPD e exige base legal e tratamento próprios. Hoje quem tem acesso ao nome tem acesso à medicação.

**Risco técnico.** Se o produto virar SaaS (ARQ-01), este item passa de "risco interno aceito" a "exposição entre clientes" — a gravidade sobe automaticamente.

**Solução.** Já está escrita, corretamente, no próprio comentário do sprint 10: mover colunas sensíveis para `colaboradores_dados_sensiveis` com policy restrita a `coordenadora_rh`, deixando em `colaboradores` só o operacional. Fazer junto com PERF-01 (fim do `select('*')`) — as duas mudanças se apoiam.

---

#### BD-05 — Funções `SECURITY DEFINER` sem `set search_path`

| | |
|---|---|
| **Gravidade** | **Alta** |
| **Prioridade** | **P1** |
| **Esforço** | Pequeno |

**Evidência.** Documentado no próprio repositório (`sprint10:136`): *"A-3 as demais funções SECURITY DEFINER seguem sem `set search_path`"*. As funções novas (sprints 31/32/34) têm; as antigas não.

**Impacto.** Função `SECURITY DEFINER` sem `search_path` fixo resolve nomes pelo `search_path` de quem chama. Um usuário que consiga criar um schema e uma tabela homônima faz a função privilegiada operar sobre a tabela dele — escalada de privilégio clássica no Postgres (CVE-2018-1058).

**Solução.** `alter function ... set search_path = public` em todas. Auditar com:

```sql
select p.proname, p.prosecdef, p.proconfig
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef and p.proconfig is null;
```

---

#### BD-06 — `organograma_nos` sem FK real para `colaboradores`

| | |
|---|---|
| **Gravidade** | Média |
| **Prioridade** | **P2** |
| **Esforço** | Pequeno |

**Evidência.** `organograma.sql:9`: `colaborador_id uuid,  -- vínculo opcional a colaboradores.id (sem FK rígida p/ evitar mismatch de tipo)`.

**Impacto.** Nada impede referência a colaborador inexistente. Desligar alguém deixa nó órfão apontando para UUID morto, e o organograma passa a mentir silenciosamente.

**Solução.** Investigar o "mismatch de tipo" citado — se `colaboradores.id` é `uuid`, a FK funciona. Adicionar `references colaboradores(id) on delete set null`.

---

## 5. Segurança

Esta é a seção mais grave do relatório. Contexto que amplifica tudo: **o frontend usa apenas a chave publishable, que é pública por desenho e está no bundle JavaScript.** Quem protege os dados é exclusivamente o RLS. Qualquer policy frouxa é diretamente explorável do console do navegador.

---

#### SEC-01 — `organograma_nos`: leitura e escrita liberadas para anônimos 🔍

| | |
|---|---|
| **Gravidade** | **CRÍTICA** |
| **Prioridade** | **P0 — hoje** |
| **Esforço** | Pequeno |

**Evidência.** `organograma.sql:17-20`:

```sql
create policy "organograma leitura" on organograma_nos for select using (true);
create policy "organograma escrita" on organograma_nos for all using (true) with check (true);
```

Nenhuma das duas tem cláusula `to`. O default do Postgres é `TO PUBLIC`, que inclui `anon`. A segunda é `for all` — SELECT, INSERT, UPDATE **e DELETE**.

**Impacto no produto.** Qualquer pessoa que abra `omni-ito.vercel.app`, leia a chave publishable do bundle (30 segundos de DevTools) e faça uma chamada REST pode: ler o organograma inteiro do Instituto, **alterar a hierarquia**, ou **apagar a tabela toda** com um `delete`. O organograma expõe estrutura organizacional e nomes de coordenação — insumo direto para engenharia social e phishing dirigido.

**Risco técnico.** `on delete cascade` no `parent_id` significa que apagar o nó raiz ("CEO") **derruba a árvore inteira em uma única chamada**. Não há backup automático nem *soft delete*.

**Verificação (rodar antes de corrigir):**

```sql
select policyname, roles, cmd from pg_policies
where tablename = 'organograma_nos';
-- roles contendo {public} ou {anon} confirma o achado
```

**Solução recomendada.**

```sql
drop policy if exists "organograma leitura" on public.organograma_nos;
drop policy if exists "organograma escrita" on public.organograma_nos;

create policy "organograma leitura" on public.organograma_nos
  for select to authenticated using (true);

create policy "organograma escrita" on public.organograma_nos
  for all to authenticated
  using (public.get_user_role() = 'coordenadora_rh')
  with check (public.get_user_role() = 'coordenadora_rh');
```

---

#### SEC-02 — `admission_tokens`: UPDATE anônimo, encadeando para bypass de autenticação 🔍

| | |
|---|---|
| **Gravidade** | **CRÍTICA** |
| **Prioridade** | **P0 — hoje** |
| **Esforço** | Pequeno |

**Evidência.** `run_pending_migrations.sql:177-181` recria a policy que o hardening removeu, sem `to`:

```sql
create policy "Update publico de tokens"
  on public.admission_tokens for update
  using (true) with check (true);
```

**A cadeia de exploração.** A Edge Function `gerar-contrato-pdf` autoriza em dois modos. O Modo B dispensa JWT:

```ts
const isExpired = new Date(tokenRow.expira_em) < new Date();
const informado = cpfDigits(candidateCpf);
const esperado  = cpfDigits(tokenRow.candidato_cpf || details.cpf);
if (!isExpired && informado.length > 0 && informado === esperado &&
    (tokenRow.status === 'aguardando_assinatura' || tokenRow.status === 'aguardando_assinatura_rh')) {
  isAuthorized = true;
}
```

Todos os três campos que essa checagem consulta — `expira_em`, `candidato_cpf`, `status` — estão na tabela que o anônimo pode **atualizar**. Um atacante que descubra ou obtenha um token pode reescrever `candidato_cpf` para um valor que ele conhece, `expira_em` para o futuro e `status` para `aguardando_assinatura`, e então acionar a geração de contrato com dados de um colaborador real.

Note que a guarda `informado.length > 0` está lá justamente porque um bypass anterior foi identificado e fechado. A defesa está correta; **o problema é que os dados sobre os quais ela decide não estão protegidos.**

**Impacto no produto.** Geração de documento contratual com dados pessoais de terceiro, e corrupção do fluxo de admissão em produção.

**Verificação:**

```sql
select policyname, roles, cmd, qual, with_check
from pg_policies where tablename = 'admission_tokens';
```

**Solução recomendada.**
1. Remover a policy imediatamente: `drop policy if exists "Update publico de tokens" on public.admission_tokens;`
2. Substituir o acesso anônimo por RPC `SECURITY DEFINER` com contrato estreito — **o padrão que o próprio projeto já usa corretamente nas sprints 31/32/34**. A RPC recebe token + CPF, valida internamente e faz a transição de status permitida; nunca aceita `expira_em` ou `candidato_cpf` do cliente.
3. Apagar `run_pending_migrations.sql` (ver BD-03).

---

#### SEC-03 — Autorização por domínio de e-mail e backdoor fixo no código

| | |
|---|---|
| **Gravidade** | **CRÍTICA** |
| **Prioridade** | **P0** |
| **Esforço** | Médio |

**Evidência.** O mesmo trecho aparece nas três Edge Functions (`copilot:272`, `gerar-contrato-pdf:256`, e o mesmo padrão em `pontofopag-sync`):

```ts
if (profile?.cargo === 'coordenadora_rh'
    || user.email === 'ito.thiagosilva@gmail.com'
    || emailDomain === 'itoinstituto.com.br') {
  isAuthorized = true;
}
```

**Dois problemas independentes.**

*Primeiro:* qualquer conta com e-mail `@itoinstituto.com.br` recebe privilégio de RH, **contornando completamente o modelo de papéis de `perfis.cargo`**. Um estagiário, um perfil `ti`, ou qualquer conta institucional gera contratos e consulta o copiloto com contexto de RH. O trigger de cadastro (`sprint10`) cria todo mundo como `ti` justamente para que a promoção seja ato administrativo — e essa regra é anulada aqui.

*Segundo:* há um e-mail pessoal do Gmail codificado como superadmin em três arquivos. Isso é uma credencial de autorização em código-fonte versionado. Se essa conta for comprometida, ou se a pessoa sair da organização, o acesso persiste e a revogação exige alterar código e fazer deploy de três funções.

**Impacto no produto.** O controle de acesso do sistema é efetivamente "tem e-mail da empresa", não "tem o papel certo".

**Risco técnico.** Se a confirmação de e-mail estiver desligada no Supabase Auth, a superfície piora: basta *afirmar* um endereço do domínio no cadastro. 🔍 **Verifique isto no painel: Authentication → Providers → Email → Confirm email.** O trigger valida o domínio, mas não a posse do endereço.

**Solução recomendada.**
1. Remover as duas condições de escape. Autorizar **apenas** por `perfis.cargo`.
2. Criar papel `superadmin` em `perfis` e conceder à pessoa nominalmente, no banco.
3. Confirmar que a confirmação de e-mail está ativa.
4. Centralizar a checagem numa função compartilhada entre as três Edge Functions — hoje a mesma regra está triplicada, e corrigir em dois lugares e esquecer o terceiro é o desfecho provável.

---

#### SEC-04 — Trilha de auditoria gravável por anônimos

| | |
|---|---|
| **Gravidade** | **CRÍTICA** |
| **Prioridade** | **P0** |
| **Esforço** | Pequeno |

**Evidência.** `run_pending_migrations.sql:192-195`:

```sql
create policy "Insercao anonima de logs de auditoria"
  on public.logs_auditoria for insert
  to anon with check (true);
```

E o equivalente para `documentos_assinados` (linhas 185-188).

**Impacto no produto.** `logs_auditoria` é o registro que sustenta a defesa da empresa em reclamação trabalhista e em fiscalização da ANPD. Com `with check (true)` para `anon`, qualquer um insere entradas arbitrárias — inclusive atribuindo ações a e-mails de funcionários reais. **Uma trilha de auditoria que qualquer um pode escrever não é prova de nada**, e uma vez contaminada não há como distinguir registro legítimo de forjado retroativamente.

Adicionalmente: inserção sem limite é vetor de exaustão de armazenamento e custo.

**Solução recomendada.**
1. Remover a policy.
2. Auditoria só por RPC `SECURITY DEFINER` que preenche `usuario_email` a partir de `auth.jwt()`, nunca do payload do cliente.
3. Revogar `UPDATE` e `DELETE` de todos os papéis da aplicação — a tabela deve ser *append-only*.
4. 🔍 Verificar se já há registros forjados: `select usuario_email, count(*) from logs_auditoria group by 1 order by 2 desc;` — e-mails desconhecidos ou nulos merecem investigação.

---

#### SEC-05 — Todo usuário autenticado lê a base de RH inteira

| | |
|---|---|
| **Gravidade** | **Alta** |
| **Prioridade** | **P1** |
| **Esforço** | Grande |

**Evidência.** Aproximadamente 25 policies com `using (true) to authenticated`, em `cargos`, `trilhas_carreira`, `promocoes`, `folha_lancamentos`, `avaliacoes_desempenho`, `planos_carreira`, `colaborador_advertencias`, `movimentacoes_pessoal`, `beneficios` e outras. Documentado como risco aceito no bloco `C-3` do sprint 10.

**Análise.** A decisão está registrada com data e justificativa, e a justificativa é coerente: o papel `ti` é definido como "suporte, somente leitura". **Não vou tratar isso como esquecimento** — foi decidido conscientemente.

Dito isso, três coisas mudaram ou merecem revisão:

1. **Não é só leitura.** Várias dessas policies são `for all`, não `for select` (`sprint8_beneficios_limpeza.sql:31,45`; `supabase_setup.sql:157,163`). Um perfil `ti` **escreve** onde a justificativa fala em ler.
2. O risco de LGPD Art. 11 (dados de saúde) segue aberto, como o próprio comentário reconhece.
3. Se o produto virar SaaS, isso deixa de ser decisão interna defensável.

**Solução.** Segregar por necessidade: `coordenadora_rh` lê tudo; `ti` lê apenas o operacional (nome, cargo, setor, status), sem folha, sem saúde, sem dados bancários. Depende de BD-04 (separar as colunas sensíveis) — mas **a auditoria das policies `for all` pode e deve ser feita antes, é rápida e não depende de nada.**

---

#### SEC-06 — Upload sem validação do lado servidor

| | |
|---|---|
| **Gravidade** | **Alta** |
| **Prioridade** | **P1** |
| **Esforço** | Médio |

**Evidência.** A única validação encontrada é o atributo `accept` do `<input type="file">` — 8 ocorrências. Busca por `file.size`: **zero**. Busca por verificação de MIME ou *magic bytes*: **zero**. A policy de storage para anônimos:

```sql
create policy "Permitir upload de admissao por candidatos anonimos"
  on storage.objects for insert to anon
  with check (bucket_id = 'documentos-envios'
              and (storage.foldername(name))[1] = 'admissao');
```

Só valida o prefixo do caminho. **Nada sobre tipo, tamanho ou quantidade.**

**Impacto no produto.** `accept` é dica de UI e não é aplicado — qualquer cliente HTTP ignora. Um anônimo pode subir arquivos de qualquer tipo e tamanho, em qualquer quantidade, no bucket de admissão. Vetores: exaustão de cota e custo de storage; hospedagem de malware em domínio do Instituto; e arquivo malicioso servido para a coordenadora quando ela abre o documento pela URL assinada.

**Ponto positivo real:** os buckets são privados (`public = false`) e o acesso é por URL assinada com TTL de 60 a 3600 segundos. Isso limita bastante o cenário de distribuição pública. É o motivo de este item ser Alta e não Crítica.

**Solução recomendada.**
1. Limite de tamanho por arquivo no bucket (configuração do Supabase Storage) e `allowedMimeTypes`.
2. Validar *magic bytes* no servidor — a extensão e o `Content-Type` são declarados pelo cliente. Um `.pdf` que começa com `<?php` ou `<script` precisa ser rejeitado.
3. Rate limit por token de admissão: N arquivos por token, não ilimitado.
4. `Content-Disposition: attachment` e `X-Content-Type-Options: nosniff` ao servir documentos, para evitar renderização inline de HTML/SVG malicioso.

---

#### SEC-07 — Sem rate limiting no servidor

| | |
|---|---|
| **Gravidade** | **Alta** |
| **Prioridade** | **P1** |
| **Esforço** | Médio |

**Evidência.** O único rate limit é `src/hooks/useRateLimit.ts`, em `localStorage`. O próprio arquivo documenta a limitação com honestidade:

> *"isso não é um rate limit 'de verdade' — quem quiser bypassa em modo anônimo ou trocando de navegador."*

No servidor: nenhum. As RPCs abertas ao `anon` sem qualquer limite são `registrar_pulse`, `submit_teste_comportamental`, `submit_entrevista_desligamento`, `get_teste_by_token`, `registrar_voto_funcionario_mes`, `listar_colaboradores_ativos_votacao` e `inserir_colaborador_via_admissao`.

**Impacto no produto.**
- **Custo direto:** o copiloto chama a OpenRouter. Um usuário autorizado (e SEC-03 mostra que "autorizado" é frouxo) pode gerar custo ilimitado num laço.
- **Integridade de dados:** `registrar_pulse` e `registrar_voto_funcionario_mes` são pesquisas anônimas. Sem limite no servidor, o resultado é manipulável em massa — e o pulse de clima alimenta `pulse_alertas`, que dispara ação de RH. Uma pesquisa de clima que pode ser fraudada por script é pior que nenhuma pesquisa, porque produz decisão errada com aparência de dado.
- **Enumeração:** `get_teste_by_token` sem limite permite força bruta de token.

**Solução recomendada.**
1. Rate limit por IP nas Edge Functions (tabela de contagem em Postgres ou Upstash).
2. Cota diária por usuário no copiloto, registrada em banco.
3. Nas RPCs anônimas, limite por `device_id`/token no servidor. `registrar_pulse` já usa `device_id` — falta impor o limite lá dentro, e não no cliente.
4. Tokens com entropia suficiente (mínimo 128 bits) — 🔍 verificar como são gerados.

---

#### SEC-08 — Nenhum cabeçalho de segurança HTTP

| | |
|---|---|
| **Gravidade** | **Alta** |
| **Prioridade** | **P1** |
| **Esforço** | Pequeno |

**Evidência.** `vercel.json` contém apenas `rewrites` — nenhum bloco `headers`. `index.html` não tem nenhuma meta tag de segurança. Portanto **não existem**: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.

**Impacto no produto.**
- Sem `X-Frame-Options`/`frame-ancestors`: o app pode ser embutido em iframe de terceiro — *clickjacking* contra a coordenadora de RH logada.
- Sem CSP: qualquer XSS que apareça no futuro tem execução irrestrita e pode exfiltrar para qualquer domínio.
- Sem `Referrer-Policy`: URLs com token (links de admissão, entrevista, teste) vazam no header `Referer` ao clicar em link externo. **Isto é concreto:** existem 10 links `target="_blank"` no sistema.
- Sem `nosniff`: reforça SEC-06.

**Ponto positivo:** os 10 `target="_blank"` **têm** `rel="noopener noreferrer"`. Isso está correto e cobre parte do vazamento de referrer.

**Solução recomendada** — `vercel.json`:

```json
{
  "headers": [{
    "source": "/(.*)",
    "headers": [
      { "key": "X-Frame-Options", "value": "DENY" },
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
      { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
      { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
      { "key": "Content-Security-Policy",
        "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" }
    ]
  }]
}
```

Subir a CSP primeiro em `Content-Security-Policy-Report-Only` por uma semana. Uma CSP mal calibrada quebra a aplicação em produção.

---

#### SEC-09 — Vetores verificados e **não** encontrados

Registro pelo valor de completude — a ausência aqui é resultado, não omissão:

| Vetor | Resultado |
|---|---|
| XSS por `dangerouslySetInnerHTML` | ✅ zero ocorrências |
| `innerHTML`, `document.write`, `eval()` | ✅ zero ocorrências |
| SQL Injection | ✅ nenhuma concatenação de SQL; tudo por PostgREST ou função parametrizada |
| `service_role` no frontend | ✅ zero — só em `Deno.env` das Edge Functions, correto |
| Segredos versionados | ✅ `.env` corretamente no `.gitignore` (ressalva em ARQ-06) |
| Buckets públicos | ✅ todos `public = false` |
| `target="_blank"` sem `rel` | ✅ todos os 10 têm `noopener noreferrer` |
| CORS irrestrito nas Edge Functions | ✅ allowlist explícita por origem, sem `*` |
| CSRF | ✅ N/A — autenticação por Bearer token, não cookie |
| Open Redirect | ✅ nenhum redirect com destino vindo de parâmetro |

**Sobre logs:** 60 `console.error` e 4 `console.log`. Não encontrei impressão de senha ou token, mas objetos de erro do Supabase podem carregar payload. Revisão recomendada em conjunto com OBS-01 (gravidade Baixa).

---

## 6. UI e Design System

---

#### UI-01 — Tipografia abaixo do limite de legibilidade em todo o sistema

| | |
|---|---|
| **Gravidade** | **Alta** |
| **Prioridade** | **P1** |
| **Esforço** | Médio |

**Evidência.** Contagem de classes por tamanho em todo o `src/`:

| Tamanho | Ocorrências |
|---|---|
| `text-[8px]` | 33 |
| `text-[9px]` | 197 |
| `text-[10px]` | 365 |
| `text-[11px]` | 92 |
| **Subtotal abaixo de 12px** | **687** |
| `text-xs` (12px) | 550 |

**Impacto no produto.** 8px e 9px são ilegíveis para grande parte dos adultos em tela de notebook, e inutilizáveis no celular. Este não é um detalhe estético: o público de um sistema de RH inclui pessoas de todas as idades, e presbiopia começa por volta dos 40 anos. Um sistema de RH que a coordenadora de 45 anos precisa aproximar do rosto para ler é um sistema que gera erro de digitação em CPF e salário.

**Risco técnico.** Não é WCAG 1.4.4 estritamente (o texto escala com zoom), mas viola 1.4.12 (espaçamento) na prática e falha em qualquer teste de usabilidade real. **Corrigir depois é caro:** 687 ocorrências espalhadas, cada uma com efeito em layout.

**Solução recomendada.** Escala tipográfica mínima de 12px para rótulo e 14px para conteúdo. Substituir os valores arbitrários por tokens semânticos (`text-label`, `text-body`, `text-caption`) definidos uma vez no `index.css`. Fazer módulo a módulo, e usar a régua: **se precisa de `[8px]`, o problema é excesso de informação na tela, não o tamanho da fonte.**

---

#### UI-02 — Design system documentado mas não aplicado

| | |
|---|---|
| **Gravidade** | Média |
| **Prioridade** | **P2** |
| **Esforço** | Médio |

**Evidência.** Existe `docs/design-system.md`. Mas há **245 `<button>`** no código, cada um com classes inline montadas na hora, tipicamente assim:

```tsx
className={`text-[9px] px-2.5 py-1 rounded font-bold border transition-colors ${
  isEditingDrawer ? 'border-rose-500/30 text-rose-400 bg-rose-500/10'
  : (theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5')
}`}
```

Não existe `<Button>`, `<Card>`, `<Input>` ou `<Badge>` compartilhado. O ternário de tema está duplicado centenas de vezes.

**Impacto.** Inconsistência visual inevitável e mudança de identidade visual inviável — trocar o raio de borda dos botões exige 245 edições.

**Risco técnico.** As dependências `clsx` e `tailwind-merge`, feitas exatamente para este problema, **estão instaladas e nunca importadas** (DEP-01). A intenção existiu e não foi executada.

**Solução.** Criar `src/components/ui/` com `Button`, `Card`, `Input`, `Badge`, `Select`. Usar `clsx` + `tailwind-merge` — já estão no `package.json`. Mover a lógica de tema para variável CSS, eliminando o ternário `theme === 'dark'` de centenas de lugares.

---

#### UI-03 — Estados de carregamento e vazio inconsistentes

| | |
|---|---|
| **Gravidade** | Média |
| **Prioridade** | **P2** |
| **Esforço** | Médio |

**Evidência.** `skeleton` aparece 8 vezes e `animate-pulse` 7, contra 26 arquivos que buscam dados. A maioria das telas não tem estado de carregamento estruturado.

**Impacto.** Salto de layout ao chegarem os dados, e o intervalo entre "vazio porque carregando" e "vazio porque não há nada" fica ambíguo — o usuário não sabe se deve esperar ou agir.

**Solução.** Três estados explícitos e padronizados por lista: carregando (skeleton com a forma do conteúdo), vazio (com ação sugerida) e erro (com botão de repetir). Um componente `<ListState>` resolve os três.

---

## 7. Acessibilidade

O achado mais grave da auditoria em termos de quantidade absoluta.

---

#### A11Y-01 — 190 rótulos, nenhum associado ao seu campo

| | |
|---|---|
| **Gravidade** | **Alta** |
| **Prioridade** | **P1** |
| **Esforço** | Médio |

**Evidência.** `<label`: **190 ocorrências**. `htmlFor`: **0 ocorrências**. Nenhum `<input>` está aninhado dentro do seu `<label>` nos trechos que inspecionei — o padrão é `<label>` irmão do `<input>`:

```tsx
<label className="block text-[9px] font-bold uppercase opacity-50 mb-0.5">{label}</label>
<input type={type || 'text'} value={val || ''} … />
```

**Impacto no produto.** Leitor de tela anuncia "campo de edição, em branco" — sem dizer se é CPF, salário ou data de admissão. **Formulários de admissão, ficha do colaborador e folha são inoperáveis para quem usa leitor de tela.** Efeito colateral para todos: clicar no rótulo não foca o campo, comportamento que todo usuário espera.

**Risco legal.** Um sistema de RH que gere admissão precisa ser operável por candidatos e funcionários com deficiência. A própria base de dados tem campo de deficiência — **o sistema coleta o dado e não atende o público que ele representa.** Isso é exposição sob a LBI (Lei 13.146/2015).

**Solução.** `id` no input e `htmlFor` no label. Nas ~22 iterações do `.map` da ficha, o `field` já é único e serve de `id` — a correção ali é uma linha para 22 campos de uma vez.

---

#### A11Y-02 — 245 botões, 12 rótulos acessíveis

| | |
|---|---|
| **Gravidade** | **Alta** |
| **Prioridade** | **P1** |
| **Esforço** | Médio |

**Evidência.** `<button>`: 245. `aria-label`: 12. Muitos são só ícone (`<X size={16} />`, `<Pencil size={13} />`). Alguns têm `title`, que **não é substituto** — não é lido de forma confiável e não aparece em toque.

**Impacto.** Botão sem nome acessível é anunciado como "botão". Numa ficha com fechar, editar, salvar, upload e advertência, o usuário de leitor de tela navega às cegas — e as ações são destrutivas.

**Solução.** `aria-label` em todo botão sem texto visível. Um lint (`jsx-a11y`) impede a reincidência.

---

#### A11Y-03 — Sem regiões dinâmicas anunciadas e sem estrutura semântica

| | |
|---|---|
| **Gravidade** | **Alta** |
| **Prioridade** | **P2** |
| **Esforço** | Pequeno |

**Evidência.** `aria-live`: **0**. `aria-describedby`: **0**. Em 52 arquivos: um `<main>`, um `<nav>`, um `<header>`. `tabIndex`: 2. `onKeyDown`: 3. Gestão de foco (`.focus()`): 2.

**Impacto.**
- Os 57 `notify()` (toasts) **não são anunciados**. Salvar dá feedback só visual — quem usa leitor de tela não sabe se funcionou.
- Sem landmarks, não há navegação por regiões.
- Modais e drawers não prendem foco (2 chamadas de `.focus()` em toda a aplicação): com `Tab`, o foco escapa para o conteúdo atrás do modal, e o `Esc` provavelmente não fecha.

**Solução.** `aria-live="polite"` no container de toast e `role="alert"` em erro. `<main>`, `<nav>`, `<aside>` na estrutura do painel. Focus trap e `Esc` nos drawers/modais — um hook `useFocusTrap` resolve todos de uma vez.

---

## 8. Responsividade

Análise por leitura de classes. **Não testada em dispositivo real** — sem sessão autenticada.

---

#### RESP-01 — 25 grids com colunas fixas sem variante responsiva

| | |
|---|---|
| **Gravidade** | **Alta** |
| **Prioridade** | **P1** |
| **Esforço** | Médio |

**Evidência.** 25 ocorrências de `grid-cols-{2..9}` sem nenhum prefixo `sm:`/`md:`/`lg:`. Exemplos: `grid grid-cols-2 gap-4` (resumo financeiro), `grid grid-cols-2 gap-2 pt-1 font-mono text-[10px]`, três blocos `grid grid-cols-2 gap-3 p-3` na aba de ocorrências.

**Impacto.** Em 375px (iPhone SE/13 mini), duas colunas de valores monetários em fonte de 10px dão ~160px por coluna. `R$ 1.234,56` com rótulo estoura ou trunca. **É o caso mais provável de rolagem horizontal do sistema.**

**Solução.** `grid-cols-1 sm:grid-cols-2` como padrão. Auditar as 25 ocorrências.

---

#### RESP-02 — Distribuição de breakpoints indica desenho para desktop

| | |
|---|---|
| **Gravidade** | Média |
| **Prioridade** | **P2** |
| **Esforço** | Médio |

**Evidência.** `sm:` 220 · `md:` 157 · `lg:` 47 · `xl:` 1 · `2xl:` 0. Além disso, 75 larguras fixas `w-[...]`.

**Leitura.** A queda acentuada de `md:` para `lg:` mostra que o layout foi desenhado para uma faixa e adaptado para baixo. Acima de 1280px não há adaptação nenhuma (`xl:` = 1) — em monitor grande o conteúdo não aproveita o espaço.

**Nota específica sobre tabelas:** 9 `<table>` contra 13 `overflow-x-auto`. A proporção é razoável, mas cada tabela precisa de verificação individual — tabela sem container rolável é rolagem horizontal na página inteira, que é o pior sintoma possível no celular.

**Solução.** Testar em 375px, 768px, 1024px e 1440px. Substituir larguras fixas por `max-w-*` com `w-full`. Em telas estreitas, converter tabela em lista de cards em vez de rolar.

---

#### RESP-03 — Drawer da ficha (corrigido nesta sessão)

Registro para completude: até o commit `6ce2389`, o drawer era `max-w-md` fixo (448px) em qualquer viewport, e os 22 campos de dados pessoais empilhavam um por linha porque tinham `col-span-2` **sem grid pai**. Corrigido: 448px no celular, 672px em tablet, 896px no desktop, e os campos em 2/3/4 colunas. Medido no navegador. **Gravidade original: Alta. Estado: resolvido.**

---

## 9. UX

---

#### UX-01 — Nenhum Error Boundary

| | |
|---|---|
| **Gravidade** | **Alta** |
| **Prioridade** | **P1** |
| **Esforço** | Pequeno |

**Evidência.** `componentDidCatch`, `ErrorBoundary`, `getDerivedStateFromError`: **zero ocorrências**.

**Impacto no produto.** Qualquer exceção de render em qualquer lugar da árvore desmonta a aplicação inteira e deixa **tela branca, sem mensagem e sem caminho de recuperação**. Num componente de 6.906 linhas com 298 `any`, um `undefined.map` é questão de tempo. E o usuário perde o formulário que estava preenchendo.

**Solução.** Um Error Boundary raiz com tela de recuperação, e um por rota/painel para isolar falha. **Esforço pequeno, impacto grande — dos melhores itens de custo-benefício.**

---

#### UX-02 — `window.confirm()` para ações destrutivas

| | |
|---|---|
| **Gravidade** | Média |
| **Prioridade** | **P2** |
| **Esforço** | Pequeno |

**Evidência.** 12 `confirm(` e um `window.alert` de fallback em `OrganogramaManager.tsx:38`.

**Impacto.** Diálogo nativo não segue o tema, não diz claramente o que será apagado, é bloqueante e não permite exigir confirmação explícita. Em ação irreversível de RH — desligamento, exclusão de colaborador — isso é fraco demais.

**Solução.** Modal de confirmação próprio, nomeando o que será afetado ("Desligar **Maria Silva**?"). Para o irreversível, exigir digitar o nome.

---

#### UX-03 — Sem retomada em formulários longos

| | |
|---|---|
| **Gravidade** | Média |
| **Prioridade** | **P2** |
| **Esforço** | Médio |

**Evidência.** `AdmissionForm.tsx` tem 841 linhas com upload de 4 documentos. `localStorage.setItem` é usado em 3 lugares, nenhum para rascunho de formulário.

**Impacto.** O candidato preenche a admissão inteira no celular, perde conexão ou a aba, e recomeça do zero — inclusive os uploads. Este é o **primeiro contato do candidato com o Instituto**, e é o momento de maior abandono.

**Solução.** Autosave em `localStorage` a cada campo (exceto arquivos), com restauração ao reabrir e aviso claro. Indicador de progresso por etapa.

---

#### UX-04 — Erros técnicos vazando para o usuário

| | |
|---|---|
| **Gravidade** | Média |
| **Prioridade** | **P2** |
| **Esforço** | Pequeno |

**Evidência.** Padrão recorrente: `setErro(err?.message || 'mensagem genérica')`. `err.message` do Supabase é texto técnico em inglês — `duplicate key value violates unique constraint "colaboradores_cpf_key"`.

**Impacto.** A coordenadora vê jargão de Postgres e não entende que o CPF já está cadastrado. Além disso vaza nome de constraint e estrutura de tabela.

**Solução.** Mapear os códigos de erro comuns (`23505` duplicidade, `23503` FK, `42501` permissão) para mensagens em português orientadas a ação. Registrar o técnico no console/telemetria.

---

## 10. Qualidade de código

| ID | Achado | Evidência | Gravidade | Prioridade | Esforço |
|---|---|---|---|---|---|
| COD-01 | God Component | `Dashboard.tsx` 6.906 linhas, 29% do código | **Alta** | P1 | Grande |
| COD-02 | 298 usos de `any` | `FichaColaborador` 94, `Dashboard` 92 | Média | P2 | Médio |
| COD-03 | Sem Error Boundary | 0 ocorrências | **Alta** | P1 | Pequeno |
| COD-04 | Código morto | `ColaboradorProntuarioModal.tsx`, 289 linhas | Baixa | P3 | Pequeno |
| COD-05 | Lint quase inexistente | `.oxlintrc.json` com **2 regras** | **Alta** | P1 | Pequeno |
| COD-06 | `package.json` name `temp-app` | Raiz | Baixa | P3 | Pequeno |
| COD-07 | Duplicação do ternário de tema | Centenas de `theme === 'dark' ? … : …` | Média | P2 | Médio |

**Sobre COD-02.** O TypeScript é estrito (ARQ-07), o que é ótimo — mas 298 `any` desligam a checagem exatamente onde os dados entram no sistema. `FichaColaborador.tsx` tem 94 porque foi extraído com props tipadas `any` de propósito, para manter o JSX byte a byte idêntico; isso é dívida **planejada e datada**, não acidente. O `Dashboard.tsx` com 92 é dívida acidental. Solução: gerar tipos do banco com `supabase gen types typescript` e usá-los nas camadas de serviço (ARQ-02) — resolve a maioria de uma vez.

**Sobre COD-05, que merece destaque.** O `.oxlintrc.json` tem exatamente duas regras: `react/rules-of-hooks` e `react/only-export-components`. **Não há regra de acessibilidade, de segurança, de import ou de complexidade.** Isso explica boa parte dos achados deste relatório: nada os impedia de entrar. Ativar `jsx-a11y` sozinho teria barrado A11Y-01, A11Y-02 e A11Y-03 na origem. **Este é o item de melhor custo-benefício de toda a auditoria: horas de trabalho, e impede a reincidência de três achados Altos.**

---

## 11. DevOps e Observabilidade

| ID | Achado | Evidência | Gravidade | Prioridade | Esforço |
|---|---|---|---|---|---|
| DEV-01 | **Zero testes automatizados** | Nenhum `*.test.*`, `*.spec.*`, sem vitest/playwright | **Crítica** | P0 | Grande |
| DEV-02 | **Zero CI/CD** | Sem `.github/` | **Crítica** | P0 | Pequeno |
| DEV-03 | Migrations manuais e divergentes | Ver BD-02/BD-03; 3 sprints escritas e não aplicadas | **Alta** | P1 | Médio |
| DEV-04 | Sem observabilidade | Sem Sentry/telemetria; 60 `console.error` como única instrumentação | **Alta** | P1 | Médio |
| DEV-05 | Sem plano de rollback | Migrations sem `down`; deploy sem *feature flag* | **Alta** | P1 | Médio |
| DEV-06 | Backup não verificado 🔍 | Depende do plano Supabase | **Alta** | P1 | Pequeno |
| DEV-07 | Três alvos de deploy dessincronizados | Vercel (auto) · SQL (manual) · Functions (manual) | **Alta** | P1 | Médio |

**DEV-01 e DEV-02 juntos são o risco sistêmico do projeto.** Um sistema que calcula folha de pagamento, rescisão e vale-transporte — dinheiro real de pessoas reais — **não tem um único teste.** Cada deploy é uma aposta. `utils/turnover.ts`, `utils/desligamento.ts` e o cálculo de salário líquido são funções puras com regra de negócio densa: são testáveis hoje, sem refatoração nenhuma, e é onde um erro custa mais caro (rescisão errada é passivo trabalhista).

**Sequência recomendada, e a ordem importa:**
1. CI que roda `tsc -b` e `oxlint` em cada push. **Uma tarde de trabalho.** Sem isso, nada garante que `main` compila.
2. Vitest + testes das funções puras de cálculo. Alto valor, esforço baixo, zero refatoração.
3. Playwright para os três fluxos críticos: login, admissão de candidato, desligamento.
4. Sentry no frontend e nas Edge Functions.

**DEV-07 merece atenção específica.** Hoje há três alvos que sobem por caminhos diferentes e sem sincronia: o Vercel sobe sozinho no push; o SQL é colado à mão no editor; as Edge Functions vão por CLI. **Existe hoje um exemplo vivo desse problema:** o novo prompt do copiloto está commitado desde `aa33d51` e não foi publicado — por isso o copiloto continua respondendo com `###`. O código diz uma coisa e a produção faz outra, e nada no sistema sinaliza a divergência.

---

## 12. Dependências

| Pacote | Versão | Uso real | Veredito |
|---|---|---|---|
| `react` / `react-dom` | 19.2.7 | Núcleo | ✅ atual |
| `@supabase/supabase-js` | 2.110.3 | 26 arquivos | ✅ |
| `react-router-dom` | 7.18.1 | 17 arquivos | ✅ |
| `lucide-react` | 1.24.0 | 38 arquivos | ✅ |
| `recharts` | 2.10.0 | 6 arquivos | ⚠️ 363 kB — maior peso do bundle |
| `tailwindcss` | 4.3.2 | Núcleo | ✅ |
| **`framer-motion`** | 12.42.2 | **0 arquivos** | ❌ **remover** |
| **`clsx`** | 2.1.1 | **0 arquivos** | ⚠️ usar (ver UI-02) ou remover |
| **`tailwind-merge`** | 3.6.0 | **0 arquivos** | ⚠️ usar (ver UI-02) ou remover |
| `@fontsource-variable/inter` | 5.3.0 | via `index.css` | ✅ (importado em CSS, não em TS) |

#### DEP-01 — Três dependências instaladas e nunca importadas

| | |
|---|---|
| **Gravidade** | Média |
| **Prioridade** | **P2** |
| **Esforço** | Pequeno |

**Impacto.** O bundle final não é afetado (o Vite descarta o que ninguém importa) — então **não é um problema de performance**. É problema de superfície: instalação mais lenta, lockfile maior, e três pacotes a mais para monitorar em auditoria de vulnerabilidade. `framer-motion` é grande e não tem uso nenhum.

**Nuance importante:** `clsx` e `tailwind-merge` não devem ser simplesmente removidos — são exatamente a ferramenta que resolve UI-02. **Decida primeiro se vai fazer o design system; se sim, use-os; se não, remova.**

**Sobre `recharts`:** 363 kB é o maior item do bundle. Vários gráficos do sistema são barra e linha simples, que um SVG de 40 linhas resolve. Avaliar substituição nos casos simples, mantendo Recharts só onde há interação real.

**Ausência notável:** nenhuma biblioteca de validação de schema (Zod, Yup). Todo formulário valida à mão, e a entrada de RPCs não é validada estruturalmente — o que se conecta a SEC-06 e SEC-07.

---

## 13. Mobile e PWA

#### MOB-01 — Nenhuma preparação para mobile

| | |
|---|---|
| **Gravidade** | Média |
| **Prioridade** | **P2** |
| **Esforço** | Médio |

**Evidência.** `public/` contém apenas `favicon.svg`, `icons.svg` e `signature-hero.png`. Sem `manifest.json`, sem service worker, sem ícones de app, sem meta tags de PWA no `index.html`.

**Avaliação por caminho:**

| Caminho | Viabilidade | Bloqueadores |
|---|---|---|
| **PWA** | 🟡 Média | Falta manifest, SW, ícones. RESP-01 e UI-01 tornam a experiência ruim no celular mesmo instalada |
| **Capacitor** | 🟡 Média | Envelopa a web; herda todos os problemas de responsividade e tipografia |
| **React Native** | 🔴 Baixa | ARQ-02 é bloqueante: sem camada de serviço, **não há nada reaproveitável** além dos tipos. A lógica de negócio está dentro de componentes JSX |
| **Notificações push** | 🔴 Baixa | Sem backend de notificação, sem registro de dispositivo, sem VAPID |
| **Offline / sincronização** | 🔴 Muito baixa | Sem cache local, sem fila de mutação, sem resolução de conflito. Estado só em `useState` — some ao recarregar |

**Diagnóstico.** O item que decide o futuro mobile não é mobile: é **ARQ-02**. Uma camada de serviço isolada da UI é o que permite reaproveitar lógica em React Native ou implementar fila offline. Feita ela, todos os caminhos acima ficam viáveis; sem ela, mesmo o PWA entrega uma versão desconfortável do sistema desktop.

**Sequência recomendada.** ARQ-02 → UI-01 e RESP-01 (legibilidade e layout no celular) → PWA com manifest e SW → só então avaliar app nativo. **PWA antes de resolver tipografia de 8px é entregar um app ruim mais rápido.**

---

## 14. Escalabilidade

### 14.1 A pergunta certa mudou

A pergunta original desta auditoria era "onde quebra com 100, 1.000, 100.000 empresas?". Com a decisão de que o Omni ITO é **sistema interno do Instituto**, essa pergunta não tem objeto: o sistema atende uma organização, por desenho, e isso está correto.

A pergunta que importa passa a ser outra, e é mais sutil:

> **O sistema aguenta o Instituto crescer, e aguenta os anos passarem?**

São dois eixos independentes, e **o segundo é o perigoso**, porque cresce sozinho mesmo que nada mude.

**Eixo 1 — número de colaboradores.** Hoje ~25. Um crescimento agressivo levaria a algo entre 100 e 300. Nessa faixa, quase nada do sistema quebra: 300 linhas em `colaboradores` são irrelevantes para o Postgres. **Este eixo não é um risco real.**

**Eixo 2 — acúmulo histórico.** Este é o que morde. Várias tabelas só crescem e nunca são podadas nem paginadas, e o sistema carrega várias delas **inteiras** a cada abertura do painel.

### 14.2 Ordem real de ruptura para o cenário interno

| Horizonte | Primeiro ponto de ruptura | Causa raiz | Gravidade |
|---|---|---|---|
| **2 a 3 anos** | `fetchColaboradoresList` fica lento | PERF-01: carrega `avaliacoes_desempenho` e `movimentacoes_pessoal` **inteiras** a cada abertura do painel. Com 100 colaboradores × 2 avaliações/ano, são milhares de linhas trafegando para exibir uma lista | **Alta** |
| **3 a 5 anos** | `logs_auditoria` sem limite | Append-only, **sem retenção, sem particionamento e sem índice**. Cresce para sempre. Agravado por SEC-04, que permite inserção anônima em massa | **Alta** |
| **5+ anos** | `registros_ponto` | Volume diário × colaboradores é o maior crescimento absoluto do sistema. **Mitigado:** já tem `ix_registros_ponto_colab_data` e `ix_registros_ponto_competencia` — dos poucos casos em que a indexação foi feita certa | Média |
| **A qualquer momento** | Painéis analíticos | Agregação em JavaScript sobre o dataset completo (PERF-04). O custo cresce com o histórico, não com o número de pessoas | Média |
| **A qualquer momento** | Digitação com atraso no painel | PERF-02: zero memoização. Piora conforme o volume carregado aumenta | Média |

**Leitura prática.** Nada quebra amanhã. O sistema tem folga de anos no cenário interno — e essa folga é exatamente o motivo pelo qual **não vale gastar orçamento agora em paginação sofisticada ou virtualização**. Vale gastar em:

1. **Retenção e particionamento em `logs_auditoria`** — é o único crescimento verdadeiramente ilimitado, e é barato resolver antes de a tabela ficar grande.
2. **Projeção de colunas nas queries** — mas por motivo de **privacidade**, não de performance: `select('*')` traz CPF, salário e medicação contínua para o navegador de todo perfil `ti` (ver SEC-05 e PERF-01).
3. **Índices em FK (BD-01)** — continua valendo, porque o custo é uma tarde e o benefício é permanente.

### 14.3 Os componentes específicos que quebram primeiro

**Tabelas:** `colaboradores` (sem índice em `status`, a coluna mais filtrada); `avaliacoes_desempenho` e `movimentacoes_pessoal` (crescem sem limite, carregadas inteiras); `logs_auditoria` (append-only sem particionamento nem retenção — cresce para sempre); `registros_ponto` (volume diário × colaboradores é o maior crescimento absoluto do sistema).

**Queries:** `fetchColaboradoresList` (7 tabelas completas); `fetchDashboardKpis` e `fetchAnalyticsData` (agregação no cliente); todo `select('*')` em `colaboradores`.

**Telas:** o painel principal, porque carrega tudo no boot; os painéis analíticos, porque agregam em JS o que deveria ser view materializada.

**RPCs:** `registrar_pulse` e `registrar_voto_funcionario_mes` (sem rate limit, gravação concorrente); `inserir_colaborador_via_admissao` (`SECURITY DEFINER` aberta a `anon`, sem limite).

**Componentes:** `Dashboard.tsx` — sem memoização, re-renderiza a árvore inteira a cada tecla; e o custo cresce com o volume de dados carregado.

---

## 15. Roadmap priorizado

### Sprint Crítico — P0 (imediato, 1 a 2 semanas)

Segurança explorável hoje e a rede de segurança mínima. **Nada mais deve ser feito antes disto.**

| # | Item | Ação | Esforço |
|---|---|---|---|
| 1 | **SEC-01** | Fechar policies de `organograma_nos` — `to authenticated` + papel | P |
| 2 | **SEC-02** | Remover "Update publico de tokens"; substituir por RPC estreita | P |
| 3 | **BD-03** | Apagar `run_pending_migrations.sql` do repositório | P |
| 4 | **SEC-04** | Fechar INSERT anônimo em `logs_auditoria` e `documentos_assinados`; tornar auditoria *append-only*; procurar registros forjados | P |
| 5 | **SEC-03** | Remover autorização por domínio e o e-mail fixo das 3 Edge Functions; papel `superadmin` no banco; confirmar *email confirmation* ativo | M |
| 6 | **DEV-02** | CI com `tsc -b` + `oxlint` em todo push | P |
| 7 | **BD-01** | Índices nas FKs e em `colaboradores.status` (`concurrently`) | P |
| 8 | **UX-01** | Error Boundary raiz | P |
| 9 | 🔍 | Auditar `pg_policies` e `auth.users` procurando contas e políticas indevidas | P |

> ✅ **Decisão de produto já tomada (2026-07-28): sistema interno do Instituto.** ARQ-01 sai do escopo, e com ele o único item de 6 a 12 semanas do roadmap. Este Sprint Crítico é, agora, a totalidade do que é urgente.

### Sprint Alto Impacto — P1 (4 a 6 semanas)

| # | Item | Ação | Esforço |
|---|---|---|---|
| 10 | **COD-05** | Ativar `jsx-a11y`, regras de import e complexidade no lint | P |
| 11 | **A11Y-01/02** | `htmlFor` nos 190 labels; `aria-label` nos botões de ícone | M |
| 12 | **DEV-01** | Vitest nas funções puras de cálculo (turnover, desligamento, líquido) | M |
| 13 | **SEC-08** | Cabeçalhos de segurança no `vercel.json`; CSP em *report-only* primeiro | P |
| 14 | **SEC-06** | Validação de upload no servidor: tamanho, MIME, *magic bytes* | M |
| 15 | **SEC-07** | Rate limit no servidor: copiloto e RPCs anônimas | M |
| 16 | **PERF-01** | Projeção de colunas + paginação nas listas principais | M |
| 17 | **ARQ-02** | `src/services/` por domínio; lint proibindo import direto do cliente | M |
| 18 | **BD-05** | `set search_path` em todas as `SECURITY DEFINER` | P |
| 19 | **PERF-02** | Auditar os 64 `useEffect` procurando vazamento e `setState` pós-desmontagem | M |
| 20 | **DEV-04** | Sentry no frontend e nas Edge Functions | M |
| 21 | **UI-01** | Escala tipográfica mínima de 12px; tokens semânticos | M |
| 22 | **RESP-01** | Corrigir os 25 grids sem variante responsiva | M |
| 23 | **DEV-03** | Migrar para `supabase/migrations/` versionadas | M |

### Sprint Médio — P2 (2 a 3 meses)

| # | Item | Ação | Esforço |
|---|---|---|---|
| 24 | **ARQ-03** | Continuar quebrando o `Dashboard.tsx` — meta: nada acima de 500 linhas | G |
| 25 | **UI-02** | `src/components/ui/` com Button/Card/Input/Badge usando `clsx` + `tailwind-merge` | M |
| 26 | **BD-04** | Separar colunas sensíveis de `colaboradores` (LGPD Art. 11) | G |
| 27 | **SEC-05** | Segregar leitura por papel: `ti` sem folha, sem saúde, sem dados bancários | G |
| 28 | **COD-02** | Tipos gerados do banco; eliminar os `any` acidentais | M |
| 29 | **A11Y-03** | `aria-live` nos toasts; landmarks; focus trap nos modais | M |
| 30 | **UX-03** | Autosave no formulário de admissão | M |
| 31 | **PERF-03** | Separar entry da landing; reduzir peso do Recharts | M |
| 32 | **DEV-05/06** | Plano de rollback; verificar e testar restauração de backup | M |
| 33 | **MOB-01** | Manifest + service worker (PWA) | M |
| 34 | **DEP-01** | Remover `framer-motion`; decidir sobre `clsx`/`tailwind-merge` | P |

### Sprint Baixo — P3 (backlog)

| # | Item | Ação | Esforço |
|---|---|---|---|
| 35 | **BD-07** | Retenção e particionamento em `logs_auditoria` — único crescimento ilimitado (ver 14.2) | M |
| 36 | ~~PERF-05~~ | ~~Virtualização~~ — **descartado**: com o teto real do cenário interno, paginação simples basta | — |
| 37 | **ARQ-04** | Remover `ColaboradorProntuarioModal.tsx` | P |
| 38 | **ARQ-07** | `"strict": true` explícito | P |
| 39 | **COD-06** | Renomear `temp-app` | P |
| 40 | **BD-06** | FK real em `organograma_nos.colaborador_id` | P |
| 41 | **UX-02** | Substituir os 12 `confirm()` por modal próprio | P |

---

## 16. Notas finais

| Dimensão | Nota | Justificativa |
|---|---|---|
| **Arquitetura** | **5,0** | Padrão token→RPC é exemplar e code splitting existe. Mas sem camada de serviço e com God Component de 6.906 linhas. *(4,0 → 4,5 com a decisão de produto; → 5,0 com ARQ-04/05/06/07)* |
| **Performance** | **5,0** | Code splitting real e `Promise.all` nas buscas. Mas zero paginação, zero memoização, 44 `select('*')`. *(Era 4,5; subiu porque o teto real do cenário interno dá anos de folga)* |
| **Segurança** | **6,5** | Sprints 36 a 39 em produção: `anon` fora do organograma, dos tokens e da trilha de auditoria; backdoor de e-mail removido das policies; `search_path` fixado nas `SECURITY DEFINER`. Cabeçalhos HTTP no lugar. **Trava em 6,5 porque SEC-03 depende do deploy das Edge Functions** — em produção elas ainda autorizam por domínio de e-mail. Vai a ~7,5 com o deploy; a ~8,5 com rate limit (SEC-07) e validação de upload (SEC-06) |
| **Escalabilidade** | **6,0** | **Reavaliada contra o requisito real, não contra SaaS.** Ponto bem indexado, folga de anos no volume esperado. Perde por `logs_auditoria` sem retenção nem particionamento, FKs sem índice e ausência total de paginação. *(Era 2,0 sob a premissa SaaS)* |
| **Banco** | **6,5** | RLS em 36/36 tabelas, buckets privados, índices de FK criados, `search_path` fixado em todas as `SECURITY DEFINER` (BD-05), e o arquivo que desfazia as correções foi desarmado (BD-03). Perde por migrations ainda manuais (BD-02) e dado sensível na mesma tabela sob a mesma policy (BD-04) |
| **Frontend** | **5,5** | React 19, TS estrito e agora explícito, Error Boundary na raiz, componentização razoável fora do Dashboard. Mas sem design system e com 298 `any` |
| **Backend** | **6,5** | **Melhor nota do sistema.** Edge Functions com segredos corretos, CORS restrito, autorização em camadas, comentários que explicam bypasses fechados. Perde por SEC-03 e ausência de rate limit |
| **UX** | **5,5** | Fluxos completos e coerentes, 57 toasts, textos em português claro. Erro de render agora tem tela de recuperação em vez de tela branca. Perde por `confirm()` nativo e formulário longo sem retomada |
| **UI** | **4,5** | Identidade visual consistente, tema claro/escuro, glassmorphism bem executado. Perde por 687 ocorrências de texto abaixo de 12px e ausência de componentes base |
| **Responsividade** | **4,0** | 220 usos de `sm:` mostram cuidado real. Perde por 25 grids fixos, 75 larguras fixas e nenhuma adaptação acima de 1280px |
| **Acessibilidade** | **5,5** | 162 dos 178 rótulos ligados ao seu campo, e 4 dos 10 modais agora operáveis por teclado (`role=dialog`, Esc, foco preso e devolvido) — verificado em execução. Lint mede o resto e trava regressão. Ainda pesa: 6 modais sem tratamento, ~24 botões só de ícone sem nome, e landmarks ausentes nas páginas públicas |
| **Código** | **5,5** | Comentários acima da média, lint com 30 regras em vez de 2, `strict` explícito, código morto removido. Perde por arquivo de 6.906 linhas e 298 `any` |
| **DevOps** | **5,5** | **CI existe:** tipos, lint, **testes** e build a cada push e PR. 32 testes cobrindo o cálculo trabalhista, verificados por mutação. Deploy do Vercel automático. Perde por cobertura ainda estreita, migrations manuais, três alvos dessincronizados e sem rollback |
| **Observabilidade** | **5,5** | Captura e **persistência** no ar: render, `window.onerror` e promessa sem catch, com depuração de dado pessoal testada, teto no servidor e retenção de 90 dias. Erro em produção agora é consultável em `logs_erros`. Perde por não haver **alerta ativo** — ninguém é avisado, alguém precisa ir olhar — e por não haver tracing nem métrica de desempenho |
| | | |
| **QUALIDADE GERAL** | **5,5 / 10** | 3,7 → 4,1 (decisão de produto) → 4,5 → 4,9 → 5,0 → 5,1 → **5,5** |

### Como ler o 4,1

Essa nota **não** diz que o Omni ITO é um produto ruim. Ele entrega, hoje, valor real para o Instituto — e cobre um escopo funcional que muita empresa com time grande não cobre.

O que a nota mede é a distância entre **o que o sistema faz** e **o que sustentaria o que ele faz**. Um sistema que guarda CPF, salário, dados bancários e medicação contínua de pessoas reais, que calcula rescisão, e que gera contrato assinado, precisa de uma base de segurança, teste e observabilidade proporcional ao dano de um erro. Essa base não está lá — não porque foi feita mal, mas porque ainda não foi feita.

Três notas puxam o conjunto para baixo, e vale nomear a razão de cada uma:

**Observabilidade (1,5)** é a mais grave em termos de risco operacional, porque ela é o que permite descobrir todas as outras. Sem telemetria, os bugs que este relatório não encontrou continuam invisíveis até um usuário reclamar.

**Acessibilidade (2,0)** é a mais grave em termos de exposição legal e de justiça. Um sistema de RH que coleta o campo "deficiência" e não é operável por leitor de tela tem um problema que não é técnico.

**Segurança (2,5)** é a mais urgente no calendário, e a única com item marcado para hoje. As quatro falhas críticas são todas de correção pequena — a maioria é uma policy SQL. **É provavelmente a melhor relação esforço-risco que este relatório oferece.**

### O que este relatório recomenda que se faça em primeiro lugar

Não é uma refatoração. São três coisas pequenas, na ordem:

1. **Fechar as quatro policies críticas** (SEC-01, SEC-02, SEC-04) — algumas horas, e remove o que qualquer pessoa na internet pode fazer hoje.
2. **Ligar o CI** com `tsc` e `oxlint` — uma tarde, e a partir dela nada quebrado entra em `main`.
3. **Ativar `jsx-a11y` no lint** — minutos de configuração, e impede que A11Y-01, A11Y-02 e A11Y-03 voltem a crescer.

Depois disso, o roadmap é linear e sem bifurcação: a decisão de produto já está tomada, e ela **encurtou** o trabalho em vez de aumentá-lo.

Uma observação final sobre a escolha de ser sistema interno. Ela remove o item mais caro do relatório, mas **não suaviza nenhum dos quatro críticos de segurança** — pelo contrário. Num SaaS, um vazamento é problema contratual entre empresas. Aqui, o CPF, o salário, a medicação contínua e o laudo de deficiência expostos são de **colegas de trabalho de quem opera o sistema**, e a trilha de auditoria que qualquer anônimo pode forjar é a que defenderia o próprio Instituto numa reclamação trabalhista. Ser interno concentra o dano em vez de diluí-lo.

---

*Auditoria realizada por leitura estática de código, SQL e configuração. Os itens marcados com 🔍 dependem de verificação no banco de produção, à qual não tive acesso. Nenhuma alteração foi feita no código durante esta auditoria.*
