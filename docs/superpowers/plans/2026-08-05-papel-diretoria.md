# Papel `diretoria` — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar o papel `diretoria`, que abre exatamente uma aba do painel — Voz do Time (`/app/feedback`) — em modo somente leitura.

**Architecture:** Um módulo novo, `src/auth/papeis.ts`, passa a ser a única lista de quais rotas privadas cada papel enxerga. App, Dashboard e paleta de comandos leem dele em vez de repetir a regra. No banco, o papel ganha `SELECT` nas quatro tabelas da aba; as policies de `UPDATE`/`DELETE` ficam intocadas, e é isso que garante o somente-leitura.

**Tech Stack:** React 19 + TypeScript, Vite, Vitest (testes de unidade puros, sem Testing Library), Supabase (Postgres + RLS), Tailwind 4.

## Global Constraints

- **Papel novo:** `diretoria`. Valor exato, minúsculo, sem acento — é o que vai na constraint do banco e no `perfis.cargo`.
- **Conta:** `diretoria@itoinstituto.com.br`.
- **E-mail do admin de TI:** `ito.thiagosilva@gmail.com`. Aparece hoje no front e nas policies; **preservar em ambos**, nunca remover neste trabalho.
- **Rota única da diretoria:** `/app/feedback`. Ela não recebe `/app/analytics`.
- **Somente leitura é do banco, não da UI.** Nenhum passo deste plano pode conceder `UPDATE`, `INSERT` ou `DELETE` ao papel `diretoria`.
- **Idempotência do SQL:** todo script em `supabase/` roda mais de uma vez sem quebrar. Use `drop policy if exists` antes de `create policy`.
- **Comentários em português**, explicando o porquê e não o quê, como o resto do repositório.
- **Mensagens de commit sem acentuação** e terminando com `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`, seguindo o histórico do projeto.

## Desvio consciente do spec

O spec previa manter o literal `APP_ROUTES` em `App.tsx` e adicionar um mapa separado
`ROTA_INICIAL_POR_PAPEL`. Isso deixaria **duas** listas de rota→papel que precisam
concordar — exatamente o defeito que a paleta de comandos já demonstra ter. O plano
usa `ROTAS_POR_PAPEL` em `src/auth/papeis.ts` como fonte única e deriva `APP_ROUTES`
dela. O resultado é menos código em `App.tsx`, não mais, e a Task 1 inclui um teste
que impede as listas de divergirem.

Consequência colateral, deliberada: a paleta hoje oferece `/app/organograma`, rota que
**não existe** em `APP_ROUTES` e cai no 404. Ao filtrar a paleta por allowlist, esse
item some para todos os papéis. O link morto deixa de ser oferecido; a rota inexistente
continua não existindo, e consertá-la segue fora de escopo.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `src/auth/papeis.ts` | **novo** — tipo `Papel`, `ROTAS_POR_PAPEL` e os quatro helpers puros que derivam dela. Sem React, sem Supabase, sem JSX: é o que torna a regra testável. |
| `src/auth/papeis.test.ts` | **novo** — cobre os quatro papéis efetivos e a invariante de que nenhum papel enxerga rota fora do conjunto da coordenadora. |
| `supabase/sprint41_papel_diretoria.sql` | **novo** — constraint, função `pode_ler_voz_do_time()`, quatro policies de SELECT, promoção comentada. |
| `src/App.tsx` | consome `papeis.ts`: `Role`, `APP_ROUTES` derivada, redirect inicial, props novas da paleta. |
| `src/components/ProtectedRoute.tsx` | só o tipo `Role`. |
| `src/pages/private/Dashboard.tsx` | sidebar filtrada por `podeVerRota`, guarda do badge, render do FeedbackManager, rótulos do papel. |
| `src/components/feedback/FeedbackManager.tsx` | prop `somenteLeitura`, propagada às três sub-views. |
| `src/components/common/CommandPalette.tsx` | props `papel`/`email`, filtro das rotas privadas, guarda da busca de colaboradores. |

---

### Task 1: Módulo de papéis e rotas

O núcleo puro. Tudo depois consome daqui.

**Files:**
- Create: `src/auth/papeis.ts`
- Test: `src/auth/papeis.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type Papel = 'coordenadora_rh' | 'ti' | 'diretoria'`
  - `const EMAIL_ADMIN_TI: string`
  - `const ROTAS_POR_PAPEL: Record<Papel, readonly string[]>`
  - `papelEfetivo(papel: Papel, email?: string | null): Papel`
  - `rotasPermitidas(papel: Papel, email?: string | null): readonly string[]`
  - `podeVerRota(papel: Papel, path: string, email?: string | null): boolean`
  - `rotaInicial(papel: Papel, email?: string | null): string`

- [ ] **Step 1: Escreva o teste que falha**

Crie `src/auth/papeis.test.ts`:

