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

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const mesExtenso = (comp: string) => {
  const [ano, mes] = comp.split('-');
  const i = Number(mes) - 1;
  return i >= 0 && i < 12 ? `${MESES[i]} · ${ano}` : comp;
};

const iniciais = (nome: string) => {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
};

// Cores por posição (ouro, prata, bronze)
const COR_POS = ['#F5C542', '#C0C7D0', '#CD7F32'];
const MEDALHA = ['🥇', '🥈', '🥉'];

// Posições visuais no SVG: [2º à esquerda, 1º ao centro, 3º à direita]
const SLOTS = [
  { idx: 1, cx: 270, avatarR: 95, avatarY: 430, baseY: 620, baseH: 300, label: '2º' },
  { idx: 0, cx: 540, avatarR: 120, avatarY: 320, baseY: 540, baseH: 380, label: '1º' },
  { idx: 2, cx: 810, avatarR: 85, avatarY: 470, baseY: 680, baseH: 240, label: '3º' }
];

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export default function PodioArte({ top3, fotos, competencia, theme }: PodioArteProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [baixando, setBaixando] = useState(false);

  const bg = theme === 'dark' ? '#0D0D0C' : '#FBFBFA';
  const fg = theme === 'dark' ? '#E5DFD3' : '#0A0A0A';
  const sub = theme === 'dark' ? '#ffffff10' : '#00000012';

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
      canvas.width = 1080; canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (!ctx) { setBaixando(false); URL.revokeObjectURL(url); return; }
      ctx.fillStyle = bg;
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
    <div className="space-y-3">
      <div className="rounded-2xl overflow-hidden border border-white/10 max-w-md mx-auto">
        <svg ref={svgRef} viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', display: 'block', background: bg }}>
          <defs>
            {SLOTS.map((s, i) => (
              <clipPath key={i} id={`clip-${i}`}>
                <circle cx={s.cx} cy={s.avatarY} r={s.avatarR} />
              </clipPath>
            ))}
          </defs>

          {/* Título */}
          <text x="540" y="130" textAnchor="middle" fontFamily="Georgia, serif" fontSize="62" fontWeight="bold" fill={fg}>Funcionário do Mês</text>
          <text x="540" y="185" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="30" fill={fg} opacity="0.6">{escapeXml(mesExtenso(competencia))}</text>
          <text x="540" y="250" textAnchor="middle" fontSize="46">🏆</text>

          {SLOTS.map((s, i) => {
            const item = top3[s.idx];
            if (!item) return null;
            const foto = fotos[s.idx];
            const cor = COR_POS[s.idx] || '#888';
            return (
              <g key={i}>
                {/* Base do pódio */}
                <rect x={s.cx - 130} y={s.baseY} width="260" height={s.baseH} rx="16" fill={sub} stroke={cor} strokeOpacity="0.5" strokeWidth="3" />
                <text x={s.cx} y={s.baseY + 70} textAnchor="middle" fontSize="64" fontWeight="bold" fill={cor}>{s.label}</text>

                {/* Avatar: foto ou monograma */}
                <circle cx={s.cx} cy={s.avatarY} r={s.avatarR + 6} fill="none" stroke={cor} strokeWidth="6" />
                {foto ? (
                  <image href={foto} x={s.cx - s.avatarR} y={s.avatarY - s.avatarR} width={s.avatarR * 2} height={s.avatarR * 2} clipPath={`url(#clip-${i})`} preserveAspectRatio="xMidYMid slice" />
                ) : (
                  <>
                    <circle cx={s.cx} cy={s.avatarY} r={s.avatarR} fill={cor} opacity="0.85" />
                    <text x={s.cx} y={s.avatarY + s.avatarR * 0.32} textAnchor="middle" fontSize={s.avatarR * 0.9} fontWeight="bold" fill="#0D0D0C">{escapeXml(iniciais(item.nome))}</text>
                  </>
                )}
                {/* Medalha */}
                <text x={s.cx + s.avatarR - 10} y={s.avatarY - s.avatarR + 20} textAnchor="middle" fontSize="54">{MEDALHA[s.idx]}</text>

                {/* Nome / setor / votos */}
                <text x={s.cx} y={s.baseY + 130} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="30" fontWeight="bold" fill={fg}>{escapeXml(item.nome.length > 20 ? item.nome.slice(0, 19) + '…' : item.nome)}</text>
                {item.setor && <text x={s.cx} y={s.baseY + 168} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="22" fill={fg} opacity="0.6">{escapeXml(item.setor)}</text>}
                <text x={s.cx} y={s.baseY + 210} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="24" fontWeight="bold" fill={cor}>{item.votos} {item.votos === 1 ? 'voto' : 'votos'}</text>
              </g>
            );
          })}

          <text x="540" y="1030" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="22" fill={fg} opacity="0.4">Instituto Thiago Omena</text>
        </svg>
      </div>

      <div className="flex justify-center">
        <button
          onClick={baixarPng}
          disabled={baixando}
          className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 ${theme === 'dark' ? 'bg-[#E5DFD3] text-[#0D0D0C] hover:bg-[#D4CBB7]' : 'bg-[#0A0A0A] text-[#FBFBFA] hover:bg-[#2A2A2A]'} disabled:opacity-50`}
        >
          {baixando ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Baixar PNG
        </button>
      </div>
    </div>
  );
}
