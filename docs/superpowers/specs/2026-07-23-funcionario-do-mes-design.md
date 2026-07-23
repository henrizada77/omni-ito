# Design — Funcionário do Mês

**Data:** 2026-07-23 · **Branch:** feature/rh-modulos · **Status:** aprovado pelo usuário

## Contexto

Votação mensal de "Funcionário do Mês". Voto **identificado** (RH vê quem votou e em quem). Página pública sem login; o votante escolhe o próprio nome na lista de colaboradores ativos e vota num colega. O RH abre/fecha a rodada, acompanha quem falta votar e a apuração, e no fechamento gera uma **arte de pódio** (Top 3) com foto ou monograma, baixável em PNG.

Segurança espelha o teste DISC (`sprint31`): a página pública nunca lê `colaboradores`/`votos` direto — usa RPCs `SECURITY DEFINER`. Foto do colaborador vem de `colaboradores.documentos_anexos.foto` (bucket privado `documentos-envios`, URL assinada; só o RH, autenticado, resolve — a arte é montada no painel RH).

## Decisões (aprovadas)

1. **Voto:** página pública; votante seleciona o próprio nome (colaboradores ativos) e um colega. 1 voto por pessoa; não vota em si mesmo.
2. **Elegíveis:** todos os colaboradores com `status <> 'desligado'` (votam e podem ser votados). "Quem falta" = ativos ∖ votantes.
3. **Rodada:** RH abre com mês de referência + `data_fim`; só uma aberta por vez; fecha manual (ou depois da data). Fechar calcula o Top 3.
4. **Arte:** SVG de pódio (🥇🥈🥉) com foto (base64 inline) ou monograma de iniciais, nome, setor, nº de votos e o mês; botão **Baixar PNG** (rasteriza no navegador, sem lib nova).
5. **Local no RH:** novo item de sidebar "Funcionário do Mês" (`/app/funcionario-mes`), componente próprio lazy.

## Bloco 1 — Banco (`supabase/sprint32_funcionario_mes.sql`, manual no SQL Editor)

```sql
create table if not exists public.funcionario_mes_rodadas (
  id uuid primary key default gen_random_uuid(),
  competencia text not null,            -- 'YYYY-MM'
  titulo text,
  data_fim date not null,
  status text not null default 'aberta' check (status in ('aberta','fechada')),
  top3 jsonb,                           -- [{ colaborador_id, nome, setor, votos }] (no fechamento)
  criado_por_email text,
  fechada_em timestamptz,
  criado_em timestamptz not null default timezone('utc', now())
);

create table if not exists public.funcionario_mes_votos (
  id uuid primary key default gen_random_uuid(),
  rodada_id uuid not null references public.funcionario_mes_rodadas(id) on delete cascade,
  votante_id uuid not null,             -- colaboradores.id (quem votou)
  votado_id uuid not null,              -- colaboradores.id (quem recebeu)
  criado_em timestamptz not null default timezone('utc', now()),
  constraint uq_voto_por_votante unique (rodada_id, votante_id)
);
```
Índices: `funcionario_mes_rodadas(status)`; `funcionario_mes_votos(rodada_id)`; `funcionario_mes_votos(votado_id)`.

**Índice parcial para garantir 1 rodada aberta:** `create unique index if not exists uq_rodada_aberta on public.funcionario_mes_rodadas ((status)) where status = 'aberta';`

**RLS:** ambas as tabelas **sem acesso anônimo direto**. Só RH (predicado padrão `public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com'`) para SELECT/INSERT/UPDATE/DELETE. O anônimo age só pelas RPCs.

**RPCs `SECURITY DEFINER` (`set search_path = public`, `grant execute to anon, authenticated`):**

```sql
-- Rodada aberta (ou nenhuma). Uma linha ou zero.
create or replace function public.get_funcionario_mes_aberto()
returns table (id uuid, competencia text, titulo text, data_fim date)
language sql security definer set search_path = public as $$
  select id, competencia, titulo, data_fim
  from public.funcionario_mes_rodadas
  where status = 'aberta'
  order by criado_em desc
  limit 1;
$$;

-- Colaboradores elegíveis (ativos): só id, nome, setor.
create or replace function public.listar_colaboradores_ativos_votacao()
returns table (id uuid, nome text, setor text)
language sql security definer set search_path = public as $$
  select id, nome, setor
  from public.colaboradores
  where coalesce(status, '') <> 'desligado'
  order by nome;
$$;

-- Registra voto. Retorna 'ok' | 'ja_votou' | 'invalido' | 'fechada'.
create or replace function public.registrar_voto_funcionario_mes(
  p_rodada_id uuid, p_votante_id uuid, p_votado_id uuid
) returns text
language plpgsql security definer set search_path = public as $$
declare v_aberta boolean; v_votante_ok boolean; v_votado_ok boolean;
begin
  if p_votante_id = p_votado_id then return 'invalido'; end if;

  select (status = 'aberta') into v_aberta
    from public.funcionario_mes_rodadas where id = p_rodada_id;
  if v_aberta is not true then return 'fechada'; end if;

  select coalesce(status,'') <> 'desligado' into v_votante_ok
    from public.colaboradores where id = p_votante_id;
  select coalesce(status,'') <> 'desligado' into v_votado_ok
    from public.colaboradores where id = p_votado_id;
  if v_votante_ok is not true or v_votado_ok is not true then return 'invalido'; end if;

  begin
    insert into public.funcionario_mes_votos (rodada_id, votante_id, votado_id)
    values (p_rodada_id, p_votante_id, p_votado_id);
  exception when unique_violation then
    return 'ja_votou';
  end;
  return 'ok';
end;
$$;
```
`notify pgrst, 'reload schema';` ao final. Idempotente.

