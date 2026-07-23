# Teste Comportamental (DISC) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use `- [ ]`.

**Goal:** RH gera um teste DISC por candidato (link revogável), o candidato responde anonimamente pelo token, e o RH vê o resultado (2 gráficos + fator dominante) numa sub-aba de Vagas.

**Architecture:** Tabela `testes_comportamentais` sem acesso anônimo direto; o candidato lê/grava via RPCs `SECURITY DEFINER` (`get_teste_by_token`, `submit_teste_comportamental`), espelhando o fluxo de admissão. Motor DISC puro em `src/utils/disc.ts`. Página pública `/teste-comportamental/:token`. Sub-aba "Testes" dentro do `VagasManager`.

**Tech Stack:** React + TS + Vite, Supabase (Postgres + RLS + RPC), react-router-dom, lucide-react, Tailwind inline. Sem framework de teste.

## Global Constraints

- Verificação: `npx tsc --noEmit -p tsconfig.app.json` (exit 0). `tsc` puro é NO-OP. Root tsconfig tem `noUnusedLocals` — import não usado quebra.
- Migração roda **manual** no SQL Editor do projeto real; código degrada sem crash se a tabela/RPC não existir (tratar `error`).
- RH gate no front = `hasFullAccess`. RLS do RH = `public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com'`.
- Anônimo nunca acessa a tabela direto — só pelas 2 RPCs.
- Datas date-only ancoram `+ 'T12:00:00'`; aqui só há timestamptz (já com hora).

## File Structure

- `supabase/sprint31_testes_comportamentais.sql` — **criar**: tabela + índices + RLS (só RH) + 2 RPCs SECURITY DEFINER + grants.
- `src/utils/disc.ts` — **criar**: tipos, `BLOCOS` (24), `calcularDISC`, `DESCRICOES`.
- `src/pages/public/TesteComportamental.tsx` — **criar**: página do candidato.
- `src/components/vagas/TestesPanel.tsx` — **criar**: sub-aba RH (gerar/listar/revogar/ver resultado).
- `src/App.tsx` — **modificar**: import + rota `/teste-comportamental/:token`.
- `src/components/vagas/VagasManager.tsx` — **modificar**: seletor de sub-aba Solicitações|Testes.

---

## Task 1: Migração SQL — tabela + RLS + RPCs

**Files:** Create `supabase/sprint31_testes_comportamentais.sql`

**Interfaces:**
- Consumes: `public.get_user_role()`.
- Produces: tabela `testes_comportamentais` (colunas conforme spec Bloco 1) e RPCs `get_teste_by_token(p_token text)` → `(candidato_nome, status, ativo, vaga_relacionada)`; `submit_teste_comportamental(p_token text, p_respostas jsonb, p_resultado jsonb)` → `boolean`.

- [ ] **Step 1: Escrever o SQL** (conteúdo idêntico ao spec Bloco 1: `create table if not exists`, 3 índices, `alter table ... enable row level security`, 4 policies `to authenticated` com o predicado RH, as 2 funções `create or replace ... security definer set search_path = public`, os 2 `grant execute ... to anon, authenticated`, e `notify pgrst, 'reload schema';`). Adicionar `drop policy if exists` antes de cada `create policy` (idempotência).
- [ ] **Step 2: Conferir contra `sprint8_form_admissao.sql`** (padrão de RPC SECURITY DEFINER) e `sprint14` (predicado RH). Rodado manualmente pelo usuário.
- [ ] **Step 3: Commit** — `git commit -m "feat: sprint31 - testes_comportamentais (tabela + RPCs DISC)"`

---

## Task 2: Motor DISC (`src/utils/disc.ts`)

**Files:** Create `src/utils/disc.ts`

**Interfaces:**
- Produces: `type Fator`, `interface BlocoDISC`, `interface RespostaBloco`, `interface ResultadoDISC`, `const BLOCOS: BlocoDISC[]` (24), `function calcularDISC(respostas: RespostaBloco[]): ResultadoDISC`, `const DESCRICOES`.

- [ ] **Step 1: Escrever o arquivo** com o conteúdo abaixo (banco completo de 24 blocos, um adjetivo por fator em cada):

