// Turnover semestral.
//
// A função junta duas fontes que se sobrepõem — `colaboradores` (snapshot
// atual) e `movimentacoes_pessoal` (log importado de planilha) — e a mesma
// pessoa costuma aparecer nas duas. O dedupe por CPF é o coração da coisa:
// sem ele o headcount infla e a taxa desaba, o que faz o indicador mentir para
// baixo justamente quando há muita movimentação.
//
// Ver docs/AUDITORIA.md, item DEV-01.

import { describe, it, expect } from 'vitest';
import { cpfDigits, listarSemestres, headcountEm, turnoverSemestre } from './turnover';

describe('cpfDigits', () => {
  it('mantém só os dígitos', () => {
    expect(cpfDigits('123.456.789-00')).toBe('12345678900');
    expect(cpfDigits('  123 456 789 00 ')).toBe('12345678900');
  });

  it('devolve string vazia para nulo, indefinido ou sem dígito', () => {
    expect(cpfDigits(null)).toBe('');
    expect(cpfDigits(undefined)).toBe('');
    expect(cpfDigits('---')).toBe('');
  });
});

describe('listarSemestres', () => {
  it('vai do semestre da data mínima até o de hoje, inclusive', () => {
    const r = listarSemestres('2025-03-10', '2026-02-01');
    expect(r.map(s => s.label)).toEqual(['S1 2025', 'S2 2025', 'S1 2026']);
  });

  it('devolve um único semestre quando início e fim caem no mesmo', () => {
    const r = listarSemestres('2026-01-05', '2026-06-30');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ ano: 2026, s: 1, inicio: '2026-01-01', fim: '2026-06-30' });
  });

  it('marca a fronteira junho/julho no lugar certo', () => {
    expect(listarSemestres('2026-06-30', '2026-06-30')[0].s).toBe(1);
    expect(listarSemestres('2026-07-01', '2026-07-01')[0].s).toBe(2);
  });

  it('atravessa a virada de ano', () => {
    const r = listarSemestres('2025-12-31', '2026-01-01');
    expect(r.map(s => s.label)).toEqual(['S2 2025', 'S1 2026']);
  });
});

describe('headcountEm', () => {
  it('conta quem já foi admitido e ainda não saiu', () => {
    const colabs = [
      { cpf: '111', nome: 'A', data_admissao: '2025-01-10', status: 'ativo' },
      { cpf: '222', nome: 'B', data_admissao: '2026-03-01', status: 'ativo' } // futuro
    ];
    expect(headcountEm('2026-01-31', colabs, [])).toBe(1);
  });

  it('exclui quem já estava desligado na data', () => {
    const colabs = [
      { cpf: '111', nome: 'A', data_admissao: '2024-01-10', status: 'desligado', data_desligamento: '2025-06-30' }
    ];
    expect(headcountEm('2025-06-30', colabs, [])).toBe(0); // saiu no próprio dia
    expect(headcountEm('2025-06-29', colabs, [])).toBe(1); // véspera, ainda dentro
  });

  it('não conta duas vezes quem aparece nas duas fontes com o mesmo CPF', () => {
    // Este é o caso que motiva o dedupe: a planilha importada e o cadastro
    // atual descrevem a mesma pessoa.
    const colabs = [{ cpf: '123.456.789-00', nome: 'Maria', data_admissao: '2025-01-10', status: 'ativo' }];
    const movs = [{ cpf: '12345678900', nome: 'Maria Silva', data_admissao: '2025-01-10' }];
    expect(headcountEm('2026-01-31', colabs, movs)).toBe(1);
  });

  it('trata pessoas sem CPF como distintas em vez de fundi-las', () => {
    // Duas linhas sem CPF são duas pessoas até prova em contrário. Fundi-las
    // por engano encolheria o headcount e inflaria a taxa.
    const colabs = [
      { cpf: null, nome: 'Sem CPF 1', data_admissao: '2025-01-10', status: 'ativo' },
      { cpf: null, nome: 'Sem CPF 2', data_admissao: '2025-01-10', status: 'ativo' }
    ];
    expect(headcountEm('2026-01-31', colabs, [])).toBe(2);
  });

  it('ignora registros nulos ou sem data de admissão', () => {
    const colabs = [null, undefined, { cpf: '111', nome: 'X' }, { cpf: '222', data_admissao: '2025-01-01' }];
    expect(headcountEm('2026-01-31', colabs as any[], [])).toBe(1);
  });

  it('aceita timestamp completo, não só data', () => {
    const colabs = [{ cpf: '111', data_admissao: '2025-01-10T08:30:00Z', status: 'ativo' }];
    expect(headcountEm('2025-01-10', colabs, [])).toBe(1);
  });
});

