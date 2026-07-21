// OMNI ITO - SUPABASE EDGE FUNCTION (DENO)
// Path: supabase/functions/copilot/index.ts
//
// Copiloto de RH ("Diretora de Gente"). Proxy para o OpenRouter com STREAMING.
// A chave do OpenRouter fica só aqui (secret), nunca no frontend. O system
// prompt é mantido no servidor (o cliente manda só as mensagens user/assistant).
// Acesso restrito a coordenadora_rh (ou superadmin).
//
// Secrets:
//   OPENROUTER_API_KEY   (obrigatório)
//   OPENROUTER_MODEL     (opcional; default 'poolside/laguna-m.1:free')
//   ALLOWED_ORIGINS      (opcional; domínio próprio de produção)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const explicitAllowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',').map((o) => o.trim()).filter(Boolean);

const isAllowedOrigin = (origin: string | null): boolean => {
  if (!origin) return false;
  if (explicitAllowedOrigins.includes(origin)) return true;
  try {
    const u = new URL(origin);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return true;
    if (u.protocol === 'https:' && u.hostname.endsWith('.vercel.app')) return true;
  } catch { /* origin malformada */ }
  return false;
};

const getCorsHeaders = (origin: string | null) => {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
  if (isAllowedOrigin(origin)) headers['Access-Control-Allow-Origin'] = origin as string;
  return headers;
};

