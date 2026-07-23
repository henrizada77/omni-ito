
import { 
  ArrowRightLeft, 
  UserMinus, 
  AlertTriangle
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import { listarSemestres, turnoverSemestre } from '../../utils/turnover';

interface TurnoverPanelProps {
  theme: 'dark' | 'light';
  colaboradoresList: any[];
  movimentacoesList?: any[];
}

export default function TurnoverPanel({ theme, colaboradoresList, movimentacoesList = [] }: TurnoverPanelProps) {
  const activeColabs = colaboradoresList.filter(c => c.status === 'ativo' || c.status === 'em_ferias');
  const desligados = colaboradoresList.filter(c => c.status === 'desligado');
  const desligadosCount = desligados.length;

  // Turnover semestral (helper puro). Menor data de movimento define o início.
  const todasDatas: string[] = [];
  colaboradoresList.forEach((c: any) => { if (c?.data_admissao) todasDatas.push(String(c.data_admissao).slice(0, 10)); });
  movimentacoesList.forEach((m: any) => { if (m?.data_admissao) todasDatas.push(String(m.data_admissao).slice(0, 10)); });
  const hojeISO = new Date().toISOString().slice(0, 10);
  const dataMin = todasDatas.length ? todasDatas.reduce((a, b) => (a < b ? a : b)) : hojeISO;
  const semestres = listarSemestres(dataMin, hojeISO);
  const evolucao = semestres.map((sem) => {
    const t = turnoverSemestre(sem, colaboradoresList, movimentacoesList);
    return { semestre: sem.label, taxa: Number(t.taxa.toFixed(1)), adm: t.admissoes, dem: t.demissoes, efetivo: Number(t.efetivoMedio.toFixed(1)) };
  });
  const semestreAtual = evolucao[evolucao.length - 1] ?? { semestre: '—', taxa: 0, adm: 0, dem: 0, efetivo: 0 };

  // 2. Voluntário vs Involuntário Pie Chart
  const voluntarioCount = desligados.filter(d => d.tipo_desligamento === 'Voluntario').length;
  const involuntarioCount = desligados.filter(d => d.tipo_desligamento === 'Involuntario').length;

  const donutData = [
    { name: 'Voluntário', value: voluntarioCount, color: '#3b82f6' }, // Blue
    { name: 'Involuntário', value: involuntarioCount, color: '#ef4444' } // Red/Wine
  ];

  const hasDonutData = voluntarioCount > 0 || involuntarioCount > 0;

  // 3. Turnover by Sector (Horizontal Bar Chart)
  const getSectorTurnoverData = () => {
    const sectors = [
      'Biomedicina', 
      'Recepção', 
      'Financeiro', 
      'Call Center', 
      'Smartshape', 
      'Enfermagem', 
      'Farmácia', 
      'Serviços Gerais', 
      'Nutrição', 
      'Administrativo'
    ];

    return sectors.map(sec => {
      const activeInSec = activeColabs.filter(c => c.setor === sec).length;
      const desligadosInSec = desligados.filter(d => d.setor === sec).length;
      
      const rate = activeInSec > 0 ? Math.round((desligadosInSec / activeInSec) * 100) : (desligadosInSec > 0 ? 100 : 0);
      
      return {
        setor: sec,
        'Taxa de Turnover (%)': rate,
        Ativos: activeInSec,
        Desligados: desligadosInSec
      };
    }).sort((a, b) => b['Taxa de Turnover (%)'] - a['Taxa de Turnover (%)']);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI: Turnover Geral */}
        <div className={`p-5 rounded-xl border flex flex-col justify-between h-28 ${
          theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.01] border-black/5'
        }`}>
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-50">Turnover Semestral ({semestreAtual.semestre})</span>
          <div>
            <span className="text-3xl font-extrabold font-mono leading-none">{semestreAtual.taxa}%</span>
            <span className="text-[9px] opacity-60 block mt-1">adm {semestreAtual.adm} · dem {semestreAtual.dem} · efetivo médio {semestreAtual.efetivo}</span>
          </div>
        </div>

        {/* KPI: Desligamentos Voluntários */}
        <div className={`p-5 rounded-xl border flex flex-col justify-between h-28 ${
          theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.01] border-black/5'
        }`}>
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-50">Desligamentos Iniciados pelo Colaborador</span>
          <div>
            <span className="text-3xl font-extrabold font-mono leading-none text-blue-400">{voluntarioCount}</span>
            <span className="text-[9px] opacity-60 block mt-1">Pedidos de demissão voluntária</span>
          </div>
        </div>

        {/* KPI: Desligamentos Involuntários */}
        <div className={`p-5 rounded-xl border flex flex-col justify-between h-28 ${
          theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.01] border-black/5'
        }`}>
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-50">Desligamentos por Decisão do Instituto</span>
          <div>
            <span className="text-3xl font-extrabold font-mono leading-none text-rose-400">{involuntarioCount}</span>
            <span className="text-[9px] opacity-60 block mt-1">Demissões diretas e desligamentos</span>
          </div>
        </div>
      </div>

      <div className={`p-5 rounded-xl border space-y-4 ${theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.01] border-black/5'}`}>
        <div className="pb-2 border-b border-white/5">
          <h4 className="text-xs font-bold uppercase tracking-wider opacity-65">Evolução do Turnover por Semestre</h4>
        </div>
        <div className="h-48 text-[10px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={evolucao} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
              <XAxis dataKey="semestre" stroke="currentColor" opacity={0.4} tickLine={false} />
              <YAxis stroke="currentColor" opacity={0.4} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                formatter={(value: any, _n: any, p: any) => [`${value}%`, 'Turnover', `adm ${p.payload.adm} · dem ${p.payload.dem} · efetivo ${p.payload.efetivo}`]}
                contentStyle={{ backgroundColor: theme === 'dark' ? '#181816' : '#ffffff', borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', color: theme === 'dark' ? '#E5DFD3' : '#0A0A0A', fontSize: '11px', borderRadius: '8px' }}
              />
              <Bar dataKey="taxa" fill={theme === 'dark' ? '#E5DFD3' : '#0A0A0A'} radius={[4, 4, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sector Turnover Bar Chart */}
        <div className={`p-5 rounded-xl border space-y-4 lg:col-span-2 ${
          theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.01] border-black/5'
        }`}>
          <div className="pb-2 border-b border-white/5">
            <h4 className="text-xs font-bold uppercase tracking-wider opacity-65 flex items-center gap-1.5">
              <ArrowRightLeft size={14} className="text-emerald-500" /> Comparativo de Evasão por Setor
            </h4>
          </div>
          <div className="h-56 text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getSectorTurnoverData()} layout="vertical" margin={{ top: 5, right: 15, left: 15, bottom: 5 }}>
                <XAxis type="number" stroke="currentColor" opacity={0.4} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis dataKey="setor" type="category" stroke="currentColor" opacity={0.4} tickLine={false} width={80} />
                <Tooltip 
                  formatter={(value, _name, props) => [`${value}%`, 'Taxa de Turnover', `Ativos: ${props.payload.Ativos}, Desligados: ${props.payload.Desligados}`]}
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? '#181816' : '#ffffff',
                    borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    color: theme === 'dark' ? '#E5DFD3' : '#0A0A0A',
                    fontSize: '11px',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="Taxa de Turnover (%)" fill={theme === 'dark' ? '#E5DFD3' : '#0A0A0A'} radius={[0, 4, 4, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Voluntário vs Involuntário Donut Chart */}
        <div className={`p-5 rounded-xl border space-y-4 flex flex-col justify-between ${
          theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.01] border-black/5'
        }`}>
          <div className="pb-2 border-b border-white/5">
            <h4 className="text-xs font-bold uppercase tracking-wider opacity-65 flex items-center gap-1.5">
              <UserMinus size={14} className="text-emerald-500" /> Motivo do Desligamento
            </h4>
          </div>
          
          {hasDonutData ? (
            <div className="h-40 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.filter(d => d.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: theme === 'dark' ? '#181816' : '#ffffff',
                      borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      color: theme === 'dark' ? '#E5DFD3' : '#0A0A0A',
                      fontSize: '11px',
                      borderRadius: '8px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center">
                <span className="text-lg font-bold block leading-none font-mono">{desligadosCount}</span>
                <span className="text-[8px] opacity-50 uppercase tracking-widest block mt-0.5">Demissões</span>
              </div>
            </div>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center text-center opacity-45">
              <AlertTriangle size={24} className="mb-2" />
              <span className="text-[10px] italic">Sem desligamentos registrados para exibir proporções.</span>
            </div>
          )}

          <div className="flex justify-center gap-6 text-[10px] font-semibold opacity-85">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              <span>Voluntário ({voluntarioCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span>Involuntário ({involuntarioCount})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
