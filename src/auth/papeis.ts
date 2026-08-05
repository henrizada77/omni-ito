// Quem enxerga o quê no painel.
//
// A regra morava em três lugares: a allowlist de rotas em App.tsx, a montagem da
// sidebar no Dashboard e os atalhos da paleta de comandos. Três cópias, e a da
// paleta já havia divergido — ela oferecia Folha de Pagamento e busca de
// colaborador por nome a qualquer autenticado, incluindo o auditor de TI.
//
// Com o papel `diretoria`, que abre UMA aba, essa divergência deixaria de ser
// incômodo e viraria vazamento. Por isso a lista passou a ser única e os três
// consumidores derivam dela.

export type Papel = 'coordenadora_rh' | 'ti' | 'diretoria';

// Exceção nominal herdada: esta conta é o admin de TI e continua com alcance de
// coordenadora mesmo com `cargo = 'ti'` no banco. O sprint37 criou o papel
// `superadmin` para aposentar o literal, mas o script traz um "edite antes de
// rodar" no meio e não há como saber daqui se ele rodou em produção. Removendo o
// literal, essa conta perderia o painel. Sai junto com o literal das policies,
// quando alguém confirmar que o sprint37 foi aplicado.
export const EMAIL_ADMIN_TI = 'ito.thiagosilva@gmail.com';

// Ordem importa: é a ordem dos links na sidebar, e o primeiro item é para onde o
// papel cai ao entrar em /app.
export const ROTAS_POR_PAPEL: Record<Papel, readonly string[]> = {
  coordenadora_rh: [
    '/app/dashboard',
    '/app/colaboradores',
    '/app/onboarding',
    '/app/documentos',
    '/app/beneficios',
    '/app/ferias-aso',
    '/app/avaliacoes',
    '/app/cargos',
    '/app/feedback',
    '/app/vagas',
    '/app/funcionario-mes',
    '/app/ponto',
    '/app/riscos',
    '/app/folha',
    '/app/agenda',
    '/app/cultura',
    '/app/analytics'
  ],
  // A diretoria acompanha o clima do time. Nada de cadastro, folha ou risco.
  diretoria: ['/app/feedback'],
  // Auditor de TI: métricas agregadas, sem dado individual.
  ti: ['/app/analytics']
};

export function papelEfetivo(papel: Papel, email?: string | null): Papel {
  return email === EMAIL_ADMIN_TI ? 'coordenadora_rh' : papel;
}

export function rotasPermitidas(papel: Papel, email?: string | null): readonly string[] {
  return ROTAS_POR_PAPEL[papelEfetivo(papel, email)] ?? [];
}

export function podeVerRota(papel: Papel, path: string, email?: string | null): boolean {
  return rotasPermitidas(papel, email).includes(path);
}

// Destino de /app. Cai no 403 se um papel ficar sem rota nenhuma — melhor a tela
// de acesso negado do que um redirect em loop.
export function rotaInicial(papel: Papel, email?: string | null): string {
  return rotasPermitidas(papel, email)[0] ?? '/403';
}
