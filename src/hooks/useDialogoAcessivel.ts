// Torna um modal operável por teclado e compreensível por leitor de tela.
//
// O sistema tem 10 modais e nenhum deles tinha role="dialog", aria-modal, Esc
// para fechar ou retenção de foco. Na prática:
//
//   - com Tab, o foco escapa para o conteúdo ATRÁS do modal, e a pessoa passa
//     a preencher um formulário que não está vendo;
//   - Esc não fecha, o que todo mundo espera de um modal;
//   - o leitor de tela continua lendo a página de trás como se o modal não
//     existisse;
//   - ao fechar, o foco volta para o começo da página em vez do botão que
//     abriu — quem navega por teclado perde o lugar.
//
// Nada disso é exclusivo de quem usa leitor de tela: Esc e foco preso são
// conforto de teclado para todo mundo.
//
// Ver docs/AUDITORIA.md, item A11Y-03.

import { useEffect, useRef } from 'react';

const FOCAVEIS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

export interface PropsDialogo {
  role: 'dialog';
  'aria-modal': true;
  tabIndex: -1;
}

/**
 * @param aberto    se o modal está visível
 * @param aoFechar  chamado no Esc. Passe a mesma função do botão de fechar.
 * @returns `ref` para o container do modal e as props ARIA para espalhar nele
 */
export function useDialogoAcessivel(aberto: boolean, aoFechar: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  const focoAnterior = useRef<HTMLElement | null>(null);

  // Guarda a função num ref para não reatar o listener a cada render do pai —
  // aoFechar costuma ser uma arrow criada inline no JSX.
  const fechar = useRef(aoFechar);
  fechar.current = aoFechar;

  useEffect(() => {
    if (!aberto) return;

    focoAnterior.current = document.activeElement as HTMLElement | null;

    // Foca o primeiro elemento útil. Sem isto o foco fica no body e o
    // primeiro Tab volta para a barra do navegador.
    const container = ref.current;
    const primeiro = container?.querySelector<HTMLElement>(FOCAVEIS);
    (primeiro ?? container)?.focus();

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        fechar.current();
        return;
      }
      if (e.key !== 'Tab' || !container) return;

      // Lista recalculada a cada Tab de propósito: campos aparecem e somem
      // conforme o formulário (um select que revela outro campo, por exemplo).
      const focaveis = [...container.querySelectorAll<HTMLElement>(FOCAVEIS)]
        .filter(el => el.offsetParent !== null || el === document.activeElement);
      if (!focaveis.length) return;

      const primeiroEl = focaveis[0];
      const ultimoEl = focaveis[focaveis.length - 1];

      // Circula em vez de deixar o foco sair para a página de trás.
      if (e.shiftKey && document.activeElement === primeiroEl) {
        e.preventDefault();
        ultimoEl.focus();
      } else if (!e.shiftKey && document.activeElement === ultimoEl) {
        e.preventDefault();
        primeiroEl.focus();
      }
    };

    document.addEventListener('keydown', aoTeclar, true);
    return () => {
      document.removeEventListener('keydown', aoTeclar, true);
      // Devolve o foco a quem abriu, se ainda estiver na página.
      const anterior = focoAnterior.current;
      if (anterior && document.contains(anterior)) anterior.focus();
    };
  }, [aberto]);

  const propsDialogo: PropsDialogo = { role: 'dialog', 'aria-modal': true, tabIndex: -1 };

  return { ref, propsDialogo };
}
