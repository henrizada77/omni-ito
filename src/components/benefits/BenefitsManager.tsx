import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  Gift, 
  Plus, 
  Users, 
  Trash2, 
  Check, 
  AlertTriangle, 
  Loader2,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface Benefit {
  id: string;
  nome: string;
  tipo: 'adicional' | 'desconto';
  valor_padrao: number;
  descricao: string;
}

interface Colaborador {
  id: string;
  nome: string;
  cargo: string;
  setor: string;
  salario: string;
  status: string;
}

interface ColaboradorBeneficio {
  colaborador_id: string;
  beneficio_id: string;
  valor_customizado: number;
}

interface BenefitsManagerProps {
  theme: 'dark' | 'light';
}

export default function BenefitsManager({ theme }: BenefitsManagerProps) {
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [associations, setAssociations] = useState<ColaboradorBeneficio[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Selected benefit for association panel
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null);
  
  // Temporary state for selected benefit associations
  const [selectedColaboradores, setSelectedColaboradores] = useState<{ [colabId: string]: boolean }>({});
  const [customValues, setCustomValues] = useState<{ [colabId: string]: string }>({});

  // Form state for creating a new benefit
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBenefit, setNewBenefit] = useState({
    nome: '',
    tipo: 'adicional' as 'adicional' | 'desconto',
    valor_padrao: '',
    descricao: ''
  });

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [benefitsRes, colabsRes, assocRes] = await Promise.all([
        supabase.from('beneficios').select('*').order('nome'),
        supabase.from('colaboradores').select('id, nome, cargo, setor, salario, status').eq('status', 'ativo').order('nome'),
        supabase.from('colaborador_beneficios').select('*')
      ]);

      if (benefitsRes.error) throw benefitsRes.error;
      if (colabsRes.error) throw colabsRes.error;
      if (assocRes.error) throw assocRes.error;

      setBenefits(benefitsRes.data || []);
      setColaboradores(colabsRes.data || []);
      setAssociations(assocRes.data || []);

      // If a benefit was selected, refresh its temporary states
      if (selectedBenefit) {
        const currentBenefit = (benefitsRes.data || []).find(b => b.id === selectedBenefit.id);
        if (currentBenefit) {
          loadBenefitAssociations(currentBenefit, assocRes.data || []);
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro ao buscar dados de benefícios: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBenefitAssociations = (benefit: Benefit, currentAssoc = associations) => {
    setSelectedBenefit(benefit);
    
    // Filter associations for this benefit
    const benefitAssocs = currentAssoc.filter(a => a.beneficio_id === benefit.id);
    
    const initialSelected: { [key: string]: boolean } = {};
    const initialValues: { [key: string]: string } = {};

    colaboradores.forEach(c => {
      const match = benefitAssocs.find(a => a.colaborador_id === c.id);
      if (match) {
        initialSelected[c.id] = true;
        initialValues[c.id] = match.valor_customizado.toString();
      } else {
        initialSelected[c.id] = false;
        initialValues[c.id] = benefit.valor_padrao.toString();
      }
    });

    setSelectedColaboradores(initialSelected);
    setCustomValues(initialValues);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleCreateBenefit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBenefit.nome || !newBenefit.valor_padrao) {
      setErrorMsg('Preencha os campos obrigatórios.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('beneficios')
        .insert({
          nome: newBenefit.nome,
          tipo: newBenefit.tipo,
          valor_padrao: parseFloat(newBenefit.valor_padrao),
          descricao: newBenefit.descricao
        })
        .select()
        .single();

      if (error) throw error;

      setSuccessMsg(`Benefício "${newBenefit.nome}" cadastrado com sucesso!`);
      setNewBenefit({ nome: '', tipo: 'adicional', valor_padrao: '', descricao: '' });
      setShowAddForm(false);
      
      // Refresh
      await fetchData();
      if (data) {
        loadBenefitAssociations(data);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro ao cadastrar benefício: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBenefit = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o benefício "${name}"? Isso removerá o benefício de todos os colaboradores associados.`)) return;

    setErrorMsg('');
    try {
      const { error } = await supabase
        .from('beneficios')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (selectedBenefit?.id === id) {
        setSelectedBenefit(null);
      }
      setSuccessMsg('Benefício excluído com sucesso.');
      fetchData();
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro ao excluir benefício: ' + err.message);
    }
  };

  const handleSaveAssociations = async () => {
    if (!selectedBenefit) return;

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Get all current associations in db for this benefit
      const currentAssocs = associations.filter(a => a.beneficio_id === selectedBenefit.id);

      // 2. Determine who needs to be deleted, inserted or updated
      const inserts: any[] = [];
      const deletes: string[] = [];

      colaboradores.forEach(c => {
        const isCurrentlyAssociated = currentAssocs.some(a => a.colaborador_id === c.id);
        const shouldBeAssociated = selectedColaboradores[c.id];
        const currentCustomValue = parseFloat(customValues[c.id]) || selectedBenefit.valor_padrao;

        if (shouldBeAssociated) {
          // Add or update
          inserts.push({
            colaborador_id: c.id,
            beneficio_id: selectedBenefit.id,
            valor_customizado: currentCustomValue
          });
        } else if (isCurrentlyAssociated) {
          // Needs to be deleted
          deletes.push(c.id);
        }
      });

      // Execute deletes
      if (deletes.length > 0) {
        const { error: delErr } = await supabase
          .from('colaborador_beneficios')
          .delete()
          .eq('beneficio_id', selectedBenefit.id)
          .in('colaborador_id', deletes);

        if (delErr) throw delErr;
      }

      // Execute inserts (upsert)
      if (inserts.length > 0) {
        const { error: insErr } = await supabase
          .from('colaborador_beneficios')
          .upsert(inserts);

        if (insErr) throw insErr;
      }

      // Log action
      await supabase.from('logs_auditoria').insert({
        acao: 'VINCULO_BENEFICIOS_EM_MASSA',
        detalhes: { beneficio_nome: selectedBenefit.nome, total_associados: inserts.length }
      });

      setSuccessMsg('Associações salvas com sucesso! A folha de pagamento foi atualizada.');
      fetchData();
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro ao salvar associações: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleColaborador = (colabId: string) => {
    setSelectedColaboradores(prev => ({
      ...prev,
      [colabId]: !prev[colabId]
    }));
  };

  const handleCustomValueChange = (colabId: string, val: string) => {
    setCustomValues(prev => ({
      ...prev,
      [colabId]: val
    }));
  };

  if (loading && benefits.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-xs opacity-60">
        <Loader2 className="animate-spin" size={16} /> Carregando benefícios...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#E5DFD3]/20">MÓDULO 6</span>
            <h3 className="text-xl font-bold">Gestão de Benefícios & Folha</h3>
          </div>
          <p className="text-xs opacity-65 mt-1">Configure benefícios adicionais ou descontos e associe em massa aos colaboradores.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`text-xs px-4 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-colors shrink-0 ${
            showAddForm ? 'bg-rose-500/10 border border-rose-500/25 text-rose-400' : (theme === 'dark' ? 'bg-[#E5DFD3] text-black hover:bg-[#D4CBB7]' : 'bg-[#0A0A0A] text-white hover:bg-[#2A2A2A]')
          }`}
        >
          {showAddForm ? 'Cancelar' : <><Plus size={14} /> Novo Benefício</>}
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-2">
          <AlertTriangle size={14} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-lg text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center gap-2">
          <Check size={14} className="text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Add Form Panel */}
      {showAddForm && (
        <form onSubmit={handleCreateBenefit} className={`p-5 rounded-xl border space-y-4 animate-fadeIn text-xs ${
          theme === 'dark' ? 'bg-[#121211] border-white/10' : 'bg-black/5 border-black/10'
        }`}>
          <h5 className="font-bold uppercase tracking-wider opacity-60">Novo Benefício Corporativo</h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold opacity-60 mb-1">Nome do Benefício *</label>
              <input 
                type="text" 
                required 
                placeholder="Ex: Auxílio Combustível" 
                value={newBenefit.nome}
                onChange={e => setNewBenefit(prev => ({ ...prev, nome: e.target.value }))}
                className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`}
              />
            </div>
            <div>
              <label className="block font-bold opacity-60 mb-1">Tipo de Impacto *</label>
              <select
                value={newBenefit.tipo}
                onChange={e => setNewBenefit(prev => ({ ...prev, tipo: e.target.value as any }))}
                className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15 bg-[#121211]':'border-black/15 bg-white'}`}
              >
                <option value="adicional">Adicional (Soma ao Salário)</option>
                <option value="desconto">Desconto (Subtrai da Folha)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold opacity-60 mb-1">Valor Padrão (R$) *</label>
              <input 
                type="number" 
                step="0.01"
                required 
                placeholder="Ex: 250.00" 
                value={newBenefit.valor_padrao}
                onChange={e => setNewBenefit(prev => ({ ...prev, valor_padrao: e.target.value }))}
                className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`}
              />
            </div>
            <div className="md:col-span-3">
              <label className="block font-bold opacity-60 mb-1">Descrição / Regras de Concessão</label>
              <input 
                type="text" 
                placeholder="Ex: Fornecido a funcionários alocados externamente..." 
                value={newBenefit.descricao}
                onChange={e => setNewBenefit(prev => ({ ...prev, descricao: e.target.value }))}
                className={`w-full p-2.5 rounded border bg-transparent ${theme==='dark'?'border-white/15':'border-black/15'}`}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className={`px-5 py-2.5 rounded font-bold transition-colors ${
              theme==='dark' ? 'bg-[#E5DFD3] text-black hover:bg-[#D4CBB7]':'bg-[#0A0A0A] text-white hover:bg-[#2A2A2A]'
            }`}
          >
            {saving ? 'Cadastrando...' : '✓ Cadastrar Benefício'}
          </button>
        </form>
      )}

      {/* Main Grid: list of benefits vs association view */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Benefits list */}
        <div className="space-y-3">
          <div className="pb-1">
            <h4 className="text-[10px] font-bold uppercase tracking-wider opacity-50 flex items-center gap-1">
              <Gift size={12} /> Benefícios Oferecidos
            </h4>
          </div>

          <div className="space-y-2">
            {benefits.map(b => {
              const count = associations.filter(a => a.beneficio_id === b.id).length;
              const isSelected = selectedBenefit?.id === b.id;
              
              return (
                <div
                  key={b.id}
                  onClick={() => loadBenefitAssociations(b)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all flex justify-between items-center ${
                    isSelected 
                      ? (theme === 'dark' ? 'border-[#E5DFD3] bg-white/5' : 'border-[#0A0A0A] bg-black/5')
                      : (theme === 'dark' ? 'border-white/5 bg-[#121211] hover:bg-white/[0.02]' : 'border-black/5 bg-black/[0.01] hover:bg-black/[0.03]')
                  }`}
                >
                  <div className="space-y-1 max-w-[70%]">
                    <span className="font-bold text-xs block truncate">{b.nome}</span>
                    <span className="text-[10px] opacity-50 block truncate">{b.descricao || 'Sem descrição.'}</span>
                    <div className="flex items-center gap-2 pt-1">
                      <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
                        b.tipo === 'adicional' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' 
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/10'
                      }`}>
                        {b.tipo === 'adicional' ? <TrendingUp size={8}/> : <TrendingDown size={8}/>}
                        {b.tipo === 'adicional' ? 'Adicional' : 'Desconto'}
                      </span>
                      <span className="text-[10px] font-mono opacity-70">
                        R$ {b.valor_padrao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] font-bold block">{count}</span>
                      <span className="text-[8px] opacity-40 uppercase block">Ativos</span>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBenefit(b.id, b.nome);
                      }}
                      className="p-1 rounded hover:bg-rose-500/10 text-rose-400/70 hover:text-rose-400 transition-colors"
                      title="Excluir Benefício"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Associations view */}
        <div className="lg:col-span-2">
          {selectedBenefit ? (
            <div className={`p-5 rounded-xl border space-y-4 h-full flex flex-col justify-between ${
              theme === 'dark' ? 'bg-[#121211] border-white/5' : 'bg-black/[0.01] border-black/5'
            }`}>
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-3 gap-2">
                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-wider opacity-45">Vincular Colaboradores</span>
                    <h4 className="text-sm font-bold mt-0.5">{selectedBenefit.nome}</h4>
                  </div>
                  <div className="text-xs opacity-75 sm:text-right">
                    Valor Padrão: <span className="font-mono font-bold">R$ {selectedBenefit.valor_padrao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <p className="text-[11px] opacity-60">
                  Marque os colaboradores que possuem esse benefício. Você pode ajustar o valor de forma personalizada para cada colaborador.
                </p>

                {/* Collaborators selection list */}
                <div className="overflow-y-auto max-h-[350px] space-y-1.5 pt-2 pr-1">
                  {colaboradores.map(c => {
                    const isChecked = !!selectedColaboradores[c.id];
                    const customVal = customValues[c.id] || selectedBenefit.valor_padrao.toString();

                    return (
                      <div 
                        key={c.id}
                        className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                          isChecked 
                            ? (theme === 'dark' ? 'bg-white/5 border-white/10':'bg-black/[0.02] border-black/10')
                            : (theme === 'dark' ? 'bg-transparent border-white/5 opacity-60':'bg-transparent border-black/5 opacity-60')
                        }`}
                      >
                        <div className="flex items-center gap-3 max-w-[60%]">
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleColaborador(c.id)}
                            className="rounded cursor-pointer"
                          />
                          <div className="truncate">
                            <span className="font-bold text-xs block truncate">{c.nome}</span>
                            <span className="text-[9px] opacity-50 block truncate">{c.cargo} · {c.setor}</span>
                          </div>
                        </div>

                        {isChecked && (
                          <div className="flex items-center gap-2 shrink-0 animate-fadeIn">
                            <span className="text-[10px] opacity-50">Valor Customizado: R$</span>
                            <input 
                              type="number"
                              step="0.01"
                              value={customVal}
                              onChange={e => handleCustomValueChange(c.id, e.target.value)}
                              className={`w-20 p-1 rounded text-center font-mono text-xs bg-transparent border ${
                                theme === 'dark' ? 'border-white/15 focus:border-white/40':'border-black/15 focus:border-black/40'
                              }`}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-white/10 pt-4 flex justify-between items-center gap-3">
                <span className="text-[10px] opacity-45 flex items-center gap-1">
                  <Users size={12} /> {Object.values(selectedColaboradores).filter(Boolean).length} associados
                </span>
                
                <button
                  onClick={handleSaveAssociations}
                  disabled={saving}
                  className={`px-4 py-2 rounded font-bold text-xs transition-all flex items-center gap-1.5 ${
                    theme === 'dark' ? 'bg-[#E5DFD3] text-black hover:bg-[#D4CBB7]' : 'bg-[#0A0A0A] text-white hover:bg-[#2A2A2A]'
                  } disabled:opacity-50`}
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : '✓ Salvar Associações'}
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center p-12 text-center opacity-40">
              <Gift size={32} className="mb-3" />
              <span className="text-xs font-semibold">Nenhum benefício selecionado</span>
              <span className="text-[10px] mt-1">Selecione um benefício à esquerda para gerenciar seus colaboradores associados.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
