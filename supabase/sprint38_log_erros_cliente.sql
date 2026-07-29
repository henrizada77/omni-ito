-- ----------------------------------------------------------------------------
-- SPRINT 38 — REGISTRO DE ERROS DE RUNTIME
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente. Ver docs/AUDITORIA.md (DEV-04).
--
-- Independente do sprint37: pode rodar antes ou depois.
--
-- Até aqui a única instrumentação do sistema eram 60 `console.error`, que
-- morrem no navegador de quem viu o problema. Um erro em produção só era
-- descoberto quando alguém ligava reclamando.
--
-- Três decisões que valem explicar:
--
-- 1. A tabela NÃO é exposta ao cliente. O acesso é por RPC SECURITY DEFINER,
--    o mesmo padrão que as sprints 31/32/34 usam bem. O anônimo pode gravar
--    (as páginas públicas também quebram) mas não lê, não altera, não apaga.
--
-- 2. O teto é imposto AQUI, não no navegador. O SEC-04 ensinou o preço de
--    aceitar insert anônimo com `with check (true)`: vira vetor de flood e de
--    forja. O cliente já tem um teto próprio, mas cliente não é lugar de impor
--    limite — quem quiser burla.
--
-- 3. Retenção desde o primeiro dia. O logs_auditoria cresce sem limite porque
--    ninguém pensou nisso quando a tabela era pequena; aqui já nasce podada.
-- ----------------------------------------------------------------------------


create table if not exists public.logs_erros (
  id           uuid primary key default gen_random_uuid(),
  ocorrido_em  timestamptz not null default now(),
  mensagem     text not null,
  stack        text,
  origem       text,
  url          text,
  user_agent   text,
  usuario_id   uuid references auth.users(id) on delete set null,
  contexto     jsonb
);

-- Consulta natural é "o que quebrou nas últimas horas".
create index if not exists ix_logs_erros_ocorrido on public.logs_erros (ocorrido_em desc);
-- E "este erro específico está se repetindo?".
create index if not exists ix_logs_erros_origem on public.logs_erros (origem, ocorrido_em desc);

alter table public.logs_erros enable row level security;


-- ----------------------------------------------------------------------------
-- Leitura: só quem administra
-- ----------------------------------------------------------------------------
-- Mensagem de erro pode carregar fragmento de dado apesar da depuração feita
-- no cliente. Trata-se como material sensível por precaução.

drop policy if exists "Leitura de logs_erros para administracao" on public.logs_erros;
create policy "Leitura de logs_erros para administracao"
  on public.logs_erros for select
  to authenticated
  using (public.get_user_role() in ('coordenadora_rh', 'superadmin'));

-- Ninguém escreve direto: só pela RPC abaixo.
revoke insert, update, delete on public.logs_erros from anon, authenticated;


-- ----------------------------------------------------------------------------
-- Gravação: RPC com teto
-- ----------------------------------------------------------------------------
-- Devolve boolean em vez de lançar: telemetria que falha não pode virar erro
-- para quem chamou. Um erro ao registrar erro alimentaria o handler global e
-- fecharia um laço.

create or replace function public.registrar_erro_cliente(
  p_mensagem   text,
  p_stack      text default null,
  p_origem     text default null,
  p_url        text default null,
  p_user_agent text default null,
  p_contexto   jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  recentes int;
begin
  if p_mensagem is null or length(trim(p_mensagem)) = 0 then
    return false;
  end if;

  -- Teto global por minuto. Um laço de render num cliente gera milhares de
  -- chamadas; sem isto a tabela vira o problema em vez de descrevê-lo.
  select count(*) into recentes
  from public.logs_erros
  where ocorrido_em > now() - interval '1 minute';

  if recentes >= 200 then
    return false;
  end if;

  insert into public.logs_erros (mensagem, stack, origem, url, user_agent, usuario_id, contexto)
  values (
    left(p_mensagem, 500),
    left(p_stack, 4000),
    left(p_origem, 120),
    left(p_url, 300),
    left(p_user_agent, 300),
    auth.uid(),          -- do JWT, nunca do payload do cliente
    coalesce(p_contexto, '{}'::jsonb)
  );

  return true;
end;
$$;

grant execute on function public.registrar_erro_cliente(text, text, text, text, text, jsonb)
  to anon, authenticated;


-- ----------------------------------------------------------------------------
-- Retenção
-- ----------------------------------------------------------------------------
-- 90 dias. Erro com três meses não ajuda a depurar nada e vira só custo de
-- armazenamento e superfície de exposição.

create or replace function public.podar_logs_erros()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare apagados int;
begin
  delete from public.logs_erros where ocorrido_em < now() - interval '90 days';
  get diagnostics apagados = row_count;
  return apagados;
end;
$$;

-- Agende no painel (Database → Cron) ou rode à mão de vez em quando:
--   select public.podar_logs_erros();
--
-- Se a extensão pg_cron estiver disponível no seu plano:
--   select cron.schedule('podar-logs-erros', '0 4 * * 0', 'select public.podar_logs_erros()');


-- ----------------------------------------------------------------------------
-- Como usar no dia a dia
-- ----------------------------------------------------------------------------
-- O que quebrou nas últimas 24h, agrupado:
--
--   select origem, mensagem, count(*), max(ocorrido_em) as ultimo
--   from public.logs_erros
--   where ocorrido_em > now() - interval '24 hours'
--   group by origem, mensagem
--   order by 3 desc;
--
-- Confirme que a depuração de dados pessoais está funcionando — o resultado
-- deve ser ZERO linhas. Se aparecer alguma, é bug no filtro do cliente
-- (src/utils/telemetria.ts) e precisa ser corrigido:
--
--   select id, ocorrido_em, left(mensagem, 80)
--   from public.logs_erros
--   where mensagem ~ '\d{3}\.\d{3}\.\d{3}-\d{2}'   -- CPF
--      or mensagem ~ '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}'; -- e-mail
