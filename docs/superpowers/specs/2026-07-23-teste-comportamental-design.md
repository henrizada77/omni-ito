# Design — Teste Comportamental (DISC) — aba Vagas, parte B

**Data:** 2026-07-23 · **Branch:** feature/rh-modulos · **Status:** aprovado pelo usuário

## Contexto

Parte B da aba Vagas. A parte A (Solicitação de Vaga) já está implementada (`sprint30`). Aqui o RH gera um teste comportamental **DISC** por candidato, envia o link manualmente, e vê o resultado (2 gráficos + perfil dominante) numa sub-aba dentro de Vagas.

Modelo de segurança: espelha o fluxo de admissão (`sprint8`), que **não** expõe a tabela ao anônimo — usa RPCs `SECURITY DEFINER` (`get_admission_token_by_token`, `mark_admission_token_viewed`) que recebem o token e devolvem/alteram só aquela linha. O teste faz o mesmo.

## Decisões (aprovadas)

1. **Modelo:** DISC clássico "mais/menos" — 2 gráficos (sob pressão / natural) + fator dominante.
2. **Vínculo:** um teste por candidato, standalone, com token único (link revogável). Campo `vaga_relacionada` é texto livre opcional (não acopla à `solicitacoes_vaga`).
3. **Formato:** 24 blocos, cada um com 4 adjetivos (um por fator D/I/S/C); em cada bloco o candidato marca 1 "MAIS" e 1 "MENOS".
4. **Entrega:** manual. RH gera o teste, copia o link e repassa por fora (WhatsApp/e-mail). Sem envio automático de e-mail.
5. **Resultado:** sub-aba "Testes" dentro da aba Vagas (não uma aba nova na sidebar).
6. **Banco de perguntas:** fixo no código (`disc.ts`), não editável pela UI.

## Bloco 1 — Banco (`supabase/sprint31_testes_comportamentais.sql`, manual no SQL Editor)

```sql
create table if not exists public.testes_comportamentais (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  candidato_nome text not null,
  candidato_email text,
  vaga_relacionada text,              -- texto livre, opcional
  status text not null default 'pendente'
    check (status in ('pendente','respondido')),
  ativo boolean not null default true, -- false = link revogado
  respostas jsonb,                     -- [{ bloco:int, mais:'D'|'I'|'S'|'C', menos:'D'|'I'|'S'|'C' }]
  resultado jsonb,                     -- { pressao:{D,I,S,C}, natural:{D,I,S,C}, net:{D,I,S,C}, dominante:'D' }
  criado_por_email text,
  respondido_em timestamptz,
  criado_em timestamptz not null default timezone('utc', now())
);
```
Índices: `status`, `criado_em desc`, `token`.

**RLS:** tabela **sem acesso anônimo direto**. Só RH (padrão dos outros módulos sensíveis):
- SELECT/INSERT/UPDATE/DELETE `to authenticated` com `using`/`with check` = `public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com'`.
- Nenhuma policy para `anon`.

**RPCs `SECURITY DEFINER`** (rodam com dono da função, ignoram RLS; é o único caminho do anônimo):

```sql
-- Candidato carrega o teste pelo token. Devolve só campos públicos.
create or replace function public.get_teste_by_token(p_token text)
returns table (candidato_nome text, status text, ativo boolean, vaga_relacionada text)
language sql security definer set search_path = public as $$
  select candidato_nome, status, ativo, vaga_relacionada
  from public.testes_comportamentais
  where token = p_token;
$$;

-- Candidato envia respostas. Só grava se pendente e ativo; caso contrário no-op (retorna false).
create or replace function public.submit_teste_comportamental(
  p_token text, p_respostas jsonb, p_resultado jsonb
) returns boolean
language plpgsql security definer set search_path = public as $$
declare afetadas int;
begin
  update public.testes_comportamentais
     set respostas = p_respostas,
         resultado = p_resultado,
         status = 'respondido',
         respondido_em = timezone('utc', now())
   where token = p_token and status = 'pendente' and ativo = true;
  get diagnostics afetadas = row_count;
  return afetadas > 0;
end;
$$;

grant execute on function public.get_teste_by_token(text) to anon, authenticated;
grant execute on function public.submit_teste_comportamental(text, jsonb, jsonb) to anon, authenticated;
```
`notify pgrst, 'reload schema';` ao final. Idempotente (`create or replace`, `drop policy if exists`).

## Bloco 2 — Motor DISC (`src/utils/disc.ts`)

