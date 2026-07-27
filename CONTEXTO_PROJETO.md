# Omni ITO — Contexto do Projeto

> Documento de onboarding. Lendo isto do começo ao fim, uma pessoa nova entende **o que é o
> sistema, como está construído, o que já funciona, o que falta, e as armadilhas**.
> Última atualização de contexto: julho/2026 (revisado após sprints 18–32).

---

## 1. O que é

**Omni ITO** é um sistema web de **Gestão de Pessoas (RH)** para o **Instituto Thiago Omena**
(razão social **BIOLIFE CLÍNICA MÉDICA LTDA**, CNPJ 37.037.182/0001-85, Maceió/AL) — uma clínica
de estética/saúde. O objetivo é **centralizar a operação de RH** que hoje vive em planilhas e papel:
admissão, contratos, onboarding, benefícios, avaliações, plano de carreira, ponto, e canais de escuta
do time — com trilha de auditoria e segurança por RLS.

Título no navegador: *"Omni-ITO | Gestão de Pessoas"*.

---

## 2. Stack técnica

| Camada | Tecnologia |
|---|---|
| Frontend | **Vite 8 + React 19 + TypeScript**, **TailwindCSS v4**, **React Router 7**, Recharts, Framer Motion, lucide-react |
| Backend | **Supabase** (Postgres + Auth + Storage + Edge Functions em Deno) |
| Deploy frontend | **Vercel** (build a partir do fonte; `dist/` não é versionado) |
| Deploy backend | Supabase — migrations SQL rodadas à mão; Edge Functions via `supabase functions deploy` |
| Fonte | Inter (via `@fontsource-variable/inter`, servida pelo bundle, sem CDN) |

**Não há servidor backend próprio.** Toda lógica de servidor é: (a) Postgres + RLS + funções
SECURITY DEFINER, e (b) duas Edge Functions Deno. O cliente usa **apenas a anon key**; quem protege
os dados é o **RLS**, não a chave.

- Projeto Supabase do app (ref): **`jyvxhyaeagqljvqqeuwi`** (ver `.env`).
- Repositório: **`henrizada77/omni-ito`**. Branch de trabalho atual: **`main`** (o `feature/rh-modulos` já foi mergeado).

---

## 3. Arquitetura & segurança

### Papéis (coluna `perfis.cargo`)
- **`coordenadora_rh`** — acesso total a todos os módulos de RH.
- **`ti`** — "Auditor TI", **somente leitura**, e a UI só libera o módulo **Analytics**.
- **Superusuário nominal:** o e-mail **`ito.thiagosilva@gmail.com`** tem *bypass* hardcoded (equivale
  a RH) tanto no frontend quanto nas policies. É intencional (o TI não tem e-mail no domínio institucional).

**Todo cadastro novo nasce como `ti`.** Promover alguém a `coordenadora_rh` é **ato administrativo por
SQL** (não há botão na UI — decisão de segurança do sprint10):
```sql
update public.perfis set cargo = 'coordenadora_rh' where email = 'pessoa@itoinstituto.com.br';
```
Depois de promover, a pessoa precisa **sair e entrar** (o cargo é lido no login).

### Cadastro restrito
Trigger `trg_fn_handle_new_user` só deixa cadastrar e-mails **`@itoinstituto.com.br`** (mais a exceção
nominal do TI). Isso está espelhado no frontend (`LandingPage`) só para antecipar o erro — quem valida
de verdade é o banco.

### Padrão de RLS
Leitura geralmente aberta a `authenticated` (`using (true)`); escrita restrita a:
```sql
using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com')
```
`get_user_role()` é uma função SECURITY DEFINER que lê `perfis.cargo` (evita recursão de RLS).

### Escrita server-side
Operações que precisam furar o RLS (importar ponto, assinar via token anônimo) são **funções
SECURITY DEFINER** que retornam `jsonb {success, ...}`, no idioma de `inserir_colaborador_via_admissao`.

---

## 4. Modelo de dados (tabelas principais)

Base em `supabase/supabase_setup.sql`; o resto vem dos `sprint*.sql`.

