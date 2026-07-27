# Refatoração Omni ITO — Fase 1: Performance e Rede

> **Para workers agênticos:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar tarefa a tarefa. Os passos usam checkbox (`- [ ]`).

**Goal:** Eliminar o desperdício de rede e os vazamentos de performance do Omni ITO sem alterar nenhum comportamento visível ao usuário.

**Architecture:** Nenhuma reestruturação de arquivos nesta fase. Trocamos `select('*')` por listas de colunas explícitas nas queries que hoje baixam PDFs e assinaturas em base64, removemos o fetch duplicado no mount, colocamos teto nas tabelas de crescimento ilimitado e aplicamos debounce onde há rajada de requisições. A decomposição do `Dashboard.tsx` é a Fase 3 — deliberadamente fora daqui, porque mexer em estrutura e em queries ao mesmo tempo torna impossível saber o que quebrou.

**Tech Stack:** Vite 8, React 19, TypeScript, Supabase JS v2, Vitest (introduzido na Tarefa 1).

## Global Constraints

- Nenhuma mudança de comportamento visível. Se a tela mudar, a tarefa está errada.
- Type-check obrigatório ao fim de cada tarefa: `npx tsc --noEmit -p tsconfig.app.json` — saída vazia.
- Lint sem regressão: `npm run lint` não pode ganhar avisos novos. Base atual = 2 avisos (`OrganogramaManager.tsx:38`, `ManualCultura.tsx:33`).
- Nenhuma migration SQL nesta fase. O banco não é tocado.
- Commits pequenos, um por tarefa, mensagem em português no padrão do repo (`perf:`, `fix:`, `chore:`).
- Não introduzir dependência nova além das de teste da Tarefa 1.

---

## Contexto: por que estas tarefas, nesta ordem

Medições de 2026-07-27 no branch `main`:

| Evidência | Número |
|---|---|
| `Dashboard.tsx` | 7.959 linhas (36% do `src`), 154 `useState`, 17 `useEffect` |
| Bundle `index` | 626 kB (170 kB gzip) |
| Chunk recharts | 363 kB (97 kB gzip) — já isolado via lazy, OK |
| `React.memo` no projeto inteiro | 0 |
| Paginação/virtualização em qualquer lista | 0 |
| Framework de teste | inexistente |

As tarefas estão ordenadas por **impacto ÷ risco**. As de 2 a 5 sozinhas eliminam a maior parte do tráfego desperdiçado.

---

### Task 1: Instalar Vitest e provar que roda

Sem runner de teste, toda tarefa seguinte é verificada só no olho. Esta é a fundação.

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/utils/debounce.ts`
- Create: `src/utils/debounce.test.ts`

**Interfaces:**
- Produces: `debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T & { cancel: () => void }` — consumido pelas Tasks 7 e 8.

- [ ] **Step 1: Instalar as dependências de teste**

```bash
npm install -D vitest@^3 jsdom@^26 @testing-library/react@^16 @testing-library/jest-dom@^6
```

- [ ] **Step 2: Criar `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // O supabaseClient lê import.meta.env no import; sem isto os testes
    // que importam componentes quebram antes da primeira asserção.
    env: {
      VITE_SUPABASE_URL: 'https://teste.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'chave-de-teste'
    }
  }
});
```

- [ ] **Step 3: Criar `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Adicionar os scripts em `package.json`**

Dentro de `"scripts"`, após a linha `"lint": "oxlint src",`:

```json
    "test": "vitest run",
    "test:watch": "vitest",
```

- [ ] **Step 5: Escrever o teste que falha**

Criar `src/utils/debounce.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce } from './debounce';

describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('chama a função uma única vez após o intervalo', () => {
    const fn = vi.fn();
    const d = debounce(fn, 300);

    d(); d(); d();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('usa os argumentos da última chamada', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);

    d('primeiro');
    d('ultimo');
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('ultimo');
  });

  it('cancel() impede a execução pendente', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);

    d();
    d.cancel();
    vi.advanceTimersByTime(500);

    expect(fn).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Rodar o teste e confirmar que falha**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./debounce"`.

- [ ] **Step 7: Implementar `src/utils/debounce.ts`**

