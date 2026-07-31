// O depurador de dados pessoais da telemetria.
//
// Se ele quebrar, ninguém percebe: o sistema continua funcionando e passa a
// gravar CPF e salário numa tabela de log, criando uma segunda base de dados
// pessoais fora de qualquer política de acesso. É exatamente o tipo de falha
// que só um teste pega.

import { describe, it, expect } from 'vitest';
import { limparDadosSensiveis } from './telemetria';

describe('limparDadosSensiveis', () => {
  it('remove CPF com máscara', () => {
    expect(limparDadosSensiveis('duplicate key (cpf)=(123.456.789-00)'))
      .toBe('duplicate key (cpf)=([CPF])');
  });

  it('remove CPF sem máscara', () => {
    // Cai na regra de sequência longa de dígitos.
    expect(limparDadosSensiveis('cpf 12345678900 já existe'))
      .toBe('cpf [NUMERO] já existe');
  });

  it('remove CNPJ', () => {
    expect(limparDadosSensiveis('CNPJ 12.345.678/0001-90')).toBe('CNPJ [CNPJ]');
  });

  it('remove e-mail', () => {
    expect(limparDadosSensiveis('falha ao notificar maria.silva@itoinstituto.com.br'))
      .toBe('falha ao notificar [EMAIL]');
  });

  it('remove valor monetário', () => {
    expect(limparDadosSensiveis('salario R$ 3.450,00 fora da faixa'))
      .toBe('salario [VALOR] fora da faixa');
  });

  it('remove campo sensível citado em JSON', () => {
    const entrada = '{"nome":"Maria","salario":"3450","medicacao_continua":"losartana"}';
    const saida = limparDadosSensiveis(entrada);
    expect(saida).toContain('"salario":"[REMOVIDO]"');
    expect(saida).toContain('"medicacao_continua":"[REMOVIDO]"');
    // O nome permanece: é o que permite reproduzir o bug, e não é dado
    // sensível pelo Art. 11. A decisão é deliberada, não esquecimento.
    expect(saida).toContain('"nome":"Maria"');
  });

  it('remove tudo quando há vários dados na mesma mensagem', () => {
    const s = limparDadosSensiveis(
      'erro em 123.456.789-00 / rh@itoinstituto.com.br / R$ 1.200,50'
    );
    expect(s).not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
    expect(s).not.toContain('@');
    expect(s).not.toContain('1.200,50');
  });

  it('preserva o que é útil para depurar', () => {
    // Se o filtro comer a mensagem inteira, o log deixa de servir para algo.
    const s = limparDadosSensiveis('TypeError: cannot read property nome of undefined');
    expect(s).toBe('TypeError: cannot read property nome of undefined');
  });

  it('não quebra com entrada vazia, nula ou sem texto', () => {
    expect(limparDadosSensiveis('')).toBe('');
    expect(limparDadosSensiveis(undefined as unknown as string)).toBe('');
    expect(limparDadosSensiveis(null as unknown as string)).toBe('');
  });

  it('mantém números curtos, que não identificam ninguém', () => {
    // Página 3, item 42, status 500 — ruído se virassem [NUMERO].
    expect(limparDadosSensiveis('status 500 na pagina 3')).toBe('status 500 na pagina 3');
  });
});
