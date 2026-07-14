-- Migration: Sprint 8 Admission Form
-- Add ficha_admissao and documentos_anexos to colaboradores table
alter table public.colaboradores add column if not exists ficha_admissao jsonb;
alter table public.colaboradores add column if not exists documentos_anexos jsonb;
