-- ----------------------------------------------------------------------------
-- SPRINT 10 — CORREÇÃO DE ESCALAÇÃO DE PRIVILÉGIO
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente.
--
-- Corrige dois caminhos independentes pelos quais qualquer pessoa da internet
-- se tornava coordenadora_rh e passava a ler CPF, RG, salário, dados bancários
-- e dados de saúde de todos os colaboradores:
--
--   C-1  o trigger de cadastro aceitava @gmail.com e lia o cargo de
--        raw_user_meta_data, que é input do cliente (options.data do signUp)
--   C-2  a policy de update em perfis validava só auth.uid() = id, e o RLS do
--        Postgres não restringe colunas — o usuário era dono do próprio cargo
--
-- Regra de acesso após este script:
--   • cadastro permitido só para @itoinstituto.com.br
--   • exceção nominal: ito.thiagosilva@gmail.com (TI, sem domínio institucional)
--   • todo cadastro nasce como 'ti'; promoção a coordenadora_rh é ato
--     administrativo, feito pela seção 4 abaixo
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- 1. Trigger de novo usuário
-- ----------------------------------------------------------------------------
-- Mudanças: (a) allowlist por endereço, não por domínio inteiro; (b) o cargo
-- nunca vem do cliente; (c) search_path fixo, para a função SECURITY DEFINER
-- não resolver nomes pelo search_path de quem a chama.

create or replace function public.trg_fn_handle_new_user()
returns trigger as $$
begin
  if new.email <> 'ito.thiagosilva@gmail.com'
     and split_part(new.email, '@', 2) <> 'itoinstituto.com.br' then
    raise exception 'Cadastro restrito a e-mails corporativos @itoinstituto.com.br';
  end if;

  -- 'ti' sempre. raw_user_meta_data é preenchido pelo cliente e não é confiável.
  insert into public.perfis (id, email, cargo)
  values (new.id, new.email, 'ti');

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function public.trg_fn_handle_new_user();


-- ----------------------------------------------------------------------------
-- 2. Tirar a coluna 'cargo' do alcance do próprio usuário
-- ----------------------------------------------------------------------------
-- O frontend e a edge function apenas leem perfis (select cargo) — nenhum
-- caminho da aplicação faz update. Revogar é mais simples e mais robusto do
-- que tentar restringir a coluna pela policy, que o RLS não sabe fazer.

drop policy if exists "Permitir alteracao do proprio perfil" on public.perfis;

revoke update on public.perfis from authenticated;
revoke update on public.perfis from anon;
revoke insert, delete on public.perfis from authenticated;
revoke insert, delete on public.perfis from anon;


-- ----------------------------------------------------------------------------
-- 3. AUDITORIA — rode isto e leia o resultado antes de considerar o caso fechado
-- ----------------------------------------------------------------------------
-- Procure: cargo 'coordenadora_rh' que você não reconhece, e qualquer domínio
-- que não seja @itoinstituto.com.br além da exceção do TI.

select
  u.email,
  p.cargo,
  u.created_at,
  u.last_sign_in_at,
  case
    when u.email = 'ito.thiagosilva@gmail.com' then 'exceção autorizada (TI)'
    when split_part(u.email, '@', 2) = 'itoinstituto.com.br' then 'ok'
    else '>>> INVESTIGAR <<<'
  end as procedencia
from auth.users u
left join public.perfis p on p.id = u.id
order by u.created_at desc;

-- Se aparecer alguma conta indevida, revogue o acesso com:
--   update public.perfis set cargo = 'ti' where email = 'conta@suspeita.com';
--   -- e, para remover de vez (o perfil cai junto, por on delete cascade):
--   -- delete from auth.users where email = 'conta@suspeita.com';


-- ----------------------------------------------------------------------------
-- 4. Como promover alguém a coordenadora_rh (a partir de agora)
-- ----------------------------------------------------------------------------
-- Não há mais caminho pela aplicação — é intencional. Rode aqui, nominalmente:
--
--   update public.perfis
--   set cargo = 'coordenadora_rh'
--   where email = 'pessoa@itoinstituto.com.br';


-- ----------------------------------------------------------------------------
-- C-3 — RISCO ACEITO, DECIDIDO EM 2026-07-15 (não é esquecimento)
-- ----------------------------------------------------------------------------
-- ~25 policies usam `using (true)` para authenticated: qualquer conta logada lê
-- a base inteira de RH — salário, dados bancários, deficiência, medicação
-- contínua, ASO. Isso é INTENCIONAL: o cargo 'ti' é definido no produto como
-- "Suporte TI (apenas leitura)" e a leitura ampla é o que se espera dele.
--
-- Enquanto o cadastro estava aberto ao gmail.com inteiro, isso significava
-- "qualquer pessoa da internet lê tudo" — era crítico. Com a seção 1 acima,
-- passa a significar "todo funcionário do Instituto lê tudo", que é uma
-- decisão de negócio defensável, e foi a escolhida.
--
-- O que continua em aberto, e deve ser reavaliado se o quadro crescer ou se
-- houver auditoria da ANPD:
--   • LGPD Art. 6º, III e V (necessidade e minimização): não há segregação por
--     necessidade — quem dá suporte de TI enxerga a medicação contínua dos
--     colegas.
--   • LGPD Art. 11: dados de saúde estão na mesma tabela e sob a mesma policy
--     que o nome do cargo, sem tratamento diferenciado.
--
-- A correção, se um dia for feita: mover as colunas sensíveis de
-- `colaboradores` para tabela própria com policy restrita a coordenadora_rh,
-- mantendo em `colaboradores` só o operacional (nome, cargo, setor, onboarding).


-- ----------------------------------------------------------------------------
-- OUTRAS PENDÊNCIAS (ver relatório de auditoria)
-- ----------------------------------------------------------------------------
-- C-4  supabase/run_pending_migrations.sql recria as policies anônimas que o
--      sprint9_security_hardening.sql remove. Enquanto os dois existirem no
--      repositório, o próximo a rodar o script errado reabre as brechas.
--
-- A-3  as demais funções SECURITY DEFINER seguem sem `set search_path`.
