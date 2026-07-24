-- Organograma editável (híbrido: caixas livres que podem apontar p/ um colaborador)
-- Rode este arquivo no SQL Editor do Supabase. Idempotente + seed só se vazio.

create table if not exists organograma_nos (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references organograma_nos(id) on delete cascade,
  titulo text not null,
  subtitulo text,
  colaborador_id uuid,            -- vínculo opcional a colaboradores.id (sem FK rígida p/ evitar mismatch de tipo)
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_organograma_parent on organograma_nos(parent_id);

alter table organograma_nos enable row level security;

drop policy if exists "organograma leitura" on organograma_nos;
create policy "organograma leitura" on organograma_nos for select using (true);
drop policy if exists "organograma escrita" on organograma_nos;
create policy "organograma escrita" on organograma_nos for all using (true) with check (true);

-- Seed com a estrutura do print (só roda se a tabela estiver vazia)
do $$
declare
  ceo uuid; diretora uuid; gerente uuid;
  enf uuid; atend uuid; fin uuid; fin_analista uuid;
begin
  if (select count(*) from organograma_nos) > 0 then
    return;
  end if;

  insert into organograma_nos (titulo, ordem) values ('CEO', 0) returning id into ceo;
  insert into organograma_nos (titulo, parent_id, ordem) values ('Diretora Geral', ceo, 0) returning id into diretora;
  insert into organograma_nos (titulo, parent_id, ordem) values ('Gerente Geral', diretora, 0) returning id into gerente;

  insert into organograma_nos (titulo, parent_id, ordem) values ('Coordenador Enfermagem', gerente, 0) returning id into enf;
  insert into organograma_nos (titulo, parent_id, ordem) values ('Biomédicas', enf, 0);
  insert into organograma_nos (titulo, parent_id, ordem) values ('Técnicas de Enfermagem', enf, 1);

  insert into organograma_nos (titulo, parent_id, ordem) values ('Nutrição', gerente, 1);
  insert into organograma_nos (titulo, parent_id, ordem) values ('Marketing', gerente, 2);

  insert into organograma_nos (titulo, parent_id, ordem) values ('Coordenadora de Atendimento', gerente, 3) returning id into atend;
  insert into organograma_nos (titulo, parent_id, ordem) values ('Recepção', atend, 0);
  insert into organograma_nos (titulo, parent_id, ordem) values ('Call Center', atend, 1);

  insert into organograma_nos (titulo, parent_id, ordem) values ('Coordenadora RH', gerente, 4);
  insert into organograma_nos (titulo, parent_id, ordem) values ('Farmácia', gerente, 5);

  insert into organograma_nos (titulo, parent_id, ordem) values ('Coordenadora Financeiro', gerente, 6) returning id into fin;
  insert into organograma_nos (titulo, subtitulo, parent_id, ordem) values ('Financeiro', 'Analista Financeiro', fin, 0) returning id into fin_analista;
  insert into organograma_nos (titulo, subtitulo, parent_id, ordem) values ('Financeiro', 'Assistente Financeiro', fin_analista, 0);
  insert into organograma_nos (titulo, subtitulo, parent_id, ordem) values ('Compras', 'Analista de compras e estoque', fin, 1);

  insert into organograma_nos (titulo, parent_id, ordem) values ('Serviços Gerais', gerente, 7);
end $$;