```ts
/**
 * Adia a execução até `ms` sem novas chamadas. A última chamada vence.
 * `cancel()` existe para o cleanup de useEffect: sem ele, um componente
 * desmontado ainda dispara a função pendente.
 */
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  ms: number
): T & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const wrapped = ((...args: Parameters<T>) => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, ms);
  }) as T & { cancel: () => void };

  wrapped.cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };

  return wrapped;
}
```

- [ ] **Step 8: Rodar o teste e confirmar que passa**

Run: `npm test`
Expected: PASS — 3 testes.

- [ ] **Step 9: Type-check e commit**

```bash
npx tsc --noEmit -p tsconfig.app.json
git add package.json package-lock.json vitest.config.ts src/test/setup.ts src/utils/debounce.ts src/utils/debounce.test.ts
git commit -m "chore: adiciona Vitest e helper debounce testado"
```

---

### Task 2: Remover o framer-motion (dependência morta)

`framer-motion` está no `package.json` mas **não é importado em lugar nenhum** do `src/` (grep por `framer-motion` e `<motion.` = 0 resultados). É peso morto de instalação.

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Confirmar que continua sem uso**

Run: `grep -rn "framer-motion\|<motion\." src/ ; echo "saida-vazia-esperada"`
Expected: nenhuma linha antes de `saida-vazia-esperada`.

> Se aparecer QUALQUER resultado, pare e não remova a dependência. Reporte o achado.

- [ ] **Step 2: Desinstalar**

```bash
npm uninstall framer-motion
```

- [ ] **Step 3: Provar que o build continua verde**

Run: `npm run build`
Expected: `✓ built in …`, sem erro de módulo não encontrado.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove framer-motion, dependencia sem uso no src"
```

---

### Task 3: Eliminar o fetch duplicado de colaboradores no mount

**O problema:** dois `useEffect` chamam `fetchColaboradoresList()` no mesmo mount — o de `Dashboard.tsx:1669` (por `activePath`, cobrindo 5 rotas) e o de `Dashboard.tsx:1686` (por `hasFullAccess`). Cada chamada dispara 8 queries. Para o RH abrindo `/app/dashboard` são **16 requisições concorrentes idênticas**, com corrida entre as duas respostas escrevendo no mesmo estado.

O effect de `hasFullAccess` já cobre todas as rotas do RH. O de `activePath` é redundante para quem tem acesso total.

**Files:**
- Modify: `src/pages/private/Dashboard.tsx:1669-1689`

- [ ] **Step 1: Ler o trecho atual e confirmar as linhas**

Run: `sed -n '1665,1692p' src/pages/private/Dashboard.tsx`
Expected: os dois `useEffect`, um com dep `[activePath]` (ou similar) e outro com `[hasFullAccess]`.

> Se a numeração não bater (o arquivo mudou), localize pelo conteúdo: `grep -n "fetchColaboradoresList()" src/pages/private/Dashboard.tsx`.

- [ ] **Step 2: Substituir os dois effects por um só**

Trocar o bloco dos dois `useEffect` por:

```tsx
  // Lista de colaboradores: fonte de 9 módulos (dashboard, documentos,
  // colaboradores, onboarding, beneficios, ferias-aso, avaliacoes, analytics,
  // agenda). Um único effect — antes havia dois (por activePath e por
  // hasFullAccess) disparando 8 queries CADA no mesmo mount, com corrida
  // entre as respostas escrevendo no mesmo estado.
  useEffect(() => {
    if (!hasFullAccess) return;
    fetchColaboradoresList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFullAccess]);
