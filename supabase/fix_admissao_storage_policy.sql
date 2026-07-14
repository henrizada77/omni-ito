-- =============================================================
-- FIX: Permitir upload anônimo de documentos de admissão
-- =============================================================
-- Problema: O formulário de admissão é público (rota /admissao/:token)
-- e o candidato não está autenticado. A policy atual exige role
-- 'coordenadora_rh', bloqueando o upload com "Bucket not found".
-- 
-- Solução: Adicionar policy de INSERT para role 'anon' restrita
-- ao path 'admissao/' dentro do bucket 'documentos-envios'.
-- =============================================================

-- Garante que o bucket existe
insert into storage.buckets (id, name, public) 
values ('documentos-envios', 'documentos-envios', false)
on conflict (id) do nothing;

-- Remove policy anterior se existir (evita duplicata)
drop policy if exists "Permitir upload de admissao por candidatos anonimos" on storage.objects;

-- Nova policy: candidatos anônimos podem fazer INSERT apenas no path admissao/
create policy "Permitir upload de admissao por candidatos anonimos"
  on storage.objects for insert
  to anon
  with check (
    bucket_id = 'documentos-envios'
    and (storage.foldername(name))[1] = 'admissao'
  );
