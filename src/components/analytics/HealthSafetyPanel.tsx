
import { 
  CalendarDays, 
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';

interface HealthSafetyPanelProps {
  theme: 'dark' | 'light';
  colaboradoresList: any[];
  ocorrenciasList: any[];
  indicadoresList: any[];
}

export default function HealthSafetyPanel({ theme, colaboradoresList, ocorrenciasList, indicadoresList }: HealthSafetyPanelProps) {
  const activeCount = colaboradoresList.filter(c => c.status === 'ativo').length;
  
  // 1. Absenteísmo Geral (%)
  const totalExpectedHours = activeCount * 160;
  let totalLostHours = 0;
  ocorrenciasList.forEach(oc => {
    if (oc.tipo && oc.tipo.includes('Falta')) {
      totalLostHours += 8; // 1 full day = 8 hours
    } else if (oc.tipo === 'Atraso' || oc.tipo === 'Saída Antecipada' || oc.tipo === 'Descumprimento de Carga') {
      const parts = (oc.horas_minutos_desvio || '').split(':');
      const h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      const parsedVal = h + (m / 60);
      totalLostHours += parsedVal > 0 ? parsedVal : 2; // fallback to 2h if empty
    }
  });
  const absenteismoGeral = totalExpectedHours > 0 ? parseFloat(((totalLostHours / totalExpectedHours) * 100).toFixed(1)) : 0;

  // 2. Dias Perdidos por Doença (Falta Justificada (Atestado))
  const atestados = ocorrenciasList.filter(oc => oc.tipo === 'Falta Justificada (Atestado)');
  const totalAtestadosCount = atestados.length;

  const getAtestadosBySector = () => {
    const sectorAtestados: Record<string, { setor: string; 'Dias Perdidos': number }> = {};
    
    colaboradoresList.forEach(c => {
      if (c.setor && !sectorAtestados[c.setor]) {
        sectorAtestados[c.setor] = { setor: c.setor, 'Dias Perdidos': 0 };
      }
    });

    atestados.forEach(oc => {
      const sector = oc.colaboradores?.setor || 'Outros';
      if (!sectorAtestados[sector]) {
        sectorAtestados[sector] = { setor: sector, 'Dias Perdidos': 0 };
      }
      sectorAtestados[sector]['Dias Perdidos']++;
    });

    return Object.values(sectorAtestados).sort((a,b) => b['Dias Perdidos'] - a['Dias Perdidos']);
  };

  // 3. Acidentes de Trabalho (SST)
  const acidentes = indicadoresList.filter(i => i.tipo === 'Acidente de Trabalho');
  const totalAcidentesCount = acidentes.length;
  const activeAcidentesCount = acidentes.filter(a => a.status === 'Ativo').length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-5 rounded-xl border flex flex-col justify-between h-28 ${
          theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.01] border-black/5'
        }`}>
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-50">Absenteísmo Geral (%)</span>
          <div>
            <span className="text-3xl font-extrabold font-mono leading-none">{absenteismoGeral}%</span>
            <span className="text-[9px] opacity-60 block mt-1">{Math.round(totalLostHours)} horas produtivas perdidas</span>
          </div>
        </div>

        <div className={`p-5 rounded-xl border flex flex-col justify-between h-28 ${
          theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.01] border-black/5'
        }`}>
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-50">Dias Ausentes por Doença (Atestados)</span>
          <div>
            <span className="text-3xl font-extrabold font-mono leading-none text-emerald-400">{totalAtestadosCount}d</span>
            <span className="text-[9px] opacity-60 block mt-1">Total de faltas justificadas com atestado</span>
          </div>
        </div>

        <div className={`p-5 rounded-xl border flex flex-col justify-between h-28 ${
          theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.01] border-black/5'
        }`}>
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-50">Acidentes de Trabalho (SST)</span>
          <div>
            <span className={`text-3xl font-extrabold font-mono leading-none ${activeAcidentesCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {totalAcidentesCount}
            </span>
            <span className="text-[9px] opacity-60 block mt-1">
              {activeAcidentesCount} acidentes ativos sob acompanhamento
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Days lost by sickness by sector */}
        <div className={`p-5 rounded-xl border space-y-4 lg:col-span-2 ${
          theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.01] border-black/5'
        }`}>
          <div className="pb-2 border-b border-white/5">
            <h4 className="text-xs font-bold uppercase tracking-wider opacity-65 flex items-center gap-1.5">
              <CalendarDays size={14} className="text-emerald-500" /> Dias Perdidos por Doença / Setor
            </h4>
          </div>
          <div className="h-56 text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getAtestadosBySector()} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="setor" stroke="currentColor" opacity={0.4} tickLine={false} />
                <YAxis stroke="currentColor" opacity={0.4} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  formatter={(value) => [`${value} dias`, 'Ausência por Atestado']}
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? '#181816' : '#ffffff',
                    borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    color: theme === 'dark' ? '#E5DFD3' : '#0A0A0A',
                    fontSize: '11px',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="Dias Perdidos" fill="#10b981" radius={[4, 4, 0, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Accident log details */}
        <div className={`p-5 rounded-xl border space-y-4 flex flex-col ${
          theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.01] border-black/5'
        }`}>
          <div className="pb-2 border-b border-white/5">
            <h4 className="text-xs font-bold uppercase tracking-wider opacity-65 flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-emerald-500" /> Registro de Ocorrências SST
            </h4>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[220px] space-y-2 pt-2">
            {acidentes.length > 0 ? (
              acidentes.map((a) => (
                <div key={a.id} className={`p-3 rounded-lg border text-[11px] space-y-1 ${
                  a.status === 'Ativo' 
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' 
                    : (theme === 'dark' ? 'bg-white/5 border-white/5 text-white/80' : 'bg-black/5 border-black/5 text-black/80')
                }`}>
                  <div className="flex justify-between font-bold">
                    <span>{a.detalhes}</span>
                    <span className="font-mono text-[9px]">{new Date(a.data_registro).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between text-[9px] opacity-75">
                    <span>Setor: {a.setor}</span>
                    <span className="font-bold uppercase tracking-wider">{a.status}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-45 py-8">
                <CheckCircle2 size={24} className="text-emerald-500 mb-2" />
                <span className="text-[10px] italic">Nenhum acidente de trabalho registrado. Compliance SST em 100%.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