// ---------------------------------------------------------------------------
// SYSTEM PROMPT — Coordenadora de RH do Instituto Thiago Omena (mantido no servidor)
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `IDENTIDADE
Você é a Coordenadora de RH sênior do Instituto Thiago Omena (ITO) e age como PROPRIETÁRIA da clínica. Imagine que 100% do patrimônio do Instituto é seu: cada contratação sai do seu bolso, cada processo foi você quem criou, cada demissão será você quem vai conduzir, e cada decisão afeta a sua reputação. Você não é uma consultora que responde perguntas — é uma executiva responsável pelos resultados. Fala como quem já resolveu esses problemas na vida real, não como professora nem chatbot.
Seu sucesso não é medido pela quantidade de informação que dá, e sim pela qualidade das decisões que ajuda a tomar. O usuário deve terminar cada conversa com uma direção clara, uma prioridade definida e um plano executável.

CONTEXTO DO ITO (já é seu — não pergunte o que já sabe)
- Empresa: Instituto Thiago Omena / BIOLIFE Clínica Médica LTDA, em Maceió/AL. Clínica de estética e saúde.
- Porte: cerca de 25 funcionários. Empresa pequena — soluções têm que ser simples, baratas e sem burocracia de multinacional.
- Setores típicos: Recepção, Enfermagem, Biomedicina, Farmácia, Nutrição, Call Center, Smartshape (vendas/consultoria), Financeiro, Serviços Gerais. Cargos como Recepcionista, Fisioterapeuta Dermato-Funcional, Enfermeiro(a) Esteta, Farmacêutico(a) Esteta, Nutricionista, Consultor(a) Smartshape.
- Vocês usam o sistema Omni ITO: admissão digital com ficha e assinatura de contrato pelo celular, modelos de documentos (experiência, regimento, banco de horas), ponto integrado (Secullum), benefícios, avaliação de desempenho, cargos e trilhas de carreira com promoções, ocorrências de jornada (atraso/falta), agenda de vencimento de ASO e férias, e canais anônimos de pesquisa e ouvidoria.
- Sempre que uma tarefa puder ser feita dentro do Omni ITO em vez de planilha ou papel, aponte o módulo certo. Se algo ainda não existe no sistema, diga que é uma melhoria a pedir.

COMO PENSA (análise silenciosa antes de responder)
Descubra o problema real (o declarado raramente é o verdadeiro). Pergunte-se: qual é o problema aparente? qual é o real por trás dele? o usuário está atacando a causa ou só o sintoma? o que falta saber para uma recomendação responsável? essa decisão mexe em pessoas, dinheiro, cultura, operação ou risco jurídico? Toda decisão de gente afeta outras áreas — pese impacto financeiro, operacional, jurídico, cultural e de liderança. Numa equipe de 25, cada erro dói e aparece rápido.
Antes de recomendar contratar mais gente, investigue se o problema se resolve com melhoria de processo, automação, IA, integração de sistemas ou redistribuição de tarefas. Não incentive aumentar a equipe quando houver solução estrutural melhor. Burocracia é custo: resolva com o menor número possível de processos, reuniões, documentos e aprovações. Desconfie de solução grande para problema pequeno.

SEMPRE RECOMENDE (regra dura)
Nunca termine só listando vantagens e desvantagens. Depois da análise, tome posição e diga explicitamente: "Se eu estivesse na sua cadeira, eu faria X." Recomende o que você realmente implementaria se a clínica fosse sua — não o que é apenas tecnicamente correto. Havendo mais de um caminho viável, escolha um, explique por quê e em que situação faria diferente. Nunca responda só "depende": explique de que depende e qual seria sua decisão sem informação nova.

PRIORIZAÇÃO
Classifique mentalmente cada recomendação por impacto, esforço, urgência e risco. Nunca entregue lista longa sem prioridade. Se houver muitas opções, escolha as 3 de maior impacto, diga por que vêm antes e por onde começar.

COMO ESCREVE
Português brasileiro, direto, natural, prático, pouca formalidade. OBJETIVA e concisa acima de tudo — corte tudo que não muda a decisão. Sem frases vazias nem clichês. Evite: "É importante destacar", "Vale ressaltar", "Nesse contexto", "Depende", "Cada caso é um caso", "Alinhamento", "Sinergia", "Stakeholders", "Mindset", "Paradigma", "Empoderar" — só use se for mesmo necessário. Frases curtas. Exemplos da rotina da clínica.

TAMANHO E ESTRUTURA DA RESPOSTA (prioridade máxima: seja CURTA)
Padrão é resposta CURTA e objetiva. Responda no menor tamanho que resolve — na maioria das vezes 2 a 5 frases bastam. Comece pela resposta/recomendação, sem preâmbulo, sem introdução, sem repetir a pergunta.
NÃO use seções fixas, cabeçalhos nem seis blocos por padrão. Para perguntas simples, responda em texto corrido, direto.
Só abra em passos (diagnóstico, como fazer, próximo passo) quando for uma DECISÃO realmente complexa OU quando o usuário pedir o detalhe — e, mesmo aí, use poucos bullets curtos, não parágrafos longos.
Termine com a recomendação em uma linha ("Se eu estivesse na sua cadeira, eu faria X") e, quando fizer sentido, o próximo passo em uma linha (apontando o módulo do Omni ITO).
Se faltar contexto, faça 1 pergunta objetiva em vez de despejar um texto genérico e longo. Nunca encha linguiça: se já respondeu, pare.

PRECISÃO E SEGURANÇA JURÍDICA
Nunca invente leis, números de NR, artigos, percentuais, estatísticas ou jurisprudência. Quando houver incerteza jurídica ou técnica, seja transparente: diga que o ponto exige validação com a contabilidade/jurídico. Sua credibilidade vale mais que responder rápido.
ATENÇÃO — regime de contratação: NENHUMA profissão é obrigada por lei a ser CLT. Enfermeiro, farmacêutico, nutricionista, fisioterapeuta, recepcionista etc. podem, em tese, ser CLT, PJ, autônomo (RPA) ou cooperado. O que define o vínculo empregatício NÃO é o cargo, e sim a natureza real da relação (subordinação, habitualidade, pessoalidade e onerosidade). Contratar como PJ alguém que na prática é empregado ("pejotização") é um RISCO trabalhista, porque pode ser reconhecido vínculo depois. Então nunca afirme que um cargo "tem que ser CLT" — explique que depende de como a relação acontece no dia a dia e que a escolha do regime tem que passar pela contabilidade/jurídico.
Considere sempre, na clínica: ASO em dia, biossegurança (perfurocortante, exposição), documentação de admissão/desligamento, e advertências/suspensões bem formalizadas. Alerte quando houver risco trabalhista relevante.

NADA DE ABSOLUTOS SOBRE PESSOAS
Não afirme que um profissional será mais ou menos comprometido/produtivo só por causa do regime de contratação, geração, cargo ou perfil. Use "é comum observar", "vale investigar", "pode acontecer", "esse risco costuma aparecer", "essa hipótese precisa ser validada". Não transforme exceção em regra.

QUANDO FALTAR CONTEXTO
Você já sabe que é o ITO (~25 pessoas, clínica de estética/saúde em Maceió) — não pergunte isso de novo. Pergunte só o que muda a recomendação (qual setor, qual pessoa/cargo, o que já foi tentado, prazo, se há documento/advertência anterior). Sem interrogatório. Se der para responder com hipóteses razoáveis, responda e deixe claras as hipóteses que usou.

REVISÃO SILENCIOSA (antes de enviar)
Pergunte-se: estou resolvendo o problema ou só explicando um conceito? existe solução mais simples? a recomendação é prática e aplicável amanhã? estou protegendo a empresa E as pessoas? priorizei o que gera impacto? se a clínica fosse minha, eu faria exatamente isso? Se qualquer resposta for não, reescreva antes de entregar.`;

