# Solicitação de Vaga (aba Vagas — parte A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Coordenadores abrem solicitações de vaga por página pública sem login; o RH lê no painel, muda status, registra o link da vaga no site externo e uma anotação interna.

**Architecture:** Espelha o modelo da Ouvidoria (sprint14). Tabela `solicitacoes_vaga` com RLS: `anon`/`authenticated` só INSERT de linha "crua"; SELECT/UPDATE/DELETE só RH. Página pública `/solicitar-vaga` insere direto via `supabase.from(...).insert()`. No painel RH, um componente lazy `VagasManager` (padrão de `RiscoManager`/`FolhaManager`) lista, filtra por status e edita cada solicitação. Badge de "novas" na sidebar segue o padrão de `folhaPendentes`.

**Tech Stack:** React 18 + TypeScript + Vite, Supabase (Postgres + RLS), react-router-dom, lucide-react, Tailwind (classes inline). Sem framework de teste.

## Global Constraints

- Verificação de tipos: `npx tsc --noEmit -p tsconfig.app.json` (exit 0). `tsc --noEmit` puro é NO-OP — sempre usar `-p tsconfig.app.json`. O root tsconfig tem `noUnusedLocals: true`: variável/import não usado quebra o build.
- Migrações SQL rodam **manualmente** no SQL Editor do projeto real (`jyvxhyaeagqljvqqeuwi`) — o MCP Supabase ligado é outra conta. Não aplicar migração por MCP/CLI. O código deve degradar sem crash enquanto a tabela não existe (tratar `error` das queries).
- RLS de leitura/edição do RH usa exatamente: `public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com'` (mesmo predicado da sprint14). No front, o gate equivalente é `hasFullAccess`.
- Datas exibidas de coluna date/timestamp: ancorar strings de 10 chars com `+ 'T12:00:00'` antes de `new Date(...)` (evita -1 dia em UTC-3). Aqui só há `criado_em`/`atualizado_em` (timestamptz), que já vêm com hora — não precisam de âncora.
- Toda falha de rede reporta ao usuário (`notify`/`setError`), nunca engole silenciosamente. Todo insert/update checa `error`.
- Não repetir o gigantesco `Dashboard.tsx`: a lógica da aba vai num componente próprio `src/components/vagas/VagasManager.tsx`.

---

## File Structure

- `supabase/sprint30_solicitacoes_vaga.sql` — **criar**. Tabela + índices + trigger `atualizado_em` + RLS.
- `src/pages/public/SolicitarVaga.tsx` — **criar**. Página pública do formulário do coordenador.
- `src/components/vagas/VagasManager.tsx` — **criar**. Painel RH: lista, filtro, detalhe/edição, auditoria.
- `src/App.tsx` — **modificar**. Import + `Route` de `/solicitar-vaga`; entrada `/app/vagas` em `APP_ROUTES`.
- `src/pages/private/Dashboard.tsx` — **modificar**. Lazy import de `VagasManager`; item de sidebar "Vagas"; badge de novas; render da aba em `activePath === '/app/vagas'`.

---

## Task 1: Migração SQL — tabela `solicitacoes_vaga` + RLS

**Files:**
- Create: `supabase/sprint30_solicitacoes_vaga.sql`

**Interfaces:**
- Consumes: função existente `public.get_user_role()` e `public.trg_fn_touch_atualizado_em()` (criadas em sprints anteriores; o script recria a trigger function por segurança, como a sprint14 faz).
- Produces: tabela `public.solicitacoes_vaga` com colunas: `id uuid`, `coordenador_nome text`, `setor text`, `titulo_cargo text`, `quantidade integer`, `funcoes text`, `requisitos text`, `justificativa text`, `tipo_contratacao text`, `urgencia text` (`Baixa|Média|Alta`), `status text` (`nova|em_analise|publicada|preenchida|arquivada`), `link_externo text`, `resposta_interna text`, `atualizado_em timestamptz`, `criado_em timestamptz`. Nomes de coluna consumidos por Task 2 (insert) e Task 3 (select/update).

- [ ] **Step 1: Escrever o arquivo SQL completo (idempotente)**

Create `supabase/sprint30_solicitacoes_vaga.sql`:

