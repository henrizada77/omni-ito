# Omni-ITO — Design System (extraído dos mockups)

Linguagem visual "soft/premium" com acento **azul periwinkle**, cartões bem arredondados, sombras suaves, muito respiro e fotos de perfil. Dois temas: **claro** (branco levemente azulado) e **escuro** (navy profundo, não preto puro).

> ⚠️ Divergência do atual: o app hoje usa acento **creme/bege** (`#E5DFD3`) sobre preto (`#0D0D0C`). O mockup troca para **azul** + **navy**. Adotar é uma mudança de identidade — decidir antes de aplicar em massa.

---

## 1. Cores (tokens)

### Marca / acento (compartilhado)
| Token | Hex | Uso |
|---|---|---|
| `--brand` | `#4F6DF5` | acento primário (botões, ativo, links, ícones ativos) |
| `--brand-strong` | `#3D5AE0` | hover do primário |
| `--brand-soft` (light) | `#E9EEFF` | fundo de chip/pill/nav ativo |
| `--brand-soft` (dark) | `rgba(79,109,245,.14)` | idem no escuro |
| `--brand-ring` | `rgba(79,109,245,.35)` | foco / glow |

### Tema claro
| Token | Hex |
|---|---|
| `--bg` (canvas) | `#F3F5FB` |
| `--surface` (card) | `#FFFFFF` |
| `--surface-2` (input/hover) | `#F1F3F9` |
| `--sidebar` | `#FFFFFF` |
| `--border` | `#E9ECF3` |
| `--text` | `#0F1729` |
| `--text-secondary` | `#5B6472` |
| `--text-muted` | `#8A94A6` |

### Tema escuro
| Token | Hex |
|---|---|
| `--bg` (canvas) | `#0A0E17` |
| `--surface` (card) | `#121A2A` |
| `--surface-2` (input/hover) | `#0F1626` |
| `--sidebar` | `#0C111C` |
| `--border` | `#1E2739` |
| `--text` | `#E6EAF2` |
| `--text-secondary` | `#9AA4B6` |
| `--text-muted` | `#6B7688` |

### Semânticas (soft bg + texto, pill)
| Estado | Texto | Fundo soft (light) |
|---|---|---|
| success (Ativo) | `#12B76A` | `#E7F7EF` |
| warning | `#F59E0B` | `#FEF3E2` |
| danger | `#F04438` | `#FEECEB` |
| info | `#4F6DF5` | `#E9EEFF` |

No escuro, os fundos soft viram `color-mix`/`rgba` do mesmo tom a ~12–16%.

---

## 2. Tipografia

- **Família UI:** `Inter` (fallback `-apple-system, "Segoe UI", sans-serif`). Saudação/nomes podem usar o mesmo Inter em peso 600 — visual limpo e amigável, sem serifa.
- **Escala:**
  | Papel | Tamanho / peso |
  |---|---|
  | Saudação hero ("Bom dia, Camila!") | 30px / 600 |
  | Nome da ficha | 26px / 700 |
  | Título de seção/página | 18–20px / 600 |
  | Número KPI | 28–30px / 700 |
  | Título de card | 14–15px / 600 |
  | Corpo | 13–14px / 400 |
  | Eyebrow/label (uppercase) | 11px / 700, `tracking-wider`, cor muted |
  | Meta/timestamp | 11–12px / 400–500, muted |
  | Badge | 10–11px / 700 |

---

## 3. Forma, elevação e espaçamento

- **Raio:** cartões `20px` (`rounded-[20px]`/`rounded-2xl`); elementos internos `12–14px` (`rounded-xl`); chips de ícone `12–14px`; botões `12px` (`rounded-xl`); pills `full`.
- **Sombra (bem suave):** `0 1px 2px rgba(16,24,40,.04), 0 6px 20px rgba(16,24,40,.05)`. Cartão = hairline border + sombra leve, quase plano. No escuro a sombra some; fica só a borda.
- **Espaçamento:** padding de card `20–24px`; gaps do grid `20–24px`; item de nav `py-2.5 px-3`; respiro generoso entre seções (`space-y-6`).
- **Chip de ícone (KPI/ação):** `44×44`, `rounded-xl`, fundo `--brand-soft`, ícone `--brand` (outline, lucide, ~20px).

---

## 4. Layout (shell)

