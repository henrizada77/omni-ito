import { describe, it, expect, vi } from 'vitest';
import { listarColaboradoresElegiveis } from './colaboradoresService';

// Duas exclusões independentes convivem nestas linhas, e é justamente a confusão
// entre elas que este arquivo existe para impedir:
//   - status 'desligado'       -> filtrado na query, e só quando pedido
//   - SMARTSHAPE/CEO/DIRETORIA -> filtrado no retorno, sempre
const LINHAS = vi.hoisted(() => [
  { id: '1', nome: 'Ana Silva', setor: 'Biomedicina', cargo: 'Biomédica', status: 'ativo' },
  { id: '2', nome: 'Carlos CEO', setor: 'Diretoria', cargo: 'CEO', status: 'ativo' },
  { id: '3', nome: 'Fernanda Rocha', setor: 'Enfermagem', cargo: 'Enfermeira', status: 'ativo' },
  { id: '4', nome: 'Joana Souza', setor: 'Enfermagem', cargo: 'Técnica de Enfermagem', status: 'desligado' },
  { id: '5', nome: 'Roberto Lima', setor: 'Diretoria', cargo: 'Diretor', status: 'desligado' },
]);

// O builder do supabase-js é encadeável E "thenable": dá para chamar .neq() depois
// do .order() e dar await no resultado, com ou sem o .neq() no meio. O mock precisa
// das duas propriedades — um mock que só resolve depois do .neq() esconderia
// exatamente o caminho novo (incluirDesligados = true) que se quer testar.
vi.mock('../supabaseClient', () => {
  const criarQuery = (linhas: any[]): any => ({
    neq: (coluna: string, valor: unknown) =>
      criarQuery(linhas.filter(l => l[coluna] !== valor)),
    then: (aoResolver: any, aoRejeitar?: any) =>
      Promise.resolve({ data: linhas, error: null }).then(aoResolver, aoRejeitar),
  });

  return {
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => criarQuery(LINHAS)),
        })),
      })),
    },
  };
});

describe('listarColaboradoresElegiveis', () => {
  it('por padrão, deixa de fora desligados e setores ignorados', async () => {
    const colabs = await listarColaboradoresElegiveis();
    expect(colabs.map(c => c.nome)).toEqual(['Ana Silva', 'Fernanda Rocha']);
  });

  it('com incluirDesligados, traz os desligados de volta', async () => {
    const colabs = await listarColaboradoresElegiveis(true);
    expect(colabs.map(c => c.nome)).toContain('Joana Souza');
  });

  // Regressão de 2026-08: o Dashboard chamava sem argumento, então a sub-aba
  // "Desligados" e os painéis de turnover ficaram permanentemente vazios.
  // Pedir desligados NÃO pode reabrir a porta para SMARTSHAPE/CEO/DIRETORIA —
  // as duas exclusões são independentes e só uma é opcional.
  it('mantém os setores ignorados de fora mesmo incluindo desligados', async () => {
    const nomes = (await listarColaboradoresElegiveis(true)).map(c => c.nome);

    expect(nomes).not.toContain('Carlos CEO');   // ignorado, e ativo
    expect(nomes).not.toContain('Roberto Lima'); // ignorado, e desligado
    expect(nomes).toEqual(['Ana Silva', 'Fernanda Rocha', 'Joana Souza']);
  });
});
