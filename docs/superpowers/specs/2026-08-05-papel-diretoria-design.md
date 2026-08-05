# Papel `diretoria` — acesso restrito à Voz do Time — design

**Data:** 2026-08-05 · **Sprint:** 41

## Problema

A diretoria (`diretoria@itoinstituto.com.br`) precisa acompanhar o clima do time sem
ver o resto do RH. O modelo de papéis atual não comporta isso: quem não é
`coordenadora_rh` é tratado como auditor de TI e cai em Analytics, que é a única
coisa que enxerga. Não existe estado intermediário entre "vê tudo" e "vê Analytics".

O pedido é um papel novo que abra **exatamente uma aba** — Voz do Time
(`/app/feedback`) — e nada mais.

## Decisões

### O papel mora em `perfis.cargo`, como os outros três

A constraint `check_cargo` passa a admitir `'diretoria'`. Nenhuma tabela nova,
nenhuma coluna nova: o sprint37 já estabeleceu que poder mora em `perfis.cargo` e
que revogar é um `UPDATE`. Um quarto valor mantém essa propriedade.

O nome do papel é `diretoria`, não `diretora`: descreve o cargo, não a pessoa que o
ocupa hoje, e casa com o e-mail da conta.

### Somente leitura, garantido pelo banco

A diretoria ganha `SELECT` nas quatro tabelas que a aba consome:

| Tabela | O que a aba mostra |
| --- | --- |
| `pulse_respostas` | humor semanal por setor |
| `pulse_alertas` | 3×😞 consecutivos no mesmo device |
| `pesquisas_satisfacao` | nota 1-5, categoria, comentário |
| `ouvidoria_manifestacoes` | manifestação anônima, status, resposta interna |

As policies de `UPDATE` e `DELETE` dessas tabelas **não são tocadas**. É essa
omissão deliberada que faz "somente leitura" ser uma garantia e não uma promessa da
interface: se um botão de excluir escapar para a tela um dia, o Postgres recusa.

O tratamento dos casos — responder ouvidoria, mudar status, marcar alerta como visto
— continua sendo do RH. A diretoria acompanha; não opera.

### `pode_ler_voz_do_time()`, e o e-mail literal fica

As quatro policies de leitura hoje dizem
`get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = '<gmail do TI>'`.
Elas passam a chamar uma função nova:

```sql
create or replace function public.pode_ler_voz_do_time()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select cargo in ('coordenadora_rh', 'diretoria', 'superadmin')
     from public.perfis where id = auth.uid()),
    false);
$$;
```

**O e-mail literal continua na policy, ao lado da função.** O sprint37 promoveu essa
conta a `superadmin` e pediu que os literais saíssem das policies — mas o script traz
um "⚠️ EDITE ESTA LINHA ANTES DE RODAR" no meio, e não há como saber daqui se ele
rodou em produção. Se não rodou, aquele e-mail ainda é `cargo = 'ti'`, e removê-lo da
policy trancaria o TI para fora da Voz do Time no mesmo deploy que abre a aba para a
diretoria. Manter é a escolha reversível; limpar isso é trabalho do sprint37,
não deste.

### Front: um derivado, não um segundo `hasFullAccess`

`Dashboard.tsx` ganha **um** booleano novo:

```ts
const podeVerVozDoTime = hasFullAccess || role === 'diretoria';
```

usado em três lugares — o guarda do badge de alertas na sidebar, a montagem da lista
de links, e o render do `FeedbackManager`. Os outros dezesseis `hasFullAccess` do
arquivo ficam exatamente como estão.

Isso não é economia de diff, é o mecanismo de isolamento. Todos os `useEffect` de
carga do Dashboard — colaboradores, folha, riscos, advertências, endomarketing — estão
presos a `hasFullAccess`. Deixando-os intocados, a sessão da diretoria não dispara
nenhuma dessas consultas. O `CopilotWidget` já está atrás de `hasFullAccess` e sai
pelo mesmo motivo, sem linha nova.

A sidebar da diretoria tem **um** link: Voz do Time. Sem Analytics — o `ti` continua
sendo o único papel não-administrativo que a enxerga.

### Rota inicial vira mapa

