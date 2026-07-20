// OMNI ITO - SUPABASE EDGE FUNCTION (DENO)
// Path: supabase/functions/pontofopag-sync/index.ts
//
// Sincronização READ-ONLY do ponto (Secullum Ponto Web — Integração Externa).
// Actions: 'test' | 'sync_ponto' | 'sync_inconsistencias'.
//
// MODO MOCK: enquanto os secrets do Secullum não existirem, a função devolve
// dados de exemplo (gerados a partir de CPFs reais do banco) para a UI e o
// fluxo funcionarem sem a API real. Ligar o real = setar os secrets abaixo.
//
// Secrets (só quando for ligar o Secullum de verdade):
//   PONTOFOPAG_BASE_URL = https://pontowebintegracaoexterna.secullum.com.br/IntegracaoExterna/
//   SECULLUM_AUTH_URL   = https://autenticador.secullum.com.br
//   SECULLUM_USER, SECULLUM_PASS, SECULLUM_BANCO_ID
//   (opcional) ALLOWED_ORIGINS = domínio próprio de produção

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ---------------------------------------------------------------------------
// CORS (mesmo padrão de gerar-contrato-pdf)
// ---------------------------------------------------------------------------
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

const onlyDigits = (v: unknown) => String(v ?? '').replace(/\D/g, '');
const PUNCH_TIPOS = ['entrada', 'intervalo_saida', 'intervalo_retorno', 'saida'];

// competencia 'YYYY-MM' → primeiro dia 'YYYY-MM-01'
const competenciaToFirstDay = (c?: string) => {
  const m = /^(\d{4})-(\d{2})$/.exec(c ?? '');
  if (m) return `${m[1]}-${m[2]}-01`;
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
};

// ---------------------------------------------------------------------------
// ADAPTER SECULLUM — a ÚNICA parte a ajustar quando ligar a API real.
// Em modo mock, retorna fixtures no formato interno já esperado pelas RPCs.
// ---------------------------------------------------------------------------

interface SyncCfg {
  baseUrl: string; authUrl: string; user: string; pass: string; bancoId: string;
}

async function getSecullumToken(cfg: SyncCfg): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'password', username: cfg.user, password: cfg.pass, client_id: '3'
  });
  const resp = await fetch(`${cfg.authUrl}/Token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!resp.ok) throw new Error(`Auth Secullum falhou: ${resp.status}`);
  const json = await resp.json();
  return json.access_token;
}

async function secullumFetch(cfg: SyncCfg, token: string, path: string, method: string, body?: unknown) {
  const resp = await fetch(`${cfg.baseUrl}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'secullumidbancoselecionado': cfg.bancoId,
      'Accept-Language': 'pt-BR',
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!resp.ok) throw new Error(`Secullum ${path} → ${resp.status}`);
  return await resp.json();
}

// Gera fixtures a partir de CPFs reais do banco para o casamento funcionar.
async function mockBatidas(supabase: any, firstDay: string) {
  const { data: colabs } = await supabase
    .from('colaboradores').select('cpf, nome, matricula').eq('status', 'ativo').limit(3);
  const base = colabs || [];
  const batidas: any[] = [];
  const horas: Record<string, string> = {
    entrada: '08:00:00', intervalo_saida: '12:00:00', intervalo_retorno: '13:00:00', saida: '17:00:00'
  };
  const [y, mo] = firstDay.split('-').map(Number);
  const dias = [2, 3, 4, 5]; // alguns dias do mês
  base.forEach((c: any, ci: number) => {
    dias.forEach((d, di) => {
      const dataRef = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      PUNCH_TIPOS.forEach((tipo) => {
        // Cria uma inconsistência visível: no 1º colaborador, no 1º dia, falta a 'saida'.
        if (ci === 0 && di === 0 && tipo === 'saida') return;
        batidas.push({
          id_externo: `mock-${onlyDigits(c.cpf)}-${dataRef}-${tipo}`,
          cpf: c.cpf, matricula: c.matricula, nome: c.nome, tipo,
          registrado_em: `${dataRef}T${horas[tipo]}-03:00`,
          data_ref: dataRef, competencia: firstDay
        });
      });
    });
  });
  // Um CPF inexistente para exercitar o banner "não casados".
  const dataRef = `${y}-${String(mo).padStart(2, '0')}-02`;
  batidas.push({
    id_externo: `mock-99999999999-${dataRef}-entrada`,
    cpf: '999.999.999-99', matricula: 'X999', nome: 'Funcionário Sem Cadastro', tipo: 'entrada',
    registrado_em: `${dataRef}T08:00:00-03:00`, data_ref: dataRef, competencia: firstDay
  });
  return batidas;
}

