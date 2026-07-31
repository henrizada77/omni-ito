// Autorização das Edge Functions — fonte única.
//
// Antes, esta mesma regra estava copiada nas três funções, e nas três ela dizia:
//
//   profile?.cargo === 'coordenadora_rh'
//   || user.email === 'ito.thiagosilva@gmail.com'
//   || emailDomain === 'itoinstituto.com.br'
//
// Dois problemas, independentes um do outro.
//
// O primeiro: a checagem de domínio contornava o modelo de papéis inteiro.
// Qualquer conta @itoinstituto.com.br gerava contrato e consultava o copiloto
// com contexto de RH — inclusive um perfil 'ti', que o sprint10 criou
// justamente para NÃO ter esse poder. O trigger de cadastro faz todo mundo
// nascer como 'ti' porque promoção é ato administrativo; a linha acima anulava
// essa decisão.
//
// O segundo: um e-mail pessoal do Gmail codificado como superadmin, em três
// arquivos versionados. Revogar exigia editar código e redeployar três funções.
// Agora o poder mora no banco, em perfis.cargo, e revogar é um UPDATE.
//
// Ver docs/AUDITORIA.md, item SEC-03.

/** Papéis que podem acionar as Edge Functions. Só isto decide. */
const CARGOS_AUTORIZADOS = ['coordenadora_rh', 'superadmin'];

export interface ResultadoAutorizacao {
  autorizado: boolean;
  email: string | null;
  cargo: string | null;
}

/**
 * Valida o JWT do chamador e confere o cargo em `perfis`.
 *
 * @param supabase cliente com SERVICE_ROLE — precisa ler `perfis` ignorando RLS
 * @param req      requisição, de onde sai o header Authorization
 */
export async function autorizarRH(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  req: Request
): Promise<ResultadoAutorizacao> {
  const negado: ResultadoAutorizacao = { autorizado: false, email: null, cargo: null };

  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer /, '').trim();
  if (!jwt) return negado;

  const { data: { user }, error } = await supabase.auth.getUser(jwt);
  if (error || !user) return negado;

  const { data: perfil } = await supabase
    .from('perfis')
    .select('cargo')
    .eq('id', user.id)
    .single();

  const cargo = perfil?.cargo ?? null;

  return {
    autorizado: cargo !== null && CARGOS_AUTORIZADOS.includes(cargo),
    email: user.email ?? null,
    cargo
  };
}
