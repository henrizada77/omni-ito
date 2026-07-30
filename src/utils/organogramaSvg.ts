// Desenha o organograma como SVG, para exportar em PNG ou PDF.
//
// Por que não html2canvas. A árvore na tela é HTML aninhado com classes de
// vidro (`glass-fill`, backdrop-blur, gradiente) — justamente o que html2canvas
// renderiza mal. E seriam ~200 kB a mais num bundle que já pesa 645 kB.
// Como a estrutura da árvore já está em memória, sai mais barato e mais nítido
// desenhar o SVG a partir dos dados.
//
// A paleta aqui é fixa e clara, de propósito: o destino é papel ou anexo de
// e-mail. Exportar o tema escuro daria um retângulo preto de tinta.
//
// O layout é puro e sem I/O — por isso dá para testar sem navegador.

export interface NoOrganograma {
  id: string;
  parent_id: string | null;
  titulo: string;
  subtitulo?: string | null;
  /** Nome já resolvido do colaborador vinculado, se houver. */
  colaborador?: string | null;
  ordem: number;
}

export interface OpcoesSvg {
  titulo?: string;
  /** Texto do rodapé. Passe a data já formatada — a função é pura. */
  rodape?: string;
}

const LARGURA = 168;
const ALTURA = 62;
const ESPACO_H = 22;
const ESPACO_V = 46;
const MARGEM = 32;
const ESPACO_CABECALHO = 56;

const COR_TEXTO = '#1a1a1a';
const COR_SECUNDARIA = '#5b6472';
const COR_LINHA = '#c4ccd6';
const COR_BORDA = '#9aa6b5';
const COR_FAIXA = '#4F6DF5';

