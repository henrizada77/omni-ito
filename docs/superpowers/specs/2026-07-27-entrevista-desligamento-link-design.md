# Entrevista de desligamento por link — design

**Data:** 2026-07-27 · **Sprint:** 34

## Problema

A entrevista de saída existe desde a sprint28, mas quem preenche é o RH, à mão, no
drawer do colaborador. O relato chega sempre de segunda mão. O pedido: gerar um
link para o ex-colaborador responder ele mesmo, com **limite de uma resposta por
link** e **expiração 15 dias após o desligamento**.

## Decisões

### Onde as respostas caem

Nas seis colunas `entrevista_*` que já existem em `desligamentos`. Sem tabela nova:
é 1:1 com o desligamento, o RH lê no mesmo card, e uma tabela separada só
acrescentaria um join sem acrescentar informação.

Três colunas novas:

| Coluna | Papel |
| --- | --- |
| `entrevista_token text` | credencial do link; null = link nunca gerado |
| `entrevista_token_ativo boolean` | false = revogado pelo RH (o token fica, como rastro) |
| `entrevista_origem text` | `'rh'` ou `'ex_colaborador'` — quem preencheu |

Índice único **parcial** em `entrevista_token where entrevista_token is not null`:
vários desligamentos podem não ter link, mas dois tokens iguais nunca.

### Expiração: derivada, não guardada

O prazo é calculado dentro da RPC como `data_termino + 15`. Não virou coluna de
propósito: se o RH corrigir a data de término, o prazo acompanha sozinho. Não há
como as duas informações divergirem porque só existe uma.

A base da contagem é `data_termino` (último dia trabalhado), não `data_comunicacao`.

### Acesso do anônimo: duas RPCs, zero policies

A `desligamentos` continua RH-only — a sprint28 marcou a entrevista de saída como
dado sensível e essa decisão fica de pé. O ex-colaborador **não ganha policy
nenhuma**; chega só por duas funções `SECURITY DEFINER`, como o candidato do teste
comportamental (sprint31) e o da admissão (sprint8).

- `get_entrevista_desligamento_by_token(p_token)` → devolve **só** `colaborador_nome`,
  `ja_respondida`, `expirada`, `ativa`. Salário, motivo do desligamento, prazos de
  pagamento e valores nunca saem pelo link.
- `submit_entrevista_desligamento(p_token, ...6 respostas)` → grava e devolve boolean.

### "Uma resposta por link" é do banco, não da tela

Não é validação de UI. É o predicado `entrevista_realizada_em is null` dentro do
`WHERE` de um único `UPDATE`:

```sql
where entrevista_token = p_token
  and entrevista_realizada_em is null
  and entrevista_token_ativo = true
  and current_date <= (data_termino + 15)
```

Dois envios simultâneos disputam a mesma linha; só um afeta `row_count`, o outro
recebe `false`. O cliente não tem como burlar porque o cliente não alcança a tabela.

As quatro condições são a autorização inteira. Falhou qualquer uma → 0 linhas →
`false`, sem informar ao anônimo qual delas falhou.

## Frontend

**`/entrevista-desligamento/:token`** (`src/pages/public/EntrevistaDesligamento.tsx`) —
mesmo enquadramento das outras páginas públicas. Estados: `carregando`, `invalido`,
`expirado`, `respondido`, `form`, `enviado`. Quem já respondeu vê "obrigado" mesmo
depois de vencido o prazo — a ordem das checagens importa.

As perguntas são **as mesmas** que o RH preenche à mão. Se um lado mudar, o outro
precisa mudar junto: os dois caminhos gravam nas mesmas colunas.

**Drawer do Dashboard** — na entrevista pendente, um bloco de link acima do
formulário: gerar, copiar, revogar, e a data de validade. Se o prazo já venceu, o
botão de gerar fica desabilitado (o banco recusaria o envio de qualquer forma).

O formulário manual do RH **continua existindo**, agora rotulado como alternativa.
Muita gente simplesmente não responde, e o RH não pode ficar sem o registro por
causa disso.

Na entrevista já respondida, um selo mostra a origem. Quem respondeu muda como o
RH lê o conteúdo.

## Arquivos

- `supabase/sprint34_entrevista_desligamento_link.sql` — colunas, índice, backfill
  de `entrevista_origem = 'rh'` no histórico, duas RPCs, grants
- `src/pages/public/EntrevistaDesligamento.tsx` — página pública
- `src/App.tsx` — rota
- `src/pages/private/Dashboard.tsx` — bloco de link no drawer, selo de origem,
  `entrevista_origem: 'rh'` no save manual

## Pendência de deploy

`sprint34_entrevista_desligamento_link.sql` precisa ser rodado no SQL Editor do
Supabase. Até lá o link responde "Link inválido" — as RPCs não existem.
