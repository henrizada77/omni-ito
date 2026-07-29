// Rede de proteção contra erro de renderização.
//
// Sem isto, uma única exceção em qualquer ponto da árvore desmonta o React
// inteiro e deixa tela branca: sem mensagem, sem caminho de volta, e com o
// formulário que a pessoa estava preenchendo perdido. Num sistema de RH, isso
// costuma acontecer no pior momento — no meio de uma admissão ou de um cálculo
// de rescisão.
//
// Precisa ser classe: `componentDidCatch` e `getDerivedStateFromError` não têm
// equivalente em hook até hoje. É a única classe do projeto, e é de propósito.
//
// Ver docs/AUDITORIA.md, item UX-01.

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { registrarErro } from '../../utils/telemetria';

interface Props {
  children: ReactNode;
  /**
   * Nome da área protegida, usado no log. Ajuda a saber se quem quebrou foi o
   * app inteiro ou só um painel.
   */
  area?: string;
  theme?: 'dark' | 'light';
}

interface State {
  erro: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { erro: null };

  static getDerivedStateFromError(erro: Error): State {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    // registrarErro já escreve no console e nunca lança — ver utils/telemetria.
    // A pilha de componentes vai junto porque é ela que diz QUAL tela quebrou;
    // a stack do JavaScript sozinha costuma apontar só para o React.
    registrarErro(erro, {
      origem: `ErrorBoundary${this.props.area ? `:${this.props.area}` : ''}`,
      pilhaDeComponentes: (info.componentStack ?? '').slice(0, 200)
    });
  }

  private recarregar = () => {
    // Recarregar em vez de só limpar o estado: se o erro veio de dado
    // inconsistente já em memória, limpar o boundary reencena a mesma falha no
    // próximo render e a pessoa fica presa num laço.
    window.location.reload();
  };

  render() {
    const { erro } = this.state;
    if (!erro) return this.props.children;

    const escuro = this.props.theme !== 'light';

    return (
      <div
        role="alert"
        className={`min-h-screen flex items-center justify-center p-6 ${
          escuro ? 'bg-[#0D0D0C] text-[#E5DFD3]' : 'bg-[#FBFBFA] text-[#0A0A0A]'
        }`}
      >
        <div
          className={`w-full max-w-md rounded-2xl border p-8 text-center space-y-5 ${
            escuro ? 'border-white/10' : 'border-black/10'
          }`}
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-amber-500/10 border border-amber-500/25 text-amber-500">
            <AlertTriangle size={30} aria-hidden />
          </div>

          <h1 className="text-xl font-bold">Algo quebrou nesta tela</h1>

          <p className="text-xs opacity-70 leading-relaxed">
            O erro foi registrado. Recarregar costuma resolver. Se acontecer de novo
            na mesma ação, avise o TI — e conte o que você estava fazendo, porque é
            isso que permite reproduzir e corrigir.
          </p>

          <button
            onClick={this.recarregar}
            className={`w-full py-3 rounded-lg font-bold text-sm transition-colors inline-flex items-center justify-center gap-2 ${
              escuro
                ? 'bg-[#E5DFD3] text-[#0D0D0C] hover:bg-[#D4CBB7]'
                : 'bg-[#0A0A0A] text-[#FBFBFA] hover:bg-[#2A2A2A]'
            }`}
          >
            <RotateCcw size={15} aria-hidden />
            Recarregar
          </button>

          {/* Detalhe técnico fica recolhido: serve ao TI, não assusta quem só
              quer voltar a trabalhar. */}
          <details className="text-left">
            <summary className="text-[11px] opacity-50 cursor-pointer select-none">
              Detalhe técnico
            </summary>
            <pre
              className={`mt-2 p-3 rounded-lg text-[10px] leading-relaxed overflow-x-auto ${
                escuro ? 'bg-white/5' : 'bg-black/5'
              }`}
            >
              {erro.message}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
