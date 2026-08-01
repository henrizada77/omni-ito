import { supabase } from '../supabaseClient';

/**
 * Serviço isolado para a gestão de Folha de Pagamento e Holerites.
 */

export interface Holerite {
  id: string;
  colaborador_id: string;
  competencia: string;
  salario_base: number;
  proventos: number;
  descontos: number;
  liquido: number;
  criado_em: string;
}

export async function listarHoleritesColaborador(colaboradorId: string): Promise<Holerite[]> {
  const { data, error } = await supabase
    .from('holerites')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .order('competencia', { ascending: false });

  if (error) {
    console.error(`Erro ao buscar holerites para colaborador ${colaboradorId}:`, error);
    return [];
  }

  return data || [];
}

export async function listarDesligamentos(): Promise<any[]> {
  const { data, error } = await supabase
    .from('desligamentos')
    .select('*')
    .order('data_limite_pagamento', { ascending: true });

  if (error) {
    console.error('Erro ao buscar desligamentos:', error);
    return [];
  }

  return data || [];
}
