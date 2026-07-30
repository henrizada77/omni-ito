-- ----------------------------------------------------------------------------
-- SPRINT 40 — LIMITES DE UPLOAD E DE TAXA
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente. Ver docs/AUDITORIA.md (SEC-06, SEC-07).
--
-- Duas falhas Altas que o sistema tinha e que se fecham quase todas em SQL.
--
-- SEC-06 — upload sem limite nenhum
--   A única validação era o atributo `accept` do <input type="file">. Isso é
--   dica de interface: qualquer cliente HTTP ignora. Um anônimo com um token
--   de admissão podia subir arquivo de QUALQUER tipo e QUALQUER tamanho, em
--   qualquer quantidade, no bucket documentos-envios. Vetores: esgotar cota e
--   custo de armazenamento, hospedar malware num domínio do Instituto, e
--   entregar arquivo malicioso à coordenadora quando ela abre o documento.
--
-- SEC-07 — nenhum limite de taxa no servidor
--   O único limite era `useRateLimit`, em localStorage — e o próprio arquivo
--   admite que "quem quiser bypassa em modo anônimo". Consequências: o
--   copiloto chama a OpenRouter e gera custo real sem teto, e as pesquisas
--   anônimas (pulse de clima, voto de funcionário do mês) podem ser fraudadas
--   em massa por script. Pesquisa de clima fraudável é pior que nenhuma:
--   produz decisão errada com aparência de dado.
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- 1. SEC-06 — teto de tamanho e lista de tipos aceitos nos buckets
-- ----------------------------------------------------------------------------
-- Aplicado pelo próprio Storage, antes de o arquivo tocar o disco. Diferente
-- do `accept`, isto não é contornável pelo cliente.
--
-- 10 MB cobre foto de documento tirada por celular com folga. PDF de contrato
-- assinado raramente passa de 2 MB.

update storage.buckets
set file_size_limit = 10485760,   -- 10 MB
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
      'application/pdf'
    ]
where id = 'documentos-envios';

update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf']
where id = 'contratos-assinados';

-- Confira:
--   select id, file_size_limit, allowed_mime_types from storage.buckets;

-- NOTA sobre o que isto NÃO cobre. O Content-Type é declarado pelo cliente,
-- então um .exe anunciado como application/pdf passa por aqui. Fechar isso
-- exige ler os primeiros bytes do arquivo e conferir a assinatura (%PDF-,
-- \xFF\xD8\xFF para JPEG), o que precisa de uma Edge Function no caminho do
-- upload. Fica registrado como pendência de SEC-06; o teto de tamanho e a
-- lista de tipos já eliminam a maior parte do risco prático.


-- ----------------------------------------------------------------------------
-- 2. SEC-07 — infraestrutura de limite de taxa
-- ----------------------------------------------------------------------------
-- Contador por chave e por janela de tempo. A chave é escolhida por quem
-- chama: e-mail do usuário para o copiloto, device_id para o pulse, token
-- para a admissão.
--
-- Janela fixa em vez de deslizante: é mais simples, mais barata, e a
-- imprecisão na virada da janela não importa para o que se quer evitar aqui
-- (laço e script), só para ataque calibrado.

create table if not exists public.limites_taxa (
  chave     text        not null,
  janela    timestamptz not null,
  contador  integer     not null default 0,
  primary key (chave, janela)
);

-- Sem índice extra: a PK (chave, janela) já atende a consulta, que é sempre
-- pelas duas colunas.

alter table public.limites_taxa enable row level security;
-- Ninguém acessa direto. Só a função abaixo, que é SECURITY DEFINER.
revoke all on public.limites_taxa from anon, authenticated;

/**
 * Consome uma unidade do limite. Devolve TRUE se pode prosseguir.
 *
 * Uso dentro de outra função:
 *   if not public.consumir_limite('pulse:' || p_device_id, 3, 3600) then
 *     raise exception 'Muitas tentativas. Tente de novo mais tarde.';
 *   end if;
 */
create or replace function public.consumir_limite(
  p_chave      text,
  p_max        integer,
  p_janela_seg integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_janela timestamptz;
  v_atual  integer;
begin
  -- Trunca o instante ao início da janela: todas as chamadas do mesmo período
  -- caem na mesma linha.
  v_janela := to_timestamp(floor(extract(epoch from now()) / p_janela_seg) * p_janela_seg);

  insert into public.limites_taxa (chave, janela, contador)
  values (p_chave, v_janela, 1)
  on conflict (chave, janela)
    do update set contador = public.limites_taxa.contador + 1
  returning contador into v_atual;

  return v_atual <= p_max;
end;
$$;

grant execute on function public.consumir_limite(text, integer, integer) to anon, authenticated;


-- ----------------------------------------------------------------------------
-- 3. Poda
-- ----------------------------------------------------------------------------
-- Sem isto a tabela cresce para sempre — o mesmo erro que o logs_auditoria
-- cometeu por não ter sido pensado no primeiro dia.

create or replace function public.podar_limites_taxa()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare apagados integer;
begin
  delete from public.limites_taxa where janela < now() - interval '2 days';
  get diagnostics apagados = row_count;
  return apagados;
end;
$$;

-- Agende junto com a poda dos logs de erro, ou rode à mão:
--   select public.podar_limites_taxa();


-- ----------------------------------------------------------------------------
-- 4. Aplicando às RPCs públicas
-- ----------------------------------------------------------------------------
-- A infraestrutura está pronta; falta plugá-la nas funções que hoje aceitam
-- chamada anônima sem teto. Não fiz automaticamente porque cada uma tem regra
-- de negócio própria e reescrevê-las às cegas é como se introduz regressão.
--
-- Para cada função abaixo, adicione a checagem logo no início do corpo:
--
--   registrar_pulse(p_device_id, ...)
--     if not public.consumir_limite('pulse:' || p_device_id, 3, 86400) then
--       return false;   -- respeita o tipo de retorno atual da função
--     end if;
--
--   registrar_voto_funcionario_mes(...)
--     if not public.consumir_limite('voto:' || p_votante_id::text, 5, 86400) then
--       return false;
--     end if;
--
--   submit_teste_comportamental(p_token, ...)
--     if not public.consumir_limite('teste:' || p_token, 5, 3600) then
--       return false;
--     end if;
--
--   get_teste_by_token(p_token)  -- contra força bruta de token
--     if not public.consumir_limite('lookup_teste', 200, 60) then
--       return;
--     end if;
--
--   inserir_colaborador_via_admissao(...)
--     if not public.consumir_limite('admissao', 50, 3600) then
--       raise exception 'Muitas submissões. Tente novamente em alguns minutos.';
--     end if;
--
-- O copiloto NÃO está nesta lista: o limite dele foi para dentro da própria
-- Edge Function, que é onde o custo acontece. Precisa de redeploy.


-- ----------------------------------------------------------------------------
-- 5. Depois de rodar
-- ----------------------------------------------------------------------------
-- (a) Buckets com limite:
--   select id, file_size_limit, allowed_mime_types from storage.buckets;
--
-- (b) Teste o contador — a sexta chamada deve devolver false:
--   select public.consumir_limite('teste-manual', 5, 60);  -- repita 6x
--
-- (c) Limpe o teste:
--   delete from public.limites_taxa where chave = 'teste-manual';
