# Design — Desligamento completo + Clima & indicadores

**Data:** 2026-07-22 · **Branch:** feature/rh-modulos · **Status:** aprovado pelo usuário

## Contexto

O Omni ITO (React + Supabase, UI concentrada em `src/pages/private/Dashboard.tsx`) já tem:

- Fluxo "⚠️ Desligar Colaborador" no drawer: tipo (`Voluntario`/`Involuntario`), data, motivo → remove `colaborador_beneficios`, seta `status='desligado'` + `tipo_desligamento`/`data_desligamento`/`motivo_desligamento` em `colaboradores`, loga auditoria.
- `TurnoverPanel.tsx` (turnover geral, por setor, voluntário × involuntário) — **não muda**.
- `pesquisas_satisfacao` (anônima, contínua: `nota` 1–5, `categoria`, `comentario`, `criado_em`) e `ocorrencias_jornada` (`tipo` ∈ Atraso, Falta Injustificada, Falta Justificada (Atestado), Saída Antecipada, Descumprimento de Carga; `data_ocorrencia`; `horas_minutos_desvio` é texto livre — não confiável para soma).

## Decisões de requisito (respondidas pelo usuário)

1. Aviso prévio **proporcional** (Lei 12.506): 30 + 3 dias/ano completo de casa, teto 90 — só para desligamento sem justa causa. Pedido de demissão: 30 fixos.
2. RH escolhe a **modalidade** a cada caso: trabalhado × indenizado (ou dispensado, no pedido).
3. Entrevista de desligamento: **form interno preenchido pelo RH**, vinculado ao colaborador, preenchível depois do desligamento (badge "pendente").
4. Clima: **evolução mensal** agrupando as respostas existentes (sem rodadas formais; zero mudança de banco).
5. Absenteísmo: **faltas justificadas + injustificadas**, contadas por dia (1 falta = 1 dia), com quebra visual entre as duas; atrasos/saídas antecipadas ficam num contador à parte, fora do índice.

## Bloco 1 — Desligamento completo

### Banco: `supabase/sprint28_desligamentos.sql` (idempotente, rodado manualmente no SQL Editor)

Tabela nova `public.desligamentos` (1:1 com o colaborador desligado; `colaboradores` não ganha colunas novas):

| campo | tipo | regra |
|---|---|---|
| `id` | uuid pk | |
| `colaborador_id` | uuid not null → colaboradores, on delete cascade | unique (1:1) |
| `tipo` | text | check: `sem_justa_causa` \| `pedido_demissao` |
| `modalidade_aviso` | text | check: `trabalhado` \| `indenizado_ou_dispensado` |
| `data_comunicacao` | date not null | |
| `dias_aviso` | integer not null | calculado no app |
| `data_termino` | date not null | trabalhado: comunicação + dias_aviso; senão = comunicação |
| `data_limite_pagamento` | date not null | término + 10 dias corridos (CLT 477 §6º) |
| `pagamento_efetuado_em` | date null | preenchido pelo RH; desliga o alerta |
| `observacoes` | text | |
| `entrevista_realizada_em` | timestamptz null | null = entrevista pendente |
| `entrevista_motivo_real` | text | select no app (Remuneração, Liderança, Carreira, Clima, Pessoal, Outro) + texto livre |
| `entrevista_pontos_positivos` | text | |
| `entrevista_pontos_melhorar` | text | |
| `entrevista_recomendaria` | smallint | check 0–10 |
| `entrevista_comentarios` | text | |
| `criado_em` | timestamptz default now() | |

RLS: **select e all restritos** ao predicado `get_user_role() = 'coordenadora_rh' or email = 'ito.thiagosilva@gmail.com'` (mesmo da escrita de `colaboradores`). Exceção deliberada ao padrão `using (true)` de leitura ampla do app: entrevista de saída é dado sensível.

### Cálculo (helper no app, resultado gravado pronto na tabela)

- Anos completos de casa = entre `data_admissao` e `data_comunicacao`.
- `sem_justa_causa`: `dias_aviso = min(30 + 3 × anos, 90)`. `pedido_demissao`: `dias_aviso = 30`.
- `data_termino` e `data_limite_pagamento` conforme tabela acima. Preview das 3 datas antes de confirmar.

### UI (Dashboard.tsx, padrões existentes)

1. **Fluxo de desligar (drawer):** form atual ganha tipo (novo domínio), modalidade e preview automático das datas. Ao confirmar: comportamento atual preservado (benefícios, status, log) + insert em `desligamentos`. Compat: grava `tipo_desligamento` legado (`pedido_demissao`→`Voluntario`, `sem_justa_causa`→`Involuntario`) para o TurnoverPanel.
2. **Entrevista (drawer do desligado):** seção "Entrevista de desligamento" — badge "pendente" enquanto `entrevista_realizada_em` for null; form com os 5 campos + salvar (update na mesma linha).
3. **Alerta "Rescisões a pagar" (painel de alertas do Dashboard):** desligamentos com `pagamento_efetuado_em is null`, ordenados por `data_limite_pagamento`, com contagem regressiva (vermelho se vencido); botão "marcar pago".
4. Auditoria: `DESLIGAMENTO_COLABORADOR` passa a incluir os prazos; novos `ENTREVISTA_DESLIGAMENTO_REGISTRADA` e `RESCISAO_PAGAMENTO_MARCADO`.

## Bloco 2 — Clima & indicadores (sem mudança de banco)

Novo componente `src/components/analytics/ClimaPanel.tsx` + valor `'clima'` em `analyticsSubTab`. Recebe via props os dados já carregados no Dashboard (`pesquisasSatisfacao`, `ocorrenciasAnalytics`, `colaboradoresList`), seguindo o padrão dos painéis irmãos.

- **Cards:** média geral (todas as respostas), média do mês corrente com seta de tendência vs mês anterior, nº total de respostas.
- **Linha mensal:** média de `nota` por mês, últimos 12 meses (meses sem resposta ficam sem ponto, não zero).
- **Barras por categoria:** média por `categoria` (todas as respostas).
- **Absenteísmo mensal (últimos 6 meses):** `dias de falta ÷ (dias úteis do mês × headcount)`, onde dias úteis = seg–sex e headcount = colaboradores com `status != 'desligado'` hoje (simplificação declarada: não reconstrói headcount histórico). Quebra justificada × injustificada empilhada; contador à parte de atrasos + saídas antecipadas no período.

## Fora de escopo

Justa causa e término de contrato de experiência como tipos do fluxo novo; cálculo de valores de rescisão (R$); link público de entrevista para o desligado; rodadas formais de pesquisa; parsing de `horas_minutos_desvio`.

## Erros e verificação

- Falhas seguem o padrão `notify('Erro …: ' + err.message)`; inserts/updates checam `error` retornado.
- Atenção ao insert em `desligamentos` após o update de status: se o insert falhar, notificar e manter o desligamento (status) — a linha pode ser recriada reabrindo o fluxo; não fazer rollback manual.
- Verificação: `npx tsc --noEmit` + fluxo manual: desligar (conferir 3 datas nos dois tipos × 2 modalidades), preencher entrevista (badge some), alerta de rescisão aparece e some ao marcar pago; sub-tab Clima renderiza com dados reais e com base vazia.