```

- [ ] **Step 3: Verificar que nenhuma rota perdeu o carregamento**

Run: `grep -n "fetchColaboradoresList" src/pages/private/Dashboard.tsx`
Expected: a definição (~1537), a chamada do effect acima, e as chamadas dentro de handlers de escrita. Nenhuma outra chamada em `useEffect` com `activePath`.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: saída vazia.

- [ ] **Step 5: Verificação manual obrigatória**

Subir `npm run dev`, logar como `coordenadora_rh`, abrir a aba Network do navegador filtrando por `colaboradores`, e navegar para `/app/dashboard`.
Expected: **uma** requisição a `colaboradores`, não duas. Depois navegar entre Colaboradores → Onboarding → Benefícios → Férias/ASO e confirmar que todas as listas continuam populando.

- [ ] **Step 6: Commit**

```bash
git add src/pages/private/Dashboard.tsx
git commit -m "perf: unifica o fetch duplicado de colaboradores no mount"
```

---

### Task 4: Parar de baixar PDFs em base64 para renderizar listas

**O problema (o pior do app):** `fetchTokensList()` (`Dashboard.tsx:789`) faz `select('*')` em `admission_tokens` **sem limite**. A coluna `detalhes` (jsonb) guarda `pdf_template_base64` — o contrato inteiro. Abrir Colaboradores baixa **todos os PDFs de todos os contratos já emitidos** para desenhar uma lista de nomes. Cresce sem teto.

Mesmo padrão em `fetchModelos()` (`Dashboard.tsx:241`): baixa `conteudo` (template PDF em base64) de todos os modelos só para popular um `<select>`.

**Files:**
- Modify: `src/pages/private/Dashboard.tsx` — `fetchModelos` (~241) e `fetchTokensList` (~789)

- [ ] **Step 1: Descobrir quais campos de `admission_tokens` a UI realmente usa**

Run: `grep -n "tokensList" src/pages/private/Dashboard.tsx`
Expected: a definição, o `setTokensList`, e os `.map()` de render (~3541, ~4220). Abrir cada `.map` e anotar os campos lidos.

> Campos esperados: `id`, `token`, `status`, `criado_em`, e os de identificação do candidato. **`detalhes` só é necessário quando um token específico é selecionado** (`selectedTokenId`), não na listagem.

- [ ] **Step 2: Trocar o `select('*')` de `fetchTokensList` por colunas explícitas**

```tsx
  const fetchTokensList = async () => {
    // Colunas explícitas de propósito: `detalhes` (jsonb) carrega o
    // pdf_template_base64 do contrato. Com select('*') a listagem baixava
    // todos os PDFs de todos os tokens só para mostrar nomes.
    // O `detalhes` do token selecionado é buscado sob demanda (fetchTokenDetalhes).
    const { data, error } = await supabase
      .from('admission_tokens')
      .select('id, token, status, criado_em, candidato_nome, candidato_email, candidato_cargo, candidato_setor, colaborador_cpf')
      .order('criado_em', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Carregar tokens de admissao falhou:', error.message);
      return;
    }
    setTokensList(data || []);
  };
```

> **Atenção:** os nomes de coluna acima precisam ser confirmados contra o schema real antes de rodar. Verifique com:
> `grep -n "candidato_nome\|colaborador_cpf" supabase/*.sql | head`
> Se algum nome divergir, ajuste a lista — **não volte para `select('*')`**.

- [ ] **Step 3: Adicionar o fetch sob demanda do `detalhes`**

Logo após `fetchTokensList`, acrescentar:

```tsx
  /**
   * `detalhes` traz o pdf_template_base64 — pesado. Buscado só para o token
   * que o RH abriu, nunca para a lista inteira.
   */
  const fetchTokenDetalhes = async (tokenId: string) => {
    const { data, error } = await supabase
      .from('admission_tokens')
      .select('id, detalhes')
      .eq('id', tokenId)
      .single();

    if (error) {
      console.error('Carregar detalhes do token falhou:', error.message);
      return null;
    }
    return data?.detalhes ?? null;
  };
```

- [ ] **Step 4: Ligar o fetch sob demanda ao token selecionado**

Localizar onde `selectedTokenId` é consumido para ler `detalhes` (`grep -n "selectedTokenId" src/pages/private/Dashboard.tsx`) e substituir o acesso a `token.detalhes` vindo da lista por uma chamada a `fetchTokenDetalhes(selectedTokenId)` guardada em estado local.

> Se o `detalhes` não for lido em lugar nenhum a partir de `tokensList`, este passo é no-op — registre isso e siga.

- [ ] **Step 5: Trocar o `select('*')` de `fetchModelos`**

```tsx
  const fetchModelos = async () => {
    // Sem `conteudo`: é o template do contrato (texto grande ou PDF base64).
    // A listagem e o <select> só precisam de id/titulo/tipo.
    const { data, error } = await supabase
      .from('modelos_documentos')
      .select('id, titulo, tipo_arquivo, criado_em')
      .order('criado_em', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Carregar modelos falhou:', error.message);
      return;
    }
    setModelos(data || []);
  };
