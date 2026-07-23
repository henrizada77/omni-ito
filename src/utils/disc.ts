export type Fator = 'D' | 'I' | 'S' | 'C';

export interface BlocoDISC {
  adjetivos: { texto: string; fator: Fator }[]; // sempre 4, um por fator
}

export interface RespostaBloco {
  bloco: number;      // índice 0..23
  mais: Fator;        // adjetivo que MAIS combina
  menos: Fator;       // adjetivo que MENOS combina
}

export interface ResultadoDISC {
  pressao: Record<Fator, number>;  // contagem de "MAIS" por fator
  natural: Record<Fator, number>;  // contagem de "MENOS" por fator
  net: Record<Fator, number>;      // pressao - natural
  dominante: Fator;
}

// 24 blocos; cada bloco tem exatamente um adjetivo D, um I, um S e um C.
export const BLOCOS: BlocoDISC[] = [
  { adjetivos: [{ texto: 'Decidido', fator: 'D' }, { texto: 'Animado', fator: 'I' }, { texto: 'Paciente', fator: 'S' }, { texto: 'Cauteloso', fator: 'C' }] },
  { adjetivos: [{ texto: 'Competitivo', fator: 'D' }, { texto: 'Comunicativo', fator: 'I' }, { texto: 'Calmo', fator: 'S' }, { texto: 'Preciso', fator: 'C' }] },
  { adjetivos: [{ texto: 'Ousado', fator: 'D' }, { texto: 'Persuasivo', fator: 'I' }, { texto: 'Leal', fator: 'S' }, { texto: 'Analítico', fator: 'C' }] },
  { adjetivos: [{ texto: 'Direto', fator: 'D' }, { texto: 'Otimista', fator: 'I' }, { texto: 'Prestativo', fator: 'S' }, { texto: 'Detalhista', fator: 'C' }] },
  { adjetivos: [{ texto: 'Determinado', fator: 'D' }, { texto: 'Sociável', fator: 'I' }, { texto: 'Estável', fator: 'S' }, { texto: 'Organizado', fator: 'C' }] },
  { adjetivos: [{ texto: 'Assertivo', fator: 'D' }, { texto: 'Entusiasmado', fator: 'I' }, { texto: 'Cooperativo', fator: 'S' }, { texto: 'Metódico', fator: 'C' }] },
  { adjetivos: [{ texto: 'Corajoso', fator: 'D' }, { texto: 'Expressivo', fator: 'I' }, { texto: 'Tranquilo', fator: 'S' }, { texto: 'Rigoroso', fator: 'C' }] },
  { adjetivos: [{ texto: 'Exigente', fator: 'D' }, { texto: 'Espontâneo', fator: 'I' }, { texto: 'Compreensivo', fator: 'S' }, { texto: 'Perfeccionista', fator: 'C' }] },
  { adjetivos: [{ texto: 'Firme', fator: 'D' }, { texto: 'Divertido', fator: 'I' }, { texto: 'Confiável', fator: 'S' }, { texto: 'Disciplinado', fator: 'C' }] },
  { adjetivos: [{ texto: 'Independente', fator: 'D' }, { texto: 'Extrovertido', fator: 'I' }, { texto: 'Gentil', fator: 'S' }, { texto: 'Sistemático', fator: 'C' }] },
  { adjetivos: [{ texto: 'Objetivo', fator: 'D' }, { texto: 'Inspirador', fator: 'I' }, { texto: 'Amável', fator: 'S' }, { texto: 'Criterioso', fator: 'C' }] },
  { adjetivos: [{ texto: 'Enérgico', fator: 'D' }, { texto: 'Falante', fator: 'I' }, { texto: 'Sereno', fator: 'S' }, { texto: 'Reservado', fator: 'C' }] },
  { adjetivos: [{ texto: 'Ambicioso', fator: 'D' }, { texto: 'Carismático', fator: 'I' }, { texto: 'Colaborador', fator: 'S' }, { texto: 'Formal', fator: 'C' }] },
  { adjetivos: [{ texto: 'Resoluto', fator: 'D' }, { texto: 'Alegre', fator: 'I' }, { texto: 'Modesto', fator: 'S' }, { texto: 'Lógico', fator: 'C' }] },
  { adjetivos: [{ texto: 'Dominante', fator: 'D' }, { texto: 'Convincente', fator: 'I' }, { texto: 'Constante', fator: 'S' }, { texto: 'Ponderado', fator: 'C' }] },
  { adjetivos: [{ texto: 'Audacioso', fator: 'D' }, { texto: 'Popular', fator: 'I' }, { texto: 'Acolhedor', fator: 'S' }, { texto: 'Meticuloso', fator: 'C' }] },
  { adjetivos: [{ texto: 'Impaciente', fator: 'D' }, { texto: 'Impulsivo', fator: 'I' }, { texto: 'Pacífico', fator: 'S' }, { texto: 'Prudente', fator: 'C' }] },
  { adjetivos: [{ texto: 'Franco', fator: 'D' }, { texto: 'Emotivo', fator: 'I' }, { texto: 'Bondoso', fator: 'S' }, { texto: 'Exato', fator: 'C' }] },
  { adjetivos: [{ texto: 'Vigoroso', fator: 'D' }, { texto: 'Comunicador', fator: 'I' }, { texto: 'Equilibrado', fator: 'S' }, { texto: 'Conservador', fator: 'C' }] },
  { adjetivos: [{ texto: 'Iniciador', fator: 'D' }, { texto: 'Aberto', fator: 'I' }, { texto: 'Discreto', fator: 'S' }, { texto: 'Cuidadoso', fator: 'C' }] },
  { adjetivos: [{ texto: 'Realizador', fator: 'D' }, { texto: 'Empolgado', fator: 'I' }, { texto: 'Ameno', fator: 'S' }, { texto: 'Racional', fator: 'C' }] },
  { adjetivos: [{ texto: 'Intenso', fator: 'D' }, { texto: 'Efusivo', fator: 'I' }, { texto: 'Dócil', fator: 'S' }, { texto: 'Regrado', fator: 'C' }] },
  { adjetivos: [{ texto: 'Combativo', fator: 'D' }, { texto: 'Espirituoso', fator: 'I' }, { texto: 'Fiel', fator: 'S' }, { texto: 'Minucioso', fator: 'C' }] },
  { adjetivos: [{ texto: 'Voluntarioso', fator: 'D' }, { texto: 'Radiante', fator: 'I' }, { texto: 'Ponderador', fator: 'S' }, { texto: 'Cerimonioso', fator: 'C' }] }
];

