// Constantes e tipos de endomarketing.
//
// Vivem fora do EndomarketingManager porque o Dashboard precisa da cor por
// categoria para pintar o dot no calendário principal — e o manager é
// carregado com lazy(). Importar dele arrastaria o chunk inteiro só por um mapa.

export const CATEGORIAS_ENDOMARKETING = [
  'Campanha',
  'Comemoração',
  'Treinamento',
  'Integração',
  'Saúde & Bem-estar',
  'Comunicado',
  'Outro'
] as const;

export type CategoriaEndomarketing = (typeof CATEGORIAS_ENDOMARKETING)[number];

export type StatusEndomarketing = 'planejada' | 'em_andamento' | 'concluida' | 'cancelada';

export interface AcaoEndomarketing {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: CategoriaEndomarketing;
  status: StatusEndomarketing;
  responsavel: string | null;
  /** Dias avulsos em ISO 'AAAA-MM-DD'. */
  dias: string[];
  criado_por_email: string | null;
  criado_em: string;
}

/** Cor do dot por categoria — usada na lista, na legenda e no calendário. */
export const COR_CATEGORIA: Record<CategoriaEndomarketing, string> = {
  'Campanha': 'bg-fuchsia-500',
  'Comemoração': 'bg-orange-500',
  'Treinamento': 'bg-cyan-500',
  'Integração': 'bg-lime-500',
  'Saúde & Bem-estar': 'bg-teal-500',
  'Comunicado': 'bg-indigo-500',
  'Outro': 'bg-slate-500'
};

export const STATUS_LABEL_ENDOMARKETING: Record<StatusEndomarketing, string> = {
  planejada: 'Planejada',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada'
};

/** Fallback seguro: categoria fora da lista (dado antigo) não quebra a cor. */
export const corDaCategoria = (c: string) =>
  COR_CATEGORIA[c as CategoriaEndomarketing] || COR_CATEGORIA.Outro;
