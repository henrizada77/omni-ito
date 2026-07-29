-- ----------------------------------------------------------------------------
-- SPRINT 36 — CORREÇÕES P0 DA AUDITORIA
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente. Ver docs/AUDITORIA.md.
--
-- Fecha as três falhas exploráveis por QUALQUER PESSOA da internet e adiciona
-- os índices de chave estrangeira que faltavam.
--
-- Por que eram exploráveis: o frontend usa só a chave publishable, que vai para
-- o bundle JavaScript por desenho do Supabase. Quem protege os dados é o RLS.
-- E três policies foram declaradas SEM cláusula `to` — no Postgres, o default
-- é TO PUBLIC, que inclui o papel `anon`. Ou seja: valiam para quem não fez
-- login nenhum.
--
-- SEGURANÇA DE APLICAÇÃO — verificado antes de escrever este script:
-- nenhuma página de src/pages/public/ escreve nestas tabelas. Todos os writes
-- vêm do painel autenticado ou da Edge Function gerar-contrato-pdf, que usa
-- SERVICE_ROLE_KEY e ignora RLS por definição. Fechar isto não quebra a
-- admissão do candidato.
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- 0. ANTES DE RODAR — fotografe o estado atual
-- ----------------------------------------------------------------------------
-- Guarde o resultado. É a única forma de saber depois o que existia.
--
--   select tablename, policyname, roles, cmd, qual, with_check
--   from pg_policies
--   where schemaname = 'public'
--     and tablename in ('organograma_nos','admission_tokens',
--                       'logs_auditoria','documentos_assinados')
--   order by tablename, policyname;
--
-- Procure `roles` contendo {public} ou {anon}: é a confirmação do problema.


-- ----------------------------------------------------------------------------
-- 1. SEC-01 — organograma_nos: escrita liberada para anônimos
-- ----------------------------------------------------------------------------
-- Era `for all using (true) with check (true)` sem `to`. Qualquer visitante
-- podia ler a hierarquia inteira, alterá-la, ou apagar a tabela toda. Como o
-- parent_id tem `on delete cascade`, um delete no nó raiz derrubava a árvore
-- inteira numa chamada só.

drop policy if exists "organograma leitura" on public.organograma_nos;
drop policy if exists "organograma escrita" on public.organograma_nos;

create policy "organograma leitura"
  on public.organograma_nos for select
  to authenticated
  using (true);

create policy "organograma escrita"
  on public.organograma_nos for all
  to authenticated
  using (public.get_user_role() = 'coordenadora_rh')
  with check (public.get_user_role() = 'coordenadora_rh');

revoke insert, update, delete on public.organograma_nos from anon;
revoke select on public.organograma_nos from anon;


-- ----------------------------------------------------------------------------
-- 2. SEC-02 — admission_tokens: UPDATE anônimo (encadeava para bypass de auth)
-- ----------------------------------------------------------------------------
-- A Edge Function gerar-contrato-pdf autoriza sem JWT quando o token confere.
-- Ela decide olhando `status`, `candidato_cpf` e `expira_em` — os três campos
-- que esta policy deixava o anônimo REESCREVER. Bastava ajustar os três e a
-- geração de contrato passava a autorizar.
--
-- A guarda `informado.length > 0` na função está correta; o problema nunca foi
-- ela, e sim o dado sobre o qual ela decidia não estar protegido.

drop policy if exists "Update publico de tokens" on public.admission_tokens;
drop policy if exists "Leitura publica de tokens" on public.admission_tokens;

revoke insert, update, delete on public.admission_tokens from anon;


-- ----------------------------------------------------------------------------
-- 3. SEC-04 — trilha de auditoria gravável por anônimos
-- ----------------------------------------------------------------------------
-- logs_auditoria é o que sustenta a defesa da empresa em reclamação trabalhista
-- e em fiscalização da ANPD. Com `with check (true)` para anon, qualquer um
-- inseria entradas arbitrárias — inclusive atribuindo ações a e-mails de
-- funcionários reais. Uma trilha que qualquer um escreve não prova nada, e
-- depois de contaminada não há como separar o legítimo do forjado.

