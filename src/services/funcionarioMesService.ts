import { supabase } from '../supabaseClient';

export interface Rodada {
  id: string;
  competencia: string;
  titulo: string | null;
  data_fim: string;
  status: 'aberta' | 'fechada';
  top3: any[] | null;
  fechada_em: string | null;
  criado_em: string;
}

export interface Voto {
  id: string;
  votante_id: string;
  votado_id: string;
  criado_em?: string;
}

/**
 * Serviço isolado para gerenciamento das rodadas e votos do Funcionário do Mês.
 */

export async function buscarUltimaRodada(): Promise<Rodada | null> {
  const { data, error } = await supabase
    .from('funcionario_mes_rodadas')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Erro ao buscar última rodada do Funcionário do Mês:', error);
    return null;
  }

  return (data?.[0] as Rodada) || null;
}

export async function listarVotosRodada(rodadaId: string): Promise<Voto[]> {
  const { data, error } = await supabase
    .from('funcionario_mes_votos')
    .select('id, rodada_id, votante_id, votado_id, criado_em')
    .eq('rodada_id', rodadaId);

  if (error) {
    console.error(`Erro ao listar votos da rodada ${rodadaId}:`, error);
    return [];
  }

  return (data as Voto[]) || [];
}

export async function atualizarPrazoRodada(rodadaId: string, dataFim: string, titulo?: string): Promise<boolean> {
  const { error } = await supabase
    .from('funcionario_mes_rodadas')
    .update({ data_fim: dataFim, titulo: titulo?.trim() || null })
    .eq('id', rodadaId);

  if (error) {
    console.error(`Erro ao atualizar prazo da rodada ${rodadaId}:`, error);
    return false;
  }

  return true;
}
