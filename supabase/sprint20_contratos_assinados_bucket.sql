-- ----------------------------------------------------------------------------
-- SPRINT 20 — BUCKET contratos-assinados (destrava a assinatura de contrato)
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor. Idempotente.
--
-- PROBLEMA: a Edge Function gerar-contrato-pdf salva o PDF assinado em
--   storage.buckets 'contratos-assinados', mas NENHUMA migration criava esse
--   bucket (só 'documentos-envios' era criado em fix_admissao_storage_policy).
--   Sem o bucket, o upload estoura "Bucket not found" e TODA assinatura falha
--   com 500 — em qualquer modelo. Este script cria o bucket.
--
-- A função usa a service-role key (ignora RLS), então para ASSINAR/SALVAR basta
--   o bucket existir. A policy de SELECT abaixo é para o RH conseguir ABRIR /
--   IMPRIMIR o PDF pelo portal (createSignedUrl no cliente, autenticado).
--
-- OBS: se o `create policy ... on storage.objects` der erro de owner no SQL
--   Editor, crie a policy pela UI (Storage → Policies → contratos-assinados):
--   SELECT para o role `authenticated`. O bucket em si (insert acima) sempre
--   funciona pelo SQL Editor.
-- ----------------------------------------------------------------------------

-- 1. Cria o bucket privado (idempotente)
insert into storage.buckets (id, name, public)
values ('contratos-assinados', 'contratos-assinados', false)
on conflict (id) do nothing;

-- 2. Leitura para autenticados (RH abre/imprime o contrato assinado)
drop policy if exists "Leitura de contratos-assinados para autenticados" on storage.objects;
create policy "Leitura de contratos-assinados para autenticados"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'contratos-assinados');