```

- [ ] **Step 6: Buscar o `conteudo` do modelo escolhido sob demanda**

Localizar onde o `conteudo` do modelo selecionado é usado (`grep -n "\.conteudo" src/pages/private/Dashboard.tsx`) e trocar a leitura direta por:

```tsx
  const fetchModeloConteudo = async (modeloId: string) => {
    const { data, error } = await supabase
      .from('modelos_documentos')
      .select('id, conteudo, tipo_arquivo')
      .eq('id', modeloId)
      .single();

    if (error) {
      console.error('Carregar conteudo do modelo falhou:', error.message);
      return null;
    }
    return data;
  };
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: saída vazia. Se acusar propriedade inexistente em `tokensList`/`modelos`, é sinal de que a UI usava um campo que você removeu do select — **acrescente o campo à lista**, não volte ao `*`.

- [ ] **Step 8: Verificação manual obrigatória**

Com o dev server e a aba Network abertos:
1. Abrir `/app/documentos` → conferir o tamanho da resposta de `modelos_documentos` (era centenas de kB, deve cair para poucos kB).
2. **Gerar um link de assinatura** ponta a ponta e confirmar que o contrato sai preenchido — este é o fluxo que o `conteudo` alimenta.
3. Abrir `/app/colaboradores` → conferir a resposta de `admission_tokens`.

> Se a geração de contrato quebrar, o `fetchModeloConteudo` não foi ligado corretamente. Não commite.

- [ ] **Step 9: Commit**

```bash
git add src/pages/private/Dashboard.tsx
git commit -m "perf: para de baixar PDFs base64 em listagens (tokens e modelos)"
```

---

### Task 5: Colunas explícitas em `documentos_assinados` e `colaboradores`

`documentos_assinados` guarda `assinatura_desenhada` e `assinatura_representante` (imagens em base64). É lida em `fetchDocsHistorico` (`Dashboard.tsx:198`, limit 30) e em `fetchSelectedColabDocuments` (`Dashboard.tsx:746`, **sem limite**, disparada toda vez que um drawer abre).

`fetchColaboradoresList` (`Dashboard.tsx:1541`) faz `select('*')` em `colaboradores`, trazendo `ficha_admissao` (o formulário inteiro em jsonb) e `documentos_anexos` — nenhum dos dois usado na listagem.

**Files:**
- Modify: `src/pages/private/Dashboard.tsx` — `fetchDocsHistorico` (~198), `fetchSelectedColabDocuments` (~746), `fetchColaboradoresList` (~1541)

- [ ] **Step 1: Levantar os campos de `colaboradores` usados fora do drawer**

Run: `grep -n "col\.\|c\.ficha_admissao\|\.documentos_anexos" src/pages/private/Dashboard.tsx | head -60`

Anotar a lista. O drawer (linhas ~6007-7181) é quem precisa de `ficha_admissao`/`documentos_anexos` — ele já busca dados próprios ao abrir.

- [ ] **Step 2: Trocar o select de `fetchDocsHistorico`**

```tsx
      // Sem as colunas de assinatura (base64 de imagem): o histórico só mostra
      // nome, data e status.
      .select('id, documento_id, nome_colaborador, colaborador_cpf, assinado_em, status, url_arquivo')
      .order('assinado_em', { ascending: false })
      .limit(30);
```

- [ ] **Step 3: Trocar o select de `fetchSelectedColabDocuments` e pôr limite**

```tsx
      .select('id, documento_id, nome_colaborador, colaborador_cpf, assinado_em, status, url_arquivo')
      .eq('colaborador_cpf', cpf)
      .order('assinado_em', { ascending: false })
      .limit(50);
```

> O PDF é aberto pela `url_arquivo` (signed URL do Storage), não pelo base64 — por isso remover as colunas de assinatura não quebra o botão de visualizar.

- [ ] **Step 4: Trocar o select de `colaboradores` em `fetchColaboradoresList`**

Substituir apenas a query de `colaboradores` dentro do `Promise.all` (as outras 6 ficam como estão nesta tarefa):

```tsx
        supabase
          .from('colaboradores')
          // Sem ficha_admissao nem documentos_anexos (jsonb grandes): a listagem
          // não os usa. O drawer busca o registro completo ao abrir.
          .select('id, nome, cpf, rg, cargo, setor, salario, status, data_admissao, data_nascimento, data_aniversario, genero, matricula, data_aso_vencimento, data_ferias_vencimento, ferias_inicio, ferias_dias, day_off_aniversario_ano, vt_opta, vt_percentual, tipo_desligamento, foto_url')
          .order('nome', { ascending: true }),
```

