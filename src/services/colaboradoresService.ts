import { supabase } from '../supabaseClient';
import { filtrarColaboradoresElegiveis } from '../utils/colaboradoresFiltro';
import type { Colaborador } from '../types';

/**
 * Serviço isolado para acesso aos dados de Colaboradores.
 */

export async function listarColaboradoresElegiveis(incluirDesligados = false): Promise<Colaborador[]> {
  let query = supabase
    .from('colaboradores')
    .select('*')
    .order('nome', { ascending: true });

  if (!incluirDesligados) {
    query = query.neq('status', 'desligado');
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao listar colaboradores:', error);
    throw error;
  }

  return filtrarColaboradoresElegiveis(data || []);
}

/**
 * Retorna TODOS os colaboradores ativos para o Funcionário do Mês (inclui perfis fantasmas: SMARTSHAPE, CEO, DIRETORIA).
 * Exclui estritamente colaboradores com status desligado.
 */
export async function listarColaboradoresFuncionarioMes(): Promise<Colaborador[]> {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('*')
    .neq('status', 'desligado')
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao listar colaboradores para Funcionário do Mês:', error);
    throw error;
  }

  return data || [];
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