```ts
export type Fator = 'D' | 'I' | 'S' | 'C';

export interface BlocoDISC {
  adjetivos: { texto: string; fator: Fator }[]; // sempre 4, um por fator
}

export interface RespostaBloco {
  bloco: number;      // índice 0..23
  mais: Fator;        // adjetivo que MAIS combina
  menos: Fator;       // adjetivo que MENOS combina
}

export interface ResultadoDISC {
  pressao: Record<Fator, number>;  // contagem de "MAIS" por fator
  natural: Record<Fator, number>;  // contagem de "MENOS" por fator
  net: Record<Fator, number>;      // pressao - natural
  dominante: Fator;
}

// 24 blocos; cada bloco tem exatamente um adjetivo D, um I, um S e um C.
export const BLOCOS: BlocoDISC[] = [
  { adjetivos: [{ texto: 'Decidido', fator: 'D' }, { texto: 'Animado', fator: 'I' }, { texto: 'Paciente', fator: 'S' }, { texto: 'Cauteloso', fator: 'C' }] },
  { adjetivos: [{ texto: 'Competitivo', fator: 'D' }, { texto: 'Comunicativo', fator: 'I' }, { texto: 'Calmo', fator: 'S' }, { texto: 'Preciso', fator: 'C' }] },
  { adjetivos: [{ texto: 'Ousado', fator: 'D' }, { texto: 'Persuasivo', fator: 'I' }, { texto: 'Leal', fator: 'S' }, { texto: 'Analítico', fator: 'C' }] },
  { adjetivos: [{ texto: 'Direto', fator: 'D' }, { texto: 'Otimista', fator: 'I' }, { texto: 'Prestativo', fator: 'S' }, { texto: 'Detalhista', fator: 'C' }] },
  { adjetivos: [{ texto: 'Determinado', fator: 'D' }, { texto: 'Sociável', fator: 'I' }, { texto: 'Estável', fator: 'S' }, { texto: 'Organizado', fator: 'C' }] },
  { adjetivos: [{ texto: 'Assertivo', fator: 'D' }, { texto: 'Entusiasmado', fator: 'I' }, { texto: 'Cooperativo', fator: 'S' }, { texto: 'Metódico', fator: 'C' }] },
  { adjetivos: [{ texto: 'Corajoso', fator: 'D' }, { texto: 'Expressivo', fator: 'I' }, { texto: 'Tranquilo', fator: 'S' }, { texto: 'Rigoroso', fator: 'C' }] },
  { adjetivos: [{ texto: 'Exigente', fator: 'D' }, { texto: 'Espontâneo', fator: 'I' }, { texto: 'Compreensivo', fator: 'S' }, { texto: 'Perfeccionista', fator: 'C' }] },
  { adjetivos: [{ texto: 'Firme', fator: 'D' }, { texto: 'Divertido', fator: 'I' }, { texto: 'Confiável', fator: 'S' }, { texto: 'Disciplinado', fator: 'C' }] },
  { adjetivos: [{ texto: 'Independente', fator: 'D' }, { texto: 'Extrovertido', fator: 'I' }, { texto: 'Gentil', fator: 'S' }, { texto: 'Sistemático', fator: 'C' }] },
  { adjetivos: [{ texto: 'Objetivo', fator: 'D' }, { texto: 'Inspirador', fator: 'I' }, { texto: 'Amável', fator: 'S' }, { texto: 'Criterioso', fator: 'C' }] },
  { adjetivos: [{ texto: 'Enérgico', fator: 'D' }, { texto: 'Falante', fator: 'I' }, { texto: 'Sereno', fator: 'S' }, { texto: 'Reservado', fator: 'C' }] },
  { adjetivos: [{ texto: 'Ambicioso', fator: 'D' }, { texto: 'Carismático', fator: 'I' }, { texto: 'Colaborador', fator: 'S' }, { texto: 'Formal', fator: 'C' }] },
  { adjetivos: [{ texto: 'Resoluto', fator: 'D' }, { texto: 'Alegre', fator: 'I' }, { texto: 'Modesto', fator: 'S' }, { texto: 'Lógico', fator: 'C' }] },
  { adjetivos: [{ texto: 'Dominante', fator: 'D' }, { texto: 'Convincente', fator: 'I' }, { texto: 'Constante', fator: 'S' }, { texto: 'Ponderado', fator: 'C' }] },
  { adjetivos: [{ texto: 'Audacioso', fator: 'D' }, { texto: 'Popular', fator: 'I' }, { texto: 'Acolhedor', fator: 'S' }, { texto: 'Meticuloso', fator: 'C' }] },
  { adjetivos: [{ texto: 'Impaciente', fator: 'D' }, { texto: 'Impulsivo', fator: 'I' }, { texto: 'Pacífico', fator: 'S' }, { texto: 'Prudente', fator: 'C' }] },
  { adjetivos: [{ texto: 'Franco', fator: 'D' }, { texto: 'Emotivo', fator: 'I' }, { texto: 'Bondoso', fator: 'S' }, { texto: 'Exato', fator: 'C' }] },
  { adjetivos: [{ texto: 'Vigoroso', fator: 'D' }, { texto: 'Comunicador', fator: 'I' }, { texto: 'Equilibrado', fator: 'S' }, { texto: 'Conservador', fator: 'C' }] },
  { adjetivos: [{ texto: 'Iniciador', fator: 'D' }, { texto: 'Aberto', fator: 'I' }, { texto: 'Discreto', fator: 'S' }, { texto: 'Cuidadoso', fator: 'C' }] },
  { adjetivos: [{ texto: 'Realizador', fator: 'D' }, { texto: 'Empolgado', fator: 'I' }, { texto: 'Ameno', fator: 'S' }, { texto: 'Racional', fator: 'C' }] },
  { adjetivos: [{ texto: 'Intenso', fator: 'D' }, { texto: 'Efusivo', fator: 'I' }, { texto: 'Dócil', fator: 'S' }, { texto: 'Regrado', fator: 'C' }] },
  { adjetivos: [{ texto: 'Combativo', fator: 'D' }, { texto: 'Espirituoso', fator: 'I' }, { texto: 'Fiel', fator: 'S' }, { texto: 'Minucioso', fator: 'C' }] },
  { adjetivos: [{ texto: 'Voluntarioso', fator: 'D' }, { texto: 'Radiante', fator: 'I' }, { texto: 'Ponderador', fator: 'S' }, { texto: 'Cerimonioso', fator: 'C' }] }
];

const ZERO = (): Record<Fator, number> => ({ D: 0, I: 0, S: 0, C: 0 });
const ORDEM: Fator[] = ['D', 'I', 'S', 'C'];

export function calcularDISC(respostas: RespostaBloco[]): ResultadoDISC {
  const pressao = ZERO();
  const natural = ZERO();
  for (const r of respostas) {
    pressao[r.mais] += 1;
    natural[r.menos] += 1;
  }
  const net = ZERO();
  for (const f of ORDEM) net[f] = pressao[f] - natural[f];
  let dominante: Fator = 'D';
  for (const f of ORDEM) if (net[f] > net[dominante]) dominante = f;
  return { pressao, natural, net, dominante };
}

export const DESCRICOES: Record<Fator, { titulo: string; texto: string }> = {
  D: { titulo: 'Dominância', texto: 'Foco em resultados, decisão rápida e desafios. Direto e competitivo; pode ser impaciente com detalhes e processos.' },
  I: { titulo: 'Influência', texto: 'Comunicativo, otimista e persuasivo. Motiva pessoas e cria conexões; pode se dispersar em execução e prazos.' },
  S: { titulo: 'Estabilidade', texto: 'Paciente, leal e cooperativo. Valoriza rotina e harmonia; pode resistir a mudanças bruscas.' },
  C: { titulo: 'Conformidade', texto: 'Analítico, preciso e organizado. Preza qualidade e regras; pode ser excessivamente crítico ou cauteloso.' }
};
```

