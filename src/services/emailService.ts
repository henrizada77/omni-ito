import { supabase } from '../supabaseClient';

export interface EnviarEmailParams {
  to: string;
  nome: string;
  tipo: 'parabens_aniversario' | 'copia_documento' | 'boas_vindas' | 'comunicado_rh';
  assunto?: string;
  mensagem?: string;
  linkDocumento?: string;
}

/**
 * Dispara um e-mail corporativo formatado através da Edge Function enviar-email do Supabase.
 */
export async function enviarEmailCorporativo(params: EnviarEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

    const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enviar-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(params)
    });

    if (!resp.ok) {
      const e = await resp.json().catch(() => ({}));
      throw new Error(e.error || 'Falha ao enviar e-mail.');
    }

    return { success: true };
  } catch (err: any) {
    console.error('Erro ao enviar e-mail corporativo:', err);
    return { success: false, error: err.message || 'Erro inesperado ao disparar e-mail.' };
  }
}