async function mockInconsistencias(supabase: any, firstDay: string) {
  const { data: colabs } = await supabase
    .from('colaboradores').select('cpf, nome, matricula').eq('status', 'ativo').limit(1);
  const c = (colabs || [])[0];
  const [y, mo] = firstDay.split('-').map(Number);
  const d1 = `${y}-${String(mo).padStart(2, '0')}-02`;
  const items: any[] = [];
  if (c) {
    items.push({
      id_externo: `mock-incons-${onlyDigits(c.cpf)}-${d1}`,
      cpf: c.cpf, matricula: c.matricula, nome: c.nome, data_ref: d1,
      tipo: 'batida_impar', descricao: 'Número ímpar de batidas no dia (falta a saída).',
      competencia: firstDay
    });
  }
  items.push({
    id_externo: `mock-incons-99999999999-${d1}`,
    cpf: '999.999.999-99', matricula: 'X999', nome: 'Funcionário Sem Cadastro', data_ref: d1,
    tipo: 'pendente_tratamento', descricao: 'Funcionário sem correspondência no Omni ITO.',
    competencia: firstDay
  });
  return items;
}

// Normaliza a resposta REAL do Secullum → formato interno. Ajustar conforme o
// Swagger (pontowebintegracaoexterna.secullum.com.br/docs). Placeholder seguro.
function mapBatidasReal(raw: any, firstDay: string): any[] {
  const arr = Array.isArray(raw) ? raw : (raw?.Batidas ?? raw?.Items ?? []);
  return (arr as any[]).map((b: any, i: number) => {
    const cpf = b.Cpf ?? b.CPF ?? b.cpf ?? '';
    const iso = b.DataHora ?? b.Data ?? b.registrado_em ?? null;
    const dataRef = iso ? String(iso).slice(0, 10) : firstDay;
    return {
      id_externo: String(b.Id ?? b.id ?? `${onlyDigits(cpf)}-${iso}-${i}`),
      cpf, matricula: b.Matricula ?? b.matricula ?? null, nome: b.Nome ?? b.nome ?? null,
      // ordem do dia define o tipo; aqui um fallback linear (ajustar no mapeamento real)
      tipo: PUNCH_TIPOS[i % 4],
      registrado_em: iso, data_ref: dataRef, competencia: firstDay
    };
  });
}

function mapInconsistenciasReal(raw: any, firstDay: string): any[] {
  const arr = Array.isArray(raw) ? raw : (raw?.Inconsistencias ?? raw?.Items ?? []);
  return (arr as any[]).map((it: any, i: number) => {
    const cpf = it.Cpf ?? it.CPF ?? it.cpf ?? '';
    const iso = it.Data ?? it.data_ref ?? null;
    return {
      id_externo: String(it.Id ?? it.id ?? `${onlyDigits(cpf)}-${iso}-${i}`),
      cpf, matricula: it.Matricula ?? null, nome: it.Nome ?? null,
      data_ref: iso ? String(iso).slice(0, 10) : firstDay,
      tipo: it.Tipo ?? it.tipo ?? 'pendente_tratamento',
      descricao: it.Descricao ?? it.descricao ?? null,
      competencia: firstDay
    };
  });
}

