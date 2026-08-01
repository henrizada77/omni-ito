import { supabase } from '../supabaseClient';
import { filtrarColaboradoresElegiveis } from '../utils/colaboradoresFiltro';
import type { Colaborador } from '../types';

/**
 * Serviço isolado para acesso aos dados de Colaboradores.
 */

export async function listarColaboradoresElegiveis(): Promise<Colaborador[]> {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('*')
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao listar colaboradores:', error);
    throw error;
  }

  return filtrarColaboradoresElegiveis(data || []);
}

export async function buscarColaboradorPorId(id: string): Promise<Colaborador | null> {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Erro ao buscar colaborador ${id}:`, error);
    return null;
  }

  return data;
}

export async function atualizarColaborador(id: string, campos: Partial<Colaborador>): Promise<Colaborador> {
  const { data, error } = await supabase
    .from('colaboradores')
    .update(campos)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Erro ao atualizar colaborador ${id}:`, error);
    throw error;
  }

  return data;
}

export async function criarColaborador(dados: Partial<Colaborador>): Promise<Colaborador> {
  const { data, error } = await supabase
    .from('colaboradores')
    .insert(dados)
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar colaborador:', error);
    throw error;
  }

  return data;
}
