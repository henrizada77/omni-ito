-- ----------------------------------------------------------------------------
-- SPRINT 39 — CORRIGE DUAS REGRESSÕES INTRODUZIDAS PELO SPRINT 36
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente.
--
-- O sprint36 fechou brechas reais, mas em dois pontos foi longe demais e
-- quebrou funcionalidade legítima. Este script conserta os dois, sem reabrir
-- nada do que era de fato vulnerável.
--
-- Onde eu errei, para ficar registrado:
--
--   A vulnerabilidade do organograma era acesso ANÔNIMO — qualquer pessoa da
--   internet apagando a árvore. Eu "corrigi" restringindo a coordenadora_rh,
--   que é uma decisão de produto que ninguém me pediu. Antes, qualquer usuário
--   logado editava. Fechar o anônimo era o conserto; escolher quem do time
--   pode editar não era meu papel.
--
--   Em logs_auditoria eu removi a capacidade de o candidato registrar a
--   própria assinatura. O problema real era o registro ser FORJÁVEL (anon
--   inseria qualquer ação atribuída a qualquer e-mail), não o registro
--   existir. Apagar a trilha de auditoria da assinatura é o oposto do que a
--   auditoria pedia.
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- 1. Organograma: devolve a escrita a quem está logado
-- ----------------------------------------------------------------------------
-- O anônimo continua fora, que era o ponto. Se depois vocês decidirem que só
-- o RH edita o organograma, a mudança é trocar `using (true)` pela checagem de
-- papel — mas que seja decisão de vocês, não efeito colateral de um patch de
-- segurança.

drop policy if exists "organograma escrita" on public.organograma_nos;
create policy "organograma escrita"
  on public.organograma_nos for all
  to authenticated
  using (true)
  with check (true);

-- A leitura já está correta: authenticated sim, anon não.


-- ----------------------------------------------------------------------------
-- 2. Auditoria da assinatura do candidato
-- ----------------------------------------------------------------------------
-- O candidato não tem sessão: ele chega por link com token. Precisa registrar
-- que assinou, e esse registro é justamente o que prova a assinatura depois.
--
-- A diferença para o que existia antes:
--
--   antes  anon inseria QUALQUER ação com QUALQUER e-mail  → trilha forjável
--   agora  precisa de token válido em estado de assinatura, a ação vem de uma
--          lista fechada, e o e-mail é lido do token PELO SERVIDOR
--
-- Ou seja: quem não tem um token real não escreve nada, e quem tem só
-- consegue registrar o que aquele token permite, em nome de quem o token diz.

create or replace function public.registrar_auditoria_candidato(
  p_token    text,
  p_acao     text,
  p_detalhes jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_status text;
begin
  -- Lista fechada de ações. Sem isto o token viraria licença para escrever
  -- qualquer coisa na trilha.
  if p_acao not in ('CANDIDATO_ASSINA_CONTRATO', 'CANDIDATO_ABRE_LINK') then
    return false;
  end if;

  select coalesce(t.candidato_email, t.detalhes ->> 'email'), t.status
    into v_email, v_status
  from public.admission_tokens t
  where t.token = p_token;

  -- Token inexistente: nada é gravado, e a função não conta o porquê.
  -- Distinguir "não existe" de "estado errado" ajudaria a enumerar tokens.
  if v_email is null and v_status is null then
    return false;
  end if;

  if v_status not in ('aguardando_assinatura', 'aguardando_assinatura_rh', 'concluido') then
    return false;
  end if;

  insert into public.logs_auditoria (usuario_email, acao, detalhes)
  values (
    v_email,                       -- do token, no servidor. Nunca do cliente.
    p_acao,
    coalesce(p_detalhes, '{}'::jsonb) || jsonb_build_object('origem', 'link_publico')
  );

  return true;
end;
$$;

grant execute on function public.registrar_auditoria_candidato(text, text, jsonb)
  to anon, authenticated;


-- ----------------------------------------------------------------------------
-- 3. Confirme
-- ----------------------------------------------------------------------------
-- (a) Organograma gravável por quem está logado, e só por quem está logado:
--
--   select policyname, roles::text, cmd, qual
--   from pg_policies where tablename = 'organograma_nos';
--
-- (b) logs_auditoria segue fechada a insert direto de anon (espera-se 0):
--
--   select count(*) from pg_policies
--   where tablename = 'logs_auditoria' and 'anon' = any(roles);
--
-- (c) Teste a função com um token que não existe — deve devolver false, sem
--     gravar nada:
--
--   select public.registrar_auditoria_candidato('token-inventado', 'CANDIDATO_ASSINA_CONTRATO');
--
-- (d) Depois da próxima assinatura real, confirme que a linha apareceu:
--
--   select ocorrido_em, usuario_email, acao, detalhes ->> 'origem'
--   from public.logs_auditoria
--   where acao = 'CANDIDATO_ASSINA_CONTRATO'
--   order by 1 desc limit 5;


-- ----------------------------------------------------------------------------
-- 4. Lição, para não repetir
-- ----------------------------------------------------------------------------
-- Antes de revogar um acesso, listar TODOS os chamadores e ler a lista
-- inteira. Eu conferi numa saída de grep truncada e concluí a partir do que
-- não apareceu nela. "Não vi" não é "não existe".