> Confirme cada nome de coluna contra o schema antes de rodar:
> `grep -n "add column\|^  [a-z_]* " supabase/supabase_setup.sql supabase/sprint2*.sql | head -40`

- [ ] **Step 5: Garantir que o drawer busca o registro completo**

Run: `grep -n "activeColaboradorForDrawer" src/pages/private/Dashboard.tsx | head -20`

Se o drawer lê `ficha_admissao`/`documentos_anexos` direto do objeto vindo da lista, acrescentar um fetch no effect que abre o drawer (~762):

```tsx
      const { data: completo } = await supabase
        .from('colaboradores')
        .select('id, ficha_admissao, documentos_anexos')
        .eq('id', activeColaboradorForDrawer.id)
        .single();
      if (completo) setDrawerDadosCompletos(completo);
```

…e ler esses dois campos de `drawerDadosCompletos` no JSX do drawer.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: saída vazia.

- [ ] **Step 7: Verificação manual obrigatória**

1. `/app/colaboradores` → abrir o drawer de alguém com ficha de admissão preenchida. Todas as abas do dossiê devem mostrar os dados.
2. Aba "Contratos Assinados" do drawer → botão de visualizar deve abrir o PDF.
3. `/app/documentos` → aba histórico deve listar normalmente.

- [ ] **Step 8: Commit**

```bash
git add src/pages/private/Dashboard.tsx
git commit -m "perf: colunas explicitas em documentos_assinados e colaboradores"
```

---

### Task 6: Teto nas tabelas de crescimento ilimitado

Cinco queries varrem tabelas que crescem para sempre, sem `.limit()` nem recorte de data. Em um ou dois anos de uso, cada uma trava a sua tela.

**Files:**
- Modify: `src/pages/private/Dashboard.tsx:1208-1211` (`logs_auditoria`), `:2111` (`ocorrencias_jornada`)
- Modify: `src/components/feedback/FeedbackManager.tsx:109-114`
- Modify: `src/components/ponto/PontoManager.tsx:100-103`
- Modify: `src/components/risco/RiscoManager.tsx:210-212`

- [ ] **Step 1: `logs_auditoria` — limitar o export de CSV**

Em `Dashboard.tsx:1208`, acrescentar limite e recorte:

```tsx
      .select('id, acao, tabela_afetada, usuario_email, criado_em, ip, user_agent')
      .order('criado_em', { ascending: false })
      .limit(5000);
```

> 5.000 linhas cobrem com folga um CSV útil. Se o RH precisar do histórico completo, isso vira export server-side — fora do escopo desta fase.

- [ ] **Step 2: `ocorrencias_jornada` no analytics — recortar por data**

Em `Dashboard.tsx:2111`:

```tsx
      .select('*, colaboradores(nome, setor)')
      .gte('data_ocorrencia', new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10))
      .order('data_ocorrencia', { ascending: false })
      .limit(2000);
```

> Confirme o nome da coluna de data: `grep -n "ocorrencias_jornada" -A 12 supabase/supabase_setup.sql | grep data`

- [ ] **Step 3: `FeedbackManager` — limitar as quatro tabelas públicas**

Em `FeedbackManager.tsx:109-114`, acrescentar `.order(...).limit(500)` a cada uma das quatro queries (`pesquisas_satisfacao`, `ouvidoria_manifestacoes`, `pulse_respostas`, `pulse_alertas`). São alimentadas por formulários públicos — o RH não controla o volume.

- [ ] **Step 4: `PontoManager` — limitar as batidas da competência**

Em `PontoManager.tsx:100`, acrescentar `.limit(5000)`. Uma competência = colaboradores × dias × 4 batidas; hoje tudo é renderizado sem paginação.

- [ ] **Step 5: `RiscoManager` — recortar pelo período que o cálculo usa**

`RiscoManager.tsx:210-212` baixa `ocorrencias_jornada`, `avaliacoes_desempenho` e `promocoes` inteiras, mas o cálculo só usa `JANELA_DIAS` (90 dias). Aplicar o mesmo recorte na query:

```tsx
  const desde = new Date(Date.now() - JANELA_DIAS * 86400000).toISOString().slice(0, 10);
```

…e acrescentar `.gte('<coluna_de_data>', desde)` a cada uma das três, usando a coluna de data correspondente de cada tabela.

- [ ] **Step 6: Type-check e lint**

