import { describe, it, expect } from 'vitest';
import { isColaboradorIgnorado, isColaboradorElegivel, filtrarColaboradoresElegiveis } from './colaboradoresFiltro';

describe('colaboradoresFiltro', () => {
  it('deve identificar colaboradores elegíveis comuns', () => {
    const colab = { nome: 'Maria Silva', setor: 'Biomedicina', cargo: 'Biomédica' };
    expect(isColaboradorIgnorado(colab)).toBe(false);
    expect(isColaboradorElegivel(colab)).toBe(true);
  });

  it('deve ignorar colaboradores do setor Smartshape (case-insensitive e espaçamento)', () => {
    expect(isColaboradorIgnorado({ setor: 'Smartshape', cargo: 'Analista' })).toBe(true);
    expect(isColaboradorIgnorado({ setor: 'SMARTSHAPE', cargo: 'Atendente' })).toBe(true);
    expect(isColaboradorIgnorado({ setor: 'Smart Shape', cargo: 'Gerente' })).toBe(true);
    expect(isColaboradorIgnorado({ setor: ' smartshape ', cargo: 'Técnico' })).toBe(true);
  });

  it('deve ignorar colaboradores com cargo ou setor CEO / Diretoria', () => {
    expect(isColaboradorIgnorado({ setor: 'Administrativo', cargo: 'CEO' })).toBe(true);
    expect(isColaboradorIgnorado({ setor: 'Administrativo', cargo: 'ceo' })).toBe(true);
    expect(isColaboradorIgnorado({ setor: 'Diretoria', cargo: 'Diretor Geral' })).toBe(true);
    expect(isColaboradorIgnorado({ setor: 'Gestão', cargo: 'Diretora Comercial' })).toBe(true);
    expect(isColaboradorIgnorado({ setor: 'DIRETORIA', cargo: 'Membro' })).toBe(true);
  });

  it('deve filtrar uma lista de colaboradores mantendo apenas os elegíveis', () => {
    const lista = [
      { id: '1', nome: 'Ana', setor: 'Recepção', cargo: 'Recepcionista' },
      { id: '2', nome: 'Carlos', setor: 'Smartshape', cargo: 'Consultor' },
      { id: '3', nome: 'Roberto', setor: 'Administrativo', cargo: 'CEO' },
      { id: '4', nome: 'Fernanda', setor: 'Enfermagem', cargo: 'Enfermeira' },
      { id: '5', nome: 'Marcos', setor: 'Diretoria', cargo: 'Diretor Financeiro' },
    ];

    const filtrados = filtrarColaboradoresElegiveis(lista);
    expect(filtrados).toHaveLength(2);
    expect(filtrados.map(c => c.nome)).toEqual(['Ana', 'Fernanda']);
  });

  it('deve lidar com entradas nulas ou indefinidas com segurança', () => {
    expect(isColaboradorIgnorado(null)).toBe(false);
    expect(isColaboradorIgnorado(undefined)).toBe(false);
    expect(filtrarColaboradoresElegiveis(null)).toEqual([]);
    expect(filtrarColaboradoresElegiveis(undefined)).toEqual([]);
  });
});