- **`perfis`** — `id` (=auth.users), `email`, `cargo`. Perfil de acesso.
- **`colaboradores`** — o funcionário. Muitos campos: `nome`, `cpf` (UNIQUE), `rg`, `cargo`, `setor`,
  `salario` (texto "R$ ..."), `status` (pendente/ativo/desligado), `data_admissao`, `genero` (M/F/O/NI),
  `matricula`, `data_aso_vencimento`, `data_ferias_vencimento`, checklist de onboarding (booleans),
  `ficha_admissao` (jsonb), `documentos_anexos` (jsonb), `tipo_desligamento`, etc.
- **`modelos_documentos`** — templates de contrato/termo. `conteudo` guarda **texto com `{{variáveis}}`**
  (ou base64 de PDF quando `tipo_arquivo='pdf'`).
- **`admission_tokens`** — token do link público de admissão/assinatura (`/admissao/:token`).
  Guarda `detalhes` (jsonb) com o template e as variáveis. `status` controla a etapa.
- **`documentos_assinados`** — registro de cada contrato assinado (vínculo por `colaborador_cpf`),
  `url_arquivo` aponta pro PDF no Storage.
- **`registros_ponto`** — batidas de ponto. **Reaproveitada** para o espelho do Secullum (colunas
  `origem`, `id_externo`, `competencia`, `data_ref`).
- **`ocorrencias_jornada`** — atraso/falta/etc. (hoje digitadas à mão; alimentam Analytics).
- **`beneficios`** / **`colaborador_beneficios`** — benefícios e vínculos.
- **`planos_carreira`** / **`avaliacoes_desempenho`** — carreira e avaliações (modelo antigo por pares).
- **`cargos`** / **`trilhas_carreira`** / **`trilha_degraus`** / **`promocoes`** — catálogo de cargos,
  trilhas com múltiplos degraus, e workflow de promoção (proposta→aprovada→efetivada|rejeitada).
  `cargos` também guarda `referencia_salarial_al` (comparativo com o mercado de Alagoas).
- **`pesquisas_satisfacao`** / **`ouvidoria_manifestacoes`** — canais anônimos (sem IP/e-mail).
- **`ponto_inconsistencias`** / **`ponto_sync_log`** — inconsistências e histórico de sync do ponto.
- **`indicadores_trabalhistas`** — processos, acidentes (analytics jurídico/saúde).
- **`logs_auditoria`** — trilha de auditoria (IP/UA preenchidos por trigger).
- **`colaborador_advertencias`** — advertências disciplinares.

**Tabelas adicionadas nos sprints 18–32:**
- **`copilot_conversas`** / **`copilot_mensagens`** — histórico do assistente Copilot (sprint18; ver Edge Function `copilot`).
- **`pulse_semanal`** — respostas do termômetro de clima semanal, anônimas (sprint19).
- **`folha_lancamentos`** — lançamentos de folha por colaborador (Desconto/Adiantamento/Insalubridade/
  Periculosidade/Hora Extra/Inclusão/Falta/Outro), `valor numeric`, `descricao`, competência (sprint21).
- **`colaboradores`** ganhou: `status='em_ferias'` + `ferias_inicio`/`ferias_dias` (sprint26),
  `day_off_aniversario_ano` (sprint27), `vt_opta`/`vt_percentual` (vale-transporte, sprint28).
- **`desligamentos`** — cálculo de aviso prévio (tipo, modalidade, datas, aviso, pagamento) 1:1 com colaborador (sprint28).
- **`documentos_institucionais`** — conteúdos editáveis pelo RH e lidos publicamente (ex.: **Manual de Cultura**), um registro por `tipo` (sprint29).
- **`movimentacoes_pessoal`** — histórico de admissões/desligamentos importados de planilha (analytics de turnover, sprint29).
- **`solicitacoes_vaga`** — requisições de vaga abertas pelos coordenadores (setor, cargo, funções, requisitos, urgência) (sprint30).
- **`testes_comportamentais`** — teste DISC por link/token; guarda `respostas` (blocos mais/menos) e `resultado` (perfis pressão/natural/net + dominante) (sprint31).
- **`funcionario_mes_rodadas`** (+ votos) — rodadas de eleição do Funcionário do Mês por competência, com `top3` no fechamento (sprint32).
- **`organograma_nos`** — árvore hierárquica editável (parent_id, título, vínculo opcional a colaborador).

**Buckets de Storage** (privados): **`contratos-assinados`** (PDFs assinados) e
**`documentos-envios`** (anexos da admissão: RG, comprovante, ASO).

---

## 5. Módulos (o que o RH vê)