describe('turnoverSemestre', () => {
  const s1_2026 = { ano: 2026, s: 1 as const, label: 'S1 2026', inicio: '2026-01-01', fim: '2026-06-30' };

  it('aplica a fórmula ((admissões + demissões) / 2) / efetivo médio', () => {
    // 10 pessoas admitidas antes do semestre e ainda ativas → efetivo 10 nas
    // duas pontas. 2 admissões e 2 demissões dentro do semestre.
    const antigos = Array.from({ length: 10 }, (_, i) => ({
      cpf: `${1000 + i}`, data_admissao: '2024-01-01', status: 'ativo'
    }));
    const entram = [
      { cpf: '2001', data_admissao: '2026-02-01', status: 'ativo' },
      { cpf: '2002', data_admissao: '2026-03-01', status: 'ativo' }
    ];
    const saem = [
      { cpf: '3001', data_admissao: '2023-01-01', status: 'desligado', data_desligamento: '2026-02-15' },
      { cpf: '3002', data_admissao: '2023-01-01', status: 'desligado', data_desligamento: '2026-03-15' }
    ];
    const r = turnoverSemestre(s1_2026, [...antigos, ...entram, ...saem], []);

    expect(r.admissoes).toBe(2);
    expect(r.demissoes).toBe(2);
    // Início: 10 antigos + 2 que saem depois = 12. Fim: 10 + 2 novos = 12.
    expect(r.efetivoMedio).toBe(12);
    expect(r.taxa).toBeCloseTo(((2 + 2) / 2 / 12) * 100, 6);
  });

  it('devolve taxa 0 em vez de dividir por zero quando não há efetivo', () => {
    // Sem esta guarda o painel mostraria NaN%.
    const r = turnoverSemestre(s1_2026, [], []);
    expect(r.efetivoMedio).toBe(0);
    expect(r.taxa).toBe(0);
  });

  it('não conta evento fora da janela do semestre', () => {
    const dados = [
      { cpf: '111', data_admissao: '2025-12-31', status: 'ativo' }, // véspera
      { cpf: '222', data_admissao: '2026-07-01', status: 'ativo' }  // semestre seguinte
    ];
    const r = turnoverSemestre(s1_2026, dados, []);
    expect(r.admissoes).toBe(0);
  });

  it('conta evento exatamente nas bordas do semestre', () => {
    const dados = [
      { cpf: '111', data_admissao: '2026-01-01', status: 'ativo' },
      { cpf: '222', data_admissao: '2026-06-30', status: 'ativo' }
    ];
    expect(turnoverSemestre(s1_2026, dados, []).admissoes).toBe(2);
  });

  it('não conta a mesma demissão duas vezes quando está nas duas fontes', () => {
    const colabs = [{ cpf: '123.456.789-00', data_admissao: '2024-01-01', status: 'desligado', data_desligamento: '2026-02-10' }];
    const movs = [{ cpf: '12345678900', data_admissao: '2024-01-01', data_demissao: '2026-02-10' }];
    expect(turnoverSemestre(s1_2026, colabs, movs).demissoes).toBe(1);
  });
});
