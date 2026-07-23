# Funcionário do Mês Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development ou executing-plans. Steps `- [ ]`.

**Goal:** Votação mensal identificada de Funcionário do Mês: página pública de voto, painel RH (quem votou/quem falta/apuração) e arte de pódio Top 3 baixável em PNG.

**Architecture:** 2 tabelas (`funcionario_mes_rodadas`, `funcionario_mes_votos`) sem acesso anônimo direto; público age via RPCs `SECURITY DEFINER`. RH lê direto (autenticado). Arte em SVG montada no RH (fotos do bucket privado inline em base64) e rasterizada para PNG no navegador.

**Tech Stack:** React + TS + Vite, Supabase (RLS + RPC + Storage), react-router-dom, lucide-react, Tailwind inline. Sem lib de imagem.

## Global Constraints

- Verificação: `npx tsc --noEmit -p tsconfig.app.json` (exit 0). Root tsconfig `noUnusedLocals`.
- Migração roda manual no projeto real; código degrada sem crash sem as tabelas/RPCs.
- RH gate front = `hasFullAccess`. Predicado RLS RH = `public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com'`.
- Anônimo só pelas 3 RPCs. Foto: `colaboradores.documentos_anexos.foto` no bucket `documentos-envios` (URL assinada).

## File Structure

- `supabase/sprint32_funcionario_mes.sql` — criar: 2 tabelas + índices + RLS RH + 3 RPCs.
- `src/pages/public/FuncionarioMes.tsx` — criar: página de voto.
- `src/components/funcionariomes/FuncionarioMesManager.tsx` — criar: painel RH.
- `src/components/funcionariomes/PodioArte.tsx` — criar: SVG do pódio + download PNG.
- `src/App.tsx` — modificar: import/rota pública + `/app/funcionario-mes` em APP_ROUTES.
- `src/pages/private/Dashboard.tsx` — modificar: ícone `Trophy`, sidebar item, lazy import, render da aba.

---

## Task 1: SQL (tabelas + RLS + RPCs)

**Files:** Create `supabase/sprint32_funcionario_mes.sql`

**Interfaces:** Produces tabelas conforme spec Bloco 1 e RPCs `get_funcionario_mes_aberto()`, `listar_colaboradores_ativos_votacao()`, `registrar_voto_funcionario_mes(uuid,uuid,uuid)→text`.

- [ ] **Step 1:** Escrever o SQL exatamente como no spec Bloco 1 (2 `create table if not exists`, índices, índice único parcial `where status='aberta'`, `enable row level security`, 4 policies por tabela `to authenticated` com predicado RH + `drop policy if exists` antes, as 3 funções `security definer set search_path = public`, `grant execute ... to anon, authenticated`, `notify pgrst`).
- [ ] **Step 2:** Conferir contra `sprint31` (RPC/RLS). Rodado manual pelo usuário.
- [ ] **Step 3:** Commit `feat: sprint32 - funcionario do mes (tabelas + RPCs)`.

---

## Task 2: Página pública `/funcionario-do-mes`

**Files:** Create `src/pages/public/FuncionarioMes.tsx`; Modify `src/App.tsx`

**Interfaces:** Consumes RPCs da Task 1. Props `{ theme, setTheme }`. Produces componente default + rota `/funcionario-do-mes`.