**Sidebar (~256px)**
- Topo: logo quadrado "ITO" (`rounded-lg`, fundo azul no dark / azul claro no light) + "Omni-ITO / Instituto Thiago Omena / Omni RH".
- Nav: `ícone + label`; **ativo** = pill `--brand-soft` + texto/ícone `--brand` (o mockup usa fundo cheio suave, sem barra lateral). Badges: contagem `rounded-full` azul (info) ou rose (alerta) à direita.
- Rodapé: bloco "Aparência" com toggle de tema + card do usuário (avatar, email, cargo, logout).

**Topbar**
- Busca larga `rounded-2xl` fundo `--surface-2`, ícone de lupa à esquerda, `⌘K` (kbd) à direita.
- Direita: sino com dot de notificação + chip do usuário (avatar circular, nome, cargo, chevron).

**Hero de saudação**
- Card full-width `rounded-2xl`. Light: gradiente azul-claro suave. Dark: navy + arte de "ondas" azul. Esquerda: saudação + subtítulo + botão "Ver comunicados (2)". Direita: imagem decorativa (vaso/flores ou onda abstrata).

**Linha de KPIs (4 cards)**
- Chip de ícone + label pequeno + número grande + sub-label + seta (`→`) no canto como afford. de link.

**Cards de conteúdo**
- "Alertas", "Em Férias Agora": eyebrow com badge de contagem no canto; linhas com **avatar** + nome/subtítulo + **pill de data** à direita; rodapé "Ver todos →".
- "Ações Rápidas": grid 2×2 de tiles (chip de ícone + título + descrição + `→`).
- "Atividades Recentes": lista `ícone + texto + timestamp`.

**Ficha do colaborador**
- Breadcrumb (`Colaboradores › Ficha`). Header card: **avatar grande** com fab de câmera (editar foto) sobreposto, nome + pill de status ("Ativo" verde), cargo/depto, linha de contato com ícones, imagem decorativa à direita, botões "Editar ficha" + `⋯`.
- **Barra de tabs** horizontal (Informações, Documentos, Contrato, Histórico, Férias, Avaliações, Benefícios, Ocorrências) com sublinhado azul no ativo.
- Grid de cards de info (Pessoais / Funcionais / Resumo): cada campo = `ícone + label (muted) + valor`. "Ações Rápidas" em lista à direita.

---

## 5. Receitas de componente (Tailwind)

> Ideal: definir os tokens acima como CSS vars em `:root`/`.dark` e mapear no `tailwind.config` (`colors: { brand: 'var(--brand)', surface: 'var(--surface)', ... }`). Aí as classes viram semânticas (`bg-surface`, `text-muted`, `border-border`) em vez de hex espalhado.

```
Card:        rounded-2xl bg-surface border border-border p-5
             shadow-[0_1px_2px_rgba(16,24,40,.04),0_6px_20px_rgba(16,24,40,.05)]
KPI chip:    w-11 h-11 rounded-xl grid place-items-center bg-brand/10 text-brand
Nav item:    flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
  ativo:     bg-brand/10 text-brand
  inativo:   text-secondary hover:bg-surface-2
Badge/pill:  rounded-full px-2.5 py-0.5 text-[11px] font-semibold  (soft bg + cor do estado)
Btn primary: rounded-xl bg-brand text-white px-4 py-2.5 text-sm font-semibold hover:bg-brand-strong
Btn ghost:   rounded-xl border border-border bg-surface hover:bg-surface-2 text-sm
Search:      rounded-2xl bg-surface-2 border border-border px-4 py-3 flex items-center gap-2
Avatar:      rounded-full object-cover ring-1 ring-border  (fab de câmera: -bottom-1 -right-1)
Status dot:  círculo 8px verde + label  (Ativo)
Tab ativo:   text-brand + border-b-2 border-brand
```

---

## 6. Como aplicar (staging sugerido)

1. **Tokens primeiro:** criar as CSS vars (light/.dark) + mapear no `tailwind.config`. Sem isso, a troca vira find/replace frágil de hex.
2. **Shell:** sidebar + topbar + hero + linha de KPIs (maior impacto visual, poucos arquivos).
3. **Cards do dashboard** (Alertas, Em Férias, Ações Rápidas, Atividades).
4. **Ficha do colaborador** (header + tabs + cards de info).
5. **Demais abas e páginas públicas** herdam os tokens.

Cada etapa é testável (`npx tsc --noEmit -p tsconfig.app.json`) e isolável num commit.