```bash
npx tsc --noEmit -p tsconfig.app.json
npm run lint
```
Expected: type-check vazio; lint com os mesmos 2 avisos de antes.

- [ ] **Step 7: Verificação manual obrigatória**

Abrir `/app/feedback`, `/app/ponto`, `/app/riscos` e `/app/analytics`. Cada tela deve mostrar os mesmos dados de antes (o volume atual está muito abaixo dos tetos). Exportar o CSV de auditoria e conferir que baixa.

- [ ] **Step 8: Commit**

```bash
git add src/pages/private/Dashboard.tsx src/components/feedback/FeedbackManager.tsx src/components/ponto/PontoManager.tsx src/components/risco/RiscoManager.tsx
git commit -m "perf: teto e recorte de data nas tabelas de crescimento ilimitado"
```

---

### Task 7: Silenciar e debouncar o Realtime

**O problema:** o canal em `Dashboard.tsx:1466-1510` escuta `event: '*'` em três tabelas. Cada evento chama `fetchDashboardKpis()` (7 queries) e, em `avaliacoes`, também `fetchColaboradoresList()` (8 queries). **Sem debounce:** um update em lote de N linhas dispara N×15 queries. E as linhas 1474/1483/1491/1499 fazem `console.log` do payload completo — dados de colaboradores no console do navegador em produção.

**Files:**
- Modify: `src/pages/private/Dashboard.tsx:1466-1510`

**Interfaces:**
- Consumes: `debounce` de `src/utils/debounce.ts` (Task 1).

- [ ] **Step 1: Importar o debounce**

Junto aos demais imports do topo:

```tsx
import { debounce } from '../../utils/debounce';
```

- [ ] **Step 2: Remover os quatro `console.log` do payload**

Run: `grep -n "console.log" src/pages/private/Dashboard.tsx`
Apagar as linhas que logam payload de realtime (~1474, 1483, 1491, 1499). Erros continuam com `console.error` — só os logs de payload saem.

- [ ] **Step 3: Debouncar os refetches do canal**

Antes do `useEffect` do canal, criar os refetches debouncados:

```tsx
  // Um update em lote emite um evento por linha. Sem debounce, 40 linhas
  // alteradas = 600 queries. 400 ms agrupa a rajada num refetch só.
  const refetchKpisDebounced = useMemo(
    () => debounce(() => { fetchDashboardKpis(); }, 400),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const refetchColabsDebounced = useMemo(
    () => debounce(() => { fetchColaboradoresList(); }, 400),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
```

Dentro dos handlers do canal, trocar `fetchDashboardKpis()` por `refetchKpisDebounced()` e `fetchColaboradoresList()` por `refetchColabsDebounced()`.

- [ ] **Step 4: Cancelar os pendentes no cleanup**

No `return` do `useEffect` do canal, junto do `removeChannel`:

```tsx
    return () => {
      refetchKpisDebounced.cancel();
      refetchColabsDebounced.cancel();
      supabase.removeChannel(canal);
    };
```

> O `cancel()` existe exatamente para isto: sem ele, um refetch pendente dispara depois do unmount e escreve estado em componente morto.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: saída vazia.

- [ ] **Step 6: Verificação manual obrigatória**

Com o app aberto em **duas abas** logadas como RH: na aba A, editar um colaborador. Na aba B, com o Network aberto, confirmar que os KPIs se atualizam e que houve **um** ciclo de refetch, não vários. Confirmar também que o console não imprime mais os dados do colaborador.

- [ ] **Step 7: Commit**

```bash
git add src/pages/private/Dashboard.tsx
git commit -m "perf: debounce no realtime e remove console.log de payload"
```

---

### Task 8: Debounce na busca do Command Palette

`CommandPalette.tsx:54-76` dispara um fetch em `colaboradores` a cada tecla, sem debounce. Digitar "Fernanda" = 7 requisições. O flag `active` evita o setState órfão, mas não a rajada.

**Files:**
- Modify: `src/components/common/CommandPalette.tsx:54-76`

**Interfaces:**
- Consumes: `debounce` de `src/utils/debounce.ts` (Task 1).

- [ ] **Step 1: Ler o effect atual**

Run: `sed -n '50,80p' src/components/common/CommandPalette.tsx`

- [ ] **Step 2: Introduzir um termo debouncado**

Importar o helper e acrescentar o estado do termo atrasado:

