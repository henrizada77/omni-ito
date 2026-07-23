import { Smile, CalendarX } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface ClimaPanelProps {
  theme: 'dark' | 'light';
  pesquisasList: any[];      // pesquisas_satisfacao: { nota, categoria, criado_em }
  ocorrenciasList: any[];    // ocorrencias_jornada: { tipo, data_ocorrencia }
  colaboradoresList: any[];
}

const mesKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const mesLabel = (key: string) => {
  const [y, m] = key.split('-');
  return `${['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][parseInt(m, 10) - 1]}/${y.slice(2)}`;
};
const ultimosMeses = (n: number): string[] => {
  const out: string[] = [];
  const base = new Date();
  for (let i = n - 1; i >= 0; i--) out.push(mesKey(new Date(base.getFullYear(), base.getMonth() - i, 1)));
  return out;
};
const diasUteis = (key: string): number => {
  const [y, m] = key.split('-').map(Number);
  let count = 0;
  const d = new Date(y, m - 1, 1);
  while (d.getMonth() === m - 1) {
    if (d.getDay() !== 0 && d.getDay() !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
};

export default function ClimaPanel({ theme, pesquisasList, ocorrenciasList, colaboradoresList }: ClimaPanelProps) {
  const notas = pesquisasList.filter(p => p && typeof p.nota === 'number');
  const media = (arr: any[]) => arr.length ? arr.reduce((s, p) => s + p.nota, 0) / arr.length : null;

  const mediaGeral = media(notas);
  const mesAtual = mesKey(new Date());
  const mesAnterior = ultimosMeses(2)[0];
  const notasDoMes = (key: string) => notas.filter(p => mesKey(new Date(p.criado_em)) === key);
  const mediaMesAtual = media(notasDoMes(mesAtual));
  const mediaMesAnterior = media(notasDoMes(mesAnterior));
  const tendencia = mediaMesAtual !== null && mediaMesAnterior !== null ? mediaMesAtual - mediaMesAnterior : null;

  const linhaMensal = ultimosMeses(12).map(key => ({
    mes: mesLabel(key),
    media: media(notasDoMes(key)) !== null ? Number(media(notasDoMes(key))!.toFixed(2)) : null
  }));

  const categorias = ['Geral', 'Ambiente', 'Liderança', 'Benefícios', 'Carreira', 'Comunicação'];
  const barrasCategoria = categorias
    .map(cat => ({ categoria: cat, media: media(notas.filter(p => p.categoria === cat)) }))
    .filter(c => c.media !== null)
    .map(c => ({ ...c, media: Number((c.media as number).toFixed(2)) }));

  const headcount = colaboradoresList.filter(c => c && c.status !== 'desligado').length;
  const FALTAS_JUST = 'Falta Justificada (Atestado)';
  const FALTAS_INJUST = 'Falta Injustificada';
  const absenteismo = ultimosMeses(6).map(key => {
    const noMes = ocorrenciasList.filter(o => o && o.data_ocorrencia && o.data_ocorrencia.slice(0, 7) === key);
    const just = noMes.filter(o => o.tipo === FALTAS_JUST).length;
    const injust = noMes.filter(o => o.tipo === FALTAS_INJUST).length;
    const base = diasUteis(key) * Math.max(headcount, 1);
    return {
      mes: mesLabel(key),
      Justificadas: just,
      Injustificadas: injust,
      taxa: Number((((just + injust) / base) * 100).toFixed(2))
    };
  });
  const atrasosPeriodo = ocorrenciasList.filter(o =>
    o && ['Atraso', 'Saída Antecipada'].includes(o.tipo) &&
    o.data_ocorrencia && ultimosMeses(6).includes(o.data_ocorrencia.slice(0, 7))
  ).length;
  const taxaMesAtual = absenteismo[absenteismo.length - 1]?.taxa ?? 0;

  const cardCls = `p-5 rounded-xl border ${theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-white border-black/10 shadow-sm'}`;
  const axisColor = theme === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cardCls}>
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-45 flex items-center gap-1"><Smile size={11} /> Média Geral</span>
          <span className="text-3xl font-black font-mono block mt-2">{mediaGeral !== null ? mediaGeral.toFixed(2) : '—'}<span className="text-sm opacity-40">/5</span></span>
        </div>
        <div className={cardCls}>
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-45">Média do Mês</span>
          <span className="text-3xl font-black font-mono block mt-2">
            {mediaMesAtual !== null ? mediaMesAtual.toFixed(2) : '—'}
            {tendencia !== null && <span className={`text-sm ml-2 ${tendencia >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{tendencia >= 0 ? '▲' : '▼'} {Math.abs(tendencia).toFixed(2)}</span>}
          </span>
        </div>
        <div className={cardCls}>
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-45">Respostas</span>
          <span className="text-3xl font-black font-mono block mt-2">{notas.length}</span>
        </div>
        <div className={cardCls}>
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-45 flex items-center gap-1"><CalendarX size={11} /> Absenteísmo (mês)</span>
          <span className={`text-3xl font-black font-mono block mt-2 ${taxaMesAtual > 3 ? 'text-amber-500' : 'text-emerald-500'}`}>{taxaMesAtual}%</span>
        </div>
      </div>

      <div className={cardCls}>
        <h4 className="text-xs font-bold uppercase tracking-wider opacity-60 mb-4">Evolução da Satisfação — 12 meses</h4>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={linhaMensal}>
            <XAxis dataKey="mes" tick={{ fontSize: 10, fill: axisColor }} />
            <YAxis domain={[1, 5]} tick={{ fontSize: 10, fill: axisColor }} />
            <Tooltip />
            <Line type="monotone" dataKey="media" stroke="#10b981" strokeWidth={2} connectNulls={false} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={cardCls}>
          <h4 className="text-xs font-bold uppercase tracking-wider opacity-60 mb-4">Média por Categoria</h4>
          {barrasCategoria.length === 0 ? <p className="text-xs opacity-50 italic py-6 text-center">Sem respostas ainda.</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barrasCategoria} layout="vertical">
                <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 10, fill: axisColor }} />
                <YAxis type="category" dataKey="categoria" width={90} tick={{ fontSize: 10, fill: axisColor }} />
                <Tooltip />
                <Bar dataKey="media" fill="#38bdf8" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className={cardCls}>
          <h4 className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Absenteísmo — faltas por mês (6 meses)</h4>
          <p className="text-[9px] opacity-45 mb-3">Taxa = faltas ÷ (dias úteis × {headcount} colaboradores). Atrasos + saídas antecipadas no período: <b>{atrasosPeriodo}</b> (fora do índice).</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={absenteismo}>
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: axisColor }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: axisColor }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Justificadas" stackId="f" fill="#38bdf8" />
              <Bar dataKey="Injustificadas" stackId="f" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
