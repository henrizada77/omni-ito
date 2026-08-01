/**
 * Utilitário central de filtragem de colaboradores.
 * 
 * Regra de negócio:
 * Colaboradores pertencentes ao setor 'SMARTSHAPE' (e suas variações de grafia)
 * ou ocupantes de cargos/setores 'CEO' e 'DIRETORIA' (e derivados)
 * NÃO devem ser exibidos na listagem geral de colaboradores nem contabilizados em relatórios/analytics.
 */

export interface ColaboradorFiltravel {
  setor?: string | null;
  cargo?: string | null;
  [key: string]: any;
}

/**
 * Retorna true se o colaborador pertencer aos grupos que devem ser desconsiderados (SMARTSHAPE, CEO, DIRETORIA).
 */
export function isColaboradorIgnorado(c: ColaboradorFiltravel | null | undefined): boolean {
  if (!c) return false;

  const setorUpper = (c.setor || '').trim().toUpperCase();
  const cargoUpper = (c.cargo || '').trim().toUpperCase();

  // 1. Setor Smartshape
  if (setorUpper.includes('SMARTSHAPE') || setorUpper.includes('SMART SHAPE')) {
    return true;
  }

  // 2. CEO / Diretoria (cargo ou setor)
  if (
    cargoUpper === 'CEO' ||
    cargoUpper.includes('DIRETORIA') ||
    cargoUpper.includes('DIRETOR') ||
    cargoUpper.includes('DIRETORA') ||
    setorUpper.includes('DIRETORIA')
  ) {
    return true;
  }

  return false;
}

/**
 * Retorna true se o colaborador puder ser listado e contabilizado em relatórios.
 */
export function isColaboradorElegivel(c: ColaboradorFiltravel | null | undefined): boolean {
  return !isColaboradorIgnorado(c);
}

/**
 * Filtra uma lista de colaboradores mantendo apenas os elegíveis para listagens e relatórios.
 */
export function filtrarColaboradoresElegiveis<T extends ColaboradorFiltravel>(lista: T[] | null | undefined): T[] {
  if (!Array.isArray(lista)) return [];
  return lista.filter(isColaboradorElegivel);
}