```sql
-- ----------------------------------------------------------------------------
-- SPRINT 30 — SOLICITAÇÃO DE VAGA (aba Vagas, parte A)
-- ----------------------------------------------------------------------------
-- Rodar no Supabase SQL Editor do projeto real. Idempotente.
--
-- Superfície pública anônima:
--   /solicitar-vaga → solicitacoes_vaga (coordenador descreve a vaga necessária)
--
-- Modelo da ouvidoria (sprint14): anon só INSERT de linha "crua"; leitura,
-- update (status/link/resposta) e delete só para o RH. Não é canal anônimo:
-- o coordenador se identifica com nome + setor. Não gravamos IP/UA.
-- ----------------------------------------------------------------------------

create table if not exists public.solicitacoes_vaga (
  id uuid primary key default gen_random_uuid(),
  coordenador_nome text not null,
  setor text not null,
  titulo_cargo text not null,
  quantidade integer not null default 1,
  funcoes text not null,            -- atividades/funções da vaga
  requisitos text,                  -- necessidades/requisitos
  justificativa text,               -- por que a vaga é necessária
  tipo_contratacao text,            -- CLT | PJ | Estágio | Temporário | A definir
  urgencia text not null default 'Média'
    constraint check_urgencia_vaga check (urgencia in ('Baixa','Média','Alta')),
  status text not null default 'nova'
    constraint check_status_vaga
    check (status in ('nova','em_analise','publicada','preenchida','arquivada')),
  link_externo text,                -- URL da vaga no site externo (preenchido pelo RH)
  resposta_interna text,            -- anotação do RH
  atualizado_em timestamp with time zone default timezone('utc'::text, now()) not null,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.solicitacoes_vaga is
  'Solicitações de vaga abertas por coordenadores (página pública /solicitar-vaga). '
  'link_externo e resposta_interna são preenchidos só pelo RH.';

create index if not exists idx_solicitacoes_vaga_status on public.solicitacoes_vaga(status);
create index if not exists idx_solicitacoes_vaga_criado on public.solicitacoes_vaga(criado_em desc);

-- Trigger de atualizado_em (reaproveita a função da sprint14; recria por segurança)
create or replace function public.trg_fn_touch_atualizado_em()
returns trigger as $$
begin new.atualizado_em := now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_solicitacoes_vaga_touch on public.solicitacoes_vaga;
create trigger trg_solicitacoes_vaga_touch
  before update on public.solicitacoes_vaga
  for each row execute function public.trg_fn_touch_atualizado_em();

-- ----------------------------------------------------------------------------
-- RLS — INSERT anônimo (linha crua), leitura/edição só RH
-- ----------------------------------------------------------------------------

alter table public.solicitacoes_vaga enable row level security;

-- Anon só pode inserir solicitação "crua": status inicial, sem link nem resposta.
-- Bloqueia envio pré-classificado ou com dado plantado por terceiro.
drop policy if exists "Insercao anonima de solicitacao de vaga" on public.solicitacoes_vaga;
create policy "Insercao anonima de solicitacao de vaga"
  on public.solicitacoes_vaga for insert
  to anon
  with check (
    (status is null or status = 'nova')
    and link_externo is null
    and resposta_interna is null
  );

drop policy if exists "Insercao autenticada de solicitacao de vaga" on public.solicitacoes_vaga;
create policy "Insercao autenticada de solicitacao de vaga"
  on public.solicitacoes_vaga for insert
  to authenticated
  with check (
    (status is null or status = 'nova')
    and link_externo is null
    and resposta_interna is null
  );

drop policy if exists "Leitura de solicitacao de vaga para RH" on public.solicitacoes_vaga;
create policy "Leitura de solicitacao de vaga para RH"
  on public.solicitacoes_vaga for select
  to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Update de solicitacao de vaga para RH" on public.solicitacoes_vaga;
create policy "Update de solicitacao de vaga para RH"
  on public.solicitacoes_vaga for update
  to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com')
  with check (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

drop policy if exists "Exclusao de solicitacao de vaga para RH" on public.solicitacoes_vaga;
create policy "Exclusao de solicitacao de vaga para RH"
  on public.solicitacoes_vaga for delete
  to authenticated
  using (public.get_user_role() = 'coordenadora_rh' or auth.jwt() ->> 'email' = 'ito.thiagosilva@gmail.com');

notify pgrst, 'reload schema';
```

- [ ] **Step 2: Conferir contra a sprint14**

Ler `supabase/sprint14_pesquisa_ouvidoria.sql` e confirmar que os predicados de RLS, o nome `trg_fn_touch_atualizado_em` e o `notify pgrst` batem. Este SQL é rodado manualmente pelo usuário; não há execução automatizada aqui.

- [ ] **Step 3: Commit**

```bash
git add supabase/sprint30_solicitacoes_vaga.sql
git commit -m "feat: sprint30 - tabela solicitacoes_vaga (aba Vagas parte A)"
```

---

## Task 2: Página pública `/solicitar-vaga`

