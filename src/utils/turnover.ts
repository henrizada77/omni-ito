// Turnover semestral (fórmula clássica RH). Puro, sem I/O.
// Fontes: colaboradores (snapshot) + movimentacoes_pessoal (log da planilha).
// Dedupe sempre por CPF (só dígitos) para não contar a mesma pessoa 2x.

export type Semestre = { ano: number; s: 1 | 2; label: string; inicio: string; fim: string };

export const cpfDigits = (cpf: string | null | undefined): string =>
  (cpf ?? '').replace(/\D/g, '');

// Identidade de uma pessoa para dedupe: CPF-dígitos, ou uma chave própria
// quando não há CPF (nunca colide com um CPF real).
const identidade = (reg: any, fallbackPrefix: string, idx: number): string => {
  const c = cpfDigits(reg?.cpf);
  return c !== '' ? c : `${fallbackPrefix}:${reg?.nome ?? ''}:${idx}`;
};

const semestreDeData = (iso: string): { ano: number; s: 1 | 2 } => {
  const ano = Number(iso.slice(0, 4));
  const mes = Number(iso.slice(5, 7));
  return { ano, s: mes <= 6 ? 1 : 2 };
};

const boundsSemestre = (ano: number, s: 1 | 2): { inicio: string; fim: string } =>
  s === 1
    ? { inicio: `${ano}-01-01`, fim: `${ano}-06-30` }
    : { inicio: `${ano}-07-01`, fim: `${ano}-12-31` };

export const listarSemestres = (dataMinISO: string, hojeISO: string): Semestre[] => {
  const min = semestreDeData(dataMinISO);
  const cur = semestreDeData(hojeISO);
  const out: Semestre[] = [];
  let ano = min.ano;
  let s: 1 | 2 = min.s;
  while (ano < cur.ano || (ano === cur.ano && s <= cur.s)) {
    const b = boundsSemestre(ano, s);
    out.push({ ano, s, label: `S${s} ${ano}`, inicio: b.inicio, fim: b.fim });
    if (s === 1) { s = 2; } else { s = 1; ano += 1; }
  }
  return out;
};

// Ativo numa data D:
//  colaboradores: admitido <= D e (não desligado ou desligado depois de D)
//  movimentacoes: admitido <= D e (sem demissão ou demissão depois de D)
export const headcountEm = (dataISO: string, colaboradores: any[], movimentacoes: any[]): number => {
  const ativos = new Set<string>();
  colaboradores.forEach((c, i) => {
    if (!c || !c.data_admissao) return;
    const adm = String(c.data_admissao).slice(0, 10);
    if (adm > dataISO) return;
    const deslig = c.data_desligamento ? String(c.data_desligamento).slice(0, 10) : null;
    const saiu = c.status === 'desligado' && deslig && deslig <= dataISO;
    if (!saiu) ativos.add(identidade(c, 'colab', i));
  });
  movimentacoes.forEach((m, i) => {
    if (!m || !m.data_admissao) return;
    const adm = String(m.data_admissao).slice(0, 10);
    if (adm > dataISO) return;
    const dem = m.data_demissao ? String(m.data_demissao).slice(0, 10) : null;
    if (!dem || dem > dataISO) ativos.add(identidade(m, 'mov', i));
  });
  return ativos.size;
};

// Admissões/demissões no intervalo [inicio, fim], dedupe por identidade+evento.
const contarEventos = (
  colaboradores: any[], movimentacoes: any[], inicio: string, fim: string
): { admissoes: number; demissoes: number } => {
  const adm = new Set<string>();
  const dem = new Set<string>();
  const push = (reg: any, prefix: string, idx: number) => {
    if (!reg) return;
    const id = identidade(reg, prefix, idx);
    const a = reg.data_admissao ? String(reg.data_admissao).slice(0, 10) : null;
    if (a && a >= inicio && a <= fim) adm.add(id);
    const dField = reg.data_demissao ?? reg.data_desligamento ?? null;
    const d = dField ? String(dField).slice(0, 10) : null;
    const isDeslig = reg.data_demissao != null || reg.status === 'desligado';
    if (isDeslig && d && d >= inicio && d <= fim) dem.add(id);
  };
  colaboradores.forEach((c, i) => push(c, 'colab', i));
  movimentacoes.forEach((m, i) => push(m, 'mov', i));
  return { admissoes: adm.size, demissoes: dem.size };
};

export const turnoverSemestre = (
  sem: Semestre, colaboradores: any[], movimentacoes: any[]
): { admissoes: number; demissoes: number; efetivoMedio: number; taxa: number } => {
  const { admissoes, demissoes } = contarEventos(colaboradores, movimentacoes, sem.inicio, sem.fim);
  const hIni = headcountEm(sem.inicio, colaboradores, movimentacoes);
  const hFim = headcountEm(sem.fim, colaboradores, movimentacoes);
  const efetivoMedio = (hIni + hFim) / 2;
  const taxa = efetivoMedio > 0 ? ((admissoes + demissoes) / 2) / efetivoMedio * 100 : 0;
  return { admissoes, demissoes, efetivoMedio, taxa };
};