/** XML não perdoa & nem < em texto vindo do banco. */
function escapar(t: string): string {
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Quebra em até `maxLinhas`, cortando com reticências no que não couber.
 * Aproxima a largura por número de caracteres: SVG não mede texto antes de
 * renderizar, e trazer métrica de fonte real não compensa o peso aqui.
 */
export function quebrar(texto: string, maxChars: number, maxLinhas: number): string[] {
  const palavras = texto.trim().split(/\s+/).filter(Boolean);
  if (!palavras.length) return [''];

  const linhas: string[] = [];
  let atual = '';

  for (const p of palavras) {
    const tentativa = atual ? `${atual} ${p}` : p;
    if (tentativa.length <= maxChars) {
      atual = tentativa;
    } else {
      if (atual) linhas.push(atual);
      atual = p;
      if (linhas.length === maxLinhas) break;
    }
  }
  if (atual && linhas.length < maxLinhas) linhas.push(atual);

  // Sobrou texto? Marca o corte, para ninguém achar que o cargo se chama assim.
  const escrito = linhas.join(' ').length;
  if (escrito < texto.trim().length) {
    const i = linhas.length - 1;
    linhas[i] = linhas[i].length >= maxChars ? linhas[i].slice(0, maxChars - 1) + '…' : linhas[i] + '…';
  }

  return linhas.length ? linhas : [''];
}

interface Posicionado extends NoOrganograma {
  x: number;
  y: number;
}

/**
 * Layout de árvore clássico: folha ocupa a próxima coluna livre, pai fica
 * centrado sobre os filhos. Suficiente para organograma — algoritmo mais
 * sofisticado (Reingold-Tilford) só compensa em árvore muito larga.
 */
export function posicionar(nos: NoOrganograma[]): {
  posicionados: Posicionado[];
  largura: number;
  altura: number;
} {
  const filhosDe = new Map<string, NoOrganograma[]>();
  for (const n of nos) {
    const chave = n.parent_id ?? '__raiz__';
    if (!filhosDe.has(chave)) filhosDe.set(chave, []);
    filhosDe.get(chave)!.push(n);
  }
  for (const lista of filhosDe.values()) {
    lista.sort((a, b) => a.ordem - b.ordem || a.titulo.localeCompare(b.titulo));
  }

  const posicionados: Posicionado[] = [];
  let colunaLivre = 0;
  let profundidadeMax = 0;

  // Guarda contra ciclo: parent_id não tem FK no banco (ver BD-06 da
  // auditoria), então um dado inconsistente poderia recursar para sempre.
  const visitados = new Set<string>();

  const caminhar = (no: NoOrganograma, profundidade: number): Posicionado => {
    visitados.add(no.id);
    profundidadeMax = Math.max(profundidadeMax, profundidade);

    const filhos = (filhosDe.get(no.id) ?? []).filter(f => !visitados.has(f.id));
    let x: number;

    if (filhos.length === 0) {
      x = colunaLivre;
      colunaLivre += LARGURA + ESPACO_H;
    } else {
      const posFilhos = filhos.map(f => caminhar(f, profundidade + 1));
      x = (posFilhos[0].x + posFilhos[posFilhos.length - 1].x) / 2;
    }

    const p: Posicionado = { ...no, x, y: profundidade * (ALTURA + ESPACO_V) };
    posicionados.push(p);
    return p;
  };

  for (const raiz of filhosDe.get('__raiz__') ?? []) {
    if (!visitados.has(raiz.id)) caminhar(raiz, 0);
  }
  // Nó cujo pai não existe (dado órfão) ficaria invisível. Trata como raiz.
  for (const n of nos) {
    if (!visitados.has(n.id)) caminhar(n, 0);
  }

  return {
    posicionados,
    largura: Math.max(colunaLivre - ESPACO_H, LARGURA),
    altura: profundidadeMax * (ALTURA + ESPACO_V) + ALTURA
  };
}

/** Conector ortogonal do pai para o filho: desce, atravessa, desce. */
function conector(px: number, py: number, fx: number, fy: number): string {
  const meio = py + ALTURA + ESPACO_V / 2;
  const x1 = px + LARGURA / 2;
  const x2 = fx + LARGURA / 2;
  return `<path d="M ${x1} ${py + ALTURA} V ${meio} H ${x2} V ${fy}" fill="none" stroke="${COR_LINHA}" stroke-width="1.5"/>`;
}

function caixa(n: Posicionado): string {
  const partes: string[] = [];

  partes.push(
    `<rect x="${n.x}" y="${n.y}" width="${LARGURA}" height="${ALTURA}" rx="8" ` +
    `fill="#ffffff" stroke="${COR_BORDA}" stroke-width="1"/>`
  );
  // Faixa superior: dá hierarquia visual sem depender de cor de fundo.
  partes.push(
    `<rect x="${n.x + 1}" y="${n.y + 1}" width="${LARGURA - 2}" height="3" rx="1.5" fill="${COR_FAIXA}"/>`
  );

  // Centraliza o conteúdo na vertical. A altura da caixa é a do caso máximo
  // (2 linhas de título + subtítulo + colaborador); sem isto, uma caixa de
  // linha única fica com o texto colado no topo e um vão vazio embaixo.
  const linhasTitulo = quebrar(n.titulo, 24, 2);
  const alturaConteudo =
    linhasTitulo.length * 12 + (n.subtitulo ? 11 : 0) + (n.colaborador ? 10 : 0);
  const centro = n.x + LARGURA / 2;
  // O +8,5 converte do topo do bloco de texto para a LINHA DE BASE da primeira
  // linha — em SVG, o atributo y do <text> é a base, não o topo. Para fonte de
  // 10px a subida é ~8. Medi na tela: com 12 o texto descia 4px demais.
  let y = n.y + (ALTURA - alturaConteudo) / 2 + 8.5;

  for (const linha of linhasTitulo) {
    partes.push(
      `<text x="${centro}" y="${y}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" ` +
      `font-size="10" font-weight="700" fill="${COR_TEXTO}">${escapar(linha.toUpperCase())}</text>`
    );
    y += 12;
  }

  if (n.subtitulo) {
    partes.push(
      `<text x="${centro}" y="${y}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" ` +
      `font-size="8.5" fill="${COR_SECUNDARIA}">${escapar(quebrar(n.subtitulo, 30, 1)[0])}</text>`
    );
    y += 11;
  }

  if (n.colaborador) {
    const nome = n.colaborador.split(' ').slice(0, 2).join(' ');
    partes.push(
      `<text x="${centro}" y="${y}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" ` +
      `font-size="8" font-style="italic" fill="${COR_SECUNDARIA}">${escapar(nome)}</text>`
    );
  }

  return partes.join('');
}

/** Monta o SVG completo. Devolve string — quem chama decide o que fazer com ela. */
export function gerarSvgOrganograma(nos: NoOrganograma[], opcoes: OpcoesSvg = {}): string {
  if (!nos.length) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="80" viewBox="0 0 320 80">` +
      `<rect width="100%" height="100%" fill="#ffffff"/>` +
      `<text x="160" y="45" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="${COR_SECUNDARIA}">Organograma vazio</text></svg>`;
  }

  const { posicionados, largura, altura } = posicionar(nos);
  const porId = new Map(posicionados.map(p => [p.id, p]));

  const larguraTotal = largura + MARGEM * 2;
  const alturaTotal = altura + MARGEM * 2 + ESPACO_CABECALHO;

  const linhas: string[] = [];
  for (const n of posicionados) {
    if (!n.parent_id) continue;
    const pai = porId.get(n.parent_id);
    if (pai) linhas.push(conector(pai.x, pai.y, n.x, n.y));
  }

  const cabecalho = opcoes.titulo
    ? `<text x="${larguraTotal / 2}" y="34" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="16" font-weight="700" fill="${COR_TEXTO}">${escapar(opcoes.titulo)}</text>`
    : '';
  const rodape = opcoes.rodape
    ? `<text x="${larguraTotal / 2}" y="${alturaTotal - 12}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="9" fill="${COR_SECUNDARIA}">${escapar(opcoes.rodape)}</text>`
    : '';

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${larguraTotal}" height="${alturaTotal}" viewBox="0 0 ${larguraTotal} ${alturaTotal}">`,
    `<rect width="100%" height="100%" fill="#ffffff"/>`,
    cabecalho,
    `<g transform="translate(${MARGEM}, ${MARGEM + ESPACO_CABECALHO - 20})">`,
    linhas.join(''),
    posicionados.map(caixa).join(''),
    `</g>`,
    rodape,
    `</svg>`
  ].join('');
}

