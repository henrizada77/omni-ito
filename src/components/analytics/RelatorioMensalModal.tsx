import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import {
  Printer,
  X,
  Calendar,
  Building2,
  Users,
  Trophy,
  Activity,
  AlertTriangle,
  Loader2,
  FileCheck,
  TrendingDown
} from 'lucide-react';
import Logo from '../common/Logo';

interface RelatorioMensalModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
}

interface DadosRelatorio {
  totalAtivos: number;
  admissoesMes: number;
  desligamentosMes: number;
  turnoverMes: number;
  emFeriasCount: number;
  emFeriasNomes: string[];
  vencedorFuncMes: { nome: string; setor: string; votos: number } | null;
  asosVincendos: number;
  atestadosCount: number;
  setoresDistribuicao: Record<string, number>;
}

export default function RelatorioMensalModal({ isOpen, onClose, theme }: RelatorioMensalModalProps) {
  const [competencia, setCompetencia] = useState<string>('2026-08');
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState<DadosRelatorio | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const dark = theme === 'dark';

  const MESES = [
    { value: '2026-08', label: 'Agosto / 2026' },
    { value: '2026-07', label: 'Julho / 2026' },
    { value: '2026-06', label: 'Junho / 2026' },
    { value: '2026-05', label: 'Maio / 2026' },
    { value: '2026-04', label: 'Abril / 2026' }
  ];

  useEffect(() => {
    if (isOpen) {
      carregarDadosRelatorio(competencia);
    }
  }, [isOpen, competencia]);

  const carregarDadosRelatorio = async (comp: string) => {
    setLoading(true);
    try {
      const [anoStr, mesStr] = comp.split('-');
      const ano = Number(anoStr);
      const mes = Number(mesStr);
      const inicioMesStr = `${comp}-01`;
      const ultimoDiaMes = new Date(ano, mes, 0).getDate();
      const fimMesStr = `${comp}-${String(ultimoDiaMes).padStart(2, '0')}`;

      const [colabsRes, rodadaRes, ocorrenciasRes] = await Promise.all([
        supabase
          .from('colaboradores')
          .select('id, nome, setor, status, data_admissao, data_desligamento, data_vencimento_aso, data_inicio_ferias, data_fim_ferias, criado_em'),
        supabase
          .from('funcionario_mes_rodadas')
          .select('id, status, competencia')
          .eq('competencia', comp)
          .maybeSingle(),
        supabase
          .from('ocorrencias_jornada')
          .select('id, tipo, data_ocorrencia, criado_em')
      ]);

      const colabs = colabsRes.data || [];
      const rodada = rodadaRes.data;
      const ocorrencias = ocorrenciasRes.data || [];

      // 1. Headcount Ativo na Competência Selecionada:
      // Admitido até o fim do mês E não desligado antes do início do mês
      const ativosNaCompetencia = colabs.filter(c => {
        const dataAdm = c.data_admissao || (c.criado_em ? c.criado_em.slice(0, 10) : '');
        const admitidoAteMes = !dataAdm || dataAdm <= fimMesStr;
        const naoDesligadoAntes = !c.data_desligamento || c.data_desligamento >= inicioMesStr;
        return admitidoAteMes && naoDesligadoAntes;
      });

      // 2. Admissões no Mês da Competência:
      const admissoes = colabs.filter(c => {
        const dataAdm = c.data_admissao || (c.criado_em ? c.criado_em.slice(0, 10) : '');
        return dataAdm.startsWith(comp);
      });

      // 3. Desligamentos no Mês da Competência:
      const desligamentos = colabs.filter(c => {
        return c.data_desligamento && c.data_desligamento.startsWith(comp);
      });

      // 4. Turnover Mensal %:
      const mediaHeadcount = Math.max(ativosNaCompetencia.length, 1);
      const turnover = Number(((desligamentos.length / mediaHeadcount) * 100).toFixed(1));

      // 5. Férias no Mês da Competência:
      const emFerias = colabs.filter(c => {
        if (c.status === 'em_ferias') return true;
        if (c.data_inicio_ferias && c.data_fim_ferias) {
          return c.data_inicio_ferias <= fimMesStr && c.data_fim_ferias >= inicioMesStr;
        }
        return false;
      });

      // 6. Distribuição de Setores no Mês:
      const setores: Record<string, number> = {};
      ativosNaCompetencia.forEach(c => {
        const s = c.setor || 'Sem Setor';
        setores[s] = (setores[s] || 0) + 1;
      });

      // 7. ASOs Vincendos (vencendo no mês da competência ou nos 30 dias subsequentes)
      const asos = ativosNaCompetencia.filter(c => {
        if (!c.data_vencimento_aso) return false;
        return c.data_vencimento_aso >= inicioMesStr && c.data_vencimento_aso <= `${ano}-${String(mes + 1).padStart(2, '0')}-31`;
      });

      // 8. Atestados Registrados no Mês da Competência:
      const atestados = ocorrencias.filter(o => {
        const isAtestado = o.tipo && (o.tipo.toLowerCase().includes('atestado') || o.tipo.toLowerCase().includes('falta'));
        const dataOc = o.data_ocorrencia || (o.criado_em ? o.criado_em.slice(0, 10) : '');
        return isAtestado && dataOc.startsWith(comp);
      });

      // 9. Vencedor do Funcionário do Mês da Competência:
      let vencedor: { nome: string; setor: string; votos: number } | null = null;
      if (rodada?.id) {
        const { data: votos } = await supabase
          .from('funcionario_mes_votos')
          .select('votado_id, colaboradores:votado_id(nome, setor)')
          .eq('rodada_id', rodada.id);

        if (votos && votos.length > 0) {
          const contagem: Record<string, { nome: string; setor: string; qtd: number }> = {};
          votos.forEach((v: any) => {
            const vid = v.votado_id;
            const cNome = v.colaboradores?.nome || 'Desconhecido';
            const cSetor = v.colaboradores?.setor || '—';
            if (!contagem[vid]) contagem[vid] = { nome: cNome, setor: cSetor, qtd: 0 };
            contagem[vid].qtd += 1;
          });

          const ordenados = Object.values(contagem).sort((a, b) => b.qtd - a.qtd);
          if (ordenados[0]) {
            vencedor = {
              nome: ordenados[0].nome,
              setor: ordenados[0].setor,
              votos: ordenados[0].qtd
            };
          }
        }
      }

      setDados({
        totalAtivos: ativosNaCompetencia.length,
        admissoesMes: admissoes.length,
        desligamentosMes: desligamentos.length,
        turnoverMes: turnover,
        emFeriasCount: emFerias.length,
        emFeriasNomes: emFerias.map(f => f.nome),
        vencedorFuncMes: vencedor,
        asosVincendos: asos.length,
        atestadosCount: atestados.length,
        setoresDistribuicao: setores
      });
    } catch (err) {
      console.error('Erro ao carregar dados do relatório mensal:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const mesFormatado = MESES.find(m => m.value === competencia)?.label || competencia;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #relatorio-print-area, #relatorio-print-area * {
            visibility: visible !important;
          }
          #relatorio-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            padding: 24px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className={`w-full max-w-4xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${dark ? 'bg-[#0B101D] text-white border-white/10' : 'bg-white text-gray-900 border-black/10'}`}>
        {/* Modal Header */}
        <div className={`no-print flex items-center justify-between px-6 py-4 border-b ${dark ? 'border-white/10 bg-[#131B2E]' : 'border-black/10 bg-gray-50'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand/20 text-brand flex items-center justify-center font-bold">
              <FileCheck size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold">Relatório Mensal de Gestão de RH</h3>
              <p className="text-xs opacity-60">Consolidado executivo para reuniões de diretoria</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Seletor de Competência */}
            <div className="flex items-center gap-2">
              <Calendar size={15} className="opacity-60" />
              <select
                value={competencia}
                onChange={e => setCompetencia(e.target.value)}
                className={`text-xs font-semibold px-3 py-2 rounded-xl border outline-none cursor-pointer ${dark ? 'bg-[#0B101D] border-white/15 text-white' : 'bg-white border-black/15 text-black'}`}
              >
                {MESES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handlePrint}
              disabled={loading || !dados}
              className="px-4 py-2 rounded-xl bg-brand text-white font-bold text-xs flex items-center gap-2 hover:bg-brand-strong transition-all shadow-md shadow-brand/20 cursor-pointer disabled:opacity-50"
            >
              <Printer size={15} /> Imprimir / Salvar PDF
            </button>

            <button onClick={onClose} className="p-2 rounded-xl opacity-60 hover:opacity-100 hover:bg-white/10 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body / Document Preview */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center opacity-60 space-y-3">
              <Loader2 size={32} className="animate-spin text-brand" />
              <p className="text-xs font-semibold">Compilando dados da competência {mesFormatado}...</p>
            </div>
          ) : dados ? (
            <div id="relatorio-print-area" ref={printRef} className="space-y-6 text-gray-900 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm font-sans">
              {/* PDF Header */}
              <div className="flex items-center justify-between border-b border-gray-300 pb-5">
                <div className="flex items-center gap-4">
                  <Logo className="w-8 h-8 text-brand" />
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wide">ITO Clinic · Relatório Mensal de RH</h1>
                    <p className="text-xs text-gray-500 font-medium">Clínica Médica &amp; Estética ITO · Maceió/AL</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-brand/10 text-brand font-bold text-xs rounded-full border border-brand/20">
                    Competência: {mesFormatado}
                  </span>
                  <p className="text-[10px] text-gray-400 mt-1">Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              {/* Grid 1: Indicadores Chave (KPIs) */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-1">
                    <span>Headcount Ativo</span>
                    <Users size={16} className="text-brand" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{dados.totalAtivos}</div>
                  <div className="text-[10px] text-gray-500 mt-1">Colaboradores ativos</div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-1">
                    <span>Admissões no Mês</span>
                    <Users size={16} className="text-emerald-600" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-700">+{dados.admissoesMes}</div>
                  <div className="text-[10px] text-gray-500 mt-1">Novos talentos integrados</div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-1">
                    <span>Desligamentos</span>
                    <TrendingDown size={16} className="text-rose-600" />
                  </div>
                  <div className="text-2xl font-bold text-rose-700">{dados.desligamentosMes}</div>
                  <div className="text-[10px] text-gray-500 mt-1">Saídas no período</div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-1">
                    <span>Turnover Mensal</span>
                    <Activity size={16} className="text-indigo-600" />
                  </div>
                  <div className="text-2xl font-bold text-indigo-900">{dados.turnoverMes}%</div>
                  <div className="text-[10px] text-gray-500 mt-1">Meta de retenção: &lt; 3%</div>
                </div>
              </div>

              {/* Seção 2: Funcionário do Mês & Reconhecimento */}
              <div className="p-5 bg-gradient-to-r from-amber-500/10 to-amber-500/5 rounded-2xl border border-amber-500/20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Campeão do Funcionário do Mês ({mesFormatado})</h3>
                    {dados.vencedorFuncMes ? (
                      <p className="text-base font-bold text-gray-900 mt-0.5">
                        {dados.vencedorFuncMes.nome} <span className="text-xs font-normal text-gray-600">({dados.vencedorFuncMes.setor})</span>
                      </p>
                    ) : (
                      <p className="text-xs text-gray-600 italic mt-0.5">Rodada em andamento ou sem apuração finalizada.</p>
                    )}
                  </div>
                </div>
                {dados.vencedorFuncMes && (
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
                      {dados.vencedorFuncMes.votos} voto(s) dos colegas
                    </span>
                  </div>
                )}
              </div>

              {/* Seção 3: Distribuição por Setor & Ocorrências */}
              <div className="grid grid-cols-2 gap-6">
                {/* Quadro Setores */}
                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Building2 size={16} className="text-brand" /> Distribuição por Setores
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(dados.setoresDistribuicao).map(([setor, qtd]) => (
                      <div key={setor} className="flex items-center justify-between text-xs py-1 border-b border-gray-200 last:border-0">
                        <span className="font-semibold text-gray-700">{setor}</span>
                        <span className="font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full">{qtd} colabs</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quadro Prazos & Atenção */}
                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-600" /> Pontos de Atenção para a Diretoria
                  </h4>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs p-2.5 bg-white rounded-xl border border-gray-200">
                      <span className="text-gray-700 font-medium">Exames Periódicos (ASO a vencer em 30 dias):</span>
                      <span className={`font-bold px-2 py-0.5 rounded-full ${dados.asosVincendos > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {dados.asosVincendos} pendência(s)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs p-2.5 bg-white rounded-xl border border-gray-200">
                      <span className="text-gray-700 font-medium">Colaboradores em Férias Atualmente:</span>
                      <span className="font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        {dados.emFeriasCount} ativo(s)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs p-2.5 bg-white rounded-xl border border-gray-200">
                      <span className="text-gray-700 font-medium">Atestados Médicos Registrados no Mês:</span>
                      <span className="font-bold bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">
                        {dados.atestadosCount} registro(s)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rodapé de Assinaturas Executivas */}
              <div className="pt-8 mt-6 border-t border-gray-300 grid grid-cols-2 gap-8 text-center text-xs text-gray-500">
                <div>
                  <div className="border-b border-gray-400 w-48 mx-auto mb-1"></div>
                  <p className="font-bold text-gray-800">Coordenação de Recursos Humanos</p>
                  <p className="text-[10px]">ITO Clinic · Maceió/AL</p>
                </div>
                <div>
                  <div className="border-b border-gray-400 w-48 mx-auto mb-1"></div>
                  <p className="font-bold text-gray-800">Diretoria Executiva</p>
                  <p className="text-[10px]">Aprovação &amp; Visto</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
