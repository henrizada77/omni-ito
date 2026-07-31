// Aviso prévio e prazo de pagamento — Lei 12.506/2011 e CLT art. 477, §6º.
//
// Este é o primeiro teste automatizado do projeto, e começa aqui de propósito:
// errar o aviso prévio ou o prazo de quitação não gera bug de tela, gera
// passivo trabalhista. É a função com maior custo por erro do sistema inteiro,
// e é pura — testável sem refatorar nada.
//
// Ver docs/AUDITORIA.md, item DEV-01.

import { describe, it, expect } from 'vitest';
import { anosCompletos, calcularPrazosDesligamento } from './desligamento';

describe('anosCompletos', () => {
  it('conta o ano só depois do aniversário de admissão', () => {
    // Véspera: ainda não completou.
    expect(anosCompletos('2020-03-15', '2026-03-14')).toBe(5);
    // No dia: completou.
    expect(anosCompletos('2020-03-15', '2026-03-15')).toBe(6);
  });

  it('não devolve negativo quando a referência antecede a admissão', () => {
    expect(anosCompletos('2026-01-01', '2020-01-01')).toBe(0);
  });

  it('devolve 0 para data inválida em vez de NaN', () => {
    // Importa porque o resultado alimenta uma multiplicação: NaN aqui
    // contaminaria diasAviso e o prazo sairia como "NaN dias".
    expect(anosCompletos('não é data', '2026-01-01')).toBe(0);
    expect(anosCompletos('2026-01-01', 'nem isto')).toBe(0);
  });

  it('trata 29 de fevereiro de forma conservadora (comportamento atual)', () => {
    // Admissão em ano bissexto, referência no dia 28 do ano seguinte.
    // setFullYear em 29/02 rola para 01/03, então a função entende que o ano
    // ainda não fechou. Resultado: 0 em vez de 1.
    //
    // Consequência prática: 3 dias de aviso a menos para quem foi admitido em
    // 29/02 e é desligado em 28/02. É pequeno, mas é a favor do empregador —
    // e está registrado aqui como comportamento conhecido, não como acerto.
    // Ver docs/AUDITORIA.md, item COD-08.
    expect(anosCompletos('2024-02-29', '2025-02-28')).toBe(0);
    expect(anosCompletos('2024-02-29', '2025-03-01')).toBe(1);
  });
});

describe('calcularPrazosDesligamento — dias de aviso', () => {
  it('sem justa causa: 30 dias na base', () => {
    const r = calcularPrazosDesligamento('sem_justa_causa', 'trabalhado', '2026-01-10', '2025-06-01');
    expect(r.diasAviso).toBe(30);
  });

  it('sem justa causa: +3 dias por ano completo', () => {
    // 1 ano → 33, 5 anos → 45.
    expect(
      calcularPrazosDesligamento('sem_justa_causa', 'trabalhado', '2026-01-10', '2025-01-10').diasAviso
    ).toBe(33);
    expect(
      calcularPrazosDesligamento('sem_justa_causa', 'trabalhado', '2026-01-10', '2021-01-10').diasAviso
    ).toBe(45);
  });

  it('sem justa causa: teto de 90 dias', () => {
    // 20 anos = 30 + 60 = 90, exatamente no teto.
    expect(
      calcularPrazosDesligamento('sem_justa_causa', 'trabalhado', '2026-01-10', '2006-01-10').diasAviso
    ).toBe(90);
    // 30 anos daria 120 sem o teto.
    expect(
      calcularPrazosDesligamento('sem_justa_causa', 'trabalhado', '2026-01-10', '1996-01-10').diasAviso
    ).toBe(90);
  });

  it('pedido de demissão: 30 dias fixos, tempo de casa não conta', () => {
    // O aviso proporcional é direito do empregado, não obrigação dele.
    // Quem pede demissão deve 30, tenha 1 ou 30 anos de casa.
    expect(
      calcularPrazosDesligamento('pedido_demissao', 'trabalhado', '2026-01-10', '2025-01-10').diasAviso
    ).toBe(30);
    expect(
      calcularPrazosDesligamento('pedido_demissao', 'trabalhado', '2026-01-10', '1996-01-10').diasAviso
    ).toBe(30);
  });

  it('sem data de admissão: cai para 30 dias em vez de quebrar', () => {
    expect(
      calcularPrazosDesligamento('sem_justa_causa', 'trabalhado', '2026-01-10', null).diasAviso
    ).toBe(30);
    expect(
      calcularPrazosDesligamento('sem_justa_causa', 'trabalhado', '2026-01-10', undefined).diasAviso
    ).toBe(30);
  });
});

describe('calcularPrazosDesligamento — datas', () => {
  it('aviso trabalhado: término é a comunicação mais os dias de aviso', () => {
    const r = calcularPrazosDesligamento('sem_justa_causa', 'trabalhado', '2026-01-10', null);
    expect(r.dataTermino).toBe('2026-02-09'); // 10/01 + 30
  });

  it('aviso indenizado ou dispensado: término é a própria comunicação', () => {
    const r = calcularPrazosDesligamento('sem_justa_causa', 'indenizado_ou_dispensado', '2026-01-10', null);
    expect(r.dataTermino).toBe('2026-01-10');
  });

  it('pagamento vence 10 dias corridos após o término', () => {
    const trabalhado = calcularPrazosDesligamento('sem_justa_causa', 'trabalhado', '2026-01-10', null);
    expect(trabalhado.dataLimitePagamento).toBe('2026-02-19'); // 09/02 + 10

    const indenizado = calcularPrazosDesligamento('sem_justa_causa', 'indenizado_ou_dispensado', '2026-01-10', null);
    expect(indenizado.dataLimitePagamento).toBe('2026-01-20'); // 10/01 + 10
  });

  it('atravessa a virada de mês e de ano corretamente', () => {
    const r = calcularPrazosDesligamento('sem_justa_causa', 'trabalhado', '2025-12-20', null);
    expect(r.dataTermino).toBe('2026-01-19');
    expect(r.dataLimitePagamento).toBe('2026-01-29');
  });

  it('respeita fevereiro de ano bissexto', () => {
    // 2028 é bissexto: 01/02 + 30 dias = 02/03, não 03/03.
    const r = calcularPrazosDesligamento('sem_justa_causa', 'trabalhado', '2028-02-01', null);
    expect(r.dataTermino).toBe('2028-03-02');
  });

  it('teto de 90 dias produz data coerente', () => {
    const r = calcularPrazosDesligamento('sem_justa_causa', 'trabalhado', '2026-01-10', '1996-01-10');
    expect(r.diasAviso).toBe(90);
    expect(r.dataTermino).toBe('2026-04-10');
    expect(r.dataLimitePagamento).toBe('2026-04-20');
  });
});