- [ ] **Step 1:** Criar a página (padrão visual `Ouvidoria`):
  - Estados: `estado` ('carregando'|'fechada'|'form'|'enviado'), `rodada` ({id,competencia,titulo,data_fim}|null), `colaboradores` ({id,nome,setor}[]), `votanteId`, `votadoId`, `submitting`, `error`.
  - Mount: `const [{data: rd}, {data: cols}] = await Promise.all([supabase.rpc('get_funcionario_mes_aberto'), supabase.rpc('listar_colaboradores_ativos_votacao')])`. `rd?.[0]` → rodada; sem rodada → `estado='fechada'`. Senão `estado='form'`, `colaboradores = cols||[]`.
  - Form: select "Quem é você?" (colaboradores) e select "Em quem você vota?" (colaboradores com `id !== votanteId`). Mostra mês (`competencia`) e prazo (`data_fim` com `+ 'T12:00:00'`).
  - Enviar (habilita com votante+votado e distintos): `const { data: res, error } = await supabase.rpc('registrar_voto_funcionario_mes', { p_rodada_id: rodada.id, p_votante_id: votanteId, p_votado_id: votadoId })`. `error`→setError. `res==='ok'`→`estado='enviado'`; `'ja_votou'`→setError("Você já votou nesta rodada."); `'fechada'`→setError("A votação foi encerrada."); `'invalido'`→setError genérico.
  - Telas 'fechada'/'enviado': cartão de mensagem.
- [ ] **Step 2:** `src/App.tsx` — import `FuncionarioMes` + `<Route path="/funcionario-do-mes" element={<FuncionarioMes theme={theme} setTheme={setTheme} />} />`.
- [ ] **Step 3:** `npx tsc --noEmit -p tsconfig.app.json` → 0.
- [ ] **Step 4:** Commit `feat: pagina publica de votacao funcionario do mes`.

---

## Task 3: Arte do pódio `PodioArte.tsx`

**Files:** Create `src/components/funcionariomes/PodioArte.tsx`

**Interfaces:** Consumes nada externo. Props `{ top3: { colaborador_id: string; nome: string; setor: string | null; votos: number }[]; fotos: (string | null)[]; competencia: string; theme: 'dark'|'light' }`. Produces componente default `PodioArte` com botão de download.

- [ ] **Step 1:** Criar componente:
  - `ref` no `<svg>`. Monta um SVG 1080×1080: fundo, título "Funcionário do Mês" + mês por extenso (converter 'YYYY-MM' → nome via array de meses pt-BR), 3 colunas de pódio (ordem visual 2º,1º,3º; 1º maior/centro). Cada bloco: círculo Ø com `fotos[i]` via `<image href={dataURL} .../>` (clipPath círculo) ou monograma (iniciais de `nome` + cor por posição ouro/prata/bronze), medalha (texto 🥇🥈🥉 ou "1º/2º/3º"), `nome`, `setor`, `{votos} votos`. Trata top3 com menos de 3 itens (renderiza só os existentes).
  - Botão "Baixar PNG": serializa `svgRef` com `XMLSerializer`, cria `Blob` `image/svg+xml`, `URL.createObjectURL`, carrega em `new Image()`; no `onload` desenha em `<canvas width=1080 height=1080>`, `canvas.toBlob(b => download)`. Nome do arquivo `funcionario-do-mes-{competencia}.png`. Revoga as URLs.
- [ ] **Step 2:** `npx tsc --noEmit -p tsconfig.app.json` → 0.
- [ ] **Step 3:** Commit `feat: arte de podio (SVG + download PNG) do funcionario do mes`.

---

## Task 4: Painel RH `FuncionarioMesManager.tsx`

**Files:** Create `src/components/funcionariomes/FuncionarioMesManager.tsx`

**Interfaces:** Consumes tabelas (select/insert/update autenticado), `PodioArte` (Task 3), storage `documentos-envios`. Props `{ theme, userId, userEmail }`. Produces componente default.