Sidebar (todos exigem `coordenadora_rh`, exceto Analytics que o `ti` também vê):

Ordem real das rotas em `App.tsx` (`APP_ROUTES`); todos exigem `coordenadora_rh`, exceto Analytics (o `ti` também vê):

1. **Dashboard** (`/app/dashboard`) — KPIs, alertas e indicadores de clima.
2. **Documentos** (`/app/documentos`) — modelos, geração de link de assinatura, assinatura bilateral do RH.
3. **Colaboradores** (`/app/colaboradores`) — quadro, ficha (drawer) com edição, ocorrências, desligamento, prontuário (`ColaboradorProntuarioModal`).
4. **Onboarding** (`/app/onboarding`) — checklist de integração.
5. **Benefícios** (`/app/beneficios`) — cadastro e associação de benefícios.
6. **Férias & ASO** (`/app/ferias-aso`) — vencimentos (datas em `colaboradores`, cálculo client-side).
7. **Avaliações** (`/app/avaliacoes`) — avaliação de desempenho estruturada.
8. **Cargos & Carreira** (`/app/cargos`) — catálogo de cargos, trilhas com degraus, workflow de promoções.
9. **Vagas** (`/app/vagas`) — funil de recrutamento (`VagasManager`) + testes comportamentais DISC (`TestesPanel`).
10. **Funcionário do Mês** (`/app/funcionario-mes`) — gestão das rodadas de eleição (`FuncionarioMesManager`, arte do pódio).
11. **Voz do Time / Feedback** (`/app/feedback`) — pesquisa de satisfação + ouvidoria + Pulse (leitura das respostas anônimas).
12. **Espelho de Ponto** (`/app/ponto`) — integração Secullum (ver §7).
13. **Riscos** (`/app/riscos`) — mapa/gestão de riscos ocupacionais (`RiscoManager`).
14. **Folha** (`/app/folha`) — lançamentos de folha, compensação e senioridade (`FolhaManager`).
15. **Agenda RH** (`/app/agenda`) — calendário derivado de vencimentos/admissões/advertências/aniversários.
16. **Manual de Cultura** (`/app/cultura`) — edição do conteúdo institucional lido publicamente.
17. **Analytics** (`/app/analytics`) — Overview, Turnover, Saúde & Segurança, Compensação, Jurídico, **Clima**.

> Além da sidebar há um **Command Palette** (`src/components/common/CommandPalette.tsx`) para navegação/busca rápida,
> um **Organograma** editável (`OrganogramaManager`) e o widget **Copilot** (`CopilotWidget` + Edge Function `copilot`).

### Páginas públicas (sem login)
- **`/`** — landing + login/cadastro.
- **`/admissao/:token`** — fluxo do candidato (ficha → assinatura do contrato).
- **`/pesquisa`** — pesquisa de satisfação anônima (rate limit 1 envio/3h por dispositivo, via `localStorage`).
- **`/ouvidoria`** — ouvidoria anônima (elogio/sugestão/reclamação/denúncia; mesmo rate limit).
- **`/pulse`** — Pulse Semanal: termômetro de clima em 4 humores, anônimo.
- **`/funcionario-do-mes`** — votação do Funcionário do Mês (identificação por trecho do próprio nome, 1 voto).
- **`/cultura`** — Manual de Cultura (leitura pública do conteúdo editado pelo RH).
- **`/solicitar-vaga`** — coordenadores abrem requisição de vaga.
- **`/teste-comportamental/:token`** — candidato responde o teste DISC por link.

---

## 6. Fluxo de admissão + assinatura de contrato (o mais crítico)

1. RH gera link em **Documentos** → escolhe o modelo (texto com `{{variáveis}}`) e o colaborador →
   cria `admission_tokens` com `detalhes.pdf_template_base64` = conteúdo do modelo + as variáveis,
   status `aguardando_assinatura`. Link = `/admissao/<token>`.
2. Candidato abre o link → vê a **prévia do contrato já preenchido** → desenha a assinatura → envia.
3. O frontend chama a **Edge Function `gerar-contrato-pdf`**, que: valida (token+CPF ou JWT do RH),
   **renderiza o contrato** (texto → PDF, ou PDF real se for upload), embute a assinatura, carimba
   auditoria (SHA-256, IP, timestamp), salva em `contratos-assinados/<cpf>/…`, gera signed URL e grava
   `documentos_assinados` (via RPC `sign_admission_token`).
