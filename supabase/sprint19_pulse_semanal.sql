-- ----------------------------------------------------------------------------
-- SPRINT 19 — PULSE SEMANAL (check-in de humor + alerta 3×😞)
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente.
--
-- O que é: um check-in de 30s ("Como foi sua semana?") com 4 humores
--   😀 (4) · 🙂 (3) · 😕 (2) · 😞 (1). Uma resposta por semana ISO por
--   dispositivo. Se o MESMO dispositivo responder 😞 em 3 semanas ISO
--   consecutivas, o RH recebe um alerta automático (in-app).
--
-- PRIVACIDADE — pseudônimo, não anônimo puro. Diferente de pesquisas_satisfacao
--   e ouvidoria_manifestacoes (que não guardam NENHUM identificador), aqui é
--   preciso um id estável por respondente para detectar "3 semanas seguidas".
--   Guardamos `device_id`: um UUID aleatório gerado no navegador (localStorage),
--   SEM nome, e-mail, IP ou vínculo com auth.users. Não identifica a pessoa, mas
--   é um pseudônimo persistente — decisão de produto tomada de propósito. O
--   `setor` é opcional e serve para o alerta ser acionável ("alguém do setor X").
--
-- Escrita pública: só via RPC `registrar_pulse` (SECURITY DEFINER). O anon NÃO
--   escreve direto nas tabelas — a RPC valida, grava a resposta e cria o alerta
--   (que é read-only para o RH). Leitura/gestão só RH/superuser TI.
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- 1. Respostas do pulse
-- ----------------------------------------------------------------------------

create table if not exists public.pulse_respostas (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  humor smallint not null
    constraint check_humor_pulse check (humor between 1 and 4),
  setor text,
  semana_iso text not null,               -- ex.: '2026-W30' (ISO year-week)
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null,
  -- Uma resposta por dispositivo por semana ISO.
  constraint uq_pulse_device_semana unique (device_id, semana_iso)
);

comment on table public.pulse_respostas is
  'Check-in semanal de humor. Pseudônimo: device_id é um UUID de navegador, sem '
  'nome/e-mail/IP. humor 1=😞 2=😕 3=🙂 4=😀. Uma resposta por semana ISO.';

create index if not exists idx_pulse_respostas_semana on public.pulse_respostas(semana_iso);
create index if not exists idx_pulse_respostas_device on public.pulse_respostas(device_id);
create index if not exists idx_pulse_respostas_criado on public.pulse_respostas(criado_em desc);


-- ----------------------------------------------------------------------------
-- 2. Alertas (3×😞 consecutivos)
-- ----------------------------------------------------------------------------

create table if not exists public.pulse_alertas (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  setor text,
  semana_iso text not null,               -- semana que fechou o 3º 😞
  semanas jsonb not null default '[]'::jsonb,  -- as 3 semanas ISO envolvidas
  status text not null default 'novo'
    constraint check_status_pulse_alerta check (status in ('novo', 'visto', 'resolvido')),
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null,
  -- Um alerta por dispositivo por semana-gatilho (evita duplicar no reenvio).
  constraint uq_pulse_alerta_device_semana unique (device_id, semana_iso)
);

comment on table public.pulse_alertas is
  'Alerta automático quando um device_id responde 😞 (humor=1) em 3 semanas ISO '
  'consecutivas. De-identificado: mostra setor, nunca a pessoa.';

create index if not exists idx_pulse_alertas_status on public.pulse_alertas(status);
create index if not exists idx_pulse_alertas_criado on public.pulse_alertas(criado_em desc);


-- ----------------------------------------------------------------------------
-- 3. RPC pública de registro (SECURITY DEFINER)
-- ----------------------------------------------------------------------------
-- Calcula a semana ISO no fuso local (America/Maceio), grava a resposta (uma por
-- semana) e, se fechou 3×😞 consecutivos, cria o alerta. Retorna jsonb.

