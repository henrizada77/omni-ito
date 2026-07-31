// Registro de erros de runtime.
//
// Até aqui a única instrumentação do sistema eram 60 `console.error`, que
// morrem no navegador de quem viu o problema. Um erro em produção só era
// descoberto quando alguém ligava reclamando. Ver docs/AUDITORIA.md, DEV-04.
//
// Por que não Sentry (ainda). Mandar payload de erro de um sistema de RH para
// um SaaS estrangeiro é transferência internacional de dado pessoal — LGPD
// Art. 33 — e exige decisão de quem responde pela empresa, não do código. Esta
// camada é neutra de propósito: grava no Supabase que o Instituto já usa.
// Trocar o destino depois é mexer em `enviar()`, uma função.
//
// Nada aqui pode lançar. Telemetria que quebra a aplicação é pior do que
// telemetria nenhuma: transforma um erro em dois.

import { supabase } from '../supabaseClient';

/**
 * Remove dado pessoal do texto antes de gravar.
 *
 * Mensagens de erro deste sistema carregam CPF, salário e nome com frequência
 * — vêm de constraint do Postgres, de payload de formulário, de linha de
 * planilha. Gravar isso numa tabela de log criaria uma segunda base de dados
 * pessoais fora de qualquer política de acesso.
 *
 * A ordem importa: o que é mais específico sai primeiro, senão a regra
 * genérica de dígitos come o CPF antes de ele ser reconhecido como tal.
 */
export function limparDadosSensiveis(texto: string): string {
  if (!texto) return '';
  return texto
    .replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, '[CPF]')
    .replace(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g, '[CNPJ]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[EMAIL]')
    .replace(/R\$\s?[\d.]+,\d{2}/g, '[VALOR]')
    // Sequência longa de dígitos: CPF sem máscara, PIS, RG, conta, cartão.
    // Precisa vir ANTES do telefone: a regra de telefone casa no meio de uma
    // sequência longa e deixa os dígitos da frente para trás — um CPF sem
    // máscara virava "1[TELEFONE]", vazando o primeiro dígito. Pego por teste.
    .replace(/\b\d{8,}\b/g, '[NUMERO]')
    // Telefone com máscara, cujos grupos de dígitos são curtos demais para a
    // regra acima: (82) 99999-9999.
    .replace(/\(?\d{2}\)?[\s-]?9?\d{4}-?\d{4}\b/g, '[TELEFONE]')
    // Campo sensível citado como chave em JSON de erro.
    .replace(
      /"(cpf|rg|pis_pasep|salario|conta|agencia|medicacao_continua|deficiencia_qual|cnh|titulo_eleitor)"\s*:\s*"[^"]*"/gi,
      '"$1":"[REMOVIDO]"'
    );
}

/** Teto por sessão. Um laço de render pode disparar milhares de erros iguais. */
const TETO_POR_SESSAO = 20;
let enviados = 0;
const jaVistos = new Set<string>();

async function enviar(payload: Record<string, unknown>): Promise<void> {
  // RPC em vez de insert direto: a tabela não fica exposta e o teto por
  // janela de tempo é imposto no servidor, não aqui. Cliente não é lugar de
  // impor limite — ver docs/AUDITORIA.md, SEC-07.
  await supabase.rpc('registrar_erro_cliente', payload);
}

export interface ContextoErro {
  /** Onde aconteceu: nome do componente, da tela ou da ação. */
  origem?: string;
  [chave: string]: unknown;
}

/**
 * Registra um erro. Nunca lança e nunca bloqueia quem chamou.
 */
export function registrarErro(erro: unknown, contexto: ContextoErro = {}): void {
  try {
    const e = erro instanceof Error ? erro : new Error(String(erro));
    const mensagem = limparDadosSensiveis(e.message).slice(0, 500);
    const stack = limparDadosSensiveis(e.stack ?? '').slice(0, 4000);

    // Sempre no console: é o que serve para quem está depurando agora, e é o
    // único caminho que sobra se o próprio Supabase estiver fora.
    console.error(`[${contexto.origem ?? 'app'}]`, e);

    // Mesmo erro repetido não vira mesma linha vinte vezes.
    const impressao = `${contexto.origem ?? ''}|${mensagem}`;
    if (jaVistos.has(impressao)) return;
    jaVistos.add(impressao);

    if (enviados >= TETO_POR_SESSAO) return;
    enviados++;

    void enviar({
      p_mensagem: mensagem,
      p_stack: stack,
      p_origem: String(contexto.origem ?? 'desconhecida').slice(0, 120),
      p_url: limparDadosSensiveis(window.location.pathname + window.location.search).slice(0, 300),
      p_user_agent: navigator.userAgent.slice(0, 300),
      p_contexto: limparContexto(contexto)
    }).catch(() => {
      // Falha ao registrar erro não pode virar erro. Silêncio proposital: um
      // console.error aqui alimentaria o próprio handler global.
    });
  } catch {
    // idem
  }
}

/** Contexto extra passa pelo mesmo filtro do texto. */
function limparContexto(ctx: ContextoErro): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const [k, v] of Object.entries(ctx)) {
    if (k === 'origem') continue;
    saida[k] = limparDadosSensiveis(String(v)).slice(0, 200);
  }
  return saida;
}

/**
 * Liga os capturadores globais. Chamar uma vez, no boot.
 *
 * O ErrorBoundary pega erro de render; estes dois pegam o resto — erro em
 * handler de evento, promessa rejeitada sem catch, falha de carregamento de
 * chunk. Na prática é onde mora a maioria dos erros de um SPA.
 */
export function ligarCapturaGlobal(): void {
  window.addEventListener('error', (ev) => {
    registrarErro(ev.error ?? ev.message, { origem: 'window.onerror' });
  });

  window.addEventListener('unhandledrejection', (ev) => {
    registrarErro(ev.reason, { origem: 'promessa-sem-catch' });
  });
}
