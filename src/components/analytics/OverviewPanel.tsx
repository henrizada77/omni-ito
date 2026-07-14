
import { 
  TrendingUp, 
  HeartPulse, 
  DollarSign, 
  ShieldAlert,
  ArrowRightLeft,
  UserCheck
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';

interface OverviewPanelProps {
  theme: 'dark' | 'light';
  colaboradoresList: any[];
  ocorrenciasList: any[];
  indicadoresList: any[];
}

export default function OverviewPanel({ theme, colaboradoresList, ocorrenciasList, indicadoresList }: OverviewPanelProps) {
  // Calculations
  const activeColabs = colaboradoresList.filter(c => c.status === 'ativo');
  const activeCount = activeColabs.length;
  const desligadosCount = colaboradoresList.filter(c => c.status === 'desligado').length;
  
  // 1. Turnover Geral
  const turnoverGeral = activeCount > 0 ? Math.round((desligadosCount / activeCount) * 100) : 0;

  // 2. Absenteísmo Geral
  const totalExpectedHours = activeCount * 160;
  let totalLostHours = 0;
  ocorrenciasList.forEach(oc => {
    if (oc.tipo === 'Atraso') {
      const parts = (oc.horas_minutos_desvio || '0:0').split(':');
      const hrs = parseInt(parts[0], 10) || 0;
      const mins = parseInt(parts[1], 10) || 0;
      totalLostHours += hrs + (mins / 60);
    } else if (oc.tipo && oc.tipo.includes('Falta')) {
      totalLostHours += 8; // Assumes 8 hours lost for a full missing day
    }
  });
  const absenteismoGeral = totalExpectedHours > 0 ? parseFloat(((totalLostHours / totalExpectedHours) * 100).toFixed(1)) : 0;

  // 3. Custo Total de Compensação
  const totalSalaries = activeColabs.reduce((acc, c) => {
    const salaryStr = c.salario || '';
    const cleanSalary = parseFloat(salaryStr.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    return acc + cleanSalary;
  }, 0);
  // Estimate benefit values (VA = R$ 600, Plano Saúde = R$ 400, Depily = R$ 200)
  const totalBenefits = activeColabs.reduce((acc, c) => {
    let benefitSum = 0;
    if (c.vale_alimentacao) benefitSum += 600;
    if (c.plano_saude) benefitSum += 400;
    if (c.depily) benefitSum += 200;
    return acc + benefitSum;
  }, 0);
  const totalCompensacao = totalSalaries + totalBenefits;

  // 4. Litígios Ativos
  const activeLitigios = indicadoresList.filter(i => i.tipo === 'Processo Trabalhista' && i.status === 'Ativo');
  const activeLitigiosCount = activeLitigios.length;

  // Render visual cards
  const kpis = [
    {
      title: 'Rotatividade (Turnover)',
      value: `${turnoverGeral}%`,
      desc: `${desligadosCount} desligamentos totais`,
      icon: <ArrowRightLeft size={18} className="text-sky-400" />,
    },
    {
      title: 'Taxa de Absenteísmo',
      value: `${absenteismoGeral}%`,
      desc: `${Math.round(totalLostHours)} horas perdidas`,
      icon: <HeartPulse size={18} className="text-amber-400" />,
    },
    {
      title: 'Custo de Folha & Benefícios',
      value: `R$ ${(totalCompensacao / 1000).toFixed(1)}k`,
      desc: `R$ ${(totalSalaries / 1000).toFixed(1)}k salários base`,
      icon: <DollarSign size={18} className="text-emerald-400" />,
    },
    {
      title: 'Litígios Trabalhistas',
      value: `${activeLitigiosCount}`,
      desc: 'Processos ativos no RH',
      icon: <ShieldAlert size={18} className="text-rose-400" />,
    }
  ];

  // Helper for generating monthly occurrences trend
  const getOverviewTrendData = () => {
    const monthsShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: `${monthsShort[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
        Ocorrencias: 0,
        Auditoria: 0
      };
    });

    ocorrenciasList.forEach(oc => {
      if (!oc.data_ocorrencia) return;
      const date = new Date(oc.data_ocorrencia);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthBucket = last6Months.find(m => m.key === key);
      if (monthBucket) {
        monthBucket.Ocorrencias++;
      }
    });

    return last6Months;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <div 
            key={idx} 
            className={`p-5 rounded-xl border flex items-start justify-between h-28 transition-all hover:scale-[1.01] ${
              theme === 'dark' 
                ? 'bg-[#121211] border-white/5 hover:border-white/10' 
                : 'bg-black/[0.01] border-black/5 hover:border-black/10'
            }`}
          >
            <div className="flex flex-col justify-between h-full">
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-50">{kpi.title}</span>
              <div>
                <span className="text-2xl font-extrabold font-mono block leading-none">{kpi.value}</span>
                <span className="text-[9px] opacity-60 block mt-1">{kpi.desc}</span>
              </div>
            </div>
            <div className={`p-2.5 rounded-lg ${theme==='dark'?'bg-white/5':'bg-black/5'}`}>
              {kpi.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Trend Area Chart */}
        <div className={`p-5 rounded-xl border space-y-4 lg:col-span-2 ${
          theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.01] border-black/5'
        }`}>
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <h4 className="text-xs font-bold uppercase tracking-wider opacity-65 flex items-center gap-1.5">
              <TrendingUp size={14} className="text-emerald-500" /> Tendência de Ocorrências (6 meses)
            </h4>
            <span className="text-[10px] opacity-50 font-mono">Frequência geral de desvios</span>
          </div>
          <div className="h-48 text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getOverviewTrendData()} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOcorrencias" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" stroke="currentColor" opacity={0.4} tickLine={false} />
                <YAxis stroke="currentColor" opacity={0.4} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? '#181816' : '#ffffff',
                    borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    color: theme === 'dark' ? '#E5DFD3' : '#0A0A0A',
                    fontSize: '11px',
                    borderRadius: '8px'
                  }} 
                />
                <Area type="monotone" dataKey="Ocorrencias" name="Ocorrências" stroke="#f59e0b" fillOpacity={1} fill="url(#colorOcorrencias)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dynamic Status panel */}
        <div className={`p-5 rounded-xl border space-y-4 ${
          theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.01] border-black/5'
        }`}>
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <h4 className="text-xs font-bold uppercase tracking-wider opacity-65 flex items-center gap-1.5">
              <UserCheck size={14} className="text-emerald-500" /> Distribuição Operacional
            </h4>
          </div>
          <div className="space-y-4 pt-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="opacity-60">Colaboradores Ativos:</span>
              <span className="font-bold font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10">{activeCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="opacity-60">Admissões Pendentes:</span>
              <span className="font-bold font-mono text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/10">
                {colaboradoresList.filter(c => c.status === 'pendente').length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="opacity-60">Desligados Históricos:</span>
              <span className="font-bold font-mono opacity-50 bg-white/5 px-2 py-0.5 rounded border border-white/5">{desligadosCount}</span>
            </div>
            <div className="pt-2 border-t border-white/5 text-[10px] opacity-45 leading-relaxed">
              Métricas computadas dinamicamente com base nas interações diretas do RH, registros de batida de ponto e auditorias de admissão do Supabase.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
