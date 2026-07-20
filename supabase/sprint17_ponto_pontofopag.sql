-- ----------------------------------------------------------------------------
-- SPRINT 17 — ESPELHO DE PONTO + INCONSISTÊNCIAS (integração READ-ONLY Secullum)
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente.
--
-- Recebe, de forma somente-leitura, as batidas e as inconsistências vindas do
-- Secullum Ponto Web (via Edge Function pontofopag-sync, que autentica e chama
-- a API; ver supabase/functions/pontofopag-sync/index.ts). Este script cria só
-- o modelo de dados + as RPCs de persistência idempotentes.
--
-- Decisões:
--   • As BATIDAS reaproveitam a tabela existente `registros_ponto` (que estava
--     sem uso no frontend), com colunas novas de proveniência e idempotência.
--   • Inconsistências e histórico de sync ganham tabelas próprias.
--   • Toda escrita passa pelas RPCs SECURITY DEFINER, chamadas pela Edge
--     Function com a service-role key. Por isso NÃO abrimos policies de
--     INSERT/UPDATE para usuários e travamos o EXECUTE das RPCs no service_role.
--   • Idempotência por `id_externo` (re-sync não duplica).
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- 1. registros_ponto — colunas de proveniência/idempotência
-- ----------------------------------------------------------------------------

alter table public.registros_ponto add column if not exists origem text not null default 'manual';
alter table public.registros_ponto add column if not exists id_externo text;
alter table public.registros_ponto add column if not exists competencia date;  -- 1º dia do mês de referência
alter table public.registros_ponto add column if not exists data_ref date;     -- dia da batida (America/Sao_Paulo)
alter table public.registros_ponto add column if not exists sync_log_id uuid;

comment on column public.registros_ponto.origem is 'manual = batida interna; pontofopag = importada do Secullum Ponto Web.';
comment on column public.registros_ponto.id_externo is 'Chave de idempotência da batida na origem (id do Secullum ou hash determinístico cpf|registrado_em|tipo).';

-- Índice único PARCIAL: só vale para batidas importadas (id_externo not null),
-- então não colide com as batidas manuais (id_externo null).
create unique index if not exists uq_registros_ponto_id_externo
  on public.registros_ponto (id_externo) where id_externo is not null;

create index if not exists ix_registros_ponto_colab_data on public.registros_ponto (colaborador_id, data_ref);
create index if not exists ix_registros_ponto_competencia on public.registros_ponto (competencia) where origem = 'pontofopag';


-- ----------------------------------------------------------------------------
-- 2. colaboradores — chaves de junção com o Secullum
-- ----------------------------------------------------------------------------

alter table public.colaboradores add column if not exists matricula text;
alter table public.colaboradores add column if not exists pontofopag_id text;
create index if not exists ix_colaboradores_matricula on public.colaboradores (matricula) where matricula is not null;


-- ----------------------------------------------------------------------------
-- 3. ponto_inconsistencias
-- ----------------------------------------------------------------------------