```ts
// A regra de "quem vê o quê" vivia espalhada entre App.tsx, a sidebar do Dashboard
// e a paleta de comandos — três cópias que ninguém garantia estarem de acordo. A
// paleta, de fato, não estava: oferecia Folha de Pagamento a qualquer autenticado.
//
// Estes testes existem para travar a propriedade que a diretoria depende: um papel
// restrito enxerga exatamente as rotas da sua lista, e nenhuma outra.

import { describe, it, expect } from 'vitest';
import {
  EMAIL_ADMIN_TI,
  ROTAS_POR_PAPEL,
  papelEfetivo,
  rotasPermitidas,
  podeVerRota,
  rotaInicial,
  type Papel
} from './papeis';

describe('ROTAS_POR_PAPEL', () => {
  it('dá à diretoria exatamente uma rota, e ela é a Voz do Time', () => {
    expect(ROTAS_POR_PAPEL.diretoria).toEqual(['/app/feedback']);
  });

  it('dá ao ti exatamente uma rota, e ela é Analytics', () => {
    expect(ROTAS_POR_PAPEL.ti).toEqual(['/app/analytics']);
  });

  // A App.tsx registra as rotas privadas percorrendo a lista da coordenadora. Uma
  // rota que só aparecesse em outro papel nunca chegaria a existir no roteador, e o
  // papel restrito levaria 404 em vez de entrar.
  it('não deixa nenhum papel apontar para rota fora do conjunto da coordenadora', () => {
    const todas = new Set(ROTAS_POR_PAPEL.coordenadora_rh);
    (Object.keys(ROTAS_POR_PAPEL) as Papel[]).forEach(papel => {
      ROTAS_POR_PAPEL[papel].forEach(rota => {
        expect(todas.has(rota), `${papel} aponta para ${rota}, que a coordenadora não tem`).toBe(true);
      });
    });
  });
});

describe('papelEfetivo', () => {
  it('trata o e-mail do admin de TI como coordenadora, preservando o bypass atual', () => {
    expect(papelEfetivo('ti', EMAIL_ADMIN_TI)).toBe('coordenadora_rh');
  });

  it('devolve o papel real para qualquer outro e-mail', () => {
    expect(papelEfetivo('ti', 'alguem@itoinstituto.com.br')).toBe('ti');
    expect(papelEfetivo('diretoria', 'diretoria@itoinstituto.com.br')).toBe('diretoria');
    expect(papelEfetivo('diretoria', null)).toBe('diretoria');
    expect(papelEfetivo('diretoria', undefined)).toBe('diretoria');
  });
});

describe('rotaInicial', () => {
  it('manda cada papel para a primeira rota que ele pode abrir', () => {
    expect(rotaInicial('coordenadora_rh', 'rh@itoinstituto.com.br')).toBe('/app/dashboard');
    expect(rotaInicial('diretoria', 'diretoria@itoinstituto.com.br')).toBe('/app/feedback');
    expect(rotaInicial('ti', 'ti@itoinstituto.com.br')).toBe('/app/analytics');
  });

  it('manda o admin de TI para o dashboard mesmo com cargo ti no banco', () => {
    expect(rotaInicial('ti', EMAIL_ADMIN_TI)).toBe('/app/dashboard');
  });
});

describe('podeVerRota', () => {
  it('abre a Voz do Time para a diretoria', () => {
    expect(podeVerRota('diretoria', '/app/feedback', 'diretoria@itoinstituto.com.br')).toBe(true);
  });

  it('fecha para a diretoria tudo que não é a Voz do Time', () => {
    const proibidas = ['/app/analytics', '/app/colaboradores', '/app/folha', '/app/dashboard', '/app/vagas'];
    proibidas.forEach(rota => {
      expect(podeVerRota('diretoria', rota, 'diretoria@itoinstituto.com.br'), rota).toBe(false);
    });
  });

  it('não dá a Voz do Time ao auditor de TI', () => {
    expect(podeVerRota('ti', '/app/feedback', 'ti@itoinstituto.com.br')).toBe(false);
    expect(podeVerRota('ti', '/app/analytics', 'ti@itoinstituto.com.br')).toBe(true);
  });

  it('mantém o admin de TI com acesso amplo', () => {
    expect(podeVerRota('ti', '/app/folha', EMAIL_ADMIN_TI)).toBe(true);
  });
});

describe('rotasPermitidas', () => {
  it('devolve a lista completa da coordenadora sem duplicata', () => {
    const lista = rotasPermitidas('coordenadora_rh', 'rh@itoinstituto.com.br');
    expect(new Set(lista).size).toBe(lista.length);
    expect(lista).toContain('/app/feedback');
    expect(lista).toContain('/app/analytics');
  });
});
```

- [ ] **Step 2: Rode o teste para confirmar que falha**

```bash
npx vitest run src/auth/papeis.test.ts
```

Esperado: FAIL — `Failed to resolve import "./papeis"`.

- [ ] **Step 3: Escreva o módulo**

Crie `src/auth/papeis.ts`:

```ts
// Quem enxerga o quê no painel.
//
// A regra morava em três lugares: a allowlist de rotas em App.tsx, a montagem da
// sidebar no Dashboard e os atalhos da paleta de comandos. Três cópias, e a da
// paleta já havia divergido — ela oferecia Folha de Pagamento e busca de
// colaborador por nome a qualquer autenticado, incluindo o auditor de TI.
//
// Com o papel `diretoria`, que abre UMA aba, essa divergência deixaria de ser
// incômodo e viraria vazamento. Por isso a lista passou a ser única e os três
// consumidores derivam dela.

export type Papel = 'coordenadora_rh' | 'ti' | 'diretoria';

// Exceção nominal herdada: esta conta é o admin de TI e continua com alcance de
// coordenadora mesmo com `cargo = 'ti'` no banco. O sprint37 criou o papel
// `superadmin` para aposentar o literal, mas o script traz um "edite antes de
// rodar" no meio e não há como saber daqui se ele rodou em produção. Removendo o
// literal, essa conta perderia o painel. Sai junto com o literal das policies,
// quando alguém confirmar que o sprint37 foi aplicado.
export const EMAIL_ADMIN_TI = 'ito.thiagosilva@gmail.com';

// Ordem importa: é a ordem dos links na sidebar, e o primeiro item é para onde o
// papel cai ao entrar em /app.
export const ROTAS_POR_PAPEL: Record<Papel, readonly string[]> = {
  coordenadora_rh: [
    '/app/dashboard',
    '/app/colaboradores',
    '/app/onboarding',
    '/app/documentos',
    '/app/beneficios',
    '/app/ferias-aso',
    '/app/avaliacoes',
    '/app/cargos',
    '/app/feedback',
    '/app/vagas',
    '/app/funcionario-mes',
    '/app/ponto',
    '/app/riscos',
    '/app/folha',
    '/app/agenda',
    '/app/cultura',
    '/app/analytics'
  ],
  // A diretoria acompanha o clima do time. Nada de cadastro, folha ou risco.
  diretoria: ['/app/feedback'],
  // Auditor de TI: métricas agregadas, sem dado individual.
  ti: ['/app/analytics']
};

export function papelEfetivo(papel: Papel, email?: string | null): Papel {
  return email === EMAIL_ADMIN_TI ? 'coordenadora_rh' : papel;
}

export function rotasPermitidas(papel: Papel, email?: string | null): readonly string[] {
  return ROTAS_POR_PAPEL[papelEfetivo(papel, email)] ?? [];
}

export function podeVerRota(papel: Papel, path: string, email?: string | null): boolean {
  return rotasPermitidas(papel, email).includes(path);
}

// Destino de /app. Cai no 403 se um papel ficar sem rota nenhuma — melhor a tela
// de acesso negado do que um redirect em loop.
export function rotaInicial(papel: Papel, email?: string | null): string {
  return rotasPermitidas(papel, email)[0] ?? '/403';
}
```

