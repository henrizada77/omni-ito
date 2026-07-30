// Layout do organograma exportado.
//
// O desenho é gerado a partir dos dados, não capturado da tela — então o
// layout é código, e código de layout erra em silêncio: uma caixa fora do
// lugar não lança exceção, só sai um PDF torto que alguém leva para reunião.

import { describe, it, expect } from 'vitest';
import { posicionar, quebrar, gerarSvgOrganograma, type NoOrganograma } from './organogramaSvg';

const no = (id: string, parent_id: string | null, titulo: string, ordem = 0): NoOrganograma =>
  ({ id, parent_id, titulo, ordem });

describe('quebrar', () => {
  it('mantém texto curto numa linha só', () => {
    expect(quebrar('Coordenadora RH', 24, 2)).toEqual(['Coordenadora RH']);
  });

  it('quebra em duas linhas quando não cabe', () => {
    const r = quebrar('Coordenadora de Atendimento ao Cliente', 20, 2);
    expect(r.length).toBeLessThanOrEqual(2);
    expect(r[0]).toContain('Coordenadora');
  });

  it('marca o corte com reticências quando sobra texto', () => {
    // Sem a marca, alguém lê o organograma e acha que o cargo se chama assim.
    const r = quebrar('Analista de Compras Estoque Logistica e Suprimentos Gerais', 12, 2);
    expect(r.join('')).toContain('…');
  });

  it('não quebra com string vazia ou só espaços', () => {
    expect(quebrar('', 10, 2)).toEqual(['']);
    expect(quebrar('   ', 10, 2)).toEqual(['']);
  });
});

describe('posicionar', () => {
  it('centra o pai sobre os filhos', () => {
    const nos = [
      no('ceo', null, 'CEO'),
      no('a', 'ceo', 'Diretoria A', 0),
      no('b', 'ceo', 'Diretoria B', 1)
    ];
    const { posicionados } = posicionar(nos);
    const ceo = posicionados.find(p => p.id === 'ceo')!;
    const a = posicionados.find(p => p.id === 'a')!;
    const b = posicionados.find(p => p.id === 'b')!;

    expect(ceo.x).toBeCloseTo((a.x + b.x) / 2, 5);
    expect(a.x).toBeLessThan(b.x);
  });

  it('empilha por profundidade', () => {
    const nos = [no('r', null, 'Raiz'), no('f', 'r', 'Filho'), no('n', 'f', 'Neto')];
    const { posicionados } = posicionar(nos);
    const y = (id: string) => posicionados.find(p => p.id === id)!.y;

    expect(y('r')).toBe(0);
    expect(y('f')).toBeGreaterThan(y('r'));
    expect(y('n')).toBeGreaterThan(y('f'));
  });

  it('respeita o campo ordem entre irmãos', () => {
    const nos = [
      no('r', null, 'Raiz'),
      no('z', 'r', 'Zebra', 0),   // ordem menor, apesar do nome vir depois
      no('a', 'r', 'Alfa', 1)
    ];
    const { posicionados } = posicionar(nos);
    const z = posicionados.find(p => p.id === 'z')!;
    const a = posicionados.find(p => p.id === 'a')!;
    expect(z.x).toBeLessThan(a.x);
  });

  it('posiciona todos os nós, sem perder nenhum', () => {
    const nos = [
      no('r', null, 'Raiz'),
      no('a', 'r', 'A'), no('b', 'r', 'B'),
      no('a1', 'a', 'A1'), no('a2', 'a', 'A2'), no('b1', 'b', 'B1')
    ];
    expect(posicionar(nos).posicionados).toHaveLength(6);
  });

  it('não trava com ciclo em parent_id', () => {
    // organograma_nos.parent_id pode ficar inconsistente (BD-06 da auditoria).
    // Sem a guarda, isto recursa até estourar a pilha e derruba a aba.
    const nos = [
      { id: 'x', parent_id: 'y', titulo: 'X', ordem: 0 },
      { id: 'y', parent_id: 'x', titulo: 'Y', ordem: 0 }
    ];
    const { posicionados } = posicionar(nos);
    expect(posicionados).toHaveLength(2);
  });

  it('mostra nó órfão em vez de escondê-lo', () => {
    // Pai apontado não existe: sem tratamento, o nó sumiria do desenho e
    // ninguém saberia que faltou alguém no organograma.
    const nos = [no('r', null, 'Raiz'), { id: 'orfao', parent_id: 'inexistente', titulo: 'Órfão', ordem: 0 }];
    const { posicionados } = posicionar(nos);
    expect(posicionados.map(p => p.id).sort()).toEqual(['orfao', 'r']);
  });

  it('cresce a largura conforme o número de folhas', () => {
    const poucos = posicionar([no('r', null, 'R'), no('a', 'r', 'A')]);
    const muitos = posicionar([
      no('r', null, 'R'),
      no('a', 'r', 'A', 0), no('b', 'r', 'B', 1), no('c', 'r', 'C', 2)
    ]);
    expect(muitos.largura).toBeGreaterThan(poucos.largura);
  });
});

describe('gerarSvgOrganograma', () => {
  it('produz SVG com dimensões declaradas', () => {
    const svg = gerarSvgOrganograma([no('r', null, 'CEO'), no('a', 'r', 'RH')]);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toMatch(/width="\d+/);
    expect(svg).toMatch(/height="\d+/);
    expect(svg.trim().endsWith('</svg>')).toBe(true);
  });

  it('escapa caracteres que quebrariam o XML', () => {
    // "Pesquisa & Desenvolvimento" com & cru gera SVG inválido, o navegador
    // recusa desenhar, e o PNG sai em branco sem nenhum erro visível.
    const svg = gerarSvgOrganograma([no('r', null, 'Pesquisa & Desenvolvimento <TI>')]);
    expect(svg).toContain('&amp;');
    expect(svg).toContain('&lt;TI&gt;');   // o título vai em maiúsculas na caixa
    expect(svg).not.toContain('<TI>');
  });

  it('inclui título e rodapé quando informados', () => {
    const svg = gerarSvgOrganograma([no('r', null, 'CEO')], {
      titulo: 'Organograma',
      rodape: 'Gerado em 29/07/2026'
    });
    expect(svg).toContain('Organograma');
    expect(svg).toContain('29/07/2026');
  });

  it('desenha um conector por relação pai-filho', () => {
    const svg = gerarSvgOrganograma([
      no('r', null, 'R'),
      no('a', 'r', 'A', 0),
      no('b', 'r', 'B', 1)
    ]);
    expect((svg.match(/<path /g) || []).length).toBe(2);
  });

  it('devolve SVG válido para lista vazia em vez de quebrar', () => {
    const svg = gerarSvgOrganograma([]);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('vazio');
  });

  it('põe o nome do colaborador vinculado na caixa', () => {
    const svg = gerarSvgOrganograma([
      { id: 'r', parent_id: null, titulo: 'Coordenadora RH', colaborador: 'Maria Silva Santos', ordem: 0 }
    ]);
    // Só os dois primeiros nomes, para caber na caixa.
    expect(svg).toContain('Maria Silva');
    expect(svg).not.toContain('Maria Silva Santos');
  });
});
