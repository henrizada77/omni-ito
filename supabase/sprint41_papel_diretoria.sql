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
