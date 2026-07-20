# Omni ITO — Contexto do Projeto

> Documento de onboarding. Lendo isto do começo ao fim, uma pessoa nova entende **o que é o
> sistema, como está construído, o que já funciona, o que falta, e as armadilhas**.
> Última atualização de contexto: julho/2026.

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
- Repositório: **`henrizada77/omni-ito`**. Branch de trabalho atual: **`feature/rh-modulos`**.

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

**Buckets de Storage** (privados): **`contratos-assinados`** (PDFs assinados) e
**`documentos-envios`** (anexos da admissão: RG, comprovante, ASO).

---

## 5. Módulos (o que o RH vê)

Sidebar (todos exigem `coordenadora_rh`, exceto Analytics que o `ti` também vê):

1. **Dashboard** — KPIs e alertas.
2. **Colaboradores** — quadro, ficha (drawer) com edição, ocorrências, desligamento.
3. **Onboarding** — checklist de integração.
4. **Documentos** — modelos, geração de link de assinatura, assinatura bilateral do RH.
5. **Benefícios** — cadastro e associação de benefícios.
6. **Férias & ASO** — vencimentos (datas em `colaboradores`, cálculo client-side).
7. **Avaliações** — avaliação de desempenho estruturada.
8. **Cargos & Carreira** — catálogo de cargos, trilhas com degraus, workflow de promoções.
9. **Voz do Time** — pesquisa de satisfação + ouvidoria (leitura das respostas anônimas).
10. **Espelho de Ponto** — integração Secullum (ver §7).
11. **Agenda RH** — calendário derivado de vencimentos/admissões/advertências.
12. **Analytics** — Overview, Turnover, Saúde & Segurança, Compensação, Jurídico.

### Páginas públicas (sem login)
- **`/`** — landing + login/cadastro.
- **`/admissao/:token`** — fluxo do candidato (ficha → assinatura do contrato).
- **`/pesquisa`** — pesquisa de satisfação anônima (rate limit 1 envio/3h por dispositivo, via `localStorage`).
- **`/ouvidoria`** — ouvidoria anônima (elogio/sugestão/reclamação/denúncia; mesmo rate limit).

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
    analytics/               # Overview, Turnover, HealthSafety, Compensations, Legal
    benefits/BenefitsManager.tsx
    cargos/CargosManager.tsx
    documents/               # FormManager, AdmissionForm
    feedback/FeedbackManager.tsx
    ponto/PontoManager.tsx
  pages/
    public/  LandingPage, AdmissaoCandidato, PesquisaSatisfacao, Ouvidoria
    private/ Dashboard.tsx   # ~6k linhas — quase todos os módulos internos vivem aqui
    errors/  AccessDenied403, NotFound404
supabase/
  supabase_setup.sql         # schema base
  sprint8..sprint17_*.sql    # migrations incrementais (rodadas à mão no SQL Editor)
  functions/
    gerar-contrato-pdf/      # gera/assina PDF de contrato
    pontofopag-sync/         # sync do ponto (Secullum), mock-first
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

### Feito no código (branch `feature/rh-modulos`, buildando, type-check limpo)
- Rota da Agenda RH corrigida (dava 404).
- Seletor de **gênero** no drawer do colaborador (M/F/O/NI).
- **Cargos & Carreira** (catálogo, trilhas, promoções).
- **Voz do Time** (pesquisa + ouvidoria anônimas, rate limit 3h, links públicos na landing).
- **Comparativo salarial ITO × Mercado Alagoas** por cargo.
- Modelo **"Contrato de Experiência (com Testemunhas)"**.
- Fixes: cadastro/login (mensagens de e-mail não confirmado), **SPA routing na Vercel**,
  **menu suspenso no tema escuro**, **CORS da Edge Function** (libera localhost + `*.vercel.app`).
- **Espelho de Ponto** (Secullum, mock-first).
- **Renderização do contrato de texto no PDF** (antes gerava certificado genérico).

### ⏳ Pendências operacionais (precisam de ação no Supabase — não são código)
1. **Republicar as Edge Functions:**
   ```bash
   npx supabase functions deploy gerar-contrato-pdf --project-ref jyvxhyaeagqljvqqeuwi
   npx supabase functions deploy pontofopag-sync    --project-ref jyvxhyaeagqljvqqeuwi
   ```
   (A `gerar-contrato-pdf` precisa da versão nova pra renderizar o contrato de verdade.)
2. **Rodar as migrations** que ainda não foram aplicadas: `sprint12` … `sprint17` (na ordem, no SQL Editor).
3. **Criar os buckets** (se ainda não existirem): `contratos-assinados` e `documentos-envios` (privados).
   As **policies de Storage** devem ser criadas pela **UI** (Storage → Policies), porque `alter/create policy`
   em `storage.objects` dá erro de owner no SQL Editor. *A assinatura em si só precisa do bucket existir*
   (a função usa service-role, que ignora RLS).
4. **Config de Auth (Supabase → Authentication → URL Configuration):** Site URL e Redirect URLs precisam
   apontar pro domínio de produção (senão o link de confirmação de e-mail vai pra localhost). **Recomendação:**
   para ferramenta interna, considerar **desligar "Confirm email"** (Providers → Email).
5. **Secullum:** setar os secrets quando tiver as credenciais (fica em mock até lá).
6. **PR:** os commits estão em `feature/rh-modulos` no remoto; o PR é aberto pela UI do GitHub
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
- **Repo/branch:** `henrizada77/omni-ito` → `feature/rh-modulos`
- **Empresa:** BIOLIFE CLÍNICA MÉDICA LTDA — CNPJ 37.037.182/0001-85 — Maceió/AL
- **Migrations:** rodar em ordem numérica de sprint; cada arquivo é idempotente.
- **Type-check antes de commitar:** `npx tsc --noEmit -p tsconfig.app.json`

---

*Fim. Para detalhes de qualquer módulo, o ponto de partida é `src/pages/private/Dashboard.tsx`
(módulos internos) e o `sprint*.sql` correspondente no `supabase/`.*
