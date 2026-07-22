// Prazos legais de desligamento.
// Aviso prévio proporcional (Lei 12.506/2011): 30 dias + 3 por ano completo
// de casa, teto 90 — só quando o empregador desliga sem justa causa. No
// pedido de demissão o aviso é do empregado: 30 dias fixos.
// Pagamento das verbas: até 10 dias corridos do término do contrato
// (CLT art. 477, §6º).

export type TipoDesligamento = 'sem_justa_causa' | 'pedido_demissao';
export type ModalidadeAviso = 'trabalhado' | 'indenizado_ou_dispensado';

export interface PrazosDesligamento {
  diasAviso: number;
  dataTermino: string;
  dataLimitePagamento: string;
}

const addDaysISO = (iso: string, days: number): string => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export const anosCompletos = (dataAdmissao: string, dataRef: string): number => {
  const adm = new Date(dataAdmissao + 'T12:00:00');
  const ref = new Date(dataRef + 'T12:00:00');
  if (isNaN(adm.getTime()) || isNaN(ref.getTime())) return 0;
  let anos = ref.getFullYear() - adm.getFullYear();
  const aniv = new Date(adm);
  aniv.setFullYear(adm.getFullYear() + anos);
  if (aniv > ref) anos -= 1;
  return Math.max(0, anos);
};

export const calcularPrazosDesligamento = (
  tipo: TipoDesligamento,
  modalidade: ModalidadeAviso,
  dataComunicacao: string,
  dataAdmissao: string | null | undefined
): PrazosDesligamento => {
  const anos = dataAdmissao ? anosCompletos(dataAdmissao, dataComunicacao) : 0;
  const diasAviso = tipo === 'sem_justa_causa' ? Math.min(30 + 3 * anos, 90) : 30;
  const dataTermino =
    modalidade === 'trabalhado' ? addDaysISO(dataComunicacao, diasAviso) : dataComunicacao;
  const dataLimitePagamento = addDaysISO(dataTermino, 10);
  return { diasAviso, dataTermino, dataLimitePagamento };
};
