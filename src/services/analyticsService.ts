import { supabase } from '../supabaseClient';
import { filtrarColaboradoresElegiveis } from '../utils/colaboradoresFiltro';

/**
 * Serviço isolado para busca de métricas e analytics.
 */

export interface AnalyticsBundle {
  logs: any[];
  colaboradores: any[];
  ocorrencias: any[];
  indicadores: any[];
  beneficios: any[];
  colaboradorBeneficios: any[];
  pesquisas: any[];
  cargos: any[];
}

export async function carregarDadosAnalytics(): Promise<AnalyticsBundle> {
  const [logsRes, colabsRes, ocorrenciasRes, indicadoresRes, benefitsRes, assocRes, pesquisasRes, cargosRes] = await Promise.all([
    supabase.from('logs_auditoria').select('*').order('criado_em', { ascending: false }).limit(8),
    supabase.from('colaboradores').select('*'),
    supabase.from('ocorrencias_jornada').select('*, colaboradores(nome, setor)'),
    supabase.from('indicadores_trabalhistas').select('*'),
    supabase.from('beneficios').select('*'),
    supabase.from('colaborador_beneficios').select('*'),
    supabase.from('pesquisas_satisfacao').select('nota, categoria, criado_em'),
    supabase.from('cargos').select('titulo, referencia_salarial_al, referencia_salarial_fonte, referencia_salarial_data')
  ]);

  return {
    logs: logsRes.data || [],
    colaboradores: filtrarColaboradoresElegiveis(colabsRes.data || []),
    ocorrencias: ocorrenciasRes.data || [],
    indicadores: indicadoresRes.data || [],
    beneficios: benefitsRes.data || [],
    colaboradorBeneficios: assocRes.data || [],
    pesquisas: pesquisasRes.data || [],
    cargos: cargosRes.data || [],
  };
}