- [ ] **Step 2: `npx tsc --noEmit -p tsconfig.app.json`** → exit 0.
- [ ] **Step 3: Commit** — `git commit -m "feat: motor DISC (banco de 24 blocos + pontuacao)"`

---

## Task 3: Página do candidato `/teste-comportamental/:token`

**Files:** Create `src/pages/public/TesteComportamental.tsx`; Modify `src/App.tsx`

**Interfaces:**
- Consumes: RPCs da Task 1 (`get_teste_by_token`, `submit_teste_comportamental`); `BLOCOS`, `calcularDISC`, `RespostaBloco` da Task 2. Props `{ theme: 'dark'|'light'; setTheme: (t)=>void }`.
- Produces: componente default `TesteComportamental`; rota `/teste-comportamental/:token`.

- [ ] **Step 1: Criar a página.** Estrutura (padrão visual do `Ouvidoria`/públicas):
  - `useParams` pega `token`. `useState`: `estado` ('carregando'|'invalido'|'respondido'|'form'|'enviado'), `nome`, `respostas: (RespostaBloco | undefined)[]` de tamanho `BLOCOS.length`, `submitting`, `error`.
  - `useEffect` no mount: `const { data, error } = await supabase.rpc('get_teste_by_token', { p_token: token })`. `data` é array (RETURNS TABLE); pega `data?.[0]`. Sem linha ou `ativo===false` → `estado='invalido'`. `status==='respondido'` → `estado='respondido'`. Senão `estado='form'`, seta `nome`.
  - Form: `BLOCOS.map((bloco, i) => ...)`. Cada bloco mostra os 4 adjetivos com dois controles: coluna "MAIS" (radios) e coluna "MENOS" (radios). Selecionar "mais" igual ao "menos" atual limpa o menos (e vice-versa) — invariante: `mais !== menos`. Atualiza `respostas[i] = { bloco: i, mais, menos }`.
  - Progresso: `respondidos = respostas.filter(r => r && r.mais && r.menos).length`. Botão enviar habilita com `respondidos === BLOCOS.length`.
  - Enviar: `const completas = respostas.filter(Boolean) as RespostaBloco[]; const resultado = calcularDISC(completas); const { data: ok, error } = await supabase.rpc('submit_teste_comportamental', { p_token: token, p_respostas: completas, p_resultado: resultado });` Se `error` → `setError`. Se `ok === false` → aviso "já enviado/indisponível". Senão `estado='enviado'`.
  - Telas 'invalido'/'respondido'/'enviado': cartões simples com mensagem (o candidato **não** vê o próprio resultado — só confirma envio).