**Files:**
- Create: `src/pages/public/SolicitarVaga.tsx`
- Modify: `src/App.tsx` (import + `Route`)

**Interfaces:**
- Consumes: tabela `solicitacoes_vaga` da Task 1 (insert). `supabase` de `../../supabaseClient`. Props `{ theme: 'dark' | 'light'; setTheme: (t: 'dark' | 'light') => void }` (mesmo shape de `Ouvidoria`).
- Produces: componente default `SolicitarVaga` e rota `/solicitar-vaga` (sem auth).

- [ ] **Step 1: Criar a página**

Create `src/pages/public/SolicitarVaga.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Sun,
  Moon,
  Send,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

interface SolicitarVagaProps {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

// Mesma lista de setores da Ouvidoria, para consistência dos filtros no RH.
const SETORES = [
  'Recepção', 'Enfermagem', 'Biomedicina', 'Farmácia', 'Nutrição',
  'Call Center', 'Smartshape', 'Financeiro', 'Serviços Gerais', 'Coordenação/RH', 'Outro'
];

const TIPOS_CONTRATACAO = ['CLT', 'PJ', 'Estágio', 'Temporário', 'A definir'];
const URGENCIAS = ['Baixa', 'Média', 'Alta'] as const;

export default function SolicitarVaga({ theme, setTheme }: SolicitarVagaProps) {
  const [coordenadorNome, setCoordenadorNome] = useState('');
  const [setor, setSetor] = useState('');
  const [tituloCargo, setTituloCargo] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [funcoes, setFuncoes] = useState('');
  const [requisitos, setRequisitos] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [tipoContratacao, setTipoContratacao] = useState('A definir');
  const [urgencia, setUrgencia] = useState<typeof URGENCIAS[number]>('Média');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.className = theme === 'dark'
      ? 'dark bg-[#0D0D0C] text-[#E5DFD3] antialiased'
      : 'light bg-[#FBFBFA] text-[#0A0A0A] antialiased';
  }, [theme]);

  const submit = async () => {
    if (!coordenadorNome.trim()) return setError('Informe seu nome.');
    if (!setor) return setError('Selecione o setor.');
    if (!tituloCargo.trim()) return setError('Informe o cargo/título da vaga.');
    if (funcoes.trim().length < 10) return setError('Descreva as funções com pelo menos 10 caracteres.');

    setSubmitting(true);
    setError('');
    try {
      const { error: dbErr } = await supabase.from('solicitacoes_vaga').insert({
        coordenador_nome: coordenadorNome.trim(),
        setor,
        titulo_cargo: tituloCargo.trim(),
        quantidade: Math.max(1, Number(quantidade) || 1),
        funcoes: funcoes.trim(),
        requisitos: requisitos.trim() || null,
        justificativa: justificativa.trim() || null,
        tipo_contratacao: tipoContratacao,
        urgencia
      });
      if (dbErr) throw dbErr;
      setSubmitted(true);
    } catch (err: any) {
      console.error('Falha ao registrar solicitação de vaga:', err);
      setError('Não foi possível registrar a solicitação agora. Tente novamente em instantes.');
    } finally {
      setSubmitting(false);
    }
  };

  const cardBg = theme === 'dark' ? 'glass-card-dark border-white/10' : 'glass-card-light border-black/10';
  const inputBg = theme === 'dark' ? 'bg-[#0D0D0C] border-white/15 focus:border-[#E5DFD3]/40' : 'bg-white border-black/15 focus:border-black/40';
  const btnPrimary = theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C] hover:bg-[#D4CBB7]' : 'bg-[#0A0A0A] text-[#FBFBFA] hover:bg-[#2A2A2A]';
  const labelCls = 'block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-2';

  return (
    <div className={`min-h-screen p-6 flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-500 ${
      theme === 'dark' ? 'bg-[#0D0D0C] text-[#E5DFD3]' : 'bg-[#FBFBFA] text-[#0A0A0A]'
    }`}>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="absolute top-6 left-6">
        <Link
          to="/"
          className={`p-2 rounded-lg border transition-colors flex items-center gap-1.5 text-xs ${
            theme === 'dark' ? 'border-white/10 hover:bg-white/5 bg-[#0D0D0C]' : 'border-black/10 hover:bg-black/5 bg-[#FBFBFA]'
          }`}
        >
          <ArrowLeft size={14} /> Voltar
        </Link>
      </div>

      <div className="absolute top-6 right-6">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={`p-2 rounded-lg border transition-colors ${
            theme === 'dark' ? 'border-white/10 hover:bg-white/5 bg-[#0D0D0C]' : 'border-black/10 hover:bg-black/5 bg-[#FBFBFA]'
          }`}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      <div className="w-full max-w-lg relative z-10 my-8">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold tracking-tight text-sm ${
            theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C]' : 'bg-[#0A0A0A] text-[#FBFBFA]'
          }`}>ITO</div>
          <span className="font-semibold tracking-wider text-base">INSTITUTO THIAGO OMENA</span>
        </div>

        {submitted ? (
          <div className={`rounded-2xl border p-8 text-center space-y-6 animate-fadeIn ${cardBg}`}>
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/25 rounded-full flex items-center justify-center mx-auto text-emerald-500 animate-bounce">
              <CheckCircle size={32} />
            </div>
            <div className="space-y-3">
              <h2 className="text-xl font-bold">Solicitação enviada ao RH</h2>
              <p className="text-xs opacity-70 max-w-md mx-auto leading-relaxed">
                Sua solicitação de vaga foi registrada. A coordenação de RH vai
                analisar e dar andamento à divulgação.
              </p>
            </div>
          </div>
        ) : (
          <div className={`rounded-2xl border p-6 md:p-8 space-y-5 ${cardBg}`}>
            <div>
              <span className="px-2.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Abertura de Vaga
              </span>
              <h2 className="text-xl font-bold mt-2">Solicitar vaga</h2>
              <p className="text-xs opacity-60 mt-1 leading-relaxed">
                Coordenador: descreva a vaga necessária. O RH recebe, analisa e
                cadastra a divulgação.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-2">
                <AlertTriangle size={14} /> {error}
              </div>
            )}

            <div>
              <label className={labelCls}>Seu nome *</label>
              <input
                value={coordenadorNome}
                onChange={e => setCoordenadorNome(e.target.value)}
                maxLength={120}
                className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Setor *</label>
                <select value={setor} onChange={e => setSetor(e.target.value)} className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`}>
                  <option value="">— Selecione —</option>
                  {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Quantidade</label>
                <input
                  type="number"
                  min={1}
                  value={quantidade}
                  onChange={e => setQuantidade(Number(e.target.value))}
                  className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Cargo / título da vaga *</label>
              <input
                value={tituloCargo}
                onChange={e => setTituloCargo(e.target.value)}
                maxLength={160}
                className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`}
              />
            </div>

            <div>
              <label className={labelCls}>Funções / atividades *</label>
              <textarea
                value={funcoes}
                onChange={e => setFuncoes(e.target.value)}
                rows={4}
                maxLength={4000}
                placeholder="O que a pessoa vai fazer no dia a dia."
                className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`}
              />
            </div>

            <div>
              <label className={labelCls}>Requisitos / necessidades</label>
              <textarea
                value={requisitos}
                onChange={e => setRequisitos(e.target.value)}
                rows={3}
                maxLength={4000}
                placeholder="Formação, experiência, habilidades desejadas."
                className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`}
              />
            </div>

            <div>
              <label className={labelCls}>Justificativa</label>
              <textarea
                value={justificativa}
                onChange={e => setJustificativa(e.target.value)}
                rows={2}
                maxLength={2000}
                placeholder="Por que a vaga é necessária (substituição, expansão...)."
                className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Tipo de contratação</label>
                <select value={tipoContratacao} onChange={e => setTipoContratacao(e.target.value)} className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`}>
                  {TIPOS_CONTRATACAO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Urgência</label>
                <select value={urgencia} onChange={e => setUrgencia(e.target.value as typeof URGENCIAS[number])} className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`}>
                  {URGENCIAS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className={`w-full py-3 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 ${btnPrimary} disabled:opacity-50`}
            >
              {submitting ? 'Enviando...' : <><Send size={13} /> Enviar solicitação</>}
            </button>

            <div className="text-[10px] opacity-40 font-mono flex items-center justify-center gap-1.5 pt-4 border-t border-white/5">
              <ShieldCheck size={12} className="text-emerald-500" />
              Vai direto para a coordenação de RH
            </div>
          </div>
        )}

        <div className="text-center mt-4 flex items-center justify-center gap-1 opacity-60">
          <Briefcase size={11} />
          <span className="text-[11px]">Abertura de vaga · Instituto Thiago Omena</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Registrar import e rota pública em `src/App.tsx`**

