// A regra de "quem vê o quê" vivia espalhada entre App.tsx, a sidebar do Dashboard
// e a paleta de comandos — três cópias que ninguém garantia estarem de acordo. A
// paleta, de fato, não estava: oferecia Folha de Pagamento a qualquer autenticado.
//
// Estes testes existem para travar a propriedade que a diretoria depende: um papel
// restrito enxerga exatamente as rotas da sua lista, e nenhuma outra.

import { describe, it, expect } from 'vitest';
import {
  EMAIL_ADMIN_TI,
  ROTAS_POR_PAPEL,
  papelEfetivo,
  rotasPermitidas,
  podeVerRota,
  rotaInicial,
  type Papel
} from './papeis';

describe('ROTAS_POR_PAPEL', () => {
  it('dá à diretoria exatamente uma rota, e ela é a Voz do Time', () => {
    expect(ROTAS_POR_PAPEL.diretoria).toEqual(['/app/feedback']);
  });

  it('dá ao ti exatamente uma rota, e ela é Analytics', () => {
    expect(ROTAS_POR_PAPEL.ti).toEqual(['/app/analytics']);
  });

  // A App.tsx registra as rotas privadas percorrendo a lista da coordenadora. Uma
  // rota que só aparecesse em outro papel nunca chegaria a existir no roteador, e o
  // papel restrito levaria 404 em vez de entrar.
  it('não deixa nenhum papel apontar para rota fora do conjunto da coordenadora', () => {
    const todas = new Set(ROTAS_POR_PAPEL.coordenadora_rh);
    (Object.keys(ROTAS_POR_PAPEL) as Papel[]).forEach(papel => {
      ROTAS_POR_PAPEL[papel].forEach(rota => {
        expect(todas.has(rota), `${papel} aponta para ${rota}, que a coordenadora não tem`).toBe(true);
      });
    });
  });
});

describe('papelEfetivo', () => {
  it('trata o e-mail do admin de TI como coordenadora, preservando o bypass atual', () => {
    expect(papelEfetivo('ti', EMAIL_ADMIN_TI)).toBe('coordenadora_rh');
  });

  it('devolve o papel real para qualquer outro e-mail', () => {
    expect(papelEfetivo('ti', 'alguem@itoinstituto.com.br')).toBe('ti');
    expect(papelEfetivo('diretoria', 'diretoria@itoinstituto.com.br')).toBe('diretoria');
    expect(papelEfetivo('diretoria', null)).toBe('diretoria');
    expect(papelEfetivo('diretoria', undefined)).toBe('diretoria');
  });
});

describe('rotaInicial', () => {
  it('manda cada papel para a primeira rota que ele pode abrir', () => {
    expect(rotaInicial('coordenadora_rh', 'rh@itoinstituto.com.br')).toBe('/app/dashboard');
    expect(rotaInicial('diretoria', 'diretoria@itoinstituto.com.br')).toBe('/app/feedback');
    expect(rotaInicial('ti', 'ti@itoinstituto.com.br')).toBe('/app/analytics');
  });

  it('manda o admin de TI para o dashboard mesmo com cargo ti no banco', () => {
    expect(rotaInicial('ti', EMAIL_ADMIN_TI)).toBe('/app/dashboard');
  });
});

describe('podeVerRota', () => {
  it('abre a Voz do Time para a diretoria', () => {
    expect(podeVerRota('diretoria', '/app/feedback', 'diretoria@itoinstituto.com.br')).toBe(true);
  });

  it('fecha para a diretoria tudo que não é a Voz do Time', () => {
    const proibidas = ['/app/analytics', '/app/colaboradores', '/app/folha', '/app/dashboard', '/app/vagas'];
    proibidas.forEach(rota => {
      expect(podeVerRota('diretoria', rota, 'diretoria@itoinstituto.com.br'), rota).toBe(false);
    });
  });

  it('não dá a Voz do Time ao auditor de TI', () => {
    expect(podeVerRota('ti', '/app/feedback', 'ti@itoinstituto.com.br')).toBe(false);
    expect(podeVerRota('ti', '/app/analytics', 'ti@itoinstituto.com.br')).toBe(true);
  });

  it('mantém o admin de TI com acesso amplo', () => {
    expect(podeVerRota('ti', '/app/folha', EMAIL_ADMIN_TI)).toBe(true);
  });
});

describe('rotasPermitidas', () => {
  it('devolve a lista completa da coordenadora sem duplicata', () => {
    const lista = rotasPermitidas('coordenadora_rh', 'rh@itoinstituto.com.br');
    expect(new Set(lista).size).toBe(lista.length);
    expect(lista).toContain('/app/feedback');
    expect(lista).toContain('/app/analytics');
  });
});