```tsx
import { useState, useEffect, useMemo } from 'react';
import { debounce } from '../../utils/debounce';
```

```tsx
  // `query` atualiza a cada tecla (o input precisa ser responsivo);
  // `queryBuscada` só acompanha depois de 250 ms parado — é ela que vai à rede.
  const [queryBuscada, setQueryBuscada] = useState('');

  const atualizarQueryBuscada = useMemo(() => debounce(setQueryBuscada, 250), []);

  useEffect(() => {
    atualizarQueryBuscada(query);
    return () => atualizarQueryBuscada.cancel();
  }, [query, atualizarQueryBuscada]);
```

- [ ] **Step 3: Trocar a dependência do effect de fetch**

No `useEffect` que faz o fetch (~54), trocar `query` por `queryBuscada` — tanto no corpo da query quanto no array de dependências. **Manter** o flag `active` do cleanup existente.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: saída vazia.

- [ ] **Step 5: Verificação manual obrigatória**

Abrir o Command Palette, Network filtrando por `colaboradores`, e digitar "Fernanda" em velocidade normal.
Expected: **1 requisição**, não 7. Os resultados continuam aparecendo e o input não trava.

- [ ] **Step 6: Commit**

```bash
git add src/components/common/CommandPalette.tsx
git commit -m "perf: debounce na busca do command palette"
```

---

### Task 9: Medir o resultado e registrar

Fechar a fase com número, não com sensação.

**Files:**
- Create: `docs/superpowers/plans/2026-07-27-refatoracao-fase1-resultado.md`

- [ ] **Step 1: Rodar a suíte e o build**

```bash
npm test
npm run build
```
Expected: testes verdes; build sem erro.

- [ ] **Step 2: Registrar os números**

Criar o arquivo de resultado com: tamanho dos chunks antes (index 626 kB / 170 kB gzip) e depois; nº de requisições ao abrir `/app/dashboard` antes (16 a `colaboradores`) e depois; tamanho da resposta de `modelos_documentos` e `admission_tokens` antes e depois.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-07-27-refatoracao-fase1-resultado.md
git commit -m "docs: resultado medido da fase 1 de refatoracao"
```

---

## Fora do escopo desta fase — planos seguintes

Estes são subsistemas independentes. Cada um merece o seu próprio plano, escrito só quando a fase anterior estiver medida e commitada. Tentar tudo junto torna impossível atribuir uma regressão.

**Fase 2 — Camada de dados compartilhada.** Hoje `colaboradores` é buscada em 7 arquivos diferentes, `beneficios` em 2, `ocorrencias_jornada` em 3. Abrir `/app/beneficios` busca as mesmas 3 tabelas duas vezes (Dashboard e BenefitsManager), em dois estados paralelos, sem cache. A saída é um conjunto de hooks (`useColaboradores`, `useBeneficios`) com cache e cleanup — ou TanStack Query, se aceitarmos a dependência. Também resolve os ~12 effects de fetch que hoje não têm guarda de cancelamento.

**Fase 3 — Decomposição do `Dashboard.tsx`.** 7.959 linhas, 154 `useState`. Os alvos, medidos, em ordem de tamanho: drawer do dossiê (1.175 linhas, `:6007-7181`), modal de avaliação (590, `:7183-7772`), colaboradores (729), documentos (602), férias/ASO (425), dashboard (393), calendário da agenda (364), avaliações (310), modal de advertência (183). O bloqueio é o estado compartilhado — `colaboradoresList` tem 29 referências espalhadas por 9 módulos; ele precisa virar contexto **antes** de qualquer extração. Fase 2 é pré-requisito.

**Fase 4 — Render e UI.** Zero `React.memo` no projeto e nenhuma lista paginada: digitar na busca re-renderiza a árvore inteira, incluindo os painéis recharts montados. Também aqui: `RiscoManager.tsx:236` é O(N×M) no corpo de um `useMemo`, e há 12 usos de `window.confirm` e 2 de `alert()` como UI — apesar de `Dashboard.tsx:5990` comentar que o toast global "substitui os alert() nativos".

**Fase 5 — Segurança (requer decisão de negócio, não é refactor).** As ~25 policies com `using (true)` para `authenticated` são risco **aceito e documentado** (C-3 em `sprint10`): qualquer conta logada lê salários e dados de saúde. Não mexer sem alinhar com o Thiago. Idem o e-mail superusuário hardcoded.
