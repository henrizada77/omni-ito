
import { 
  ShieldAlert, 
  Scale,
  CheckCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';

interface LegalPanelProps {
  theme: 'dark' | 'light';
  indicadoresList: any[];
}

export default function LegalPanel({ theme, indicadoresList }: LegalPanelProps) {
  const litigios = indicadoresList.filter(i => i.tipo === 'Processo Trabalhista');
  const activeLitigios = litigios.filter(l => l.status === 'Ativo');
  const resolvedLitigios = litigios.filter(l => l.status === 'Resolvido');

  const totalRiskValue = activeLitigios.reduce((acc, l) => acc + (parseFloat(l.valor_envolvido) || 0), 0);
  const averageResolutionSla = resolvedLitigios.length > 0
    ? Math.round(resolvedLitigios.reduce((acc, l) => acc + (l.tempo_resolucao_dias || 0), 0) / resolvedLitigios.length)
    : 0;

  // Group processes by sector for the chart
  const getLegalSectorData = () => {
    const sectors: Record<string, { setor: string; Ativos: number; Resolvidos: number }> = {};
    litigios.forEach(l => {
      if (!l.setor) return;
      if (!sectors[l.setor]) {
        sectors[l.setor] = { setor: l.setor, Ativos: 0, Resolvidos: 0 };
      }
      if (l.status === 'Ativo') {
        sectors[l.setor].Ativos++;
      } else {
        sectors[l.setor].Resolvidos++;
      }
    });
    return Object.values(sectors);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-5 rounded-xl border flex flex-col justify-between h-28 ${
          theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.01] border-black/5'
        }`}>
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-50">Litígios Trabalhistas Ativos</span>
          <div>
            <span className={`text-3xl font-extrabold font-mono leading-none ${activeLitigios.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {activeLitigios.length}
            </span>
            <span className="text-[9px] opacity-60 block mt-1">Processos ou contestações em andamento</span>
          </div>
        </div>

        <div className={`p-5 rounded-xl border flex flex-col justify-between h-28 ${
          theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.01] border-black/5'
        }`}>
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-50">Valor Total Estimado em Risco</span>
          <div>
            <span className="text-3xl font-extrabold font-mono leading-none text-rose-400">R$ {(totalRiskValue / 1000).toFixed(1)}k</span>
            <span className="text-[9px] opacity-60 block mt-1">Soma de provisões trabalhistas ativas</span>
          </div>
        </div>

        <div className={`p-5 rounded-xl border flex flex-col justify-between h-28 ${
          theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.01] border-black/5'
        }`}>
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-50">Tempo Médio de Resolução (SLA)</span>
          <div>
            <span className="text-3xl font-extrabold font-mono leading-none text-emerald-400">{averageResolutionSla}d</span>
            <span className="text-[9px] opacity-60 block mt-1">Média de dias para encerramento de disputas</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sector legal bar chart */}
        <div className={`p-5 rounded-xl border space-y-4 lg:col-span-2 ${
          theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.01] border-black/5'
        }`}>
          <div className="pb-2 border-b border-white/5">
            <h4 className="text-xs font-bold uppercase tracking-wider opacity-65 flex items-center gap-1.5">
              <Scale size={14} className="text-emerald-500" /> Distribuição de Processos por Setor
            </h4>
          </div>
          <div className="h-56 text-[10px]">
            {litigios.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getLegalSectorData()} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="setor" stroke="currentColor" opacity={0.4} tickLine={false} />
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
                  <Legend iconSize={8} iconType="circle" />
                  <Bar dataKey="Ativos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Resolvidos" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs opacity-50 italic">
                Nenhum litígio trabalhista registrado no histórico do banco.
              </div>
            )}
          </div>
        </div>

        {/* Litigations listing */}
        <div className={`p-5 rounded-xl border space-y-4 flex flex-col ${
          theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.01] border-black/5'
        }`}>
          <div className="pb-2 border-b border-white/5">
            <h4 className="text-xs font-bold uppercase tracking-wider opacity-65 flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-emerald-500" /> Litígios e Auditoria Trabalhista
            </h4>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[220px] space-y-2 pt-2">
            {litigios.length > 0 ? (
              litigios.map((l) => (
                <div key={l.id} className={`p-3 rounded-lg border text-[11px] space-y-1 ${
                  l.status === 'Ativo' 
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' 
                    : (theme === 'dark' ? 'bg-white/5 border-white/5 text-white/80' : 'bg-black/5 border-black/5 text-black/80')
                }`}>
                  <div className="flex justify-between font-bold">
                    <span>{l.detalhes}</span>
                    <span className="font-mono text-[9px]">{new Date(l.data_registro).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between text-[9px] opacity-75">
                    <span>Setor: {l.setor} · Valor: R$ {parseFloat(l.valor_envolvido || 0).toLocaleString('pt-BR')}</span>
                    <span className="font-bold uppercase tracking-wider">{l.status}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-45 py-8">
                <CheckCircle size={24} className="text-emerald-500 mb-2" />
                <span className="text-[10px] italic">Segurança jurídica máxima! Sem litígios trabalhistas cadastrados.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
