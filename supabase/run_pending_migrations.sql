-- =============================================================
-- MIGRATIONS PENDENTES — Rodar no Supabase SQL Editor
-- =============================================================
-- Este script é IDEMPOTENTE: pode ser rodado múltiplas vezes
-- sem duplicar dados ou causar erros.
-- =============================================================

-- ✅ 1. Colunas de Admissão na tabela colaboradores
alter table public.colaboradores add column if not exists ficha_admissao jsonb;
alter table public.colaboradores add column if not exists documentos_anexos jsonb;

-- ✅ 2. Colunas de Benefícios (onboarding checks)
alter table public.colaboradores add column if not exists kit_onboarding boolean default false;
alter table public.colaboradores add column if not exists uniforme_sapato boolean default false;

-- ✅ 3. Coluna de Gênero
alter table public.colaboradores add column if not exists genero text check (genero in ('M', 'F'));
alter table public.colaboradores add column if not exists tipo_desligamento text check (tipo_desligamento in ('Voluntario', 'Involuntario'));

-- ✅ 4. Bucket documentos-envios (uploads de admissão e ocorrências)
insert into storage.buckets (id, name, public)
values ('documentos-envios', 'documentos-envios', false)
on conflict (id) do nothing;

-- ✅ 5. Policy para RH/TI — acesso total ao bucket documentos-envios
drop policy if exists "Permitir controle total do bucket documentos-envios para RH e TI" on storage.objects;
create policy "Permitir controle total do bucket documentos-envios para RH e TI"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'documentos-envios'
    and (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com')
  )
  with check (
    bucket_id = 'documentos-envios'
    and (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com')
  );

-- ✅ 6. Policy para candidatos anônimos — upload apenas em admissao/
drop policy if exists "Permitir upload de admissao por candidatos anonimos" on storage.objects;
create policy "Permitir upload de admissao por candidatos anonimos"
  on storage.objects for insert
  to anon
  with check (
    bucket_id = 'documentos-envios'
    and (storage.foldername(name))[1] = 'admissao'
  );

-- ✅ 7. Tabela de Benefícios
create table if not exists public.beneficios (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  tipo text check (tipo in ('adicional', 'desconto')) not null,
  valor_padrao numeric not null,
  descricao text,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ✅ 8. Tabela de Associações Colaborador x Benefício
create table if not exists public.colaborador_beneficios (
  colaborador_id uuid references public.colaboradores(id) on delete cascade not null,
  beneficio_id uuid references public.beneficios(id) on delete cascade not null,
  valor_customizado numeric,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (colaborador_id, beneficio_id)
);

-- ✅ 9. RLS para beneficios e colaborador_beneficios
alter table public.beneficios enable row level security;
alter table public.colaborador_beneficios enable row level security;

drop policy if exists "Leitura de beneficios para autenticados" on public.beneficios;
create policy "Leitura de beneficios para autenticados"
  on public.beneficios for select to authenticated using (true);

drop policy if exists "Escrita de beneficios restrita a coordenadora de RH e Superuser" on public.beneficios;
create policy "Escrita de beneficios restrita a coordenadora de RH e Superuser"
  on public.beneficios for all to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Leitura de colaborador_beneficios para autenticados" on public.colaborador_beneficios;
create policy "Leitura de colaborador_beneficios para autenticados"
  on public.colaborador_beneficios for select to authenticated using (true);

drop policy if exists "Escrita de colaborador_beneficios restrita a coordenadora de RH e Superuser" on public.colaborador_beneficios;
create policy "Escrita de colaborador_beneficios restrita a coordenadora de RH e Superuser"
  on public.colaborador_beneficios for all to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');
-- ✅ 10. RPC: inserir_colaborador_via_admissao
-- Função SECURITY DEFINER: executa com permissões de superuser do banco,
-- bypassando RLS. Valida que o token existe e está em status válido antes
-- de inserir o colaborador. Pode ser chamada por usuários anônimos.
drop function if exists public.inserir_colaborador_via_admissao(jsonb, text);
create or replace function public.inserir_colaborador_via_admissao(
  p_dados jsonb,
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token_row public.admission_tokens%rowtype;
  v_novo_id uuid;
begin
  -- 1. Valida o token
  select * into v_token_row
  from public.admission_tokens
  where token = p_token
    and status in (
      'pendente_preenchimento',
      'aguardando_assinatura',
      'aguardando_homologacao',
      'aguardando_assinatura_rh'
    )
  limit 1;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Token inválido ou expirado.');
  end if;

  -- 2. Insere o colaborador
  insert into public.colaboradores (
    nome, cpf, rg, cargo, setor, salario, status,
    data_admissao, genero, vale_alimentacao, plano_saude,
    depily, ficha_admissao, documentos_anexos, onboarding_progresso
  )
  values (
    p_dados->>'nome',
    p_dados->>'cpf',
    p_dados->>'rg',
    p_dados->>'cargo',
    p_dados->>'setor',
    p_dados->>'salario',
    coalesce(p_dados->>'status', 'ativo'),
    (p_dados->>'data_admissao')::date,
    p_dados->>'genero',
    coalesce((p_dados->>'vale_alimentacao')::boolean, true),
    coalesce((p_dados->>'plano_saude')::boolean, true),
    coalesce((p_dados->>'depily')::boolean, true),
    p_dados->'ficha_admissao',
    p_dados->'documentos_anexos',
    coalesce((p_dados->>'onboarding_progresso')::integer, 100)
  )
  returning id into v_novo_id;

  -- 3. Marca token como concluído
  update public.admission_tokens
  set status = 'concluido', usado_em = now()
  where token = p_token;

  -- 4. Registra log de auditoria
  insert into public.logs_auditoria (acao, detalhes)
  values (
    'CADASTRO_VIA_FORMULARIO_ADMISSAO',
    jsonb_build_object(
      'colaborador_nome', p_dados->>'nome',
      'cpf', p_dados->>'cpf',
      'colaborador_id', v_novo_id
    )
  );

  return jsonb_build_object('success', true, 'id', v_novo_id);

exception when others then
  return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

-- Permite que usuários anônimos chamem esta função
grant execute on function public.inserir_colaborador_via_admissao(jsonb, text) to anon;

-- ✅ 11. Policy para candidatos anônimos — UPDATE em admission_tokens
-- Já existe no setup original (Update publico de tokens - to anon/public)
-- Mantida para garantir compatibilidade.
drop policy if exists "Update publico de tokens" on public.admission_tokens;
create policy "Update publico de tokens"
  on public.admission_tokens for update
  using (true)
  with check (true);

-- ✅ 12. Policy para candidatos anônimos — INSERT em documentos_assinados
drop policy if exists "Insercao anonima de documentos assinados" on public.documentos_assinados;
create policy "Insercao anonima de documentos assinados"
  on public.documentos_assinados for insert
  to anon
  with check (true);

-- ✅ 13. Policy para candidatos anônimos — INSERT em logs_auditoria
drop policy if exists "Insercao anonima de logs de auditoria" on public.logs_auditoria;
create policy "Insercao anonima de logs de auditoria"
  on public.logs_auditoria for insert
  to anon
  with check (true);

-- ✅ 14. Atualização do Vale Transporte para Desconto de 6%
UPDATE public.beneficios 
SET tipo = 'desconto', 
    valor_padrao = 0.06, 
    descricao = 'Desconto legal de 6% do salário base para Vale Transporte' 
WHERE nome = 'Vale Transporte (VT)';

-- ✅ 15. Colunas de Desligamento na tabela colaboradores
alter table public.colaboradores add column if not exists data_desligamento date;
alter table public.colaboradores add column if not exists motivo_desligamento text;

-- ✅ 16. Correção do trigger de onboarding para respeitar o status 'desligado'
create or replace function public.trg_fn_recalc_onboarding_progress()
returns trigger as $$
declare
  true_count integer := 0;
  total_items integer := 8;
begin
  if new.vale_alimentacao then true_count := true_count + 1; end if;
  if new.plano_saude then true_count := true_count + 1; end if;
  if new.depily then true_count := true_count + 1; end if;
  if new.kit_onboarding then true_count := true_count + 1; end if;
  if new.uniforme_sapato then true_count := true_count + 1; end if;
  if new.entrega_epi then true_count := true_count + 1; end if;
  if new.treinamento_inicial then true_count := true_count + 1; end if;
  if new.cadastro_biometria then true_count := true_count + 1; end if;

  new.onboarding_progresso := (true_count * 100) / total_items;
  
  if new.status = 'desligado' then
    -- Keep status as 'desligado'
  elsif new.onboarding_progresso = 100 then
    new.status := 'ativo';
  else
    new.status := 'pendente';
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_recalc_onboarding_progress on public.colaboradores;
create trigger trg_recalc_onboarding_progress
  before insert or update on public.colaboradores
  for each row execute function public.trg_fn_recalc_onboarding_progress();

-- ✅ 17. Tabelas de Plano de Carreira e Avaliação de Desempenho
create table if not exists public.planos_carreira (
  id uuid primary key default gen_random_uuid(),
  cargo_atual text not null unique,
  proximo_cargo text not null,
  requisito_tempo_meses integer not null default 12,
  requisito_nota_avaliacao numeric not null default 4.0,
  salario_projetado text not null,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.avaliacoes_desempenho (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid references public.colaboradores(id) on delete cascade not null,
  data_avaliacao date not null default current_date,
  nota numeric not null constraint check_nota check (nota between 1.0 and 5.0),
  comentarios text,
  avaliador_email text,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.planos_carreira enable row level security;
alter table public.avaliacoes_desempenho enable row level security;

drop policy if exists "Leitura de planos_carreira para autenticados" on public.planos_carreira;
create policy "Leitura de planos_carreira para autenticados"
  on public.planos_carreira for select to authenticated using (true);

drop policy if exists "Escrita de planos_carreira para coordenadora_rh" on public.planos_carreira;
create policy "Escrita de planos_carreira para coordenadora_rh"
  on public.planos_carreira for all to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Leitura de avaliacoes_desempenho para autenticados" on public.avaliacoes_desempenho;
create policy "Leitura de avaliacoes_desempenho para autenticados"
  on public.avaliacoes_desempenho for select to authenticated using (true);

drop policy if exists "Escrita de avaliacoes_desempenho para coordenadora_rh" on public.avaliacoes_desempenho;
create policy "Escrita de avaliacoes_desempenho para coordenadora_rh"
  on public.avaliacoes_desempenho for all to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

-- Seeding planos_carreira
insert into public.planos_carreira (cargo_atual, proximo_cargo, requisito_tempo_meses, requisito_nota_avaliacao, salario_projetado)
values
  ('Recepcionista', 'Recepcionista Líder', 12, 4.0, 'R$ 2.800,00'),
  ('Operador de Call Center', 'Supervisor de Atendimento', 12, 4.2, 'R$ 2.600,00'),
  ('Auxiliar de Serviços Gerais', 'Líder de Serviços Gerais', 18, 3.8, 'R$ 2.000,00'),
  ('Fisioterapeuta', 'Fisioterapeuta Especialista', 24, 4.5, 'R$ 5.800,00'),
  ('Fisioterapeuta Dermato-Funcional', 'Fisioterapeuta Dermato-Funcional Especialista', 24, 4.5, 'R$ 5.800,00'),
  ('Enfermeiro Esteta', 'Enfermeiro Esteta Sênior', 24, 4.5, 'R$ 6.200,00'),
  ('Farmacêutica Esteta', 'Farmacêutica Esteta Sênior', 24, 4.5, 'R$ 6.500,00'),
  ('Consultora Smartshape', 'Líder de Unidade Smartshape', 18, 4.2, 'R$ 4.200,00')
on conflict (cargo_atual) do update
set proximo_cargo = excluded.proximo_cargo,
    requisito_tempo_meses = excluded.requisito_tempo_meses,
    requisito_nota_avaliacao = excluded.requisito_nota_avaliacao,
    salario_projetado = excluded.salario_projetado;

-- ✅ 18. Custom Coordinate Columns in modelos_documentos
alter table public.modelos_documentos add column if not exists assinatura_coordenadas jsonb;
alter table public.modelos_documentos add column if not exists assinatura_rep_coordenadas jsonb;
alter table public.modelos_documentos add column if not exists tipo_arquivo text default 'texto';

-- Force reload schema cache
notify pgrst, 'reload schema';