// ---------------------------------------------------------------------------
serve(async (req) => {
  const origin = req.headers.get('origin');
  const responseHeaders = getCorsHeaders(origin);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: responseHeaders });

  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { headers: { ...responseHeaders, 'Content-Type': 'application/json' }, status });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, serviceKey);

    // --- Auth: só coordenadora_rh (ou superadmin) ---
    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace(/^Bearer /, '').trim();
    let authorizedEmail: string | null = null;
    if (jwt) {
      const { data: { user } } = await supabase.auth.getUser(jwt);
      if (user) {
        const { data: profile } = await supabase.from('perfis').select('cargo').eq('id', user.id).single();
        const domain = user.email?.split('@')[1];
        if (profile?.cargo === 'coordenadora_rh' || user.email === 'ito.thiagosilva@gmail.com' || domain === 'itoinstituto.com.br') {
          authorizedEmail = user.email ?? null;
        }
      }
    }
    if (!authorizedEmail) return json({ success: false, error: 'Acesso restrito ao RH.' }, 401);

    const { action, competencia } = await req.json().catch(() => ({ action: '' }));
    const firstDay = competenciaToFirstDay(competencia);

    // --- Config / modo ---
    const baseUrl = Deno.env.get('PONTOFOPAG_BASE_URL') ?? '';
    const user = Deno.env.get('SECULLUM_USER') ?? '';
    const MOCK = !baseUrl || !user;
    const cfg: SyncCfg = {
      baseUrl,
      authUrl: Deno.env.get('SECULLUM_AUTH_URL') ?? 'https://autenticador.secullum.com.br',
      user,
      pass: Deno.env.get('SECULLUM_PASS') ?? '',
      bancoId: Deno.env.get('SECULLUM_BANCO_ID') ?? ''
    };
    const modo = MOCK ? 'mock' : 'real';
    const meta = { executado_por: authorizedEmail, modo, competencia: firstDay };

    // --- TEST ---
    if (action === 'test') {
      if (MOCK) {
        await supabase.rpc('registrar_ponto_sync_test', { p_meta: { ...meta, mensagem: 'Conexão em modo simulação (secrets do Secullum não configurados).' } });
        return json({ success: true, modo: 'mock', message: 'Modo simulação ativo.' });
      }
      const token = await getSecullumToken(cfg);
      await secullumFetch(cfg, token, 'Funcionarios', 'GET'); // ping leve
      await supabase.rpc('registrar_ponto_sync_test', { p_meta: { ...meta, mensagem: 'Conectado ao Secullum Ponto Web.' } });
      return json({ success: true, modo: 'real', message: 'Conectado ao Secullum.' });
    }

    // --- SYNC PONTO ---
    if (action === 'sync_ponto') {
      let batidas: any[];
      if (MOCK) {
        batidas = await mockBatidas(supabase, firstDay);
      } else {
        const token = await getSecullumToken(cfg);
        // Endpoint/filtro de batidas — AJUSTAR conforme o Swagger (modelo BatidaFiltro).
        const raw = await secullumFetch(cfg, token, 'Batidas/Filtro', 'POST', { Competencia: firstDay });
        batidas = mapBatidasReal(raw, firstDay);
      }
      const { data, error } = await supabase.rpc('importar_ponto_batidas', { p_batidas: batidas, p_meta: meta });
      if (error) throw error;
      return json(data);
    }

    // --- SYNC INCONSISTÊNCIAS ---
    if (action === 'sync_inconsistencias') {
      let itens: any[];
      if (MOCK) {
        itens = await mockInconsistencias(supabase, firstDay);
      } else {
        const token = await getSecullumToken(cfg);
        const raw = await secullumFetch(cfg, token, 'RelatorioInconsistencias', 'POST', { Competencia: firstDay });
        itens = mapInconsistenciasReal(raw, firstDay);
      }
      const { data, error } = await supabase.rpc('importar_ponto_inconsistencias', { p_itens: itens, p_meta: meta });
      if (error) throw error;
      return json(data);
    }

    return json({ success: false, error: 'Ação inválida.' }, 400);
  } catch (error: any) {
    console.error('pontofopag-sync falhou:', error?.stack || error?.message || error);
    return json({ success: false, error: 'Falha ao sincronizar o ponto. Consulte os logs da função.' }, 500);
  }
});