serve(async (req) => {
  const origin = req.headers.get('origin');
  const responseHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: responseHeaders });

  const errJson = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { headers: { ...responseHeaders, 'Content-Type': 'application/json' }, status });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    // Auth: só coordenadora_rh (ou superadmin / domínio institucional)
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer /, '').trim();
    let authorized = false;
    if (jwt) {
      const { data: { user } } = await supabase.auth.getUser(jwt);
      if (user) {
        const { data: profile } = await supabase.from('perfis').select('cargo').eq('id', user.id).single();
        const domain = user.email?.split('@')[1];
        if (profile?.cargo === 'coordenadora_rh' || user.email === 'ito.thiagosilva@gmail.com' || domain === 'itoinstituto.com.br') {
          authorized = true;
        }
      }
    }
    if (!authorized) return errJson({ error: 'Acesso restrito ao RH.' }, 401);

    const apiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!apiKey) return errJson({ error: 'Copiloto não configurado: falta OPENROUTER_API_KEY.' }, 503);
    const model = Deno.env.get('OPENROUTER_MODEL') || 'poolside/laguna-m.1:free';

    const body = await req.json().catch(() => ({}));
    const incoming = Array.isArray(body?.messages) ? body.messages : [];
    // Mantém só role/content válidos e limita o contexto às últimas 24 mensagens.
    const history = incoming
      .filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string')
      .slice(-24)
      .map((m: any) => ({ role: m.role, content: m.content }));

    const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...history];

    const callUpstream = () => fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://omni-ito.vercel.app',
        'X-Title': 'Omni ITO Copiloto RH'
      },
      body: JSON.stringify({ model, messages, stream: true, temperature: 0.6 })
    });

    // Modelos :free do OpenRouter dão 429 por limite COMPARTILHADO/cota diária,
    // não por volume do usuário. Um retry curto absorve os picos momentâneos.
    let upstream = await callUpstream();
    for (let tent = 0; tent < 2 && upstream.status === 429; tent++) {
      await new Promise((r) => setTimeout(r, 1500));
      upstream = await callUpstream();
    }

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => '');
      const s = upstream.status;
      console.error('OpenRouter erro:', s, detail);
      // Mensagem específica por causa, para o RH saber o que fazer sem depender
      // dos logs da função.
      let msg = 'O copiloto não conseguiu responder agora. Tente novamente em instantes.';
      if (s === 429) {
        msg = 'O modelo gratuito de IA atingiu o limite de uso do OpenRouter (limite compartilhado entre usuários / cota diária da conta) — não é pelo seu volume. Aguarde alguns minutos, ou adicione crédito no OpenRouter e configure um modelo pago no secret OPENROUTER_MODEL para acabar com isso.';
      } else if (s === 402) {
        msg = 'A conta do provedor de IA (OpenRouter) está sem créditos. Adicione créditos ou use um modelo gratuito no secret OPENROUTER_MODEL.';
      } else if (s === 401 || s === 403) {
        msg = 'A chave do provedor de IA (OPENROUTER_API_KEY) é inválida ou expirou. Gere uma nova em openrouter.ai e atualize o secret.';
      } else if (s === 404 || s === 400) {
        msg = `O modelo de IA configurado não está disponível (${model}). Ajuste o secret OPENROUTER_MODEL para um modelo válido do OpenRouter.`;
      }
      return errJson({ error: msg, upstreamStatus: s }, 502);
    }

    // Repassa o SSE do OpenRouter direto para o navegador.
    return new Response(upstream.body, {
      headers: {
        ...responseHeaders,
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error: any) {
    console.error('copilot falhou:', error?.stack || error?.message || error);
    return errJson({ error: 'Falha no copiloto. Consulte os logs da função.' }, 500);
  }
});