create or replace function public.registrar_pulse(
  p_device_id text,
  p_humor smallint,
  p_setor text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoje date;
  v_w0 text;
  v_w1 text;
  v_w2 text;
  v_inserted uuid;
  v_neg int;
  v_alerta boolean := false;
begin
  if p_device_id is null or length(trim(p_device_id)) = 0 then
    return jsonb_build_object('success', false, 'error', 'device_id ausente');
  end if;
  if p_humor is null or p_humor < 1 or p_humor > 4 then
    return jsonb_build_object('success', false, 'error', 'humor inválido');
  end if;

  -- Semana ISO atual e as duas anteriores, no fuso local.
  v_hoje := (now() at time zone 'America/Maceio')::date;
  v_w0 := to_char(v_hoje,          'IYYY"-W"IW');
  v_w1 := to_char(v_hoje - 7,      'IYYY"-W"IW');
  v_w2 := to_char(v_hoje - 14,     'IYYY"-W"IW');

  -- Uma resposta por semana: se já respondeu, não sobrescreve.
  insert into public.pulse_respostas (device_id, humor, setor, semana_iso)
  values (p_device_id, p_humor, nullif(trim(p_setor), ''), v_w0)
  on conflict (device_id, semana_iso) do nothing
  returning id into v_inserted;

  if v_inserted is null then
    return jsonb_build_object(
      'success', true,
      'ja_respondeu', true,
      'semana_iso', v_w0,
      'alerta_criado', false
    );
  end if;

  -- Fechou 3 semanas ISO consecutivas em 😞?
  if p_humor = 1 then
    select count(*) into v_neg
    from public.pulse_respostas
    where device_id = p_device_id
      and humor = 1
      and semana_iso in (v_w0, v_w1, v_w2);

    if v_neg >= 3 then
      insert into public.pulse_alertas (device_id, setor, semana_iso, semanas)
      values (
        p_device_id,
        nullif(trim(p_setor), ''),
        v_w0,
        jsonb_build_array(v_w2, v_w1, v_w0)
      )
      on conflict (device_id, semana_iso) do nothing;
      v_alerta := true;
    end if;
  end if;

  return jsonb_build_object(
    'success', true,
    'ja_respondeu', false,
    'semana_iso', v_w0,
    'alerta_criado', v_alerta
  );
end;
$$;

comment on function public.registrar_pulse is
  'Registra a resposta do pulse (uma por semana ISO por device) e cria alerta '
  'automático em 3×😞 consecutivos. SECURITY DEFINER: anon chama via RPC, não '
  'escreve nas tabelas direto.';

grant execute on function public.registrar_pulse(text, smallint, text) to anon, authenticated;


-- ----------------------------------------------------------------------------
-- 4. RLS — leitura/gestão só RH; escrita pública só pela RPC (definer)
-- ----------------------------------------------------------------------------

alter table public.pulse_respostas enable row level security;
alter table public.pulse_alertas enable row level security;

-- Respostas: só RH lê (a RPC definer ignora RLS na escrita).
drop policy if exists "Leitura de pulse_respostas para RH" on public.pulse_respostas;
create policy "Leitura de pulse_respostas para RH"
  on public.pulse_respostas for select
  to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Exclusao de pulse_respostas para RH" on public.pulse_respostas;
create policy "Exclusao de pulse_respostas para RH"
  on public.pulse_respostas for delete
  to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

-- Alertas: RH lê e atualiza status (novo → visto → resolvido).
drop policy if exists "Leitura de pulse_alertas para RH" on public.pulse_alertas;
create policy "Leitura de pulse_alertas para RH"
  on public.pulse_alertas for select
  to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Update de pulse_alertas para RH" on public.pulse_alertas;
create policy "Update de pulse_alertas para RH"
  on public.pulse_alertas for update
  to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com')
  with check (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Exclusao de pulse_alertas para RH" on public.pulse_alertas;
create policy "Exclusao de pulse_alertas para RH"
  on public.pulse_alertas for delete
  to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

notify pgrst, 'reload schema';