- [ ] **Step 4: Rode os testes para confirmar que passam**

```bash
npx vitest run src/auth/papeis.test.ts
```

Esperado: PASS, 12 testes.

- [ ] **Step 5: Verifique por mutação que os testes mordem**

Troque temporariamente `diretoria: ['/app/feedback']` por `diretoria: ['/app/feedback', '/app/folha']` e rode de novo.

Esperado: FAIL em pelo menos 2 testes (`dá à diretoria exatamente uma rota` e `fecha para a diretoria tudo que não é a Voz do Time`). Desfaça a alteração e confirme que volta a PASS.

- [ ] **Step 6: Commit**

```bash
git add src/auth/papeis.ts src/auth/papeis.test.ts
git commit -m "feat: modulo unico de rotas por papel, com o papel diretoria

A regra de quem enxerga o que estava em tres lugares: allowlist de
rotas em App.tsx, montagem da sidebar no Dashboard e atalhos da paleta
de comandos. A copia da paleta ja havia divergido — oferecia Folha de
Pagamento e busca de colaborador por nome a qualquer autenticado.

Com um papel que abre UMA aba, essa divergencia deixa de ser incomodo e
vira vazamento. ROTAS_POR_PAPEL passa a ser a lista unica; os tres
consumidores derivam dela nas tasks seguintes.

O teste de invariante impede que um papel aponte para rota fora do
conjunto da coordenadora — seria 404 em vez de acesso, porque e essa
lista que registra as rotas no roteador.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Migração SQL

Independente do código: nada no front depende deste arquivo para compilar. Mas sem ele a aba abre vazia para a diretoria, porque o RLS nega as quatro consultas.

**Files:**
- Create: `supabase/sprint41_papel_diretoria.sql`

**Interfaces:**
- Consumes: `public.perfis`, `public.get_user_role()` (ambos já existem).
- Produces: `public.pode_ler_voz_do_time()` — sem consumidor no TypeScript; é chamada só de dentro das policies.

- [ ] **Step 1: Escreva o script**

Crie `supabase/sprint41_papel_diretoria.sql`:

```sql
-- ----------------------------------------------------------------------------
-- SPRINT 41 — PAPEL 'diretoria': LEITURA DA VOZ DO TIME, E NADA MAIS
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente.
-- Ver docs/superpowers/specs/2026-08-05-papel-diretoria-design.md.
--
-- O modelo de papeis nao tinha estado intermediario: quem nao e coordenadora_rh
-- e tratado como auditor de TI e enxerga Analytics. A diretoria precisa do
-- oposto — uma aba so, Voz do Time — e nenhuma escrita.
--
-- ORDEM: rode este script ANTES de subir o deploy do front. O front novo manda a
-- diretoria para /app/feedback; sem as policies abaixo ela chega numa tela que
-- carrega e nao mostra nada.
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- 1. O papel novo
-- ----------------------------------------------------------------------------
-- A constraint vinha do sprint37 com tres valores.

alter table public.perfis drop constraint if exists check_cargo;
alter table public.perfis add constraint check_cargo
  check (cargo in ('coordenadora_rh', 'ti', 'superadmin', 'diretoria'));


-- ----------------------------------------------------------------------------
-- 2. Quem pode LER a Voz do Time
-- ----------------------------------------------------------------------------
-- Ler, so. Nao existe funcao equivalente para escrita, e e de proposito: as
-- policies de UPDATE e DELETE destas tabelas nao sao tocadas por este script.
-- E dai que vem a garantia de somente-leitura da diretoria — nao da interface.

create or replace function public.pode_ler_voz_do_time()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select cargo in ('coordenadora_rh', 'diretoria', 'superadmin')
     from public.perfis where id = auth.uid()),
    false);
$$;

grant execute on function public.pode_ler_voz_do_time() to authenticated;


-- ----------------------------------------------------------------------------
-- 3. As quatro policies de leitura da aba
-- ----------------------------------------------------------------------------
-- Os nomes sao os mesmos de antes (sprints 14 e 19), para que o drop case e nao
-- sobre policy duplicada concedendo acesso pela regra velha.
--
-- O literal do e-mail do TI FICA. O sprint37 pediu que os literais saissem das
-- policies, mas ele traz um "EDITE ESTA LINHA ANTES DE RODAR" no meio: se nunca
-- foi rodado, aquela conta ainda e cargo='ti' e removeria o TI da aba no mesmo
-- deploy que a abre para a diretoria. Limpar isso e trabalho do sprint37.

