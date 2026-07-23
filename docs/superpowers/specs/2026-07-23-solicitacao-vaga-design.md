# Design — Solicitação de Vaga (aba Vagas, parte A)

**Data:** 2026-07-23 · **Branch:** feature/rh-modulos · **Status:** aprovado pelo usuário

## Contexto

Aba "Vagas" tem dois subsistemas independentes; este spec cobre só o **A — Solicitação de Vaga**. O **B — Teste comportamental** (link por candidato, respostas, perfil) fica para spec/plano próprio depois.

Fluxo A: coordenador de setor descreve a vaga necessária → RH visualiza no painel → RH cadastra a vaga num site externo (fora do sistema; manual) e registra o link. Modelo da ouvidoria (`sprint14_pesquisa_ouvidoria.sql`): página pública sem login + RLS anon insert + leitura/edição só RH.

## Decisões (aprovadas)

1. Coordenador acessa por **link público, sem login**; identifica-se com nome + setor no form.
2. Integração com o site externo é **manual** (RH cadastra lá e cola o link de volta). Sem API.
3. Campos e workflow de status conforme abaixo.

## Bloco 1 — Banco (`supabase/sprint30_solicitacoes_vaga.sql`, manual no SQL Editor)

```sql
create table if not exists public.solicitacoes_vaga (
  id uuid primary key default gen_random_uuid(),
  coordenador_nome text not null,
  setor text not null,
  titulo_cargo text not null,
  quantidade integer not null default 1,
  funcoes text not null,            -- atividades/funções da vaga
  requisitos text,                  -- necessidades/requisitos
  justificativa text,               -- por que a vaga é necessária
  tipo_contratacao text,            -- CLT | PJ | Estágio | Temporário | A definir
  urgencia text not null default 'Média' check (urgencia in ('Baixa','Média','Alta')),
  status text not null default 'nova'
    check (status in ('nova','em_analise','publicada','preenchida','arquivada')),
  link_externo text,                -- URL da vaga no site externo (preenchido pelo RH)
  resposta_interna text,            -- anotação do RH
  atualizado_em timestamptz not null default timezone('utc', now()),
  criado_em timestamptz not null default timezone('utc', now())
);
```
Índices: status, criado_em desc. Trigger `trg_fn_touch_atualizado_em` (reaproveita a da sprint14) em before update.

RLS (espelha ouvidoria):
- **anon INSERT** com `with check`: só solicitação crua — `(status is null or status='nova') and link_externo is null and resposta_interna is null`. Bloqueia envio pré-classificado.
- **authenticated INSERT** idem (RH pode lançar manual).
- **SELECT / UPDATE / DELETE** só RH: `get_user_role()='coordenadora_rh' or email='ito.thiagosilva@gmail.com'`.

## Bloco 2 — Página pública `/solicitar-vaga`

Nova página `src/pages/public/SolicitarVaga.tsx` no padrão visual das públicas (ex.: PesquisaSatisfacao/Ouvidoria). Form com: coordenador_nome, setor (select dos setores conhecidos + "Outro"), titulo_cargo, quantidade, funcoes (textarea, obrigatório), requisitos, justificativa, tipo_contratacao (select), urgencia (select). Envio via insert anon direto na tabela (RLS garante a forma crua). Validação mínima no cliente (nome, setor, título, funções obrigatórios). Tela de sucesso ("Solicitação enviada ao RH").

## Bloco 3 — Painel RH: aba "Vagas"

Novo item "Vagas" na sidebar do Dashboard (área RH). Lista as `solicitacoes_vaga` (cards ou tabela) com filtro por status e badge de "novas" (status='nova'). Cada solicitação abre detalhe com: dados enviados (read-only), seletor de status, campo `link_externo`, `resposta_interna`, botão salvar (update + `logAuditoria('SOLICITACAO_VAGA_ATUALIZADA', ...)`). Ordena por urgência e data.

## Bloco 4 — Wiring

- Rota pública `/solicitar-vaga` em `src/App.tsx` (sem auth).
- Item de sidebar "Vagas" + render da aba no `Dashboard.tsx` (padrão dos outros módulos: `activePath === '/app/vagas'`).
- Carrega a lista em `fetchColaboradoresList`/fetch dedicado.

## Fora de escopo

Teste comportamental (subsistema B); candidatura de candidato; integração/API com o site externo; notificação por e-mail ao RH.

## Erros e verificação

Falhas via `notify('Erro …: ' + err.message)`; insert/update checam `error`. Verificação: `npx tsc --noEmit -p tsconfig.app.json` (exit 0) + fluxo manual: enviar solicitação pública → aparece no painel RH como "nova" → RH muda status, cola link, salva → persiste.