const ZERO = (): Record<Fator, number> => ({ D: 0, I: 0, S: 0, C: 0 });
const ORDEM: Fator[] = ['D', 'I', 'S', 'C'];

export function calcularDISC(respostas: RespostaBloco[]): ResultadoDISC {
  const pressao = ZERO();
  const natural = ZERO();
  for (const r of respostas) {
    pressao[r.mais] += 1;
    natural[r.menos] += 1;
  }
  const net = ZERO();
  for (const f of ORDEM) net[f] = pressao[f] - natural[f];
  let dominante: Fator = 'D';
  for (const f of ORDEM) if (net[f] > net[dominante]) dominante = f;
  return { pressao, natural, net, dominante };
}

export const DESCRICOES: Record<Fator, { titulo: string; texto: string }> = {
  D: { titulo: 'Dominância', texto: 'Foco em resultados, decisão rápida e desafios. Direto e competitivo; pode ser impaciente com detalhes e processos.' },
  I: { titulo: 'Influência', texto: 'Comunicativo, otimista e persuasivo. Motiva pessoas e cria conexões; pode se dispersar em execução e prazos.' },
  S: { titulo: 'Estabilidade', texto: 'Paciente, leal e cooperativo. Valoriza rotina e harmonia; pode resistir a mudanças bruscas.' },
  C: { titulo: 'Conformidade', texto: 'Analítico, preciso e organizado. Preza qualidade e regras; pode ser excessivamente crítico ou cauteloso.' }
};