- [ ] **Step 2: Registrar rota em `src/App.tsx`** — import `TesteComportamental` (junto aos públicos) e:
  ```tsx
  <Route path="/teste-comportamental/:token" element={<TesteComportamental theme={theme} setTheme={setTheme} />} />
  ```
- [ ] **Step 3: `npx tsc --noEmit -p tsconfig.app.json`** → exit 0.
- [ ] **Step 4: Commit** — `git commit -m "feat: pagina publica do teste comportamental (/teste-comportamental/:token)"`

---

## Task 4: Sub-aba "Testes" no painel RH

**Files:** Create `src/components/vagas/TestesPanel.tsx`; Modify `src/components/vagas/VagasManager.tsx`

**Interfaces:**
- Consumes: tabela `testes_comportamentais` (select/insert/update autenticado); `DESCRICOES`, `Fator`, `ResultadoDISC` da Task 2. Props `{ theme: 'dark'|'light'; userId: string; userEmail: string }`.
- Produces: componente default `TestesPanel`. `VagasManager` passa a alternar sub-abas.

- [ ] **Step 1: Criar `TestesPanel.tsx`:**
  - Estado: `lista`, `loading`, `erro`, form de geração (`novoNome`, `novoEmail`, `novaVaga`), `gerando`, `copiadoId`, `abertoId`.
  - `fetchLista`: `supabase.from('testes_comportamentais').select('*').order('criado_em', { ascending: false })`; trata `error`.
  - `logAuditoria(acao, detalhes)` local (insert em `logs_auditoria` com `usuario_id: userId`, `usuario_email: userEmail`) — mesmo helper do `VagasManager`.
  - **Gerar:** valida nome; `const token = crypto.randomUUID().replace(/-/g, '');` `insert({ token, candidato_nome, candidato_email: email||null, vaga_relacionada: vaga||null, criado_por_email: userEmail })`; em sucesso, `navigator.clipboard.writeText(\`${origin}/teste-comportamental/${token}\`)` (try/catch), `logAuditoria('TESTE_COMPORTAMENTAL_GERADO', { candidato_nome, token })`, limpa form, `fetchLista`.
  - **Lista:** cada item: nome, badge status (Pendente/Respondido), vaga, data (`toLocaleDateString('pt-BR')`), e se `ativo===false` badge "Revogado". Ações: **Copiar link** + **Revogar** (`update({ ativo:false }).eq('id', ...)` + log) para pendentes ativos; **Ver resultado** para respondidos.
  - **Ver resultado:** expande e lê `item.resultado` (`ResultadoDISC`). Renderiza 2 grupos de 4 barras (pressao, natural) — barra = div com `width` proporcional ao maior valor do grupo (fallback 1 p/ evitar /0). Mostra `dominante` + `DESCRICOES[dominante].titulo`/`.texto`. Barras sem recharts (CSS puro).
