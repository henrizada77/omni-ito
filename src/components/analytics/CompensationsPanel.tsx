
import { 
  Smile, 
  Percent
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

interface Benefit {
  id: string;
  nome: string;
  tipo: 'adicional' | 'desconto';
  valor_padrao: number;
}

interface Association {
  colaborador_id: string;
  beneficio_id: string;
  valor_customizado: number | null;
}

interface CompensationsPanelProps {
  theme: 'dark' | 'light';
  colaboradoresList: any[];
  indicadoresList: any[];
  benefitsList: Benefit[];
  associationsList: Association[];
}

export default function CompensationsPanel({ theme, colaboradoresList, indicadoresList, benefitsList, associationsList }: CompensationsPanelProps) {
  const activeColabs = colaboradoresList.filter(c => c.status === 'ativo');

  // Salary parser: handles "R$ 2.500,00" → 2500
  const parseSalary = (salaryStr: string): number => {
    const clean = salaryStr
      .replace('R$', '')
      .trim()
      .replace(/\./g, '')   // remove thousands separator dots
      .replace(',', '.');   // convert decimal comma to dot
    return parseFloat(clean) || 0;
  };

  // 1. Custo Total de Compensação
  const totalSalaries = activeColabs.reduce((acc, c) => {
    return acc + parseSalary(c.salario || '');
  }, 0);

  // Real benefit cost: sum associations for active collaborators
  // For each active colab, find all their benefit associations and sum the values
  const benefitBreakdown: Record<string, { nome: string; total: number; count: number }> = {};

  const totalBenefits = activeColabs.reduce((acc, colab) => {
    const colabAssocs = associationsList.filter(a => a.colaborador_id === colab.id);
    let colabBenefitTotal = 0;

    colabAssocs.forEach(assoc => {
      const benefit = benefitsList.find(b => b.id === assoc.beneficio_id);
      if (benefit && benefit.tipo === 'adicional') {
        let value = assoc.valor_customizado;
        if (value === null || value === undefined) {
          if (benefit.nome.toLowerCase().includes('vale transporte') || benefit.valor_padrao < 1) {
            const baseValue = parseSalary(colab.salario || '');
            value = baseValue * (benefit.valor_padrao < 1 ? benefit.valor_padrao : 0.06);
          } else {
            value = benefit.valor_padrao;
          }
        }
        colabBenefitTotal += value;

        // Track breakdown per benefit name
        if (!benefitBreakdown[benefit.id]) {
          benefitBreakdown[benefit.id] = { nome: benefit.nome, total: 0, count: 0 };
        }
        benefitBreakdown[benefit.id].total += value;
        benefitBreakdown[benefit.id].count += 1;
      }
    });

    return acc + colabBenefitTotal;
  }, 0);

  const totalCompensacao = totalSalaries + totalBenefits;

  // Build subtitle: top 3 benefits by total cost
  const breakdownEntries = Object.values(benefitBreakdown)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  const benefitSubtitle = breakdownEntries.length > 0
    ? breakdownEntries
        .map(b => `R$ ${(b.total / 1000).toFixed(1)}k ${b.nome}`)
        .join(' · ')
    : associationsList.length === 0
      ? 'Nenhum benefício vinculado a colaboradores'
      : 'Sem benefícios do tipo adicional';

  // 2. Paridade Salarial por Gênero (Feminino vs Masculino)
  const getGenderParityData = () => {
    const sectorMap: Record<string, { sector: string; mTotal: number; mCount: number; fTotal: number; fCount: number }> = {};
    
    activeColabs.forEach(c => {
      if (!c.setor) return;
      const cleanSalary = parseSalary(c.salario || '');
      if (cleanSalary <= 0) return;

      if (!sectorMap[c.setor]) {
        sectorMap[c.setor] = { sector: c.setor, mTotal: 0, mCount: 0, fTotal: 0, fCount: 0 };
      }

      if (c.genero === 'M') {
        sectorMap[c.setor].mTotal += cleanSalary;
        sectorMap[c.setor].mCount++;
      } else if (c.genero === 'F') {
        sectorMap[c.setor].fTotal += cleanSalary;
        sectorMap[c.setor].fCount++;
      }
    });

    return Object.values(sectorMap)
      .map(s => ({
        setor: s.sector,
        Masculino: s.mCount > 0 ? Math.round(s.mTotal / s.mCount) : 0,
        Feminino: s.fCount > 0 ? Math.round(s.fTotal / s.fCount) : 0
      }))
      .filter(s => s.Masculino > 0 || s.Feminino > 0);
  };

  // 3. Satisfação Média com Benefícios (Pesquisas)
  const pesquisas = indicadoresList.filter(i => i.tipo === 'Pesquisa Beneficio');
  const satisfacaoMedia = pesquisas.length > 0
    ? parseFloat((pesquisas.reduce((acc, p) => acc + (p.nota_satisfacao || 0), 0) / pesquisas.length).toFixed(1))
    : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-5 rounded-xl border flex flex-col justify-between h-28 ${
          theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.01] border-black/5'
        }`}>
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-50">Custo Total de Compensação (Mensal)</span>
          <div>
            <span className="text-3xl font-extrabold font-mono leading-none">R$ {(totalCompensacao / 1000).toFixed(1)}k</span>
            <span className="text-[9px] opacity-60 block mt-1">Salários + Benefícios vinculados</span>
          </div>
        </div>

        <div className={`p-5 rounded-xl border flex flex-col justify-between h-28 ${
          theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.01] border-black/5'
        }`}>
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-50">Custo Base de Salários</span>
          <div>
            <span className="text-3xl font-extrabold font-mono leading-none text-emerald-400">R$ {(totalSalaries / 1000).toFixed(1)}k</span>
            <span className="text-[9px] opacity-60 block mt-1">Valor fixo nominal da folha ativa</span>
          </div>
        </div>

        <div className={`p-5 rounded-xl border flex flex-col justify-between h-28 ${
          theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.01] border-black/5'
        }`}>
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-50">Investimento Estimado em Benefícios</span>
          <div>
            <span className="text-3xl font-extrabold font-mono leading-none text-emerald-400">R$ {(totalBenefits / 1000).toFixed(1)}k</span>
            <span className="text-[9px] opacity-60 block mt-1 leading-relaxed">{benefitSubtitle}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Gender salary parity bar chart */}
        <div className={`p-5 rounded-xl border space-y-4 lg:col-span-2 ${
          theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.01] border-black/5'
        }`}>
          <div className="pb-2 border-b border-white/5">
            <h4 className="text-xs font-bold uppercase tracking-wider opacity-65 flex items-center gap-1.5">
              <Percent size={14} className="text-emerald-500" /> Paridade Salarial por Gênero e Setor
            </h4>
          </div>
          <div className="h-56 text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getGenderParityData()} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="setor" stroke="currentColor" opacity={0.4} tickLine={false} />
                <YAxis stroke="currentColor" opacity={0.4} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip 
                  formatter={(value) => [`R$ ${value}`, 'Média Salarial']}
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? '#181816' : '#ffffff',
                    borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    color: theme === 'dark' ? '#E5DFD3' : '#0A0A0A',
                    fontSize: '11px',
                    borderRadius: '8px'
                  }} 
                />
                <Legend iconSize={8} iconType="circle" />
                <Bar dataKey="Feminino" fill="#ec4899" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Masculino" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Benefits satisfaction climate */}
        <div className={`p-5 rounded-xl border space-y-4 flex flex-col justify-between ${
          theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.01] border-black/5'
        }`}>
          <div className="pb-2 border-b border-white/5">
            <h4 className="text-xs font-bold uppercase tracking-wider opacity-65 flex items-center gap-1.5">
              <Smile size={14} className="text-emerald-500" /> Satisfação com Benefícios
            </h4>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center space-y-3 py-6">
            <span className="text-[10px] uppercase font-bold tracking-widest opacity-50 block">Média da Pesquisa de Clima</span>
            <div className="text-center">
              <span className="text-5xl font-extrabold font-mono leading-none text-emerald-400">{satisfacaoMedia}</span>
              <span className="text-2xl font-bold opacity-30">/5</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-400 text-lg">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={i < Math.round(satisfacaoMedia) ? "opacity-100" : "opacity-25"}>★</span>
              ))}
            </div>
            <span className="text-[10px] opacity-50 font-mono text-center px-4 leading-relaxed">
              Baseado em {pesquisas.length} respostas coletadas nas pesquisas trimestrais de RH.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