## Bloco 2 — Página pública `/funcionario-do-mes`

`src/pages/public/FuncionarioMes.tsx` (padrão visual das públicas; props `{ theme, setTheme }`).
1. No mount: `rpc('get_funcionario_mes_aberto')` e `rpc('listar_colaboradores_ativos_votacao')`.
2. Sem rodada aberta → tela "A votação não está aberta no momento."
3. Aberta: dois selects — "Quem é você?" (colaboradores) e "Em quem você vota?" (colaboradores, excluindo o votante selecionado). Mostra o mês/prazo.
4. Enviar → `rpc('registrar_voto_funcionario_mes', { p_rodada_id, p_votante_id, p_votado_id })`. Trata retorno: `ok`→tela sucesso; `ja_votou`→"Você já votou nesta rodada."; `fechada`→"A votação foi encerrada."; `invalido`→erro genérico.
5. Erros de rede: `setError`, nunca engole.

## Bloco 3 — Painel RH `src/components/funcionariomes/FuncionarioMesManager.tsx`

Componente lazy (padrão `RiscoManager`), props `{ theme, userId, userEmail }`. Carrega: rodada aberta (ou última), votos da rodada, colaboradores ativos (select autenticado direto).
- **Sem rodada aberta:** form "Abrir rodada" (competência default = mês corrente 'YYYY-MM', `data_fim`) → insert (`criado_por_email = userEmail`) + `logAuditoria('FUNCIONARIO_MES_RODADA_ABERTA', ...)`.
- **Rodada aberta:**
  - **Progresso:** total ativos, nº que votaram, % ; listas "Já votaram" e "Faltam votar" (ativos ∖ votantes, por `votante_id`).
  - **Apuração parcial:** contagem por `votado_id` (join com nome/setor), ordenada desc.
  - **Fechar rodada:** calcula Top 3 (ordena por votos desc; empate → ordem alfabética do nome), grava `top3` + `status='fechada'` + `fechada_em`, `logAuditoria('FUNCIONARIO_MES_RODADA_FECHADA', { top3 })`.
- **Rodada fechada:** mostra `<PodioArte>` com o `top3` e botão Baixar PNG. Botão "Abrir nova rodada".

## Bloco 4 — Arte do pódio `src/components/funcionariomes/PodioArte.tsx`

Props `{ top3: {colaborador_id,nome,setor,votos}[]; competencia: string; theme }`.
- Antes de renderizar, para cada colaborador do top3 resolve a foto: se houver `documentos_anexos.foto`, `supabase.storage.from('documentos-envios').createSignedUrl(path, 60)` → `fetch` → blob → `FileReader` dataURL; guarda em estado. Fallback: monograma (iniciais + cor por posição). Faz isso no `FuncionarioMesManager` (que tem os colaboradores) e passa as fotos já em dataURL como prop, OU o `PodioArte` recebe `colaboradores` e resolve. **Decisão:** `FuncionarioMesManager` resolve as 3 fotos (dataURL|null) e passa `fotos: (string|null)[]` ao `PodioArte` — mantém o SVG puro e o download confiável.
- Renderiza um **SVG** (viewBox fixo ~1080×1080, formato "post"): fundo, título "Funcionário do Mês · {mês por extenso}", pódio com 3 blocos (2º à esquerda, 1º no centro maior, 3º à direita), cada um com círculo de foto (`<image href=dataURL>`) ou monograma, medalha, nome, setor e "{votos} votos".
- **Baixar PNG:** serializa o SVG (`XMLSerializer`) → `Blob` → `URL.createObjectURL` → `Image` → `canvas` (1080×1080) → `canvas.toBlob` → download `funcionario-do-mes-{competencia}.png`. Como as imagens estão inline (dataURL), o canvas não é "tainted".

## Bloco 5 — Wiring

- Rota pública `/funcionario-do-mes` em `src/App.tsx`.
- Item de sidebar "Funcionário do Mês" (`/app/funcionario-mes`, `allowedRoles: ['coordenadora_rh']`) em `App.tsx` (`APP_ROUTES`) e no `sidebarLinks` do Dashboard (ícone `Trophy`/`Award`).
- Lazy import + render `activePath === '/app/funcionario-mes' && hasFullAccess` → `<FuncionarioMesManager theme userId userEmail />`.

## Erros e verificação

`notify`/`setError`; toda RPC/insert/update checa retorno/`error`. Verificação: `npx tsc --noEmit -p tsconfig.app.json` (exit 0) + fluxo manual: abrir rodada → votar por 2+ colaboradores na página pública → RH vê quem votou/quem falta + parcial → fechar → pódio Top 3 + baixar PNG; re-votar mostra "já votou"; sem rodada aberta a página pública informa que está fechada.

## Fora de escopo

Histórico/ranking anual; múltiplas categorias de prêmio; envio automático da arte; desempate além de votos→alfabética; edição de voto após enviado.