- [ ] **Step 2: Alterar `VagasManager.tsx`** — adicionar sub-aba:
  - Import `TestesPanel`. Novo estado `const [subAba, setSubAba] = useState<'solicitacoes' | 'testes'>('solicitacoes');`.
  - No topo do return (antes do header atual), um seletor de 2 botões (Solicitações | Testes).
  - Se `subAba === 'testes'`, renderizar `<TestesPanel theme={theme} userId={userId} userEmail={userEmail} />` e **não** renderizar o conteúdo de solicitações (envolver o conteúdo atual em `{subAba === 'solicitacoes' && (...)}`). O card de link público pode ficar visível só em "solicitacoes".
- [ ] **Step 3: `npx tsc --noEmit -p tsconfig.app.json`** → exit 0.
- [ ] **Step 4: Commit** — `git commit -m "feat: sub-aba Testes (DISC) no painel Vagas"`

---

## Task 5: Verificação de ponta a ponta

- [ ] **Step 1:** `npx tsc --noEmit -p tsconfig.app.json` → exit 0.
- [ ] **Step 2 (opcional):** `npm run build` conclui; chunks novos para `TesteComportamental` e `TestesPanel`.
- [ ] **Step 3: Fluxo manual** (após rodar `sprint31_*.sql` no projeto real):
  1. RH → Vagas → Testes → "Gerar teste" (nome) → link copiado; item aparece "Pendente".
  2. Abrir o link anônimo → responder os 24 blocos (mais/menos) → enviar → "Respostas enviadas".
  3. RH → item vira "Respondido" → "Ver resultado" mostra 2 gráficos + dominante + descrição.
  4. Revogar um pendente → abrir o link → tela "inválido".
  5. Reabrir o link já respondido → tela "já enviado".
- [ ] **Step 4:** Confirmar degradação sem a tabela/RPC: a sub-aba Testes mostra erro tratado, não crash. `logs_auditoria` recebe `TESTE_COMPORTAMENTAL_GERADO`.
- [ ] **Step 5:** Revisão do diff (RLS só RH; anon só via RPC; `security definer set search_path`; sem segredos; `error` tratado; `mais !== menos` garantido).

---

## Self-Review (ao escrever o plano)

**Cobertura do spec:** Bloco 1→Task 1; Bloco 2→Task 2; Bloco 3→Task 3; Bloco 4→Task 4; Bloco 5 (wiring)→Task 3 (rota) + Task 4 (sub-aba). Fora de escopo respeitado (sem e-mail, sem proctoring, banco fixo). ✔
**Placeholders:** nenhum; `disc.ts` completo com 24 blocos; contratos de RPC e componentes explícitos. ✔
**Consistência de tipos:** `Fator`/`RespostaBloco`/`ResultadoDISC` de `disc.ts` usados igual em Task 3 e 4; `resultado` gravado (Task 3) tem o mesmo shape lido (Task 4); RPC `submit` retorna boolean tratado como `ok`. Props `TestesPanel`(`theme`,`userId`,`userEmail`) batem com a chamada no `VagasManager`. ✔