`/app` hoje decide por `if/else`: RH vai para o dashboard, todo o resto para Analytics.
Com quatro papéis isso deixa de caber num ternário e vira

```ts
const ROTA_INICIAL_POR_PAPEL: Record<Role, string> = {
  coordenadora_rh: '/app/dashboard',
  diretoria:       '/app/feedback',
  ti:              '/app/analytics',
};
```

O bypass por e-mail do TI continua indo para o dashboard, como hoje.

### `somenteLeitura` no FeedbackManager

Prop opcional, `false` por default, que esconde o formulário de resposta interna da
ouvidoria, os botões de status e os de excluir. A interface para de oferecer o que o
RLS vai negar — sem isso a diretoria clicaria em botões que só devolvem erro.

As três sub-abas (Pulse, Pesquisa, Ouvidoria) aparecem inteiras. A ouvidoria é anônima
por construção — sem IP, sem user agent, sem `user_id` — então ler o relato completo
não identifica quem escreveu.

### A paleta Ctrl+K precisa conhecer papéis

`CommandPalette` hoje só distingue autenticado de anônimo. Isso significa que, sem
mexer nela, a diretoria abriria a paleta e veria atalhos para Dashboard, **Folha de
Pagamento**, Vagas e Organograma, além de poder buscar colaboradores por nome e
receber nome, cargo e setor de volta. Os cliques dariam 403, mas os nomes já teriam
aparecido na tela — e aí "acesso apenas à Voz do Time" seria falso.

A paleta passa a receber `role` e a filtrar as rotas privadas por papel. A busca de
colaboradores só dispara para quem tem acesso a `/app/colaboradores`.

**Isso corrige o `ti` junto**, por decisão explícita: o auditor de TI passa a ver só
Analytics na paleta e deixa de buscar colaboradores por nome. É a mesma inconsistência,
e consertá-la só para o papel novo deixaria a porta aberta de propósito.

O item `organograma` da paleta aponta para `/app/organograma`, que não existe em
`APP_ROUTES` e cai no 404. É um defeito anterior a este trabalho e fica fora do escopo.

### Como a conta nasce

Ela se cadastra sozinha em `/`, escolhendo a própria senha. O trigger
`trg_fn_handle_new_user` já aceita `@itoinstituto.com.br` e a cria como `ti` — sem
acesso a nada além de Analytics enquanto isso. A promoção é um `UPDATE` de uma linha,
rodado depois. Ninguém além dela conhece a senha em momento algum.

## Arquivos

| Arquivo | Mudança |
| --- | --- |
| `supabase/sprint41_papel_diretoria.sql` | novo — constraint, função, 4 policies de SELECT, UPDATE de promoção comentado |
| `src/App.tsx` | `Role`, `APP_ROUTES['/app/feedback']`, `ROTA_INICIAL_POR_PAPEL`, `role` para a paleta |
| `src/components/ProtectedRoute.tsx` | `type Role` |
| `src/pages/private/Dashboard.tsx` | `podeVerVozDoTime`, sidebar, badge, render, rótulo do papel |
| `src/components/feedback/FeedbackManager.tsx` | prop `somenteLeitura` |
| `src/components/common/CommandPalette.tsx` | prop `role`, filtro de rotas privadas, guarda da busca |

## Testes

O que dá para testar como função pura, em Vitest, cobrindo os quatro papéis:

- `rotaInicialPorPapel(role, email)` — RH → dashboard, diretoria → feedback, ti →
  analytics, bypass do TI → dashboard.
- `linksSidebar(role, email)` — diretoria recebe exatamente um link, e ele é
  `/app/feedback`; `ti` recebe só Analytics; RH recebe os 17.
- `rotasPrivadasDaPaleta(role)` — diretoria recebe zero, `ti` só Analytics.

O RLS não tem teste automatizado no projeto; verifica-se logando com a conta e
conferindo que as quatro consultas voltam com dados e que nenhuma escrita passa.

## Fora de escopo

- Limpar os e-mails literais restantes nas policies (dívida do sprint37).
- A rota `/app/organograma` quebrada na paleta.
- Refatorar o gating do Dashboard para um módulo central de permissões — vale quando
  aparecer um terceiro papel restrito, não agora.