4. O documento aparece na **ficha do colaborador** (drawer → "Contratos Assinados"), casado por CPF.
5. RH pode assinar em cima (assinatura bilateral) — consolida o PDF final.

**Helper compartilhado `buildContractText`** (`src/data/contractTemplates.ts`) substitui as `{{variáveis}}`
num só lugar — usado na prévia E no texto enviado à função, pra prévia e PDF final baterem.

---

## 7. Integração de Ponto — Secullum Ponto Web (READ-ONLY, mock-first)

O sistema de ponto usado é o **Secullum Ponto Web** (API "Integração Externa"). Módulo **Espelho de Ponto**
(`/app/ponto`) — **somente leitura**, sincronização por **botão manual** ("Sincronizar agora").

**Como funciona (dados confirmados no repo oficial da Secullum):**
- Auth: `https://autenticador.secullum.com.br` — OAuth2 password grant (`grant_type=password`,
  `username`, `password`, `client_id=3`) → `access_token`.
- API: `https://pontowebintegracaoexterna.secullum.com.br/IntegracaoExterna/`.
- Headers: `Authorization: Bearer <token>`, **`secullumidbancoselecionado: <id>`**, `Accept-Language: pt-BR`.
- É **cloud** (acessível pela internet) → a Edge Function alcança direto.

**Arquitetura:** a Edge Function **`pontofopag-sync`** faz proxy (guarda credenciais em secrets,
autentica o RH, chama o Secullum, persiste em `registros_ponto`/`ponto_inconsistencias` via RPCs
idempotentes por `id_externo`). Casamento com `colaboradores` por **CPF** (fallback matrícula);
funcionários sem correspondência aparecem no banner "não casados".

**Modo mock:** enquanto os secrets do Secullum não existirem, a função devolve **dados de exemplo**
(gerados de CPFs reais do banco) — a tela funciona e é demonstrável. Para ligar o real, setar os secrets:
```
PONTOFOPAG_BASE_URL=https://pontowebintegracaoexterna.secullum.com.br/IntegracaoExterna/
SECULLUM_AUTH_URL=https://autenticador.secullum.com.br
SECULLUM_USER, SECULLUM_PASS, SECULLUM_BANCO_ID
```
…e ajustar só os 3 mapeadores do adapter (`fetchPontofopag`/`mapBatidas`/`mapInconsistencias`) conforme
o Swagger (`pontowebintegracaoexterna.secullum.com.br/docs`). Requer plano **PRO** do Secullum e habilitar
em *Manutenção → Integração com Sistemas*.

---

## 8. Estrutura de arquivos

```
src/
  App.tsx                    # rotas + guarda de sessão (APP_ROUTES define permissões)
  supabaseClient.ts          # createClient(url, anonKey)
  data/contractTemplates.ts  # modelos de texto + buildContractText()
  types/index.ts             # tipos do domínio
  components/
    ProtectedRoute.tsx
    analytics/               # Overview, Turnover, HealthSafety, Compensations, Legal, Clima
    benefits/BenefitsManager.tsx
    cargos/CargosManager.tsx
    colaboradores/ColaboradorProntuarioModal.tsx
    common/                  # CommandPalette, Logo, LetterheadWatermark
    copilot/CopilotWidget.tsx
    documents/               # FormManager, AdmissionForm
    feedback/FeedbackManager.tsx
    folha/FolhaManager.tsx
    funcionariomes/          # FuncionarioMesManager, PodioArte
    organograma/OrganogramaManager.tsx
    ponto/PontoManager.tsx
    risco/RiscoManager.tsx
    vagas/                   # VagasManager, TestesPanel
  pages/
    public/  LandingPage, AdmissaoCandidato, PesquisaSatisfacao, Ouvidoria,
             PulseSemanal, FuncionarioMes, ManualCultura, SolicitarVaga, TesteComportamental
    private/ Dashboard.tsx   # ~6k linhas — quase todos os módulos internos vivem aqui
    errors/  AccessDenied403, NotFound404
supabase/
  supabase_setup.sql         # schema base
  sprint8..sprint32_*.sql    # migrations incrementais (rodadas à mão no SQL Editor)
  organograma.sql, apoio_*.sql, fix_*.sql   # migrations avulsas
  functions/
    gerar-contrato-pdf/      # gera/assina PDF de contrato
    pontofopag-sync/         # sync do ponto (Secullum), mock-first
    copilot/                 # assistente Copilot (chat)
```