Adicionar o import junto aos outros imports de páginas públicas (após a linha `import Ouvidoria from './pages/public/Ouvidoria';`):

```tsx
import SolicitarVaga from './pages/public/SolicitarVaga';
```

Adicionar a rota junto às públicas (após o bloco `<Route path="/ouvidoria" ... />`):

```tsx
        <Route
          path="/solicitar-vaga"
          element={<SolicitarVaga theme={theme} setTheme={setTheme} />}
        />
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: exit 0, sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/pages/public/SolicitarVaga.tsx src/App.tsx
git commit -m "feat: pagina publica /solicitar-vaga (abertura de vaga pelo coordenador)"
```

---

## Task 3: Componente `VagasManager` (painel RH)

**Files:**
- Create: `src/components/vagas/VagasManager.tsx`

**Interfaces:**
- Consumes: tabela `solicitacoes_vaga` (select/update) da Task 1. `supabase` de `../../supabaseClient`. Props `{ theme: 'dark' | 'light'; userId: string; userEmail: string }`.
- Produces: componente default `VagasManager`. É renderizado pelo Dashboard na Task 4 (lazy import + `<Suspense>`).

- [ ] **Step 1: Criar o componente**

Create `src/components/vagas/VagasManager.tsx`:

```tsx
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import {
  Briefcase,
  Loader2,
  AlertTriangle,
  Save,
  ExternalLink,
  Filter,
  RefreshCw
} from 'lucide-react';

interface VagasManagerProps {
  theme: 'dark' | 'light';
  userId: string;
  userEmail: string;
}

interface SolicitacaoVaga {
  id: string;
  coordenador_nome: string;
  setor: string;
  titulo_cargo: string;
  quantidade: number;
  funcoes: string;
  requisitos: string | null;
  justificativa: string | null;
  tipo_contratacao: string | null;
  urgencia: 'Baixa' | 'Média' | 'Alta';
  status: 'nova' | 'em_analise' | 'publicada' | 'preenchida' | 'arquivada';
  link_externo: string | null;
  resposta_interna: string | null;
  atualizado_em: string;
  criado_em: string;
}

const STATUSES: SolicitacaoVaga['status'][] = ['nova', 'em_analise', 'publicada', 'preenchida', 'arquivada'];
const STATUS_LABEL: Record<SolicitacaoVaga['status'], string> = {
  nova: 'Nova',
  em_analise: 'Em análise',
  publicada: 'Publicada',
  preenchida: 'Preenchida',
  arquivada: 'Arquivada'
};
const URGENCIA_RANK: Record<SolicitacaoVaga['urgencia'], number> = { Alta: 0, 'Média': 1, Baixa: 2 };

const fmtData = (iso: string) => {
  const d = new Date(iso); // timestamptz já traz hora; sem risco de -1 dia
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
};

export default function VagasManager({ theme, userId, userEmail }: VagasManagerProps) {
  const [lista, setLista] = useState<SolicitacaoVaga[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState<'todas' | SolicitacaoVaga['status']>('todas');
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);

  // Rascunho de edição da solicitação selecionada
  const [editStatus, setEditStatus] = useState<SolicitacaoVaga['status']>('nova');
  const [editLink, setEditLink] = useState('');
  const [editResposta, setEditResposta] = useState('');
  const [salvando, setSalvando] = useState(false);

  const fetchLista = async () => {
    setLoading(true);
    setErro('');
    const { data, error } = await supabase
      .from('solicitacoes_vaga')
      .select('*')
      .order('criado_em', { ascending: false });
    if (error) {
      console.error('Falha ao carregar solicitações de vaga:', error);
      setErro('Não foi possível carregar as solicitações.');
      setLista([]);
    } else {
      setLista((data || []) as SolicitacaoVaga[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchLista(); }, []);

  const logAuditoria = async (acao: string, detalhes: any = {}) => {
    try {
      await supabase.from('logs_auditoria').insert({
        usuario_id: userId,
        usuario_email: userEmail,
        acao,
        detalhes
      });
    } catch (err) {
      console.error('Audit log failed:', err);
    }
  };

  // Ordena por urgência (Alta→Baixa) e, dentro da urgência, mais recente primeiro.
  const listaOrdenada = useMemo(() => {
    const filtrada = filtro === 'todas' ? lista : lista.filter(s => s.status === filtro);
    return [...filtrada].sort((a, b) => {
      const ru = URGENCIA_RANK[a.urgencia] - URGENCIA_RANK[b.urgencia];
      if (ru !== 0) return ru;
      return b.criado_em.localeCompare(a.criado_em);
    });
  }, [lista, filtro]);

  const novasCount = useMemo(() => lista.filter(s => s.status === 'nova').length, [lista]);

  const abrirDetalhe = (s: SolicitacaoVaga) => {
    setSelecionadaId(s.id);
    setEditStatus(s.status);
    setEditLink(s.link_externo || '');
    setEditResposta(s.resposta_interna || '');
  };

  const salvar = async (s: SolicitacaoVaga) => {
    setSalvando(true);
    setErro('');
    const { error } = await supabase
      .from('solicitacoes_vaga')
      .update({
        status: editStatus,
        link_externo: editLink.trim() || null,
        resposta_interna: editResposta.trim() || null
      })
      .eq('id', s.id);
    if (error) {
      console.error('Falha ao salvar solicitação de vaga:', error);
      setErro('Não foi possível salvar. Tente novamente.');
      setSalvando(false);
      return;
    }
    await logAuditoria('SOLICITACAO_VAGA_ATUALIZADA', {
      solicitacao_id: s.id,
      titulo_cargo: s.titulo_cargo,
      status: editStatus
    });
    setSalvando(false);
    setSelecionadaId(null);
    await fetchLista();
  };

  const cardBg = theme === 'dark' ? 'bg-white/[0.03] border-white/10' : 'bg-black/[0.02] border-black/10';
  const inputBg = theme === 'dark' ? 'bg-[#0D0D0C] border-white/15 focus:border-[#E5DFD3]/40' : 'bg-white border-black/15 focus:border-black/40';
  const btnPrimary = theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C] hover:bg-[#D4CBB7]' : 'bg-[#0A0A0A] text-[#FBFBFA] hover:bg-[#2A2A2A]';

  const urgenciaCor = (u: SolicitacaoVaga['urgencia']) =>
    u === 'Alta' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
      : u === 'Média' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
        : 'bg-sky-500/10 text-sky-500 border-sky-500/20';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="pb-6 border-b border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Briefcase size={20} /> Vagas
          </h2>
          <p className="text-xs opacity-60 mt-1">
            Solicitações de vaga enviadas pelos coordenadores.
            {novasCount > 0 && <span className="ml-1 font-bold text-rose-500">{novasCount} nova(s).</span>}
          </p>
        </div>
        <button
          onClick={fetchLista}
          className={`self-start px-3 py-2 rounded-lg border text-xs flex items-center gap-1.5 ${theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'}`}
        >
          <RefreshCw size={13} /> Atualizar
        </button>
      </div>

      {erro && (
        <div className="p-3 rounded-lg text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-2">
          <AlertTriangle size={14} /> {erro}
        </div>
      )}

      {/* Filtro por status */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider opacity-50 flex items-center gap-1"><Filter size={12} /> Status</span>
        {(['todas', ...STATUSES] as const).map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
              filtro === f
                ? (theme === 'dark' ? 'bg-white/10 border-white/20' : 'bg-black/10 border-black/20')
                : (theme === 'dark' ? 'border-white/10 opacity-60 hover:opacity-100' : 'border-black/10 opacity-60 hover:opacity-100')
            }`}
          >
            {f === 'todas' ? 'Todas' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs opacity-60 py-10 justify-center">
          <Loader2 size={16} className="animate-spin" /> Carregando...
        </div>
      ) : listaOrdenada.length === 0 ? (
        <div className="text-center text-xs opacity-50 py-10">Nenhuma solicitação nesse filtro.</div>
      ) : (
        <div className="grid gap-3">
          {listaOrdenada.map(s => {
            const aberta = selecionadaId === s.id;
            return (
              <div key={s.id} className={`rounded-xl border p-4 ${cardBg}`}>
                <div className="flex items-start justify-between gap-3">
                  <button className="text-left flex-1" onClick={() => (aberta ? setSelecionadaId(null) : abrirDetalhe(s))}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm">{s.titulo_cargo}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${urgenciaCor(s.urgencia)}`}>{s.urgencia}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border border-white/10 opacity-70">{STATUS_LABEL[s.status]}</span>
                      {s.quantidade > 1 && <span className="text-[10px] opacity-60">×{s.quantidade}</span>}
                    </div>
                    <div className="text-[11px] opacity-60 mt-1">
                      {s.setor} · {s.coordenador_nome} · {fmtData(s.criado_em)}
                    </div>
                  </button>
                  {s.link_externo && (
                    <a href={s.link_externo} target="_blank" rel="noopener noreferrer" className="text-emerald-500 opacity-80 hover:opacity-100" title="Abrir vaga publicada">
                      <ExternalLink size={15} />
                    </a>
                  )}
                </div>

                {aberta && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
                    {/* Dados enviados (read-only) */}
                    <div className="grid gap-2 text-xs">
                      <div><span className="opacity-50">Funções: </span>{s.funcoes}</div>
                      {s.requisitos && <div><span className="opacity-50">Requisitos: </span>{s.requisitos}</div>}
                      {s.justificativa && <div><span className="opacity-50">Justificativa: </span>{s.justificativa}</div>}
                      {s.tipo_contratacao && <div><span className="opacity-50">Contratação: </span>{s.tipo_contratacao}</div>}
                    </div>

                    {/* Edição RH */}
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Status</label>
                        <select value={editStatus} onChange={e => setEditStatus(e.target.value as SolicitacaoVaga['status'])} className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`}>
                          {STATUSES.map(st => <option key={st} value={st}>{STATUS_LABEL[st]}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Link da vaga (site externo)</label>
                        <input value={editLink} onChange={e => setEditLink(e.target.value)} placeholder="https://..." className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Anotação interna</label>
                      <textarea value={editResposta} onChange={e => setEditResposta(e.target.value)} rows={2} maxLength={2000} className={`w-full text-xs px-3 py-2 rounded-lg border ${inputBg}`} />
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => salvar(s)}
                        disabled={salvando}
                        className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 ${btnPrimary} disabled:opacity-50`}
                      >
                        {salvando ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Salvar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: exit 0. (Atenção a `noUnusedLocals`: todos os imports de ícone acima são usados.)

- [ ] **Step 3: Commit**

```bash
git add src/components/vagas/VagasManager.tsx
git commit -m "feat: VagasManager - painel RH de solicitacoes de vaga"
```

---

## Task 4: Wiring da aba "Vagas" no Dashboard

**Files:**
- Modify: `src/App.tsx` (entrada em `APP_ROUTES`)
- Modify: `src/pages/private/Dashboard.tsx` (import lazy, ícone, nav item, badge, render da aba)

**Interfaces:**
- Consumes: `VagasManager` da Task 3 (props `theme`, `userId`, `userEmail`). Padrões existentes do Dashboard: `activePath`, `hasFullAccess`, `sidebarLinks`, `navigate`, o estado-badge no estilo de `folhaPendentes`, `user`.
- Produces: rota privada `/app/vagas` e a aba renderizada.

- [ ] **Step 1: Adicionar `/app/vagas` em `APP_ROUTES` (`src/App.tsx`)**

Na array `APP_ROUTES`, adicionar (depois de `{ path: '/app/cargos', allowedRoles: ['coordenadora_rh'] },`):

```tsx
  { path: '/app/vagas', allowedRoles: ['coordenadora_rh'] },
```

- [ ] **Step 2: Lazy import de `VagasManager` no Dashboard**

Em `src/pages/private/Dashboard.tsx`, junto aos outros lazy imports (perto da linha `const FolhaManager = lazy(() => import('../../components/folha/FolhaManager'));`):

```tsx
const VagasManager = lazy(() => import('../../components/vagas/VagasManager'));
```

- [ ] **Step 3: Importar o ícone `UserPlus`**

No import de `lucide-react` do Dashboard (bloco que termina em `  BookOpen\n} from 'lucide-react';`), adicionar `UserPlus,` à lista:

```tsx
  BookOpen,
  UserPlus
} from 'lucide-react';
```

- [ ] **Step 4: Item de sidebar "Vagas"**

Na array `sidebarLinks` (dentro do bloco `hasFullAccess ? [...]`), adicionar após a linha de `feedback` (`{ path: '/app/feedback', label: 'Voz do Time', ... }`):

```tsx
      { path: '/app/vagas', label: 'Vagas', icon: <UserPlus size={16} /> },
```

- [ ] **Step 5: Estado + fetch do badge de novas (padrão `folhaPendentes`)**

Logo após o bloco `const [folhaPendentes, setFolhaPendentes] = useState(0);` e seu `useEffect` (por volta da linha 2389), adicionar:

```tsx
  // Badge da sidebar: solicitações de vaga com status 'nova'.
  const [vagasNovas, setVagasNovas] = useState(0);
  useEffect(() => {
    if (!hasFullAccess) return;
    let active = true;
    (async () => {
      const { count } = await supabase
        .from('solicitacoes_vaga')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'nova');
      if (active) setVagasNovas(count || 0);
    })();
    return () => { active = false; };
  }, [hasFullAccess, activePath]);
```

- [ ] **Step 6: Ligar o badge no map da sidebar**

No cálculo de `badge` dentro de `sidebarLinks.map(...)` (por volta da linha 2428), estender a cadeia:

De:
```tsx
            const badge = link.path === '/app/feedback'
              ? pulseAlertasNovos
              : link.path === '/app/folha'
                ? folhaPendentes
                : 0;
```
Para:
```tsx
            const badge = link.path === '/app/feedback'
              ? pulseAlertasNovos
              : link.path === '/app/folha'
                ? folhaPendentes
                : link.path === '/app/vagas'
                  ? vagasNovas
                  : 0;
```

- [ ] **Step 7: Render da aba**

Junto às outras condições de aba (perto de `activePath === '/app/riscos'` / `'/app/folha'`, por volta da linha 5357), adicionar:

```tsx
            {activePath === '/app/vagas' && hasFullAccess && (
              <VagasManager theme={theme} userId={user?.id || ''} userEmail={user?.email || ''} />
            )}
```

Confirmar que este bloco está dentro do mesmo `<Suspense>` que envolve `RiscoManager`/`FolhaManager` (os componentes lazy vizinhos já estão sob Suspense no mesmo container — usar o mesmo aninhamento).

- [ ] **Step 8: Verificar tipos**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: exit 0. Se acusar `UserPlus` não usado, confirmar que o item de sidebar (Step 4) foi adicionado; se acusar `vagasNovas` não usado, confirmar o Step 6.

- [ ] **Step 9: Commit**

```bash
git add src/App.tsx src/pages/private/Dashboard.tsx
git commit -m "feat: aba Vagas no painel RH (rota, sidebar, badge de novas)"
```

---

## Task 5: Verificação de ponta a ponta + revisão da branch

**Files:** nenhum (verificação).

- [ ] **Step 1: Type-check final**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: exit 0.

- [ ] **Step 2: Build de produção (opcional, confirma bundling do lazy chunk)**

Run: `npm run build`
Expected: build conclui sem erro; um chunk novo para `VagasManager` aparece na saída do Vite.

- [ ] **Step 3: Checklist de fluxo manual (o usuário roda `sprint30_*.sql` no projeto real antes)**

1. Abrir `/solicitar-vaga` deslogado → preencher e enviar → tela "Solicitação enviada ao RH".
2. Logar como RH → sidebar mostra "Vagas" com badge de novas.
3. Aba Vagas lista a solicitação como "Nova", ordenada por urgência.
4. Abrir detalhe → mudar status para "Publicada", colar `link_externo`, salvar → persiste, badge decrementa, ícone de link externo aparece no card.
5. Recarregar → estado persistido. Conferir uma linha nova em `logs_auditoria` com ação `SOLICITACAO_VAGA_ATUALIZADA`.

- [ ] **Step 4: Confirmar degradação sem a tabela**

Antes de rodar o SQL, a aba Vagas deve exibir "Não foi possível carregar as solicitações." (erro tratado) em vez de crashar. Confirmar no console que o erro foi logado, não lançado.

- [ ] **Step 5: Revisão final da branch (subagente na Opus, se usando SDD)**

Revisar o diff completo dos 4 commits desta feature: RLS (anon só linha crua), ausência de segredos, `hasFullAccess` no gate da aba, tratamento de `error` em todos os selects/updates, sem `any` desnecessário escapando.

---

## Self-Review (executado ao escrever o plano)

**1. Cobertura do spec:**
- Bloco 1 (banco) → Task 1. ✔ (colunas, índices status+criado_em, trigger `trg_fn_touch_atualizado_em`, RLS anon-crua / RH read-write-delete).
- Bloco 2 (página pública `/solicitar-vaga` com os campos e validação mínima) → Task 2. ✔
- Bloco 3 (aba RH: lista, filtro por status, badge de novas, detalhe com status/link/resposta + salvar + `logAuditoria('SOLICITACAO_VAGA_ATUALIZADA')`, ordena por urgência e data) → Task 3 (componente) + Task 4 (badge/nav). ✔
- Bloco 4 (wiring: rota pública, item de sidebar, render por `activePath === '/app/vagas'`, carregar lista) → Task 2 (rota pública) + Task 4 (sidebar/render). ✔ A lista é carregada dentro do próprio `VagasManager` (não em `fetchColaboradoresList`), o que reduz churn no Dashboard — desvio consciente e menor do "carrega em fetchColaboradoresList" do spec.
- Fora de escopo (teste comportamental, candidatura, API externa, e-mail) → não implementado. ✔
- Erros/verificação (`notify`/`setError`, checar `error`, `tsc -p tsconfig.app.json`) → presente em cada task. ✔

**2. Placeholders:** nenhum "TBD/TODO"; todo passo de código traz o código real. ✔

**3. Consistência de tipos:** nomes de coluna idênticos entre SQL (Task 1), insert do form (Task 2) e interface `SolicitacaoVaga` (Task 3). `status`/`urgencia` com os mesmos literais em SQL check, form e union TS. Props de `VagasManager` (`theme`, `userId`, `userEmail`) batem com a chamada no Dashboard (Task 4). ✔
