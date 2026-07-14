-- Migration: Sprint 9 - Security Hardening RLS Policies & RPCs
-- Prevents public/anon access to sensitive tables by exposing only targeted SECURITY DEFINER RPCs

-- =========================================================================
-- 1. Create SECURITY DEFINER RPCs for Candidato Admission workflow
-- =========================================================================

-- Function: get_admission_token_by_token
CREATE OR REPLACE FUNCTION public.get_admission_token_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  candidato_nome text,
  candidato_email text,
  candidato_cpf text,
  candidato_cargo text,
  candidato_setor text,
  status text,
  detalhes jsonb,
  expira_em timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.candidato_nome,
    t.candidato_email,
    t.candidato_cpf,
    t.candidato_cargo,
    t.candidato_setor,
    t.status,
    t.detalhes,
    t.expira_em
  FROM public.admission_tokens t
  WHERE t.token::text = p_token
    AND t.expira_em > now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: mark_admission_token_viewed
CREATE OR REPLACE FUNCTION public.mark_admission_token_viewed(p_token text)
RETURNS void AS $$
BEGIN
  UPDATE public.admission_tokens
  SET visualizado_em = now()
  WHERE token::text = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: sign_admission_token (Database Transaction Wrapper for Bilateral/Bypass inserts)
CREATE OR REPLACE FUNCTION public.sign_admission_token(
  p_token text,
  p_signature_base64 text,
  p_user_agent text,
  p_signed_url text,
  p_document_hash text
)
RETURNS json AS $$
DECLARE
  v_token_row public.admission_tokens%rowtype;
  v_cpf text;
  v_doc_id uuid;
  v_client_ip text;
BEGIN
  -- Extract real client IP from HTTP headers forwarded by Supabase API gateway
  v_client_ip := split_part(coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', '127.0.0.1'), ',', 1);

  -- 1. Fetch token details securely (locks row to prevent concurrent edits)
  SELECT * INTO v_token_row
  FROM public.admission_tokens
  WHERE token::text = p_token
    AND expira_em > now()
    AND status = 'aguardando_assinatura'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token inválido, expirado ou já assinado.';
  END IF;

  v_cpf := COALESCE(v_token_row.candidato_cpf, v_token_row.detalhes->>'cpf', '000.000.000-00');

  -- 2. Insert into documentos_assinados table (security definer bypasses RLS checks on this table)
  INSERT INTO public.documentos_assinados (
    titulo,
    colaborador_cpf,
    url_arquivo,
    document_hash,
    status,
    assinatura_desenhada,
    ip_address,
    user_agent,
    assinado_em
  ) VALUES (
    'Contrato de Trabalho - ' || v_token_row.candidato_nome,
    v_cpf,
    p_signed_url,
    p_document_hash,
    'aguardando_rh',
    p_signature_base64,
    v_client_ip::inet,
    p_user_agent,
    now()
  ) RETURNING id INTO v_doc_id;

  -- 3. Update token status
  UPDATE public.admission_tokens
  SET status = 'aguardando_assinatura_rh'
  WHERE id = v_token_row.id;

  RETURN json_build_object(
    'success', true,
    'document_id', v_doc_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =========================================================================
-- 2. Hardening RLS Policies for admission_tokens
-- =========================================================================

ALTER TABLE public.admission_tokens ENABLE ROW LEVEL SECURITY;

-- Remove public/anon access policies
DROP POLICY IF EXISTS "Leitura publica de tokens" ON public.admission_tokens;
DROP POLICY IF EXISTS "Update publico de tokens" ON public.admission_tokens;

-- Only authenticated RH/TI can query and perform updates on the table directly
DROP POLICY IF EXISTS "Acesso total de tokens para RH e TI" ON public.admission_tokens;
CREATE POLICY "Acesso total de tokens para RH e TI"
  ON public.admission_tokens
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'coordenadora_rh' OR auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');


-- =========================================================================
-- 3. Hardening RLS Policies for documentos_assinados
-- =========================================================================

ALTER TABLE public.documentos_assinados ENABLE ROW LEVEL SECURITY;

-- Only authenticated RH/TI can query/insert/update/delete records
DROP POLICY IF EXISTS "Acesso total de documentos para RH e TI" ON public.documentos_assinados;
CREATE POLICY "Acesso total de documentos para RH e TI"
  ON public.documentos_assinados
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'coordenadora_rh' OR auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');


-- =========================================================================
-- 4. Audit Log Metadata Automation Trigger (Populates IP/UA automatically)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.trg_fn_log_auditoria_metadata()
RETURNS trigger AS $$
BEGIN
  IF new.ip_address IS NULL THEN
    new.ip_address := split_part(coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', '127.0.0.1'), ',', 1)::inet;
  END IF;
  IF new.user_agent IS NULL THEN
    new.user_agent := coalesce(current_setting('request.headers', true)::json->>'user-agent', 'Sistema');
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_auditoria_metadata ON public.logs_auditoria;
CREATE TRIGGER trg_log_auditoria_metadata
  BEFORE INSERT ON public.logs_auditoria
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_log_auditoria_metadata();

-- Force PostgREST cache reload
NOTIFY pgrst, 'reload schema';