> ⚠️ **`Dashboard.tsx` é gigante (~6.000 linhas)** e concentra a maioria dos módulos internos. Novos
> módulos entram como: rota em `App.tsx` (`APP_ROUTES`), link em `sidebarLinks` (~L2013), e bloco
> `activePath === '/app/xxx' && hasFullAccess && <XManager/>`. O componente pesado fica em
> `src/components/<área>/<Nome>.tsx` (padrão de `CargosManager`, `FeedbackManager`, `PontoManager`).

---

## 9. Como rodar e publicar

### Local
```bash
npm install
npm run dev            # Vite dev server (localhost:5173)
npm run build          # tsc -b && vite build
npx tsc --noEmit -p tsconfig.app.json   # type-check
```
`.env` (não versionado) precisa de `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
(publicáveis por design). **NUNCA** colocar a service_role key no `.env` — ela só existe como
secret de Edge Function.

### Publicar mudanças — **três alvos independentes**
1. **Frontend** → push na branch → a **Vercel** builda sozinha.
2. **Banco** → rodar o `sprint*.sql` correspondente **à mão no SQL Editor** do Supabase.
3. **Edge Functions** → **`npx supabase functions deploy <nome> --project-ref jyvxhyaeagqljvqqeuwi`**
   (precisa `npx supabase login` antes).

> 🔑 **A armadilha nº 1 do projeto:** mudar código de Edge Function **não** vale até rodar o
> `functions deploy`. Vercel e Supabase são deploys separados. Vários bugs "misteriosos" desta fase
> eram só função não republicada.

---

## 10. Situação atual (julho/2026) — o que está pronto e o que falta

### Feito no código (mergeado na `main`, buildando, type-check limpo)
**Até o sprint17 (base já documentada):**
- Rota da Agenda RH corrigida; seletor de **gênero** (M/F/O/NI); **Cargos & Carreira**;
  **Voz do Time** (pesquisa + ouvidoria anônimas, rate limit 3h); **Comparativo salarial ITO × Mercado Alagoas**;
  modelo "Contrato de Experiência (com Testemunhas)"; **Espelho de Ponto** (Secullum, mock-first);
  **renderização do contrato de texto no PDF**; fixes de cadastro/login, SPA routing Vercel, tema escuro, CORS.

**Sprints 18–32 (novos módulos):**
- **Copilot** — assistente em chat (widget + tabelas + Edge Function `copilot`) (sprint18).
- **Pulse Semanal** — termômetro de clima anônimo, com painel Clima no Analytics (sprint19).
- **Bucket `contratos-assinados`** criado por migration (sprint20).
- **Folha** — lançamentos de folha e gestão de compensação (sprint21).
- **Novos termos/documentos** de contrato: monitoramento, confidencialidade, EPI, LGPD (sprints 22–25).
- **Status `em_ferias`** + período de férias; **day-off de aniversário**; **vale-transporte** (sprints 26–28).
- **Desligamentos** — cálculo de aviso prévio, datas e pagamento (sprint28).
- **Manual de Cultura** editável + público; **movimentações de pessoal** para turnover (sprint29).
- **Solicitação de vaga** pública + **Vagas/Recrutamento**; **testes comportamentais DISC** por token (sprints 30–31).
- **Funcionário do Mês** — votação pública + gestão de rodadas com pódio (sprint32).
- **Organograma** editável, **Command Palette**, **Prontuário do colaborador** e forte repaginação de design
  (liquid glass, tipografia serif, migração de tokens creme→azul/navy).

### ⏳ Pendências operacionais (precisam de ação no Supabase — não são código)
1. **Republicar as Edge Functions:**
   ```bash
   npx supabase functions deploy gerar-contrato-pdf --project-ref jyvxhyaeagqljvqqeuwi
   npx supabase functions deploy pontofopag-sync    --project-ref jyvxhyaeagqljvqqeuwi
   npx supabase functions deploy copilot            --project-ref jyvxhyaeagqljvqqeuwi
   ```
   (A `gerar-contrato-pdf` precisa da versão nova pra renderizar o contrato de verdade.)
2. **Rodar as migrations** que ainda não foram aplicadas, **na ordem numérica** de sprint até o `sprint32`
   (além de `organograma.sql` e os `apoio_*`/`fix_*` avulsos), no SQL Editor. Cada arquivo é idempotente.
3. **Criar os buckets** (se ainda não existirem): `contratos-assinados` e `documentos-envios` (privados).
   As **policies de Storage** devem ser criadas pela **UI** (Storage → Policies), porque `alter/create policy`
   em `storage.objects` dá erro de owner no SQL Editor. *A assinatura em si só precisa do bucket existir*
   (a função usa service-role, que ignora RLS).
4. **Config de Auth (Supabase → Authentication → URL Configuration):** Site URL e Redirect URLs precisam
   apontar pro domínio de produção (senão o link de confirmação de e-mail vai pra localhost). **Recomendação:**
   para ferramenta interna, considerar **desligar "Confirm email"** (Providers → Email).
5. **Secullum:** setar os secrets quando tiver as credenciais (fica em mock até lá).
6. **PR:** o `feature/rh-modulos` já foi mergeado na `main`; PRs futuros são abertos pela UI do GitHub
   (o `gh` CLI não está instalado nesta máquina).

---

## 11. Decisões de segurança conhecidas (risco aceito — NÃO "consertar" sem alinhar)

- **`using (true)` em leitura para `authenticated`** (~25 policies): qualquer conta logada lê a base de
  RH (salário, dados de saúde, etc.). É **intencional** — o cargo `ti` é "leitura ampla". Documentado como
  **C-3** em `sprint10_fix_escalacao_privilegio.sql`. Reavaliar só se o quadro crescer ou houver auditoria ANPD.
- **E-mail superusuário hardcoded** (`ito.thiagosilva@gmail.com`) espalhado no frontend e nas policies — decisão explícita.
- **Cadastro restrito por domínio** com exceção nominal do TI (parece backdoor, mas é intencional).
- ⚠️ **Conflito de migrations:** `run_pending_migrations.sql` recria policies anônimas que o
  `sprint9_security_hardening.sql` remove. **Não rodar o `run_pending_migrations.sql`** — preferir os
  `sprint*.sql` específicos. (Ideal: aposentar aquele arquivo.)
- **RPC `inserir_colaborador_via_admissao`** aceita CPF/salário do payload sem cross-check com o token —
  ponto a endurecer se o fluxo público de admissão for muito usado.

---

## 12. Armadilhas recorrentes (o que já mordeu)

- **Edge Function não republicada** → "Failed to fetch" (CORS/rota) ou comportamento antigo. Sempre `deploy`.
- **Bucket inexistente** → `StorageApiError: Bucket not found` na assinatura. Criar os buckets.
- **Deploys separados** (Vercel ≠ Supabase ≠ SQL) — mudar um não muda os outros.
- **Modelos são de TEXTO**, não PDF — o PDF é renderizado pela função; sem a versão nova, cai em genérico.
- **Sessão persiste no navegador** (localStorage) — em micro compartilhado, o próximo "herda" a sessão de
  quem não deslogou. (Auto-logout por inatividade foi cogitado, não implementado.)
- **Promoção de cargo é só por SQL** — usuário novo só vê Analytics até virar `coordenadora_rh`.
- **`gh` CLI não instalado** — PRs são abertos pela UI do GitHub.
- **Como ver erro de Edge Function:** Dashboard Supabase → Edge Functions → `<função>` → Logs (o CLI
  desta versão não tem `functions logs`). A função loga o stack via `console.error(... falhou:)`.

---

## 13. Referências rápidas

- **Projeto Supabase (app):** `jyvxhyaeagqljvqqeuwi`
- **Logs da função:** `https://supabase.com/dashboard/project/jyvxhyaeagqljvqqeuwi/functions/<nome>/logs`
- **Repo/branch:** `henrizada77/omni-ito` → `main`
- **Empresa:** BIOLIFE CLÍNICA MÉDICA LTDA — CNPJ 37.037.182/0001-85 — Maceió/AL
- **Migrations:** rodar em ordem numérica de sprint; cada arquivo é idempotente.
- **Type-check antes de commitar:** `npx tsc --noEmit -p tsconfig.app.json`

---

*Fim. Para detalhes de qualquer módulo, o ponto de partida é `src/pages/private/Dashboard.tsx`
(módulos internos) e o `sprint*.sql` correspondente no `supabase/`.*