// ---------------------------------------------------------------------------
// Daqui para baixo depende do navegador, e por isso não é testado por unidade.
// ---------------------------------------------------------------------------

/** Converte o SVG em PNG. `escala` 2 dá densidade de tela retina / impressão. */
export function svgParaPngBlob(svg: string, escala = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const largura = Number(svg.match(/width="(\d+(?:\.\d+)?)"/)?.[1] ?? 800);
    const altura = Number(svg.match(/height="(\d+(?:\.\d+)?)"/)?.[1] ?? 600);

    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(largura * escala);
      canvas.height = Math.ceil(altura * escala);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas indisponível neste navegador.'));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(escala, escala);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Falha ao gerar o PNG.'))), 'image/png');
    };
    img.onerror = () => reject(new Error('Falha ao desenhar o organograma.'));

    // data: URI em vez de blob: — parte dos navegadores marca o canvas como
    // "tainted" ao desenhar SVG vindo de blob:, e aí o toBlob falha.
    // unescape(encodeURIComponent(...)) é o caminho para o btoa aceitar acento.
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  });
}

export function baixarArquivo(conteudo: Blob | string, nomeArquivo: string, tipo = 'image/svg+xml'): void {
  const blob = typeof conteudo === 'string' ? new Blob([conteudo], { type: tipo }) : conteudo;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  // Sem o revoke o blob fica preso na memória da aba até recarregar.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Abre a janela de impressão com o organograma, para "Salvar como PDF".
 *
 * Sem biblioteca de PDF: jsPDF são ~350 kB, e o diálogo do navegador já produz
 * PDF vetorial, com margem e orientação escolhidas por quem imprime. Paisagem
 * por padrão — organograma é largo.
 */
export function imprimirSvg(svg: string, titulo: string): void {
  const janela = window.open('', '_blank');
  if (!janela) {
    throw new Error('O navegador bloqueou a janela de impressão. Libere pop-ups para este site e tente de novo.');
  }
  janela.document.write(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapar(titulo)}</title>` +
    `<style>@page{size:landscape;margin:10mm}` +
    `body{margin:0;display:flex;align-items:center;justify-content:center}` +
    `svg{width:100%;height:auto}</style></head><body>${svg}</body></html>`
  );
  janela.document.close();
  // Espera o layout antes de abrir o diálogo, senão parte dos navegadores
  // imprime página em branco.
  janela.onload = () => { janela.focus(); janela.print(); };
}
