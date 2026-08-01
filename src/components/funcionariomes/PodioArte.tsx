import { useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

export interface TopItem {
  colaborador_id: string;
  nome: string;
  setor: string | null;
  votos: number;
}

interface PodioArteProps {
  top3: TopItem[];
  fotos: (string | null)[]; // dataURL alinhado por índice com top3 (null = monograma)
  competencia: string;      // 'YYYY-MM'
  theme: 'dark' | 'light';
}

const MESES = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
];

const mesExtenso = (comp: string) => {
  const [ano, mes] = comp.split('-');
  const i = Number(mes) - 1;
  return i >= 0 && i < 12 ? `${MESES[i]} DE ${ano}` : comp;
};

/**
 * Retorna o primeiro nome (ou primeiro + segundo se o primeiro for curto como "Ana", "João").
 * Evita nomes longos e quebras de linha estéticas na arte.
 */
const formatarNomeCurto = (nomeCompleto: string) => {
  if (!nomeCompleto) return '';
  const partes = nomeCompleto.trim().split(/\s+/);
  if (partes.length === 1) return partes[0];
  // Se o primeiro nome for curto (<= 3 letras), inclui o segundo nome
  if (partes[0].length <= 3 && partes[1]) {
    return `${partes[0]} ${partes[1]}`;
  }
  return partes[0];
};

const iniciais = (nome: string) => {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
};

// Cores temáticas por posição (1º Ouro, 2º Prata, 3º Bronze)
const CORES_POS = [
  { pos: '1º', cor: '#F5C542', corSoft: 'rgba(245, 197, 66, 0.15)', corGlow: 'rgba(245, 197, 66, 0.35)', medalha: '🥇', label: '1º LUGAR' },
  { pos: '2º', cor: '#C0C7D0', corSoft: 'rgba(192, 199, 208, 0.15)', corGlow: 'rgba(192, 199, 208, 0.35)', medalha: '🥈', label: '2º LUGAR' },
  { pos: '3º', cor: '#CD7F32', corSoft: 'rgba(205, 127, 50, 0.15)', corGlow: 'rgba(205, 127, 50, 0.35)', medalha: '🥉', label: '3º LUGAR' }
];