- [ ] **Step 1:** Criar componente:
  - `logAuditoria(acao, detalhes)` local (insert `logs_auditoria`).
  - `fetchTudo`: `rodada` = última `funcionario_mes_rodadas` por `criado_em desc` (`.limit(1)`); `colaboradores` ativos (`.neq('status','desligado')`, campos `id,nome,setor,documentos_anexos`); se houver rodada, `votos` da rodada. Trata `error`.
  - **Sem rodada aberta** (nenhuma ou última fechada): form "Abrir rodada" — `competencia` default `${ano}-${mes2}`, `data_fim` (input date). Insert `{ competencia, data_fim, criado_por_email: userEmail }` + log + refetch.
  - **Rodada aberta:**
    - `votantes = new Set(votos.map(v => v.votante_id))`. Listas "Já votaram" (colaboradores em votantes) e "Faltam" (ativos ∖ votantes). Contador N/total + %.
    - Apuração: `Map votado_id → count` de votos; ordena desc; join nome/setor; mostra lista.
    - Botão **Fechar rodada**: computa `top3` = apuração ordenada (votos desc; empate por `nome` asc) fatiada em 3, formato `{ colaborador_id, nome, setor, votos }`; `update({ status:'fechada', top3, fechada_em: new Date().toISOString() }).eq('id', rodada.id)`; log; refetch.
  - **Rodada fechada:** resolve fotos do `top3`: para cada, acha o colaborador; se `documentos_anexos?.foto`, `storage.from('documentos-envios').createSignedUrl(path,60)` → `fetch` → blob → `FileReader.readAsDataURL` → dataURL; senão `null`. Guarda `fotos` em estado (efeito quando `top3` muda). Renderiza `<PodioArte top3 fotos competencia theme />`. Botão "Abrir nova rodada" (volta ao form).
  - Erros tratados; loading spinner.
- [ ] **Step 2:** `npx tsc --noEmit -p tsconfig.app.json` → 0.
- [ ] **Step 3:** Commit `feat: painel RH do funcionario do mes (rodada, apuracao, fechamento)`.

---

## Task 5: Wiring no Dashboard + App

**Files:** Modify `src/App.tsx`, `src/pages/private/Dashboard.tsx`

- [ ] **Step 1:** `App.tsx` — `{ path: '/app/funcionario-mes', allowedRoles: ['coordenadora_rh'] }` em `APP_ROUTES`.
- [ ] **Step 2:** `Dashboard.tsx` — lazy `const FuncionarioMesManager = lazy(() => import('../../components/funcionariomes/FuncionarioMesManager'));`.
- [ ] **Step 3:** Import ícone `Trophy` no bloco lucide-react.
- [ ] **Step 4:** Sidebar item após "Vagas": `{ path: '/app/funcionario-mes', label: 'Funcionário do Mês', icon: <Trophy size={16} /> }`.
- [ ] **Step 5:** Render junto às abas: `{activePath === '/app/funcionario-mes' && hasFullAccess && (<FuncionarioMesManager theme={theme} userId={user?.id || ''} userEmail={user?.email || ''} />)}`.
- [ ] **Step 6:** `npx tsc --noEmit -p tsconfig.app.json` → 0.
- [ ] **Step 7:** Commit `feat: aba Funcionario do Mes no painel RH`.

---

## Task 6: Verificação

- [ ] `npx tsc --noEmit -p tsconfig.app.json` → 0.
- [ ] Fluxo manual (após `sprint32_*.sql`): abrir rodada → votar por 3 colaboradores na página pública → RH vê quem votou/quem falta + apuração → fechar → pódio Top 3 + Baixar PNG (imagem com foto/monograma) → re-votar mostra "já votou" → sem rodada aberta a pública informa fechada.
- [ ] Degradação sem tabela/RPC: página pública mostra "não está aberta"/erro tratado; painel RH não crasha.
- [ ] Revisão diff: RLS só RH; anon só via RPC; `security definer set search_path`; canvas não-tainted (dataURL inline); `votante ≠ votado`; sem segredos.

---

## Self-Review

**Cobertura:** Bloco 1→T1; Bloco 2→T2; Bloco 3(RH)→T4; Bloco 4(arte)→T3; Bloco 5(wiring)→T2(rota)+T5. Fora de escopo respeitado. ✔
**Placeholders:** nenhum; contratos de RPC e props explícitos. ✔
**Consistência:** `top3` gravado (T4) = shape lido por `PodioArte` (T3); `fotos:(string|null)[]` alinhado por índice com `top3`; RPC `registrar_voto...` retorna text tratado em T2; props `FuncionarioMesManager`(theme,userId,userEmail) batem com T5. ✔