- `type Fator = 'D' | 'I' | 'S' | 'C'`.
- `interface BlocoDISC { adjetivos: { texto: string; fator: Fator }[] }` — sempre 4, um por fator.
- `BLOCOS: BlocoDISC[]` — 24 blocos, adjetivos em pt-BR (gerados na implementação; cada bloco cobre os 4 fatores).
- `interface RespostaBloco { bloco: number; mais: Fator; menos: Fator }`.
- `interface ResultadoDISC { pressao: Record<Fator, number>; natural: Record<Fator, number>; net: Record<Fator, number>; dominante: Fator }`.
- `calcularDISC(respostas: RespostaBloco[]): ResultadoDISC` — `pressao[f]` = nº de "MAIS" no fator f; `natural[f]` = nº de "MENOS" no fator f; `net[f] = pressao[f] - natural[f]`; `dominante` = fator com maior `net` (empate → ordem D>I>S>C).
- `DESCRICOES: Record<Fator, { titulo: string; texto: string }>` — descrição curta de cada perfil.

## Bloco 3 — Página do candidato `/teste-comportamental/:token`

Nova `src/pages/public/TesteComportamental.tsx` (padrão visual das públicas). Props `{ theme, setTheme }`. Fluxo:
1. Ao montar, chama `supabase.rpc('get_teste_by_token', { p_token })`.
2. Estados de tela: **carregando**; **inválido** (não achou / `ativo=false`); **já respondido** ("Este teste já foi enviado."); **questionário** (pendente + ativo).
3. Questionário: renderiza os 24 blocos; em cada bloco, dois grupos de escolha (MAIS / MENOS) com os 4 adjetivos. Regra: em um bloco, "mais" e "menos" não podem ser o mesmo adjetivo. Barra de progresso (respondidos/24).
4. Enviar (habilita só com os 24 completos): calcula `resultado = calcularDISC(respostas)` no cliente e chama `supabase.rpc('submit_teste_comportamental', { p_token, p_respostas, p_resultado })`. Se retornar `false` (já respondido/revogado no meio), mostra aviso. Sucesso → tela "Respostas enviadas".
5. Erros de rede: `setError(...)`, nunca engole.

## Bloco 4 — Sub-aba "Testes" no painel RH (`src/components/vagas/TestesPanel.tsx`)

Novo componente, renderizado pelo `VagasManager` quando a sub-aba ativa é "Testes". Props `{ theme, userId, userEmail }`.
- **Gerar teste:** form curto (nome obrigatório, e-mail e vaga opcionais) → gera `token` (ex.: `crypto.randomUUID()` sem hífens, ou timestamp+random) → `insert` autenticado em `testes_comportamentais` (`criado_por_email = userEmail`, `status='pendente'`) → copia o link `${origin}/teste-comportamental/${token}` pra área de transferência → `logAuditoria('TESTE_COMPORTAMENTAL_GERADO', ...)`.
- **Lista:** testes ordenados por `criado_em desc`, com nome, status (Pendente/Respondido), vaga, data. Ações por item: **Copiar link** (pendentes), **Revogar** (set `ativo=false`), **Ver resultado** (respondidos).
- **Ver resultado:** expande mostrando 2 gráficos de barras D/I/S/C (`pressao` e `natural`, lidos de `resultado`), o **fator dominante** (de `net`) com `DESCRICOES[dominante]`. Gráfico simples em CSS/SVG inline (sem recharts obrigatório; barras proporcionais bastam).

## Bloco 5 — Wiring

- `VagasManager` ganha um seletor de sub-aba no topo: **Solicitações** (conteúdo atual) | **Testes** (`<TestesPanel .../>`). Estado local `subAba`.
- Rota pública `/teste-comportamental/:token` em `src/App.tsx` (sem auth), passando `theme`/`setTheme`.
- O link público de "solicitar vaga" (parte A) permanece; o de teste é por-candidato (não há link público único de teste).

## Erros e verificação

Falhas via `notify`/`setError`; toda RPC/insert/update checa retorno/`error`. Verificação: `npx tsc --noEmit -p tsconfig.app.json` (exit 0) + fluxo manual: gerar teste (link copiado) → abrir link anônimo → responder 24 blocos → enviar → RH vê "Respondido" com 2 gráficos + dominante; revogar torna o link inválido; reabrir link respondido mostra "já enviado".

## Fora de escopo

Envio automático de e-mail; proctoring/anti-fraude/limite de tempo; edição do banco de perguntas pela UI; comparação/ranking entre candidatos; vínculo forte com `solicitacoes_vaga` (fica em texto livre).