// Posições visuais no pódio de 1080x1080: [2º à esquerda, 1º ao centro, 3º à direita]
const SLOTS = [
  { idx: 1, cx: 270, avatarR: 95, avatarY: 450, baseY: 630, baseH: 310 },
  { idx: 0, cx: 540, avatarR: 120, avatarY: 360, baseY: 530, baseH: 410 },
  { idx: 2, cx: 810, avatarR: 85, avatarY: 490, baseY: 670, baseH: 270 }
];

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export default function PodioArte({ top3, fotos, competencia, theme }: PodioArteProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [baixando, setBaixando] = useState(false);

  const isDark = theme === 'dark';
  const bgFill = isDark ? '#0A0E17' : '#F3F5FB';
  const textPrimary = isDark ? '#E6EAF2' : '#0F1729';
  const textMuted = isDark ? '#9AA4B6' : '#5B6472';
  const cardFill = isDark ? '#121A2A' : '#FFFFFF';
  const borderStroke = isDark ? '#1E2739' : '#E9ECF3';

  const baixarPng = () => {
    const svg = svgRef.current;
    if (!svg) return;
    setBaixando(true);
    const xml = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (!ctx) { setBaixando(false); URL.revokeObjectURL(url); return; }
      ctx.fillStyle = bgFill;
      ctx.fillRect(0, 0, 1080, 1080);
      ctx.drawImage(img, 0, 0, 1080, 1080);
      canvas.toBlob(blob => {
        if (blob) {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `funcionario-do-mes-${competencia}.png`;
          a.click();
          URL.revokeObjectURL(a.href);
        }
        URL.revokeObjectURL(url);
        setBaixando(false);
      }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); setBaixando(false); };
    img.src = url;
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl overflow-hidden border border-white/10 max-w-md mx-auto shadow-2xl">
        <svg
          ref={svgRef}
          viewBox="0 0 1080 1080"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', display: 'block', background: bgFill }}
        >
          <defs>
            {/* Gradientes decorativos de fundo */}
            <radialGradient id="goldGlow" cx="50%" cy="30%" r="50%">
              <stop offset="0%" stopColor="#F5C542" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#F5C542" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="brandGlow" cx="50%" cy="80%" r="60%">
              <stop offset="0%" stopColor="#4F6DF5" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#4F6DF5" stopOpacity="0" />
            </radialGradient>

            {/* Clipping paths para avatares redondos */}
            {SLOTS.map((s, i) => (
              <clipPath key={i} id={`clip-${i}`}>
                <circle cx={s.cx} cy={s.avatarY} r={s.avatarR} />
              </clipPath>
            ))}
          </defs>

          {/* Fundo com orbs decorativas */}
          <rect width="1080" height="1080" fill={bgFill} />
          <circle cx="540" cy="300" r="450" fill="url(#goldGlow)" />
          <circle cx="540" cy="850" r="550" fill="url(#brandGlow)" />

          {/* Cabeçalho de Destaque */}
          <g transform="translate(540, 100)">
            {/* Tag Badge */}
            <rect x="-180" y="0" width="360" height="40" rx="20" fill="rgba(79, 109, 245, 0.15)" stroke="#4F6DF5" strokeOpacity="0.4" strokeWidth="2" />
            <text x="0" y="25" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontSize="16" fontWeight="800" letterSpacing="3" fill="#4F6DF5">RECONHECIMENTO &amp; CULTURA</text>

            {/* Título Principal */}
            <text x="0" y="90" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontSize="56" fontWeight="900" letterSpacing="-1" fill={textPrimary}>
              Funcionário do Mês
            </text>

            {/* Mês de Referência */}
            <rect x="-160" y="115" width="320" height="36" rx="18" fill={cardFill} stroke={borderStroke} strokeWidth="2" />
            <text x="0" y="139" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontSize="16" fontWeight="700" letterSpacing="2" fill={textMuted}>
              {escapeXml(mesExtenso(competencia))}
            </text>
          </g>

          {/* Pódio e Integrantes */}
          {SLOTS.map((s, i) => {
            const item = top3[s.idx];
            if (!item) return null;
            const foto = fotos[s.idx];
            const meta = CORES_POS[s.idx];
            const nomeCurto = formatarNomeCurto(item.nome);

            return (
              <g key={i}>
                {/* Pilar do Pódio */}
                <rect
                  x={s.cx - 130}
                  y={s.baseY}
                  width="260"
                  height={s.baseH}
                  rx="24"
                  fill={cardFill}
                  stroke={meta.cor}
                  strokeOpacity="0.6"
                  strokeWidth="4"
                />

                {/* Sombra suave interna do pódio */}
                <rect
                  x={s.cx - 130}
                  y={s.baseY}
                  width="260"
                  height="60"
                  rx="24"
                  fill={meta.corSoft}
                />

                {/* Número da Posição */}
                <text x={s.cx} y={s.baseY + 45} textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontSize="36" fontWeight="900" fill={meta.cor}>
                  {meta.pos}
                </text>

                {/* Glow Ring atrás do Avatar */}
                <circle cx={s.cx} cy={s.avatarY} r={s.avatarR + 14} fill={meta.corGlow} />

                {/* Borda Externa da Foto */}
                <circle cx={s.cx} cy={s.avatarY} r={s.avatarR + 6} fill={cardFill} stroke={meta.cor} strokeWidth="6" />

                {/* Foto ou Monograma das Iniciais */}
                {foto ? (
                  <image
                    href={foto}
                    x={s.cx - s.avatarR}
                    y={s.avatarY - s.avatarR}
                    width={s.avatarR * 2}
                    height={s.avatarR * 2}
                    clipPath={`url(#clip-${i})`}
                    preserveAspectRatio="xMidYMid slice"
                  />
                ) : (
                  <>
                    <circle cx={s.cx} cy={s.avatarY} r={s.avatarR} fill={meta.cor} opacity="0.9" />
                    <text x={s.cx} y={s.avatarY + s.avatarR * 0.32} textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontSize={s.avatarR * 0.85} fontWeight="900" fill="#0A0E17">
                      {escapeXml(iniciais(item.nome))}
                    </text>
                  </>
                )}

                {/* Badge da Medalha 🥇/🥈/🥉 */}
                <g transform={`translate(${s.cx + s.avatarR - 15}, ${s.avatarY - s.avatarR + 15})`}>
                  <circle cx="0" cy="0" r="28" fill={cardFill} stroke={meta.cor} strokeWidth="3" />
                  <text x="0" y="8" textAnchor="middle" fontSize="28">{meta.medalha}</text>
                </g>

                {/* Informações: Primeiro Nome + Setor + Votos */}
                {/* 1. Primeiro Nome (Destacado e limpo) */}
                <text
                  x={s.cx}
                  y={s.baseY + 110}
                  textAnchor="middle"
                  fontFamily="Inter, system-ui, sans-serif"
                  fontSize={nomeCurto.length > 10 ? '28' : '34'}
                  fontWeight="800"
                  fill={textPrimary}
                >
                  {escapeXml(nomeCurto)}
                </text>

                {/* 2. Setor (Pill ou texto secundário) */}
                {item.setor && (
                  <g transform={`translate(${s.cx}, ${s.baseY + 150})`}>
                    <rect
                      x="-100"
                      y="-18"
                      width="200"
                      height="30"
                      rx="15"
                      fill={isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}
                      stroke={borderStroke}
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="3"
                      textAnchor="middle"
                      fontFamily="Inter, system-ui, sans-serif"
                      fontSize="14"
                      fontWeight="600"
                      fill={textMuted}
                    >
                      {escapeXml(item.setor.length > 18 ? item.setor.slice(0, 17) + '…' : item.setor)}
                    </text>
                  </g>
                )}

                {/* 3. Contagem de Votos */}
                <g transform={`translate(${s.cx}, ${s.baseY + 205})`}>
                  <rect
                    x="-70"
                    y="-18"
                    width="140"
                    height="32"
                    rx="16"
                    fill={meta.corSoft}
                    stroke={meta.cor}
                    strokeOpacity="0.4"
                    strokeWidth="1.5"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fontFamily="Inter, system-ui, sans-serif"
                    fontSize="15"
                    fontWeight="800"
                    fill={meta.cor}
                  >
                    {item.votos} {item.votos === 1 ? 'VOTO' : 'VOTOS'}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Rodapé da Arte */}
          <g transform="translate(540, 1025)">
            <text textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontSize="16" fontWeight="800" letterSpacing="4" fill={textMuted} opacity="0.6">
              OMNI ITO · INSTITUTO THIAGO OMENA
            </text>
          </g>
        </svg>
      </div>

      <div className="flex justify-center">
        <button
          onClick={baixarPng}
          disabled={baixando}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 ${theme === 'dark' ? 'bg-brand text-white hover:bg-brand-strong' : 'bg-brand text-white hover:bg-brand-strong'} shadow-lg shadow-brand/20 disabled:opacity-50 transition-all cursor-pointer`}
        >
          {baixando ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Baixar Arte em PNG (1080x1080)
        </button>
      </div>
    </div>
  );
}