drop policy if exists "Insercao anonima de logs de auditoria" on public.logs_auditoria;
drop policy if exists "Insercao anonima de documentos assinados" on public.documentos_assinados;

revoke insert, update, delete on public.logs_auditoria from anon;
revoke insert, update, delete on public.documentos_assinados from anon;

-- Auditoria é append-only: nem o RH altera o passado. A Edge Function usa
-- service_role e não é afetada por estes revokes.
revoke update, delete on public.logs_auditoria from authenticated;


-- ----------------------------------------------------------------------------
-- 4. BD-01 — índices de chave estrangeira
-- ----------------------------------------------------------------------------
-- O Postgres cria índice automático para PK e unique, NÃO para FK. Sem eles,
-- todo join colaborador↔filha é sequential scan, e todo DELETE em colaboradores
-- varre cada tabela filha inteira para checar a FK — candidato natural a lock
-- longo sob concorrência.
--
-- `concurrently` para não travar escrita. Não pode rodar dentro de bloco de
-- transação: se o SQL Editor reclamar, rode estas linhas separadamente.

create index concurrently if not exists ix_advertencias_colab
  on public.colaborador_advertencias(colaborador_id);

create index concurrently if not exists ix_avaliacoes_colab
  on public.avaliacoes_desempenho(colaborador_id);

create index concurrently if not exists ix_desligamentos_colab
  on public.desligamentos(colaborador_id);

create index concurrently if not exists ix_colab_beneficios_colab
  on public.colaborador_beneficios(colaborador_id);

create index concurrently if not exists ix_colab_beneficios_benef
  on public.colaborador_beneficios(beneficio_id);

-- status é a coluna mais filtrada de todo o sistema e não tinha índice nenhum.
create index concurrently if not exists ix_colaboradores_status
  on public.colaboradores(status);


-- ----------------------------------------------------------------------------
-- 5. DEPOIS DE RODAR — confirme
-- ----------------------------------------------------------------------------
-- (a) Nenhuma policy deve mais aparecer com roles {public} ou {anon} nestas
--     quatro tabelas:
--
--   select tablename, policyname, roles, cmd
--   from pg_policies
--   where schemaname = 'public'
--     and tablename in ('organograma_nos','admission_tokens',
--                       'logs_auditoria','documentos_assinados')
--   order by tablename;
--
-- (b) Procure registros de auditoria possivelmente forjados. E-mail nulo ou
--     desconhecido merece investigação:
--
--   select usuario_email, count(*), min(criado_em), max(criado_em)
--   from public.logs_auditoria
--   group by usuario_email
--   order by 2 desc;
--
-- (c) Varredura geral do resto do banco — este script cobre só as quatro
--     tabelas P0. Rode e leia com atenção:
--
--   select tablename, policyname, roles, cmd, qual
--   from pg_policies
--   where schemaname = 'public' and 'anon' = any(roles)
--   order by tablename;


-- ----------------------------------------------------------------------------
-- 6. AINDA EM ABERTO — não resolvido por este script
-- ----------------------------------------------------------------------------
-- SEC-03  As três Edge Functions autorizam por domínio de e-mail
--         (`@itoinstituto.com.br`) e têm um Gmail pessoal fixo como superadmin.
--         Isso contorna o modelo de papéis inteiro. Correção exige alterar o
--         código das funções e redeployar — não dá para fazer por SQL.
--
-- BD-03   Enquanto supabase/run_pending_migrations.sql existir no repositório,
--         quem rodar aquele arquivo REABRE as brechas dos itens 2 e 3 acima.
--         Ele precisa ser apagado.
--
-- BD-05   Funções SECURITY DEFINER antigas seguem sem `set search_path`.
--         Liste as pendentes com:
--           select p.proname from pg_proc p
--           join pg_namespace n on n.oid = p.pronamespace
--           where n.nspname = 'public' and p.prosecdef and p.proconfig is null;
--
-- SEC-05  ~25 policies com `using (true)` para authenticated. Decisão registrada
--         no sprint10 (bloco C-3) como risco aceito. Mas parte delas é `for all`,
--         não `for select` — o perfil 'ti' ESCREVE onde a justificativa fala em
--         ler. Isso merece revisão à parte.