drop policy if exists "Leitura de pesquisa para RH" on public.pesquisas_satisfacao;
create policy "Leitura de pesquisa para RH"
  on public.pesquisas_satisfacao for select
  to authenticated
  using (public.pode_ler_voz_do_time() or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Leitura de ouvidoria para RH" on public.ouvidoria_manifestacoes;
create policy "Leitura de ouvidoria para RH"
  on public.ouvidoria_manifestacoes for select
  to authenticated
  using (public.pode_ler_voz_do_time() or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Leitura de pulse_respostas para RH" on public.pulse_respostas;
create policy "Leitura de pulse_respostas para RH"
  on public.pulse_respostas for select
  to authenticated
  using (public.pode_ler_voz_do_time() or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Leitura de pulse_alertas para RH" on public.pulse_alertas;
create policy "Leitura de pulse_alertas para RH"
  on public.pulse_alertas for select
  to authenticated
  using (public.pode_ler_voz_do_time() or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');


-- ----------------------------------------------------------------------------
-- 4. CONFIRA ANTES DE SEGUIR
-- ----------------------------------------------------------------------------
-- (a) A constraint admite o papel novo? (a definicao devolvida deve citar
--     'diretoria' junto dos outros tres)
--
--   select conname, pg_get_constraintdef(oid)
--   from pg_constraint where conname = 'check_cargo';
--
-- (b) As quatro tabelas tem exatamente UMA policy de select cada?
--
--   select tablename, policyname, cmd from pg_policies
--   where schemaname = 'public'
--     and tablename in ('pesquisas_satisfacao','ouvidoria_manifestacoes',
--                       'pulse_respostas','pulse_alertas')
--     and cmd = 'SELECT'
--   order by tablename;
--
-- (c) Nenhuma policy de escrita mencionando 'diretoria' (espera-se 0 linhas —
--     se aparecer alguma, alguem concedeu escrita e o somente-leitura caiu):
--
--   select tablename, policyname, cmd from pg_policies
--   where schemaname = 'public' and cmd <> 'SELECT'
--     and (qual like '%diretoria%' or with_check like '%diretoria%');


-- ----------------------------------------------------------------------------
-- 5. PROMOCAO — rode SO DEPOIS que ela se cadastrar
-- ----------------------------------------------------------------------------
-- Ela se cadastra sozinha em / escolhendo a propria senha. O trigger
-- trg_fn_handle_new_user aceita @itoinstituto.com.br e a cria como 'ti', sem
-- acesso a nada alem de Analytics. So entao, descomente e rode:
--
--   update public.perfis
--   set cargo = 'diretoria'
--   where email = 'diretoria@itoinstituto.com.br';
--
-- Confira que pegou exatamente uma linha:
--
--   select email, cargo from public.perfis order by cargo, email;
--
-- Revogar, um dia, e o mesmo UPDATE de volta para 'ti'.
```

- [ ] **Step 2: Verifique a sintaxe sem tocar no banco**

Não há linter de SQL no projeto. Confira à mão, relendo o arquivo, que:

- toda `create policy` tem uma `drop policy if exists` imediatamente antes, com **o mesmo nome entre aspas**;
- os quatro nomes de policy batem com os do repositório: `Leitura de pesquisa para RH`, `Leitura de ouvidoria para RH`, `Leitura de pulse_respostas para RH`, `Leitura de pulse_alertas para RH`;
- nenhuma linha executável (fora de comentário) contém `update`, `insert` ou `delete` — o único `update` do arquivo é o da seção 5, comentado.

```bash
grep -n "^[^-].*\b\(update\|insert\|delete\)\b" supabase/sprint41_papel_diretoria.sql
```

Esperado: nenhuma linha. Se aparecer alguma, o somente-leitura foi quebrado.

- [ ] **Step 3: Commit**

```bash
git add supabase/sprint41_papel_diretoria.sql
git commit -m "feat(db): papel diretoria com leitura da Voz do Time

Constraint check_cargo ganha o quarto valor e as quatro policies de
SELECT da aba passam por pode_ler_voz_do_time().

As policies de UPDATE e DELETE dessas tabelas NAO sao tocadas. E essa
omissao que faz o somente-leitura ser garantia e nao promessa da
interface: se um botao de excluir escapar para a tela, o Postgres
recusa.

O literal do e-mail do TI fica nas policies. O sprint37 pediu que
saissem, mas traz um 'edite antes de rodar' no meio e nao da para saber
daqui se rodou; se nao rodou, aquela conta ainda e cargo='ti' e sairia
da aba no mesmo deploy que a abre para a diretoria.

Promocao fica comentada no fim: ela se cadastra sozinha primeiro.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Rotas e redirect inicial

**Files:**
- Modify: `src/App.tsx:28-51` (tipo `Role` e `APP_ROUTES`), `src/App.tsx:246-257` (redirect de `/app`), `src/App.tsx:285-293` (props da paleta)
- Modify: `src/components/ProtectedRoute.tsx:4`

**Interfaces:**
- Consumes: `ROTAS_POR_PAPEL`, `rotaInicial`, `type Papel` da Task 1.
- Produces: `/app/feedback` passa a aceitar `diretoria`; `CommandPalette` recebe `papel` e `email` (consumidos na Task 6).

- [ ] **Step 1: Troque o tipo em ProtectedRoute**

Em `src/components/ProtectedRoute.tsx`, substitua a linha 4:

```ts
type Role = 'coordenadora_rh' | 'ti';
```

por:

```ts
import type { Papel as Role } from '../auth/papeis';
```

O `import` vai junto dos outros no topo do arquivo, antes de `interface ProtectedRouteProps`. O resto do arquivo não muda: `allowedRoles` e o bypass por e-mail continuam iguais.

- [ ] **Step 2: Troque o tipo e derive APP_ROUTES em App.tsx**

Em `src/App.tsx`, substitua o bloco das linhas 28-51 (do `type Role` até o fecha-colchete de `APP_ROUTES`) por:

```ts
type Role = Papel;
type Theme = 'dark' | 'light';

// As rotas privadas renderizam o mesmo Dashboard, que decide o conteudo pelo
// activePath. A unica coisa que varia entre elas e quem pode entrar — e isso
// agora vem de ROTAS_POR_PAPEL, nao de uma segunda lista mantida a mao aqui.
//
// A lista da coordenadora e o conjunto completo: percorre-la registra toda rota
// privada que existe. O teste de invariante em auth/papeis.test.ts garante que
// nenhum papel aponte para fora dela.
const PAPEIS = Object.keys(ROTAS_POR_PAPEL) as Papel[];

const APP_ROUTES: { path: string; allowedRoles: Role[] }[] =
  ROTAS_POR_PAPEL.coordenadora_rh.map(path => ({
    path,
    allowedRoles: PAPEIS.filter(papel => ROTAS_POR_PAPEL[papel].includes(path))
  }));
```

E adicione o import junto dos outros no topo:

```ts
import { ROTAS_POR_PAPEL, rotaInicial, type Papel } from './auth/papeis';
```

- [ ] **Step 3: Troque o redirect de `/app`**

Em `src/App.tsx`, substitua o `element` da rota `/app` (linhas 246-257) por:

```tsx
        <Route 
          path="/app" 
          element={
            <ProtectedRoute user={user} role={role} isInitialCheckDone={isInitialSessionCheckDone}>
              <Navigate to={rotaInicial(role, user?.email)} replace />
            </ProtectedRoute>
          }
        />
```

O `if/else` que existia ali decidia entre dashboard e analytics. Com quatro papéis efetivos isso não cabe mais num ternário, e a primeira rota da lista do papel já é a resposta.

- [ ] **Step 4: Passe papel e e-mail para a paleta**

Em `src/App.tsx`, no `<CommandPalette>` do fim do arquivo, acrescente duas props (as existentes ficam como estão):

```tsx
      <CommandPalette
        theme={theme}
        setTheme={setTheme}
        isAuthenticated={!!user}
        papel={role}
        email={user?.email}
        onLogout={async () => {
          await supabase.auth.signOut();
          setUser(null);
        }}
      />
```

A `CommandPalette` só passa a usar essas props na Task 6. Até lá o TypeScript aceita props extras? **Não** — ele reclama. Por isso a Task 6 é obrigatória antes do build passar, e o `npm run build` desta task ainda vai falhar nesse ponto. Se preferir manter cada commit compilando, faça a Task 6 antes desta, ou junte as duas num commit só.

- [ ] **Step 5: Verifique tipos e testes**

```bash
npx tsc -b --noEmit
```

Esperado: um único erro, em `App.tsx`, dizendo que `papel`/`email` não existem em `CommandPaletteProps`. Qualquer outro erro é regressão desta task.

```bash
npm test
```

Esperado: PASS — os testes da Task 1 não dependem de App.tsx.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/components/ProtectedRoute.tsx
git commit -m "feat: rotas privadas e redirect inicial derivados do papel

APP_ROUTES deixa de ser um literal mantido a mao e passa a sair de
ROTAS_POR_PAPEL. Eram duas listas de rota->papel que precisavam
concordar; agora e uma. /app/feedback ganha a diretoria por
consequencia, sem linha dedicada.

O redirect de /app era um ternario entre dashboard e analytics. Com
quatro papeis efetivos isso nao cabe mais: rotaInicial devolve a
primeira rota que o papel pode abrir.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Sidebar, badge e rótulos do Dashboard

**Files:**
- Modify: `src/pages/private/Dashboard.tsx:143` (derivado novo), `:2489-2500` (guarda do badge), `:2534-2554` (sidebar), `:2653` (rótulo), `:2689-2694` (badge mobile), `:5570-5572` (render)

**Interfaces:**
- Consumes: `podeVerRota` da Task 1; `somenteLeitura` do `FeedbackManager` (Task 5).
- Produces: nada para tasks posteriores.

- [ ] **Step 1: Adicione o import e o derivado**

Em `src/pages/private/Dashboard.tsx`, junto dos outros imports:

```ts
import { podeVerRota } from '../../auth/papeis';
```

E logo abaixo da linha 143 (`const hasFullAccess = ...`):

```ts
  // A diretoria enxerga esta aba e nenhuma outra. Deliberadamente separado de
  // hasFullAccess: os dezesseis outros usos daquele booleano guardam os fetch de
  // colaborador, folha, risco e advertencia. Mantendo-os intocados, a sessao da
  // diretoria nao dispara nenhuma dessas consultas.
  const podeVerVozDoTime = hasFullAccess || role === 'diretoria';
```

- [ ] **Step 2: Troque a guarda do badge de alertas**

Na linha 2490, dentro do `useEffect` de `pulseAlertasNovos`, troque:

```ts
    if (!hasFullAccess) return;
```

por:

```ts
    if (!podeVerVozDoTime) return;
```

e a lista de dependências do efeito, na linha 2500, de `[hasFullAccess]` para `[podeVerVozDoTime]`.

Atualize também o comentário das linhas 2486-2487:

```ts
  // Badge da sidebar: nº de alertas de pulse ainda não vistos. Faz sentido para
  // quem abre a Voz do Time; para o `ti` o RLS devolve 0.
```

- [ ] **Step 3: Monte a sidebar filtrando por papel**

Substitua o bloco `const sidebarLinks = [...]` (linhas 2534-2554) por:

```tsx
  // A lista completa, na ordem em que aparece para a coordenadora. Quem vê o quê
  // sai de ROTAS_POR_PAPEL — a mesma fonte que registra as rotas no roteador, para
  // que a sidebar nunca ofereça um link que o ProtectedRoute vai recusar.
  const TODOS_OS_LINKS = [
    { path: '/app/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    { path: '/app/colaboradores', label: 'Colaboradores', icon: <Users size={16} /> },
    { path: '/app/onboarding', label: 'Onboarding', icon: <ClipboardCheck size={16} /> },
    { path: '/app/documentos', label: 'Documentos', icon: <FileText size={16} /> },
    { path: '/app/beneficios', label: 'Benefícios', icon: <Gift size={16} /> },
    { path: '/app/ferias-aso', label: 'Férias & ASO', icon: <Calendar size={16} /> },
    { path: '/app/avaliacoes', label: 'Avaliações', icon: <Award size={16} /> },
    { path: '/app/cargos', label: 'Cargos & Carreira', icon: <Briefcase size={16} /> },
    { path: '/app/feedback', label: 'Voz do Time', icon: <MessageSquare size={16} /> },
    { path: '/app/vagas', label: 'Vagas', icon: <UserPlus size={16} /> },
    { path: '/app/funcionario-mes', label: 'Funcionário do Mês', icon: <Trophy size={16} /> },
    { path: '/app/ponto', label: 'Espelho de Ponto', icon: <Clock size={16} /> },
    { path: '/app/riscos', label: 'Mapa de Riscos', icon: <Shield size={16} /> },
    { path: '/app/folha', label: 'Lançamentos da Folha', icon: <Receipt size={16} /> },
    { path: '/app/agenda', label: 'Agenda RH', icon: <Calendar size={16} /> },
    { path: '/app/cultura', label: 'Manual de Cultura', icon: <BookOpen size={16} /> },
    { path: '/app/analytics', label: 'Analytics', icon: <TrendingUp size={16} /> }
  ];

  const sidebarLinks = TODOS_OS_LINKS.filter(l => podeVerRota(role, l.path, user?.email));
```

Repare que a ordem é a de `ROTAS_POR_PAPEL.coordenadora_rh` da Task 1 — as duas listas precisam ter os mesmos 17 caminhos. Se um `label` sumir da sidebar depois desta troca, é porque um caminho foi digitado diferente entre os dois arquivos.

- [ ] **Step 4: Ajuste os dois rótulos de papel**

Na linha 2653, troque:

```tsx
              {role === 'coordenadora_rh' ? 'Coordenadora RH' : (user?.email === 'ito.thiagosilva@gmail.com' ? 'TI Admin (Bypass)' : 'Auditor TI')}
```

por:

```tsx
              {role === 'coordenadora_rh'
                ? 'Coordenadora RH'
                : role === 'diretoria'
                  ? 'Diretoria'
                  : user?.email === 'ito.thiagosilva@gmail.com' ? 'TI Admin (Bypass)' : 'Auditor TI'}
```

E o badge do header mobile (linhas 2689-2694) por:

```tsx
          <span className={`text-[9px] px-2 py-0.5 rounded border font-mono ${hasFullAccess
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
              : role === 'diretoria'
                ? 'bg-sky-500/10 text-sky-500 border-sky-500/20'
                : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
            }`}>
            {hasFullAccess ? 'ADM' : role === 'diretoria' ? 'DIR' : 'TI'}
          </span>
```

- [ ] **Step 5: Libere o render da aba**

Nas linhas 5570-5572, troque:

```tsx
            {activePath === '/app/feedback' && hasFullAccess && (
              <FeedbackManager theme={theme} />
            )}
```

por:

```tsx
            {activePath === '/app/feedback' && podeVerVozDoTime && (
              <FeedbackManager theme={theme} somenteLeitura={role === 'diretoria'} />
            )}
```

Os outros dezesseis `activePath === ... && hasFullAccess` ficam **exatamente como estão**.

- [ ] **Step 6: Verifique**

```bash
npx tsc -b --noEmit
```

Esperado: dois erros conhecidos e nenhum outro — `papel`/`email` na `CommandPalette` (Task 6) e `somenteLeitura` no `FeedbackManager` (Task 5).

```bash
npm run lint
```

Esperado: sem erro novo. Se o oxlint reclamar de `TODOS_OS_LINKS` não usado, o filtro do Step 3 não foi aplicado.

- [ ] **Step 7: Commit**

```bash
git add src/pages/private/Dashboard.tsx
git commit -m "feat: sidebar do Dashboard filtrada por papel

A montagem da sidebar era um spread condicional em hasFullAccess: ou os
dezesseis links do RH, ou nada, mais Analytics no fim. Nao havia como
expressar 'um link so'.

Agora a lista completa passa por podeVerRota, a mesma fonte que registra
as rotas no roteador — a sidebar deixa de poder oferecer link que o
ProtectedRoute recusa.

podeVerVozDoTime e separado de hasFullAccess de proposito. Os dezesseis
outros usos daquele booleano guardam os fetch de colaborador, folha,
risco e advertencia; intocados, a sessao da diretoria nao dispara
nenhuma dessas consultas. O CopilotWidget sai pelo mesmo motivo, sem
linha nova.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Modo somente leitura no FeedbackManager

A UI para de oferecer o que o RLS vai negar. A trava é a da Task 2; esta evita que a diretoria clique em botões que só devolvem erro.

**Files:**
- Modify: `src/components/feedback/FeedbackManager.tsx:34-36` (props), `:89` (assinatura), `:196-234` (repasse às views), `:259-277` + `:377-397` (PulseView), `:551` + `:741-748` (PesquisaView), `:768` + `:952-999` (OuvidoriaView)

**Interfaces:**
- Consumes: `somenteLeitura` vindo do Dashboard (Task 4).
- Produces: `FeedbackManagerProps` ganha `somenteLeitura?: boolean`.

- [ ] **Step 1: Declare a prop**

Substitua a interface das linhas 34-36 por:

```ts
interface FeedbackManagerProps {
  theme: 'dark' | 'light';
  // Esconde tudo que escreve. A trava de verdade e o RLS — a diretoria nao tem
  // UPDATE nem DELETE nestas quatro tabelas. Isto so evita oferecer botao que
  // o banco vai recusar.
  somenteLeitura?: boolean;
}
```

E a assinatura da linha 89:

```ts
export default function FeedbackManager({ theme, somenteLeitura = false }: FeedbackManagerProps) {
```

- [ ] **Step 2: Repasse às três views**

No bloco de render (linhas 201-234), acrescente `somenteLeitura={somenteLeitura}` às três chamadas — `<PulseView>`, `<PesquisaView>` e `<OuvidoriaView>`. As demais props ficam como estão. Exemplo para a primeira:

```tsx
        <PulseView
          respostas={pulseRespostas}
          alertas={pulseAlertas}
          theme={theme}
          onChange={fetchAll}
          setErrorMsg={setErrorMsg}
          setSuccessMsg={setSuccessMsg}
          cardBg={cardBg}
          btnSecondary={btnSecondary}
          somenteLeitura={somenteLeitura}
        />
```

- [ ] **Step 3: PulseView — esconda os botões de status do alerta**

Na assinatura (linhas 259-277), acrescente `somenteLeitura` ao destructuring e `somenteLeitura: boolean;` ao tipo inline.

Depois, envolva o bloco de ações (linhas 377-397) na condicional:

```tsx
                  {!somenteLeitura && (
                    <div className="flex gap-2 shrink-0">
                      {a.status !== 'visto' && a.status !== 'resolvido' && (
                        <button
                          onClick={() => mudarStatusAlerta(a, 'visto')}
                          disabled={saving === a.id}
                          className={`text-[10px] font-bold px-3 py-1.5 rounded border ${btnSecondary} disabled:opacity-50`}
                        >
                          Marcar visto
                        </button>
                      )}
                      {a.status !== 'resolvido' && (
                        <button
                          onClick={() => mudarStatusAlerta(a, 'resolvido')}
                          disabled={saving === a.id}
                          className="text-[10px] font-bold px-3 py-1.5 rounded border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50 flex items-center gap-1"
                        >
                          {saving === a.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                          Resolver
                        </button>
                      )}
                    </div>
                  )}
```

O selo de status do alerta (`PULSE_ALERTA_STATUS_LABEL`) continua visível — ele informa, não escreve.

- [ ] **Step 4: PesquisaView — esconda o botão de excluir**

Na assinatura (linha 551), acrescente `somenteLeitura` ao destructuring e ao tipo inline.

Envolva o botão das linhas 741-748:

```tsx
                  {!somenteLeitura && (
                    <button
                      onClick={() => excluir(p.id)}
                      disabled={deleting === p.id}
                      className="opacity-40 hover:opacity-100 hover:text-rose-500 transition-opacity"
                      title="Excluir"
                    >
                      {deleting === p.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                  )}
```

- [ ] **Step 5: OuvidoriaView — esconda status, exclusão e edição da nota**

Na assinatura (linha 768), acrescente `somenteLeitura` ao destructuring e ao tipo inline.

Envolva o bloco de ações de status (linhas 955-975) inteiro:

```tsx
                      {!somenteLeitura && (
                        <div className="flex flex-wrap gap-2 pt-3">
                          {(['novo', 'em_analise', 'resolvido', 'arquivado'] as const)
                            .filter(s => s !== m.status)
                            .map(s => (
                              <button
                                key={s}
                                onClick={() => mudarStatus(m, s)}
                                disabled={saving === m.id}
                                className={`text-[10px] font-bold px-3 py-1.5 rounded border ${btnSecondary} disabled:opacity-50`}
                              >
                                Mover para {STATUS_LABEL[s]}
                              </button>
                            ))}
                          <button
                            onClick={() => excluir(m)}
                            disabled={saving === m.id}
                            className="text-[10px] font-bold px-3 py-1.5 rounded border border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
                          >
                            <Trash2 size={11} className="inline mr-1" /> Excluir
                          </button>
                        </div>
                      )}
```

E troque o bloco da nota interna (linhas 978-999) por uma versão que lê sem editar:

```tsx
                      {/* Nota interna */}
                      {somenteLeitura ? (
                        m.resposta_interna ? (
                          <div className="pt-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                              Nota interna do RH
                            </span>
                            <p className="text-xs mt-1 leading-relaxed whitespace-pre-wrap opacity-80">
                              {m.resposta_interna}
                            </p>
                          </div>
                        ) : null
                      ) : (
                        <div>
                          <label htmlFor={`fb-resposta-${m.id}`} className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                            Nota interna (visível só para o RH)
                          </label>
                          <textarea id={`fb-resposta-${m.id}`}
                            value={respostaAtual}
                            onChange={e => setRespostaDrafts(prev => ({ ...prev, [m.id]: e.target.value }))}
                            rows={3}
                            placeholder="Anote encaminhamentos, decisões, contato feito, etc."
                            className={`w-full text-xs px-3 py-2 rounded-lg border mt-1 ${inputBg}`}
                          />
                          {draft !== undefined && (
                            <button
                              onClick={() => salvarResposta(m)}
                              disabled={saving === m.id}
                              className={`mt-2 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${btnPrimary} disabled:opacity-50`}
                            >
                              {saving === m.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                              Salvar nota
                            </button>
                          )}
                        </div>
                      )}
```

- [ ] **Step 6: Verifique**

```bash
npx tsc -b --noEmit
```

Esperado: um único erro restante, o de `papel`/`email` na `CommandPalette`. O erro de `somenteLeitura` do Dashboard some aqui.

- [ ] **Step 7: Confirme que nenhuma escrita ficou exposta**

```bash
grep -n "onClick={() => \(excluir\|mudarStatus\|mudarStatusAlerta\|salvarResposta\)" src/components/feedback/FeedbackManager.tsx
```

Esperado: 5 ocorrências, e cada uma deve estar dentro de um bloco `{!somenteLeitura && (`. Confira lendo o entorno de cada linha retornada.

- [ ] **Step 8: Commit**

```bash
git add src/components/feedback/FeedbackManager.tsx
git commit -m "feat: modo somente leitura na Voz do Time

A diretoria le as tres sub-abas e nao escreve em nenhuma. Sem isto ela
veria botao de excluir, de mover status e o campo de nota interna — e
cada clique voltaria erro do RLS, que ja nega essas operacoes.

A trava e a do banco. Isto e para a interface parar de oferecer o que o
Postgres vai recusar. A nota interna continua legivel, so perde o
textarea: e informacao util para acompanhar o caso, nao acao.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Paleta de comandos ciente de papéis

Sem esta task, "acesso apenas à Voz do Time" é falso: a diretoria abriria Ctrl+K e veria atalho para Folha de Pagamento, além de buscar colaboradores por nome e receber nome, cargo e setor.

**Files:**
- Modify: `src/components/common/CommandPalette.tsx:25-47` (props), `:55-78` (busca), `:150-186` (rotas privadas)

**Interfaces:**
- Consumes: `podeVerRota` e `type Papel` da Task 1; `papel`/`email` passados pela Task 3.
- Produces: nada.

- [ ] **Step 1: Declare as props**

Acrescente o import junto dos outros:

```ts
import { podeVerRota, type Papel } from '../../auth/papeis';
```

Troque a interface (linhas 25-30) por:

```ts
interface CommandPaletteProps {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  isAuthenticated?: boolean;
  // A paleta so distinguia anonimo de autenticado. Com um papel que abre uma aba
  // so, isso deixaria vazar atalho de Folha e busca de colaborador por nome.
  papel?: Papel;
  email?: string | null;
  onLogout?: () => void;
}
```

E o destructuring (linhas 42-47):

```tsx
export const CommandPalette: React.FC<CommandPaletteProps> = ({
  theme,
  setTheme,
  isAuthenticated = false,
  papel = 'ti',
  email,
  onLogout
}) => {
```

O default `'ti'` é o mesmo default de `role` em `App.tsx`: o papel menos privilegiado, para que um render antes do perfil carregar não mostre demais.

- [ ] **Step 2: Guarde a busca de colaboradores**

Troque a condição de saída do efeito (linha 57) por:

```ts
    // Nome, cargo e setor de colaborador so para quem ja tem a aba de
    // colaboradores. Antes bastava estar autenticado — o auditor de TI e a
    // diretoria recebiam a lista de quem trabalha aqui por Ctrl+K.
    if (!isAuthenticated || !podeVerRota(papel, '/app/colaboradores', email) || query.trim().length < 2) {
      setColaboradores([]);
      return;
    }
```

E a lista de dependências (linha 78) de `[query, isAuthenticated]` para `[query, isAuthenticated, papel, email]`.

- [ ] **Step 3: Filtre as rotas privadas**

Troque o bloco `privateItems` (linhas 150-186) por:

```tsx
    const privateItems: CommandItem[] = ([
      {
        id: 'dashboard',
        path: '/app/dashboard',
        title: 'Dashboard de Clima & Visão Geral',
        category: 'Painel de Gestão' as const,
        icon: <TrendingUp size={18} />,
        action: () => navigate('/app/dashboard')
      },
      {
        id: 'analytics',
        path: '/app/analytics',
        title: 'Analytics & Métricas de RH',
        category: 'Painel de Gestão' as const,
        icon: <Sparkles size={18} />,
        action: () => navigate('/app/analytics')
      },
      {
        id: 'folha',
        path: '/app/folha',
        title: 'Gestão de Folha & Compensação',
        category: 'Painel de Gestão' as const,
        icon: <FileText size={18} />,
        action: () => navigate('/app/folha')
      },
      {
        id: 'vagas',
        path: '/app/vagas',
        title: 'Processos Seletivos & Vagas',
        category: 'Painel de Gestão' as const,
        icon: <Briefcase size={18} />,
        action: () => navigate('/app/vagas')
      },
      {
        id: 'organograma',
        path: '/app/organograma',
        title: 'Organograma da Equipe',
        category: 'Painel de Gestão' as const,
        icon: <Users size={18} />,
        action: () => navigate('/app/organograma')
      }
    ]).filter(item => podeVerRota(papel, item.path, email));
```

O item `organograma` some para todos: `/app/organograma` não existe em `ROTAS_POR_PAPEL` porque nunca existiu em `APP_ROUTES` — o atalho caía no 404. O filtro deixa de oferecer o link morto; criar a rota segue fora de escopo.

- [ ] **Step 4: Inclua papel e email nas dependências do memo**

Na linha 214, troque a lista de dependências do `useMemo` de:

```ts
  }, [location.pathname, isAuthenticated, theme, setTheme, navigate, onLogout]);
```

para:

```ts
  }, [location.pathname, isAuthenticated, papel, email, theme, setTheme, navigate, onLogout]);
```

Sem isso a paleta continuaria mostrando os itens do papel anterior depois de uma troca de sessão.

- [ ] **Step 5: Verifique**

```bash
npx tsc -b --noEmit
```

Esperado: **zero erros**. Este é o passo em que a árvore volta a compilar inteira.

```bash
npm run lint && npm test
```

Esperado: lint sem erro novo; testes PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/common/CommandPalette.tsx
git commit -m "fix: paleta de comandos passa a respeitar o papel

A paleta so distinguia anonimo de autenticado. Qualquer autenticado —
inclusive o auditor de TI — recebia atalho para Dashboard, Folha de
Pagamento e Vagas, e podia buscar colaborador por nome recebendo nome,
cargo e setor de volta. Os cliques davam 403, mas os nomes ja tinham
aparecido na tela.

Com o papel diretoria isso deixaria de ser incoerencia e viraria
vazamento: 'acesso apenas a Voz do Time' seria falso no primeiro Ctrl+K.

A correcao vale para o ti tambem, por decisao explicita — e a mesma
falha, e consertar so para o papel novo deixaria a porta aberta de
proposito.

O item organograma some junto: apontava para /app/organograma, rota que
nunca existiu em APP_ROUTES e caia no 404.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Verificação de ponta a ponta

Nenhum código novo. É o portão antes de considerar pronto.

**Files:** nenhum.

**Interfaces:**
- Consumes: tudo.
- Produces: nada.

- [ ] **Step 1: Build, lint e testes**

```bash
npm run build && npm run lint && npm test
```

Esperado: build sem erro de tipo, lint sem erro novo, testes PASS.

- [ ] **Step 2: Confira que a coordenadora não perdeu nada**

```bash
npx vitest run src/auth/papeis.test.ts -t "coordenadora"
```

Esperado: PASS. Depois, no app rodando (`npm run dev`), entre com uma conta `coordenadora_rh` e confirme: 17 links na sidebar, `/app` cai em `/app/dashboard`, a Voz do Time mostra os botões de status, excluir e o campo de nota interna.

- [ ] **Step 3: Confira o papel novo sem criar conta**

Ainda em `npm run dev`, com a conta de RH logada, force o papel pelo React DevTools ou troque temporariamente o default de `useState<Role>('ti')` em `App.tsx` para `'diretoria'`. Confirme:

- a sidebar mostra **um** link, Voz do Time;
- `/app` redireciona para `/app/feedback`;
- Ctrl+K não lista nenhuma rota privada e não retorna colaborador ao digitar um nome;
- na aba, nenhum botão de excluir, mover status ou salvar nota;
- digitar `/app/folha` na barra de endereço cai em `/403`.

**Desfaça a alteração temporária** antes de seguir.

- [ ] **Step 4: Rode o SQL em produção**

Cole `supabase/sprint41_papel_diretoria.sql` no SQL Editor do Supabase e rode. Depois execute as três consultas de conferência da seção 4 do script e confirme o esperado de cada uma.

- [ ] **Step 5: Deploy e cadastro**

Suba o front. Peça para a diretora se cadastrar em `/` com `diretoria@itoinstituto.com.br`, escolhendo a própria senha. Ela vai entrar como `ti` e ver Analytics — é o esperado até a promoção.

- [ ] **Step 6: Promova e confirme**

Descomente e rode o `UPDATE` da seção 5 do script. Confirme que atingiu **uma** linha. Peça para ela recarregar: deve cair direto na Voz do Time, com um link na sidebar e nenhum botão de escrita.