create table if not exists public.ponto_inconsistencias (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid references public.colaboradores(id) on delete set null,
  cpf text,            -- cru, para casar mesmo quando o colaborador ainda não existe
  matricula text,
  nome text,           -- nome como veio do Secullum (fallback de exibição)
  data_ref date not null,
  tipo text,           -- ex.: 'batida_impar', 'sem_entrada', 'pendente_tratamento'
  descricao text,
  competencia date,
  id_externo text,
  status_tratamento text not null default 'pendente',
  sync_log_id uuid,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

create unique index if not exists uq_ponto_incons_id_externo
  on public.ponto_inconsistencias (id_externo) where id_externo is not null;
create index if not exists ix_ponto_incons_colab on public.ponto_inconsistencias (colaborador_id);
create index if not exists ix_ponto_incons_competencia on public.ponto_inconsistencias (competencia);


-- ----------------------------------------------------------------------------
-- 4. ponto_sync_log — histórico de cada sincronização
-- ----------------------------------------------------------------------------

create table if not exists public.ponto_sync_log (
  id uuid primary key default gen_random_uuid(),
  iniciado_em timestamp with time zone default timezone('utc'::text, now()) not null,
  finalizado_em timestamp with time zone,
  executado_por text,                         -- email do RH que disparou
  acao text not null,                         -- 'test' | 'sync_ponto' | 'sync_inconsistencias'
  modo text not null default 'mock',          -- 'mock' | 'real'
  status text not null default 'parcial',     -- 'parcial' | 'sucesso' | 'erro'
  competencia date,
  qtd_batidas integer not null default 0,
  qtd_inconsistencias integer not null default 0,
  qtd_nao_casados integer not null default 0,
  qtd_erros integer not null default 0,
  nao_casados jsonb not null default '[]'::jsonb,   -- [{cpf, matricula, nome}]
  mensagem text
);

create index if not exists ix_ponto_sync_log_iniciado on public.ponto_sync_log (iniciado_em desc);


-- ----------------------------------------------------------------------------
-- 5. RLS — leitura restrita a coordenadora_rh; escrita só via RPC (service-role)
-- ----------------------------------------------------------------------------

alter table public.ponto_inconsistencias enable row level security;
alter table public.ponto_sync_log enable row level security;

drop policy if exists "Leitura de inconsistencias para RH" on public.ponto_inconsistencias;
create policy "Leitura de inconsistencias para RH"
  on public.ponto_inconsistencias for select to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Leitura de sync_log para RH" on public.ponto_sync_log;
create policy "Leitura de sync_log para RH"
  on public.ponto_sync_log for select to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');


-- ----------------------------------------------------------------------------
-- 6. RPC: importar_ponto_batidas
-- ----------------------------------------------------------------------------
-- p_batidas: jsonb array de { id_externo, cpf, matricula, nome, tipo,
--            registrado_em (ISO), data_ref (YYYY-MM-DD), competencia (YYYY-MM-DD) }
-- p_meta:    { executado_por, modo, competencia }
-- Casa por CPF (dígitos), fallback matrícula. Batida sem colaborador vai para
-- nao_casados (não insere órfã). Upsert por id_externo → idempotente. Cada linha
-- num sub-bloco: uma batida ruim não derruba o lote inteiro.

create or replace function public.importar_ponto_batidas(p_batidas jsonb, p_meta jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_log_id uuid;
  v_item jsonb;
  v_colab_id uuid;
  v_cpf_dig text;
  v_processados integer := 0;
  v_nao_casados jsonb := '[]'::jsonb;
  v_qtd_nao_casados integer := 0;
  v_erros integer := 0;
begin
  insert into public.ponto_sync_log (executado_por, acao, modo, status, competencia)
  values (p_meta->>'executado_por', 'sync_ponto', coalesce(p_meta->>'modo','mock'), 'parcial',
          nullif(p_meta->>'competencia','')::date)
  returning id into v_log_id;

  for v_item in select * from jsonb_array_elements(coalesce(p_batidas, '[]'::jsonb))
  loop
    begin
      v_cpf_dig := regexp_replace(coalesce(v_item->>'cpf',''), '\D', '', 'g');

      select id into v_colab_id from public.colaboradores
      where regexp_replace(coalesce(cpf,''), '\D', '', 'g') = v_cpf_dig and v_cpf_dig <> ''
      limit 1;

      if v_colab_id is null and coalesce(v_item->>'matricula','') <> '' then
        select id into v_colab_id from public.colaboradores
        where matricula = v_item->>'matricula' limit 1;
      end if;

      if v_colab_id is null then
        v_qtd_nao_casados := v_qtd_nao_casados + 1;
        v_nao_casados := v_nao_casados || jsonb_build_object(
          'cpf', v_item->>'cpf', 'matricula', v_item->>'matricula', 'nome', v_item->>'nome');
        continue;
      end if;

      insert into public.registros_ponto
        (colaborador_id, tipo, registrado_em, origem, id_externo, competencia, data_ref, sync_log_id)
      values (
        v_colab_id,
        v_item->>'tipo',
        (v_item->>'registrado_em')::timestamptz,
        'pontofopag',
        v_item->>'id_externo',
        nullif(v_item->>'competencia','')::date,
        nullif(v_item->>'data_ref','')::date,
        v_log_id
      )
      on conflict (id_externo) where id_externo is not null
      do update set
        colaborador_id = excluded.colaborador_id,
        tipo = excluded.tipo,
        registrado_em = excluded.registrado_em,
        competencia = excluded.competencia,
        data_ref = excluded.data_ref,
        sync_log_id = excluded.sync_log_id;

      v_processados := v_processados + 1;
    exception when others then
      v_erros := v_erros + 1;
    end;
  end loop;

  update public.ponto_sync_log set
    finalizado_em = now(),
    status = case when v_erros > 0 then 'parcial' else 'sucesso' end,
    qtd_batidas = v_processados,
    qtd_nao_casados = v_qtd_nao_casados,
    qtd_erros = v_erros,
    nao_casados = v_nao_casados
  where id = v_log_id;

  insert into public.logs_auditoria (usuario_email, acao, detalhes)
  values (p_meta->>'executado_por', 'SYNC_PONTO',
          jsonb_build_object('log_id', v_log_id, 'processados', v_processados,
                             'nao_casados', v_qtd_nao_casados, 'erros', v_erros, 'modo', p_meta->>'modo'));

  return jsonb_build_object('success', true, 'log_id', v_log_id,
                            'inseridos', v_processados, 'nao_casados', v_qtd_nao_casados, 'erros', v_erros);
exception when others then
  return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;


-- ----------------------------------------------------------------------------
-- 7. RPC: importar_ponto_inconsistencias
-- ----------------------------------------------------------------------------
-- p_itens: jsonb array de { id_externo, cpf, matricula, nome, data_ref, tipo,
--          descricao, competencia }. colaborador_id é opcional (nullable) —
-- guarda o cpf cru mesmo sem colaborador.

create or replace function public.importar_ponto_inconsistencias(p_itens jsonb, p_meta jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_log_id uuid;
  v_item jsonb;
  v_colab_id uuid;
  v_cpf_dig text;
  v_processados integer := 0;
  v_erros integer := 0;
begin
  insert into public.ponto_sync_log (executado_por, acao, modo, status, competencia)
  values (p_meta->>'executado_por', 'sync_inconsistencias', coalesce(p_meta->>'modo','mock'), 'parcial',
          nullif(p_meta->>'competencia','')::date)
  returning id into v_log_id;

  for v_item in select * from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb))
  loop
    begin
      v_cpf_dig := regexp_replace(coalesce(v_item->>'cpf',''), '\D', '', 'g');
      v_colab_id := null;

      select id into v_colab_id from public.colaboradores
      where regexp_replace(coalesce(cpf,''), '\D', '', 'g') = v_cpf_dig and v_cpf_dig <> ''
      limit 1;

      if v_colab_id is null and coalesce(v_item->>'matricula','') <> '' then
        select id into v_colab_id from public.colaboradores
        where matricula = v_item->>'matricula' limit 1;
      end if;

      insert into public.ponto_inconsistencias
        (colaborador_id, cpf, matricula, nome, data_ref, tipo, descricao, competencia, id_externo, sync_log_id)
      values (
        v_colab_id,
        v_item->>'cpf',
        v_item->>'matricula',
        v_item->>'nome',
        nullif(v_item->>'data_ref','')::date,
        v_item->>'tipo',
        v_item->>'descricao',
        nullif(v_item->>'competencia','')::date,
        v_item->>'id_externo',
        v_log_id
      )
      on conflict (id_externo) where id_externo is not null
      do update set
        colaborador_id = excluded.colaborador_id,
        cpf = excluded.cpf,
        matricula = excluded.matricula,
        nome = excluded.nome,
        data_ref = excluded.data_ref,
        tipo = excluded.tipo,
        descricao = excluded.descricao,
        competencia = excluded.competencia,
        sync_log_id = excluded.sync_log_id;

      v_processados := v_processados + 1;
    exception when others then
      v_erros := v_erros + 1;
    end;
  end loop;

  update public.ponto_sync_log set
    finalizado_em = now(),
    status = case when v_erros > 0 then 'parcial' else 'sucesso' end,
    qtd_inconsistencias = v_processados,
    qtd_erros = v_erros
  where id = v_log_id;

  insert into public.logs_auditoria (usuario_email, acao, detalhes)
  values (p_meta->>'executado_por', 'SYNC_INCONSISTENCIAS',
          jsonb_build_object('log_id', v_log_id, 'processados', v_processados, 'erros', v_erros, 'modo', p_meta->>'modo'));

  return jsonb_build_object('success', true, 'log_id', v_log_id,
                            'inseridos', v_processados, 'erros', v_erros);
exception when others then
  return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;


-- ----------------------------------------------------------------------------
-- 8. Registrar a linha de teste de conexão (usada pela action 'test')
-- ----------------------------------------------------------------------------

create or replace function public.registrar_ponto_sync_test(p_meta jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_log_id uuid;
begin
  insert into public.ponto_sync_log (executado_por, acao, modo, status, finalizado_em, mensagem)
  values (p_meta->>'executado_por', 'test', coalesce(p_meta->>'modo','mock'), 'sucesso', now(), p_meta->>'mensagem')
  returning id into v_log_id;
  return jsonb_build_object('success', true, 'log_id', v_log_id);
exception when others then
  return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;


-- ----------------------------------------------------------------------------
-- 9. Travar o EXECUTE das RPCs no service_role (só a Edge Function chama)
-- ----------------------------------------------------------------------------
-- Sem isto, o EXECUTE default é PUBLIC — qualquer usuário autenticado poderia
-- invocar a RPC SECURITY DEFINER e escrever ponto burlando o RLS.

revoke execute on function public.importar_ponto_batidas(jsonb, jsonb) from public;
revoke execute on function public.importar_ponto_inconsistencias(jsonb, jsonb) from public;
revoke execute on function public.registrar_ponto_sync_test(jsonb) from public;

grant execute on function public.importar_ponto_batidas(jsonb, jsonb) to service_role;
grant execute on function public.importar_ponto_inconsistencias(jsonb, jsonb) to service_role;
grant execute on function public.registrar_ponto_sync_test(jsonb) to service_role;

notify pgrst, 'reload schema';
