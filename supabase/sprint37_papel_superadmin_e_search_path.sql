-- ----------------------------------------------------------------------------
-- SPRINT 37 — FIM DO BACKDOOR POR E-MAIL, E search_path NAS SECURITY DEFINER
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente. Ver docs/AUDITORIA.md (SEC-03, BD-05).
--
-- ⚠️  ORDEM IMPORTA. RODE ESTE SCRIPT **ANTES** DE FAZER O DEPLOY DAS EDGE
--     FUNCTIONS. As funções novas só reconhecem os cargos 'coordenadora_rh' e
--     'superadmin'. Se você deployar primeiro, quem hoje entra pelo e-mail
--     fixo fica trancado para fora até este script rodar.
--
-- O que estava errado: a autorização aceitava `user.email` igual a um Gmail
-- pessoal, ou qualquer endereço @itoinstituto.com.br. A segunda condição
-- anulava o modelo de papéis inteiro — o sprint10 faz todo cadastro nascer
-- como 'ti' justamente para que promoção seja ato administrativo, e a
-- checagem de domínio devolvia poder de RH a qualquer conta institucional.
--
-- O mesmo Gmail também aparecia dentro de policies RLS, como exceção nominal.
-- Credencial de autorização em código versionado: revogar exigia editar e
-- redeployar. Agora o poder mora em perfis.cargo e revogar é um UPDATE.
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- 1. Novo papel 'superadmin'
-- ----------------------------------------------------------------------------
-- A constraint atual só admite 'coordenadora_rh' e 'ti'. O TI precisa de um
-- papel que não seja "coordenadora de RH" — ele não é — mas que tenha o
-- alcance administrativo que o e-mail fixo lhe dava.

alter table public.perfis drop constraint if exists check_cargo;
alter table public.perfis add constraint check_cargo
  check (cargo in ('coordenadora_rh', 'ti', 'superadmin'));


-- ----------------------------------------------------------------------------
-- 2. ⚠️ EDITE ESTA LINHA ANTES DE RODAR
-- ----------------------------------------------------------------------------
-- Troque pelo e-mail de quem deve ter o papel administrativo. Se você deixar
-- como está, o UPDATE não casa com ninguém e a pessoa perde o acesso quando
-- as funções forem deployadas.

update public.perfis
set cargo = 'superadmin'
where email = 'ito.thiagosilva@gmail.com';

-- Confira que pegou alguém. Zero linhas aqui = ninguém será superadmin.
select email, cargo from public.perfis where cargo = 'superadmin';


-- ----------------------------------------------------------------------------
-- 3. Policies que tinham o e-mail fixo embutido
-- ----------------------------------------------------------------------------
-- Mesma regra de antes, expressa por papel em vez de por endereço.

create or replace function public.tem_papel_administrativo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select cargo in ('coordenadora_rh', 'superadmin')
     from public.perfis where id = auth.uid()),
    false);
$$;

grant execute on function public.tem_papel_administrativo() to authenticated;

drop policy if exists "Escrita de beneficios restrita a coordenadora de RH e Superuser" on public.beneficios;
create policy "Escrita de beneficios restrita a coordenadora de RH e Superuser"
  on public.beneficios for all to authenticated
  using (public.tem_papel_administrativo())
  with check (public.tem_papel_administrativo());

drop policy if exists "Escrita de colaborador_beneficios restrita a coordenadora de RH e Superuser" on public.colaborador_beneficios;
create policy "Escrita de colaborador_beneficios restrita a coordenadora de RH e Superuser"
  on public.colaborador_beneficios for all to authenticated
  using (public.tem_papel_administrativo())
  with check (public.tem_papel_administrativo());

drop policy if exists "Escrita de planos_carreira para coordenadora_rh" on public.planos_carreira;
create policy "Escrita de planos_carreira para coordenadora_rh"
  on public.planos_carreira for all to authenticated
  using (public.tem_papel_administrativo())
  with check (public.tem_papel_administrativo());

drop policy if exists "Escrita de avaliacoes_desempenho para coordenadora_rh" on public.avaliacoes_desempenho;
create policy "Escrita de avaliacoes_desempenho para coordenadora_rh"
  on public.avaliacoes_desempenho for all to authenticated
  using (public.tem_papel_administrativo())
  with check (public.tem_papel_administrativo());

-- Storage. Se der erro de owner no SQL Editor, faça pelo painel:
-- Storage → Policies → bucket documentos-envios.
drop policy if exists "Permitir controle total do bucket documentos-envios para RH e TI" on storage.objects;
create policy "Permitir controle total do bucket documentos-envios para RH e TI"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'documentos-envios' and public.tem_papel_administrativo())
  with check (bucket_id = 'documentos-envios' and public.tem_papel_administrativo());


-- ----------------------------------------------------------------------------
-- 4. BD-05 — search_path nas funções SECURITY DEFINER
-- ----------------------------------------------------------------------------
-- Uma função SECURITY DEFINER sem search_path fixo resolve nomes pelo
-- search_path de QUEM A CHAMA. Quem conseguir criar um schema e uma tabela
-- homônima faz a função privilegiada operar sobre a tabela dele — escalada de
-- privilégio clássica no Postgres (CVE-2018-1058).
--
-- As funções novas (sprints 31/32/34) já têm. As antigas não. Em vez de listar
-- nome por nome e esquecer alguma, o bloco abaixo corrige todas as que faltam.

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as assinatura
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and (p.proconfig is null
           or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%'))
  loop
    execute format('alter function %s set search_path = public', f.assinatura);
    raise notice 'search_path fixado em %', f.assinatura;
  end loop;
end $$;


-- ----------------------------------------------------------------------------
-- 5. DEPOIS DE RODAR — confirme, e só então deploye as funções
-- ----------------------------------------------------------------------------
-- (a) Existe exatamente quem deveria como superadmin?
--
--   select email, cargo from public.perfis order by cargo, email;
--
-- (b) Nenhuma SECURITY DEFINER deve sobrar sem search_path (espera-se 0 linhas):
--
--   select p.proname from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public' and p.prosecdef
--     and (p.proconfig is null
--          or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%'));
--
-- (c) Nenhuma policy deve mais citar e-mail literal (espera-se 0 linhas):
--
--   select tablename, policyname from pg_policies
--   where schemaname in ('public','storage')
--     and (qual like '%@gmail.com%' or with_check like '%@gmail.com%');
--
-- Passando os três, rode:
--
--   npx supabase functions deploy copilot            --project-ref jyvxhyaeagqljvqqeuwi
--   npx supabase functions deploy gerar-contrato-pdf --project-ref jyvxhyaeagqljvqqeuwi
--   npx supabase functions deploy pontofopag-sync    --project-ref jyvxhyaeagqljvqqeuwi


-- ----------------------------------------------------------------------------
-- 6. O que este script NÃO toca
-- ----------------------------------------------------------------------------
-- O trigger de cadastro (sprint10) segue permitindo o Gmail pessoal criar
-- conta. Isso é OUTRA coisa e está certo: é allowlist de quem pode se
-- cadastrar, não concessão de privilégio. Quem se cadastra continua nascendo
-- como 'ti'.
